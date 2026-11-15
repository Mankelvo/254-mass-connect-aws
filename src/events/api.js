async function request(url, options = {}) {
  const response = await fetch(url, { ...options, signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000) });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Unable to complete your request. Please try again.');
  return body;
}
export const listEvents = signal => request('/api/events', { signal });
export async function submitRsvp(id, values) {
  const result = await request(`/api/events/${encodeURIComponent(id)}/rsvps`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
  if (result.ok !== true) throw new Error('Your RSVP could not be confirmed. Please try again.');
}
