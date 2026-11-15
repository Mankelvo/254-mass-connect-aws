import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createEventRepository } from '../server/events/repository.js';
import { eventRoutes } from '../server/events/routes.js';

test('event API validates status and input and confirms durable, deduplicated writes', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), '254-events-test-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const catalogFile = path.join(directory, 'events.json');
  const catalog = ['upcoming', 'proposed', 'completed', 'elapsed'].map(status => ({ id: status, title: status, status: status === 'elapsed' ? 'upcoming' : status, startsAt: status === 'elapsed' ? '2020-01-01T12:00:00Z' : '2099-01-01T12:00:00Z', imageFile: null }));
  await fs.writeFile(catalogFile, JSON.stringify(catalog));
  const repository = createEventRepository({ catalogFile, dataDir: path.join(directory, 'records') });
  const app = express(); app.use(express.json()); app.use('/api/events', eventRoutes({ repository, photoDir: directory }));
  app.use((error, _req, res, _next) => res.status(error.status || 500).json({ error: 'Invalid request.' }));
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/api/events`;
  const post = (id, body) => fetch(`${base}/${id}/rsvps`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const values = { fullName: 'Test Guest', email: 'guest@example.com' };
  await t.test('catalog returns effective status and no private paths', async () => {
    const response = await fetch(base); assert.equal(response.status, 200);
    const data = await response.json(); assert.equal(data[3].status, 'completed'); assert.equal(data[0].imageFile, undefined);
  });
  await t.test('rejects proposed, completed, elapsed and unknown events', async () => {
    for (const id of ['proposed','completed','elapsed']) assert.equal((await post(id, values)).status, 409);
    assert.equal((await post('missing', values)).status, 404);
  });
  await t.test('rejects invalid types, missing values, whitespace and overlong input', async () => {
    for (const body of [null, {}, { ...values, fullName: '  ' }, { ...values, fullName: 'a'.repeat(101) }, { ...values, email: 'bad' }, { ...values, email: [] }]) assert.equal((await post('upcoming', body)).status, 400);
  });
  await t.test('persists and deduplicates concurrent submissions', async () => {
    const responses = await Promise.all(Array.from({ length: 8 }, () => post('upcoming', values)));
    for (const response of responses) { assert.equal(response.status, 201); assert.equal((await response.json()).ok, true); }
    const records = JSON.parse(await fs.readFile(path.join(directory, 'records/rsvps.json'))); assert.equal(records.length, 1); assert.equal(records[0].email, values.email);
    const reopened = createEventRepository({ catalogFile, dataDir: path.join(directory, 'records') }); await reopened.saveRsvp({ ...records[0] });
    assert.equal(JSON.parse(await fs.readFile(path.join(directory, 'records/rsvps.json'))).length, 1);
  });
  await t.test('missing photo gives 404', async () => assert.equal((await fetch(`${base}/upcoming/photo`)).status, 404));
  await t.test('storage failure returns 503, never success', async () => {
    await fs.writeFile(path.join(directory, 'records/rsvps.json'), 'invalid json');
    const response = await post('upcoming', values); assert.equal(response.status, 503); assert.equal((await response.json()).ok, undefined);
  });
  await t.test('catalog changes take effect without frontend edits', async () => {
    await fs.writeFile(catalogFile, '[]'); assert.deepEqual(await (await fetch(base)).json(), []);
    await fs.writeFile(catalogFile, 'broken'); assert.equal((await fetch(base)).status, 503);
  });
});
