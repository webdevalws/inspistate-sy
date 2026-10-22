import { useState } from 'react';
import { FILTER_KEYS, facetPath } from '../../lib/search';

export interface FilterState {
  locality: string[];
  bhk: number[];
  type: string[];
  furnishing: string[];
  postedBy: string[];
  possession: string[];
  amenities: string[];
  priceMin?: number;
  priceMax?: number;
  areaMin?: number;
  areaMax?: number;
  commercialPurpose?: 'buy' | 'rent';
  verified: boolean;
  sort: string;
}

interface Props {
  basePath: string;
  initial: FilterState;
  isCommercial: boolean;
  localities: { slug: string; name: string }[];
  budgets: { value: number; label: string }[];
}

const RES_TYPES = ['Apartment', 'Builder Floor', 'Villa', 'Plot'];
const COM_TYPES = ['Office', 'Shop'];
const AMENITIES = ['Swimming Pool', 'Gymnasium', 'Clubhouse', 'Lift', 'Covered Parking', 'Power Backup', '24x7 Security', 'Kids Play Area', 'EV Charging', 'Pet Park'];
const AREAS = [300, 500, 750, 1000, 1500, 2000, 3000, 5000];

export default function FilterPanel({ basePath, initial, isCommercial, localities, budgets }: Props) {
  const [f, setF] = useState<FilterState>(initial);

  function apply(next: FilterState) {
    setF(next);
    // Keep query values this panel doesn't own (e.g. managed=1); locality, BHK and type go in the path
    // when a single value is chosen (facetPath), so filtered pages keep clean, crawlable URLs.
    const q = new URLSearchParams([...new URLSearchParams(window.location.search)].filter(([k]) => !FILTER_KEYS.includes(k)));
    const setList = (k: string, v: (string | number)[]) => v.length && q.set(k, v.join(','));
    setList('furnishing', next.furnishing);
    setList('postedBy', next.postedBy);
    setList('possession', next.possession);
    setList('amenities', next.amenities);
    if (next.priceMin) q.set('priceMin', String(next.priceMin));
    if (next.priceMax) q.set('priceMax', String(next.priceMax));
    if (next.areaMin) q.set('areaMin', String(next.areaMin));
    if (next.areaMax) q.set('areaMax', String(next.areaMax));
    if (next.commercialPurpose) q.set('for', next.commercialPurpose);
    if (next.verified) q.set('verified', '1');
    if (next.sort && next.sort !== 'relevance') q.set('sort', next.sort);
    window.location.href = facetPath(basePath, next, q);
  }

  const toggle = <K extends 'locality' | 'bhk' | 'type' | 'furnishing' | 'postedBy' | 'possession' | 'amenities'>(key: K, v: FilterState[K][number]) => {
    const arr = f[key] as (string | number)[];
    apply({ ...f, [key]: arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v] });
  };

  const activeCount =
    f.locality.length + f.bhk.length + f.type.length + f.furnishing.length + f.postedBy.length + f.possession.length + f.amenities.length +
    Number(!!f.priceMin) + Number(!!f.priceMax) + Number(!!f.areaMin) + Number(!!f.areaMax) + Number(f.verified);

  return (
    <div className="space-y-5 text-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold">Filters {activeCount > 0 && <span className="chip ml-1 bg-brand-100 text-brand-700">{activeCount}</span>}</h2>
        {activeCount > 0 && (
          <button className="text-sm font-semibold text-brand-600 hover:underline" onClick={() => (window.location.href = basePath)}>Reset</button>
        )}
      </div>

      {isCommercial && (
        <Group title="Looking to">
          <div className="flex gap-2">
            {(['buy', 'rent'] as const).map((p) => (
              <Pill key={p} active={f.commercialPurpose === p} onClick={() => apply({ ...f, commercialPurpose: f.commercialPurpose === p ? undefined : p })}>
                {p === 'buy' ? 'Buy' : 'Lease'}
              </Pill>
            ))}
          </div>
        </Group>
      )}

      <Group title="Budget">
        <div className="grid grid-cols-2 gap-2">
          <select className="input" aria-label="Minimum budget" value={f.priceMin ?? ''} onChange={(e) => apply({ ...f, priceMin: Number(e.target.value) || undefined })}>
            <option value="">Min</option>
            {budgets.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
          </select>
          <select className="input" aria-label="Maximum budget" value={f.priceMax ?? ''} onChange={(e) => apply({ ...f, priceMax: Number(e.target.value) || undefined })}>
            <option value="">Max</option>
            {budgets.filter((b) => !f.priceMin || b.value > f.priceMin).map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
          </select>
        </div>
      </Group>

      {!isCommercial && (
        <Group title="BHK">
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((b) => (
              <Pill key={b} active={f.bhk.includes(b)} onClick={() => toggle('bhk', b)}>{b === 5 ? '5+ BHK' : `${b} BHK`}</Pill>
            ))}
          </div>
        </Group>
      )}

      <Group title="Property type">
        <div className="flex flex-wrap gap-2">
          {(isCommercial ? COM_TYPES : RES_TYPES).map((t) => (
            <Pill key={t} active={f.type.includes(t)} onClick={() => toggle('type', t)}>{t}</Pill>
          ))}
        </div>
      </Group>

      <Group title="Locality">
        <div className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
          {localities.map((l) => (
            <Check key={l.slug} label={l.name} checked={f.locality.includes(l.slug)} onChange={() => toggle('locality', l.slug)} />
          ))}
        </div>
      </Group>

      <Group title="Area (sq.ft)">
        <div className="grid grid-cols-2 gap-2">
          <select className="input" aria-label="Minimum area" value={f.areaMin ?? ''} onChange={(e) => apply({ ...f, areaMin: Number(e.target.value) || undefined })}>
            <option value="">Min</option>
            {AREAS.map((a) => <option key={a} value={a}>{a.toLocaleString('en-IN')}</option>)}
          </select>
          <select className="input" aria-label="Maximum area" value={f.areaMax ?? ''} onChange={(e) => apply({ ...f, areaMax: Number(e.target.value) || undefined })}>
            <option value="">Max</option>
            {AREAS.filter((a) => !f.areaMin || a > f.areaMin).map((a) => <option key={a} value={a}>{a.toLocaleString('en-IN')}</option>)}
          </select>
        </div>
      </Group>

      <Group title="Possession status">
        {['Ready to Move', 'Under Construction'].map((p) => (
          <Check key={p} label={p} checked={f.possession.includes(p)} onChange={() => toggle('possession', p)} />
        ))}
      </Group>

      {!isCommercial && (
        <Group title="Furnishing">
          {['Furnished', 'Semi-Furnished', 'Unfurnished'].map((p) => (
            <Check key={p} label={p} checked={f.furnishing.includes(p)} onChange={() => toggle('furnishing', p)} />
          ))}
        </Group>
      )}

      <Group title="Posted by">
        {['Owner', 'Agent', 'Builder'].map((p) => (
          <Check key={p} label={p} checked={f.postedBy.includes(p)} onChange={() => toggle('postedBy', p)} />
        ))}
      </Group>

      {!isCommercial && (
        <Group title="Amenities">
          <div className="flex flex-wrap gap-2">
            {AMENITIES.map((a) => <Pill key={a} active={f.amenities.includes(a)} onClick={() => toggle('amenities', a)}>{a}</Pill>)}
          </div>
        </Group>
      )}

      <Group title="Other">
        <Check label="Verified listings only" checked={f.verified} onChange={() => apply({ ...f, verified: !f.verified })} />
      </Group>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-2 border-t border-slate-100 pt-4">
      <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</legend>
      {children}
    </fieldset>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${active ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-brand-500'}`}
    >
      {children}
    </button>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-slate-700">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 rounded border-slate-300 accent-brand-600" />
      {label}
    </label>
  );
}
