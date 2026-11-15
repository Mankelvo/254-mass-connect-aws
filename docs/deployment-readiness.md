# Verification and AWS readiness — November 15, 2026

This independent copy is ready for future AWS integration development. It is not an AWS-integrated or production-approved deployment. No AWS resources, Git commits, remotes or pushes were created. No `.git` directory was copied or initialized; initialization commands are in [repository setup](repository-preparation.md).

## Automated and HTTP verification

| Check | Result |
| --- | --- |
| `npm ci` | Passed; 124 packages installed from the unchanged lockfile. npm reported zero vulnerabilities at installation time. |
| `npm run check` | Passed for the configured JavaScript modules. |
| `npm test` | 32 passed, 0 failed; tests used temporary synthetic fixtures and localhost servers. |
| `npm run build` | Passed; Vite 6.4.6 transformed 1,583 modules. |
| Four page routes | `/`, `/events`, `/gallery`, `/join` returned HTTP 200 with the built SPA entry and rendered in Chrome. |
| APIs | Health returned local-demo; Events returned four proposed activities; albums/photos returned empty lists. |
| Rejection/privacy checks | Invalid Join body returned 400; former Home photo endpoint and private submission path returned 404. No smoke-test submissions were saved. |

A temporary production server ran on loopback port 4317 and was stopped after verification. `node_modules/` and `dist/` were freshly generated in this directory, not copied from the original. They remain ignored build/dependency artifacts.

## Browser spot checks

The browser automation host was unavailable; native Chrome controls were used instead. All four pages were viewed, including responsive previews at 1440px desktop width and 390px mobile width. Mobile menu opening and navigation to Events worked; API-backed proposals and Gallery empty states rendered.

These were visual spot checks, not complete browser acceptance tests. Join showed apparent right-edge clipping in its mobile preview; investigate the container/fieldset minimum widths and responsive sizing before release. No layout changes were made because this task preserves existing source and design. Chrome's Issues panel also reported two “Define @import rules at the top of the stylesheet” issues. The console showed zero messages at the inspected point; that does not establish a warning-free application. Review stylesheet/import ordering and any extension effects before concluding the cause. Browser submission success/retry flows, full-page overflow, real-device behavior, and populated Gallery interactions were not exercised in this pass; backend fixture coverage passed.

## Copy and privacy audit

- 35 runtime/configuration/test files were compared byte-for-byte with the original and matched, including frontend styles/components, backend routes/repositories, shared utilities, tests, package manifests and Vite configuration. No new libraries or features were introduced.
- Copied public assets contain only the SVG favicon, which was inspected as vector shapes/text. The production build contains HTML, JS, CSS and that favicon. No raster photographs or embedded raster-data patterns were found.
- Gallery catalog is empty; event image references are null. No private photographs, backups, submissions, `.env`, `.data`, original Git objects, screenshots, obsolete prototypes or AI prompt files were copied.
- Reviewed project/build files had no AWS access-key-ID or private-key pattern matches. Pattern scanning is not a universal secret detector; the explicit file allowlist and exclusion of local stores are the main copy boundary.
- Original source/document hashes matched the pre-copy baseline. Original local-environment, dependencies/build and Git files were compared by file inventory, sizes and modification times. The only observed change was `.git/FETCH_HEAD`; no task command fetched or wrote it, so its cause was not established. No original source, branch, remote, commit history or private backup was modified by this task. This is not a claim that unrelated background activity left every Git metadata file unchanged.

## Remaining AWS work

1. Design and implement DynamoDB persistence for Join submissions, and RSVPs if needed, preserving submission-ID conflicts, retries and event/email deduplication.
2. Implement private S3 delivery for synthetic or approved photographs; preserve publication filtering, separate preview/original references and byte integrity.
3. Configure the planned eleven services with least-privilege EC2 roles, HTTPS, CloudFront API forwarding, DNS and Systems Manager administration. No credentials are embedded in source.
4. Verify actual cloud round trips, denied access, failures, persistence across restarts and monitoring/notification evidence. Configure CloudTrail, CloudWatch, SNS and AWS Budgets with documented results.
5. Address browser findings and complete browser/device tests, proxy/client-IP validation, abuse controls, retention/deletion and backup/restore policies before collecting real data.
6. Confirm course service-tier eligibility and required AI-assistance disclosure with the actual MSIT.5650 policy. See [project provenance](project-provenance.md).

## Join responsive correction

After the initial copy review, the owner authorized a Join-page correction in this AWS copy only. `src/join/join.css` now uses zero-minimum grid tracks for the mobile layout and contact fields, allows text inputs/textarea to shrink, and constrains legend/heading/consent text wrapping. No JSX, validation, API or original-project files were changed. This is an intentional CSS difference from the source-copy baseline described above.

`npm run check`, all 32 tests and `npm run build` passed again. The rebuilt Join page was reloaded in Chrome, but native browser control was interrupted and the final screenshot was not usable for confirming viewport layout. A complete post-fix 320px/390px/tablet/desktop visual pass remains outstanding; the earlier CSS import warnings were outside this correction.
