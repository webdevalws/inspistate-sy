import { useEffect, useRef, useState } from 'react';

type Msg = { from: 'bot' | 'me'; text: string; link?: { href: string; label: string } };
const QUICK = ['2 BHK for sale in Powai under 2 Cr', 'Furnished flat for rent in Whitefield', 'Ready to move villas in Gurugram', 'Talk to an advisor'];

// A rule-based helper (src/lib/nlsearch.ts via /api/ask), not a language model — the copy says so.
export default function ChatWidget({ whatsapp, city }: { whatsapp?: string; city?: string }) {
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState(true);
  const [msgs, setMsgs] = useState<Msg[]>([{ from: 'bot', text: 'Hi! Describe the home you want — city, area, BHK, budget — and I’ll turn it into a search. I’m a simple rule-based helper, not an AI.' }]);
  const [text, setText] = useState('');
  const [mode, setMode] = useState<'ask' | 'callback' | 'done'>('ask');
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { if (sessionStorage.getItem('is:chat-hint') === '0') setHint(false); } catch { /* ignore */ }
  }, []);
  useEffect(() => end.current?.scrollIntoView({ block: 'end' }), [msgs, open]);

  const add = (m: Msg) => setMsgs((x) => [...x, m]);
  function closeHint() {
    setHint(false);
    try { sessionStorage.setItem('is:chat-hint', '0'); } catch { /* ignore */ }
  }

  async function ask(q: string) {
    if (!q.trim()) return;
    add({ from: 'me', text: q });
    setText('');
    if (/advisor|call|talk|human|agent/i.test(q) && q.split(' ').length < 6) {
      setMode('callback');
      return add({ from: 'bot', text: 'Sure — share your name and mobile number and an advisor will call you within 30 minutes (9am–9pm).' });
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/ask?q=${encodeURIComponent(q)}${city ? `&city=${encodeURIComponent(city)}` : ''}`);
      const body = (await res.json()) as { url?: string; summary?: string[] };
      if (!body.url) throw new Error();
      add({ from: 'bot', text: `Here’s what I found for: ${body.summary?.join(' · ')}`, link: { href: body.url, label: 'See matching properties →' } });
      add({ from: 'bot', text: 'Want an advisor to shortlist options for you? Type “talk to an advisor”.' });
    } catch {
      add({ from: 'bot', text: 'I couldn’t understand that. Try “3 BHK flat in Baner under 1.5 crore”.' });
    } finally {
      setBusy(false);
    }
  }

  async function callback(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    setBusy(true);
    const lastAsk = [...msgs].reverse().find((m) => m.from === 'me' && !/advisor|call|talk/i.test(m.text))?.text;
    const res = await fetch('/api/enquiry', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: f.name, phone: f.phone, subject: `Assistant: ${lastAsk ?? 'general enquiry'}`, kind: 'chat', page: window.location.pathname }),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) return add({ from: 'bot', text: 'That number doesn’t look right — please enter a 10-digit mobile number.' });
    add({ from: 'me', text: `${f.name}, +91 ${f.phone}` });
    add({ from: 'bot', text: `Thanks ${f.name}! An advisor will call you shortly.` });
    setMode('done');
  }

  return (
    <div className="print:hidden fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="flex h-[520px] max-h-[calc(100vh-7rem)] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl" role="dialog" aria-label="Property assistant">
          <div className="flex items-center justify-between bg-neutral-900 px-4 py-3 text-white">
            <div className="flex items-center gap-2"><span className="text-accent-400">✦</span><div><p className="font-semibold">Property assistant</p><p className="text-xs text-white/60">Rule-based search helper (not an AI model)</p></div></div>
            <button onClick={() => setOpen(false)} aria-label="Minimize" className="rounded-md px-2 py-1 hover:bg-white/10">—</button>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto bg-neutral-50 p-3" aria-live="polite">
            {msgs.map((m, i) => (
              <div key={i} className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm ${m.from === 'bot' ? 'bg-white text-neutral-700 shadow-sm' : 'ml-auto bg-neutral-900 text-white'}`}>
                {m.text}
                {m.link && <a href={m.link.href} className="mt-2 block rounded-lg bg-accent-500 px-3 py-2 text-center font-semibold text-black hover:bg-accent-400">{m.link.label}</a>}
              </div>
            ))}
            {msgs.length === 1 && (
              <div className="flex flex-wrap gap-2 pt-1">{QUICK.map((q) => <button key={q} onClick={() => ask(q)} className="rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium hover:border-neutral-900">{q}</button>)}</div>
            )}
            {busy && <p className="text-xs text-neutral-400">Searching…</p>}
            <div ref={end} />
          </div>
          {mode === 'callback' ? (
            <form onSubmit={callback} className="space-y-2 border-t border-neutral-200 p-3">
              <input name="name" required maxLength={100} className="input py-2" placeholder="Your name" autoComplete="name" />
              <input name="phone" required pattern="[6-9][0-9]{9}" title="10-digit Indian mobile number" className="input py-2" placeholder="Mobile number" inputMode="tel" autoComplete="tel" />
              <button className="btn-primary w-full py-2" disabled={busy}>Request call back</button>
            </form>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); ask(text); }} className="flex gap-2 border-t border-neutral-200 p-3">
              <input value={text} onChange={(e) => setText(e.target.value)} className="input py-2" placeholder="e.g. 3 BHK in Baner under 1.5 Cr" aria-label="Ask the assistant" />
              <button className="btn-dark px-3" disabled={busy || !text.trim()} aria-label="Send">➤</button>
            </form>
          )}
          {mode === 'done' && whatsapp && <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener" className="mx-3 mb-3 rounded-lg bg-[#25D366] py-2 text-center text-sm font-semibold text-white">Continue on WhatsApp</a>}
        </div>
      )}
      <div className="flex items-center gap-3">
        {hint && !open && (
          <div className="relative rounded-xl bg-white py-3 pl-4 pr-8 text-[15px] font-medium leading-snug text-neutral-900 shadow-xl">
            Describe a home —<br />I’ll turn it into a search
            <button onClick={closeHint} aria-label="Dismiss" className="absolute right-2 top-1.5 text-neutral-400 hover:text-neutral-900">×</button>
          </div>
        )}
        <button onClick={() => { setOpen(!open); closeHint(); }} aria-expanded={open} aria-label="Open property assistant"
          className="grid h-16 w-16 place-items-center rounded-full bg-white text-2xl shadow-[0_0_24px_6px_rgba(245,179,22,0.45),0_0_40px_10px_rgba(168,85,247,0.25)] transition hover:scale-105">
          <span className="bg-gradient-to-br from-accent-500 via-rose-500 to-violet-600 bg-clip-text text-3xl text-transparent">✦</span>
        </button>
      </div>
    </div>
  );
}
