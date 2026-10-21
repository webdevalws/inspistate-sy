import { useMemo, useState } from 'react';
import {
  AREA_BANDS, HOME_BHK, KITCHEN_ADDONS, KITCHEN_PACKAGES, KITCHEN_SHAPES, ROOMS, SQFT_PER_RUNNING_FT, TIERS,
  defaultSelection, interiorEstimate, kitchenCost, type KitchenPackage, type KitchenShape, type Selection, type Tier,
} from '../../data/interiors';
import { ServiceLead } from './HomeServices';

// Modular kitchen calculator and step-by-step full-home interior estimator.
// See docs/functions/{modular-kitchen,interior-cost}/desc.md.
const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const lakh = (n: number) => (n >= 1e5 ? `₹${(n / 1e5).toFixed(n >= 1e7 ? 0 : 1)} L` : inr(n));

function Steps({ steps, at }: { steps: string[]; at: number }) {
  return (
    <ol className="mb-6 grid gap-2" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
      {steps.map((s, i) => <li key={s}><div className={`h-1.5 rounded-full ${i <= at ? 'bg-accent-500' : 'bg-neutral-200'}`} /><p className={`mt-1.5 hidden text-xs font-semibold sm:block ${i === at ? 'text-brand-900' : 'text-neutral-400'}`}>{i + 1}. {s}</p></li>)}
    </ol>
  );
}
function Card({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" aria-pressed={on} onClick={onClick} className={`rounded-xl border p-4 text-left transition ${on ? 'border-brand-900 bg-brand-50 ring-2 ring-brand-900/10' : 'border-neutral-200 bg-white hover:border-brand-300'}`}>{children}</button>;
}

// ---------- Modular kitchen ----------
function ShapeIcon({ shape }: { shape: KitchenShape }) {
  const p: Record<KitchenShape, string> = { straight: 'M8 10h48v10H8z', l: 'M8 10h48v10H18v34H8z', parallel: 'M8 10h48v10H8zM8 44h48v10H8z', u: 'M8 10h48v44H46V20H18v34H8z', island: 'M8 10h48v10H8zM20 38h24v12H20z' };
  return <svg viewBox="0 0 64 64" className="h-12 w-12" aria-hidden="true"><rect x="4" y="6" width="56" height="52" rx="3" fill="none" stroke="#d4cabd" strokeDasharray="3 3" /><path d={p[shape]} fill="#1c1a17" /></svg>;
}

export function KitchenCalculator() {
  const [step, setStep] = useState(0);
  const [shape, setShape] = useState<KitchenShape>('l');
  const [sides, setSides] = useState<Record<string, { ft: number; inch: number }>>({ A: { ft: 10, inch: 0 }, B: { ft: 8, inch: 0 }, C: { ft: 8, inch: 0 }, Island: { ft: 5, inch: 0 } });
  const [pkg, setPkg] = useState<KitchenPackage>('plus');
  const [addons, setAddons] = useState<string[]>([]);
  const names = KITCHEN_SHAPES[shape].sides as readonly string[];
  const feet = names.map((n) => sides[n].ft + sides[n].inch / 12);
  const c = kitchenCost(feet, pkg, addons);
  const valid = names.every((n) => sides[n].ft >= 1);
  return (
    <div>
      <Steps steps={['Shape', 'Size', 'Package', 'Estimate']} at={step} />
      {step === 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {(Object.keys(KITCHEN_SHAPES) as KitchenShape[]).map((s) => <Card key={s} on={shape === s} onClick={() => setShape(s)}><ShapeIcon shape={s} /><p className="mt-2 font-semibold">{KITCHEN_SHAPES[s].label}</p></Card>)}
        </div>
      )}
      {step === 1 && (
        <div className="grid gap-6 sm:grid-cols-[auto_1fr]">
          <ShapeIcon shape={shape} />
          <div className="space-y-3">
            <p className="text-sm text-neutral-600">Measure each counter wall along the wall, in feet and inches.</p>
            {names.map((n) => (
              <div key={n} className="flex items-center gap-2">
                <span className="w-24 text-sm font-semibold">{n === 'Island' ? 'Island' : `Wall ${n}`}</span>
                <select className="input w-24 py-2" value={sides[n].ft} onChange={(e) => setSides({ ...sides, [n]: { ...sides[n], ft: Number(e.target.value) } })} aria-label={`${n} feet`}>{Array.from({ length: 20 }, (_, i) => i + 1).map((v) => <option key={v} value={v}>{v} ft</option>)}</select>
                <select className="input w-24 py-2" value={sides[n].inch} onChange={(e) => setSides({ ...sides, [n]: { ...sides[n], inch: Number(e.target.value) } })} aria-label={`${n} inches`}>{Array.from({ length: 12 }, (_, i) => i).map((v) => <option key={v} value={v}>{v} in</option>)}</select>
              </div>
            ))}
            <p className="text-sm text-neutral-500">{c.runningFt.toFixed(1)} running ft × {SQFT_PER_RUNNING_FT} = {c.sqft.toFixed(1)} sq ft of cabinets</p>
          </div>
        </div>
      )}
      {step === 2 && (
        <div className="space-y-5">
          <div className="grid gap-3 md:grid-cols-3">
            {(Object.keys(KITCHEN_PACKAGES) as KitchenPackage[]).map((k) => { const p = KITCHEN_PACKAGES[k]; return (
              <Card key={k} on={pkg === k} onClick={() => setPkg(k)}>
                <p className="text-lg font-bold text-brand-900">{p.label}</p><p className="text-sm text-neutral-500">{inr(p.rate)} / sq ft</p>
                <ul className="mt-2 space-y-1 text-sm"><li>Board: {p.board}</li><li>Countertop: {p.counter}</li><li>Finish: {p.finish}</li></ul>
                <p className="mt-2 text-xs text-neutral-500">Not included: {p.excludes.join(', ')}</p>
              </Card>); })}
          </div>
          <fieldset><legend className="mb-2 text-sm font-semibold">Add appliances & extras</legend>
            <div className="grid gap-2 sm:grid-cols-2">{KITCHEN_ADDONS.map((a) => <label key={a.id} className="flex items-center gap-2 rounded-lg border border-neutral-200 p-2.5 text-sm"><input type="checkbox" className="accent-brand-900" checked={addons.includes(a.id)} onChange={(e) => setAddons(e.target.checked ? [...addons, a.id] : addons.filter((x) => x !== a.id))} /><span className="flex-1">{a.label}</span><span className="text-neutral-500">{inr(a.price)}</span></label>)}</div>
          </fieldset>
        </div>
      )}
      {step === 3 && (
        <div className="space-y-5">
          <div className="rounded-2xl bg-brand-900 p-6 text-white">
            <p className="text-sm text-white/70">Estimated cost · {KITCHEN_SHAPES[shape].label} kitchen · {KITCHEN_PACKAGES[pkg].label}</p>
            <p className="text-4xl font-extrabold text-accent-400">{inr(c.total)}</p>
            <p className="mt-1 text-sm text-white/80">{c.runningFt.toFixed(1)} running ft · {c.sqft.toFixed(1)} sq ft · cabinets {inr(c.cabinets)}{c.extras ? ` + extras ${inr(c.extras)}` : ''}</p>
          </div>
          <ServiceLead service="Modular kitchen" summary={`${KITCHEN_SHAPES[shape].label}, ${names.map((n, i) => `${n} ${feet[i].toFixed(1)}ft`).join(' ')}, ${KITCHEN_PACKAGES[pkg].label}, est ${inr(c.total)}`} cta="Book a free design consultation" />
        </div>
      )}
      <div className="mt-6 flex gap-2">
        {step > 0 && <button type="button" className="btn-ghost" onClick={() => setStep(step - 1)}>Back</button>}
        {step < 3 && <button type="button" className="btn-primary" disabled={step === 1 && !valid} onClick={() => setStep(step + 1)}>{step === 2 ? 'See estimate' : 'Next'}</button>}
      </div>
    </div>
  );
}

