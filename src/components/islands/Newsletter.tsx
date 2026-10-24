import { useState } from 'react';

export type NewsletterResult = 'ok' | 'invalid' | 'error';
const MESSAGES: Record<NewsletterResult, string> = {
  ok: 'Subscribed — watch your inbox for market updates.',
  invalid: 'Enter a valid email address.',
  error: 'Could not subscribe. Try again.',
};

/**
 * Footer newsletter signup. With JS it posts JSON and shows the result in place. It is also a real form
 * (method="post" action="/api/newsletter"), so a submit before the island has loaded — or without JS — still
 * subscribes: the API redirects back to `back` with ?newsletter=ok|invalid|error, passed in here as `result`.
 */
export default function Newsletter({ back = '/', result }: { back?: string; result?: NewsletterResult }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>(result === 'ok' ? 'done' : result ? 'error' : 'idle');
  const [msg, setMsg] = useState(result ? MESSAGES[result] : '');
  async function submit(e: React.SyntheticEvent) {
    e.preventDefault();
    setState('sending');
    const res = await fetch('/api/newsletter', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) }).catch(() => null);
    const body = (await res?.json().catch(() => null)) as { error?: string } | null;
    if (res?.ok) { setState('done'); setMsg(MESSAGES.ok); setEmail(''); }
    else { setState('error'); setMsg(body?.error ?? MESSAGES.error); }
  }
  return (
    <form method="post" action="/api/newsletter" onSubmit={submit}>
      <input type="hidden" name="back" value={back} />
      <div className="flex items-stretch border-b-[0.5px] border-sand-50/40 transition focus-within:border-sand-50">
        <input type="email" name="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email address" aria-label="Email address" className="min-w-0 flex-1 bg-transparent py-3 text-[15px] text-sand-50 outline-none placeholder:text-sand-50/40" />
        <button disabled={state === 'sending'} className="my-1.5 shrink-0 cursor-pointer bg-sand-50 px-4 font-mono text-[10px] uppercase tracking-[0.18em] text-[#1C1A17] transition hover:bg-white disabled:opacity-60">{state === 'sending' ? 'Sending…' : 'Subscribe →'}</button>
      </div>
      {msg && <p className={`mt-2 text-xs ${state === 'done' ? 'text-accent-300' : 'text-rose-300'}`} role="status">{msg}</p>}
    </form>
  );
}
