// A synchronous single-flight guard also catches rapid submits before React renders.
export function createInterestSender(fetcher = fetch) {
  let pending = null;
  return values => {
    if (pending) return pending;
    pending = (async () => {
      let response;
      try {
        response = await fetcher('/api/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values), signal: AbortSignal.timeout(20000) });
      } catch { throw new Error('We couldn’t connect. Your entries are still here; please check your connection and try again.'); }
      let body;
      try { body = await response.json(); } catch { throw new Error('The server could not process your request. Please try again.'); }
      if (!response.ok || !body.ok) {
        const error = new Error(body.error || 'Unable to send your interest. Please try again.');
        error.fields = body.errors; throw error;
      }
      return body;
    })().finally(() => { pending = null; });
    return pending;
  };
}
