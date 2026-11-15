import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { galleryRepository } from '../server/gallery/repository.js';
import { localPhotoStorage } from '../server/gallery/storage.js';

const root = fileURLToPath(new URL('../', import.meta.url));
test('release catalog publishes no unapproved photographs or fabricated albums', async () => {
  const catalogFile = path.join(root, 'server/data/photos.json');
  assert.deepEqual(JSON.parse(await fs.readFile(catalogFile, 'utf8')), { albums: [], photos: [] });
  const repository = galleryRepository(catalogFile, localPhotoStorage(path.join(root, '.data/community-photos'), path.join(root, 'public/images')));
  assert.deepEqual(await repository.published(), { albums: [], photos: [] });
});
test('photo-free release has no raster images in public assets', async () => {
  async function inspect(directory) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      assert.equal(entry.isSymbolicLink(), false, `Review public symlink: ${file}`);
      if (entry.isDirectory()) await inspect(file);
      else assert.doesNotMatch(entry.name, /\.(jpe?g|png|webp|gif|avif|heic|heif)$/i, `Requires publication consent: ${file}`);
    }
  }
  await inspect(path.join(root, 'public'));
});
