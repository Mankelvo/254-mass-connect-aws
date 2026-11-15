import React from 'react';
import { ArrowRight, Camera, CheckCircle2, Heart, Mountain, ShieldCheck, Users, UtensilsCrossed } from 'lucide-react';
import { activities, consentText, successMessage, validateJoin } from '../../shared/join';
import { createInterestSender } from './api';

const highlights = [
  [Users, 'Make New Friends', 'Meet people, build meaningful friendships, and feel connected.'],
  [UtensilsCrossed, 'Share Kenyan Culture', 'Enjoy familiar food, traditions, conversations, and cultural experiences.'],
  [Mountain, 'Enjoy Community Activities', 'Share an interest in game nights, cookouts, road trips, and other gatherings.'],
  [Camera, 'Create Lasting Memories', 'Spend time together, capture memorable moments, and share photographs.'],
];
function initialValues() {
  const event = new URLSearchParams(window.location.search).get('event');
  return { fullName: '', email: '', phone: '', city: '', activities: [], message: event ? `I'm interested in ${event.slice(0,150)}. Please share updates when details are confirmed.` : '', consent: false, website: '', submissionId: crypto.randomUUID() };
}
export default function Join() {
  const [values, setValues] = React.useState(initialValues);
  const [errors, setErrors] = React.useState({});
  const [status, setStatus] = React.useState({ pending: false, done: false, error: '' });
  const sender = React.useRef(null);
  if (!sender.current) sender.current = createInterestSender();
  const busy = React.useRef(false);
  const success = React.useRef(null);
  React.useEffect(() => { if (status.done) success.current?.focus(); }, [status.done]);
  function change(e) {
    const { name, value, checked, type } = e.target;
    setValues(v => ({ ...v, [name]: type === 'checkbox' ? checked : value }));
  }
  function focusError(fields) {
    const first = ['fullName', 'email', 'phone', 'contact', 'city', 'activities', 'message', 'consent'].find(key => fields[key]);
    requestAnimationFrame(() => document.getElementById(`join-${first === 'contact' ? 'email' : first}`)?.focus());
  }
  async function submit(e) {
    e.preventDefault();
    if (busy.current) return;
    const { errors: invalid } = validateJoin(values);
    setErrors(invalid);
    if (Object.keys(invalid).length) { setStatus({ pending: false, done: false, error: invalid.form || 'Please check the highlighted fields.' }); focusError(invalid); return; }
    busy.current = true; setStatus({ pending: true, done: false, error: '' });
    try {
      await sender.current(values);
      setStatus({ pending: false, done: true, error: '' });
      setValues(initialValues());
    } catch (error) {
      setErrors(error.fields || {}); setStatus({ pending: false, done: false, error: error.message }); focusError(error.fields || {});
    } finally { busy.current = false; }
  }
  const field = (name, label, type = 'text', maxLength = 100, autoComplete) => <div className="interest-field">
    <label htmlFor={`join-${name}`}>{label}{name === 'fullName' && <span> (required)</span>}</label>
    <input id={`join-${name}`} name={name} type={type} autoComplete={autoComplete} maxLength={maxLength} required={name === 'fullName'} value={values[name]} onChange={change}
      aria-invalid={Boolean(errors[name] || (['email', 'phone'].includes(name) && errors.contact))}
      aria-describedby={[errors[name] && `join-${name}-error`, ['email', 'phone'].includes(name) && 'join-contact-help', ['email', 'phone'].includes(name) && errors.contact && 'join-contact-error'].filter(Boolean).join(' ') || undefined}/>
    {errors[name] && <p className="interest-field-error" id={`join-${name}-error`}>{errors[name]}</p>}
  </div>;
  return <main id="main-content" tabIndex={-1} className="page-container community-join">
    <section className="interest-intro" aria-labelledby="join-title"><span className="eyebrow">COMMUNITY. CULTURE. CONNECTION.</span><h1 id="join-title">Join Our Community</h1><p>Whether you're new to Massachusetts or have called it home for years, there's always room for another friend. Connect with Kenyans and friends across Massachusetts, discover upcoming gatherings, and become part of the memories we create together.</p></section>
    <div className="interest-layout"><aside className="interest-welcome">
      <div className="interest-photo"><Users size={56} aria-hidden="true"/><span>Good times. Great people. Lasting memories.</span></div>
      <section aria-labelledby="why-join"><h2 id="why-join">Why Join 254 Mass Connect?</h2><div className="interest-highlights">{highlights.map(([Icon, title, text]) => <article key={title}><Icon size={23} aria-hidden="true"/><div><h3>{title}</h3><p>{text}</p></div></article>)}</div></section>
      <section className="interest-explore"><Heart size={24} aria-hidden="true"/><h2>Get to Know Our Community</h2><p>Take a look around and see what brings us together.</p><a href="/events">Upcoming Events <ArrowRight size={17}/></a><a href="/gallery">Photo Gallery <ArrowRight size={17}/></a></section>
    </aside>
    <section className="interest-form-card" aria-labelledby="interest-title"><div className="interest-form-heading"><Users size={27} aria-hidden="true"/><h2 id="interest-title">Interested in Joining Us?</h2></div><p>Tell us a little about yourself, and we'll be in touch about connecting with the community.</p>
      {status.done ? <div ref={success} tabIndex={-1} className="interest-success" role="status"><CheckCircle2 size={42} aria-hidden="true"/><h3>Thank you for reaching out!</h3><p>{successMessage}</p><p>You’ve expressed interest; this does not automatically add you to a private group. Any invitation will be coordinated separately.</p><a href="/events">Explore upcoming events <ArrowRight size={17}/></a></div> : <form noValidate onSubmit={submit} aria-busy={status.pending}>
        <fieldset disabled={status.pending} className="interest-fields"><legend className="sr-only">Your community interest</legend>
          {field('fullName', 'Full Name', 'text', 100, 'name')}
          <p id="join-contact-help" className="interest-help">Provide at least one contact method: email or phone. Country codes such as +1 and +254 are welcome. If you fill in both, please make sure both are valid.</p>
          <div className="interest-contact">{field('email', 'Email Address', 'email', 254, 'email')}{field('phone', 'Phone Number', 'tel', 40, 'tel')}</div>
          {errors.contact && <p className="interest-field-error" id="join-contact-error">{errors.contact}</p>}
          {field('city', 'City or Town in Massachusetts (optional)', 'text', 100, 'address-level2')}
          <fieldset className="interest-activities" id="join-activities" tabIndex={-1} aria-describedby={errors.activities ? 'join-activities-error' : undefined}><legend>What Activities Interest You? <span>(optional)</span></legend><p className="interest-help">Choose any that sound like you.</p>{activities.map(([id, label]) => <label key={id}><input type="checkbox" name="activities" value={id} checked={values.activities.includes(id)} onChange={e => setValues(v => ({ ...v, activities: e.target.checked ? [...v.activities, id] : v.activities.filter(item => item !== id) }))}/><span>{label}</span></label>)}{errors.activities && <p className="interest-field-error" id="join-activities-error">{errors.activities}</p>}</fieldset>
          <div className="interest-field"><label htmlFor="join-message">Anything Else You'd Like Us to Know? <span>(optional)</span></label><textarea id="join-message" name="message" rows={4} maxLength={1000} value={values.message} onChange={change} aria-invalid={Boolean(errors.message)} aria-describedby="join-message-help"/><span className="interest-help" id="join-message-help">{errors.message || `${values.message.length}/1000 characters. Please avoid sensitive personal details.`}</span></div>
          <label className="interest-consent"><input id="join-consent" name="consent" type="checkbox" required checked={values.consent} onChange={change} aria-invalid={Boolean(errors.consent)} aria-describedby={errors.consent ? 'join-consent-error' : undefined}/><span>{consentText} <strong>(required)</strong></span></label>{errors.consent && <p className="interest-field-error" id="join-consent-error">{errors.consent}</p>}
          <div className="honeypot" aria-hidden="true"><label htmlFor="join-website">Leave this blank</label><input id="join-website" name="website" tabIndex={-1} autoComplete="off" value={values.website} onChange={change}/></div>
        </fieldset>
        {status.error && <p className="interest-error" role="alert">{status.error}</p>}
        <button className="submit-btn" type="submit" disabled={status.pending}>{status.pending ? 'Sending your interest…' : 'Send My Interest'}<ArrowRight size={18} aria-hidden="true"/></button>
        <p className="interest-privacy"><ShieldCheck size={18} aria-hidden="true"/>Your contact details are not displayed publicly.</p>
        <p className="interest-help">This form expresses interest, not automatic acceptance into a private group. Any invitation will be coordinated separately.</p>
      </form>}
    </section></div>
  </main>;
}
