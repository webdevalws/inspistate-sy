import { useState } from 'react';
import { formatPrice } from '../../lib/format';

export function emi(principal: number, annualRatePct: number, years: number) {
  const r = annualRatePct / 12 / 100;
  const n = years * 12;
  if (r === 0) return principal / n;
  return (principal * r * (1 + r) ** n) / ((1 + r) ** n - 1);
}

const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

export default function EmiCalculator({ price = 7500000 }: { price?: number }) {
  const [amount, setAmount] = useState(Math.round(price * 0.8));
  const [rate, setRate] = useState(8.5);
  const [years, setYears] = useState(20);
  const monthly = emi(amount, rate, years);
  const total = monthly * years * 12;
  const interest = total - amount;
  const interestShare = total ? interest / total : 0;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-5">
        <Slider label="Loan amount" value={amount} display={formatPrice(amount)} min={500000} max={Math.max(50000000, price)} step={100000} onChange={setAmount} />
        <Slider label="Interest rate (p.a.)" value={rate} display={`${rate.toFixed(2)}%`} min={6} max={15} step={0.05} onChange={setRate} />
        <Slider label="Tenure" value={years} display={`${years} years`} min={1} max={30} step={1} onChange={setYears} />
      </div>
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl bg-brand-50 p-6">
        <svg viewBox="0 0 36 36" className="h-32 w-32 -rotate-90" aria-hidden="true">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e5e5" strokeWidth="4" />
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#c9a576" strokeWidth="4" strokeDasharray={`${interestShare * 100} 100`} />
        </svg>
        <div className="text-center">
          <p className="text-sm text-slate-500">Monthly EMI</p>
          <p className="text-3xl font-extrabold text-brand-800">{inr(monthly)}</p>
        </div>
        <dl className="grid w-full grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-white p-3"><dt className="flex items-center gap-1.5 text-slate-500"><i className="h-2.5 w-2.5 rounded-full bg-brand-200" />Principal</dt><dd className="font-bold">{formatPrice(amount)}</dd></div>
          <div className="rounded-xl bg-white p-3"><dt className="flex items-center gap-1.5 text-slate-500"><i className="h-2.5 w-2.5 rounded-full bg-accent-500" />Interest</dt><dd className="font-bold">{formatPrice(interest)}</dd></div>
        </dl>
      </div>
    </div>
  );
}

function Slider(p: { label: string; value: number; display: string; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="flex justify-between text-sm"><span className="font-medium text-slate-600">{p.label}</span><span className="font-bold text-slate-900">{p.display}</span></span>
      <input type="range" min={p.min} max={p.max} step={p.step} value={p.value} onChange={(e) => p.onChange(Number(e.target.value))} className="mt-2 w-full accent-brand-600" />
    </label>
  );
}
