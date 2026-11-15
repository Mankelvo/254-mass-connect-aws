import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowRight, ArrowLeft, CalendarDays, Camera, Check, CheckCircle2, ChevronRight,
  Download, Heart, Image as ImageIcon, Mail, MapPin, Menu, Mountain, Phone,
  ShieldCheck, Sparkles, UtensilsCrossed, Users, X,
} from 'lucide-react';
import Join from './join/Join';
import './join/join.css';
import Events from './events/Events';
import PhotoGallery from './gallery/Gallery';
import './styles.css';
import './events/events.css';
import './gallery/gallery.css';

const menuItems = [
  { path: '/', label: 'Home' },
  { path: '/events', label: 'Upcoming Events' },
  { path: '/gallery', label: 'Photo Gallery' },
  { path: '/join', label: 'Join Us' },
];

function useLocation() {
  const [path, setPath] = React.useState(window.location.pathname);
  React.useEffect(() => {
    const handle = () => setPath(window.location.pathname);
    window.addEventListener('popstate', handle);
    return () => window.removeEventListener('popstate', handle);
  }, []);
  return path;
}
function navigate(path) {
  if (window.location.pathname + window.location.search !== path) {
    window.history.pushState({}, '', path);
  }
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0, behavior: 'instant' });
}
function Link({ to, className = '', children, ...rest }) {
  return <a href={to} className={className} onClick={(e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault(); navigate(to);
  }} {...rest}>{children}</a>;
}
function Brand({ flags = true }) {
  return <Link to="/" className="brand" aria-label={flags ? '254 Mass Connect, Kenya and United States, home' : '254 Mass Connect home'}>
    <span className="brand-254">254</span> <span className="brand-mass">Mass</span> <span className="brand-connect">Connect</span>
    {flags ? <span className="brand-flags" aria-hidden="true"><span>🇰🇪</span><span>🇺🇸</span></span> : <span className="skyline" aria-hidden="true"><i/><i/><i/><i/><i/><i/><i/><i/><i/></span>}
  </Link>;
}
function Header({ path }) {
  const [open, setOpen] = React.useState(false);
  const toggle = React.useRef(null);
  React.useEffect(() => setOpen(false), [path]);
  return <header className="site-header" onKeyDown={e => { if (e.key === 'Escape' && open) { setOpen(false); toggle.current?.focus(); } }}><div className="nav-container">
    <Brand />
    <button ref={toggle} aria-controls="main-navigation" className="nav-toggle" onClick={() => setOpen(o => !o)} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}>
      {open ? <X size={22}/> : <Menu size={22}/>}</button>
    <nav id="main-navigation" className={`main-nav ${open ? 'nav-open' : ''}`} aria-label="Main navigation">
      {menuItems.map(item => <Link key={item.path} to={item.path} aria-current={path === item.path ? 'page' : undefined} className={`nav-link ${path === item.path ? 'nav-active' : ''}`}>{item.label}</Link>)}
    </nav>
  </div></header>;
}
function ButtonLink({ to, children, outline = false, green = false, className = '' }) {
  return <Link to={to} className={`pill-btn ${outline ? 'pill-outline' : ''} ${green ? 'pill-green' : ''} ${className}`}>{children}<ArrowRight size={17} strokeWidth={2.4}/></Link>;
}
function SectionHead({ icon: Icon, children, action }) {
  return <div className="section-heading"><div className="section-heading-title"><span className="section-mark"/>{Icon && <Icon size={21} color="#0b6a36"/>}<h2>{children}</h2></div>{action}</div>;
}
function HomePhoto({ slot, className = '' }) {
  return <div className={`home-photo ${className}`} aria-hidden="true">
    {slot !== 'hero' && <div className="home-photo-fallback"><UtensilsCrossed size={36} strokeWidth={1.4}/></div>}
  </div>;
}
function Home() {
  return <main id="main-content" tabIndex={-1} className="home-page">
    <section className="home-hero" aria-labelledby="home-title">
      <HomePhoto slot="hero" className="home-hero-photo"/>
      <div className="flag-ribbon" aria-hidden="true"/>
      <div className="home-hero-copy">
        <h1 id="home-title">254 Mass Connect</h1>
        <p>Bringing Kenyans and friends together across Massachusetts through good food, meaningful friendships, fun activities, and unforgettable experiences.</p>
        <p className="home-tagline">Good Times. Great People. Lasting Memories.</p>
        <ButtonLink to="/join">Join Our Community</ButtonLink>
      </div>
    </section>
    <div className="page-container home-content">
      <div className="home-grid">
        <section><SectionHead>Community Highlights</SectionHead>
          <div className="feature-grid">
            <article className="feature-card"><div className="feature-icon"><Users size={25}/></div><h3>Connect</h3><p>Meet Kenyans and friends across Massachusetts and build friendships that feel like home.</p></article>
            <article className="feature-card"><div className="feature-icon"><UtensilsCrossed size={25}/></div><h3>Share Culture</h3><p>Share Kenyan meals, stories, and traditions, with a warm welcome for everyone.</p></article>
            <article className="feature-card"><div className="feature-icon red"><Mountain size={25}/></div><h3>Explore & Have Fun</h3><p>Enjoy time together through cookouts, games, road trips, and new adventures.</p></article>
          </div>
        </section>
        <section><SectionHead icon={CalendarDays}>Upcoming Events</SectionHead>
          <div className="featured-event"><HomePhoto slot="meal"/><div><span className="home-event-status">STAY CONNECTED</span><h3>More good times ahead</h3>
            <p>No upcoming gathering is confirmed yet. Join the community to hear when dates and details are announced.</p>
</div></div>
          <ButtonLink to="/events" outline className="home-event-link">View All Events</ButtonLink>
        </section>
      </div>
    </div>
  </main>;
}
function Footer({ home = false }) {
  return <footer className="site-footer"><div className="page-container footer-layout"><div><Brand/><p>Community. Culture. Connection.</p></div><div className="footer-links"><Link to="/events">Events</Link><Link to="/gallery">Photo Gallery</Link><Link to="/join">Join Us</Link></div><span>© {new Date().getFullYear()} 254 Mass Connect. Built for community.</span></div></footer>;
}
function App() {
  const path = useLocation();
  const currentPage = path === '/events' ? <Events/> : path === '/gallery' ? <PhotoGallery/> : path === '/join' ? <Join/> : <Home/>;
  return <>{(path === '/' || path === '/events' || path === '/gallery' || path === '/join') && <a className="skip-link" href="#main-content">Skip to main content</a>}<Header path={path}/><div className="site-shell">{currentPage}</div><Footer home={path === '/'}/></>;
}

createRoot(document.getElementById('root')).render(<App/>);
