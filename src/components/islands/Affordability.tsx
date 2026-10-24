import { useEffect, useMemo, useState } from 'react';
import { formatPrice, formatRange } from '../../lib/format';

// Affordability calculator — algorithm documented in docs/functions/affordability/desc.md.
type City = { slug: string; name: string; localities: { slug: string; name: string }[] };
type Project = { id: number; name: string; href: string; image: string; locality: string; localityName: string; builder: string; status: string; possession: string; priceMin: number; priceMax: number; units: { bhk: number; carpetSqft: number; price: number }[] };

const TENURES = [10, 15, 20, 25];
const RATE_DELTAS = [-0.5, 0, 0.5, 1];
const inr = (n: number) => '₹ ' + Math.round(Math.max(n, 0)).toLocaleString('en-IN');

/** FOIR tier from the share of income already committed to obligations. */
export function foirFor(obligationRatio: number) {
  return obligationRatio <= 0.1 ? 0.5 : obligationRatio <= 0.2 ? 0.45 : obligationRatio <= 0.3 ? 0.4 : obligationRatio <= 0.4 ? 0.35 : 0.3;
}
/** Loan amount an EMI can service: present value of an annuity. */
export function loanFromEmi(emi: number, annualRate: number, years: number) {
  const r = annualRate / 1200, n = 12 * years;
  if (emi <= 0 || n <= 0) return 0;
  if (r === 0) return emi * n;
  const f = Math.pow(1 + r, n);
  return emi * ((f - 1) / (r * f));
}
export function affordability(i: { income: number; obligation: number; downPayment: number; rate: number; tenure: number }) {
  const foir = foirFor(i.income > 0 ? i.obligation / i.income : 0);
  const emi = Math.max(i.income * foir - i.obligation, 0);
  const loan = loanFromEmi(emi, i.rate, i.tenure);
  const budget = loan + i.downPayment;
  const buffer = Math.max(i.income - i.obligation - emi, 0);
  const bufferRatio = i.income > 0 ? buffer / i.income : 0;
  const bufferNote = bufferRatio >= 0.35 ? 'That leaves a healthy buffer for lifestyle and emergencies.' : bufferRatio >= 0.2 ? 'That leaves a workable but watchful monthly buffer.' : 'That leaves a tight buffer, so stretch options should be treated cautiously.';
  return { foir, emi, loan, budget, buffer, bufferNote, advisory: emi <= 0 };
}

const BANDS = [
  { key: 'comfortable', label: 'Most comfortable match', lo: 0.85, hi: 1 },
  { key: 'stretch', label: 'Stretch match', lo: 1, hi: 1.15 },
  { key: 'reduce', label: 'Only if obligations reduce', lo: 1.15, hi: 1.3 },
] as const;

function matches(projects: Project[], band: { lo: number; hi: number }, budget: number, pref: { locality: string; bhk: number; areaMin: number; areaMax: number }) {
  const min = band.lo * budget, max = band.hi * budget;
  return projects
    .filter((p) => p.priceMin <= max && p.priceMax >= min)
    .map((p) => {
      const bhks = p.units.map((u) => u.bhk);
      const bhkMatch = !pref.bhk ? 'exact' : bhks.includes(pref.bhk) ? 'exact' : bhks.some((b) => Math.abs(b - pref.bhk) === 1) ? 'adjacent' : 'none';
      const areas = p.units.map((u) => u.carpetSqft);
      const areaMatch = !(pref.areaMin > 0 && pref.areaMax > 0) ? 'overlap' : Math.max(...areas) >= pref.areaMin && Math.min(...areas) <= pref.areaMax ? 'overlap' : 'nearest';
      const localityMatch = !pref.locality || p.locality === pref.locality;
      return { p, bhkMatch, areaMatch, localityMatch };
    })
    .filter((m) => m.bhkMatch !== 'none')
    .sort((a, b) => Number(b.localityMatch) - Number(a.localityMatch) || Number(b.bhkMatch === 'exact') - Number(a.bhkMatch === 'exact') || Number(b.areaMatch === 'overlap') - Number(a.areaMatch === 'overlap'));
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <label className="block text-sm"><span className="mb-1 block font-medium text-neutral-600">{label}</span>{children}{error && <span className="mt-1 block text-xs text-rose-600">{error}</span>}</label>;
}
const Chip = ({ on, children, onClick }: { on: boolean; children: React.ReactNode; onClick: () => void }) => (
  <button type="button" onClick={onClick} aria-pressed={on} className={`rounded-full border px-3.5 py-1.5 text-sm font-medium ${on ? 'border-brand-900 bg-brand-900 text-white' : 'border-neutral-300 bg-white text-neutral-700 hover:border-brand-900'}`}>{children}</button>
);

