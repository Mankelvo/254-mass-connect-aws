import React from 'react';
import { CalendarDays, MapPin, UtensilsCrossed, Mountain, Users, ArrowRight, CheckCircle2 } from 'lucide-react';
import { listEvents, submitRsvp } from './api';

function RsvpForm({ event }) {
  const [values, setValues] = React.useState({ fullName: '', email: '' });
  const [state, setState] = React.useState({ pending: false, error: '', done: false });
  async function submit(e) {
    e.preventDefault();
    if (state.pending) return;
    if (values.fullName.trim().length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) { setState({ error: 'Enter your name and a valid email address.' }); return; }
    setState({ pending: true, error: '' });
    try { await submitRsvp(event.id, values); setValues({ fullName: '', email: '' }); setState({ done: true }); }
    catch (error) { setState({ error: error.name === 'TimeoutError' ? 'The request timed out. Please try again.' : error.message }); }
  }
  if (state.done) return <div className="rsvp-success" role="status"><CheckCircle2 size={23}/><div><strong>Your RSVP is saved.</strong><p>We look forward to seeing you at {event.title}.</p></div></div>;
  return <form className="event-rsvp" onSubmit={submit} aria-label={`RSVP for ${event.title}`}>
    <h4>Save your place</h4><p>We’ll use your name and email to coordinate this event. They won’t be shown publicly.</p>
    <label htmlFor={`${event.id}-name`}>Full name</label><input id={`${event.id}-name`} autoComplete="name" required minLength={2} maxLength={100} value={values.fullName} onChange={e => setValues({ ...values, fullName: e.target.value })} disabled={state.pending}/>
    <label htmlFor={`${event.id}-email`}>Email address</label><input id={`${event.id}-email`} type="email" autoComplete="email" required maxLength={254} value={values.email} onChange={e => setValues({ ...values, email: e.target.value })} disabled={state.pending}/>
    {state.error && <p className="event-error" role="alert">{state.error}</p>}
    <button className="small-green-btn" disabled={state.pending}>{state.pending ? 'Saving RSVP…' : 'Confirm RSVP'}</button>
  </form>;
}
function EventCard({ event }) {
  const [failed, setFailed] = React.useState(false);
  const Icon = event.id === 'dinner' ? UtensilsCrossed : event.id === 'roadtrip' ? Mountain : Users;
  return <article className="gathering-card">
    <div className="gathering-visual">{event.image && !failed ? <img src={event.image} alt={event.title} loading="lazy" onError={() => setFailed(true)}/> : <Icon size={38} strokeWidth={1.3} aria-hidden="true"/>}</div>
    <div className="gathering-body"><span className={`event-status status-${event.status}`}>{({ proposed: 'Proposed activity', upcoming: 'Upcoming · RSVP open', completed: 'Completed' })[event.status]}</span>
      <h3>{event.title}</h3><p>{event.description}</p>
      <div className="event-meta"><CalendarDays size={16}/>{event.startsAt ? <time dateTime={event.startsAt}>{new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/New_York' }).format(new Date(event.startsAt))} ET</time> : <span>{event.status === 'completed' ? 'A community gathering' : 'Date and time to be announced'}</span>}</div>
      <div className="event-meta"><MapPin size={16}/><span>{event.location || 'Location to be announced'}</span></div>
      <details className="gathering-details"><summary>{event.status === 'upcoming' ? 'Details & RSVP' : 'View details'}</summary><div className="gathering-expanded"><p>{event.details || event.description}</p>
        {event.status === 'proposed' && <><p>This is an idea for a future gathering. Dates and arrangements are not confirmed, and RSVPs are not open.</p><a className="event-interest" href={`/join?event=${encodeURIComponent(event.title)}`}>Share your interest <ArrowRight size={16}/></a></>}
        {event.status === 'upcoming' && <RsvpForm event={event}/>}
        {event.status === 'completed' && <p>This gathering has ended. RSVPs are closed.</p>}
      </div></details>
    </div>
  </article>;
}
export default function Events() {
  const [events, setEvents] = React.useState([]);
  const [state, setState] = React.useState('loading');
  const [attempt, setAttempt] = React.useState(0);
  React.useEffect(() => {
    const controller = new AbortController();
    setState('loading');
    listEvents(controller.signal).then(data => { if (!controller.signal.aborted) { setEvents(data); setState('ready'); } }).catch(() => { if (!controller.signal.aborted) setState('error'); });
    return () => controller.abort();
  }, [attempt]);
  const upcoming = events.filter(e => e.status === 'upcoming').sort((a,b) => Date.parse(a.startsAt)-Date.parse(b.startsAt));
  const proposed = events.filter(e => e.status === 'proposed');
  const past = events.filter(e => e.status === 'completed').sort((a,b) => (Date.parse(b.startsAt)||0)-(Date.parse(a.startsAt)||0));
  return <main id="main-content" tabIndex={-1} className="page-container section-page events-page">
    <div className="page-intro"><div className="intro-icon"><CalendarDays size={28}/></div><div><span className="eyebrow">COME TOGETHER</span><h1>Upcoming Events</h1><p>Good food, great company, and unforgettable experiences. See what's happening with the 254 Mass Connect community.</p></div></div>
    {state === 'loading' && <p className="events-empty" role="status">Finding what’s next…</p>}
    {state === 'error' && <div className="events-empty" role="alert"><h2>We couldn’t load the events</h2><p>Please check your connection and try again.</p><button className="small-green-btn" onClick={() => setAttempt(a => a + 1)}>Try again</button></div>}
    {state === 'ready' && <>
      <section aria-labelledby="confirmed-heading"><h2 id="confirmed-heading" className="events-section-title">On the calendar</h2>{upcoming.length ? <div className="events-grid">{upcoming.map(e => <EventCard key={e.id} event={e}/>)}</div> : <div className="events-empty"><CalendarDays size={30} aria-hidden="true"/><div><h3>More good times ahead</h3><p>No upcoming events have been confirmed yet. When a gathering is announced, you’ll find the date, details, and RSVP right here.</p></div></div>}</section>
      {proposed.length > 0 && <section aria-labelledby="ideas-heading"><div className="events-section-heading"><h2 id="ideas-heading">Ideas for our next gathering</h2><p>A few possibilities to look forward to. Dates and locations are still to be decided.</p></div><div className="events-grid">{proposed.map(e => <EventCard key={e.id} event={e}/>)}</div></section>}
      <section className="past-events" aria-labelledby="past-heading"><h2 id="past-heading">Past gatherings</h2>{past.length ? <div className="events-grid">{past.map(e => <EventCard key={e.id} event={e}/>)}</div> : <p>Good times become shared memories. Stories and photographs from past gatherings will appear here when they’re ready to share.</p>}</section>
    </>}
  </main>;
}
