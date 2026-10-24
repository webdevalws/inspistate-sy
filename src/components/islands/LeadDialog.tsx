import { useEffect, useRef, useState } from 'react';

type Kind = 'view-number' | 'callback' | 'brochure' | 'enquiry' | 'booking';
type Contact = { name: string; phone: string | null; postedBy: string; helpline: string | null } | null;

interface Props {
  kind: Kind;
  label: string;
  subject: string;
  listingId?: number;
  projectId?: number;
  /** Opened in a new tab after a successful brochure request. */
  successHref?: string;
  className?: string;
  /** Request to book: unit choices for a project (a listing asks for a budget instead). */
  units?: string[];
}

const TITLES: Record<Kind, string> = {
  'view-number': 'View contact number',
  callback: 'Request a call back',
  brochure: 'Download brochure',
  enquiry: 'Enquire now',
  booking: 'Request to book',
};

/** Earliest and latest visit dates offered (today … 90 days), as YYYY-MM-DD. */
const day = (plus: number) => new Date(Date.now() + plus * 86400000).toISOString().slice(0, 10);

export default function LeadDialog({ kind, label, subject, listingId, projectId, successHref, className = 'btn-ghost', units }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<'form' | 'sending' | 'done'>('form');
  const [error, setError] = useState('');
  const [contact, setContact] = useState<Contact>(null);

  useEffect(() => {
    if (open) ref.current?.showModal();
    else ref.current?.close();
  }, [open]);

  async function submit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    setState('sending');
    setError('');
    try {
      const res = await fetch('/api/enquiry', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...f, subject, listingId, projectId, kind, page: window.location.pathname }),
      });
      const body = (await res.json()) as { error?: string; contact?: Contact };
      if (!res.ok) throw new Error(body.error);
      setContact(body.contact ?? null);
      setState('done');
      if (kind === 'brochure' && successHref) window.open(successHref, '_blank', 'noopener');
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Could not send. Please try again.');
      setState('form');
    }
  }

  return (
    <>
      <button type="button" className={className} onClick={() => { setOpen(true); setState('form'); }}>{label}</button>
      <dialog ref={ref} onClose={() => setOpen(false)} onClick={(e) => e.target === ref.current && setOpen(false)}
        className="m-auto w-[min(420px,calc(100vw-2rem))] rounded-2xl p-0 shadow-2xl backdrop:bg-slate-900/50" aria-label={TITLES[kind]}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="font-bold">{TITLES[kind]}</h2>
          <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Close">✕</button>
        </div>
        <div className="p-5">
          {state === 'done' ? (
            <div className="space-y-3 text-sm">
              {kind === 'view-number' && contact?.phone && (
                <div className="rounded-xl bg-brand-50 p-4">
                  <p className="text-slate-600">{contact.name} ({contact.postedBy})</p>
                  <a href={`tel:+91${contact.phone}`} className="text-2xl font-extrabold text-brand-700">+91 {contact.phone.replace(/(\d{5})(\d{5})/, '$1 $2')}</a>
                </div>
              )}
              {kind === 'view-number' && !contact?.phone && (
                <p className="rounded-xl bg-brand-50 p-4 text-brand-800">We’ve shared your request with <b>{contact?.name ?? 'the seller'}</b>. Our advisor will connect you within 30 minutes{contact?.helpline ? <> — or call <a className="font-bold" href={`tel:${contact.helpline}`}>{contact.helpline}</a></> : ''}.</p>
              )}
              {kind === 'brochure' && <p className="rounded-xl bg-brand-50 p-4 text-brand-800">Your brochure has opened in a new tab. {successHref && <a href={successHref} target="_blank" rel="noopener" className="font-semibold underline">Open it again</a>}</p>}
              {(kind === 'callback' || kind === 'enquiry') && <p className="rounded-xl bg-brand-50 p-4 text-brand-800">Thanks! An advisor will call you shortly about <b>{subject}</b>.</p>}
              {kind === 'booking' && <p className="rounded-xl bg-brand-50 p-4 text-brand-800">Booking request received for <b>{subject}</b>. Our team will call to confirm the details and your visit. No payment has been taken.</p>}
              <button onClick={() => setOpen(false)} className="btn-ghost w-full">Close</button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-2.5">
              <p className="text-sm text-slate-600">{subject}</p>
              <input name="name" required maxLength={100} className="input" placeholder="Your name" autoComplete="name" />
              <div className="flex gap-2">
                <span className="input w-16 shrink-0 text-center text-slate-500">+91</span>
                <input name="phone" required pattern="[6-9][0-9]{9}" title="10-digit Indian mobile number" className="input" placeholder="Mobile number" inputMode="tel" autoComplete="tel" />
              </div>
              <input name="email" type="email" className="input" placeholder="Email (optional)" autoComplete="email" />
              {kind === 'booking' && (
                <>
                  {units?.length ? (
                    <label className="block text-xs font-medium text-slate-600">Preferred unit<select name="unit" className="input mt-1" defaultValue=""><option value="">Any unit</option>{units.map((u) => <option key={u}>{u}</option>)}</select></label>
                  ) : (
                    <label className="block text-xs font-medium text-slate-600">Your budget<input name="unit" maxLength={60} className="input mt-1" placeholder="e.g. ₹1.2 Cr, or as listed" /></label>
                  )}
                  <label className="block text-xs font-medium text-slate-600">Preferred visit date<input name="visitDate" type="date" required min={day(0)} max={day(90)} className="input mt-1" /></label>
                  <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">This is a request, not a booking. Our team will call to confirm; no payment is taken online.</p>
                </>
              )}
              <label className="flex items-start gap-2 text-xs text-slate-500">
                <input type="checkbox" required defaultChecked className="mt-0.5 accent-brand-600" />I agree to be contacted by phone, SMS or WhatsApp.
              </label>
              {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
              <button className="btn-primary w-full" disabled={state === 'sending'}>{state === 'sending' ? 'Please wait…' : label}</button>
            </form>
          )}
        </div>
      </dialog>
    </>
  );
}
