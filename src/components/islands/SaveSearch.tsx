import { useState } from 'react';

export default function SaveSearch({ label, loggedIn }: { label: string; loggedIn: boolean }) {
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  async function save() {
    const url = window.location.pathname + window.location.search;
    if (!loggedIn) return void (window.location.href = `/login?next=${encodeURIComponent(url)}`);
    setState('saving');
    const res = await fetch('/api/account/saved-searches', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ label, url }) }).catch(() => null);
    setState(res?.ok ? 'saved' : 'error');
  }
  return (
    <button type="button" onClick={save} disabled={state === 'saving' || state === 'saved'} className="btn-ghost py-2">
      {state === 'saved' ? '✓ Search saved' : state === 'error' ? 'Retry save' : '🔔 Save search'}
    </button>
  );
}
