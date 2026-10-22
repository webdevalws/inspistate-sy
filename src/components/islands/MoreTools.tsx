import { useMemo, useState } from 'react';
import { formatPrice } from '../../lib/format';
import { RENT_STAMP_DUTY } from '../../data/services';
import { AgreementOrder, ValuationReportOrder, submitOrder } from './ServiceOrders';

const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-600">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}
function Num({ value, onChange, step = 1, min = 0 }: { value: number; onChange: (n: number) => void; step?: number; min?: number }) {
  return <input type="number" className="input" value={value} step={step} min={min} onChange={(e) => onChange(Number(e.target.value))} />;
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

// ---------- Capital gains ----------
// Cost Inflation Index (base 2001-02 = 100), notified by CBDT.
const CII: Record<number, number> = { 2001: 100, 2002: 105, 2003: 109, 2004: 113, 2005: 117, 2006: 122, 2007: 129, 2008: 137, 2009: 148, 2010: 167, 2011: 184, 2012: 200, 2013: 220, 2014: 240, 2015: 254, 2016: 264, 2017: 272, 2018: 280, 2019: 289, 2020: 301, 2021: 317, 2022: 331, 2023: 348, 2024: 363, 2025: 376 };
const fy = (d: Date) => (d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1);
const cii = (d: Date) => CII[Math.min(2025, Math.max(2001, fy(d)))];

export function CapitalGains() {
  const [buyDate, setBuyDate] = useState('2016-06-15');
  const [sellDate, setSellDate] = useState(new Date().toISOString().slice(0, 10));
  const [cost, setCost] = useState(6_000_000);
  const [improve, setImprove] = useState(0);
  const [sale, setSale] = useState(11_000_000);
  const [expenses, setExpenses] = useState(100_000);
  const [slab, setSlab] = useState(30);
  const [fmv2001, setFmv2001] = useState(0);
  const [resident, setResident] = useState(true);
  const [ex54, setEx54] = useState(0);
  const [ex54ec, setEx54ec] = useState(0);
  const b = new Date(buyDate), s = new Date(sellDate);
  const months = (s.getFullYear() - b.getFullYear()) * 12 + s.getMonth() - b.getMonth();
  const longTerm = months > 24;
  const pre2001 = b < new Date('2001-04-01');
  // For property bought before 1 Apr 2001, cost = higher of actual cost and FMV on 1 Apr 2001 (FMV capped at stamp duty value; not modelled).
  const baseCost = pre2001 ? Math.max(cost, fmv2001) : cost;
  const net = sale - expenses;
  const plainGain = net - baseCost - improve;
  const indexedCost = ((baseCost + improve) * cii(s)) / cii(pre2001 ? new Date('2001-04-01') : b);
  const indexedGain = net - indexedCost;
  // Sec 54 (new home) up to the gain; Sec 54EC bonds capped at ₹50 lakh. Only for long-term gains.
  const exemption = longTerm ? Math.max(0, ex54) + Math.min(5_000_000, Math.max(0, ex54ec)) : 0;
  const cess = 1.04;
  const grandfatherOk = resident && b < new Date('2024-07-23');
  const optA = Math.max(0, plainGain - exemption) * 0.125 * cess;
  const optB = grandfatherOk ? Math.max(0, indexedGain - exemption) * 0.2 * cess : null;
  let tax: number, note: string;
  if (!longTerm) { tax = Math.max(0, plainGain) * (slab / 100) * cess; note = `Short-term gain taxed at your ${slab}% slab`; }
  else {
    tax = optB === null ? optA : Math.min(optA, optB);
    note = optB !== null && optB < optA ? 'Long-term: 20% with indexation is lower for you' : 'Long-term: 12.5% without indexation';
    if (!resident && b < new Date('2024-07-23')) note += ' (the indexation option is only for resident individuals and HUFs)';
  }
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Purchase date"><input type="date" className="input" value={buyDate} onChange={(e) => setBuyDate(e.target.value)} /></Field>
        <Field label="Sale date"><input type="date" className="input" value={sellDate} onChange={(e) => setSellDate(e.target.value)} /></Field>
        <Field label="Purchase cost incl. stamp duty (₹)"><Num value={cost} onChange={setCost} step={100000} /></Field>
        {pre2001 && <Field label="Fair market value on 1 Apr 2001 (₹)" hint="Bought before 2001: the higher of cost and this value is used"><Num value={fmv2001} onChange={setFmv2001} step={100000} /></Field>}
        <Field label="Improvement cost (₹)"><Num value={improve} onChange={setImprove} step={10000} /></Field>
        <Field label="Sale price (₹)"><Num value={sale} onChange={setSale} step={100000} /></Field>
        <Field label="Brokerage & transfer expenses (₹)"><Num value={expenses} onChange={setExpenses} step={10000} /></Field>
        <Field label="Your income tax slab (%)"><select className="input" value={slab} onChange={(e) => setSlab(Number(e.target.value))}>{[5, 10, 15, 20, 25, 30].map((x) => <option key={x}>{x}</option>)}</select></Field>
        <Field label="Residential status"><select className="input" value={resident ? 'r' : 'nri'} onChange={(e) => setResident(e.target.value === 'r')}><option value="r">Resident</option><option value="nri">Non-resident (NRI)</option></select></Field>
        {longTerm && <>
          <Field label="Reinvested in a new home — Sec 54 (₹)"><Num value={ex54} onChange={setEx54} step={100000} /></Field>
          <Field label="Invested in 54EC bonds (₹)" hint="Max ₹50 lakh, within 6 months of sale"><Num value={ex54ec} onChange={setEx54ec} step={100000} /></Field>
        </>}
      </div>
      <div className="space-y-4">
        <Result items={[['Holding period', `${Math.floor(months / 12)} y ${months % 12} m`], ['Type', longTerm ? 'Long-term (> 24 months)' : 'Short-term'], ['Capital gain', formatPrice(Math.max(0, plainGain))], ...(exemption ? [['Exemptions claimed', formatPrice(exemption)] as [string, string]] : []), ['Estimated tax (incl. 4% cess)', inr(tax), true]]} />
        {longTerm && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className={`rounded-xl border p-3 ${tax === optA ? 'border-emerald-500 bg-emerald-50' : 'border-neutral-200'}`}><p className="text-xs text-slate-500">12.5% without indexation</p><p>Gain {formatPrice(Math.max(0, plainGain))}</p><p className="font-bold">Tax {inr(optA)}</p></div>
            <div className={`rounded-xl border p-3 ${optB !== null && tax === optB ? 'border-emerald-500 bg-emerald-50' : 'border-neutral-200'}`}><p className="text-xs text-slate-500">20% with indexation</p>{optB === null ? <p className="text-slate-500">Not available{!resident ? ' to NRIs' : ' (bought after 22 Jul 2024)'}</p> : <><p>Indexed cost {formatPrice(indexedCost)}</p><p className="font-bold">Tax {inr(optB)}</p></>}</div>
          </div>
        )}
        <p className="text-sm text-slate-600">{note}.</p>
        <p className="text-xs text-slate-500">Indicative, for individuals; excludes surcharge. Rules as per Finance Act 2024 (CII up to FY 2025-26). Sec 54 exemption is capped at ₹10 crore. Confirm with a tax professional.</p>
      </div>
    </div>
  );
}

