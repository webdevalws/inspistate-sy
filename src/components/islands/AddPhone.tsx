import { useState } from 'react';

// Account page, accounts created with Google: add a mobile number (needed to post listings and request a plan).
// Mobile number → code by SMS (same rules as login) → saved; it never logs in or creates another account.
const label = 'font-mono text-[10px] uppercase tracking-[0.18em] text-[#1C1A17]/60';
const input = 'input mt-1.5 rounded-none font-sans text-[15px] normal-case tracking-normal';

async function post(body: unknown): Promise<{ devCode?: string; testCode?: string }> {
  const res = await fetch('/api/account/phone', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as { error?: string; devCode?: string; testCode?: string };
  if (!res.ok) throw new Error(data.error ?? 'Something went wrong. Please try again.');
  return data;
}

export default function AddPhone() {
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError('');
    try { await fn(); } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }

  const send = (e: React.SyntheticEvent) => {
    e.preventDefault();
    return run(async () => {
      const r = await post({ action: 'send', phone });
      setNote(r.devCode ? `Development mode — no SMS sent. Your code is ${r.devCode}` : r.testCode ? `Development mode — test code enabled. Enter ${r.testCode}.` : '');
      setCode('');
      setStep('code');
    });
  };

  const verify = (e: React.SyntheticEvent) => {
    e.preventDefault();
    return run(async () => {
      await post({ action: 'verify', phone, code });
      window.location.href = '/account?phone=added#profile';
    });
  };

  return (
    <div>
      {step === 'phone' ? (
        <form onSubmit={send} className="grid gap-4 border-[0.5px] border-[#1C1A17]/15 bg-white p-5 sm:grid-cols-3 sm:items-end">
          <label className={`${label} sm:col-span-2`}>Mobile number
            <input required value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} pattern="[6-9][0-9]{9}" title="10-digit Indian mobile number" inputMode="tel" autoComplete="tel" placeholder="98765 43210" className={input} />
          </label>
          <button className="ed-btn ed-btn-dark" disabled={busy || phone.length !== 10}>{busy ? 'Sending code…' : 'Send code'}</button>
        </form>
      ) : (
        <form onSubmit={verify} className="grid gap-4 border-[0.5px] border-[#1C1A17]/15 bg-white p-5 sm:grid-cols-3 sm:items-end">
          <p className="text-sm text-[#1C1A17]/60 sm:col-span-3">Enter the 6-digit code sent to <b className="text-[#1C1A17]">+91 {phone}</b> · <button type="button" onClick={() => setStep('phone')} className="cursor-pointer underline">Change</button></p>
          {note && <p className="border-[0.5px] border-accent-400 bg-accent-50 px-3 py-2 text-sm text-accent-800 sm:col-span-3">{note}</p>}
          <label className={`${label} sm:col-span-2`}>Code
            <input required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="••••••" className={input} />
          </label>
          <button className="ed-btn ed-btn-dark" disabled={busy || code.length !== 6}>{busy ? 'Verifying…' : 'Verify & save'}</button>
        </form>
      )}
      {error && <p className="mt-3 text-sm text-rose-700" role="alert">{error}</p>}
    </div>
  );
}
