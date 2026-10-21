import { useMemo, useState } from 'react';
import { emi } from './EmiCalculator';
import { formatPrice } from '../../lib/format';
import { HOME_LOAN_LENDERS, LIMITS, LOAN_KINDS, NEW_REGIME, OLD_REGIME, slabTax, type Lender, type LenderType, type LoanKind } from '../../data/loans';

// Loan calculators. See docs/functions/{emi-calculator,balance-transfer,prepayment,tax-benefit,loan-eligibility,home-loan-rates}/desc.md.
const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

/** Indian-system words for a rupee amount, e.g. "Twelve Lakh Fifty Thousand". */
export function inWords(n: number): string {
  n = Math.round(n);
  if (n === 0) return 'Zero';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const t = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const two = (x: number) => (x < 20 ? a[x] : `${t[Math.floor(x / 10)]}${x % 10 ? ' ' + a[x % 10] : ''}`);
  const parts: string[] = [];
  const units: [number, string][] = [[1e7, 'Crore'], [1e5, 'Lakh'], [1e3, 'Thousand'], [100, 'Hundred']];
  for (const [v, w] of units) { const q = Math.floor(n / v); if (q) { parts.push(`${q >= 100 ? inWords(q) : two(q)} ${w}`); n %= v; } }
  if (n) parts.push(two(n));
  return parts.join(' ');
}

/** Outstanding principal after k EMIs. */
export function outstanding(P: number, ratePct: number, months: number, k: number) {
  const i = ratePct / 1200, E = emi(P, ratePct, months / 12);
  if (i === 0) return Math.max(0, P - E * k);
  return Math.max(0, P * (1 + i) ** k - (E * ((1 + i) ** k - 1)) / i);
}
/** Months needed to repay O at EMI E. */
export function monthsToRepay(O: number, ratePct: number, E: number) {
  const i = ratePct / 1200;
  if (O <= 0) return 0;
  if (i === 0) return Math.ceil(O / E);
  if (E <= O * i) return Infinity;
  return Math.ceil(-Math.log(1 - (i * O) / E) / Math.log(1 + i));
}

function Field({ label, value, set, min, max, step, fmt, suffix }: { label: string; value: number; set: (n: number) => void; min: number; max: number; step: number; fmt?: (n: number) => string; suffix?: string }) {
  const clamp = (n: number) => Math.min(max, Math.max(min, Number.isFinite(n) ? n : min));
  return (
    <div className="text-sm">
      <div className="mb-1 flex items-center justify-between gap-3">
        <label className="font-medium text-slate-600">{label}</label>
        <span className="flex items-center gap-1"><input type="number" className="input w-36 py-1.5 text-right font-semibold" value={value} min={min} max={max} step={step} onChange={(e) => set(Number(e.target.value))} onBlur={(e) => set(clamp(Number(e.target.value)))} aria-label={label} />{suffix && <span className="text-slate-500">{suffix}</span>}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={clamp(value)} onChange={(e) => set(Number(e.target.value))} className="w-full accent-brand-900" aria-label={`${label} slider`} />
      <div className="flex justify-between text-xs text-slate-400"><span>{fmt ? fmt(min) : min}</span><span>{fmt ? fmt(max) : max}</span></div>
    </div>
  );
}