// ---------- Valuation ----------
export function Valuation({ cities }: { cities: { slug: string; name: string; localities: { slug: string; name: string; rate: number }[] }[] }) {
  const [city, setCity] = useState(cities[0].slug);
  const locs = cities.find((c) => c.slug === city)!.localities;
  const [loc, setLoc] = useState(locs[0].slug);
  const [area, setArea] = useState(1000);
  const [age, setAge] = useState(5);
  const [floor, setFloor] = useState<'low' | 'mid' | 'high'>('mid');
  const [furnish, setFurnish] = useState<'Unfurnished' | 'Semi-Furnished' | 'Furnished'>('Semi-Furnished');
  const base = (locs.find((l) => l.slug === loc) ?? locs[0]).rate;
  const ageAdj = age <= 2 ? 1.05 : age <= 10 ? 1 - (age - 2) * 0.01 : 0.9 - Math.min(0.15, (age - 10) * 0.01);
  const floorAdj = { low: 0.97, mid: 1, high: 1.04 }[floor];
  const furnishAdj = { Unfurnished: 1, 'Semi-Furnished': 1.02, Furnished: 1.05 }[furnish];
  const rate = base * ageAdj * floorAdj * furnishAdj;
  const value = rate * area;
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="City"><select className="input" value={city} onChange={(e) => { setCity(e.target.value); setLoc(cities.find((c) => c.slug === e.target.value)!.localities[0].slug); }}>{cities.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></Field>
        <Field label="Locality"><select className="input" value={loc} onChange={(e) => setLoc(e.target.value)}>{locs.map((l) => <option key={l.slug} value={l.slug}>{l.name}</option>)}</select></Field>
        <Field label="Built-up area (sq.ft)"><Num value={area} onChange={setArea} step={50} /></Field>
        <Field label="Property age (years)"><Num value={age} onChange={setAge} /></Field>
        <Field label="Floor"><select className="input" value={floor} onChange={(e) => setFloor(e.target.value as typeof floor)}><option value="low">Ground – 3rd</option><option value="mid">4th – 10th</option><option value="high">Above 10th</option></select></Field>
        <Field label="Furnishing"><select className="input" value={furnish} onChange={(e) => setFurnish(e.target.value as typeof furnish)}><option>Unfurnished</option><option>Semi-Furnished</option><option>Furnished</option></select></Field>
      </div>
      <div className="space-y-4">
        <Result items={[['Locality average', `₹${Math.round(base).toLocaleString('en-IN')}/sq.ft`], ['Adjusted rate', `₹${Math.round(rate).toLocaleString('en-IN')}/sq.ft`], ['Estimated value', `${formatPrice(value * 0.93)} – ${formatPrice(value * 1.07)}`, true]]} />
        <p className="text-xs text-slate-500">Based on average asking rates in the locality, adjusted for age, floor and furnishing. A physical inspection can change the value.</p>
        <a href="/tools/property-valuation/sample-report" target="_blank" rel="noopener" className="text-sm font-semibold text-brand-700 underline">View sample valuation report</a>
      </div>
      <div className="rounded-2xl border border-neutral-200 p-5 md:col-span-2">
        <h3 className="text-lg font-bold">Need a bank-grade valuation?</h3>
        <p className="mb-4 text-sm text-neutral-600">Get a detailed report from a certified valuer for loans, sale or legal purposes.</p>
        <ValuationReportOrder details={{ city, locality: loc, area, estimate: `${formatPrice(value * 0.93)} – ${formatPrice(value * 1.07)}` }} />
      </div>
    </div>
  );
}

