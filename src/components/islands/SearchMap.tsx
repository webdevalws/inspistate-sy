import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';

// Map view of search results: one pin per locality that has results for the current search and filters.
// Same Leaflet + OpenStreetMap setup as HeatMap.tsx; rendered only in Map view (client:only). See
// docs/functions/property-search/desc.md.
export interface Pin { name: string; lat: number; lng: number; count: number; range: string; href: string; cta: string }

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export default function SearchMap({ pins, center }: { pins: Pin[]; center: [number, number] }) {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: import('leaflet').Map | undefined;
    let cancelled = false;
    import('leaflet').then((L) => {
      if (cancelled || !el.current) return;
      map = L.map(el.current, { scrollWheelZoom: false }).setView(center, 11);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
      // Pins use the theme's brand colour (SVG fill attributes can't read CSS variables, so resolve it here).
      const fill = getComputedStyle(document.documentElement).getPropertyValue('--color-brand-600').trim() || 'currentColor';
      for (const p of pins) {
        L.circleMarker([p.lat, p.lng], { radius: 12 + Math.min(14, p.count), color: 'white', weight: 2, fillColor: fill, fillOpacity: 0.85 })
          .bindTooltip(`${esc(p.name)} · ${p.count}`)
          .bindPopup(`<p style="margin:0;font-weight:700">${esc(p.name)}</p><p style="margin:2px 0">${p.count} matching · ${esc(p.range)}</p><a href="${esc(p.href)}" style="font-weight:600">${esc(p.cta)} →</a>`)
          .addTo(map);
      }
      if (pins.length > 1) map.fitBounds(L.latLngBounds(pins.map((p) => [p.lat, p.lng])).pad(0.3));
      else if (pins.length === 1) map.setView([pins[0].lat, pins[0].lng], 13);
    });
    return () => { cancelled = true; map?.remove(); };
  }, []);

  return <div ref={el} className="h-[420px] w-full overflow-hidden rounded-2xl border border-slate-200 sm:h-[560px]" role="application" aria-label="Map of matching localities" />;
}
