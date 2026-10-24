import { useState } from 'react';
import {
  APPLIANCES, FURNITURE, INSPECTION_PRICES, MOVE_BANDS, MOVE_RATES, PAINT_CARPET, PAINT_FINISHES, PM_CITIES, PM_NO_BHK, PM_TYPES,
  RENT_ADDONS, RENT_PACKAGES, RENT_PLANS, RENTAL_TENURES, moveEstimate, paintEstimate, rentPackageEstimate, solarEstimate, type RentalItem,
} from '../../data/home-services';

// Estimators and request forms for home services. Each request is saved as a 'service' lead whose subject
// carries the estimate, so the partner team sees exactly what was asked for. See docs/functions/<service>/desc.md.
const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const BHKS = ['1 BHK', '2 BHK', '3 BHK', '4 BHK'];

/**
 * A row of toggle chips with its own visible legend. A <fieldset>/<legend> (not a <label>) groups them, so each chip
 * keeps its own accessible name ("1 BHK") and clicking the legend doesn't select an option.
 */
function Chips<T extends string>({ options, value, set, label }: { options: readonly T[]; value: T; set: (v: T) => void; label: string }) {
  return (
    <fieldset className="block text-sm">
      <legend className="mb-1 block font-medium text-neutral-600">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => <button key={o} type="button" aria-pressed={value === o} onClick={() => set(o)} className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${value === o ? 'border-brand-900 bg-brand-900 text-white' : 'border-neutral-200 bg-white'}`}>{o}</button>)}
      </div>
    </fieldset>
  );
}
/** Label for one form control (input, select). Chip groups use Chips, which has its own legend. */
function L({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm"><span className="mb-1 block font-medium text-neutral-600">{label}</span>{children}</label>;
}

/** Inline lead form; `summary` becomes the lead subject. */
export function ServiceLead({ service, summary, cta = 'Get a callback', note, onDone }: { service: string; summary: string; cta?: string; note?: string; onDone?: () => void }) {
  const [f, setF] = useState({ name: '', phone: '', email: '', consent: false });
  const [state, setState] = useState<{ s: 'idle' | 'sending' | 'done'; error?: string }>({ s: 'idle' });
  if (state.s === 'done') return <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900"><p className="font-bold">Request received!</p><p>Sit back and relax — our partner team will call you shortly to confirm the details.</p></div>;
  async function submit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!f.name.trim()) return setState({ s: 'idle', error: 'Enter your name.' });
    if (!/^[6-9]\d{9}$/.test(f.phone.replace(/\D/g, '').slice(-10))) return setState({ s: 'idle', error: 'Enter a valid 10-digit mobile number.' });
    if (!f.consent) return setState({ s: 'idle', error: 'Please allow us to contact you.' });
    setState({ s: 'sending' });
    const res = await fetch('/api/enquiry', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: f.name, phone: f.phone, email: f.email, kind: 'service', subject: `${service}: ${summary}`.slice(0, 200), page: location.pathname }) }).catch(() => null);
    if (res?.ok) { setState({ s: 'done' }); onDone?.(); } else setState({ s: 'idle', error: 'Could not send right now. Please try again.' });
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <input className="input" placeholder="Name *" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="name" aria-label="Name" />
        <input className="input" placeholder="Mobile *" inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} autoComplete="tel" aria-label="Mobile" />
        <input className="input" type="email" placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="email" aria-label="Email" />
      </div>
      <label className="flex items-start gap-2 text-xs text-neutral-500"><input type="checkbox" checked={f.consent} onChange={(e) => setF({ ...f, consent: e.target.checked })} className="mt-0.5 accent-brand-900" />I agree to be contacted by InspiState and its partners by phone, SMS, WhatsApp or email about this request.</label>
      {note && <p className="text-xs text-neutral-500">{note}</p>}
      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
      <button className="btn-primary w-full py-3" disabled={state.s === 'sending'}>{state.s === 'sending' ? 'Sending…' : cta}</button>
    </form>
  );
}

function Estimate({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return <div className="rounded-xl bg-brand-900 p-5 text-white"><p className="text-sm text-white/70">{title}</p><p className="text-3xl font-extrabold text-accent-400">{value}</p>{sub && <p className="mt-1 text-sm text-white/80">{sub}</p>}</div>;
}

// ---------- Packers & movers ----------
export function PackersEstimator() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [km, setKm] = useState(20);
  const [size, setSize] = useState('2 BHK');
  const [car, setCar] = useState(false);
  const [bike, setBike] = useState(false);
  const [date, setDate] = useState('');
  const e = moveEstimate(size, km, car, bike);
  const bandLabel = e.band === 0 ? 'within city (≤ 50 km)' : `up to ${MOVE_BANDS[e.band]} km`;
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <L label="Moving from (city / locality)"><input className="input" value={from} onChange={(x) => setFrom(x.target.value)} placeholder="e.g. Andheri, Mumbai" /></L>
        <L label="Moving to"><input className="input" value={to} onChange={(x) => setTo(x.target.value)} placeholder="e.g. Baner, Pune" /></L>
        <L label={`Distance: ${km} km`}><input type="range" min={1} max={2500} value={km} onChange={(x) => setKm(Number(x.target.value))} className="w-full accent-brand-900" aria-label="Distance in km" /></L>
        <L label="Moving date"><input type="date" className="input" value={date} onChange={(x) => setDate(x.target.value)} min={new Date().toISOString().slice(0, 10)} /></L>
      </div>
      <Chips options={BHKS} value={size} set={setSize} label="Home size" />
      <div className="flex gap-4 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={car} onChange={(x) => setCar(x.target.checked)} className="accent-brand-900" />Move my car</label><label className="flex items-center gap-2"><input type="checkbox" checked={bike} onChange={(x) => setBike(x.target.checked)} className="accent-brand-900" />Move my bike</label></div>
      <Estimate title={`Estimated cost · ${bandLabel}`} value={`${inr(e.min)} – ${inr(e.max)}`} sub={e.outOfRange ? 'Over 2,500 km — the partner will quote after a survey.' : 'Final price after a free survey of your goods.'} />
      <ServiceLead service="Packers & movers" summary={`${size}${car ? '+car' : ''}${bike ? '+bike' : ''}, ${from || '?'} → ${to || '?'} (${km} km), ${date || 'date TBD'}, est ${inr(e.min)}–${inr(e.max)}`} cta="Get free quotes" />
      <details className="rounded-xl border border-neutral-200 p-4 text-sm">
        <summary className="cursor-pointer font-semibold">Approximate relocation charges</summary>
        <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[560px]"><thead className="text-left text-xs uppercase text-neutral-500"><tr><th className="py-1">Shifting</th>{MOVE_BANDS.map((b, i) => <th key={b}>{i === 0 ? '≤ 50 km' : `≤ ${b.toLocaleString('en-IN')} km`}</th>)}</tr></thead>
          <tbody className="divide-y divide-neutral-100">{Object.entries(MOVE_RATES).map(([k, row]) => <tr key={k}><td className="py-1.5 font-medium">{k}</td>{row.map(([a, b], i) => <td key={i}>{inr(a)}–{(b / 1000).toFixed(1).replace('.0', '')}k</td>)}</tr>)}</tbody></table></div>
      </details>
    </div>
  );
}

// ---------- Painting ----------
export function PaintingEstimator() {
  const [bhk, setBhk] = useState('2 BHK');
  const [carpet, setCarpet] = useState(PAINT_CARPET['2 BHK']);
  const [finish, setFinish] = useState<keyof typeof PAINT_FINISHES>('standard');
  const [scope, setScope] = useState<'interior' | 'exterior' | 'both'>('interior');
  const [repaint, setRepaint] = useState(true);
  const [ceiling, setCeiling] = useState(true);
  const e = paintEstimate(carpet, finish, scope, repaint, ceiling);
  return (
    <div className="space-y-5">
      <Chips options={BHKS} value={bhk} set={(b) => { setBhk(b); setCarpet(PAINT_CARPET[b]); }} label="Home" />
      <div className="grid gap-3 sm:grid-cols-2">
        <L label="Carpet area (sq ft)"><input type="number" className="input" min={100} value={carpet} onChange={(x) => setCarpet(Math.max(100, Number(x.target.value)))} /></L>
        <L label="Paint finish"><select className="input" value={finish} onChange={(x) => setFinish(x.target.value as typeof finish)}>{Object.entries(PAINT_FINISHES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></L>
      </div>
      <Chips options={['interior', 'exterior', 'both'] as const} value={scope} set={setScope} label="What to paint" />
      <div className="flex flex-wrap gap-4 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={repaint} onChange={(x) => setRepaint(x.target.checked)} className="accent-brand-900" />Repaint (walls already painted)</label>{scope !== 'exterior' && <label className="flex items-center gap-2"><input type="checkbox" checked={ceiling} onChange={(x) => setCeiling(x.target.checked)} className="accent-brand-900" />Include ceilings</label>}</div>
      <Estimate title={`Estimated cost · ~${e.area.toLocaleString('en-IN')} sq ft paintable area`} value={`${inr(e.min)} – ${inr(e.max)}`} sub={`About ${e.days} working days. Includes material and labour; putty and waterproofing are extra.`} />
      <ServiceLead service="Home painting" summary={`${bhk} ${carpet} sqft, ${scope}, ${PAINT_FINISHES[finish].label}${repaint ? ', repaint' : ''}, est ${inr(e.min)}–${inr(e.max)}`} cta="Book a free site visit" />
    </div>
  );
}

// ---------- Solar ----------
export function SolarEstimator() {
  const [bill, setBill] = useState(4000);
  const [tariff, setTariff] = useState(8);
  const [roof, setRoof] = useState(400);
  const [residential, setResidential] = useState(true);
  const e = solarEstimate(bill, tariff, roof, residential);
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <L label="Average monthly bill (₹)"><input type="number" className="input" min={300} step={100} value={bill} onChange={(x) => setBill(Math.max(0, Number(x.target.value)))} /></L>
        <L label="Tariff (₹ per unit)"><input type="number" className="input" min={2} step={0.5} value={tariff} onChange={(x) => setTariff(Math.max(1, Number(x.target.value)))} /></L>
        <L label="Shadow-free roof (sq ft)"><input type="number" className="input" min={100} step={50} value={roof} onChange={(x) => setRoof(Math.max(0, Number(x.target.value)))} /></L>
      </div>
      <Chips options={['Home', 'Housing society / commercial'] as const} value={residential ? 'Home' : 'Housing society / commercial'} set={(v) => setResidential(v === 'Home')} label="Property" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Estimate title="Recommended system" value={`${e.kw} kW`} sub={`${e.monthlyUnits} units a month${e.limitedByRoof ? ' · limited by roof space' : ''}`} />
        <Estimate title="You pay after subsidy" value={inr(e.net)} sub={`${inr(e.cost)} system${e.subsidy ? ` − ${inr(e.subsidy)} central subsidy` : ''}`} />
      </div>
      <dl className="grid gap-3 text-sm sm:grid-cols-3">
        {[['Monthly saving', inr(e.monthlySaving)], ['Payback', e.payback ? `${e.payback.toFixed(1)} years` : '—'], ['25-year net savings', inr(e.lifetime)]].map(([k, v]) => <div key={k} className="rounded-xl border border-neutral-200 p-3"><dt className="text-neutral-500">{k}</dt><dd className="text-lg font-bold text-brand-900">{v}</dd></div>)}
      </dl>
      <ServiceLead service="Solar rooftop" summary={`bill ${inr(bill)}/mo, roof ${roof} sqft, ${residential ? 'home' : 'society/commercial'} → ${e.kw} kW, net ${inr(e.net)}`} cta="Book a free roof survey" note="Subsidy shown is the central residential scheme amount; state top-ups may add more. Costs are indicative." />
    </div>
  );
}

// ---------- Furniture & appliance rental ----------
/** Single-item cart for furniture and appliances (rooms, then appliance categories). */
export function RentalCatalogue() {
  const data = { ...FURNITURE, ...APPLIANCES };
  const tabs = Object.keys(data);
  const [tab, setTab] = useState(tabs[0]);
  const [tenure, setTenure] = useState(12);
  const [cart, setCart] = useState<Record<string, number>>({});
  const k = RENTAL_TENURES.find((t) => t.months === tenure)!.k;
  const all: RentalItem[] = Object.values(data).flat();
  const monthly = Object.entries(cart).reduce((s, [n, q]) => s + (all.find((i) => i.name === n)?.from ?? 0) * k * q, 0);
  const add = (n: string, d: number) => setCart((c) => { const q = Math.max(0, (c[n] ?? 0) + d); const { [n]: _, ...rest } = c; return q ? { ...rest, [n]: q } : rest; });
  const items = Object.entries(cart);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" className="flex flex-wrap gap-2">{tabs.map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === t ? 'bg-brand-900 text-white' : 'bg-white ring-1 ring-neutral-200'}`}>{t}</button>)}</div>
        <label className="flex items-center gap-2 text-sm"><span className="text-neutral-600">Tenure</span><select className="input w-auto py-2" value={tenure} onChange={(e) => setTenure(Number(e.target.value))}>{RENTAL_TENURES.map((t) => <option key={t.months} value={t.months}>{t.months} months</option>)}</select></label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data[tab].map((i) => (
          <div key={i.name} className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-brand-50 text-2xl" aria-hidden="true">{i.icon}</span>
            <div className="flex-1"><p className="font-semibold">{i.name}</p><p className="text-sm text-neutral-600">{inr(i.from * k)}/month</p></div>
            {cart[i.name] ? (
              <div className="flex items-center gap-2"><button type="button" className="btn-ghost px-2 py-1" onClick={() => add(i.name, -1)} aria-label={`Remove one ${i.name}`}>−</button><span className="w-4 text-center font-bold">{cart[i.name]}</span><button type="button" className="btn-ghost px-2 py-1" onClick={() => add(i.name, 1)} aria-label={`Add one more ${i.name}`}>+</button></div>
            ) : <button type="button" className="btn-ghost py-1.5" onClick={() => add(i.name, 1)}>Add</button>}
          </div>
        ))}
      </div>
      <p className="text-xs text-neutral-500">Longer tenures cost less per month: 3 months +30%, 6 months +15%, 24 months −10% versus the 12-month price.</p>
      <div className="rounded-xl border border-neutral-200 p-4">
        {items.length === 0 ? <p className="text-sm text-neutral-500">Add items to see your monthly rent, or just tell us what you need.</p> : (
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2"><p className="text-sm text-neutral-600">{items.map(([n, q]) => `${q} × ${n}`).join(', ')}</p><p className="text-2xl font-extrabold text-brand-900">{inr(monthly)}<span className="text-sm font-normal text-neutral-500">/month · {tenure} months</span></p></div>
        )}
        <ServiceLead service="Furniture & appliances on rent" summary={items.length ? `${items.map(([n, q]) => `${q}×${n}`).join(', ')}; ${tenure} mo; ${inr(monthly)}/mo` : `catalogue enquiry, ${tenure} mo`} cta="Show interest" />
      </div>
    </div>
  );
}

