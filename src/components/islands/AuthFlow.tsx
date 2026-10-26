import { useEffect, useState } from 'react';
import { readShortlist } from './shortlist';
import { ROLES, type Role } from '../../data/plans';
import { afterLogin, destinationAfterRegister, safeNext } from '../../lib/redirect';

// Mobile number → one-time code → (new accounts only) "I am a Buyer / Seller / Agent" registration, or
// "Continue with Google" (when configured) → the same registration for new accounts.
// Used inside the header login dialog and on the /login page.
type Step = 'phone' | 'code' | 'register';
interface Props {
  cities: { slug: string; name: string }[];
  next?: string | null;
  startAt?: Step;
  knownPhone?: string;
  defaultRole?: Role;
  /** Shown on the first step, e.g. why a Google sign-in was refused (/login?error=…). */
  initialError?: string;
  /** Show "Continue with Google" (only when GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are set). */
  google?: boolean;
  /** Register step pre-fill, e.g. the name and email of an account created with Google. */
  knownName?: string;
  knownEmail?: string;
}

// The official Google "G" mark.
const GOOGLE_G = (
  <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

const ROLE_ICONS: Record<Role, string> = {
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  seller: 'M3 11 12 4l9 7M5 10v10h14V10M10 20v-5h4v5',
  agent: 'M4 8h16v12H4zM9 8V5h6v3M4 13h16',
};

const label = 'font-mono text-[10px] uppercase tracking-[0.18em] text-[#1C1A17]/60';
const field = 'mt-1.5 w-full border-[0.5px] border-[#1C1A17]/25 bg-white px-3.5 py-3 text-[15px] text-[#1C1A17] outline-none transition placeholder:text-[#1C1A17]/35 focus:border-[#1C1A17]';
const primary = 'flex w-full cursor-pointer items-center justify-center gap-2 bg-[#1C1A17] px-5 py-3.5 font-mono text-[11px] uppercase tracking-[0.18em] text-sand-50 transition hover:bg-[#372f27] disabled:cursor-not-allowed disabled:opacity-50';

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Something went wrong. Please try again.');
  return data;
}

