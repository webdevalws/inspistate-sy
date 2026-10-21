import { useState } from 'react';

function StarInput({ label, value, onChange, required = false }: { label: string; value: number; onChange: (v: number) => void; required?: boolean }) {
  return (
    <fieldset className="flex items-center justify-between gap-3">
      <legend className="sr-only">{label}</legend>
      <span className="text-sm text-slate-600" aria-hidden="true">{label}{required && ' *'}</span>
      <span className="flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} type="button" onClick={() => onChange(i)} aria-label={`${label}: ${i} star${i > 1 ? 's' : ''}`} aria-pressed={value === i} className="p-0.5">
            <svg viewBox="0 0 20 20" className={`h-6 w-6 ${i <= value ? 'fill-accent-500' : 'fill-slate-200 hover:fill-accent-400'}`} aria-hidden="true"><path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9z" /></svg>
          </button>
        ))}
      </span>
    </fieldset>
  );
}

export default function ReviewForm({ projectId, projectName, defaultName }: { projectId: number; projectName: string; defaultName?: string }) {
  const [open, setOpen] = useState(false);
  const [r, setR] = useState({ rating: 0, connectivity: 0, amenities: 0, construction: 0 });
  const [state, setState] = useState<'form' | 'sending' | 'done'>('form');
  const [msg, setMsg] = useState('');

  async function submit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!r.rating) return setMsg('Choose an overall rating.');
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    setState('sending');
    const res = await fetch('/api/reviews', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...f, ...r, projectId }) }).catch(() => null);
    const body = (await res?.json().catch(() => null)) as { error?: string; message?: string } | null;
    if (!res?.ok) { setMsg(body?.error ?? 'Could not submit. Try again.'); setState('form'); return; }
    setMsg(body?.message ?? 'Thanks!');
    setState('done');
  }

  if (!open) return <button type="button" onClick={() => setOpen(true)} className="btn-primary">✍ Write a review</button>;
  if (state === 'done') return <p className="rounded-xl bg-brand-50 p-4 text-sm font-medium text-brand-800">{msg}</p>;

  return (
    <form onSubmit={submit} className="card space-y-4 p-5">
      <h3 className="font-bold">Review {projectName}</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        <StarInput label="Overall" value={r.rating} onChange={(v) => setR({ ...r, rating: v })} required />
        <StarInput label="Connectivity" value={r.connectivity} onChange={(v) => setR({ ...r, connectivity: v })} />
        <StarInput label="Amenities" value={r.amenities} onChange={(v) => setR({ ...r, amenities: v })} />
        <StarInput label="Construction" value={r.construction} onChange={(v) => setR({ ...r, construction: v })} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="author" required maxLength={60} defaultValue={defaultName} className="input" placeholder="Your name" />
        <select name="residentType" className="input" defaultValue="">
          <option value="" disabled>I am a…</option>
          <option>Owner</option><option>Tenant</option><option>Visitor</option>
        </select>
      </div>
      <textarea name="body" required minLength={30} maxLength={2000} rows={4} className="input" placeholder="What do you like or dislike? Connectivity, maintenance, construction quality… (min 30 characters)" />
      {msg && <p className="text-sm text-rose-600">{msg}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
        <button className="btn-primary" disabled={state === 'sending'}>{state === 'sending' ? 'Submitting…' : 'Submit review'}</button>
      </div>
    </form>
  );
}
