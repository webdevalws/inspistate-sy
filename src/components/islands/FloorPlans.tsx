import { useState } from 'react';
import { formatPrice } from '../../lib/format';

interface Unit { bhk: number; label: string; carpetSqft: number; price: number }

export default function FloorPlans({ units, hue }: { units: Unit[]; hue: number }) {
  const bhks = [...new Set(units.map((u) => u.bhk))];
  const [tab, setTab] = useState<number | 'all'>('all');
  const shown = tab === 'all' ? units : units.filter((u) => u.bhk === tab);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2" role="tablist">
        {(['all', ...bhks] as const).map((b) => (
          <button
            key={b}
            role="tab"
            aria-selected={tab === b}
            onClick={() => setTab(b)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${tab === b ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
          >
            {b === 'all' ? 'All BHK' : `${b} BHK`}
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((u, i) => (
          <div key={i} className="overflow-hidden rounded-xl border border-slate-200">
            <PlanSketch bhk={u.bhk} hue={hue} />
            <div className="p-4">
              <p className="font-semibold">{u.label}</p>
              <p className="text-sm text-slate-500">{u.carpetSqft.toLocaleString('en-IN')} sq.ft carpet area</p>
              <p className="mt-2 text-lg font-bold text-brand-700">{formatPrice(u.price)}<span className="text-xs font-normal text-slate-500"> + charges</span></p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlanSketch({ bhk, hue }: { bhk: number; hue: number }) {
  const rooms = bhk + 2;
  return (
    <svg viewBox="0 0 160 90" className="h-32 w-full" style={{ background: `hsl(${hue} 40% 96%)` }} aria-label={`${bhk} BHK floor plan sketch`}>
      <rect x="10" y="8" width="140" height="74" fill="white" stroke={`hsl(${hue} 30% 45%)`} strokeWidth="2" />
      {Array.from({ length: rooms - 1 }, (_, i) => (
        <line key={i} x1={10 + ((i + 1) * 140) / rooms} y1="8" x2={10 + ((i + 1) * 140) / rooms} y2={i % 2 ? 82 : 55} stroke={`hsl(${hue} 30% 45%)`} strokeWidth="1.5" />
      ))}
      <line x1="10" y1="55" x2="150" y2="55" stroke={`hsl(${hue} 30% 45%)`} strokeWidth="1" strokeDasharray="3 3" />
    </svg>
  );
}
