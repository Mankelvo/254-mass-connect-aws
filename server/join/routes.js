import { Router } from 'express';
import { validateJoin, consentText, successMessage } from '../../shared/join.js';

export function joinRoutes({ repository, now = Date.now, maxAttempts = 30 }) {
  const router = Router();
  const attempts = new Map();
  router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  router.post('/', async (req, res) => {
    const time = now();
    for (const [key, entry] of attempts) if (entry.until <= time) attempts.delete(key);
    const key = req.ip || 'unknown';
    const entry = attempts.get(key) || { count: 0, until: time + 3600000 };
    if (entry.count >= maxAttempts || (!attempts.has(key) && attempts.size >= 10000)) {
      res.set('Retry-After', String(Math.max(1, Math.ceil((entry.until - time) / 1000))));
      return res.status(429).json({ error: 'Too many attempts. Please try again in an hour.' });
    }
    entry.count++; attempts.set(key, entry);
    if (typeof req.body?.website === 'string' && req.body.website.trim()) return res.status(201).json({ ok: true, message: successMessage });
    const { value, errors } = validateJoin(req.body);
    if (Object.keys(errors).length) return res.status(400).json({ error: 'Please check the highlighted fields.', errors });
    const { website, ...details } = value;
    const timestamp = new Date(time).toISOString();
    try {
      await repository.save({ ...details, consentText, consentAt: timestamp, submittedAt: timestamp, status: 'new' });
      return res.status(201).json({ ok: true, message: successMessage });
    } catch (error) {
      if (error.code === 'CONFLICT') return res.status(409).json({ error: 'This response was already received. Refresh the page to send a different response.' });
      // Do not log form contents, contact details, or raw storage errors.
      return res.status(503).json({ error: 'We couldn’t save your interest. Your entries are still here; please try again.' });
    }
  });
  router.all('/', (_req, res) => res.status(405).set('Allow', 'POST').json({ error: 'Method not allowed.' }));
  return router;
}
