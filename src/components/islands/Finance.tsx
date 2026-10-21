import { useState } from 'react';
import { emi } from './EmiCalculator';
import { ServiceLead } from './HomeServices';
import { CARD_TAGS, CREDIT_CARDS, LOAN_KINDS, type LoanKind } from '../../data/loans';
import { formatPrice } from '../../lib/format';

// Loan product eligibility, loan request form, credit card catalogue and credit score check.
// See docs/functions/{personal-loan,business-loan,loan-against-property,credit-cards,credit-score}/desc.md.
const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const L = ({ label, children }: { label: string; children: React.ReactNode }) => <label className="block text-sm"><span className="mb-1 block font-medium text-slate-600">{label}</span>{children}</label>;

/** Max loan from income: EMI capacity = income × FOIR − EMIs; loan = capacity ÷ EMI per rupee. LAP also capped by LTV. */
export function ProductEligibility({ kind }: { kind: LoanKind }) {
  const k = LOAN_KINDS[kind];
  const [income, setIncome] = useState(80000);
  const [emis, setEmis] = useState(0);
  const [job, setJob] = useState<'salaried' | 'self' | 'professional'>('salaried');
  const [years, setYears] = useState<number>(k.years[2]);
  const [rate, setRate] = useState<number>(k.rate[2]);
  const [value, setValue] = useState(10000000);
  const [age, setAge] = useState(35);
  const foir = (kind === 'personal' ? 0.5 : 0.55) - (job === 'salaried' ? 0 : 0.05);
  const capacity = Math.max(0, income * foir - emis);
  const maxAge = kind === 'lap' ? 65 : 60;
  const tenure = Math.max(0, Math.min(years, maxAge - age));
  const byIncome = tenure > 0 ? Math.min(k.amount[1], (capacity / emi(1, rate, tenure))) : 0;
  const byValue = kind === 'lap' ? value * 0.7 : Infinity;
  const loan = Math.max(0, Math.min(byIncome, byValue));
  const tooHigh = emis > income * 0.8;
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="grid gap-4 sm:grid-cols-2">
        <L label="Employment"><select className="input" value={job} onChange={(e) => setJob(e.target.value as typeof job)}><option value="salaried">Salaried</option><option value="self">Self-employed business</option><option value="professional">Self-employed professional</option></select></L>
        <L label="Net monthly income (₹)"><input type="number" className="input" min={0} step={5000} value={income} onChange={(e) => setIncome(Number(e.target.value))} /></L>
        <L label="Existing EMIs (₹/month)"><input type="number" className="input" min={0} step={1000} value={emis} onChange={(e) => setEmis(Number(e.target.value))} /></L>
        <L label="Your age"><input type="number" className="input" min={21} max={70} value={age} onChange={(e) => setAge(Number(e.target.value))} /></L>
        <L label={`Tenure (max ${k.years[1]} yrs)`}><input type="number" className="input" min={1} max={k.years[1]} value={years} onChange={(e) => setYears(Math.min(k.years[1], Math.max(1, Number(e.target.value))))} /></L>
        <L label="Expected rate (%)"><input type="number" className="input" min={k.rate[0]} max={k.rate[1]} step={0.25} value={rate} onChange={(e) => setRate(Number(e.target.value))} /></L>
        {kind === 'lap' && <L label="Property market value (₹)"><input type="number" className="input" min={500000} step={100000} value={value} onChange={(e) => setValue(Number(e.target.value))} /></L>}
      </div>
      <div className="space-y-3 rounded-2xl bg-brand-50 p-6">
        {tooHigh ? <p className="rounded-lg bg-amber-100 p-3 text-sm text-amber-900">Existing EMIs above 80% of income — most lenders will not approve a new loan.</p> : (
          <>
            <p className="text-sm text-slate-500">You may be eligible for</p>
            <p className="text-3xl font-extrabold text-brand-900">{formatPrice(loan)}</p>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between"><dt>EMI lenders may allow ({Math.round(foir * 100)}% of income)</dt><dd className="font-semibold">{inr(capacity)}</dd></div>
              <div className="flex justify-between"><dt>Tenure considered</dt><dd className="font-semibold">{tenure} yrs</dd></div>
              <div className="flex justify-between"><dt>Based on income</dt><dd className="font-semibold">{formatPrice(byIncome)}</dd></div>
              {kind === 'lap' && <div className="flex justify-between"><dt>70% of property value</dt><dd className="font-semibold">{formatPrice(byValue)}</dd></div>}
              <div className="flex justify-between"><dt>EMI on this amount</dt><dd className="font-semibold">{inr(tenure ? emi(loan, rate, tenure) : 0)}</dd></div>
            </dl>
          </>
        )}
        <p className="text-xs text-slate-500">Indicative. Lenders also weigh your credit score, employer and banking history.</p>
      </div>
    </div>
  );
}