// ---------- Rent receipts ----------
export function RentReceipt() {
  const [f, setF] = useState({ tenant: '', landlord: '', pan: '', address: '', rent: 25000, from: '2026-04', to: '2027-03', mode: 'Bank transfer', mobile: '', email: '' });
  const [consent, setConsent] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [err, setErr] = useState('');
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: k === 'rent' ? Number(e.target.value) : e.target.value });
  const months = useMemo(() => {
    const out: Date[] = [];
    const [fy, fm] = f.from.split('-').map(Number), [ty, tm] = f.to.split('-').map(Number);
    for (let d = new Date(fy, fm - 1, 1); d <= new Date(ty, tm - 1, 1) && out.length < 24; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) out.push(d);
    return out;
  }, [f.from, f.to]);
  const ready = f.tenant && f.landlord && f.address && f.rent > 0;
  async function generate() {
    setErr('');
    if (!ready) return setErr('Fill in tenant, landlord, address and rent.');
    if (f.rent * 12 > 100000 && !/^[A-Z]{5}\d{4}[A-Z]$/i.test(f.pan)) return setErr('Annual rent is above ₹1 lakh — enter the landlord PAN for HRA claims.');
    try {
      await submitOrder({ kind: 'rent-receipt', name: f.tenant, phone: f.mobile, email: f.email, consent, details: { receipt: { landlord: f.landlord, address: f.address, rent: f.rent, from: f.from, to: f.to, months: months.length } } });
      setGenerated(true);
    } catch (e) { setErr((e as Error).message); }
  }
  return (
    <div>
      <div className="grid gap-4 print:hidden sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Tenant name"><input className="input" value={f.tenant} onChange={set('tenant')} /></Field>
        <Field label="Landlord name"><input className="input" value={f.landlord} onChange={set('landlord')} /></Field>
        <Field label="Landlord PAN" hint="Required if annual rent > ₹1 lakh"><input className="input uppercase" maxLength={10} value={f.pan} onChange={set('pan')} /></Field>
        <Field label="Monthly rent (₹)"><Num value={f.rent} onChange={(v) => setF({ ...f, rent: v })} step={500} /></Field>
        <div className="sm:col-span-2"><Field label="Rented property address"><input className="input" value={f.address} onChange={set('address')} /></Field></div>
        <Field label="From month"><input type="month" className="input" value={f.from} onChange={set('from')} /></Field>
        <Field label="To month"><input type="month" className="input" value={f.to} onChange={set('to')} /></Field>
        <Field label="Payment mode"><select className="input" value={f.mode} onChange={set('mode')}><option>Bank transfer</option><option>UPI</option><option>Cheque</option><option>Cash</option></select></Field>
        <Field label="Tenant mobile number"><input className="input" inputMode="tel" value={f.mobile} onChange={set('mobile')} /></Field>
        <Field label="Email to receive receipts"><input type="email" className="input" value={f.email} onChange={set('email')} /></Field>
        <label className="flex items-start gap-2 text-xs text-neutral-500 sm:col-span-2"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 accent-brand-900" />I agree to the Terms and Privacy policy.</label>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 print:hidden">
        {!generated ? <button onClick={generate} className="btn-primary">Generate Free Rent Receipt</button> : <button onClick={() => window.print()} className="btn-primary">⤓ Download {months.length} receipts as PDF</button>}
        {err && <span className="text-sm text-rose-600">{err}</span>}
      </div>
      {generated && ready && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 print:block">
          {months.map((m) => (
            <div key={m.toISOString()} className="break-inside-avoid rounded-xl border-2 border-dashed border-slate-300 bg-white p-5 text-sm print:mb-4">
              <div className="flex justify-between"><b className="text-base">RENT RECEIPT</b><span>{m.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</span></div>
              <p className="mt-3 leading-relaxed">Received a sum of <b>{inr(f.rent)}</b> from <b>{f.tenant}</b> towards rent for the property at <b>{f.address}</b> for the period {m.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}, paid by {f.mode.toLowerCase()}.</p>
              <div className="mt-6 flex items-end justify-between"><span>{f.pan && <>Landlord PAN: <b>{f.pan.toUpperCase()}</b></>}</span><span className="border-t border-slate-400 pt-1 text-center">{f.landlord}<br /><span className="text-xs text-slate-500">(Landlord signature)</span></span></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Rent agreement draft ----------
export function RentAgreement() {
  const [stateName, setStateName] = useState(RENT_STAMP_DUTY[1].state);
  const [f, setF] = useState({ city: 'Bengaluru', landlord: '', landlordAddr: '', tenant: '', tenantAddr: '', property: '', rent: 30000, deposit: 100000, start: new Date().toISOString().slice(0, 10), months: 11, notice: 1, lockin: 6, escalation: 5, furnishing: 'Semi-furnished' });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: typeof f[k] === 'number' ? Number(e.target.value) : e.target.value });
  const start = new Date(f.start);
  const end = new Date(start.getFullYear(), start.getMonth() + f.months, start.getDate() - 1);
  const d = (x: Date) => x.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const blank = (s: string) => s || '________________';
  const duty = RENT_STAMP_DUTY.find((r) => r.state === stateName)!;
  const stampDuty = duty.calc(f.rent * 12, f.deposit, f.months);
  const text = `LEAVE AND LICENCE AGREEMENT

This agreement is made at ${f.city} on ${d(start)} between:

${blank(f.landlord)}, residing at ${blank(f.landlordAddr)} (the "Licensor"), and
${blank(f.tenant)}, residing at ${blank(f.tenantAddr)} (the "Licensee").

1. PROPERTY. The Licensor grants the Licensee permission to use the ${f.furnishing.toLowerCase()} premises at ${blank(f.property)} (the "Premises") for residential purposes only.

2. TERM. ${f.months} months, from ${d(start)} to ${d(end)}, renewable by mutual written consent.

3. LICENCE FEE. ₹${f.rent.toLocaleString('en-IN')} per month, payable on or before the 5th of each month. On renewal the fee will increase by ${f.escalation}%.

4. SECURITY DEPOSIT. ₹${f.deposit.toLocaleString('en-IN')}, interest-free, refundable at the end of the term after deducting unpaid dues and the cost of damage beyond normal wear and tear.

5. LOCK-IN AND NOTICE. Neither party may terminate during the first ${f.lockin} months except for breach. After that, either party may terminate with ${f.notice} month(s) written notice.

6. CHARGES. Electricity, water and gas bills for the term are payable by the Licensee. Society maintenance and property tax are payable by the Licensor.

7. USE AND CARE. The Licensee shall keep the Premises in good condition, shall not sublet or make structural changes, and shall allow the Licensor to inspect with reasonable notice.

8. HANDOVER. On expiry or termination, the Licensee shall hand over vacant possession along with all fixtures listed in the inventory annexed to this agreement.

9. GOVERNING LAW. This agreement is governed by the laws of India, and courts at ${f.city} shall have jurisdiction.

Signed by the parties in the presence of two witnesses.

LICENSOR: ____________________        LICENSEE: ____________________

WITNESS 1: ___________________        WITNESS 2: ___________________`;
  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <div className="grid gap-3 print:hidden sm:grid-cols-2 lg:grid-cols-1">
        <Field label="State"><select className="input" value={stateName} onChange={(e) => setStateName(e.target.value)}>{RENT_STAMP_DUTY.map((r) => <option key={r.state}>{r.state}</option>)}</select></Field>
        <p className="rounded-lg bg-accent-50 p-3 text-xs text-neutral-700"><b>Stamp duty in {duty.state}:</b> {duty.rule} ({duty.term}). Estimated for this agreement: <b>{inr(stampDuty)}</b>.</p>
        <Field label="City"><input className="input" value={f.city} onChange={set('city')} /></Field>
        <Field label="Landlord name"><input className="input" value={f.landlord} onChange={set('landlord')} /></Field>
        <Field label="Landlord address"><input className="input" value={f.landlordAddr} onChange={set('landlordAddr')} /></Field>
        <Field label="Tenant name"><input className="input" value={f.tenant} onChange={set('tenant')} /></Field>
        <Field label="Tenant permanent address"><input className="input" value={f.tenantAddr} onChange={set('tenantAddr')} /></Field>
        <Field label="Rented property address"><input className="input" value={f.property} onChange={set('property')} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Monthly rent (₹)"><Num value={f.rent} onChange={(v) => setF({ ...f, rent: v })} step={500} /></Field>
          <Field label="Deposit (₹)"><Num value={f.deposit} onChange={(v) => setF({ ...f, deposit: v })} step={5000} /></Field>
          <Field label="Start date"><input type="date" className="input" value={f.start} onChange={set('start')} /></Field>
          <Field label="Term (months)"><Num value={f.months} onChange={(v) => setF({ ...f, months: Math.min(60, Math.max(1, v)) })} /></Field>
          <Field label="Lock-in (months)"><Num value={f.lockin} onChange={(v) => setF({ ...f, lockin: v })} /></Field>
          <Field label="Notice (months)"><Num value={f.notice} onChange={(v) => setF({ ...f, notice: v })} /></Field>
          <Field label="Renewal hike (%)"><Num value={f.escalation} onChange={(v) => setF({ ...f, escalation: v })} /></Field>
          <Field label="Furnishing"><select className="input" value={f.furnishing} onChange={set('furnishing')}><option>Unfurnished</option><option>Semi-furnished</option><option>Fully furnished</option></select></Field>
        </div>
      </div>
      <div>
        <div className="mb-3 flex gap-2 print:hidden">
          <button onClick={() => window.print()} className="btn-primary">Print / Save as PDF</button>
          <button onClick={() => navigator.clipboard.writeText(text)} className="btn-ghost">Copy text</button>
        </div>
        <pre className="whitespace-pre-wrap rounded-2xl border border-slate-200 bg-white p-6 font-serif text-sm leading-relaxed">{text}</pre>
        <p className="mt-2 text-xs text-slate-500 print:hidden">This is a draft template. Print it on stamp paper of the value required in your state and register it where mandatory (e.g. Maharashtra requires registration of all leave and licence agreements).</p>
        <div className="mt-6 rounded-2xl border border-neutral-200 p-5 print:hidden">
          <h3 className="text-lg font-bold">Get it e-stamped and delivered</h3>
          <p className="mb-4 text-sm text-neutral-600">We prepare this agreement on e-stamp paper for {duty.state} and send it for signing. Stamp duty is charged at actuals.</p>
          <AgreementOrder agreement={{ ...f, state: stateName }} state={stateName} stampDuty={stampDuty} />
        </div>
      </div>
    </div>
  );
}
