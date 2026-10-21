import { useState } from 'react';

export default function Newsletter() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');
  async function submit(e: React.SyntheticEvent) {
    e.preventDefault();
    setState('sending');
    const res = await fetch('/api/newsletter', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) }).catch(() => null);
    const body = (await res?.json().catch(() => null)) as { error?: string } | null;
    if (res?.ok) { setState('done'); setMsg('Subscribed — watch your inbox for market updates.'); setEmail(''); }
    else { setState('error'); setMsg(body?.error ?? 'Could not subscribe. Try again.'); }
  }
  return (
    <form onSubmit={submit}>
      <div className="flex items-stretch border-b-[0.5px] border-sand-50/40 transition focus-within:border-sand-50">
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email address" aria-label="Email address" className="min-w-0 flex-1 bg-transparent py-3 text-[15px] text-sand-50 outline-none placeholder:text-sand-50/40" />
        <button disabled={state === 'sending'} className="my-1.5 shrink-0 cursor-pointer bg-sand-50 px-4 font-mono text-[10px] uppercase tracking-[0.18em] text-[#1C1A17] transition hover:bg-white disabled:opacity-60">{state === 'sending' ? 'Sending…' : 'Subscribe →'}</button>
      </div>
      {msg && <p className={`mt-2 text-xs ${state === 'done' ? 'text-accent-300' : 'text-rose-300'}`} role="status">{msg}</p>}
    </form>
  );
}
