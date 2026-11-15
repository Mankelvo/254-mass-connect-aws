# Photograph publication policy

The original private application previously contained photographs of real people without confirmed publication permission. Those images, their backups, screenshots and historical Git objects are excluded from this independent AWS copy. The private removal inventory remains in the original project; no private backup paths are reproduced here.

The shipped Gallery catalog contains empty `albums` and `photos` arrays. Event image references are null. Home and Join retain their existing photo-free placeholders. The only public static asset is the SVG favicon. Existing tests use synthetic bytes in temporary directories and enforce a photo-free public release.

Future photographs must be synthetic or explicitly approved for publication. A maintainer verifies permission and metadata before registering files. There is no visitor upload or administration dashboard. Never restore withdrawn personal photographs for demonstrations. Approval filtering is not viewer authentication: registered files can be public, and all files in `public/` are copied to the production build.

S3 delivery is planned, not implemented. Preserve separate preview/original references and verify unchanged download bytes. Do not label a preview as a camera original. See [Gallery documentation](gallery.md).
