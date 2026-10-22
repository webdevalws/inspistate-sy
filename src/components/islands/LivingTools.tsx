import { useState } from 'react';

const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm"><span className="mb-1 block font-medium text-neutral-600">{label}</span>{children}</label>;
}

// ---------- Property tax ----------
// Indicative unit-area rates (₹ per sq.ft per year) by city for a residential, self-occupied property.
// Formula: base rate × built-up area × age × construction × use × floor factors. See docs/functions/property-tax/desc.md.
const TAX_RATE: Record<string, { rate: number; method: string }> = {
  mumbai: { rate: 6.5, method: 'Capital value system (BMC)' },
  bengaluru: { rate: 3.2, method: 'Unit area value system (BBMP)' },
  delhi: { rate: 3.6, method: 'Unit area system, colony categories A–H (MCD)' },
  gurugram: { rate: 2.2, method: 'Area-based slab rates (MCG)' },
  noida: { rate: 2.0, method: 'Annual rental value (Noida Authority)' },
  pune: { rate: 4.8, method: 'Annual rateable value (PMC)' },
  hyderabad: { rate: 2.9, method: 'Annual rental value (GHMC)' },
  chennai: { rate: 3.0, method: 'Annual rental value by zone (GCC)' },
  thane: { rate: 4.2, method: 'Annual rateable value (TMC)' },
  kolkata: { rate: 3.4, method: 'Unit area assessment, blocks A–G (KMC)' },
  lucknow: { rate: 2.4, method: 'Annual rental value (LMC)' },
};
const CONSTRUCTION = { rcc: { label: 'RCC / pucca', f: 1 }, semi: { label: 'Semi-pucca', f: 0.7 }, kutcha: { label: 'Kutcha', f: 0.5 } } as const;
export function PropertyTax({ cities }: { cities: { slug: string; name: string }[] }) {
  const [city, setCity] = useState(cities[0].slug);
  const [area, setArea] = useState(1000);
  const [age, setAge] = useState(5);
  const [use, setUse] = useState<'self' | 'rented' | 'commercial'>('self');
  const [build, setBuild] = useState<keyof typeof CONSTRUCTION>('rcc');
  const [floor, setFloor] = useState<'ground' | 'upper'>('upper');
  const known = TAX_RATE[city];
  const base = (known?.rate ?? 3) * area;
  const useMult = { self: 1, rented: 1.5, commercial: 2.5 }[use];
  const ageMult = age > 40 ? 0.7 : age > 25 ? 0.8 : age > 10 ? 0.9 : 1;
  const floorMult = floor === 'ground' ? 1 : 0.9;
  const tax = base * useMult * ageMult * CONSTRUCTION[build].f * floorMult;
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="City"><select className="input" value={city} onChange={(e) => setCity(e.target.value)}>{cities.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></Field>
        <Field label="Built-up area (sq.ft)"><input type="number" className="input" value={area} onChange={(e) => setArea(Number(e.target.value))} /></Field>
        <Field label="Building age (years)"><input type="number" className="input" value={age} onChange={(e) => setAge(Number(e.target.value))} /></Field>
        <Field label="Use"><select className="input" value={use} onChange={(e) => setUse(e.target.value as typeof use)}><option value="self">Self-occupied residential</option><option value="rented">Rented-out residential</option><option value="commercial">Commercial</option></select></Field>
        <Field label="Construction"><select className="input" value={build} onChange={(e) => setBuild(e.target.value as typeof build)}>{Object.entries(CONSTRUCTION).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Field>
        <Field label="Floor"><select className="input" value={floor} onChange={(e) => setFloor(e.target.value as typeof floor)}><option value="ground">Ground floor</option><option value="upper">Upper floor</option></select></Field>
      </div>
      <div className="space-y-3">
        <dl className="space-y-3 rounded-2xl bg-neutral-100 p-6">
          <div className="flex justify-between"><dt className="text-sm text-neutral-600">Annual property tax ({known ? 'approx.' : 'rough — no city data'})</dt><dd className="text-2xl font-extrabold">{inr(tax)}</dd></div>
          <div className="flex justify-between text-sm"><dt className="text-neutral-600">Per month</dt><dd className="font-bold">{inr(tax / 12)}</dd></div>
          {known && <div className="flex justify-between gap-4 text-sm"><dt className="text-neutral-600">Method used locally</dt><dd className="text-right font-medium">{known.method}</dd></div>}
        </dl>
        <p className="text-xs text-neutral-500">Each municipal body uses its own formula (unit area value, capital value or annual rental value), zones and rebates. This is an indicative estimate — use your municipal corporation’s calculator for the exact bill.</p>
      </div>
    </div>
  );
}
