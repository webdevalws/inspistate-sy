import { useState } from 'react';

// Refer-a-friend form (/refer). Saved through /api/enquiry as a 'referral' lead (existing rate limits); the
// server checks the friend's details and writes them into the lead subject. See docs/functions/refer/desc.md.
const NEEDS = [['buy', 'Buy a home'], ['sell', 'Sell a property'], ['rent', 'Rent a home'], ['let-out', 'Rent out a property']] as const;
const validPhone = (p: string) => /^[6-9]\d{9}$/.test(p.replace(/\D/g, '').slice(-10));

export default function ReferralForm({ cities, city }: { cities: { slug: string; name: string }[]; city: string }) {
  const [f, setF] = useState({ name: '', phone: '', email: '', friendName: '', friendPhone: '', need: 'buy', city, consent: false, friendOk: false });
  const [state, setState] = useState<{ s: 'idle' | 'sending' | 'done'; error?: string }>({ s: 'idle' });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  if (state.s === 'done')
    return (
      <div className="rounded-xl bg-emerald-50 p-5 text-sm text-emerald-900">
        <p className="font-bold">Thanks — referral received!</p>
        <p className="mt-1">Our team will call {f.friendName} to help them {NEEDS.find(([v]) => v === f.need)?.[1].toLowerCase()}. Any reward is subject to the referral terms.</p>
        <button type="button" className="mt-3 font-semibold text-brand-700 underline" onClick={() => { setF({ ...f, friendName: '', friendPhone: '', friendOk: false }); setState({ s: 'idle' }); }}>Refer someone else</button>
      </div>
    );

  async function submit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!f.name.trim()) return setState({ s: 'idle', error: 'Enter your name.' });
    if (!validPhone(f.phone)) return setState({ s: 'idle', error: 'Enter your 10-digit mobile number.' });
    if (!f.friendName.trim()) return setState({ s: 'idle', error: 'Enter your friend’s name.' });
    if (!validPhone(f.friendPhone)) return setState({ s: 'idle', error: 'Enter your friend’s 10-digit mobile number.' });
    if (!f.friendOk) return setState({ s: 'idle', error: 'Please confirm your friend is happy to be contacted.' });
    if (!f.consent) return setState({ s: 'idle', error: 'Please allow us to contact you about this referral.' });
    setState({ s: 'sending' });
    const res = await fetch('/api/enquiry', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind: 'referral', name: f.name, phone: f.phone, email: f.email, friendName: f.friendName, friendPhone: f.friendPhone, need: f.need, city: f.city, page: location.pathname }),
    }).catch(() => null);
    if (res?.ok) return setState({ s: 'done' });
    const body = (await res?.json().catch(() => null)) as { error?: string } | null;
    setState({ s: 'idle', error: body?.error ?? 'Could not send right now. Please try again.' });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-semibold text-slate-700">Your details</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          <input className="input" placeholder="Your name *" aria-label="Your name" autoComplete="name" value={f.name} onChange={set('name')} />
          <input className="input" placeholder="Your mobile *" aria-label="Your mobile" inputMode="tel" autoComplete="tel" value={f.phone} onChange={set('phone')} />
          <input className="input" type="email" placeholder="Your email" aria-label="Your email" autoComplete="email" value={f.email} onChange={set('email')} />
        </div>
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-semibold text-slate-700">Your friend</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <input className="input" placeholder="Friend’s name *" aria-label="Friend’s name" autoComplete="off" value={f.friendName} onChange={set('friendName')} />
          <input className="input" placeholder="Friend’s mobile *" aria-label="Friend’s mobile" inputMode="tel" autoComplete="off" value={f.friendPhone} onChange={set('friendPhone')} />
          <label className="text-sm font-medium text-slate-600">They want to
            <select className="input mt-1" value={f.need} onChange={set('need')}>{NEEDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          </label>
          <label className="text-sm font-medium text-slate-600">In
            <select className="input mt-1" value={f.city} onChange={set('city')}>{cities.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select>
          </label>
        </div>
      </fieldset>
      <label className="flex items-start gap-2 text-xs text-slate-500"><input type="checkbox" checked={f.friendOk} onChange={(e) => setF({ ...f, friendOk: e.target.checked })} className="mt-0.5 accent-brand-900" />My friend knows I’m referring them and is happy to get a call from InspiState.</label>
      <label className="flex items-start gap-2 text-xs text-slate-500"><input type="checkbox" checked={f.consent} onChange={(e) => setF({ ...f, consent: e.target.checked })} className="mt-0.5 accent-brand-900" />I agree to be contacted by InspiState about this referral.</label>
      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
      <button className="btn-primary w-full py-3" disabled={state.s === 'sending'}>{state.s === 'sending' ? 'Sending…' : 'Submit referral'}</button>
      <p className="text-xs text-slate-500">Rewards are subject to the referral terms below. No reward is paid out through this website.</p>
    </form>
  );
}
