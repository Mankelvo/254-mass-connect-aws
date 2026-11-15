import { promises as fs } from 'node:fs';
import path from 'node:path';

// Replace this adapter with private S3 access later; routes use stable photo IDs.
export function localPhotoStorage(root, publicImagesDir) {
  async function resolveFile(kind, filename) {
    if (!['previews', 'originals', 'public-images'].includes(kind) || typeof filename !== 'string' || !filename || filename.startsWith('.') || /[\\/\x00-\x1f]/.test(filename) || !/\.(jpe?g|png|webp|gif|avif|heic|heif)$/i.test(filename)) throw new Error('Unavailable file');
    const directory = await fs.realpath(kind === 'public-images' ? (publicImagesDir || '') : path.join(root, kind));
    if (kind === 'public-images' && !publicImagesDir) throw new Error('Unavailable file');
    const file = await fs.realpath(path.join(directory, filename));
    // Resolve symlinks before enforcing containment.
    if (path.dirname(file) !== directory || !(await fs.stat(file)).isFile()) throw new Error('Unavailable file');
    return file;
  }
  return {
    resolveFile,
    async hasPreview(filename, source = 'previews') { try {
      if (!['previews', 'public-images'].includes(source)) return false;
      await resolveFile(source, filename); return true;
    } catch { return false; } },
    async hasOriginal(filename) { try { await resolveFile('originals', filename); return true; } catch { return false; } },
  };
}