// ---------- Furniture & appliances on rent (package + tenure) ----------
export function RentPackageEstimator() {
  const [pkg, setPkg] = useState<string>('2 BHK');
  const [addons, setAddons] = useState<string[]>(['Fridge', 'Washing machine']);
  const [months, setMonths] = useState(12);
  const e = rentPackageEstimate(pkg === 'No furniture' ? null : pkg, addons, months);
  const toggle = (n: string) => setAddons((a) => (a.includes(n) ? a.filter((x) => x !== n) : [...a, n]));
  const what = [pkg !== 'No furniture' && `${pkg} furniture`, ...addons].filter(Boolean).join(' + ');
  return (
    <div className="space-y-5">
      <Chips options={[...RENT_PACKAGES.map((p) => p.name), 'No furniture']} value={pkg} set={setPkg} label="Furniture package" />
      <div role="group" aria-label="Appliances" className="text-sm">
        <span className="mb-1 block font-medium text-neutral-600">Appliances</span>
        <div className="flex flex-wrap gap-x-4 gap-y-2">{RENT_ADDONS.map((a) => <label key={a.name} className="flex items-center gap-2"><input type="checkbox" checked={addons.includes(a.name)} onChange={() => toggle(a.name)} className="accent-brand-900" />{a.name}</label>)}</div>
      </div>
      <Chips options={RENT_PLANS.map((t) => `${t.months} months`)} value={`${months} months`} set={(v) => setMonths(parseInt(v))} label="Plan" />
      <Estimate title="Estimated monthly rent · demo prices" value={what ? `${inr(e.monthly)}/month` : '—'} sub={what ? `${what} · ${months} months · refundable deposit about ${inr(e.deposit)}` : 'Pick a package or at least one appliance.'} />
      <ServiceLead service="Furniture & appliances on rent" summary={`${what || 'nothing selected'}; ${months} mo; est ${inr(e.monthly)}/mo (demo)`} cta="Get a callback" note="Demo prices for illustration. Our partner confirms the final rent for your city." />
    </div>
  );
}

