import { promises as fs } from 'node:fs';

export function galleryRepository(catalogFile, storage) {
  return {
    async published() {
      const catalog = JSON.parse(await fs.readFile(catalogFile, 'utf8'));
      if (!Array.isArray(catalog.albums) || !Array.isArray(catalog.photos)) throw new Error('Invalid gallery catalog');
      const safeId = value => typeof value === 'string' && /^[a-zA-Z0-9_-]+$/.test(value);
      const albums = catalog.albums.filter(a => a && a.status === 'approved' && safeId(a.id) && typeof a.title === 'string' && a.eventVerified === true && typeof a.eventSource === 'string' && a.eventSource.trim().length > 0);
      const hasPublicationDate = p => typeof p.publishedAt === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(p.publishedAt) && Number.isFinite(Date.parse(p.publishedAt)) && Date.parse(p.publishedAt) <= Date.now();
      const eligible = catalog.photos.filter(p => p && p.status === 'approved' && safeId(p.id) && typeof p.title === 'string' &&
        (hasPublicationDate(p) || (p.publishedAt === null && p.publicationDateUnknown === true)) && albums.some(a => a.id === p.albumId));
      const available = await Promise.all(eligible.map(p => storage.hasPreview(p.previewFile, p.previewSource)));
      const photos = eligible.filter((_p, i) => available[i]).sort((a, b) => (Date.parse(b.publishedAt) || 0) - (Date.parse(a.publishedAt) || 0) || a.id.localeCompare(b.id));
      for (const photo of photos) photo.originalAvailable = await storage.hasOriginal(photo.originalFile);
      return { albums: albums.filter(a => photos.some(p => p.albumId === a.id)), photos };
    },
  };
}