export function LoanRequest({ product, kind }: { product: string; kind: LoanKind }) {
  const [d, setD] = useState({ amount: LOAN_KINDS[kind].amount[2] as number, city: '', job: 'Salaried', income: 60000 });
  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <L label="Loan amount (₹)"><input type="number" className="input" value={d.amount} onChange={(e) => setD({ ...d, amount: Number(e.target.value) })} /></L>
        <L label="City"><input className="input" value={d.city} onChange={(e) => setD({ ...d, city: e.target.value })} placeholder="e.g. Pune" /></L>
        <L label="Employment"><select className="input" value={d.job} onChange={(e) => setD({ ...d, job: e.target.value })}>{['Salaried', 'Self-employed business', 'Self-employed professional', 'Pensioner'].map((x) => <option key={x}>{x}</option>)}</select></L>
        <L label="Monthly income (₹)"><input type="number" className="input" value={d.income} onChange={(e) => setD({ ...d, income: Number(e.target.value) })} /></L>
      </div>
      <ServiceLead service={product} summary={`${formatPrice(d.amount)}, ${d.city || 'city TBD'}, ${d.job}, income ${inr(d.income)}/mo`} cta="Get loan offers" />
    </div>
  );
}

export function CardCatalogue() {
  const banks = [...new Set(CREDIT_CARDS.map((c) => c.bank))].sort();
  const [tag, setTag] = useState('');
  const [bank, setBank] = useState<string[]>([]);
  const [apply, setApply] = useState<string | null>(null);
  const cards = CREDIT_CARDS.filter((c) => (!tag || c.tags.includes(tag)) && (!bank.length || bank.includes(c.bank)));
  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <aside className="space-y-5">
        <div><p className="mb-2 text-xs font-semibold uppercase text-slate-500">Category</p><div className="flex flex-wrap gap-2 lg:flex-col lg:items-start">{['', ...CARD_TAGS].map((t) => <button key={t || 'all'} type="button" aria-pressed={tag === t} onClick={() => setTag(t)} className={`rounded-full px-3 py-1 text-sm font-semibold ${tag === t ? 'bg-brand-900 text-white' : 'bg-white ring-1 ring-neutral-200'}`}>{t || 'All cards'}</button>)}</div></div>
        <div><p className="mb-2 text-xs font-semibold uppercase text-slate-500">Bank</p>{banks.map((b) => <label key={b} className="flex items-center gap-2 py-0.5 text-sm"><input type="checkbox" className="accent-brand-900" checked={bank.includes(b)} onChange={(e) => setBank(e.target.checked ? [...bank, b] : bank.filter((x) => x !== b))} />{b}</label>)}</div>
      </aside>
      <div className="space-y-3">
        <p className="text-sm text-slate-600">{cards.length} cards</p>
        {cards.map((c) => (
          <article key={c.name} className="rounded-xl border border-neutral-200 bg-white p-4">
            <div className="flex flex-wrap items-start gap-4">
              <div className="grid h-16 w-24 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-brand-900 to-brand-700 text-[10px] font-bold text-accent-400">{c.bank}</div>
              <div className="flex-1"><p className="font-bold text-brand-900">{c.name}</p><div className="mt-1 flex flex-wrap gap-1">{c.tags.map((t) => <span key={t} className="pill text-xs">{t}</span>)}</div><ul className="mt-2 space-y-0.5 text-sm text-slate-600">{c.perks.map((p) => <li key={p}>✓ {p}</li>)}</ul></div>
              <div className="text-sm"><p>Joining: <b>{c.joining ? inr(c.joining) : 'Nil'}</b></p><p>Annual: <b>{c.annual ? inr(c.annual) : 'Nil'}</b></p><button type="button" className="btn-primary mt-2 py-2" onClick={() => setApply(apply === c.name ? null : c.name)}>Apply now</button></div>
            </div>
            {apply === c.name && <div className="mt-4 border-t border-neutral-100 pt-4"><ServiceLead service="Credit card" summary={`${c.name} (${c.bank})`} cta="Request a call to apply" note="Approval depends on the bank’s eligibility rules — usually 18+, income from ₹1.5–5 lakh a year and a credit score above 750." /></div>}
          </article>
        ))}
      </div>
    </div>
  );
}

const BANDS = [
  { min: 750, label: 'Excellent', chance: 'Very high approval chance', color: '#059669' },
  { min: 700, label: 'Good', chance: 'High approval chance', color: '#16a34a' },
  { min: 650, label: 'Fair', chance: 'Moderate — expect higher rates', color: '#ca8a04' },
  { min: 600, label: 'Below average', chance: 'Low — work on improving it', color: '#ea580c' },
  { min: 300, label: 'Poor', chance: 'Very low', color: '#dc2626' },
];
export const bandFor = (s: number) => BANDS.find((b) => s >= b.min) ?? BANDS[BANDS.length - 1];

