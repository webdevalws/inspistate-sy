import { useEffect, useState } from 'react';
import { onShortlistChange, readShortlist, toggleShortlist, type ShortlistItem } from './shortlist';

export default function ShortlistButton({ kind, id, withLabel = false }: ShortlistItem & { withLabel?: boolean }) {
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    const update = () => setSaved(readShortlist().some((i) => i.kind === kind && i.id === id));
    update();
    return onShortlistChange(update);
  }, [kind, id]);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setSaved(toggleShortlist({ kind, id }));
      }}
      aria-pressed={saved}
      aria-label={saved ? 'Remove from shortlist' : 'Add to shortlist'}
      className={
        withLabel
          ? `btn-ghost ${saved ? 'border-rose-300 text-rose-600' : ''}`
          : 'grid h-9 w-9 place-items-center rounded-full bg-white/95 shadow hover:scale-105 transition'
      }
    >
      <svg viewBox="0 0 24 24" className={`h-5 w-5 ${saved ? 'fill-rose-500 stroke-rose-500' : 'fill-none stroke-slate-600'}`} strokeWidth="2" aria-hidden="true">
        <path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9Z" />
      </svg>
      {withLabel && (saved ? 'Shortlisted' : 'Shortlist')}
    </button>
  );
}