function HalfDonut({ parts }: { parts: { label: string; value: number; color: string }[] }) {
  const total = parts.reduce((s, p) => s + Math.max(0, p.value), 0) || 1;
  let acc = 0;
  const arcs = parts.map((p) => { const a0 = Math.PI * (acc / total); acc += Math.max(0, p.value); const a1 = Math.PI * (acc / total); return { ...p, a0, a1 }; });
  const pt = (a: number, r: number) => `${100 - r * Math.cos(a)},${100 - r * Math.sin(a)}`;
  return (
    <svg viewBox="0 0 200 110" className="w-full max-w-xs" role="img" aria-label={parts.map((p) => `${p.label} ${formatPrice(p.value)}`).join(', ')}>
      {arcs.map((p) => p.a1 > p.a0 && <path key={p.label} d={`M${pt(p.a0, 90)} A90 90 0 0 1 ${pt(p.a1, 90)} L${pt(p.a1, 58)} A58 58 0 0 0 ${pt(p.a0, 58)} Z`} fill={p.color} />)}
    </svg>
  );
}
function Legend({ rows }: { rows: { label: string; value: string; color?: string; big?: boolean }[] }) {
  return <dl className="w-full space-y-2 text-sm">{rows.map((r) => <div key={r.label} className="flex items-center justify-between gap-3"><dt className="flex items-center gap-2 text-slate-600">{r.color && <i className="h-2.5 w-2.5 rounded-full" style={{ background: r.color }} />}{r.label}</dt><dd className={r.big ? 'text-lg font-extrabold text-brand-900' : 'font-bold'}>{r.value}</dd></div>)}</dl>;
}
function Headline({ label, value }: { label: string; value: number }) {
  return <div className="text-center"><p className="text-sm text-slate-500">{label}</p><p className="text-3xl font-extrabold text-brand-900">{inr(value)}</p><p className="text-xs text-slate-500">{inWords(value)} Rupees</p></div>;
}
const P_COLOR = '#1c1a17', I_COLOR = '#c9a576', S_COLOR = '#10b981';

