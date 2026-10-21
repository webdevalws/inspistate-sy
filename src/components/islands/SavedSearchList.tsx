import { useState } from 'react';

type S = { id: number; label: string; url: string; created: string };

export default function SavedSearchList({ initial }: { initial: S[] }) {
  const [items, setItems] = useState(initial);
  async function remove(id: number) {
    const res = await fetch(`/api/account/saved-searches?id=${id}`, { method: 'DELETE' }).catch(() => null);
    if (res?.ok) setItems(items.filter((i) => i.id !== id));
  }
  if (!items.length) return <p className="text-sm text-slate-500">No saved searches yet. Run a search and tap “Save search”.</p>;
  return (
    <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
      {items.map((s) => (
        <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3">
          <a href={s.url} className="min-w-0">
            <span className="block truncate font-semibold text-brand-700 hover:underline">{s.label}</span>
            <span className="text-xs text-slate-500">Saved {s.created}</span>
          </a>
          <button onClick={() => remove(s.id)} className="text-sm text-rose-600 hover:underline">Delete</button>
        </li>
      ))}
    </ul>
  );
}
