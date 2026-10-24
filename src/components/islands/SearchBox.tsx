import { useEffect, useMemo, useRef, useState } from 'react';
import { parseQuery } from '../../lib/nlsearch';
import { uncoveredCityIn } from '../../data/indian-cities';
import type { City, Locality } from '../../data/types';

type Option = { slug: string; name: string; lat?: number; lng?: number };
type Suggestion = { label: string; sub: string; href: string };
interface Props {
  cities: Option[];
  localities: (Option & { citySlug: string })[];
  projects: { name: string; href: string; citySlug: string; locality: string }[];
  builders: { name: string; slug: string }[];
  initialCity?: string;
  initialTab?: Tab;
  variant?: 'hero' | 'bar';
}

const TABS = [
  { key: 'buy', label: 'Buy' },
  { key: 'rent', label: 'Rent' },
  { key: 'new-projects', label: 'New Projects' },
  { key: 'commercial', label: 'Commercial' },
  { key: 'plots', label: 'Plots' },
] as const;
type Tab = (typeof TABS)[number]['key'];

type SpeechRec = { lang: string; interimResults: boolean; start(): void; onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onend: () => void; onerror: () => void };

function target(tab: Tab, city: string, locality?: string) {
  if (tab === 'new-projects') return `/new-projects/${city}${locality ? `?locality=${locality}` : ''}`;
  if (tab === 'plots') return `/buy/${city}${locality ? `/${locality}` : ''}/plot`;
  return `/${tab}/${city}${locality ? `/${locality}` : ''}`;
}

const distKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371, dLat = ((b.lat - a.lat) * Math.PI) / 180, dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

