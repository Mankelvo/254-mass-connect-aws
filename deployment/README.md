# Production setup (not yet deployed)

The application can run as a single-process local-storage demonstration on EC2. It is **not yet the planned S3/DynamoDB application**. Implement and test those adapters before claiming cloud persistence. Do not create resources or upload photographs without owner approval.

For this independent source repository, follow [repository preparation](../docs/repository-preparation.md). The file list below is a runtime deployment package, not the source-repository contents.

## Prepare the release

1. Review `git status` and the [readiness report](../docs/deployment-readiness.md). Review the [publication policy](../docs/photo-removal.md). Original photo-bearing Git history is not included in this copy. Do not stage screenshots or private data by accident.
2. On a supported Node host, run `npm ci`, `npm run check`, `npm test`, and `npm run build`. Inspect `dist/` for credentials, records, unapproved images and OS metadata. Build copies every file under `public/`, even files ignored by Git.
3. Transfer only reviewed `dist/`, `public/` (the gallery adapter reads it), `server/`, `shared/`, `package.json` and `package-lock.json`. Do not transfer `.git/`, local `.env`, `.data/`, root screenshots, design references or the whole development folder. Home currently uses placeholders and exposes no preview files. Install runtime dependencies with `npm ci --omit=dev` on the target.
4. Put the release at `/var/www/254-mass-connect` or adapt all paths below. Create a dedicated unprivileged service user with read access to release files and write access only to its private `.data/` directory. Configure `.env` separately with `NODE_ENV=production` and `PORT=4000`, readable only by that user. Keep local records on persistent, protected storage; releases must not erase them. Use only fictional records for a demonstration.

## EC2 process and Nginx

After resource approval, install Node and Nginx using the selected OS's maintained packages. Run one API process with a supervisor such as systemd. Example unit (replace `/usr/bin/node` with the actual executable and create the service user first):

```ini
[Unit]
Description=254 Mass Connect API
After=network.target

[Service]
Type=simple
User=massconnect
WorkingDirectory=/var/www/254-mass-connect
Environment=NODE_ENV=production
Environment=PORT=4000
ExecStart=/usr/bin/node /var/www/254-mass-connect/server/index.js
Restart=on-failure
UMask=0077

[Install]
WantedBy=multi-user.target
```

Install the adapted unit, reload systemd, enable/start it and inspect its journal. Validate the Nginx configuration with `nginx -t` before reloading. [nginx.conf.example](nginx.conf.example) serves only `dist/` and proxies `/api/` to loopback. It is an HTTP example, not a finished TLS/origin-security configuration. Do not expose port 4000 or run Vite in production. Keep the application directory separate from the static document root.

Check `/api/health` (currently always `local-demo`), direct requests to all four page routes, API errors, download bytes and a fictional Join submission. Check storage survives service restart. The health endpoint does not verify database connectivity. `crypto.randomUUID()` on Join requires a secure browser context: use HTTPS for deployed testing; localhost works locally.

## Manual AWS tasks after approval

| Service | Required configuration and evidence |
| --- | --- |
| EC2 | OS updates, suitable instance/network, encrypted storage, restricted security group, persistent service, reboot/restart test. |
| IAM | Least-privilege instance role for specific future tables/objects; separate reviewer access as required. No embedded access keys. |
| S3 | Private bucket, Block Public Access, encryption and intentional lifecycle/retention; approved previews and verified originals only. Implement delivery adapter and test exact download bytes and denied access. |
| DynamoDB | Choose keys/indexes and retention; implement conditional writes preserving submission retry/conflict semantics and RSVP uniqueness. Test failures and real round trips. Table names alone do nothing today. |
| CloudFront | EC2 origin, HTTPS for viewers and origin, origin access restrictions. `/api/*` must allow POST, forward required query strings/headers and disable caching (including minimum TTL 0). Verify Join, RSVP, pagination and error responses through the distribution. |
| Route 53 | Domain/hosted-zone records targeting CloudFront; verify DNS and certificate coverage. Certificates are an additional prerequisite, not supplied by this repo. |
| Systems Manager | Instance role/agent/connectivity; test Session Manager access without public SSH. |
| CloudTrail | Configure intended audit coverage/retention; verify relevant events are recorded. |
| CloudWatch | Configure app/system logs without form bodies or secrets, metrics and an operational alarm. Deliberately trigger and recover it; retain evidence. |
| SNS | Confirm notification subscription and demonstrate delivery from the operational alarm. |
| AWS Budgets | Set spending thresholds and notification recipients; confirm delivery/configuration and ongoing costs. Budgets do not automatically stop resources. |

The API currently trusts loopback proxies for client addresses. Validate Nginx/CloudFront's forwarded-IP chain and restrict origin access before relying on per-client rate limiting; do not simply trust arbitrary incoming forwarding headers. RSVP has no dedicated abuse limiter. Establish privacy, retention/deletion, backups and restore procedures before collecting real data. Local JSON repositories cannot safely coordinate multiple processes or instances.

AWS references: [EC2 instance roles](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/iam-roles-for-amazon-ec2.html), [CloudFront cache behavior settings](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DownloadDistValuesCacheBehavior.html), and [HTTPS to a custom origin](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-https-cloudfront-to-custom-origin.html). These are configuration guidance, not evidence of deployment.
