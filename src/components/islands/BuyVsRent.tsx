import { useMemo, useState } from 'react';
import { emi } from './EmiCalculator';
import { formatPrice } from '../../lib/format';

// Buy vs Rent: locality-driven defaults, year-by-year net worth projection, breakeven, verdict and sensitivity.
// Model and reference behaviour: docs/functions/buy-vs-rent/desc.md.
type Locality = { slug: string; name: string; rate: number; rent: number };
type City = { slug: string; name: string; localities: Locality[] };

const BHK_AREA: Record<string, number> = { '1 BHK': 600, '2 BHK': 1000, '3 BHK': 1450, '4 BHK': 2100 };
const HORIZONS = [5, 7, 10, 15, 20];
const CLOSE_CALL = 0.05; // within 5% of each other = close call

export interface BvrInput { price: number; rent: number; downPct: number; tenure: number; rate: number; ret: number; appr: number; rentUp: number; years: number; buyCostPct: number; upkeepPct: number }

/**
 * Both sides start with the same cash (down payment + purchase costs) and spend the same each month.
 * Buyer: pays EMI + upkeep; owns the home (value − loan balance) plus any surplus invested when rent would have cost more.
 * Renter: invests the upfront cash, pays rent, and invests the monthly difference whenever owning would have cost more.
 */
export function project(i: BvrInput) {
  const loan = i.price * (1 - i.downPct / 100);
  const m = loan > 0 ? emi(loan, i.rate, i.tenure) : 0;
  const upfront = i.price * (i.downPct / 100) + i.price * (i.buyCostPct / 100);
  const mr = i.ret / 1200;
  let balance = loan, renter = upfront, buyerSide = 0, rent = i.rent, totalRent = 0, totalInterest = 0;
  const rows: { year: number; buy: number; rent: number }[] = [];
  for (let mo = 1; mo <= i.years * 12; mo++) {
    const interest = (balance * i.rate) / 1200;
    const pay = balance > 0 ? Math.min(m, balance + interest) : 0;
    totalInterest += balance > 0 ? interest : 0;
    balance = Math.max(0, balance + interest - pay);
    const homeValue = i.price * (1 + i.appr / 100) ** (mo / 12);
    const ownerOut = pay + (homeValue * i.upkeepPct) / 100 / 12;
    renter = renter * (1 + mr) + Math.max(0, ownerOut - rent);
    buyerSide = buyerSide * (1 + mr) + Math.max(0, rent - ownerOut);
    totalRent += rent;
    if (mo % 12 === 0) {
      rows.push({ year: mo / 12, buy: homeValue - balance + buyerSide, rent: renter });
      rent *= 1 + i.rentUp / 100;
    }
  }
  const last = rows[rows.length - 1] ?? { buy: 0, rent: 0 };
  const breakeven = rows.find((r) => r.buy > r.rent)?.year ?? null;
  const diff = (last.buy - last.rent) / Math.max(last.buy, last.rent, 1);
  const verdict = Math.abs(diff) < CLOSE_CALL ? 'Close call' : diff > 0 ? 'Buy' : 'Rent';
  return { m, loan, upfront, rows, buy: last.buy, rentWorth: last.rent, breakeven, verdict, totalRent, totalInterest } as const;
}

/** Value of `key` at which buying and renting end level (bisection), or null if outside the range. */
function solveLevel(i: BvrInput, key: keyof BvrInput, lo: number, hi: number) {
  const gap = (v: number) => { const r = project({ ...i, [key]: v }); return r.buy - r.rentWorth; };
  let a = lo, b = hi, ga = gap(a), gb = gap(b);
  if (Math.sign(ga) === Math.sign(gb)) return null;
  for (let k = 0; k < 40; k++) { const c = (a + b) / 2, gc = gap(c); if (Math.sign(gc) === Math.sign(ga)) { a = c; ga = gc; } else { b = c; gb = gc; } }
  return (a + b) / 2;
}

