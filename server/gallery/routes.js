import { Router } from 'express';

const publicPhoto = photo => ({
  id: photo.id, albumId: photo.albumId, title: photo.title, publishedAt: photo.publishedAt,
  preview: `/api/photos/${encodeURIComponent(photo.id)}/preview`,
  originalAvailable: photo.originalAvailable,
  downloadUrl: `/api/photos/${encodeURIComponent(photo.id)}/${photo.originalAvailable ? 'download' : 'available-download'}`,
  downloadFilename: photo.originalAvailable ? photo.originalFile : photo.previewFile,
  downloadKind: photo.originalAvailable ? 'original' : 'available',
  originalFilename: photo.originalAvailable && typeof photo.originalFile === 'string' && !/[\\/\x00-\x1f]/.test(photo.originalFile) ? photo.originalFile : null,
});
function page(items, query) {
  const offset = Number(query.offset ?? 0);
  const limit = Number(query.limit ?? 24);
  if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(limit) || limit < 1 || limit > 60) return null;
  return { items: items.slice(offset, offset + limit), total: items.length, nextOffset: offset + limit < items.length ? offset + limit : null };
}
export function galleryRoutes({ repository, storage }) {
  const router = Router();
  router.use((_req, res, next) => { res.set('Cache-Control', 'private, no-store'); next(); });
  router.get('/albums', async (req, res, next) => {
    try {
      const { albums, photos } = await repository.published();
      const result = albums.map(album => {
        const collection = photos.filter(p => p.albumId === album.id);
        const cover = collection.find(p => p.id === album.coverPhotoId) || collection[0];
        return { id: album.id, title: album.title, description: album.description || '', eventDate: album.eventDate || null, photoCount: collection.length, cover: publicPhoto(cover).preview };
      });
      const output = page(result, req.query);
      if (!output) return res.status(400).json({ error: 'Invalid pagination.' });
      res.json(output);
    } catch (error) { next(error); }
  });
  router.get(['/photos', '/albums/:albumId/photos'], async (req, res, next) => {
    try {
      const { albums, photos } = await repository.published();
      if (req.params.albumId && !albums.some(a => a.id === req.params.albumId)) return res.status(404).json({ error: 'Album unavailable.' });
      const output = page(photos.filter(p => !req.params.albumId || p.albumId === req.params.albumId).map(publicPhoto), req.query);
      if (!output) return res.status(400).json({ error: 'Invalid pagination.' });
      res.json(output);
    } catch (error) { next(error); }
  });
  for (const kind of ['preview', 'download', 'available-download']) router.get(`/photos/:photoId/${kind}`, async (req, res) => {
    try {
      const { photos } = await repository.published();
      const photo = photos.find(p => p.id === req.params.photoId);
      if (!photo) return res.status(404).json({ error: 'Photo unavailable.' });
      const original = kind === 'download';
      const filename = original ? photo.originalFile : photo.previewFile;
      const file = await storage.resolveFile(original ? 'originals' : (photo.previewSource || 'previews'), filename);
      res.set('X-Content-Type-Options', 'nosniff');
      const onError = error => { if (error && !res.headersSent) res.status(404).json({ error: original ? 'The original photo is unavailable. Please try again later.' : 'Photo unavailable.' }); };
      if (original || kind === 'available-download') res.download(file, filename, onError);
      else res.sendFile(file, onError);
    } catch { res.status(404).json({ error: kind === 'download' ? 'The original photo is unavailable. Please try again later.' : 'Photo unavailable.' }); }
  });
  router.use((error, _req, res, _next) => res.status(503).json({ error: 'The gallery is temporarily unavailable. Please try again.' }));
  return router;
}
