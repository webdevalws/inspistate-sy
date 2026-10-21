import { useEffect, useState } from 'react';
import { onShortlistChange, readShortlist, syncShortlistFromServer } from './shortlist';

export default function ShortlistCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const update = () => setCount(readShortlist().length);
    update();
    syncShortlistFromServer();
    return onShortlistChange(update);
  }, []);
  if (!count) return null;
  return (
    <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-white">
      {count}
    </span>
  );
}
