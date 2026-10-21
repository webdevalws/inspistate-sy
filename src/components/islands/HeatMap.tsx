import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';

interface Point { slug: string; name: string; lat: number; lng: number; rate: number; rent: number; growth: number; listings: number; href: string }
type Metric = 'rate' | 'growth' | 'rent';

const METRICS: Record<Metric, { label: string; fmt: (p: Point) => string }> = {
  rate: { label: 'Sale price / sq.ft', fmt: (p) => `₹${Math.round(p.rate).toLocaleString('en-IN')}` },
  growth: { label: 'Yearly growth', fmt: (p) => `${p.growth}%` },
  rent: { label: 'Rent / sq.ft', fmt: (p) => `₹${p.rent}` },
};

// Green (low) → amber → red (high)
function color(t: number) {
  const stops = [[49, 135, 127], [238, 154, 28], [220, 38, 38]];
  const s = t < 0.5 ? 0 : 1;
  const k = t < 0.5 ? t / 0.5 : (t - 0.5) / 0.5;
  const c = stops[s].map((v, i) => Math.round(v + (stops[s + 1][i] - v) * k));
  return `rgb(${c.join(',')})`;
}

export default function HeatMap({ points, center }: { points: Point[]; center: [number, number] }) {
  const el = useRef<HTMLDivElement>(null);
  const [metric, setMetric] = useState<Metric>('rate');
  const layer = useRef<{ clear: () => void; draw: (m: Metric) => void } | null>(null);

  useEffect(() => {
    let map: import('leaflet').Map | undefined;
    let cancelled = false;
    import('leaflet').then((L) => {
      if (cancelled || !el.current) return;
      map = L.map(el.current, { scrollWheelZoom: false }).setView(center, 11);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
      const group = L.layerGroup().addTo(map);
      layer.current = {
        clear: () => group.clearLayers(),
        draw: (m) => {
          group.clearLayers();
          const vals = points.map((p) => p[m]);
          const lo = Math.min(...vals), hi = Math.max(...vals);
          for (const p of points) {
            const t = hi === lo ? 0.5 : (p[m] - lo) / (hi - lo);
            L.circleMarker([p.lat, p.lng], { radius: 14 + Math.min(16, p.listings / 2), color: 'white', weight: 2, fillColor: color(t), fillOpacity: 0.8 })
              .bindTooltip(`<b>${p.name}</b><br>${METRICS[m].label}: ${METRICS[m].fmt(p)}<br>${p.listings} listings`)
              .on('click', () => (window.location.href = p.href))
              .addTo(group);
          }
          if (points.length) map!.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng])).pad(0.3));
        },
      };
      layer.current.draw(metric);
    });
    return () => { cancelled = true; map?.remove(); };
  }, []);

  useEffect(() => { layer.current?.draw(metric); }, [metric]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {(Object.keys(METRICS) as Metric[]).map((m) => (
          <button key={m} onClick={() => setMetric(m)} aria-pressed={metric === m}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${metric === m ? 'bg-brand-600 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200'}`}>{METRICS[m].label}</button>
        ))}
        <span className="ml-auto flex items-center gap-2 text-xs text-slate-500">Low<span className="h-2.5 w-28 rounded-full" style={{ background: `linear-gradient(90deg, ${color(0)}, ${color(0.5)}, ${color(1)})` }} />High</span>
      </div>
      <div ref={el} className="h-[520px] w-full overflow-hidden rounded-2xl border border-slate-200" role="application" aria-label="Price heatmap" />
    </div>
  );
}
