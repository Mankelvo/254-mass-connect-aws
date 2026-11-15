import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

export function eventRoutes({ repository, photoDir }) {
  const router = Router();
  router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  const status = event => event.status === 'upcoming' && Date.parse(event.startsAt) <= Date.now() ? 'completed' : event.status;
  router.get('/', async (_req, res, next) => {
    try {
      res.json((await repository.list()).map(event => ({
        id: event.id, title: event.title, description: event.description, details: event.details,
        startsAt: event.startsAt, location: event.location, createdAt: event.createdAt,
        status: status(event), image: event.imageFile ? `/api/events/${encodeURIComponent(event.id)}/photo` : null,
      })));
    } catch (error) { next(error); }
  });
  router.get('/:id/photo', async (req, res, next) => {
    try {
      const event = (await repository.list()).find(e => e.id === req.params.id);
      // Only explicitly published catalog images are served; never expose the photo directory.
      if (!event?.imageFile || path.basename(event.imageFile) !== event.imageFile || !/\.(jpg|jpeg|png|webp)$/i.test(event.imageFile)) return res.status(404).json({ error: 'Photo unavailable.' });
      res.sendFile(path.join(photoDir, event.imageFile), error => { if (error && !res.headersSent) res.status(404).json({ error: 'Photo unavailable.' }); });
    } catch (error) { next(error); }
  });
  router.post('/:id/rsvps', async (req, res) => {
    try {
      const event = (await repository.list()).find(e => e.id === req.params.id);
      if (!event) return res.status(404).json({ error: 'Event not found.' });
      if (status(event) !== 'upcoming') return res.status(409).json({ error: 'RSVPs are only open for confirmed upcoming events.' });
      const { fullName, email } = req.body || {};
      if (typeof fullName !== 'string' || fullName.trim().length < 2 || fullName.length > 100 || typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return res.status(400).json({ error: 'Enter your name (2–100 characters) and a valid email address.' });
      await repository.saveRsvp({ id: randomUUID(), eventId: event.id, fullName: fullName.trim(), email: email.trim().toLowerCase(), createdAt: new Date().toISOString() });
      res.status(201).json({ ok: true });
    } catch { res.status(503).json({ error: 'We could not save your RSVP. Please try again.' }); }
  });
  router.use((error, _req, res, _next) => { res.status(503).json({ error: 'Events are temporarily unavailable. Please try again.' }); });
  return router;
}
