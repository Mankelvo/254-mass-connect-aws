# 254 Mass Connect — AWS Cloud Computing Project

**UMass Lowell · MSIT.5650 Cloud Computing · Professor Bob Bell**

An independent AWS-oriented copy of the existing 254 Mass Connect application. Application source, design and behavior are preserved; original Git history, private data, photographs and development prompts are excluded. See [project provenance and AI assistance](docs/project-provenance.md).

254 Mass Connect helps Kenyan youth and friends across Massachusetts discover community activities, build friendships and express interest in participating. It brings event information and contact requests into one place; the planned approved-photo gallery also addresses the loss of image quality when photographs are shared through messaging apps.

A four-page React + Vite application with a Node.js/Express API. All four pages are implemented. **The current application uses local storage only; AWS integration and deployment are not yet verified.** See the [deployment-readiness report](docs/deployment-readiness.md) and [deployment guide](deployment/README.md).

## Implemented pages

- **Home:** community introduction, highlights, navigation and an honest unconfirmed-event message. Home uses a photo-free hero background and meal icon. Former preview endpoints return 404.
- **Upcoming Events:** API-backed proposed/upcoming/completed sections, expandable details, interest links into Join Us, and validated, deduplicated RSVPs for confirmed future events. The shipped catalog contains four proposals, not confirmed gatherings. See [events](docs/events.md).
- **Photo Gallery:** approval-filtered albums/photos, pagination, modal viewing, keyboard navigation, and byte-preserving downloads. “Download Available File” serves the registered preview; “Download Original” requires a separately supplied exact original. Storage is local, not S3. See [gallery](docs/gallery.md).
- **Join Us:** name plus email or phone, optional city/interests/message, required contact consent, shared client/server validation, honeypot, in-memory rate limiting, retry deduplication and success/error feedback. It expresses interest; it does not create membership or send invitations.

## Local development

Use Node.js 20+ and npm with registry access.

```bash
npm ci
cp .env.example .env
npm run dev
```

Open http://127.0.0.1:5173. Vite proxies `/api` to Express on loopback port 4000. Keep `PORT=4000` with the supplied Vite proxy. If watch mode hits `EMFILE`, run `npm start` and `npm run dev:web` in separate terminals. Use fictional submissions only.

```bash
npm run check
npm test
npm run build
npm start
```

The built application is then available at http://127.0.0.1:4000, including direct `/events`, `/gallery` and `/join` requests. `npm run preview` previews frontend assets only; it is not a replacement for the Express API. `check` checks the listed JavaScript modules; the Vite build also compiles JSX. `src/data.js` is legacy illustrative content, not the live event catalog.

## Technology stack

React 19 renders the four pages; Vite 6 provides development tooling and production bundling. Node.js (ES modules) and Express 4 provide the API and local production server. Styling uses CSS and Lucide React icons. Automated tests use Node’s built-in test runner. Nginx is the planned production web server; Amazon Web Services is the planned cloud infrastructure. The supplied Nginx configuration is an example, not a verified deployment. AWS SDK dependencies are installed but are not called by the current application.

## Existing API

All paths are relative to the application origin. There are no upload, administrator, login or public submission-list endpoints.

| Method and path | Current behavior |
| --- | --- |
| `GET /api/health` | Returns `status: ok`, `mode: local-demo`; does not check AWS or storage health. |
| `GET /api/events` | Lists the local catalog; elapsed upcoming events are returned as completed. |
| `GET /api/events/:id/photo` | Serves a catalog-listed local image, or 404. All current image references are null. |
| `POST /api/events/:id/rsvps` | Validates `fullName` and `email`; accepts confirmed future events only and deduplicates by event/email. |
| `POST /api/join` | Validates contact details, consent and UUID `submissionId`; persists locally with retry/conflict handling. See `shared/join.js` for the exact field contract. |
| `GET /api/albums` | Lists approved albums containing available approved photos. |
| `GET /api/photos`, `GET /api/albums/:albumId/photos` | Lists eligible photos; list endpoints use `offset` and `limit` (default 24, maximum 60). |
| `GET /api/photos/:photoId/preview` | Serves the registered preview for an eligible photo. |
| `GET /api/photos/:photoId/available-download` | Downloads the registered preview unchanged. |
| `GET /api/photos/:photoId/download` | Downloads a separately supplied original unchanged; never substitutes a preview. |
| `GET /api/home/photos/:slot/preview` | Always returns 404 following withdrawal of photo publication approval. |