export default function AuthFlow({ cities, next = null, startAt = 'phone', knownPhone = '', defaultRole = 'user', initialError = '', google = false, knownName = '', knownEmail = '' }: Props) {
  const [step, setStep] = useState<Step>(startAt);
  const [phone, setPhone] = useState(knownPhone);
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [testCode, setTestCode] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const [role, setRole] = useState<Role>(defaultRole);
  const [name, setName] = useState(knownName);
  const [email, setEmail] = useState(knownEmail);
  const [city, setCity] = useState('');
  const [company, setCompany] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const go = (url: string | null) => { window.location.href = url ?? window.location.href; };

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError('');
    try { await fn(); } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }

  const sendCode = (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    return run(async () => {
      const r = await post<{ devCode?: string; testCode?: string }>('/api/auth/otp', { phone });
      setDevCode(r.devCode ?? null);
      setTestCode(r.testCode ?? null);
      setCode('');
      setResendIn(30);
      setStep('code');
    });
  };

  const verify = (e: React.SyntheticEvent) => {
    e.preventDefault();
    return run(async () => {
      const r = await post<{ needsRegistration: boolean; user: { role: Role | null } }>('/api/auth/verify', { phone, code, shortlist: readShortlist() });
      if (r.needsRegistration) setStep('register');
      // `next` wins; else sellers / agents go to their page; buyers stay where they are (afterLogin → null).
      else go(afterLogin(r.user.role, next));
    });
  };

  const register = (e: React.SyntheticEvent) => {
    e.preventDefault();
    return run(async () => {
      await post('/api/account/register', { role, name, email, city, company });
      go(destinationAfterRegister(role, next));
    });
  };

  const selected = ROLES.find((r) => r.key === role)!;
  // Google sign-in returns to `next`, else to the page the visitor is on (like phone login). The plain href is the
  // no-JS fallback; the click handler adds the current page.
  const googleHref = (to: string | null) => `/api/auth/google/start${to ? `?next=${encodeURIComponent(to)}` : ''}`;

  if (step === 'phone') return (
    <form onSubmit={sendCode}>
      <h2 className="font-display text-2xl font-bold tracking-tight !text-[#1C1A17]">Login / Register</h2>
      <p className="mt-1.5 text-sm text-[#1C1A17]/60">Enter your mobile number to continue.</p>
      <label className="mt-6 block">
        <span className={label}>Mobile number</span>
        <span className="mt-1.5 flex">
          <span className="grid place-items-center border-[0.5px] border-r-0 border-[#1C1A17]/25 bg-sand-100 px-3.5 text-[15px] text-[#1C1A17]/70">+91</span>
          <input autoFocus required value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} pattern="[6-9][0-9]{9}" title="10-digit Indian mobile number" inputMode="tel" autoComplete="tel" placeholder="98765 43210" className={field.replace('mt-1.5 ', '')} />
        </span>
      </label>
      {error && <p className="mt-3 text-sm text-rose-700" role="alert">{error}</p>}
      <button className={`${primary} mt-5`} disabled={busy || phone.length !== 10}>{busy ? 'Sending code…' : 'Continue →'}</button>
      {google && (
        <>
          <div className="mt-5 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#1C1A17]/45" aria-hidden="true"><span className="h-px flex-1 bg-[#1C1A17]/15" />or<span className="h-px flex-1 bg-[#1C1A17]/15" /></div>
          <a href={googleHref(next)} onClick={(e) => { e.currentTarget.href = googleHref(safeNext(next) ?? `${window.location.pathname}${window.location.search}`); }} className="mt-5 flex w-full cursor-pointer items-center justify-center gap-2.5 border-[0.5px] border-[#1C1A17]/25 bg-white px-5 py-3.5 font-mono text-[11px] uppercase tracking-[0.18em] text-[#1C1A17] transition hover:border-[#1C1A17]">{GOOGLE_G}Continue with Google</a>
        </>
      )}
      <p className="mt-4 text-xs leading-relaxed text-[#1C1A17]/50">We’ll send a one-time code by SMS. By continuing you agree to our <a href="/terms" className="underline">Terms</a> and <a href="/privacy" className="underline">Privacy policy</a>.</p>
    </form>
  );

  if (step === 'code') return (
    <form onSubmit={verify}>
      <h2 className="font-display text-2xl font-bold tracking-tight !text-[#1C1A17]">Verify your number</h2>
      <p className="mt-1.5 text-sm text-[#1C1A17]/60">Enter the 6-digit code sent to <b className="text-[#1C1A17]">+91 {phone}</b> · <button type="button" onClick={() => setStep('phone')} className="cursor-pointer underline">Change</button></p>
      {devCode && <p className="mt-4 border-[0.5px] border-accent-400 bg-accent-50 px-3 py-2 text-sm text-accent-800">Development mode — no SMS sent. Your code is <b className="font-mono">{devCode}</b></p>}
      {testCode && <p className="mt-4 border-[0.5px] border-accent-400 bg-accent-50 px-3 py-2 text-sm text-accent-800">Development mode — test code enabled. Enter <b className="font-mono">{testCode}</b> for any number.</p>}
      <input autoFocus required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="••••••" aria-label="One-time code" className={`${field} mt-5 text-center font-mono text-2xl tracking-[0.6em]`} />
      {error && <p className="mt-3 text-sm text-rose-700" role="alert">{error}</p>}
      <button className={`${primary} mt-5`} disabled={busy || code.length !== 6}>{busy ? 'Verifying…' : 'Verify & continue →'}</button>
      <button type="button" onClick={() => sendCode()} disabled={busy || resendIn > 0} className="mt-3 w-full cursor-pointer font-mono text-[10px] uppercase tracking-[0.18em] text-[#1C1A17]/70 underline-offset-4 hover:underline disabled:cursor-default disabled:no-underline disabled:opacity-50">
        {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
      </button>
    </form>
  );

  return (
    <form onSubmit={register}>
      <h2 className="font-display text-2xl font-bold tracking-tight !text-[#1C1A17]">Create your account</h2>
      <p className="mt-1.5 text-sm text-[#1C1A17]/60">Tell us who you are so we can set up the right account.</p>

      <fieldset className="mt-5">
        <legend className={label}>I am a</legend>
        <div className="mt-2 grid grid-cols-3 gap-2" role="radiogroup">
          {ROLES.map((r) => {
            const on = r.key === role;
            return (
              <label key={r.key} className={`relative flex cursor-pointer flex-col gap-1.5 border-[0.5px] p-3 transition ${on ? 'border-[#1C1A17] bg-[#1C1A17] text-sand-50' : 'border-[#1C1A17]/25 bg-white text-[#1C1A17] hover:border-[#1C1A17]/60'}`}>
                <input type="radio" name="role" value={r.key} checked={on} onChange={() => setRole(r.key)} className="sr-only" />
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ROLE_ICONS[r.key]} /></svg>
                <span className="font-display text-[15px] font-bold leading-none">{r.label}</span>
                <span className={`text-[11px] leading-snug ${on ? 'text-sand-50/70' : 'text-[#1C1A17]/55'}`}>{r.sub}</span>
              </label>
            );
          })}
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#1C1A17]/65">
          {selected.perks.map((p) => <li key={p}>✓ {p}</li>)}
        </ul>
      </fieldset>

      <div className="mt-5 grid gap-4">
        <label className="block"><span className={label}>Full name</span><input required minLength={2} maxLength={100} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Your full name" className={field} /></label>
        {role === 'agent' && (
          <label className="block"><span className={label}>Agency / firm name</span><input required minLength={2} maxLength={120} value={company} onChange={(e) => setCompany(e.target.value)} autoComplete="organization" placeholder="e.g. Skyline Realty" className={field} /></label>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block"><span className={label}>Email <span className="normal-case tracking-normal">(optional)</span></span><input type="email" maxLength={200} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" className={field} /></label>
          <label className="block"><span className={label}>City <span className="normal-case tracking-normal">(optional)</span></span>
            <select value={city} onChange={(e) => setCity(e.target.value)} className={`${field} cursor-pointer`}>
              <option value="">Choose a city</option>
              {cities.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
          </label>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-rose-700" role="alert">{error}</p>}
      <button className={`${primary} mt-6`} disabled={busy}>{busy ? 'Creating account…' : `Create account as ${selected.label} →`}</button>
    </form>
  );
}