export function LoanTabs({ active }: { active: string }) {
  const tabs = [['emi-calculator', 'EMI'], ['loan-eligibility', 'Eligibility'], ['balance-transfer', 'Balance transfer'], ['prepayment', 'Prepayment'], ['tax-benefit', 'Tax benefit']];
  return <nav className="mb-6 flex flex-wrap gap-2" aria-label="Home loan calculators">{tabs.map(([s, l]) => <a key={s} href={`/tools/${s}`} aria-current={active === s ? 'page' : undefined} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${active === s ? 'bg-brand-900 text-white' : 'bg-white ring-1 ring-neutral-200 hover:ring-brand-300'}`}>{l}</a>)}<a href="/home-loan-interest-rates" className="rounded-full px-4 py-1.5 text-sm font-semibold text-brand-700 hover:underline">Interest rates →</a></nav>;
}

// ---------- EMI with schedule ----------
export function LoanEmi({ kind: initial = 'home' }: { kind?: LoanKind }) {
  const [kind, setKind] = useState<LoanKind>(initial);
  const k = LOAN_KINDS[kind];
  const [amount, setAmount] = useState<number>(k.amount[2]);
  const [rate, setRate] = useState<number>(k.rate[2]);
  const [years, setYears] = useState<number>(k.years[2]);
  const [feePct, setFeePct] = useState(0);
  const [openYear, setOpenYear] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const switchKind = (x: LoanKind) => { setKind(x); setAmount(LOAN_KINDS[x].amount[2]); setRate(LOAN_KINDS[x].rate[2]); setYears(LOAN_KINDS[x].years[2]); };
  const m = emi(amount, rate, years);
  const total = m * years * 12, interest = total - amount, fee = (amount * feePct) / 100;
  const schedule = useMemo(() => {
    const rows: { year: number; principal: number; interest: number; balance: number; months: { m: number; principal: number; interest: number; balance: number }[] }[] = [];
    let bal = amount; const i = rate / 1200; const start = new Date();
    for (let y = 0; y < years; y++) {
      const months = [];
      for (let mo = 0; mo < 12; mo++) { const int = bal * i; const pr = Math.min(bal, m - int); bal = Math.max(0, bal - pr); months.push({ m: mo, principal: pr, interest: int, balance: bal }); }
      rows.push({ year: start.getFullYear() + y, principal: months.reduce((s, x) => s + x.principal, 0), interest: months.reduce((s, x) => s + x.interest, 0), balance: bal, months });
    }
    return rows;
  }, [amount, rate, years, m]);
  const monthName = (mo: number) => new Date(2000, (new Date().getMonth() + mo) % 12, 1).toLocaleString('en-IN', { month: 'short' });
  return (
    <div className="space-y-8">
      <div role="radiogroup" aria-label="Loan type" className="flex flex-wrap gap-2">{(Object.keys(LOAN_KINDS) as LoanKind[]).map((x) => <button key={x} role="radio" aria-checked={kind === x} onClick={() => switchKind(x)} className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${kind === x ? 'border-brand-900 bg-brand-900 text-white' : 'border-neutral-200'}`}>{LOAN_KINDS[x].label}</button>)}</div>
      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-5">
          <Field label="Loan amount (₹)" value={amount} set={setAmount} min={k.amount[0]} max={k.amount[1]} step={10000} fmt={formatPrice} />
          <Field label="Interest rate" value={rate} set={setRate} min={k.rate[0]} max={k.rate[1]} step={0.05} suffix="%" />
          <Field label="Tenure" value={years} set={setYears} min={k.years[0]} max={k.years[1]} step={1} suffix="yrs" />
          <Field label="Processing fee (optional)" value={feePct} set={setFeePct} min={0} max={3} step={0.05} suffix="%" />
        </div>
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-brand-50 p-6">
          <Headline label="Monthly EMI" value={m} />
          <HalfDonut parts={[{ label: 'Principal', value: amount, color: P_COLOR }, { label: 'Interest', value: interest, color: I_COLOR }, ...(fee ? [{ label: 'Fee', value: fee, color: S_COLOR }] : [])]} />
          <Legend rows={[{ label: 'Principal amount', value: inr(amount), color: P_COLOR }, { label: 'Interest payable', value: inr(interest), color: I_COLOR }, ...(fee ? [{ label: 'Processing fee', value: inr(fee), color: S_COLOR }] : []), { label: 'Total amount payable', value: inr(total + fee), big: true }]} />
        </div>
      </div>
      <div>
        <h3 className="mb-3 text-lg font-bold">EMI payment schedule</h3>
        <div className="overflow-x-auto rounded-xl border border-neutral-200">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-3 py-2">Year</th><th>Principal</th><th>Interest</th><th>Total paid</th><th>Balance</th><th /></tr></thead>
            {schedule.slice(0, showAll ? undefined : 5).map((y, idx) => (
              <tbody key={y.year} className="divide-y divide-neutral-100">
                <tr className="border-t border-neutral-100"><td className="px-3 py-2 font-semibold">{y.year}</td><td>{inr(y.principal)}</td><td>{inr(y.interest)}</td><td>{inr(y.principal + y.interest)}</td><td>{inr(y.balance)}</td><td className="pr-3 text-right"><button type="button" className="text-xs font-semibold text-brand-700 hover:underline" onClick={() => setOpenYear(openYear === idx ? null : idx)}>{openYear === idx ? 'Hide' : 'Monthly'}</button></td></tr>
                {openYear === idx && y.months.map((x) => <tr key={x.m} className="bg-neutral-50/60 text-slate-600"><td className="px-3 py-1.5 pl-6">{monthName(x.m)}</td><td>{inr(x.principal)}</td><td>{inr(x.interest)}</td><td>{inr(x.principal + x.interest)}</td><td>{inr(x.balance)}</td><td /></tr>)}
              </tbody>
            ))}
          </table>
        </div>
        {schedule.length > 5 && <button type="button" className="btn-ghost mt-3" onClick={() => setShowAll(!showAll)}>{showAll ? 'Show less' : `Show all ${schedule.length} years`}</button>}
      </div>
    </div>
  );
}