function Slider({ label, value, set, min, max, step, unit = '%' }: { label: string; value: number; set: (n: number) => void; min: number; max: number; step: number; unit?: string }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 flex justify-between font-medium text-slate-600"><span>{label}</span><span className="font-bold text-brand-900">{value}{unit}</span></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => set(Number(e.target.value))} className="w-full accent-brand-900" aria-label={label} />
    </label>
  );
}

function Chart({ rows }: { rows: { year: number; buy: number; rent: number }[] }) {
  if (rows.length < 2) return null;
  const W = 640, H = 240, P = 44;
  const max = Math.max(...rows.flatMap((r) => [r.buy, r.rent])) * 1.05;
  const min = Math.min(0, ...rows.flatMap((r) => [r.buy, r.rent]));
  const x = (y: number) => P + ((y - 1) / (rows.length - 1)) * (W - P - 10);
  const yv = (v: number) => H - 24 - ((v - min) / (max - min)) * (H - 40);
  const path = (k: 'buy' | 'rent') => rows.map((r, i) => `${i ? 'L' : 'M'}${x(r.year).toFixed(1)},${yv(r[k]).toFixed(1)}`).join(' ');
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => min + t * (max - min));
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Net worth projection: buying vs renting">
        {ticks.map((t) => <g key={t}><line x1={P} x2={W - 10} y1={yv(t)} y2={yv(t)} stroke="#e7e0d6" /><text x={P - 6} y={yv(t) + 4} textAnchor="end" fontSize="10" fill="#81776b">{formatPrice(t).replace('₹', '')}</text></g>)}
        {rows.map((r) => (rows.length <= 15 || r.year % 5 === 0) && <text key={r.year} x={x(r.year)} y={H - 6} textAnchor="middle" fontSize="10" fill="#81776b">Y{r.year}</text>)}
        <path d={path('rent')} fill="none" stroke="#2563eb" strokeWidth="2.5" />
        <path d={path('buy')} fill="none" stroke="#059669" strokeWidth="2.5" />
      </svg>
      <figcaption className="mt-1 flex gap-4 text-xs"><span className="flex items-center gap-1"><i className="h-2 w-4 rounded bg-emerald-600" />Buy: home equity + savings</span><span className="flex items-center gap-1"><i className="h-2 w-4 rounded bg-blue-600" />Rent: invested corpus</span></figcaption>
    </figure>
  );
}

