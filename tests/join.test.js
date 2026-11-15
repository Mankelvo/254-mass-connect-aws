import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import express from 'express';
import { validateJoin } from '../shared/join.js';
import { createJoinRepository } from '../server/join/repository.js';
import { joinRoutes } from '../server/join/routes.js';
import { createInterestSender } from '../src/join/api.js';

const valid = extra => ({ fullName: ' Test Neighbor ', email: ' TEST@EXAMPLE.COM ', phone: '', city: '', activities: [], message: '', consent: true, website: '', submissionId: randomUUID(), ...extra });

test('shared validation accepts email-only and international phone-only contacts', () => {
  const email = validateJoin(valid()); assert.deepEqual(email.errors, {}); assert.equal(email.value.email, 'test@example.com'); assert.equal(email.value.fullName, 'Test Neighbor');
  for (const phone of ['+254 712 345 678', '+1 (617) 555-0100', '(617) 555-0100']) {
    const result = validateJoin(valid({ email: '', phone })); assert.deepEqual(result.errors, {}); assert.match(result.value.phone, /^\+?\d+$/);
  }
  const result = validateJoin(valid({ activities: ['meals', 'friends', 'meals'], city: ' Boston ', message: ' Hello ' }));
  assert.deepEqual(result.value.activities, ['meals', 'friends']); assert.equal(result.value.city, 'Boston'); assert.equal(result.value.message, 'Hello');
});
test('validation rejects invalid contacts, consent, types, unknown fields and excessive lengths', () => {
  for (const extra of [{ fullName: '' }, { fullName: ' x ' }, { fullName: 'a'.repeat(101) }, { fullName: 55 }, { email: '', phone: '' }, { email: 'invalid' }, { phone: 'call me 1234567' }, { phone: '123' }, { phone: '+1234567890123456' }, { phone: '1234567', email: 'bad' }, { email: 'a'.repeat(255) }, { city: 'a'.repeat(101) }, { message: 'a'.repeat(1001) }, { message: {} }, { consent: false }, { consent: 'true' }, { activities: ['unknown'] }, { activities: 'meals' }, { password: 'no' }, { submissionId: '../invalid' }]) assert.ok(Object.keys(validateJoin(valid(extra)).errors).length, JSON.stringify(extra));
  for (const input of [null, [], 'invalid']) assert.ok(Object.keys(validateJoin(input).errors).length);
});
test('join API saves privately, deduplicates retries, handles failures and limits abuse', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), '254-join-test-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const file = path.join(directory, 'private/join-submissions.json');
  const repository = createJoinRepository(file);
  const app = express(); app.use(express.json({ limit: '12kb' }));
  app.use('/api/join', joinRoutes({ repository, maxAttempts: 100 }));
  app.use('/failure', joinRoutes({ repository: { save: async () => { throw new Error('sensitive private storage detail'); } } }));
  let time = Date.now(); app.use('/limited', joinRoutes({ repository, maxAttempts: 2, now: () => time }));
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (body, route = '/api/join') => fetch(base + route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  await t.test('email-only and phone-only save normalized records and consent', async () => {
    for (const body of [valid(), valid({ email: '', phone: '+254 712 345 678', activities: ['friends', 'games'] })]) assert.equal((await post(body)).status, 201);
    const rows = JSON.parse(await fs.readFile(file)); assert.equal(rows.length, 2); assert.equal(rows[0].email, 'test@example.com'); assert.equal(rows[1].phone, '+254712345678'); assert.equal(rows[0].consent, true); assert.ok(rows[0].consentAt); assert.ok(rows[0].consentText); assert.equal(rows[0].website, undefined);
    assert.equal((await fs.stat(file)).mode & 0o777, 0o600); assert.equal((await fs.stat(path.dirname(file))).mode & 0o777, 0o700);
  });
  await t.test('concurrent distinct submissions survive; repeated retries save only once', async () => {
    const one = valid(); const results = await Promise.all([...Array.from({ length: 8 }, () => post(valid())), ...Array.from({ length: 5 }, () => post(one))]);
    assert.ok(results.every(r => r.status === 201)); assert.equal(JSON.parse(await fs.readFile(file)).length, 11);
    assert.equal((await post({ ...one, city: 'Changed' })).status, 409);
    assert.equal((await post(one)).status, 201);
  });
  await t.test('invalid input and honeypot do not persist', async () => {
    const before = await fs.readFile(file, 'utf8');
    for (const body of [valid({ consent: false }), valid({ email: '', phone: '' }), valid({ extra: true }), valid({ fullName: '' })]) {
      const response = await post(body); assert.equal(response.status, 400); assert.ok((await response.json()).errors);
    }
    assert.equal((await post(valid({ website: 'spam.example' }))).status, 201);
    assert.equal(await fs.readFile(file, 'utf8'), before);
  });
  await t.test('no public listing, private records or form contents in error responses/logs', async () => {
    assert.equal((await fetch(base + '/api/join')).status, 405);
    for (const url of ['/.data/join-submissions.json', '/join-submissions.json', '/private/join-submissions.json']) assert.equal((await fetch(base + url)).status, 404);
    const logged = []; const old = console.error; console.error = (...args) => logged.push(args);
    try { const response = await post(valid(), '/failure'); assert.equal(response.status, 503); const text = await response.text(); assert.doesNotMatch(text, /test@example|sensitive private/); assert.deepEqual(logged, []); }
    finally { console.error = old; }
  });
  await t.test('failed attempts are rate limited and expire', async () => {
    await post({}, '/limited'); await post({}, '/limited'); const response = await post(valid(), '/limited'); assert.equal(response.status, 429); assert.ok(Number(response.headers.get('retry-after')) > 0);
    time += 3600001; assert.equal((await post(valid(), '/limited')).status, 201);
  });
  await t.test('malformed storage is preserved and save queue recovers', async () => {
    await fs.writeFile(file, 'broken'); assert.equal((await post(valid())).status, 503); assert.equal(await fs.readFile(file, 'utf8'), 'broken');
    await fs.writeFile(file, '[]'); assert.equal((await post(valid())).status, 201); assert.equal(JSON.parse(await fs.readFile(file)).length, 1);
    assert.deepEqual(await fs.readdir(path.dirname(file)), ['join-submissions.json']);
  });
});
test('frontend sender prevents duplicate requests and supports retry after network/server errors', async () => {
  let count = 0; let release;
  const sender = createInterestSender(async () => { count++; await new Promise(resolve => { release = resolve; }); return { ok: true, json: async () => ({ ok: true }) }; });
  const body = valid(); const first = sender(body); const second = sender(body); assert.equal(first, second); assert.equal(count, 1); release(); await first;
  let attempt = 0;
  const retry = createInterestSender(async () => { if (++attempt === 1) throw new Error('offline'); return { ok: false, json: async () => ({ error: 'Validation failed', errors: { email: 'Invalid' } }) }; });
  await assert.rejects(retry(body), /check your connection/); await assert.rejects(retry(body), error => error.fields.email === 'Invalid'); assert.equal(body.email, ' TEST@EXAMPLE.COM ');
  const nonJson = createInterestSender(async () => ({ json: async () => { throw new Error(); } })); await assert.rejects(nonJson(body), /server could not process/);
});
