import { useState } from 'react';

// Write-a-review form for /reviews. Reviews are moderated before they appear.
export default function PlatformReviewForm({ services, cities }: { services: [string, string][]; cities: [string, string][] }) {
  const [f, setF] = useState({ service: services[0][0], city: '', author: '', rating: 0, title: '', body: '' });
  const [state, setState] = useState<{ s: 'idle' | 'sending' | 'done'; error?: string }>({ s: 'idle' });
  if (state.s === 'done') return <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900"><b>Thank you!</b> Your review will appear after a quick check, usually within 24–48 hours.</p>;
  async function submit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setState({ s: 'sending' });
    const res = await fetch('/api/platform-reviews', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(f) }).catch(() => null);
    const b = (await res?.json().catch(() => ({}))) as { error?: string } | undefined;
    setState(res?.ok ? { s: 'done' } : { s: 'idle', error: b?.error ?? 'Could not send right now.' });
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <div role="radiogroup" aria-label="Rating" className="flex gap-1">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" role="radio" aria-checked={f.rating === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => setF({ ...f, rating: n })} className={`text-2xl ${n <= f.rating ? 'text-accent-500' : 'text-neutral-300'}`}>★</button>)}</div>
      <div className="grid gap-2 sm:grid-cols-2">
        <select className="input" value={f.service} onChange={(e) => setF({ ...f, service: e.target.value })} aria-label="Review about">{services.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <select className="input" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} aria-label="City"><option value="">City (optional)</option>{cities.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <input className="input" placeholder="Your name *" value={f.author} onChange={(e) => setF({ ...f, author: e.target.value })} aria-label="Your name" />
        <input className="input" placeholder="Title (optional)" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} aria-label="Title" />
      </div>
      <textarea className="input min-h-28" placeholder="What went well, and what could be better? (30+ characters)" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} aria-label="Review" />
      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
      <button className="btn-primary" disabled={state.s === 'sending'}>{state.s === 'sending' ? 'Sending…' : 'Submit review'}</button>
    </form>
  );
}
