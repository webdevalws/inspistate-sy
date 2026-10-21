import { useState } from 'react';

interface Props {
  subject: string;
  contactName?: string;
  compact?: boolean;
  listingId?: number;
  projectId?: number;
  kind?: 'enquiry' | 'service';
}

export default function EnquiryForm({ subject, contactName, compact = false, listingId, projectId, kind = 'enquiry' }: Props) {
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState('');

  async function submit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    if (!/^[6-9]\d{9}$/.test(data.phone.replace(/\D/g, '').slice(-10))) {
      setError('Enter a valid 10-digit Indian mobile number.');
      return;
    }
    setError('');
    setState('sending');
    try {
      const res = await fetch('/api/enquiry', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...data, subject, listingId, projectId, kind, page: window.location.pathname }),
      });
      if (!res.ok) throw new Error();
      setState('done');
    } catch {
      setState('idle');
      setError('Could not send right now. Please try again.');
    }
  }

  if (state === 'done') {
    return (
      <div className="rounded-xl bg-brand-50 p-4 text-sm text-brand-800">
        <p className="font-semibold">Thanks! Your enquiry has been sent.</p>
        <p className="mt-1">{contactName ?? 'Our advisor'} will call you back shortly.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-2.5">
      {!compact && <p className="text-sm text-slate-600">Get price details, floor plans and a site visit for <b>{subject}</b>.</p>}
      <input name="name" required className="input" placeholder="Your name" autoComplete="name" />
      <div className="flex gap-2">
        <span className="input w-16 shrink-0 text-center text-slate-500">+91</span>
        <input name="phone" required className="input" placeholder="Mobile number" inputMode="tel" autoComplete="tel" />
      </div>
      <input name="email" type="email" className="input" placeholder="Email (optional)" autoComplete="email" />
      <label className="flex items-start gap-2 text-xs text-slate-500">
        <input type="checkbox" name="consent" required defaultChecked className="mt-0.5 accent-brand-600" />
        I agree to be contacted about this property by phone, SMS or WhatsApp.
      </label>
      {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
      <button className="btn-primary w-full" disabled={state === 'sending'}>
        {state === 'sending' ? 'Sending…' : 'Get a call back'}
      </button>
    </form>
  );
}
