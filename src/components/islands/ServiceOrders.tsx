import { useState } from 'react';
import { AGREEMENT_PLANS, TITLE_SEARCH_PLANS, VALUATION_PLANS } from '../../data/services';

// Order forms for paid document services. Orders are saved via POST /api/orders.
export type Kind = 'title-search' | 'rent-agreement' | 'rent-receipt' | 'valuation-report' | 'litigation-search' | 'escrow';
export const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

export async function submitOrder(body: { kind: Kind; name: string; phone: string; email?: string; consent: boolean; coupon?: string; details: unknown }) {
  const res = await fetch('/api/orders', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as { id?: number; amount?: number; status?: string; error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Could not place the order');
  return data as { id: number; amount: number; status: string };
}

export function Contact({ v, set }: { v: { name: string; phone: string; email: string; consent: boolean }; set: (v: { name: string; phone: string; email: string; consent: boolean }) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <input className="input" placeholder="Your name *" value={v.name} onChange={(e) => set({ ...v, name: e.target.value })} autoComplete="name" />
      <input className="input" placeholder="Mobile number *" inputMode="tel" value={v.phone} onChange={(e) => set({ ...v, phone: e.target.value })} autoComplete="tel" />
      <input className="input" type="email" placeholder="Email for the report" value={v.email} onChange={(e) => set({ ...v, email: e.target.value })} autoComplete="email" />
      <label className="flex items-start gap-2 text-xs text-neutral-500 sm:col-span-3"><input type="checkbox" checked={v.consent} onChange={(e) => set({ ...v, consent: e.target.checked })} className="mt-0.5 accent-brand-900" />I agree to the <a href="/terms" className="underline">Terms</a> and <a href="/privacy" className="underline">Privacy policy</a>, and to be contacted about this order.</label>
    </div>
  );
}

export function PriceBox({ amount, onCoupon, discount }: { amount: number; onCoupon: (code: string) => Promise<string | null>; discount: number }) {
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  return (
    <div className="rounded-xl bg-brand-50 p-4 text-sm">
      <div className="flex justify-between"><span>Price</span><span>{inr(amount)}</span></div>
      {discount > 0 && <div className="flex justify-between text-emerald-700"><span>Coupon discount</span><span>− {inr(discount)}</span></div>}
      <div className="mt-2 flex justify-between border-t border-brand-100 pt-2 text-base font-bold text-brand-900"><span>Final amount</span><span>{inr(amount - discount)}</span></div>
      <div className="mt-3 flex gap-2">
        <input className="input py-2" placeholder="Coupon code" value={code} onChange={(e) => setCode(e.target.value)} />
        <button type="button" className="btn-ghost py-2" onClick={async () => setMsg((await onCoupon(code)) ?? 'Applied')}>Apply</button>
      </div>
      {msg && <p className="mt-1 text-xs text-neutral-600">{msg}</p>}
    </div>
  );
}

export function useOrder(kind: Kind) {
  const [contact, setContact] = useState({ name: '', phone: '', email: '', consent: false });
  const [coupon, setCoupon] = useState({ code: '', discount: 0 });
  const [state, setState] = useState<{ status: 'idle' | 'sending' | 'done'; error?: string; order?: { id: number; amount: number; status: string } }>({ status: 'idle' });
  async function checkCoupon(code: string, amount: number) {
    const res = await fetch(`/api/coupon?code=${encodeURIComponent(code)}&amount=${amount}`);
    const b = (await res.json()) as { discount?: number; error?: string };
    if (!res.ok) { setCoupon({ code: '', discount: 0 }); return b.error ?? 'Invalid coupon'; }
    setCoupon({ code, discount: b.discount ?? 0 });
    return null;
  }
  async function place(details: unknown) {
    setState({ status: 'sending' });
    try {
      const order = await submitOrder({ kind, ...contact, coupon: coupon.code, details });
      setState({ status: 'done', order });
      return order;
    } catch (e) {
      setState({ status: 'idle', error: (e as Error).message });
    }
  }
  return { contact, setContact, coupon, checkCoupon, state, place };
}

export function Confirmation({ order, what }: { order: { id: number; amount: number; status: string }; what: string }) {
  return (
    <div className="rounded-xl bg-emerald-50 p-5 text-sm text-emerald-900">
      <p className="text-base font-bold">Order #{order.id} placed — {what}</p>
      {order.status === 'awaiting_payment'
        ? <p className="mt-1">Amount payable: <b>{inr(order.amount)}</b>. Our team will send you a secure payment link on your mobile and email shortly, and work starts as soon as it is paid.</p>
        : <p className="mt-1">We have received your request and will be in touch shortly.</p>}
    </div>
  );
}

// ---------- Title search ----------
export const STATES = ['Maharashtra', 'Karnataka', 'Delhi', 'Haryana', 'Uttar Pradesh', 'Telangana', 'Tamil Nadu', 'West Bengal', 'Gujarat', 'Rajasthan'];
export function TitleSearchOrder() {
  const o = useOrder('title-search');
  const [plan, setPlan] = useState<keyof typeof TITLE_SEARCH_PLANS>('13y');
  const [p, setP] = useState({ building: '', flat: '', wing: '', state: 'Maharashtra', city: '', locality: '', village: '', cts: '', landmark: '', pin: '', loanApplication: '', pan: '' });
  const price = TITLE_SEARCH_PLANS[plan].price;
  const f = (k: keyof typeof p, label: string, required = false) => (
    <label className="text-sm"><span className="mb-1 block text-neutral-600">{label}{required && ' *'}</span><input className="input" value={p[k]} onChange={(e) => setP({ ...p, [k]: e.target.value })} /></label>
  );
  if (o.state.status === 'done' && o.state.order) return <Confirmation order={o.state.order} what="title search report" />;
  return (
    <form onSubmit={(e) => { e.preventDefault(); o.place({ plan, ...p }); }} className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        {(Object.keys(TITLE_SEARCH_PLANS) as (keyof typeof TITLE_SEARCH_PLANS)[]).map((k) => (
          <button key={k} type="button" onClick={() => setPlan(k)} aria-pressed={plan === k} className={`rounded-xl border p-4 text-left ${plan === k ? 'border-brand-900 ring-2 ring-brand-900/10' : 'border-neutral-200'}`}>
            <p className="font-semibold text-brand-900">{TITLE_SEARCH_PLANS[k].label}</p><p className="text-sm text-neutral-500">{inr(TITLE_SEARCH_PLANS[k].price)}</p>
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {f('building', 'Building name', true)}{f('flat', 'Flat number', true)}{f('wing', 'Wing number')}
        <label className="text-sm"><span className="mb-1 block text-neutral-600">State *</span><select className="input" value={p.state} onChange={(e) => setP({ ...p, state: e.target.value })}>{STATES.map((s) => <option key={s}>{s}</option>)}</select></label>
        {f('city', 'City', true)}{f('locality', 'Locality')}{f('village', 'Village')}{f('cts', 'CTS / survey number')}{f('landmark', 'Landmark')}{f('pin', 'PIN code')}{f('loanApplication', 'Loan application no.')}{f('pan', 'Owner PAN')}
      </div>
      <Contact v={o.contact} set={o.setContact} />
      <PriceBox amount={price} discount={o.coupon.discount} onCoupon={(c) => o.checkCoupon(c, price)} />
      {o.state.error && <p className="text-sm text-rose-600">{o.state.error}</p>}
      <button className="btn-primary w-full py-3" disabled={o.state.status === 'sending'}>{o.state.status === 'sending' ? 'Placing order…' : 'Place Order'}</button>
    </form>
  );
}

// ---------- E-stamped rent agreement ----------
export function AgreementOrder({ agreement, state, stampDuty }: { agreement: unknown; state: string; stampDuty: number }) {
  const o = useOrder('rent-agreement');
  const [plan, setPlan] = useState<keyof typeof AGREEMENT_PLANS>('estamp');
  const price = AGREEMENT_PLANS[plan].price;
  if (o.state.status === 'done' && o.state.order) return <Confirmation order={o.state.order} what="e-stamped rent agreement" />;
  return (
    <form onSubmit={(e) => { e.preventDefault(); o.place({ plan, state, stampDuty, agreement }); }} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {(Object.keys(AGREEMENT_PLANS) as (keyof typeof AGREEMENT_PLANS)[]).map((k) => (
          <button key={k} type="button" onClick={() => setPlan(k)} aria-pressed={plan === k} className={`rounded-xl border p-4 text-left ${plan === k ? 'border-brand-900 ring-2 ring-brand-900/10' : 'border-neutral-200'}`}>
            <p className="font-semibold text-brand-900">{AGREEMENT_PLANS[k].label}</p><p className="text-sm text-neutral-500">{inr(AGREEMENT_PLANS[k].price)} + stamp duty {inr(stampDuty)}</p>
          </button>
        ))}
      </div>
      <Contact v={o.contact} set={o.setContact} />
      <PriceBox amount={price} discount={o.coupon.discount} onCoupon={(c) => o.checkCoupon(c, price)} />
      {o.state.error && <p className="text-sm text-rose-600">{o.state.error}</p>}
      <button className="btn-primary w-full py-3" disabled={o.state.status === 'sending'}>{o.state.status === 'sending' ? 'Placing order…' : 'Order e-stamped agreement'}</button>
    </form>
  );
}

// ---------- Detailed valuation report ----------
export function ValuationReportOrder({ details }: { details: { city: string; locality: string; area: number; estimate: string } }) {
  const o = useOrder('valuation-report');
  const [plan, setPlan] = useState<keyof typeof VALUATION_PLANS>('desktop');
  const price = VALUATION_PLANS[plan].price;
  if (o.state.status === 'done' && o.state.order) return <Confirmation order={o.state.order} what="valuation report" />;
  return (
    <form onSubmit={(e) => { e.preventDefault(); o.place({ plan, ...details }); }} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {(Object.keys(VALUATION_PLANS) as (keyof typeof VALUATION_PLANS)[]).map((k) => (
          <button key={k} type="button" onClick={() => setPlan(k)} aria-pressed={plan === k} className={`rounded-xl border p-4 text-left ${plan === k ? 'border-brand-900 ring-2 ring-brand-900/10' : 'border-neutral-200'}`}>
            <p className="font-semibold text-brand-900">{VALUATION_PLANS[k].label}</p><p className="text-sm text-neutral-500">{inr(VALUATION_PLANS[k].price)}</p>
          </button>
        ))}
      </div>
      <Contact v={o.contact} set={o.setContact} />
      <PriceBox amount={price} discount={o.coupon.discount} onCoupon={(c) => o.checkCoupon(c, price)} />
      {o.state.error && <p className="text-sm text-rose-600">{o.state.error}</p>}
      <button className="btn-primary w-full py-3" disabled={o.state.status === 'sending'}>{o.state.status === 'sending' ? 'Placing order…' : 'Request detailed report'}</button>
    </form>
  );
}
