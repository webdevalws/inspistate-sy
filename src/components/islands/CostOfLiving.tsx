import { useEffect, useMemo, useState } from 'react';
import { formatPrice } from '../../lib/format';

// Cost of living — 3-step rent vs buy wizard. Logic documented in docs/functions/cost-of-living/desc.md.
type City = { slug: string; name: string; localities: { slug: string; name: string; rate: number; rent: number }[] };
type LocalityData = { slug: string; name: string; ratePerSqft: number; rentPerSqft: number; byBhk: Record<string, { sale: number | null; rent: number | null }> };
type Rental = { id: number; bhk: number; type: string; area_sqft: number; price: number; furnishing: string; href: string; localityName: string };

export const CONFIGS = [
  { bhk: 1, title: '1 BHK', min: 450, max: 700 },
  { bhk: 2, title: '2 BHK', min: 700, max: 1100 },
  { bhk: 3, title: '3 BHK', min: 1100, max: 1600 },
  { bhk: 4, title: '4 BHK', min: 1600, max: 2600 },
] as const;

/** Monthly amounts (₹) for a small family in a typical metro; scaled by family type and city price level. */
export const EXPENSES: Record<string, { label: string; levels: [string, number][]; scalesWithFamily: boolean }> = {
  groceries: { label: 'Groceries & essentials', levels: [['Basic', 8000], ['Moderate', 12000], ['Premium', 18000]], scalesWithFamily: true },
  utilities: { label: 'Electricity, water & gas', levels: [['Basic', 2500], ['Moderate', 4000], ['Premium', 6500]], scalesWithFamily: true },
  transport: { label: 'Transport', levels: [['Public transport', 2500], ['Two-wheeler', 4500], ['Own car', 10000]], scalesWithFamily: false },
  education: { label: "Children's education", levels: [['None', 0], ['Government / aided', 2000], ['Private school', 12000]], scalesWithFamily: true },
  healthcare: { label: 'Healthcare & insurance', levels: [['Basic', 1500], ['Moderate', 3000], ['Comprehensive', 6000]], scalesWithFamily: true },
  lifestyle: { label: 'Dining & entertainment', levels: [['Occasional', 3000], ['Regular', 7000], ['Frequent', 14000]], scalesWithFamily: false },
  help: { label: 'Domestic help', levels: [['None', 0], ['Part-time', 4000], ['Full-time', 12000]], scalesWithFamily: false },
  internet: { label: 'Internet & mobile', levels: [['Basic', 800], ['Standard', 1500], ['Premium', 2500]], scalesWithFamily: false },
};
const DEFAULT_LEVELS: Record<string, number> = { groceries: 1, utilities: 1, transport: 1, education: 0, healthcare: 1, lifestyle: 1, help: 1, internet: 1 };

/** Same family-type mapping as the reference: 1 BHK single/couple, 2 BHK small family, 3+ BHK large family. */
const familyType = (bhk: number) => (bhk >= 3 ? 'Large family' : bhk === 2 ? 'Small family' : 'Single / couple');
const familyFactor = (bhk: number) => (bhk >= 3 ? 1.3 : bhk === 2 ? 1 : 0.75);

export function rentVsBuy(o: { rent: number; propertyValue: number; nonHousing: number; income: number }) {
  const down = 0.2 * o.propertyValue, r = 0.085 / 12, n = 240;
  const emi = ((o.propertyValue - down) * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const pct = (x: number) => Math.round((x / o.income) * 100);
  return {
    rent: { housing: o.rent, total: o.rent + o.nonHousing, savings: o.income - o.rent - o.nonHousing, savingsPct: pct(o.income - o.rent - o.nonHousing) },
    buy: { housing: emi, total: emi + o.nonHousing, savings: o.income - emi - o.nonHousing, savingsPct: pct(o.income - emi - o.nonHousing), downPayment: down, priceToIncome: o.propertyValue / (12 * o.income), emiToIncome: pct(emi) },
  };
}

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const Tile = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button type="button" onClick={onClick} aria-pressed={on} className={`rounded-xl border px-4 py-3 text-left text-sm transition ${on ? 'border-brand-900 bg-brand-900 text-white' : 'border-neutral-200 bg-white hover:border-brand-400'}`}>{children}</button>
);

