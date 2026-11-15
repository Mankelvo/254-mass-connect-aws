import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import express from 'express';
import { galleryRepository } from '../server/gallery/repository.js';
import { localPhotoStorage } from '../server/gallery/storage.js';
import { galleryRoutes } from '../server/gallery/routes.js';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
test('gallery publication, pagination and original integrity', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), '254-gallery-test-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  for (const folder of ['previews', 'originals', 'public-images']) await fs.mkdir(path.join(directory, folder));
  // Synthetic bytes deliberately differ between preview and original. No personal photos.
  const preview = Buffer.from('local preview fixture');
  const original = Buffer.from('original quality fixture\0\xff\x01\x02');
  await fs.writeFile(path.join(directory, 'previews/photo.jpg'), preview);
  await fs.writeFile(path.join(directory, 'originals/Camera Original.jpg'), original);
  await fs.writeFile(path.join(directory, 'private.jpg'), 'not published');
  await fs.symlink(path.join(directory, 'private.jpg'), path.join(directory, 'originals/link.jpg'));
  const photo = (id, extra = {}) => ({ id, albumId: 'gathering', title: id, status: 'approved', publishedAt: '2026-01-01T10:00:00Z', previewFile: 'photo.jpg', originalFile: 'Camera Original.jpg', ...extra });
  const catalog = { albums: [{ id: 'gathering', title: 'Fixture album', status: 'approved', eventVerified: true, eventSource: 'Test organizer confirmation' }, { id: 'empty', title: 'Empty', status: 'approved' }, { id: 'private', title: 'Private', status: 'pending' }], photos: [photo('older'), photo('public-approved', { previewSource: 'public-images', previewFile: 'existing.jpg', originalFile: null }), photo('public-pending', { previewSource: 'public-images', previewFile: 'existing.jpg', status: 'pending' }), photo('future', { publishedAt: '2999-01-01T00:00:00Z' }), photo('timezone-missing', { publishedAt: '2026-01-01' }), photo('bad-source', { previewSource: 'originals' }), photo('newer', { publishedAt: '2026-02-01T10:00:00Z' }), photo('pending', { status: 'pending' }), photo('rejected', { status: 'rejected' }), photo('undated', { publishedAt: null }), photo('hidden-album', { albumId: 'private' }), photo('missing-preview', { previewFile: 'missing.jpg' }), photo('missing-original', { originalFile: 'missing.jpg' }), photo('traversal', { originalFile: '../private.jpg' }), photo('symlink', { originalFile: 'link.jpg' })] };
  const catalogFile = path.join(directory, 'catalog.json'); await fs.writeFile(catalogFile, JSON.stringify(catalog));
  await fs.writeFile(path.join(directory, 'public-images/existing.jpg'), preview);
  const storage = localPhotoStorage(directory, path.join(directory, 'public-images'));
  const app = express(); app.use('/api', galleryRoutes({ repository: galleryRepository(catalogFile, storage), storage }));
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const get = endpoint => fetch(base + endpoint);
  await t.test('only approved, nonempty albums and available approved photos are published', async () => {
    const albums = await (await get('/albums')).json(); assert.equal(albums.total, 1); assert.equal(albums.items[0].photoCount, 6);
    const photos = await (await get('/photos')).json(); assert.equal(photos.total, 6); assert.equal(photos.items[0].id, 'newer');
    assert.equal(photos.items[0].previewFile, undefined); assert.equal(photos.items[0].originalFile, undefined);
    assert.deepEqual((await (await get('/albums/gathering/photos')).json()).items, photos.items);
  });
  await t.test('existing public images are referenced without copying and originals are explicit', async () => {
    const photos = (await (await get('/photos')).json()).items;
    const photo = photos.find(p => p.id === 'public-approved');
    assert.equal(photo.originalAvailable, false); assert.match(photo.downloadUrl, /available-download$/); assert.equal(photo.downloadKind, 'available'); assert.equal(photo.originalFilename, null);
    assert.equal(hash(Buffer.from(await (await get('/photos/public-approved/preview')).arrayBuffer())), hash(preview));
    assert.equal((await get('/photos/public-approved/download')).status, 404);
    const available = await get(photo.downloadUrl.replace('/api', ''));
    assert.match(available.headers.get('content-disposition'), /existing.jpg/);
    assert.equal(hash(Buffer.from(await available.arrayBuffer())), hash(preview));
    assert.equal(await storage.resolveFile('public-images', 'existing.jpg'), await fs.realpath(path.join(directory, 'public-images/existing.jpg')));
    assert.deepEqual(await fs.readdir(path.join(directory, 'previews')), ['photo.jpg']);
    for (const id of ['missing-original', 'traversal', 'symlink']) assert.equal(photos.find(p => p.id === id).originalAvailable, false);
  });
  await t.test('pagination returns stable pages and rejects invalid limits', async () => {
    const first = await (await get('/photos?limit=2')).json(); const second = await (await get(`/photos?limit=2&offset=${first.nextOffset}`)).json();
    assert.equal(first.items.length, 2); assert.equal(second.items.length, 2); assert.notEqual(first.items[1].id, second.items[0].id);
    for (const query of ['limit=0', 'limit=61', 'offset=-1', 'offset=1.5', 'offset=no']) assert.equal((await get(`/photos?${query}`)).status, 400);
  });
  await t.test('download bytes and SHA-256 match original, not preview; filename preserved', async () => {
    const response = await get('/photos/newer/download'); assert.equal(response.status, 200); assert.match(response.headers.get('content-disposition'), /Camera Original.jpg/);
    const bytes = Buffer.from(await response.arrayBuffer()); assert.equal(hash(bytes), hash(original)); assert.notEqual(hash(bytes), hash(preview));
    assert.equal(hash(Buffer.from(await (await get('/photos/newer/preview')).arrayBuffer())), hash(preview));
  });
  await t.test('missing originals never fall back to previews', async () => {
    const response = await get('/photos/missing-original/download'); assert.equal(response.status, 404); assert.match((await response.json()).error, /original photo is unavailable/);
  });
  await t.test('unpublished and unknown photos cannot be accessed directly', async () => {
    for (const id of ['public-pending','future','timezone-missing','bad-source','pending','rejected','undated','hidden-album','missing-preview','unknown']) for (const kind of ['preview','download','available-download']) assert.equal((await get(`/photos/${id}/${kind}`)).status, 404);
    assert.equal((await get('/albums/private/photos')).status, 404);
  });
  await t.test('traversal and symlink escapes cannot access arbitrary files', async () => {
    for (const id of ['traversal','symlink']) assert.equal((await get(`/photos/${id}/download`)).status, 404);
    for (const filename of ['../private.jpg','/tmp/private.jpg','..\\private.jpg','bad\0.jpg','.hidden.jpg']) await assert.rejects(storage.resolveFile('originals', filename));
  });
  await t.test('publication timestamps order by instants with deterministic ties', async () => {
    const items = (await (await get('/photos')).json()).items;
    assert.deepEqual(items.map(p => p.id), ['newer', 'missing-original', 'older', 'public-approved', 'symlink', 'traversal']);
  });
  await t.test('unverified albums are withheld even with approved photographs', async () => {
    const unverified = structuredClone(catalog); unverified.albums[0].eventVerified = false;
    await fs.writeFile(catalogFile, JSON.stringify(unverified));
    assert.equal((await (await get('/photos')).json()).total, 0);
    await fs.writeFile(catalogFile, JSON.stringify(catalog));
  });
  await t.test('explicitly undated approved photos use neutral ID ordering after dated publications', async () => {
    const undated = structuredClone(catalog);
    undated.photos.push(photo('z-undated', { publishedAt: null, publicationDateUnknown: true }), photo('a-undated', { publishedAt: null, publicationDateUnknown: true }));
    await fs.writeFile(catalogFile, JSON.stringify(undated));
    const items = (await (await get('/photos')).json()).items;
    assert.deepEqual(items.slice(-2).map(p => p.id), ['a-undated', 'z-undated']);
    assert.equal(items.at(-1).publishedAt, null);
    await fs.writeFile(catalogFile, JSON.stringify(catalog));
  });
  await t.test('catalog reload reflects unpublication; malformed catalog fails closed', async () => {
    await fs.writeFile(catalogFile, '{"albums":[],"photos":[]}'); assert.equal((await get('/photos/newer/download')).status, 404);
    await fs.writeFile(catalogFile, 'invalid'); assert.equal((await get('/albums')).status, 503);
  });
});