Gallery lists currently return empty results; unavailable albums/photos return 404. Join validation errors return 400, conflicting retry IDs 409, rate limits 429 and persistence failures 503. Honeypot submissions receive a success response without being stored.

## Actual storage and AWS architecture

“Local storage” here means server-side files, not browser `localStorage` or a database. Today, Express reads event/gallery catalogs from `server/data/`, saves Join submissions to `.data/join-submissions.json`, and saves RSVPs to `.data/events/rsvps.json`. Local writes are serialized within one Node process. `.data/` is ignored by Git and excluded from Vite's build, but allowlisted photo endpoints are public. Do not treat local photo directories as access-controlled albums.

Planned flow: browser → Route 53 domain → CloudFront → EC2/Nginx → Express. EC2 would use an IAM instance role to write member/RSVP or gallery metadata to DynamoDB and retrieve photo objects from private S3, streaming bytes or issuing short-lived signed URLs. **These DynamoDB/S3 adapters still need implementation and tests.** Neither `DDB_MEMBERS_TABLE`, `S3_PHOTO_BUCKET` nor `AWS_REGION` activates them; installed AWS SDK packages alone do not provide integration. A DynamoDB key schema must be chosen to preserve current submission-ID retry semantics.

## Planned AWS services

All eleven services below are **planned, not configured, integrated or verified by this project setup**. Tier labels follow the supplied project scope and remain subject to course approval.

| Tier | Service | Intended role |
| --- | --- | --- |
| 1 | Amazon EC2 | Host Nginx, the built React application and the Express API. |
| 1 | AWS IAM | Least-privilege instance role for table/object access and course reviewer permissions. |
| 1 | Amazon S3 | Private storage for synthetic or explicitly approved previews and originals. |
| 1 | Amazon DynamoDB | Persist Join Us submissions; confirmed-event RSVPs if needed, with atomic deduplication. |
| 1 | Amazon CloudFront | HTTPS website delivery, with API requests forwarded without caching. |
| 1 | Amazon Route 53 | DNS records for the application domain. |
| 1 | AWS Systems Manager | Administer EC2 without public SSH access. |
| 1 | AWS CloudTrail | Audit configured AWS activity. |
| 2 | Amazon CloudWatch | Application/system logs, metrics and a demonstrable operational alarm. |
| 2 | Amazon SNS | Deliver operational alarm notifications. |
| 2 | AWS Budgets | Spending thresholds and budget notifications. |

Follow the [production setup guide](deployment/README.md) after approval. Existing repository interfaces remain unchanged: Join `save(record)`, Events `list()`/`saveRsvp(record)`, and Gallery `published()` plus local storage methods. Future adapters must preserve validation, retry/conflict semantics, publication eligibility and download integrity. S3 requires adapting local file delivery to streaming or signed URLs; changing environment variables alone is insufficient.

## Publication boundaries

Never commit `.env`, credentials, private contact records or `.data/`. Vite copies **all** of `public/` into `dist/`; static image URLs are public independently of Gallery approval. This copy starts with an empty Gallery catalog and photo-free Home/Join placeholders. No personal photographs or original Git history were copied. See [publication policy](docs/photo-removal.md).

Publication is controlled manually by the maintainer: verify consent, supply approved files, then register catalog records. There is no administrator dashboard, upload endpoint or viewer login. Private S3 storage and signed URLs will not themselves establish member authentication.

Before accepting real submissions, establish retention/deletion and backup responsibilities, verify HTTPS and proxy/client-IP behavior, and assess abuse protection. Local JSON writes support one Node process; Join rate limiting is in memory and RSVP has no dedicated limiter. AWS integration, infrastructure, operational/budget alert evidence and browser checks remain release work; see [verification status](docs/deployment-readiness.md).

## Independent repository

This directory has no inherited Git history. See [repository setup](docs/repository-preparation.md) for commands to initialize a fresh repository and, only after approval, create its first commit and private GitHub remote. No commit, remote, push or AWS deployment is part of this preparation.