// ---------- Property management (multi-step) ----------
export function PropertyManagementForm() {
  const [step, setStep] = useState(1);
  const [d, setD] = useState({ city: '', type: '', bhk: '', resident: 'Resident' });
  const needsBhk = d.type && !PM_NO_BHK.has(d.type);
  const step1Ok = d.city && d.type && (!needsBhk || d.bhk);
  return (
    <div className="space-y-4">
      <ol className="flex gap-2 text-xs font-semibold">{['Your property', 'Your details'].map((s, i) => <li key={s} className={`flex-1 rounded-full px-3 py-1.5 text-center ${step === i + 1 ? 'bg-brand-900 text-white' : 'bg-neutral-100 text-neutral-500'}`}>{i + 1}. {s}</li>)}</ol>
      {step === 1 ? (
        <div className="space-y-4">
          <L label="City *"><select className="input" value={d.city} onChange={(e) => setD({ ...d, city: e.target.value })}><option value="">Select city</option>{PM_CITIES.map((c) => <option key={c}>{c}</option>)}</select></L>
          <L label="Property type *"><select className="input" value={d.type} onChange={(e) => setD({ ...d, type: e.target.value, bhk: PM_NO_BHK.has(e.target.value) ? '' : d.bhk })}><option value="">Select type</option>{PM_TYPES.map((c) => <option key={c}>{c}</option>)}</select></L>
          {needsBhk && <Chips options={['1 BHK', '2 BHK', '3 BHK', '4 BHK', '5+ BHK'] as const} value={d.bhk as '1 BHK'} set={(v) => setD({ ...d, bhk: v })} label="Configuration *" />}
          <button type="button" className="btn-primary w-full py-3" disabled={!step1Ok} onClick={() => setStep(2)}>Continue</button>
        </div>
      ) : (
        <div className="space-y-4">
          <Chips options={['Resident', 'NRI'] as const} value={d.resident as 'Resident'} set={(v) => setD({ ...d, resident: v })} label="You are" />
          <ServiceLead service="Property management" summary={`${d.type}${d.bhk ? ` ${d.bhk}` : ''} in ${d.city}, owner ${d.resident}`} cta="Get my personalised plan" />
          <button type="button" className="text-sm font-semibold text-brand-700 hover:underline" onClick={() => setStep(1)}>← Back</button>
        </div>
      )}
    </div>
  );
}

// ---------- Inspection ----------
export function InspectionBooking() {
  const [bhk, setBhk] = useState('2 BHK');
  const [stage, setStage] = useState('New home — builder handover');
  const [date, setDate] = useState('');
  const price = INSPECTION_PRICES[bhk];
  return (
    <div className="space-y-4">
      <Chips options={Object.keys(INSPECTION_PRICES)} value={bhk} set={setBhk} label="Home size" />
      <div className="grid gap-3 sm:grid-cols-2">
        <L label="Inspection for"><select className="input" value={stage} onChange={(e) => setStage(e.target.value)}>{['New home — builder handover', 'Resale purchase', 'After renovation', 'Before renting out'].map((s) => <option key={s}>{s}</option>)}</select></L>
        <L label="Preferred date"><input type="date" className="input" value={date} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} /></L>
      </div>
      <Estimate title="Inspection fee" value={inr(price)} sub="Includes on-site inspection and a photo report within 48 hours." />
      <ServiceLead service="Home inspection" summary={`${bhk}, ${stage}, ${date || 'date TBD'}, quoted ${inr(price)}`} cta="Book inspection" />
    </div>
  );
}