export default function CostOfLiving({ cities }: { cities: City[] }) {
  const [step, setStep] = useState(1);
  const [city, setCity] = useState<string>('');
  const [locality, setLocality] = useState<string>('');
  const [bhk, setBhk] = useState(2);
  const [income, setIncome] = useState<number | ''>('');
  const [levels, setLevels] = useState<Record<string, number>>(DEFAULT_LEVELS);
  const [data, setData] = useState<LocalityData[] | null>(null);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [scenario, setScenario] = useState<'rent' | 'buy'>('rent');
  const [shared, setShared] = useState(false);

  // Restore from a shared link (?city&loc&bhk&income).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const c = cities.find((x) => x.slug === q.get('city'));
    if (c && q.get('income')) {
      setCity(c.slug); setLocality(q.get('loc') ?? ''); setBhk(Number(q.get('bhk')) || 2); setIncome(Number(q.get('income'))); setStep(3);
    }
  }, []);
  useEffect(() => {
    if (!city) return;
    setData(null);
    fetch(`/api/tools/living-data?city=${city}`).then((r) => r.json() as Promise<{ localities: LocalityData[] }>).then((b) => setData(b.localities)).catch(() => setData([]));
  }, [city]);
  useEffect(() => {
    if (step !== 3 || !city || !locality) return;
    fetch(`/api/tools/living-data?city=${city}&locality=${locality}&bhk=${bhk}`).then((r) => r.json() as Promise<{ rentals: Rental[] }>).then((b) => setRentals(b.rentals ?? [])).catch(() => setRentals([]));
  }, [step, city, locality, bhk]);

  const cfg = CONFIGS.find((c) => c.bhk === bhk)!;
  const mid = (cfg.min + cfg.max) / 2;
  const cityObj = cities.find((c) => c.slug === city);
  const priceLevel = useMemo(() => {
    if (!data?.length) return 1;
    const avgRent = data.reduce((s, l) => s + l.rentPerSqft, 0) / data.length;
    return Math.min(1.4, Math.max(0.8, avgRent / 28));
  }, [data]);
  const nonHousing = useMemo(() => Object.entries(EXPENSES).reduce((s, [k, e]) => s + e.levels[levels[k]][1] * (e.scalesWithFamily ? familyFactor(bhk) : 1) * priceLevel, 0), [levels, bhk, priceLevel]);
  const costsFor = (l: LocalityData) => ({
    rent: l.byBhk[bhk]?.rent ?? l.rentPerSqft * mid,
    value: l.byBhk[bhk]?.sale ?? l.ratePerSqft * mid,
  });
  const current = data?.find((l) => l.slug === locality);
  const result = current && income ? rentVsBuy({ rent: costsFor(current).rent, propertyValue: costsFor(current).value, nonHousing, income: Number(income) }) : null;
  const comparison = (data ?? []).map((l) => { const c = costsFor(l); const r = income ? rentVsBuy({ rent: c.rent, propertyValue: c.value, nonHousing, income: Number(income) }) : null; return { l, c, r }; });
  const cheaper = current ? comparison.filter((x) => x.l.slug !== locality && x.c.rent < costsFor(current).rent).sort((a, b) => a.c.rent - b.c.rent).slice(0, 3) : [];
  const incomeOk = typeof income === 'number' && income >= 10000 && income <= 10000000;

  async function share() {
    const url = `${window.location.origin}/tools/cost-of-living?city=${city}&loc=${locality}&bhk=${bhk}&income=${income}`;
    try { if (navigator.share) await navigator.share({ title: 'My cost of living', url }); else { await navigator.clipboard.writeText(url); setShared(true); } } catch { /* cancelled */ }
  }

  return (
    <div>
      <ol className="mb-6 flex gap-2 print:hidden">
        {['City', 'Your details', 'Results'].map((s, i) => (
          <li key={s} className="flex-1"><div className={`h-1.5 rounded-full ${i < step ? 'bg-brand-900' : 'bg-neutral-200'}`} /><p className={`mt-1.5 text-xs font-semibold ${i + 1 === step ? 'text-brand-900' : 'text-neutral-400'}`}>{i + 1}. {s}</p></li>
        ))}
      </ol>

      {step === 1 && (
        <div>
          <h3 className="mb-3 font-semibold">Which city are you living in or moving to?</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">{cities.map((c) => <Tile key={c.slug} on={city === c.slug} onClick={() => { setCity(c.slug); setLocality(''); }}>{c.name}</Tile>)}</div>
          <button className="btn-primary mt-6" disabled={!city} onClick={() => setStep(2)}>Next</button>
        </div>
      )}

      {step === 2 && cityObj && (
        <div className="space-y-6">
          <div>
            <h3 className="mb-3 font-semibold">Locality in {cityObj.name}</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{cityObj.localities.map((l) => <Tile key={l.slug} on={locality === l.slug} onClick={() => setLocality(l.slug)}>{l.name}<span className={`block text-xs ${locality === l.slug ? 'text-white/70' : 'text-neutral-500'}`}>Rent ~₹{l.rent}/sq.ft</span></Tile>)}</div>
          </div>
          <div>
            <h3 className="mb-3 font-semibold">Home configuration</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{CONFIGS.map((c) => <Tile key={c.bhk} on={bhk === c.bhk} onClick={() => setBhk(c.bhk)}>{c.title}<span className={`block text-xs ${bhk === c.bhk ? 'text-white/70' : 'text-neutral-500'}`}>{c.min}–{c.max} sq.ft · {familyType(c.bhk)}</span></Tile>)}</div>
          </div>
          <label className="block max-w-sm text-sm"><span className="mb-1 block font-semibold">Monthly household income (₹)</span>
            <input type="number" className="input" value={income} onChange={(e) => setIncome(e.target.value ? Number(e.target.value) : '')} placeholder="e.g. 150000" />
            {income !== '' && !incomeOk && <span className="mt-1 block text-xs text-rose-600">Enter an income between ₹10,000 and ₹1 crore</span>}
          </label>
          <div>
            <h3 className="mb-3 font-semibold">Your lifestyle</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(EXPENSES).map(([k, e]) => (
                <div key={k} className="rounded-xl border border-neutral-200 p-3">
                  <p className="text-sm font-medium text-brand-900">{e.label}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">{e.levels.map(([name], i) => <button key={name} type="button" onClick={() => setLevels({ ...levels, [k]: i })} aria-pressed={levels[k] === i} className={`rounded-full px-3 py-1 text-xs font-medium ${levels[k] === i ? 'bg-brand-900 text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'}`}>{name}</button>)}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-3"><button className="btn-ghost" onClick={() => setStep(1)}>Back</button><button className="btn-primary" disabled={!locality || !incomeOk || !data} onClick={() => setStep(3)}>See results</button></div>
        </div>
      )}

      {step === 3 && cityObj && current && result && (
        <div className="space-y-6" id="col-report">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold">Living in {current.name}, {cityObj.name}</h3>
              <p className="text-sm text-neutral-500">{cfg.title} · {familyType(bhk)} · income {inr(Number(income))}/month</p>
            </div>
            <div className="flex gap-2 print:hidden">
              <button className="btn-ghost" onClick={() => setStep(2)}>Edit</button>
              <button className="btn-ghost" onClick={share}>{shared ? '✓ Link copied' : '↗ Share'}</button>
              <button className="btn-primary" onClick={() => window.print()}>⤓ Download Report</button>
            </div>
          </div>

          <div className="flex gap-2 print:hidden">{(['rent', 'buy'] as const).map((s) => <button key={s} onClick={() => setScenario(s)} aria-pressed={scenario === s} className={`rounded-lg px-5 py-2 text-sm font-semibold ${scenario === s ? 'bg-brand-900 text-white' : 'bg-neutral-100 text-neutral-700'}`}>{s === 'rent' ? 'If you rent' : 'If you buy'}</button>)}</div>

          {(['rent', 'buy'] as const).map((s) => {
            const r = result[s];
            return (
              <div key={s} className={`grid gap-3 sm:grid-cols-4 ${scenario === s ? '' : 'hidden print:grid'}`}>
                <p className="hidden text-sm font-bold print:block sm:col-span-4">{s === 'rent' ? 'Rent scenario' : 'Buy scenario'}</p>
                {[[s === 'rent' ? 'Monthly rent' : 'Monthly EMI', inr(r.housing)], ['Other living costs', inr(nonHousing)], ['Total monthly spend', inr(r.total)], ['You save', `${inr(r.savings)} (${r.savingsPct}%)`]].map(([k, v], i) => (
                  <div key={k} className={`rounded-xl p-4 ${i === 3 ? (r.savings >= 0 ? 'bg-emerald-50' : 'bg-rose-50') : 'bg-brand-50'}`}><p className="text-xs text-neutral-500">{k}</p><p className="mt-1 text-xl font-bold text-brand-900">{v}</p></div>
                ))}
                {s === 'buy' && (
                  <p className="text-sm text-neutral-600 sm:col-span-4">Property value {formatPrice(costsFor(current).value)} · down payment {formatPrice(result.buy.downPayment)} · 8.5% for 20 years · price-to-income {result.buy.priceToIncome.toFixed(1)}× annual income · EMI is {result.buy.emiToIncome}% of income{result.buy.emiToIncome > 50 ? ' — above what most lenders allow.' : '.'}</p>
                )}
              </div>
            );
          })}

          <div>
            <h4 className="mb-2 font-semibold">Monthly breakdown</h4>
            <ul className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              {Object.entries(EXPENSES).map(([k, e]) => <li key={k} className="flex justify-between border-b border-neutral-100 py-1"><span className="text-neutral-600">{e.label} <span className="text-neutral-400">({e.levels[levels[k]][0]})</span></span><span>{inr(e.levels[levels[k]][1] * (e.scalesWithFamily ? familyFactor(bhk) : 1) * priceLevel)}</span></li>)}
            </ul>
          </div>

          <div>
            <h4 className="mb-2 font-semibold">Compare localities in {cityObj.name} ({cfg.title})</h4>
            <div className="overflow-x-auto rounded-xl border border-neutral-200">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500"><tr><th className="px-3 py-2">Locality</th><th>Rent</th><th>Monthly total (rent)</th><th>Property value</th><th>Monthly total (buy)</th></tr></thead>
                <tbody className="divide-y divide-neutral-100">
                  {comparison.map(({ l, c, r }) => <tr key={l.slug} className={l.slug === locality ? 'bg-accent-50 font-semibold' : ''}><td className="px-3 py-2">{l.name}</td><td>{inr(c.rent)}</td><td>{r && inr(r.rent.total)}</td><td>{formatPrice(c.value)}</td><td>{r && inr(r.buy.total)}</td></tr>)}
                </tbody>
              </table>
            </div>
          </div>

          {cheaper.length > 0 && (
            <div className="print:hidden">
              <h4 className="mb-2 font-semibold">More affordable alternatives</h4>
              <div className="grid gap-3 sm:grid-cols-3">{cheaper.map(({ l, c }) => <button key={l.slug} onClick={() => setLocality(l.slug)} className="rounded-xl border border-neutral-200 p-4 text-left hover:border-brand-400"><p className="font-semibold text-brand-900">{l.name}</p><p className="text-sm text-neutral-500">Rent {inr(c.rent)} · saves {inr(costsFor(current).rent - c.rent)}/month</p></button>)}</div>
            </div>
          )}

          <div className="print:hidden">
            <h4 className="mb-2 font-semibold">{cfg.title} homes for rent in {current.name}</h4>
            {rentals.length ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{rentals.map((r) => <a key={r.id} href={r.href} className="rounded-xl border border-neutral-200 p-4 hover:border-brand-400"><p className="font-semibold text-brand-900">{r.bhk} BHK {r.type}</p><p className="text-sm text-neutral-500">{r.area_sqft} sq.ft · {r.furnishing}</p><p className="mt-1 font-bold">{inr(r.price)}/month</p></a>)}</div>
            ) : <p className="text-sm text-neutral-500">No live rentals for this configuration yet. <a className="font-semibold underline" href={`/rent/${city}/${locality}/${bhk}-bhk`}>Search nearby</a></p>}
          </div>
        </div>
      )}
    </div>
  );
}