export default function BuyVsRent({ cities }: { cities: City[] }) {
  const [citySlug, setCitySlug] = useState(cities[0]?.slug ?? '');
  const city = cities.find((c) => c.slug === citySlug) ?? cities[0];
  const [locSlug, setLocSlug] = useState(city?.localities[0]?.slug ?? '');
  const loc = city?.localities.find((l) => l.slug === locSlug) ?? city?.localities[0];
  const [bhk, setBhk] = useState('2 BHK');
  const [area, setArea] = useState(BHK_AREA['2 BHK']);
  const [override, setOverride] = useState<{ price?: number; rent?: number }>({});
  const [years, setYears] = useState(15);
  const [rentMode, setRentMode] = useState<'increase' | 'constant'>('increase');
  const [rentUpIn, setRentUp] = useState(5);
  const [downPct, setDownPct] = useState(30);
  const [tenure, setTenure] = useState(20);
  const [rate, setRate] = useState(8.5);
  const [ret, setRet] = useState(8.5);
  const [appr, setAppr] = useState(5);
  const [buyCostPct, setBuyCostPct] = useState(7);
  const [upkeepPct, setUpkeepPct] = useState(0.5);

  const autoPrice = Math.round(((loc?.rate ?? 8000) * area) / 10000) * 10000;
  const autoRent = Math.round(((loc?.rent ?? 25) * area) / 500) * 500;
  const input: BvrInput = { price: override.price ?? autoPrice, rent: override.rent ?? autoRent, downPct, tenure, rate, ret, appr, rentUp: rentMode === 'constant' ? 0 : rentUpIn, years, buyCostPct, upkeepPct };
  const r = useMemo(() => project(input), [JSON.stringify(input)]);
  const sens = useMemo(() => ({
    appr: solveLevel(input, 'appr', -5, 20),
    price: solveLevel(input, 'price', input.price * 0.3, input.price * 3),
    ret: solveLevel(input, 'ret', 1, 20),
    rate: solveLevel(input, 'rate', 5, 20),
  }), [JSON.stringify(input)]);
  const localities = useMemo(() => (city?.localities ?? []).map((l) => {
    const p = Math.round(l.rate * area), rt = Math.round(l.rent * area);
    const o = project({ ...input, price: p, rent: rt });
    return { ...l, price: p, rentM: rt, yield: ((rt * 12) / p) * 100, breakeven: o.breakeven, verdict: o.verdict };
  }).sort((a, b) => b.yield - a.yield), [city, area, JSON.stringify({ ...input, price: 0, rent: 0 })]);

  const tone = r.verdict === 'Buy' ? 'bg-emerald-600' : r.verdict === 'Rent' ? 'bg-blue-600' : 'bg-amber-500';
  const lead = r.verdict === 'Close call' ? 'Buying and renting end up within 5% of each other' : `${r.verdict === 'Buy' ? 'Buying' : 'Renting'} leaves you ${formatPrice(Math.abs(r.buy - r.rentWorth))} richer after ${years} years`;
  const what: string[] = [];
  if (sens.appr != null) what.push(`${r.verdict === 'Buy' ? 'Renting wins if' : 'Buying wins if'} property prices grow ${r.verdict === 'Buy' ? 'below' : 'above'} ${sens.appr.toFixed(1)}% a year (you assumed ${appr}%).`);
  if (sens.price != null) what.push(`The two options level out at a price of ${formatPrice(sens.price)} (₹${Math.round(sens.price / area).toLocaleString('en-IN')}/sq ft).`);
  if (sens.ret != null) what.push(`${r.verdict === 'Rent' ? 'Buying wins if' : 'Renting wins if'} your investments earn ${r.verdict === 'Rent' ? 'below' : 'above'} ${sens.ret.toFixed(1)}% a year.`);
  if (sens.rate != null) what.push(`Breakeven home loan rate: ${sens.rate.toFixed(2)}%.`);

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm"><span className="mb-1 block font-medium text-slate-600">City</span><select className="input" value={city?.slug} onChange={(e) => { setCitySlug(e.target.value); setLocSlug(''); setOverride({}); }} aria-label="City">{cities.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></label>
            <label className="text-sm"><span className="mb-1 block font-medium text-slate-600">Locality</span><select className="input" value={loc?.slug} onChange={(e) => { setLocSlug(e.target.value); setOverride({}); }} aria-label="Locality">{city?.localities.map((l) => <option key={l.slug} value={l.slug}>{l.name}</option>)}</select></label>
          </div>
          <div>
            <p className="mb-1 text-sm font-medium text-slate-600">Home</p>
            <div className="flex flex-wrap gap-2">{Object.keys(BHK_AREA).map((b) => <button key={b} type="button" aria-pressed={bhk === b} onClick={() => { setBhk(b); setArea(BHK_AREA[b]); setOverride({}); }} className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${bhk === b ? 'border-brand-900 bg-brand-900 text-white' : 'border-neutral-200'}`}>{b}</button>)}</div>
            <label className="mt-2 block text-sm"><span className="text-slate-600">Area (sq ft)</span><input type="number" className="input mt-1" min={200} value={area} onChange={(e) => { setArea(Math.max(100, Number(e.target.value))); setOverride({}); }} /></label>
          </div>
          <div className="grid gap-3 rounded-xl bg-brand-50 p-4 sm:grid-cols-2">
            <label className="text-sm"><span className="mb-1 block text-slate-600">Property price (₹)</span><input type="number" className="input" value={input.price} step={100000} onChange={(e) => setOverride({ ...override, price: Number(e.target.value) })} /><span className="mt-1 block text-xs text-slate-500">{override.price ? 'Your value' : `Auto: ${loc?.name} @ ₹${loc?.rate.toLocaleString('en-IN')}/sq ft`}</span></label>
            <label className="text-sm"><span className="mb-1 block text-slate-600">Monthly rent (₹)</span><input type="number" className="input" value={input.rent} step={500} onChange={(e) => setOverride({ ...override, rent: Number(e.target.value) })} /><span className="mt-1 block text-xs text-slate-500">{override.rent ? 'Your value' : `Auto: ₹${loc?.rent}/sq ft per month`}</span></label>
          </div>
          <div>
            <p className="mb-1 text-sm font-medium text-slate-600">How long will you stay?</p>
            <div className="flex flex-wrap gap-2">{HORIZONS.map((h) => <button key={h} type="button" aria-pressed={years === h} onClick={() => setYears(h)} className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${years === h ? 'border-brand-900 bg-brand-900 text-white' : 'border-neutral-200'}`}>{h} yrs</button>)}</div>
            <div className="mt-2"><Slider label="Stay duration" value={years} set={setYears} min={1} max={30} step={1} unit=" yrs" /></div>
          </div>
          <div>
            <div className="mb-2 flex gap-2 text-sm">{(['increase', 'constant'] as const).map((m) => <button key={m} type="button" aria-pressed={rentMode === m} onClick={() => setRentMode(m)} className={`flex-1 rounded-lg border px-3 py-2 font-semibold ${rentMode === m ? 'border-brand-900 bg-brand-900 text-white' : 'border-neutral-200'}`}>{m === 'increase' ? 'Rent rises yearly' : 'Keep rent constant'}</button>)}</div>
            {rentMode === 'increase' && <Slider label="Rent increase per year" value={rentUpIn} set={setRentUp} min={0} max={15} step={0.5} />}
          </div>
        </div>
        <div className="space-y-4">
          <Slider label="Down payment" value={downPct} set={setDownPct} min={0} max={90} step={5} />
          <Slider label="Loan tenure" value={tenure} set={setTenure} min={1} max={30} step={1} unit=" yrs" />
          <Slider label="Loan interest rate" value={rate} set={setRate} min={5} max={20} step={0.05} />
          <Slider label="Investment return" value={ret} set={setRet} min={1} max={20} step={0.5} />
          <Slider label="Property price growth" value={appr} set={setAppr} min={-5} max={20} step={0.5} />
          <details className="rounded-xl border border-neutral-200 p-3 text-sm">
            <summary className="cursor-pointer font-semibold">Buying costs</summary>
            <div className="mt-3 space-y-3">
              <Slider label="Stamp duty, registration & fees" value={buyCostPct} set={setBuyCostPct} min={0} max={12} step={0.5} />
              <Slider label="Maintenance & property tax per year" value={upkeepPct} set={setUpkeepPct} min={0} max={3} step={0.1} />
            </div>
          </details>
        </div>
      </div>

      <section className="space-y-6" aria-live="polite">
        <div className={`flex flex-wrap items-center gap-5 rounded-2xl p-6 text-white ${tone}`}>
          <p className="text-4xl font-extrabold">{r.verdict === 'Close call' ? 'Close call' : `${r.verdict} wins`}</p>
          <p className="flex-1 text-white/90">{lead}.</p>
        </div>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[['Net worth if you buy', formatPrice(r.buy)], ['Net worth if you rent', formatPrice(r.rentWorth)], ['Breakeven', r.breakeven ? `Year ${r.breakeven}` : `Not within ${years} yrs`], ['Monthly EMI', `₹${Math.round(r.m).toLocaleString('en-IN')}`]].map(([k, v]) => <div key={k} className="rounded-xl border border-neutral-200 p-4"><dt className="text-xs text-slate-500">{k}</dt><dd className="text-xl font-bold text-brand-900">{v}</dd></div>)}
        </dl>
        <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
          <div className="rounded-xl border border-neutral-200 p-4"><h3 className="mb-2 font-bold">Net worth over time</h3><Chart rows={r.rows} /></div>
          <div className="space-y-4">
            <div className="rounded-xl border border-neutral-200 p-4 text-sm">
              <h3 className="mb-2 font-bold">Where the money goes</h3>
              <p><b>Buying:</b> {formatPrice(r.upfront)} upfront (down payment + costs), EMI of ₹{Math.round(r.m).toLocaleString('en-IN')}, {formatPrice(r.totalInterest)} interest over {years} yrs.</p>
              <p className="mt-2"><b>Renting:</b> {formatPrice(r.totalRent)} rent over {years} yrs, while {formatPrice(r.upfront)} plus monthly savings stays invested at {ret}%.</p>
            </div>
            {what.length > 0 && <div className="rounded-xl border border-neutral-200 p-4 text-sm"><h3 className="mb-2 font-bold">What would change the outcome?</h3><ul className="list-disc space-y-1 pl-5">{what.map((w) => <li key={w}>{w}</li>)}</ul></div>}
          </div>
        </div>
        <details className="rounded-xl border border-neutral-200 p-4">
          <summary className="cursor-pointer font-semibold">Year-by-year projection</summary>
          <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[420px] text-sm"><thead className="text-left text-xs uppercase text-slate-500"><tr><th className="py-1">Year</th><th>Buy</th><th>Rent</th><th>Difference</th></tr></thead>
            <tbody className="divide-y divide-neutral-100">{r.rows.map((x) => <tr key={x.year}><td className="py-1.5">{x.year}</td><td>{formatPrice(x.buy)}</td><td>{formatPrice(x.rent)}</td><td className={x.buy > x.rent ? 'text-emerald-700' : 'text-blue-700'}>{x.buy > x.rent ? '+' : '−'}{formatPrice(Math.abs(x.buy - x.rent))}</td></tr>)}</tbody></table></div>
        </details>
        {localities.length > 1 && (
          <div>
            <h3 className="mb-2 font-bold">Compare localities in {city?.name} ({bhk}, {area} sq ft)</h3>
            <div className="overflow-x-auto rounded-xl border border-neutral-200"><table className="w-full min-w-[640px] text-sm">
              <thead className="bg-neutral-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-3 py-2">Locality</th><th>Price</th><th>Rent/month</th><th>Rental yield</th><th>Breakeven</th><th>Verdict</th></tr></thead>
              <tbody className="divide-y divide-neutral-100">{localities.map((l) => <tr key={l.slug} className={l.slug === loc?.slug ? 'bg-accent-50' : ''}><td className="px-3 py-2 font-medium">{l.name}</td><td>{formatPrice(l.price)}</td><td>₹{l.rentM.toLocaleString('en-IN')}</td><td>{l.yield.toFixed(1)}%</td><td>{l.breakeven ? `Yr ${l.breakeven}` : '—'}</td><td><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${l.verdict === 'Buy' ? 'bg-emerald-100 text-emerald-800' : l.verdict === 'Rent' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>{l.verdict}</span></td></tr>)}</tbody>
            </table></div>
            <p className="mt-1 text-xs text-slate-500">Low rental yield (rent relative to price) usually favours renting; high yield favours buying.</p>
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          <a className="btn-primary" href={`/buy/${city?.slug}/${parseInt(bhk)}-bhk`}>{bhk} homes for sale in {city?.name}</a>
          <a className="btn-ghost" href={`/rent/${city?.slug}/${parseInt(bhk)}-bhk`}>{bhk} homes for rent</a>
        </div>
        <p className="text-xs text-slate-500">Both sides start with the same cash and spend the same each month; whichever side spends less invests the difference at your investment return. Excludes selling costs and taxes on gains. Indicative only.</p>
      </section>
    </div>
  );
}