// ---------- Balance transfer ----------
export function BalanceTransfer() {
  const [amount, setAmount] = useState(5000000);
  const [years, setYears] = useState(20);
  const [rate, setRate] = useState(9);
  const [newRate, setNewRate] = useState(8);
  const [paid, setPaid] = useState(36);
  const [feePct, setFeePct] = useState(0.5);
  const n = years * 12, k = Math.min(paid, n - 1), left = n - k;
  const r2 = Math.min(newRate, rate);
  const E1 = emi(amount, rate, years);
  const O = outstanding(amount, rate, n, k);
  const E2 = emi(O, r2, left / 12);
  const gross = (E1 - E2) * left;
  const fee = Math.min((O * feePct) / 100, 1e7);
  const net = gross - fee;
  const breakeven = E1 > E2 ? Math.ceil(fee / (E1 - E2)) : null;
  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="space-y-5">
        <Field label="Original loan amount (₹)" value={amount} set={setAmount} min={500000} max={200000000} step={10000} fmt={formatPrice} />
        <Field label="Original tenure" value={years} set={setYears} min={5} max={30} step={1} suffix="yrs" />
        <Field label="Current interest rate" value={rate} set={(v) => { setRate(v); if (newRate > v) setNewRate(v); }} min={6} max={20} step={0.05} suffix="%" />
        <Field label="New lender's rate" value={r2} set={setNewRate} min={6} max={rate} step={0.05} suffix="%" />
        <Field label="EMIs already paid" value={k} set={setPaid} min={0} max={n - 1} step={1} />
        <Field label="Processing fee at new lender" value={feePct} set={setFeePct} min={0} max={2} step={0.05} suffix="%" />
      </div>
      <div className="flex flex-col items-center gap-4 rounded-2xl bg-brand-50 p-6">
        <Headline label="Net savings after fees" value={Math.max(0, net)} />
        <HalfDonut parts={[{ label: 'Current EMI', value: E1, color: P_COLOR }, { label: 'Revised EMI', value: E2, color: S_COLOR }]} />
        <Legend rows={[{ label: 'Outstanding principal', value: inr(O) }, { label: 'Current EMI', value: inr(E1), color: P_COLOR }, { label: 'Revised EMI', value: inr(E2), color: S_COLOR }, { label: `Interest saved over ${left} months`, value: inr(gross) }, { label: 'Processing fee', value: `− ${inr(fee)}` }, { label: 'Net savings', value: inr(net), big: true }]} />
        <p className="text-center text-sm text-slate-600">{net > 0 ? `The fee is recovered in ${breakeven} months. Switching makes sense if you keep the loan longer than that.` : 'At these rates the fees outweigh the savings — negotiate a lower rate with your current lender instead.'}</p>
        <a href="/home-loan-interest-rates" className="btn-primary">Compare lender rates</a>
      </div>
    </div>
  );
}

// ---------- Prepayment ----------
export function Prepayment() {
  const [amount, setAmount] = useState(5000000);
  const [years, setYears] = useState(20);
  const [rate, setRate] = useState(8.5);
  const [paid, setPaid] = useState(24);
  const [pre, setPre] = useState(500000);
  const [mode, setMode] = useState<'tenure' | 'emi'>('tenure');
  const n = years * 12, k = Math.min(paid, n - 1), left = n - k;
  const E1 = emi(amount, rate, years);
  const O = outstanding(amount, rate, n, k);
  const p = Math.min(pre, O);
  const O2 = O - p;
  const E2 = mode === 'emi' ? emi(O2, rate, left / 12) : E1;
  const months2 = mode === 'tenure' ? monthsToRepay(O2, rate, E1) : left;
  const interestBefore = E1 * left - O;
  const interestAfter = E2 * months2 - O2;
  const saved = Math.max(0, interestBefore - interestAfter);
  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="space-y-5">
        <Field label="Loan amount (₹)" value={amount} set={setAmount} min={500000} max={200000000} step={10000} fmt={formatPrice} />
        <Field label="Original tenure" value={years} set={setYears} min={5} max={30} step={1} suffix="yrs" />
        <Field label="Interest rate" value={rate} set={setRate} min={6} max={20} step={0.05} suffix="%" />
        <Field label="EMIs already paid" value={k} set={setPaid} min={0} max={n - 1} step={1} />
        <Field label="Prepayment amount (₹)" value={p} set={setPre} min={1000} max={Math.max(1000, Math.floor(O))} step={1000} fmt={formatPrice} />
        <div className="grid grid-cols-2 gap-2 text-sm">{(['tenure', 'emi'] as const).map((x) => <button key={x} type="button" aria-pressed={mode === x} onClick={() => setMode(x)} className={`rounded-lg border px-3 py-2 font-semibold ${mode === x ? 'border-brand-900 bg-brand-900 text-white' : 'border-neutral-200'}`}>{x === 'tenure' ? 'Reduce tenure' : 'Reduce EMI'}</button>)}</div>
      </div>
      <div className="flex flex-col items-center gap-4 rounded-2xl bg-brand-50 p-6">
        <Headline label="Interest you save" value={saved} />
        <HalfDonut parts={[{ label: 'Interest still payable', value: interestAfter, color: I_COLOR }, { label: 'Interest saved', value: saved, color: S_COLOR }]} />
        <Legend rows={[{ label: 'Outstanding before prepayment', value: inr(O) }, { label: 'Original EMI', value: inr(E1) }, { label: 'Revised EMI', value: inr(E2), big: mode === 'emi' }, { label: 'Remaining tenure', value: `${left} → ${months2} months`, big: mode === 'tenure' }, { label: 'Interest saved', value: inr(saved), color: S_COLOR }]} />
        <p className="text-center text-xs text-slate-500">Floating-rate home loans to individuals carry no prepayment charges. Reducing tenure usually saves more interest than reducing EMI.</p>
      </div>
    </div>
  );
}

