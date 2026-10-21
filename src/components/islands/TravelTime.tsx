import { useState } from 'react';

interface Place { name: string; kind: string; km: number }

// Typical Indian city averages: peak-hour car ~18 km/h, off-peak ~30 km/h, metro ~32 km/h incl. stops, walking 4.5 km/h.
const MODES = [
  { key: 'peak', label: 'Car (peak)', kmh: 18 },
  { key: 'offpeak', label: 'Car (off-peak)', kmh: 30 },
  { key: 'metro', label: 'Metro / rail', kmh: 32 },
  { key: 'walk', label: 'Walking', kmh: 4.5 },
] as const;

const fmt = (min: number) => (min < 60 ? `${Math.max(1, Math.round(min))} min` : `${Math.floor(min / 60)} h ${Math.round(min % 60)} min`);

export default function TravelTime({ places, origin }: { places: Place[]; origin: string }) {
  const [dest, setDest] = useState(0);
  const p = places[dest];
  return (
    <div className="card p-5">
      <h3 className="font-bold">Travel time from {origin}</h3>
      <label className="mt-3 block text-sm">
        <span className="text-slate-600">Choose destination</span>
        <select className="input mt-1" value={dest} onChange={(e) => setDest(Number(e.target.value))}>
          {places.map((pl, i) => <option key={pl.name} value={i}>{pl.name} ({pl.kind}) — {pl.km} km</option>)}
        </select>
      </label>
      <dl className="mt-4 grid grid-cols-2 gap-3">
        {MODES.filter((m) => m.key !== 'walk' || p.km <= 3).map((m) => (
          <div key={m.key} className="rounded-xl bg-slate-50 p-3">
            <dt className="text-xs text-slate-500">{m.label}</dt>
            <dd className="text-lg font-bold">{fmt(((p.km * 1.3) / m.kmh) * 60)}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-slate-400">Estimates from road distance (≈1.3× straight-line) and typical city speeds. Actual times vary.</p>
    </div>
  );
}
