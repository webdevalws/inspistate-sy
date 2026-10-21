import { useEffect, useState } from 'react';
import { COMPARE_MAX, onCompareChange, readCompare, writeCompare } from './compare';

export default function CompareButton({ id }: { id: number }) {
  const [ids, setIds] = useState<number[]>([]);
  useEffect(() => {
    const u = () => setIds(readCompare());
    u();
    return onCompareChange(u);
  }, []);
  const added = ids.includes(id);
  const full = !added && ids.length >= COMPARE_MAX;
  return (
    <button
      type="button"
      disabled={full}
      title={full ? `You can compare up to ${COMPARE_MAX} projects` : undefined}
      onClick={() => writeCompare(added ? ids.filter((x) => x !== id) : [...ids, id])}
      className={`btn-ghost ${added ? 'border-brand-500 text-brand-700' : ''} disabled:opacity-50`}
      aria-pressed={added}
    >
      {added ? '✓ Added to compare' : '⇄ Compare'}
    </button>
  );
}
