import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createJoinRepository } from './join/repository.js';
import { joinRoutes } from './join/routes.js';
import { galleryRepository } from './gallery/repository.js';
import { localPhotoStorage } from './gallery/storage.js';
import { galleryRoutes } from './gallery/routes.js';

import { createEventRepository } from './events/repository.js';
import { eventRoutes } from './events/routes.js';

dotenv.config();
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 'loopback'); // When hosted, explicitly configure trusted reverse-proxy addresses.
app.use(express.json({ limit: '12kb' }));
if (process.env.CORS_ORIGIN) app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use('/api/events', eventRoutes({
  repository: createEventRepository({ catalogFile: path.resolve(process.env.EVENTS_FILE || path.join(here, 'data/events.json')), dataDir: path.resolve(process.env.EVENTS_DATA_DIR || path.join(root, '.data/events')) }),
  photoDir: path.resolve(process.env.EVENT_PHOTO_DIR || path.join(root, '.data/community-photos/events')),
}));
app.get('/api/health', (_req, res) => res.json({ status: 'ok', mode: 'local-demo' }));
// No Home photos are approved. Do not expose local testing files by fixed filename.
app.get('/api/home/photos/:slot/preview', (_req, res) => {
  res.set('Cache-Control', 'private, no-store');
  res.status(404).json({ error: 'Photo unavailable.' });
});

const photoStorage = localPhotoStorage(path.resolve(process.env.GALLERY_PHOTO_DIR || path.join(root, '.data/community-photos')), path.join(root, 'public/images'));
app.use('/api', galleryRoutes({
  repository: galleryRepository(path.resolve(process.env.GALLERY_CATALOG || path.join(here, 'data/photos.json')), photoStorage),
  storage: photoStorage,
}));

app.use('/api/join', joinRoutes({ repository: createJoinRepository(path.join(root, '.data/join-submissions.json')) }));
// Private development records are never served, including through the SPA fallback.
app.use((req, res, next) => {
  if (/^\/(?:\.data|join-submissions\.json|submissions\.json)(?:\/|$)/i.test(req.path)) return res.status(404).end();
  next();
});

// Serve the production build locally; the planned AWS setup uses Nginx for static files.
const dist = path.join(root, 'dist');
try {
  await fs.access(dist);
  app.use(express.static(dist));
  app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
} catch { /* development: served by Vite */ }
app.use((err, _req, res, _next) => {
  console.error('HTTP error:', err.name);
  res.status(err.status || 500).json({ error: 'Unable to process request.' });
});
const port = Number(process.env.PORT || 4000);
app.listen(port, '127.0.0.1', () => console.log(`254 Mass Connect API listening on http://127.0.0.1:${port}`));
