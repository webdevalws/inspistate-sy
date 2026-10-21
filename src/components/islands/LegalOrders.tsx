import { useState } from 'react';
import { LEGAL_CATALOGUE, LITIGATION_SEARCH_PRICE } from '../../data/services';
import { Confirmation, Contact, PriceBox, STATES, inr, useOrder } from './ServiceOrders';
import LeadDialog from './LeadDialog';

// Litigation search order, escrow request and the legal services catalogue.
// See docs/functions/{litigation-search,escrow,legal-services}/desc.md.

// ---------- Litigation search ----------
const PAN_RE = /^[A-Z]{5}\d{4}[A-Z]$/;
export function LitigationOrder() {
  const o = useOrder('litigation-search');
  const [p, setP] = useState({ party: '', pan: '', flat: '', building: '', wing: '', state: 'Maharashtra', village: '', landmark: '', locality: '', city: '', pin: '' });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  // Live per-field validation; Place Order stays disabled until the form is valid.
  const errors: Partial<Record<keyof typeof p, string>> = {};
  if (!p.party.trim()) errors.party = 'Enter the name of the person or company to search';
  if (!PAN_RE.test(p.pan)) errors.pan = 'Enter a valid PAN, e.g. ABCDE1234F';
  if (!p.flat.trim()) errors.flat = 'Flat number is required';
  if (!p.building.trim()) errors.building = 'Building name is required';
  if (p.pin && !/^\d{6}$/.test(p.pin)) errors.pin = 'PIN code must be 6 digits';
  const contactOk = !!o.contact.name.trim() && /^[6-9]\d{9}$/.test(o.contact.phone.replace(/\D/g, '').slice(-10)) && o.contact.consent;
  const valid = Object.keys(errors).length === 0 && contactOk;
  const f = (k: keyof typeof p, label: string, required = false, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="text-sm">
      <span className="mb-1 block text-neutral-600">{label}{required && ' *'}</span>
      <input className="input" value={p[k]} {...extra} onBlur={() => setTouched({ ...touched, [k]: true })} aria-invalid={!!(touched[k] && errors[k])}
        onChange={(e) => setP({ ...p, [k]: k === 'pan' ? e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') : e.target.value })} />
      {touched[k] && errors[k] && <span className="mt-1 block text-xs text-rose-600">{errors[k]}</span>}
    </label>
  );
  if (o.state.status === 'done' && o.state.order) return <Confirmation order={o.state.order} what="litigation search report" />;
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (valid) o.place(p); }} className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        {f('party', 'Party name', true)}{f('pan', 'PAN of the party', true, { maxLength: 10, placeholder: 'ABCDE1234F' })}
      </div>
      <p className="text-xs font-semibold uppercase text-neutral-500">Property</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {f('flat', 'Flat number', true)}{f('building', 'Building name', true)}{f('wing', 'Wing')}
        <label className="text-sm"><span className="mb-1 block text-neutral-600">State *</span><select className="input" value={p.state} onChange={(e) => setP({ ...p, state: e.target.value })}>{STATES.map((s) => <option key={s}>{s}</option>)}</select></label>
        {f('city', 'City')}{f('locality', 'Locality')}{f('village', 'Village')}{f('landmark', 'Landmark')}{f('pin', 'PIN code', false, { inputMode: 'numeric', maxLength: 6 })}
      </div>
      <Contact v={o.contact} set={o.setContact} />
      <PriceBox amount={LITIGATION_SEARCH_PRICE} discount={o.coupon.discount} onCoupon={(c) => o.checkCoupon(c, LITIGATION_SEARCH_PRICE)} />
      {o.state.error && <p className="text-sm text-rose-600">{o.state.error}</p>}
      <button className="btn-primary w-full py-3" disabled={!valid || o.state.status === 'sending'}>{o.state.status === 'sending' ? 'Placing order…' : `Place Order · ${inr(LITIGATION_SEARCH_PRICE - o.coupon.discount)}`}</button>
      {!valid && <p className="text-center text-xs text-neutral-500">Fill all mandatory fields and accept the terms to continue.</p>}
    </form>
  );
}

