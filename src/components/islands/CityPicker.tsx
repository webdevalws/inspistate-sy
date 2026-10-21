import { useEffect, useRef, useState } from 'react';

interface Props { cities: { slug: string; name: string; count: number }[]; current: string }

const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K` : String(n));

/** Swaps the city segment in the current URL when the page is city-scoped, else opens the city hub. */
function targetFor(slug: string, cities: string[]) {
  const parts = window.location.pathname.split('/');
  const idx = parts.findIndex((p) => cities.includes(p));
  if (idx > 0 && /^\/(buy|rent|commercial|new-projects|city|property-rates|heatmap|localities)\//.test(window.location.pathname)) {
    return parts.slice(0, idx).concat(slug).join('/');
  }
  return `/city/${slug}`;
}

export default function CityPicker({ cities, current }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const name = cities.find((c) => c.slug === current)?.name ?? 'Select city';

  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);

  const shown = cities.filter((c) => c.name.toLowerCase().includes(q.trim().toLowerCase()));
  const go = (slug: string) => (window.location.href = targetFor(slug, cities.map((c) => c.slug)));

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="flex items-center gap-1.5 rounded-full bg-neutral-700 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-neutral-600" aria-haspopup="dialog">
        <svg className="h-4 w-4 text-accent-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M10 18s6-5.2 6-10A6 6 0 0 0 4 8c0 4.8 6 10 6 10Zm0-8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" clipRule="evenodd" /></svg>
        {name}
        <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true"><path d="M2 4l4 4 4-4z" /></svg>
      </button>
      <dialog ref={dialog} onClose={() => setOpen(false)} onClick={(e) => e.target === dialog.current && setOpen(false)}
        className="m-auto w-[min(640px,calc(100vw-2rem))] rounded-2xl p-0 shadow-2xl backdrop:bg-slate-900/50" aria-label="Select city">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-bold">Select your city</h2>
          <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Close">✕</button>
        </div>
        <div className="p-5">
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} className="input" placeholder="Search city" aria-label="Search city" />
          <p className="mb-3 mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">Popular cities</p>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {shown.map((c) => (
              <li key={c.slug}>
                <button onClick={() => go(c.slug)} className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition hover:border-neutral-900 ${c.slug === current ? 'border-neutral-900 bg-neutral-900 font-semibold text-white' : 'border-slate-200'}`}>
                  <span>{c.name}</span>
                  <span className="text-xs text-slate-500">{fmt(c.count)}</span>
                </button>
              </li>
            ))}
            {shown.length === 0 && <li className="col-span-full text-sm text-slate-500">No city matches “{q}”.</li>}
          </ul>
        </div>
      </dialog>
    </>
  );
}
