import { useEffect, useState } from 'react';
import { onShortlistChange, readShortlist, toggleShortlist } from './shortlist';

type Item = { kind: 'listing' | 'project'; id: number; title: string; price: string; href: string; sub: string; hue: number; photo?: string | null };

export default function ShortlistView() {
  const [items, setItems] = useState<Item[] | null>(null);

  useEffect(() => {
    async function load() {
      const saved = readShortlist();
      if (!saved.length) return setItems([]);
      const ids = (k: string) => saved.filter((s) => s.kind === k).map((s) => s.id).join(',');
      try {
        const res = await fetch(`/api/items?listings=${ids('listing')}&projects=${ids('project')}`);
        setItems(((await res.json()) as { items: Item[] }).items);
      } catch {
        setItems([]);
      }
    }
    load();
    return onShortlistChange(load);
  }, []);

  if (items === null) return <p className="text-slate-500">Loading your shortlist…</p>;
  if (!items.length)
    return (
      <div className="card p-10 text-center">
        <p className="text-lg font-semibold">Your shortlist is empty</p>
        <p className="mt-1 text-sm text-slate-500">Tap the heart on any property or project to save it here.</p>
        <a href="/" className="btn-primary mt-4">Start searching</a>
      </div>
    );

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((i) => (
        <li key={i.kind + i.id} className="card overflow-hidden">
          <a href={i.href} className="block h-28 bg-cover bg-center" style={{ backgroundImage: i.photo ? `url(${i.photo})` : `linear-gradient(135deg, hsl(${i.hue} 45% 78%), hsl(${(i.hue + 40) % 360} 50% 62%))` }} aria-hidden="true" tabIndex={-1} />
          <div className="p-4">
            <span className="chip mb-2">{i.kind === 'project' ? 'Project' : 'Property'}</span>
            <a href={i.href} className="block font-semibold hover:text-brand-700">{i.title}</a>
            <p className="text-sm text-slate-500">{i.sub}</p>
            <div className="mt-3 flex items-center justify-between">
              <p className="font-extrabold">{i.price}</p>
              <button className="text-sm font-semibold text-rose-600 hover:underline" onClick={() => toggleShortlist({ kind: i.kind, id: i.id })}>Remove</button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
