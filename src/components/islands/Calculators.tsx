import { useState } from 'react';
import { emi } from './EmiCalculator';
import { formatPrice } from '../../lib/format';
import { MAX_VALUE, MIN_VALUE, STAMP_DUTY, hasGenderRates, stampDuty, type Buyer } from '../../data/stamp-duty';
import { AREA_UNITS, POPULAR_CONVERSIONS, REGIONS, convertArea, unitsFor } from '../../data/area-units';

const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function Result({ items }: { items: [string, string, boolean?][] }) {
  return (
    <dl className="space-y-3 rounded-2xl bg-brand-50 p-6">
      {items.map(([k, v, big]) => (
        <div key={k} className="flex items-baseline justify-between gap-4">
          <dt className="text-sm text-slate-600">{k}</dt>
          <dd className={big ? 'text-2xl font-extrabold text-brand-800' : 'font-bold'}>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

// Stamp duty: state × buyer (male / female / joint) rates and state registration rules. See docs/functions/stamp-duty/desc.md.
export function StampDuty({ defaultState = 'Maharashtra' }: { defaultState?: string }) {
  const [state, setState] = useState(defaultState);
  const [value, setValue] = useState(8000000);
  const [buyer, setBuyer] = useState<Buyer>('male');
  const s = STAMP_DUTY.find((x) => x.state === state) ?? STAMP_DUTY[0];
  const gender = hasGenderRates(s);
  const error = value < MIN_VALUE ? 'Minimum property value is ₹5 lakh' : value > MAX_VALUE ? 'Maximum property value is ₹50 crore' : '';
  const r = stampDuty(s, value, gender ? buyer : buyer === 'female' ? 'female' : 'male');
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-4">
        <Field label="State">
          <select className="input" value={state} onChange={(e) => setState(e.target.value)} aria-label="State">
            {STAMP_DUTY.map((x) => <option key={x.state}>{x.state}</option>)}
          </select>
        </Field>
        <fieldset>
          <legend className="mb-1 text-sm font-medium text-slate-600">Buyer</legend>
          <div className="flex gap-2">
            {(['male', 'female', 'joint'] as Buyer[]).map((b) => (
              <button key={b} type="button" aria-pressed={buyer === b} onClick={() => setBuyer(b)} className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold capitalize ${buyer === b ? 'border-brand-900 bg-brand-900 text-white' : 'border-neutral-200'}`}>{b === 'joint' ? 'Joint' : b === 'male' ? 'Man' : 'Woman'}</button>
            ))}
          </div>
          {!gender && <p className="mt-1 text-xs text-slate-500">{s.state} charges the same stamp duty rate to all buyers{s.registration.womenFree ? ', but women pay no registration fee' : ''}.</p>}
        </fieldset>
        <Field label="Property value (₹)">
          <input type="number" min={MIN_VALUE} max={MAX_VALUE} step={100000} className="input" value={value} onChange={(e) => setValue(Number(e.target.value))} />
          <input type="range" min={MIN_VALUE} max={50000000} step={100000} value={Math.min(value, 50000000)} onChange={(e) => setValue(Number(e.target.value))} className="mt-2 w-full accent-brand-900" aria-label="Property value slider" />
          <span className="mt-1 block text-xs text-slate-500">{error ? <span className="text-rose-600">{error}</span> : formatPrice(value)}</span>
        </Field>
        {s.note && <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">{s.note}</p>}
        <p className="text-xs text-slate-500">Indicative rates for planning only. Actual duty is charged on the higher of agreement value and circle rate, and can include local cess.</p>
      </div>
      {error ? <div className="grid place-items-center rounded-2xl bg-brand-50 p-6 text-sm text-slate-600">{error}</div> : (
        <Result items={[
          ['Stamp duty rate for you', `${r.pct}%`],
          ['Stamp duty', inr(r.duty)],
          [`Registration fee (${s.registration.pct}%${s.registration.cap ? `, max ${inr(s.registration.cap)}` : ''})`, r.registration ? inr(r.registration) : 'Nil'],
          ['Total government charges', inr(r.total), true],
        ]} />
      )}
    </div>
  );
}

// Area converter: region-aware units, single target with swap and copy. See docs/functions/area-converter/desc.md.
export function AreaConverter() {
  const [region, setRegion] = useState('India (General)');
  const units = unitsFor(region);
  const [fromId, setFromId] = useState('sqft');
  const [toId, setToId] = useState('sqm');
  const [value, setValue] = useState(1000);
  const [copied, setCopied] = useState(false);
  const from = units.find((u) => u.id === fromId) ?? units[0];
  const to = units.find((u) => u.id === toId && u.id !== from.id) ?? units.find((u) => u.id !== from.id)!;
  const result = convertArea(value, from, to);
  const fmt = (n: number) => (n !== 0 && Math.abs(n) < 0.01 ? Number(n.toPrecision(6)).toString() : n.toLocaleString('en-IN', { maximumFractionDigits: 6 }));
  const line = `${fmt(value)} ${from.name} = ${fmt(result)} ${to.name}`;
  const byId = (id: string) => AREA_UNITS.find((u) => u.id === id)!;
  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <Field label="Region / state">
            <select className="input" value={region} onChange={(e) => setRegion(e.target.value)}>{REGIONS.map((r) => <option key={r}>{r}</option>)}</select>
          </Field>
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
            <Field label="From"><select className="input" value={from.id} onChange={(e) => setFromId(e.target.value)} aria-label="From unit">{units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></Field>
            <button type="button" className="btn-ghost px-3" onClick={() => { setFromId(to.id); setToId(from.id); }} aria-label="Swap units" title="Swap units">⇄</button>
            <Field label="To"><select className="input" value={to.id} onChange={(e) => setToId(e.target.value)} aria-label="To unit">{units.filter((u) => u.id !== from.id).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></Field>
          </div>
          <Field label="Value to convert"><input type="number" min={0} className="input" value={value} onChange={(e) => setValue(Number(e.target.value))} /></Field>
        </div>
        <div className="flex flex-col justify-center rounded-2xl bg-brand-50 p-6">
          <p className="text-sm text-slate-600">Result</p>
          <p className="text-3xl font-extrabold text-brand-800">{value ? `${fmt(result)} ${to.name}` : '—'}</p>
          <p className="mt-2 text-sm text-slate-600">{line}</p>
          {(from.note || to.note) && <p className="mt-1 text-xs text-slate-500">{[from, to].filter((u) => u.note).map((u) => `${u.name}: ${u.note}`).join(' · ')}</p>}
          <button type="button" className="btn-ghost mt-4 self-start py-2" onClick={() => { navigator.clipboard?.writeText(line); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? 'Copied!' : 'Copy result'}</button>
        </div>
      </div>
      <div>
        <h3 className="mb-3 font-bold">Popular conversions</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {POPULAR_CONVERSIONS.map(([a, b]) => { const u = byId(a), v = byId(b); return (
            <button key={a + b} type="button" className="rounded-xl border border-neutral-200 p-3 text-left text-sm hover:border-brand-300" onClick={() => { setRegion(u.regions[0] === 'India (General)' ? region : u.regions[0]); setFromId(a); setToId(b); setValue(1); }}>
              <span className="font-semibold text-brand-900">1 {u.name}</span><span className="block text-slate-600">= {fmt(convertArea(1, u, v))} {v.name}</span>
            </button>); })}
        </div>
      </div>
      <details className="rounded-xl border border-neutral-200 p-4">
        <summary className="cursor-pointer font-semibold">All {AREA_UNITS.length} units (A–Z) in square feet</summary>
        <table className="mt-3 w-full text-sm"><thead className="text-left text-xs uppercase text-slate-500"><tr><th className="py-1">Unit</th><th>Square feet</th><th>Used in</th></tr></thead>
          <tbody className="divide-y divide-neutral-100">{[...AREA_UNITS].sort((a, b) => a.name.localeCompare(b.name)).map((u) => <tr key={u.id}><td className="py-1.5">{u.name}</td><td>{fmt(u.sqft)}</td><td className="text-slate-500">{u.regions.join(', ')}</td></tr>)}</tbody>
        </table>
        <p className="mt-2 text-xs text-slate-500">Traditional land units differ between districts; confirm with local land records before a transaction.</p>
      </details>
    </div>
  );
}

export function Affordability() {
  const [income, setIncome] = useState(150000);
  const [obligations, setObligations] = useState(10000);
  const [savings, setSavings] = useState(2000000);
  const [rate, setRate] = useState(8.5);
  const [years, setYears] = useState(20);
  // Lenders typically cap total EMIs at ~50% of net monthly income.
  const maxEmi = Math.max(0, income * 0.5 - obligations);
  const perLakh = emi(100000, rate, years);
  const loan = (maxEmi / perLakh) * 100000;
  const budget = loan + savings;
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Net monthly income (₹)"><input type="number" className="input" value={income} onChange={(e) => setIncome(Number(e.target.value))} /></Field>
        <Field label="Existing EMIs (₹/month)"><input type="number" className="input" value={obligations} onChange={(e) => setObligations(Number(e.target.value))} /></Field>
        <Field label="Savings for down payment (₹)"><input type="number" className="input" value={savings} onChange={(e) => setSavings(Number(e.target.value))} /></Field>
        <Field label="Interest rate (%)"><input type="number" step={0.05} className="input" value={rate} onChange={(e) => setRate(Number(e.target.value))} /></Field>
        <Field label="Tenure (years)"><input type="number" min={1} max={30} className="input" value={years} onChange={(e) => setYears(Number(e.target.value))} /></Field>
      </div>
      <Result items={[['Affordable EMI', inr(maxEmi)], ['Eligible loan (approx.)', formatPrice(loan)], ['Your down payment', formatPrice(savings)], ['Home budget', formatPrice(budget), true]]} />
    </div>
  );
}