// ---------- Tax benefit ----------
type Owner = { income: number; share: number };
function ownerTax(o: Owner, interest: number, principal: number, opts: { letOut: boolean; rent: number; late: boolean; eea: boolean; other80c: number }) {
  const sh = o.share / 100, intShare = interest * sh, prShare = principal * sh;
  const oldBase = Math.max(0, o.income - OLD_REGIME.std);
  const without = slabTax(Math.max(0, oldBase - Math.min(LIMITS.sec80c, opts.other80c)), OLD_REGIME);
  // House property: self-occupied interest deductible up to the cap; let-out = 70% of rent − interest, loss set-off capped.
  let hp: number;
  if (opts.letOut) hp = Math.max(-LIMITS.hpLossSetOff, opts.rent * sh * 0.7 - intShare);
  else hp = -Math.min(intShare, opts.late ? LIMITS.sec24bLate : LIMITS.sec24bSelf);
  const sec80c = Math.min(LIMITS.sec80c, opts.other80c + prShare);
  const eea = opts.eea && !opts.letOut ? Math.min(LIMITS.sec80eea, Math.max(0, intShare - LIMITS.sec24bSelf)) : 0;
  const withLoan = slabTax(Math.max(0, oldBase + hp - sec80c - eea), OLD_REGIME);
  // New regime: no deduction for a self-occupied home; let-out interest only against that rent (no loss set-off).
  const newHp = opts.letOut ? Math.max(0, opts.rent * sh * 0.7 - intShare) : 0;
  const newTax = slabTax(Math.max(0, o.income - NEW_REGIME.std + newHp), NEW_REGIME);
  return { without, withLoan, saved: without - withLoan, newTax, deductions: { hp: -Math.min(0, hp), sec80c: sec80c - Math.min(LIMITS.sec80c, opts.other80c), eea } };
}
export function TaxBenefit() {
  const [interest, setInterest] = useState(350000);
  const [principal, setPrincipal] = useState(120000);
  const [joint, setJoint] = useState(false);
  const [owners, setOwners] = useState<Owner[]>([{ income: 1800000, share: 100 }, { income: 1200000, share: 50 }]);
  const [other80c, setOther80c] = useState(50000);
  const [letOut, setLetOut] = useState(false);
  const [rent, setRent] = useState(300000);
  const [late, setLate] = useState(false);
  const [eea, setEea] = useState(false);
  const list = joint ? [{ ...owners[0], share: 100 - owners[1].share }, owners[1]] : [{ ...owners[0], share: 100 }];
  const res = list.map((o) => ownerTax(o, interest, principal, { letOut, rent, late, eea, other80c }));
  const saved = res.reduce((s, r) => s + r.saved, 0);
  const oldTotal = res.reduce((s, r) => s + r.withLoan, 0), newTotal = res.reduce((s, r) => s + r.newTax, 0);
  const setOwner = (i: number, p: Partial<Owner>) => setOwners(owners.map((o, j) => (j === i ? { ...o, ...p } : o)));
  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="space-y-5">
        <Field label="Interest paid this year (₹)" value={interest} set={setInterest} min={0} max={5000000} step={5000} fmt={formatPrice} />
        <Field label="Principal repaid this year (₹)" value={principal} set={setPrincipal} min={0} max={2000000} step={5000} fmt={formatPrice} />
        <Field label="Other 80C investments (PF, ELSS, LIC)" value={other80c} set={setOther80c} min={0} max={150000} step={5000} fmt={formatPrice} />
        <div className="grid grid-cols-2 gap-2 text-sm">{[['Self-occupied', false], ['Let out', true]].map(([l, v]) => <button key={String(l)} type="button" aria-pressed={letOut === v} onClick={() => setLetOut(v as boolean)} className={`rounded-lg border px-3 py-2 font-semibold ${letOut === v ? 'border-brand-900 bg-brand-900 text-white' : 'border-neutral-200'}`}>{l as string}</button>)}</div>
        {letOut ? <Field label="Annual rent received (₹)" value={rent} set={setRent} min={0} max={5000000} step={5000} fmt={formatPrice} /> : (
          <div className="space-y-2 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" className="accent-brand-900" checked={late} onChange={(e) => setLate(e.target.checked)} />Construction not completed within 5 years of the loan (interest cap ₹30,000)</label>
            <label className="flex items-center gap-2"><input type="checkbox" className="accent-brand-900" checked={eea} onChange={(e) => setEea(e.target.checked)} />Affordable home loan sanctioned Apr 2019 – Mar 2022 (Sec 80EEA, extra ₹1.5 L)</label>
          </div>
        )}
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" className="accent-brand-900" checked={joint} onChange={(e) => setJoint(e.target.checked)} />Joint loan with a co-owner</label>
        <div className={`grid gap-3 ${joint ? 'sm:grid-cols-2' : ''}`}>
          {list.map((o, i) => (
            <div key={i} className="space-y-3 rounded-xl border border-neutral-200 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">{i === 0 ? 'You' : 'Co-owner'}{joint && ` · ${o.share}% share`}</p>
              <Field label="Gross annual income (₹)" value={owners[i].income} set={(v) => setOwner(i, { income: v })} min={0} max={50000000} step={10000} fmt={formatPrice} />
              {joint && i === 1 && <Field label="Co-owner's share" value={owners[1].share} set={(v) => setOwner(1, { share: v })} min={0} max={100} step={5} suffix="%" />}
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-4 rounded-2xl bg-brand-50 p-6">
        <Headline label="Tax saved with the home loan (old regime)" value={saved} />
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-slate-500"><tr><th className="py-1" />{list.map((_, i) => <th key={i}>{i === 0 ? 'You' : 'Co-owner'}</th>)}</tr></thead>
          <tbody className="divide-y divide-brand-100">
            <tr><td className="py-1.5">House property deduction</td>{res.map((r, i) => <td key={i}>{inr(r.deductions.hp)}</td>)}</tr>
            <tr><td className="py-1.5">80C from principal</td>{res.map((r, i) => <td key={i}>{inr(r.deductions.sec80c)}</td>)}</tr>
            {eea && <tr><td className="py-1.5">80EEA</td>{res.map((r, i) => <td key={i}>{inr(r.deductions.eea)}</td>)}</tr>}
            <tr><td className="py-1.5">Tax without loan</td>{res.map((r, i) => <td key={i}>{inr(r.without)}</td>)}</tr>
            <tr><td className="py-1.5">Tax with loan (old)</td>{res.map((r, i) => <td key={i} className="font-semibold">{inr(r.withLoan)}</td>)}</tr>
            <tr><td className="py-1.5">Tax under new regime</td>{res.map((r, i) => <td key={i}>{inr(r.newTax)}</td>)}</tr>
          </tbody>
        </table></div>
        <p className={`rounded-lg p-3 text-sm font-semibold ${oldTotal < newTotal ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'}`}>{oldTotal < newTotal ? `The old regime with home loan deductions is better by ${inr(newTotal - oldTotal)} a year.` : `The new regime is still better by ${inr(oldTotal - newTotal)} a year, even with the home loan.`}</p>
        <p className="text-xs text-slate-500">FY 2025-26 slabs for individuals below 60; includes standard deduction, Sec 87A rebate and 4% cess; surcharge not modelled. Each co-owner who is also a co-borrower claims limits separately. Indicative — confirm with a tax adviser.</p>
      </div>
    </div>
  );
}

// ---------- Eligibility ----------
export function Eligibility() {
  const [income, setIncome] = useState(120000);
  const [emis, setEmis] = useState(0);
  const [coIncome, setCoIncome] = useState(0);
  const [coEmis, setCoEmis] = useState(0);
  const [age, setAge] = useState(32);
  const [coAge, setCoAge] = useState(30);
  const [job, setJob] = useState<'salaried' | 'self'>('salaried');
  const [cibil, setCibil] = useState<'750+' | '700-749' | '650-699' | 'below'>('750+');
  const [co, setCo] = useState(false);
  const retire = job === 'salaried' ? 60 : 65;
  const oldest = co ? Math.max(age, coAge) : age;
  const tenure = Math.max(0, Math.min(30, retire - oldest));
  const total = income + (co ? coIncome : 0), obligations = emis + (co ? coEmis : 0);
  const foir = (total >= 150000 ? 0.6 : total >= 75000 ? 0.55 : total >= 40000 ? 0.5 : 0.45) - (job === 'self' ? 0.05 : 0);
  const rateAdj = { '750+': 0, '700-749': 0.25, '650-699': 0.75, below: 1.5 }[cibil];
  const maxEmi = Math.max(0, total * foir - obligations);
  const offers = HOME_LOAN_LENDERS.filter((l) => l.min < 9).slice().sort((a, b) => a.min - b.min).slice(0, 4).map((l) => {
    const r = l.min + rateAdj;
    const loan = tenure ? (maxEmi / emi(100000, r, tenure)) * 100000 : 0;
    return { l, r, loan };
  });
  const best = offers[0];
  const propertyFor = (l: number) => (l <= 3_000_000 ? l / 0.9 : l <= 7_500_000 ? l / 0.8 : l / 0.75);
  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-2 text-sm">{(['salaried', 'self'] as const).map((x) => <button key={x} type="button" aria-pressed={job === x} onClick={() => setJob(x)} className={`rounded-lg border px-3 py-2 font-semibold ${job === x ? 'border-brand-900 bg-brand-900 text-white' : 'border-neutral-200'}`}>{x === 'salaried' ? 'Salaried' : 'Self-employed'}</button>)}</div>
        <Field label="Net monthly income (₹)" value={income} set={setIncome} min={10000} max={5000000} step={5000} fmt={formatPrice} />
        <Field label="Existing EMIs (₹/month)" value={emis} set={setEmis} min={0} max={1000000} step={1000} fmt={formatPrice} />
        <Field label="Your age" value={age} set={setAge} min={21} max={65} step={1} suffix="yrs" />
        <label className="block text-sm"><span className="mb-1 block font-medium text-slate-600">Credit score</span><select className="input" value={cibil} onChange={(e) => setCibil(e.target.value as typeof cibil)}><option value="750+">750 and above</option><option value="700-749">700–749</option><option value="650-699">650–699</option><option value="below">Below 650 / no history</option></select></label>
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" className="accent-brand-900" checked={co} onChange={(e) => setCo(e.target.checked)} />Add a co-applicant</label>
        {co && <div className="space-y-4 rounded-xl border border-neutral-200 p-3"><Field label="Co-applicant net monthly income" value={coIncome} set={setCoIncome} min={0} max={5000000} step={5000} fmt={formatPrice} /><Field label="Co-applicant EMIs" value={coEmis} set={setCoEmis} min={0} max={1000000} step={1000} fmt={formatPrice} /><Field label="Co-applicant age" value={coAge} set={setCoAge} min={21} max={65} step={1} suffix="yrs" /></div>}
      </div>
      <div className="flex flex-col gap-4 rounded-2xl bg-brand-50 p-6">
        {tenure < 5 ? <p className="rounded-lg bg-amber-100 p-4 text-sm text-amber-900">Lenders usually need at least 5 years before retirement ({retire}). Add a younger co-applicant to get a longer tenure.</p> : <>
          <Headline label="You may be eligible for up to" value={best?.loan ?? 0} />
          <Legend rows={[{ label: 'Max EMI lenders allow', value: inr(maxEmi) }, { label: `FOIR (share of income for EMIs)`, value: `${Math.round(foir * 100)}%` }, { label: 'Max tenure', value: `${tenure} years` }, { label: 'Property value this supports', value: formatPrice(propertyFor(best?.loan ?? 0)) }]} />
          <div className="space-y-2">{offers.map(({ l, r, loan }) => <div key={l.slug} className="flex items-center justify-between rounded-xl bg-white p-3 text-sm"><div><p className="font-semibold">{l.name}</p><p className="text-xs text-slate-500">from {r.toFixed(2)}% · EMI {inr(maxEmi)}</p></div><p className="font-bold text-brand-900">{formatPrice(loan)}</p></div>)}</div>
        </>}
        <a href="/services/home-loans" className="btn-primary text-center">Get loan offers</a>
        <p className="text-xs text-slate-500">Indicative. Lenders set FOIR (40–60%), maximum age ({retire} for {job === 'salaried' ? 'salaried' : 'self-employed'} applicants) and LTV caps (90/80/75%) individually.</p>
      </div>
    </div>
  );
}

// ---------- Rate table ----------
export function RateTable({ lenders = HOME_LOAN_LENDERS, product = 'Home Loan', perLakhYears = 20 }: { lenders?: Lender[]; product?: string; perLakhYears?: number }) {
  const types = [...new Set(lenders.map((l) => l.type))] as LenderType[];
  const [tab, setTab] = useState<LenderType | 'All'>('All');
  const [band, setBand] = useState<'' | 'lt9' | 'gte9'>('');
  const [quick, setQuick] = useState(false);
  const [sort, setSort] = useState<'asc' | 'desc'>('asc');
  const rows = lenders.filter((l) => (tab === 'All' || l.type === tab) && (!band || (band === 'lt9' ? l.min < 9 : l.min >= 9)) && (!quick || l.quick)).sort((a, b) => (sort === 'asc' ? a.min - b.min : b.min - a.min));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" className="flex flex-wrap gap-2">{(['All', ...types] as const).map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${tab === t ? 'bg-brand-900 text-white' : 'bg-white ring-1 ring-neutral-200'}`}>{t}</button>)}</div>
        <span className="flex-1" />
        <select className="input w-auto py-1.5 text-sm" value={band} onChange={(e) => setBand(e.target.value as typeof band)} aria-label="Rate filter"><option value="">Any rate</option><option value="lt9">Starting below 9%</option><option value="gte9">Starting 9% or more</option></select>
        <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" className="accent-brand-900" checked={quick} onChange={(e) => setQuick(e.target.checked)} />Quick approval</label>
        <select className="input w-auto py-1.5 text-sm" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Sort"><option value="asc">Rate: low to high</option><option value="desc">Rate: high to low</option></select>
      </div>
      <div className="grid gap-3">
        {rows.map((l) => (
          <div key={l.slug} className="grid gap-3 rounded-xl border border-neutral-200 bg-white p-4 sm:grid-cols-[1.4fr_1fr_1fr_1fr_auto] sm:items-center">
            <div><p className="font-bold text-brand-900">{l.name}</p><p className="text-xs text-slate-500">{l.type}{l.quick ? ' · Quick approval' : ''}</p></div>
            <div><p className="text-xs text-slate-500">Interest rate</p><p className="font-semibold">{l.min.toFixed(2)}% – {l.max.toFixed(2)}%</p></div>
            <div><p className="text-xs text-slate-500">EMI per lakh ({perLakhYears} yrs)</p><p className="font-semibold">{inr(emi(100000, l.min, perLakhYears))} – {inr(emi(100000, l.max, perLakhYears))}</p></div>
            <div><p className="text-xs text-slate-500">Processing fee</p><p className="text-sm">{l.fee}</p><p className="text-xs text-slate-500">{l.amount} · {l.tenure}</p></div>
            <a href={`/services/home-loans?lender=${l.slug}`} className="btn-primary py-2 text-center text-sm">Enquire</a>
          </div>
        ))}
        {rows.length === 0 && <p className="panel text-center text-sm text-slate-600">No lenders match these filters.</p>}
      </div>
      <p className="text-xs text-slate-500">{product} rates are indicative as of October 2026 and depend on your credit score, income and loan amount. Prepayment: nil for floating-rate loans to individuals.</p>
    </div>
  );
}
