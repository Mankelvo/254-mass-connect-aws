import React from 'react';
import { ArrowLeft, ArrowRight, Camera, Download, Image as ImageIcon, X } from 'lucide-react';
import { getAlbums, getPhotos, downloadOriginal } from './api';

function PhotoImage({ src, title, eager = false }) {
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => setFailed(false), [src]);
  return failed ? <span className="gallery-image-unavailable"><ImageIcon aria-hidden="true"/><span>Photo unavailable</span></span> : <img src={src} alt={title} loading={eager ? 'eager' : 'lazy'} decoding="async" onError={() => setFailed(true)}/>;
}
function DownloadButton({ photo }) {
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState('');
  React.useEffect(() => setError(''), [photo.id]);
  return <div className="gallery-download"><button className="small-green-btn" disabled={pending} onClick={async () => {
    setPending(true); setError('');
    try { await downloadOriginal(photo); } catch (e) { setError(e.name === 'TimeoutError' ? 'The download timed out. Please try again.' : e.message); } finally { setPending(false); }
  }}><Download size={17}/>{pending ? 'Preparing download…' : (photo.originalAvailable ? 'Download Original' : 'Download Available File')}</button>{error && <p role="alert" className="gallery-error">{error}</p>}</div>;
}
function PhotoViewer({ photos, initialId, onClose, onAlbum, hasMore, loadMore, loading, error }) {
  const [index, setIndex] = React.useState(() => photos.findIndex(p => p.id === initialId));
  const dialog = React.useRef(null);
  const photo = photos[index];
  React.useEffect(() => {
    const opener = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current.showModal();
    return () => { document.body.style.overflow = overflow; opener?.focus(); };
  }, []);
  return <dialog ref={dialog} className="gallery-viewer" aria-label="Photo viewer" onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target === dialog.current) onClose(); }} onKeyDown={e => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); setIndex(i => Math.max(0, i - 1)); }
    if (e.key === 'ArrowRight') { e.preventDefault(); setIndex(i => Math.min(photos.length - 1, i + 1)); }
  }}><div className="viewer-inner"><button autoFocus className="viewer-close" onClick={onClose} aria-label="Close photo viewer"><X/></button>
    <div className="viewer-image"><PhotoImage src={photo.preview} title={photo.title} eager/></div>
    <div className="viewer-navigation"><button aria-label="Previous photo" disabled={index === 0} onClick={() => setIndex(i => i - 1)}><ArrowLeft/> Previous</button><span aria-live="polite">{index + 1} of {photos.length}{hasMore ? ' loaded' : ''}</span><button aria-label="Next photo" disabled={index === photos.length - 1} onClick={() => setIndex(i => i + 1)}>Next <ArrowRight/></button></div>
    {hasMore && index === photos.length - 1 && <button className="gallery-load" disabled={loading} onClick={loadMore}>{loading ? 'Loading…' : 'Load more photos'}</button>}
    {error && <p className="gallery-error" role="alert">{error}</p>}
    <div className="viewer-footer"><div><h2>{photo.title}</h2><button className="gallery-album-link" onClick={() => onAlbum(photo.albumId)}>View this album <ArrowRight size={16}/></button></div><DownloadButton key={photo.id} photo={photo}/></div>
  </div></dialog>;
}
function PhotoGrid({ photos, open }) {
  return <div className="photo-grid">{photos.map(photo => <article className="photo-card" key={photo.id}><button className="photo-preview" onClick={() => open(photo.id)} aria-label={`Open ${photo.title}`}><PhotoImage src={photo.preview} title={photo.title}/></button><div className="gallery-photo-caption">{photo.title}</div></article>)}</div>;
}
function useCollection(loader) {
  const [state, setState] = React.useState({ items: [], nextOffset: null, total: 0, loading: true, error: '' });
  const request = React.useRef(null);
  const offsetRef = React.useRef(0);
  const run = React.useCallback(async (offset = 0) => {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller; offsetRef.current = offset;
    setState(s => ({ ...s, ...(offset === 0 ? { items: [] } : {}), loading: true, error: '' }));
    try {
      const data = await loader(offset, controller.signal);
      if (!controller.signal.aborted) setState(s => ({ ...data, items: offset === 0 ? data.items : [...s.items, ...data.items.filter(p => !s.items.some(old => old.id === p.id))], loading: false, error: '' }));
    } catch { if (!controller.signal.aborted) setState(s => ({ ...s, loading: false, error: 'We couldn’t load these memories. Please try again.' })); }
  }, [loader]);
  React.useEffect(() => { run(); return () => request.current?.abort(); }, [run]);
  return { ...state, more: () => run(state.nextOffset), retry: () => run(offsetRef.current) };
}
function CollectionStatus({ collection, empty }) {
  return <>{collection.loading && <p role="status">Loading memories…</p>}{collection.error && <div className="gallery-error" role="alert"><p>{collection.error}</p><button className="gallery-load" onClick={collection.retry}>Try again</button></div>}{!collection.loading && !collection.error && !collection.items.length && <div className="gallery-empty"><Camera size={32} aria-hidden="true"/><p>{empty}</p></div>}</>;
}
function More({ collection }) {
  return collection.nextOffset !== null && !collection.error ? <button className="gallery-load" disabled={collection.loading} onClick={collection.more}>{collection.loading ? 'Loading…' : 'Load more'}</button> : null;
}
function PhotoCollection({ albumId, onAlbum, title }) {
  const loader = React.useCallback((offset, signal) => getPhotos(albumId, offset, signal), [albumId]);
  const collection = useCollection(loader);
  const [viewer, setViewer] = React.useState(null);
  return <section className="gallery-collection" aria-label={title}><div className="gallery-section-heading"><h2>{collection.items.some(p => !p.publishedAt) && title === 'Latest Photos' ? 'Community Photos' : title}</h2>{collection.total > 0 && <span>{collection.total} {collection.total === 1 ? 'photo' : 'photos'}</span>}</div>
    {collection.items.some(p => !p.publishedAt) && <p className="gallery-description">Publication dates are unavailable for some photographs. Undated photographs appear in neutral filename order after dated publications.</p>}
    <CollectionStatus collection={collection} empty="Photographs will appear here once they’re ready to share. We look forward to adding our next memories together."/>
    <PhotoGrid photos={collection.items} open={setViewer}/><More collection={collection}/>
    {viewer && <PhotoViewer photos={collection.items} initialId={viewer} onClose={() => setViewer(null)} onAlbum={id => { setViewer(null); onAlbum(id); }} hasMore={collection.nextOffset !== null} loadMore={collection.more} loading={collection.loading} error={collection.error}/>}
  </section>;
}
export default function PhotoGallery() {
  const albums = useCollection(getAlbums);
  const [albumId, setAlbumId] = React.useState(null);
  const selected = albums.items.find(a => a.id === albumId);
  const heading = React.useRef(null);
  function chooseAlbum(id) { setAlbumId(id); requestAnimationFrame(() => { heading.current?.focus(); heading.current?.scrollIntoView({ block: 'start' }); }); }
  return <main id="main-content" tabIndex={-1} className="page-container section-page gallery-page community-gallery">
    <div className="page-intro"><div className="intro-icon"><Camera size={28}/></div><div><span className="eyebrow">COMMUNITY. CULTURE. CONNECTION.</span><h1>Our Memories</h1><p>From shared meals and game nights to cookouts and adventures, every gathering brings new memories. Explore our moments together and download the available files, or original-quality photographs when verified originals are available.</p></div></div>
    <div ref={heading} tabIndex={-1} className="gallery-content-anchor">
    {albumId ? <><button className="back-button" onClick={() => chooseAlbum(null)}><ArrowLeft size={18}/> All albums</button>{selected?.description && <p className="gallery-description">{selected.description}</p>}<PhotoCollection key={albumId} albumId={albumId} onAlbum={chooseAlbum} title={selected?.title || 'Album photos'}/></> : <>
      <section aria-labelledby="gallery-albums"><div className="gallery-section-heading"><h2 id="gallery-albums">Event Albums</h2><span>Good times, kept together</span></div><CollectionStatus collection={albums} empty="Our shared album is growing. Approved photographs from community gatherings will be collected here."/>
        <div className="album-grid">{albums.items.map(album => <button type="button" className="album-card" key={album.id} onClick={() => chooseAlbum(album.id)}><div className="gallery-cover"><PhotoImage src={album.cover} title={album.title}/></div><div className="album-body"><h3>{album.title}</h3><span>{album.photoCount} {album.photoCount === 1 ? 'photo' : 'photos'}{album.eventDate ? ` · ${album.eventDate}` : ''}</span><p>{album.description}</p><strong>View Photos <ArrowRight size={16}/></strong></div></button>)}</div><More collection={albums}/>
      </section><PhotoCollection key="latest" albumId={null} onAlbum={chooseAlbum} title="Latest Photos"/>
    </>}
    </div><aside className="gallery-contribute"><Camera size={28} aria-hidden="true"/><div><h2>Every perspective adds to the story</h2><p>In the future, members will be able to share photographs with an event album. Contributions will be reviewed before they appear here, so our shared memories stay thoughtful and welcoming.</p></div></aside>
  </main>;
}