// ---------- Full-home estimator ----------
export function InteriorEstimator() {
  const [step, setStep] = useState(0);
  const [bhkLabel, setBhkLabel] = useState<string>('2 BHK');
  const [area, setArea] = useState(AREA_BANDS['2 BHK'][0].sqft);
  const bhk = parseInt(bhkLabel);
  const [sel, setSel] = useState<Selection>(() => defaultSelection(2, AREA_BANDS['2 BHK'][0].sqft));
  const [tier, setTier] = useState<Tier>('premium');
  const [room, setRoom] = useState(ROOMS[0].id);
  const [contacted, setContacted] = useState(false);
  const est = useMemo(() => interiorEstimate(bhk, sel, tier), [bhk, sel, tier]);
  const rooms = ROOMS.filter((r) => r.count(bhk) > 0);
  const chosen = Object.values(sel).filter((s) => s.on).length;
  const pickHome = (b: string, a: number) => { setBhkLabel(b); setArea(a); setSel(defaultSelection(parseInt(b), a)); };
  const tiers = (Object.keys(TIERS) as Tier[]).map((t) => ({ t, ...interiorEstimate(bhk, sel, t) }));
  return (
    <div>
      <Steps steps={['Home', 'Rooms & items', 'Package', 'Your details', 'Estimate']} at={step} />
      {step === 0 && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{HOME_BHK.map((b) => <Card key={b} on={bhkLabel === b} onClick={() => pickHome(b, AREA_BANDS[b][0].sqft)}><p className="text-lg font-bold">{b}</p></Card>)}</div>
          <div><p className="mb-2 text-sm font-semibold">Carpet area</p>
            <div className="flex flex-wrap gap-2">{AREA_BANDS[bhkLabel].map((a) => <button key={a.label} type="button" aria-pressed={area === a.sqft} onClick={() => pickHome(bhkLabel, a.sqft)} className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${area === a.sqft ? 'border-brand-900 bg-brand-900 text-white' : 'border-neutral-200'}`}>{a.label}</button>)}</div>
            <label className="mt-3 block max-w-xs text-sm"><span className="text-neutral-600">Or enter exact area (sq ft)</span><input type="number" className="input mt-1" min={200} value={area} onChange={(e) => { const a = Math.max(200, Number(e.target.value)); setArea(a); setSel(defaultSelection(bhk, a)); }} /></label>
          </div>
        </div>
      )}
      {step === 1 && (
        <div className="grid gap-4 md:grid-cols-[200px_1fr]">
          <div role="tablist" className="flex gap-2 overflow-x-auto md:flex-col">{rooms.map((r) => { const n = r.items.filter((i) => sel[`${r.id}:${i.id}`]?.on).length; return <button key={r.id} role="tab" aria-selected={room === r.id} onClick={() => setRoom(r.id)} className={`flex shrink-0 items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold ${room === r.id ? 'bg-brand-900 text-white' : 'bg-neutral-100'}`}>{r.name}{r.count(bhk) > 1 && ` ×${r.count(bhk)}`}<span className="text-xs opacity-70">{n}</span></button>; })}</div>
          <div className="space-y-2">
            {rooms.find((r) => r.id === room)!.items.map((i) => { const key = `${room}:${i.id}`; const s = sel[key]; return (
              <div key={i.id} className={`flex flex-wrap items-center gap-3 rounded-xl border p-3 ${s.on ? 'border-brand-300 bg-brand-50' : 'border-neutral-200'}`}>
                <label className="flex flex-1 items-center gap-2 text-sm font-medium"><input type="checkbox" className="accent-brand-900" checked={s.on} onChange={(e) => setSel({ ...sel, [key]: { ...s, on: e.target.checked } })} />{i.name}</label>
                <label className="flex items-center gap-1 text-sm"><input type="number" min={1} className="input w-24 py-1.5" value={s.qty} onChange={(e) => setSel({ ...sel, [key]: { on: true, qty: Math.max(1, Number(e.target.value)) } })} aria-label={`${i.name} ${i.unit === 'sqft' ? 'area' : 'quantity'}`} /><span className="text-neutral-500">{i.unit === 'sqft' ? 'sq ft' : 'nos'}</span></label>
              </div>); })}
            {chosen === 0 && <p className="text-sm text-rose-600">Select at least one item.</p>}
          </div>
        </div>
      )}
      {step === 2 && (
        <div className="grid gap-3 md:grid-cols-3">
          {tiers.map(({ t, low, high }) => <Card key={t} on={tier === t} onClick={() => setTier(t)}><p className="text-lg font-bold text-brand-900">{TIERS[t].label}</p><p className="text-sm font-semibold text-neutral-600">{lakh(low)} – {lakh(high)}</p><ul className="mt-2 space-y-1 text-sm text-neutral-600">{TIERS[t].specs.map((x) => <li key={x}>• {x}</li>)}</ul></Card>)}
        </div>
      )}
      {step === 3 && (
        <div className="max-w-xl">
          <p className="mb-3 text-sm text-neutral-600">Share your details to see the itemised estimate. A designer will call you to refine it — no obligation.</p>
          {contacted ? <button type="button" className="btn-primary" onClick={() => setStep(4)}>View my estimate</button>
            : <ServiceLead service="Home interiors" summary={`${bhkLabel} ${area} sqft, ${TIERS[tier].label}, ${chosen} items, est ${lakh(est.low)}–${lakh(est.high)}`} cta="Show my estimate" onDone={() => { setContacted(true); setStep(4); }} />}
        </div>
      )}
      {step === 4 && (
        <div className="space-y-5">
          <div className="rounded-2xl bg-brand-900 p-6 text-white"><p className="text-sm text-white/70">Your estimate · {bhkLabel} · {area.toLocaleString('en-IN')} sq ft · {TIERS[tier].label}</p><p className="text-4xl font-extrabold text-accent-400">{lakh(est.low)} – {lakh(est.high)}</p><p className="mt-1 text-sm text-white/80">Itemised total {inr(est.total)} incl. material, labour and installation</p></div>
          <div className="overflow-x-auto rounded-xl border border-neutral-200"><table className="w-full min-w-[480px] text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500"><tr><th className="px-3 py-2">Scope</th><th>Qty</th><th className="pr-3 text-right">Price</th></tr></thead>
            {est.rooms.map((r) => <tbody key={r.id} className="divide-y divide-neutral-100"><tr className="bg-brand-50/50"><td className="px-3 py-2 font-bold" colSpan={2}>{r.name}</td><td className="pr-3 text-right font-bold">{inr(r.total)}</td></tr>{r.lines.map((l) => <tr key={l.name}><td className="px-3 py-1.5 pl-6">{l.name}</td><td>{l.qty.toLocaleString('en-IN')} {l.unit === 'sqft' ? 'sq ft' : 'nos'}</td><td className="pr-3 text-right">{inr(l.price)}</td></tr>)}</tbody>)}
          </table></div>
          <div className="flex flex-wrap gap-2 print:hidden"><button type="button" className="btn-ghost" onClick={() => setStep(1)}>Edit items</button><button type="button" className="btn-primary" onClick={() => window.print()}>⤓ Download estimate</button></div>
        </div>
      )}
      {step < 3 && (
        <div className="mt-6 flex items-center gap-3 print:hidden">
          {step > 0 && <button type="button" className="btn-ghost" onClick={() => setStep(step - 1)}>Back</button>}
          <button type="button" className="btn-primary" disabled={step === 1 && chosen === 0} onClick={() => setStep(step + 1)}>Next</button>
          <span className="text-sm text-neutral-500">Running estimate: <b className="text-brand-900">{lakh(est.low)} – {lakh(est.high)}</b></span>
        </div>
      )}
    </div>
  );
}
