# Upcoming Events

The Events page uses the shared header, footer, palette and typography. The catalog contains only proposed activities; no actual dates or previous gatherings have been fabricated.

## Files

- `src/events/Events.jsx`: event sections, reusable cards, native expandable details, RSVP form, loading/retry/error/success states.
- `src/events/api.js`: API boundary and request timeout/cancellation.
- `src/events/events.css`: scoped desktop/mobile styling and focus indicators.
- `src/main.jsx`: application routing, shared navigation and skip link.
- `server/events/repository.js`: catalog loading and serialized, atomic local RSVP writes with duplicate protection.
- `server/events/routes.js`: catalog, explicitly published photo delivery, RSVP validation/status gating.
- `server/data/events.json`: proposed activity catalog.
- `server/index.js`: mounts Events routes.
- `tests/events.test.js`: isolated HTTP/persistence integration tests.
- `package.json`: test and syntax-check scripts.
- `.env.example`: optional event paths.

## Running and managing events

Run `npm run dev` (Vite :5173 and API :4000), or `npm run build` then `npm start` and open http://127.0.0.1:4000/events. If Node watch hits an OS file-watcher limit, use `npm start` and `npm run dev:web` separately.

The API rereads `server/data/events.json` on each request; reload the page to see catalog changes. `EVENTS_FILE` can point to an ignored local catalog instead. Each record has `id`, `title`, `description`, optional `details`, `startsAt` (ISO timestamp with offset or null), `location`, `imageFile` (filename or null), `status` (`proposed`, `upcoming`, `completed`), and `createdAt` (record creation timestamp, not event date). IDs must remain stable and unique. Use null for unknown dates. Only confirmed future events should be marked upcoming. The API closes registration once the start time passes; dates are displayed in America/New_York time.

GET `/api/events` returns public event fields and image URLs. POST `/api/events/:id/rsvps` accepts only name and email. The server validates inputs and event eligibility, then awaits persistence before returning `{ "ok": true }`. Local records are saved under `.data/events/rsvps.json` with restricted file permissions. Repeated requests for the same event/email do not add duplicates. Proposed activities link to the existing Join form with the activity prefilled; this is interest, not an RSVP.

The local repository is for one Node process. Before multiple-process or multi-instance hosting, replace its `list()` and `saveRsvp()` implementation with a shared datastore and atomic uniqueness handling. The React API contract stays the same. No AWS resources or services were configured. Local RSVP data should be retained only as long as needed for event coordination.

## Photographs

The shipped catalog has no image references. Publication is controlled manually by the application maintainer; there is no upload or administration UI. Put only photos approved for public display in `.data/community-photos/events/` and set the corresponding `imageFile` to a simple jpg/jpeg/png/webp filename. The route serves only catalog-listed filenames. Missing photographs fall back to a quiet activity icon with no visitor-facing placeholder label. Originals are not altered. Keep private originals outside public/ and use separately prepared display copies if needed. Never stage `.data/`, `.env`, or personal photographs. The current release contains no personal photographs.

A catalog-listed image is publicly viewable through its event endpoint; `no-store` does not make it access-controlled. Future authorized private S3 delivery can replace the image URL/handler after access control is introduced.

## Verification

See [deployment readiness](deployment-readiness.md) for current automated results and remaining release checks. Use a separate fictional future-event catalog and temporary data directory to test RSVP interactions; do not add invented confirmed events to the public catalog.