/** Self-assessed score estimate from the main factors, plus a request for the full bureau report. */
export function CreditScoreCheck() {
  const [f, setF] = useState({ late: 'none', util: 30, age: 5, enquiries: 1, mix: true });
  // Our own heuristic: start at 600 and adjust by factor; bureau weights ≈ payment 35%, utilisation 30%, age/mix 25%, enquiries 10%.
  const pay = { none: 120, one: 60, few: 0, many: -80 }[f.late as 'none'];
  const util = f.util <= 10 ? 90 : f.util <= 30 ? 70 : f.util <= 50 ? 30 : f.util <= 75 ? 0 : -40;
  const age = Math.min(60, f.age * 8);
  const enq = f.enquiries <= 1 ? 30 : f.enquiries <= 3 ? 10 : -20;
  const score = Math.max(300, Math.min(900, 600 + pay + util + age + enq + (f.mix ? 20 : 0) - 100));
  const b = bandFor(score);
  const angle = ((score - 300) / 600) * 180;
  const tips = [
    f.late !== 'none' && 'Pay every EMI and card bill on time — set up auto-debit. Payment history has the biggest impact.',
    f.util > 30 && 'Keep card usage below 30% of your limit; pay down balances or ask for a higher limit.',
    f.enquiries > 2 && 'Avoid applying for several loans or cards within a few months — each hard enquiry lowers your score.',
    !f.mix && 'A healthy mix of secured (home, car) and unsecured (card) credit helps over time.',
    f.age < 3 && 'Keep your oldest card open; a longer credit history improves your score.',
  ].filter(Boolean) as string[];
  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <h3 className="font-bold">Estimate your score in 30 seconds</h3>
          <L label="Late payments in the last 2 years"><select className="input" value={f.late} onChange={(e) => setF({ ...f, late: e.target.value })}><option value="none">None</option><option value="one">One</option><option value="few">2–3</option><option value="many">More than 3 / any default</option></select></L>
          <L label={`Credit card usage: ${f.util}% of limit`}><input type="range" min={0} max={100} value={f.util} onChange={(e) => setF({ ...f, util: Number(e.target.value) })} className="w-full accent-brand-900" /></L>
          <L label="Age of oldest loan or card (years)"><input type="number" className="input" min={0} max={40} value={f.age} onChange={(e) => setF({ ...f, age: Number(e.target.value) })} /></L>
          <L label="Loan / card applications in the last 6 months"><input type="number" className="input" min={0} max={20} value={f.enquiries} onChange={(e) => setF({ ...f, enquiries: Number(e.target.value) })} /></L>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-brand-900" checked={f.mix} onChange={(e) => setF({ ...f, mix: e.target.checked })} />I have both a loan and a credit card</label>
        </div>
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-brand-50 p-6">
          <svg viewBox="0 0 200 120" className="w-64" role="img" aria-label={`Estimated score ${score}, ${b.label}`}>
            {BANDS.slice().reverse().map((x, i, arr) => { const from = ((x.min - 300) / 600) * 180, to = i < arr.length - 1 ? ((arr[i + 1].min - 300) / 600) * 180 : 180; const p = (a: number, r: number) => `${100 - r * Math.cos((a * Math.PI) / 180)},${105 - r * Math.sin((a * Math.PI) / 180)}`; return <path key={x.label} d={`M${p(from, 90)} A90 90 0 0 1 ${p(to, 90)} L${p(to, 70)} A70 70 0 0 0 ${p(from, 70)}Z`} fill={x.color} opacity=".85" />; })}
            <line x1="100" y1="105" x2={100 - 80 * Math.cos((angle * Math.PI) / 180)} y2={105 - 80 * Math.sin((angle * Math.PI) / 180)} stroke="#1c1a17" strokeWidth="4" strokeLinecap="round" /><circle cx="100" cy="105" r="6" fill="#1c1a17" />
          </svg>
          <p className="text-4xl font-extrabold" style={{ color: b.color }}>{score}</p>
          <p className="font-semibold">{b.label} · <span className="text-slate-600">{b.chance}</span></p>
          {tips.length > 0 && <ul className="mt-2 w-full list-disc space-y-1 pl-5 text-sm text-slate-700">{tips.map((t) => <li key={t}>{t}</li>)}</ul>}
          <p className="text-xs text-slate-500">An estimate from your answers — not your actual bureau score.</p>
        </div>
      </div>
      <div className="rounded-2xl border border-neutral-200 p-5">
        <h3 className="font-bold">Get your full credit report free</h3>
        <p className="mb-3 text-sm text-slate-600">We’ll help you fetch your official report from a credit bureau and explain it — including loan offers you’re likely to get. Your details are used only with your consent.</p>
        <ServiceLead service="Credit report" summary={`estimated score ${score} (${b.label})`} cta="Request my free credit report" note="By continuing you consent to InspiState contacting you to obtain your credit information from a credit bureau on your behalf." />
      </div>
    </div>
  );
}
