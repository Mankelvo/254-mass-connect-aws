# Gallery setup and review

The release catalog contains empty `albums` and `photos` arrays. The owner confirmed that the former personal photographs lack permission for publication; all earlier approval records are withdrawn. See [publication policy](photo-removal.md). No sample albums or S3 uploads exist.

The gallery still reads `server/data/photos.json` on each request and supports approved albums, viewing, pagination and downloads. Its friendly empty states appear until future approved records are supplied. No directory is scanned for automatic publication.

## Administrator-controlled publication

Publication is a manual maintainer/administrator process, not an implemented admin dashboard or upload API. After confirming permission from the people pictured and verifying event details, the maintainer supplies approved files and edits the catalog. The API filters those records; it does not establish consent or authenticate viewers. Files outside `public/` become publicly retrievable when eligible records reference them. Private S3 storage alone will not provide member authentication.

Add album and photo records only after this review.
This is a schema example only, not a statement that this photograph is approved:

```json
{
  "albums": [{
    "id": "confirmed-event",
    "title": "Organizer-confirmed event name",
    "status": "approved",
    "eventVerified": true,
    "eventSource": "Record who confirmed the event details and when",
    "eventDate": null
  }],
  "photos": [{
    "id": "confirmed-photo",
    "albumId": "confirmed-event",
    "title": "Owner-confirmed caption",
    "status": "approved",
    "publishedAt": "2026-11-14T12:00:00Z",
    "previewSource": "public-images",
    "previewFile": "album-cookout.jpg",
    "originalFile": null
  }]
}
```

For new publications, use the actual publication timestamp with a timezone, not
the capture time or file modification time. Existing photos with unknown dates
use `publishedAt: null` and explicit `publicationDateUnknown: true`; these appear
after dated publications in neutral ID order (IDs need not match filenames).
The section is labeled “Community Photos” when undated photos are present. Future timestamps are withheld. Latest photos sort by timestamp
instant descending, then ID for deterministic ties. Event dates may remain null
when unconfirmed; do not infer them from filenames or EXIF. Record only verified
information in public titles, descriptions and dates. `eventSource` is internal.

`previewSource: "public-images"` references the existing file in place. Omit it or
use `"previews"` for private-directory previews. Only plain image filenames are
accepted, not paths, URLs, traversal, hidden files or escaping symlinks.

Place separately verified, untouched originals in
`.data/community-photos/originals/` (or `GALLERY_PHOTO_DIR/originals/`) and set
`originalFile` to that exact filename. Never copy a preview there just to enable a
download. Original provenance must be confirmed by the owner; file existence alone
cannot prove camera-original provenance. The API exposes `originalAvailable` and
labels a download “Download Original” only when the private original exists.
Otherwise, “Download Available File” downloads the unchanged registered preview
through a separate `available-download` endpoint. The original-download endpoint
still returns 404 for missing originals and never substitutes preview bytes. Downloads preserve the file bytes and filename.

The viewer supports left/right arrow keys, Escape, native modal focus handling,
album links and loading additional pages. Album and latest-photo lists paginate
independently. Unpublishing metadata takes effect on subsequent API requests.

## Publication boundary

There are no personal photographs in `public/` or the production build. Vite copies all public files into `dist/`, so never place unapproved images there. Current tests enforce a photo-free release; update that expectation only with explicit consent for a future publication. Gallery API filtering alone cannot restrict static files.

## Future providers

`galleryRoutes` receives an injected repository and storage adapter. Keep stable
photo IDs and the public response contract when introducing DynamoDB metadata and
private S3 objects. Implement the repository's `published()` contract with the same
approval, verified-album and publication-time rules. Replace local `resolveFile`
delivery with S3 streaming or short-lived authorized downloads, retaining separate
preview and original object references. Do not expose local paths or private keys.
No AWS deployment or gallery cloud adapter is included in this review.

## Verification

See [deployment readiness](deployment-readiness.md) for current check, test and build results. Synthetic temporary fixtures still verify albums, pagination, approval filtering and byte-preserving original/available downloads without publishing personal photographs. No visual browser pass is claimed. S3 integration remains future work.
