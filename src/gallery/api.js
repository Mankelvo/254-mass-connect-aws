async function get(url, signal) {
  const response = await fetch(url, { signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000) });
  if (!response.ok) { const body = await response.json(); throw new Error(body.error || 'Unable to load the gallery.'); }
  return response.json();
}
export const getAlbums = (offset, signal) => get(`/api/albums?offset=${offset}&limit=12`, signal);
export const getPhotos = (albumId, offset, signal) => get(`${albumId ? `/api/albums/${encodeURIComponent(albumId)}/photos` : '/api/photos'}?offset=${offset}&limit=24`, signal);
export async function downloadOriginal(photo) {
  const response = await fetch(photo.downloadUrl, { signal: AbortSignal.timeout(120000) });
  if (!response.ok) { const body = await response.json(); throw new Error(body.error || 'The original photo is unavailable.'); }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = photo.downloadFilename || photo.originalFilename || `${photo.id}.jpg`;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