// ---------- Escrow ----------
export function EscrowRequest() {
  const o = useOrder('escrow');
  const [d, setD] = useState({ role: 'buyer', property: '', amount: '', purpose: 'Token / booking amount', release: '', otherRole: 'seller', otherName: '', otherPhone: '' });
  if (o.state.status === 'done' && o.state.order) return (
    <div className="rounded-xl bg-emerald-50 p-5 text-sm text-emerald-900">
      <p className="text-base font-bold">Escrow request #{o.state.order.id} received</p>
      <p className="mt-1">Our escrow desk will call you and {d.otherName || 'the other party'} to complete KYC and share the draft agreement for e-signing.</p>
    </div>
  );
  const set = (k: keyof typeof d) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setD({ ...d, [k]: e.target.value });
  return (
    <form onSubmit={(e) => { e.preventDefault(); o.place({ ...d, amount: Number(d.amount) }); }} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm"><span className="mb-1 block text-neutral-600">I am the *</span><select className="input" value={d.role} onChange={set('role')}><option value="buyer">Buyer / payer</option><option value="seller">Seller / beneficiary</option><option value="agent">Agent</option></select></label>
        <label className="text-sm"><span className="mb-1 block text-neutral-600">Amount to hold (₹) *</span><input className="input" inputMode="numeric" value={d.amount} onChange={(e) => setD({ ...d, amount: e.target.value.replace(/\D/g, '') })} placeholder="e.g. 500000" />{Number(d.amount) > 0 && <span className="mt-1 block text-xs text-neutral-500">{inr(Number(d.amount))}</span>}</label>
        <label className="text-sm sm:col-span-2"><span className="mb-1 block text-neutral-600">Property *</span><input className="input" value={d.property} onChange={set('property')} placeholder="Project / building, flat no., city" /></label>
        <label className="text-sm"><span className="mb-1 block text-neutral-600">Purpose</span><select className="input" value={d.purpose} onChange={set('purpose')}>{['Token / booking amount', 'Sale consideration', 'Security deposit (rental)', 'Other'].map((x) => <option key={x}>{x}</option>)}</select></label>
        <label className="text-sm"><span className="mb-1 block text-neutral-600">Release when…</span><input className="input" value={d.release} onChange={set('release')} placeholder="e.g. sale deed is registered" /></label>
      </div>
      <p className="text-xs font-semibold uppercase text-neutral-500">Other party</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <select className="input" value={d.otherRole} onChange={set('otherRole')} aria-label="Other party role"><option value="seller">Seller</option><option value="buyer">Buyer</option><option value="agent">Agent</option></select>
        <input className="input" placeholder="Their name *" value={d.otherName} onChange={set('otherName')} aria-label="Other party name" />
        <input className="input" placeholder="Their mobile *" inputMode="tel" value={d.otherPhone} onChange={set('otherPhone')} aria-label="Other party mobile" />
      </div>
      <p className="text-xs font-semibold uppercase text-neutral-500">Your details</p>
      <Contact v={o.contact} set={o.setContact} />
      {o.state.error && <p className="text-sm text-rose-600">{o.state.error}</p>}
      <button className="btn-primary w-full py-3" disabled={o.state.status === 'sending'}>{o.state.status === 'sending' ? 'Sending…' : 'Create escrow request'}</button>
    </form>
  );
}

// ---------- Legal services catalogue ----------
export function LegalCatalogue() {
  const tabs = Object.keys(LEGAL_CATALOGUE);
  const [tab, setTab] = useState(tabs[0]);
  return (
    <div>
      <div role="tablist" className="mb-5 flex flex-wrap gap-2">
        {tabs.map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === t ? 'bg-brand-900 text-white' : 'bg-white text-brand-900 ring-1 ring-neutral-200'}`}>{t}</button>)}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="tabpanel">
        {LEGAL_CATALOGUE[tab].map((s) => (
          <article key={s.name} className="panel flex flex-col">
            <div className="flex items-start justify-between gap-2"><h3 className="font-bold text-brand-900">{s.name}</h3>{s.badge && <span className="pill shrink-0 bg-accent-100 text-accent-800">{s.badge}</span>}</div>
            <ul className="mt-3 flex-1 space-y-1.5 text-sm text-neutral-600">{s.points.map((p) => <li key={p} className="flex gap-2"><span className="text-emerald-600">✓</span>{p}</li>)}</ul>
            <div className="mt-4 flex items-end justify-between gap-2">
              <p><span className="text-xl font-bold text-brand-900">{s.price ? inr(s.price) : 'FREE'}</span> <span className="text-sm text-neutral-400 line-through">{inr(s.mrp)}</span></p>
              {s.href ? <a href={s.href} className="btn-primary py-2">Order now</a> : <LeadDialog kind="enquiry" label="Book now" subject={`Legal service: ${s.name}`} className="btn-primary py-2" />}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