export default function Affordability({ cities }: { cities: City[] }) {
  const [form, setForm] = useState({ city: cities[0].slug, locality: '', bhk: 2, areaMin: 0, areaMax: 0, income: 150000, obligation: 10000, downPayment: 2000000, rate: 8.5, tenure: 20 });
  const [shown, setShown] = useState<typeof form | null>(null);
  const [rateDelta, setRateDelta] = useState(0);
  const [sensTenure, setSensTenure] = useState(20);
  const [band, setBand] = useState<(typeof BANDS)[number]['key']>('comfortable');
  const [projects, setProjects] = useState<Project[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm({ ...form, [k]: v });
  const city = cities.find((c) => c.slug === form.city)!;

  function calculate(e: React.SyntheticEvent) {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (!(form.income >= 10000)) err.income = 'Enter monthly income of at least ₹10,000';
    if (form.obligation < 0) err.obligation = 'Cannot be negative';
    if (form.downPayment < 0) err.downPayment = 'Cannot be negative';
    if (!(form.rate > 0)) err.rate = 'Enter a valid interest rate';
    if (form.areaMin > 0 && form.areaMax > 0 && form.areaMin > form.areaMax) err.area = 'Area min cannot be greater than area max';
    setErrors(err);
    if (Object.keys(err).length) return;
    setShown(form);
    setRateDelta(0);
    setSensTenure(form.tenure);
    setBand('comfortable');
  }

  useEffect(() => {
    if (!shown) return;
    fetch(`/api/tools/calculator-projects?city=${shown.city}`).then((r) => r.json() as Promise<{ data: Project[] }>).then((b) => setProjects(b.data ?? [])).catch(() => setProjects([]));
  }, [shown?.city]);

  const result = useMemo(() => shown && affordability({ ...shown, rate: Math.max(shown.rate + rateDelta, 0), tenure: sensTenure }), [shown, rateDelta, sensTenure]);
  const bands = useMemo(() => (result && shown ? BANDS.map((b) => ({ ...b, list: matches(projects, b, result.budget, shown) })) : []), [result, projects, shown]);
  const active = bands.find((b) => b.key === band);

  return (
    <div className="space-y-6">
      <form onSubmit={calculate} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="City"><select className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value, locality: '' })}>{cities.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></Field>
        <Field label="Preferred locality"><select className="input" value={form.locality} onChange={(e) => set('locality', e.target.value)}><option value="">Any locality</option>{city.localities.map((l) => <option key={l.slug} value={l.slug}>{l.name}</option>)}</select></Field>
        <Field label="BHK"><select className="input" value={form.bhk} onChange={(e) => set('bhk', Number(e.target.value))}><option value={0}>Any</option>{[1, 2, 3, 4, 5].map((b) => <option key={b} value={b}>{b} BHK</option>)}</select></Field>
        <Field label="Area range (sq.ft, optional)" error={errors.area}>
          <div className="flex gap-2"><input type="number" min={0} className="input" placeholder="Min" value={form.areaMin || ''} onChange={(e) => set('areaMin', Number(e.target.value))} /><input type="number" min={0} className="input" placeholder="Max" value={form.areaMax || ''} onChange={(e) => set('areaMax', Number(e.target.value))} /></div>
        </Field>
        <Field label="Net monthly income (₹)" error={errors.income}><input type="number" className="input" value={form.income} onChange={(e) => set('income', Number(e.target.value))} /></Field>
        <Field label="Existing EMIs / obligations (₹/month)" error={errors.obligation}><input type="number" className="input" value={form.obligation} onChange={(e) => set('obligation', Number(e.target.value))} /></Field>
        <Field label="Down payment available (₹)" error={errors.downPayment}><input type="number" className="input" value={form.downPayment} onChange={(e) => set('downPayment', Number(e.target.value))} /></Field>
        <Field label="Interest rate (% p.a.)" error={errors.rate}><input type="number" step={0.05} className="input" value={form.rate} onChange={(e) => set('rate', Number(e.target.value))} /></Field>
        <div className="sm:col-span-2 lg:col-span-3">
          <p className="mb-1 text-sm font-medium text-neutral-600">Loan tenure</p>
          <div className="flex flex-wrap gap-2">{TENURES.map((t) => <Chip key={t} on={form.tenure === t} onClick={() => set('tenure', t)}>{t} years</Chip>)}</div>
        </div>
        <div className="flex items-end"><button className="btn-primary w-full py-3">Check affordability</button></div>
      </form>

      {result && shown && (
        <div className="space-y-6 border-t border-neutral-200 pt-6">
          {result.advisory && <p className="rounded-xl bg-rose-50 p-4 text-sm font-medium text-rose-700">Current obligations leave no comfortable EMI room right now. Reduce obligations, increase the down payment, or revisit the target configuration before exploring projects.</p>}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[['Max property budget', formatPrice(result.budget), true], ['Max eligible loan', formatPrice(result.loan)], ['Comfortable monthly EMI', inr(result.emi)], ['Monthly buffer', inr(result.buffer)]].map(([k, v, big]) => (
              <div key={k as string} className={`rounded-xl p-4 ${big ? 'bg-brand-900 text-white' : 'bg-brand-50'}`}><p className={`text-xs ${big ? 'text-white/70' : 'text-neutral-500'}`}>{k}</p><p className="mt-1 text-2xl font-bold">{v}</p></div>
            ))}
          </div>
          <p className="text-sm text-neutral-600">Based on {(result.foir * 100).toFixed(0)}% FOIR and existing obligations · at {(shown.rate + rateDelta).toFixed(2)}% for {sensTenure} years · down payment {formatPrice(shown.downPayment)}. You retain {inr(result.buffer)}/month after EMIs and obligations. {result.bufferNote}</p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div><p className="mb-2 text-sm font-semibold text-brand-900">What if the rate changes?</p><div className="flex flex-wrap gap-2">{RATE_DELTAS.map((d) => <Chip key={d} on={rateDelta === d} onClick={() => setRateDelta(d)}>{d === 0 ? 'As entered' : `${d > 0 ? '+' : ''}${d}%`}</Chip>)}</div></div>
            <div><p className="mb-2 text-sm font-semibold text-brand-900">What if the tenure changes?</p><div className="flex flex-wrap gap-2">{TENURES.map((t) => <Chip key={t} on={sensTenure === t} onClick={() => setSensTenure(t)}>{t} yrs</Chip>)}</div></div>
          </div>

          <div>
            <h3 className="text-lg font-bold">{result.advisory ? 'Project recommendations are paused until there is comfortable EMI room' : `Projects in ${cities.find((c) => c.slug === shown.city)?.name} for your budget`}</h3>
            {!result.advisory && (
              <>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {bands.map((b) => (
                    <button key={b.key} type="button" onClick={() => setBand(b.key)} aria-pressed={band === b.key} className={`rounded-xl border p-4 text-left ${band === b.key ? 'border-brand-900 ring-2 ring-brand-900/10' : 'border-neutral-200 hover:border-brand-300'}`}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-accent-600">{b.label}</p>
                      <p className="mt-1 font-bold text-brand-900">{formatPrice(b.lo * result.budget)} – {formatPrice(b.hi * result.budget)}</p>
                      <p className="text-xs text-neutral-500">{b.list.length} project{b.list.length === 1 ? '' : 's'}</p>
                    </button>
                  ))}
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {active?.list.map(({ p, bhkMatch, areaMatch }) => (
                    <a key={p.id} href={p.href} className="overflow-hidden rounded-xl bg-white shadow ring-1 ring-neutral-200 hover:shadow-lg">
                      <img src={p.image} alt="" className="aspect-[16/9] w-full object-cover" loading="lazy" />
                      <div className="p-4">
                        <p className="font-semibold text-brand-900">{p.name}</p>
                        <p className="text-xs text-neutral-500">{p.localityName} · {p.builder}</p>
                        <p className="mt-2 font-bold">{formatRange(p.priceMin, p.priceMax)}</p>
                        <p className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
                          {bhkMatch === 'adjacent' && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-700">Nearby BHK option</span>}
                          {areaMatch === 'nearest' && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-700">Closest size</span>}
                          <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-neutral-600">{p.status} · {p.possession}</span>
                        </p>
                      </div>
                    </a>
                  ))}
                  {active && active.list.length === 0 && <p className="text-sm text-neutral-500">No projects in this band yet. Try another band, a different BHK or a nearby locality.</p>}
                </div>
              </>
            )}
          </div>
          <a href="/services/home-loans" className="btn-dark">Talk to a home loan expert</a>
        </div>
      )}
    </div>
  );
}
