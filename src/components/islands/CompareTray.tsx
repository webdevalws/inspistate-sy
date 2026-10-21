import { useEffect, useState } from 'react';
import { onCompareChange, readCompare, writeCompare } from './compare';

export default function CompareTray() {
  const [ids, setIds] = useState<number[]>([]);
  useEffect(() => {
    const u = () => setIds(readCompare());
    u();
    return onCompareChange(u);
  }, []);
  if (!ids.length || window.location.pathname === '/compare') return null;
  return (
    <div className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full border border-slate-200 bg-white py-2 pl-5 pr-2 shadow-xl">
      <span className="text-sm font-semibold">{ids.length} project{ids.length > 1 ? 's' : ''} to compare</span>
      <button onClick={() => writeCompare([])} className="text-xs text-slate-500 hover:underline">Clear</button>
      <a href={`/compare?ids=${ids.join(',')}`} className="btn-primary rounded-full py-2">Compare now</a>
    </div>
  );
}