export default function SearchBox({ cities, localities, projects, builders, initialCity, initialTab = 'buy', variant = 'hero' }: Props) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [city, setCity] = useState(initialCity ?? cities[0].slug);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<'' | 'voice' | 'geo'>('');
  const [note, setNote] = useState('');
  // A place we don't cover: "near me" found no locality within 60 km (the nearest city we cover is offered
  // instead), or the typed text named a city we're not in yet. Shown with links to all our cities.
  const [cover, setCover] = useState<{ kind: 'far'; slug: string; name: string; km: number } | { kind: 'city'; name: string } | null>(null);
  // Results of a search or "near me" that don't navigate must be seen: bring them into view (below the
  // sticky header) and move focus to the "not covered" box so keyboard and screen-reader users land on it.
  const coverBox = useRef<HTMLDivElement>(null);
  const noteBox = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = cover ? coverBox.current : note ? noteBox.current : null;
    if (!el) return;
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    if (cover) el.focus({ preventScroll: true });
  }, [cover, note]);
  const input = useRef<HTMLInputElement>(null);

  const suggestions = useMemo<Suggestion[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const locs = localities
      .filter((l) => l.name.toLowerCase().includes(q))
      .sort((a, b) => Number(b.citySlug === city) - Number(a.citySlug === city))
      .map((l) => ({ label: l.name, sub: `Locality · ${cities.find((c) => c.slug === l.citySlug)?.name}`, href: target(tab, l.citySlug, l.slug) }));
    const projs = projects.filter((p) => p.name.toLowerCase().includes(q)).map((p) => ({ label: p.name, sub: `Project · ${p.locality}`, href: p.href }));
    const blds = builders.filter((b) => b.name.toLowerCase().includes(q)).map((b) => ({ label: b.name, sub: 'Builder', href: `/builders/${b.slug}` }));
    return [...locs, ...projs, ...blds].slice(0, 8);
  }, [query, city, tab, localities, projects, builders, cities]);

  function submit(e: React.SyntheticEvent) {
    e.preventDefault();
    const q = query.trim();
    setNote('');
    setCover(null);
    if (!q) {
      window.location.href = target(tab, city);
      return;
    }
    if (suggestions.length > 0) {
      window.location.href = suggestions[0].href;
      return;
    }
    // Never quietly search another city: a city we don't cover gets "We're not in … yet", and text we
    // can't read at all gets "No matches"; neither navigates.
    const other = uncoveredCityIn(q);
    if (other) return setCover({ kind: 'city', name: other });
    const asCities = cities as unknown as City[];
    const here = asCities.find((c) => c.slug === city) ?? asCities[0];
    const mode = tab === 'plots' ? 'buy' : tab;
    const parsed = parseQuery(q, asCities, localities as unknown as Locality[], here, mode);
    if (!parsed.matched) return setNote(`No matches for ‘${q}’. Try a locality, project or builder in one of our cities.`);
    window.location.href = tab === 'plots' ? parseQuery(`${q} plot`, asCities, localities as unknown as Locality[], here, 'buy').url : parsed.url;
  }

  function voice() {
    const W = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const Rec = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!Rec) return setNote('Voice search is not supported in this browser.');
    const rec = new Rec();
    rec.lang = 'en-IN';
    rec.interimResults = false;
    setBusy('voice');
    setNote('Listening… speak a locality or project');
    rec.onresult = (e) => {
      const text = e.results[0][0].transcript;
      setQuery(text);
      setOpen(true);
    };
    rec.onerror = () => { setBusy(''); setNote('Could not hear you. Please try again.'); };
    rec.onend = () => setBusy((b) => (b === 'voice' ? '' : b));
    rec.start();
  }

  function nearMe() {
    setCover(null);
    setNote('');
    if (!navigator.geolocation) return setNote('Location is not available in this browser.');
    setBusy('geo');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const me = { lat: coords.latitude, lng: coords.longitude };
        const withPos = localities.filter((l) => l.lat !== undefined) as (Option & { citySlug: string; lat: number; lng: number })[];
        const nearest = withPos.sort((a, b) => distKm(me, a) - distKm(me, b))[0];
        if (!nearest || distKm(me, nearest) > 60) {
          setBusy('');
          setNote('');
          // Outside our cities: offer the nearest city we cover (and all of them, below).
          const placed = cities.filter((c) => c.lat !== undefined) as (Option & { lat: number; lng: number })[];
          const city = placed.sort((a, b) => distKm(me, a) - distKm(me, b))[0];
          if (!city) return setNote('We don’t have listings near you yet. Pick a city instead.');
          const km = distKm(me, city);
          return setCover({ kind: 'far', slug: city.slug, name: city.name, km: km >= 100 ? Math.round(km / 10) * 10 : Math.round(km) });
        }
        window.location.href = target(tab, nearest.citySlug, nearest.slug);
      },
      (err) => {
        setBusy('');
        // Only code 1 is a refusal; a timeout or "position unavailable" deserves a different message.
        setNote(err.code === err.PERMISSION_DENIED ? 'Location permission was denied.' : 'Couldn’t get your location. Try again or pick a city.');
      },
      { timeout: 10000 },
    );
  }

  const hero = variant === 'hero';
  const Chevron = () => <svg viewBox="0 0 20 20" className="pointer-events-none absolute right-3 h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m5 8 5 5 5-5" /></svg>;
  
  return (
    <div className={hero ? 'w-full max-w-[880px]' : 'w-full'}>
      {hero && (
        <div className="mb-4 flex flex-nowrap sm:inline-flex items-center gap-1 rounded-xl bg-black/40 p-1 backdrop-blur-xl border border-white/15 max-w-full overflow-x-auto no-scrollbar" role="tablist" aria-label="Search category">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.key)}
                className={`shrink-0 rounded-lg px-4 sm:px-5 py-2 text-xs sm:text-[13px] font-semibold tracking-wide transition-all duration-200 cursor-pointer ${
                  active
                    ? 'bg-amber-400 text-brand-950 font-bold shadow-sm'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      )}

      <form onSubmit={submit} className={`relative flex flex-wrap items-stretch gap-2 rounded-2xl sm:rounded-2xl bg-white/95 p-2.5 sm:p-3 sm:flex-nowrap sm:items-center backdrop-blur-xl border border-white/60 ${hero ? 'shadow-[0_20px_50px_rgba(7,14,31,0.35)] ring-1 ring-black/5' : 'border border-slate-200 shadow-sm'}`}>
        {!hero && (
          <label className="relative flex flex-1 items-center sm:w-36 sm:flex-none">
            <span className="sr-only">Looking to</span>
            <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 h-[18px] w-[18px] text-amber-600" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5M5 10v10h14V10" /></svg>
            <select value={tab} onChange={(e) => setTab(e.target.value as Tab)} className="w-full cursor-pointer appearance-none rounded-xl bg-slate-100/80 py-3 pl-10 pr-8 text-[14px] font-semibold text-slate-800 outline-none hover:bg-slate-100 transition">
              {TABS.map((t) => <option key={t.key} value={t.key}>{t.key === 'new-projects' ? 'Projects' : t.label}</option>)}
            </select>
            <Chevron />
          </label>
        )}

        <div className="relative flex flex-1 basis-full items-center rounded-xl bg-slate-100/70 sm:basis-auto border border-slate-200/60 transition-all duration-200 focus-within:bg-white focus-within:border-amber-400/80 focus-within:ring-3 focus-within:ring-amber-100">
          <svg viewBox="0 0 24 24" className="ml-3.5 h-5 w-5 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input
            ref={input}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 200)}
            className="w-full bg-transparent px-3 py-3 text-[14px] sm:text-[15px] font-medium text-slate-900 outline-none placeholder:text-slate-400"
            placeholder="Search by Locality, Project or Builder…"
            aria-label="Search by locality, project or builder"
            autoComplete="off"
          />
          <div className="flex items-center gap-1 pr-2 text-slate-400">
            <button type="button" onClick={nearMe} title="Properties near me" aria-label="Properties near me" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white hover:text-amber-600 transition cursor-pointer">
              <svg viewBox="0 0 24 24" className={`h-[18px] w-[18px] ${busy === 'geo' ? 'text-amber-600' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /><circle cx="12" cy="12" r="7" /></svg>
            </button>
            <button type="button" onClick={voice} title="Search by voice" aria-label="Search by voice" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white hover:text-rose-500 transition cursor-pointer">
              <svg viewBox="0 0 24 24" className={`h-[18px] w-[18px] ${busy === 'voice' ? 'text-rose-500' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
            </button>
          </div>
          {open && suggestions.length > 0 && (
            <ul className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-slate-200/90 bg-white/98 p-1.5 shadow-[0_20px_50px_rgba(7,14,31,0.2)] backdrop-blur-xl">
              {suggestions.map((s) => (
                <li key={s.href + s.label}>
                  <a href={s.href} className="flex items-center justify-between gap-3 rounded-xl px-4 py-2.5 text-sm text-slate-800 transition hover:bg-amber-50 hover:text-brand-950">
                    <span className="font-semibold">{s.label}</span>
                    <span className="shrink-0 text-xs text-slate-500 font-medium">{s.sub}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <label className="relative flex min-w-0 flex-1 items-center sm:w-40 sm:flex-none">
          <span className="sr-only">City</span>
          <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3.5 h-[18px] w-[18px] text-amber-600" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg>
          <select value={city} onChange={(e) => setCity(e.target.value)} className="w-full cursor-pointer appearance-none rounded-xl bg-slate-100/70 border border-slate-200/60 py-3 pl-10 pr-8 text-[14px] font-semibold text-slate-800 outline-none hover:bg-slate-100 transition focus:border-amber-400">
            {cities.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
          <Chevron />
        </label>

        <button
          className="btn-primary shrink-0 whitespace-nowrap rounded-xl sm:rounded-xl px-5 py-3.5 text-[15px] font-bold sm:px-8"
          type="submit"
          disabled={busy !== ''}
        >
          {busy !== '' ? (
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
              Searching…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              Search
            </span>
          )}
        </button>
      </form>
      {note && (
        <div ref={noteBox} className={`mt-2.5 inline-flex scroll-mt-28 items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-medium ${hero ? 'bg-brand-950/70 text-amber-200 backdrop-blur-md border border-white/10' : 'bg-slate-100 text-slate-600'}`} role="status">
          <span>ℹ</span>
          <span>{note}</span>
        </div>
      )}
      {cover && (
        <div ref={coverBox} tabIndex={-1} className={`mt-2.5 scroll-mt-28 rounded-xl px-3.5 py-2 text-xs font-medium outline-none ${hero ? 'bg-brand-950/70 text-amber-200 backdrop-blur-md border border-white/10' : 'border border-amber-300 bg-amber-50 text-amber-900'}`} role="status">
          {cover.kind === 'far' ? (
            <p>
              <span>ℹ </span>We don’t cover your area yet. Nearest city: {cover.name} (~{cover.km.toLocaleString('en-IN')} km).{' '}
              <a href={target(tab, cover.slug)} className="font-semibold underline">View homes in {cover.name} →</a>
            </p>
          ) : (
            <p><span>ℹ </span>We’re not in {cover.name} yet.</p>
          )}
          <p className="mt-1">Our cities: {cities.map((c, i) => <span key={c.slug}>{i > 0 && ' · '}<a href={target(tab, c.slug)} className="underline">{c.name}</a></span>)}</p>
        </div>
      )}
    </div>
  );
}
