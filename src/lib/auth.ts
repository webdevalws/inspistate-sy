// Phone + OTP authentication with server-side sessions in D1.
// Codes and session tokens are stored only as SHA-256 hashes.
import { env } from 'cloudflare:workers';
import type { AstroCookies } from 'astro';
import type { Role } from '../data/plans';

/** `role` stays null until the new account completes registration (picks User, Seller or Agent). */
export interface User { id: number; phone: string; name: string | null; email: string | null; role: Role | null; city_slug: string | null; company: string | null }
const USER_COLS = 'id, phone, name, email, role, city_slug, company';

export const SESSION_COOKIE = 'is_session';
const SESSION_DAYS = 30;
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_MS = 30 * 1000;
const OTP_MAX_ATTEMPTS = 5;

const db = () => env.DB;
const cfg = env as unknown as { DEV_SHOW_OTP?: string; SMS_WEBHOOK_URL?: string; TEST_OTP?: string };

// Dev-only login helpers. `import.meta.env.DEV` is true under `astro dev` and replaced with `false` by
// `astro build`, so neither works in a built Worker even if the variable is set.
/** Local test code that logs in any number: needs a dev server AND TEST_OTP=<6 digits> in .dev.vars. */
function testOtp(): string | null {
  if (!import.meta.env.DEV) return null;
  const c = cfg.TEST_OTP?.trim() ?? '';
  return /^\d{6}$/.test(c) ? c : null;
}
const devShowOtp = () => import.meta.env.DEV && cfg.DEV_SHOW_OTP === '1';

export async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const normalizePhone = (raw: string) => {
  const d = String(raw).replace(/\D/g, '').slice(-10);
  return /^[6-9]\d{9}$/.test(d) ? d : null;
};

function randomCode(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return String(n).padStart(6, '0');
}

export type SendResult = { ok: true; devCode?: string; testCode?: string } | { ok: false; error: string; status: number };

const minutesLeft = (until: number) => Math.max(1, Math.ceil((until - Date.now()) / 60000));
const tooManyAttempts = (until: number) => `Too many attempts. Try again in ${minutesLeft(until)} minute${minutesLeft(until) === 1 ? '' : 's'}.`;

/** Daily caps on login codes, counted in the general `ai_usage` daily counter (keys are hashed). */
const OTP_PER_PHONE_PER_DAY = 5;
const OTP_PER_IP_PER_DAY = 20;

export async function sendOtp(phone: string, clientIp: string): Promise<SendResult> {
  const now = Date.now();
  const existing = await db().prepare('SELECT attempts, expires_at, last_sent_at FROM otp_codes WHERE phone = ?').bind(phone).first<{ attempts: number; expires_at: number; last_sent_at: number }>();
  if (existing && now - existing.last_sent_at < OTP_RESEND_MS) {
    return { ok: false, error: 'Please wait 30 seconds before requesting another code.', status: 429 };
  }
  // While the previous code is still valid, a resend sends a fresh code but keeps its wrong-attempt
  // count and expiry, so resending can't reset or extend a lockout. After expiry everything starts over.
  const live = existing && existing.expires_at > now ? existing : null;
  if (live && live.attempts >= OTP_MAX_ATTEMPTS) return { ok: false, error: tooManyAttempts(live.expires_at), status: 429 };
  const expiresAt = live ? live.expires_at : now + OTP_TTL_MS;

  // Count this request against both daily caps (UTC day) before any code is created or sent.
  const day = new Date(now).toISOString().slice(0, 10);
  const bump = `INSERT INTO ai_usage (client, feature, day, count) VALUES (?, ?, ?, 1)
    ON CONFLICT(client, feature, day) DO UPDATE SET count = count + 1 RETURNING count`;
  const [perPhone, perIp] = await db().batch<{ count: number }>([
    db().prepare(bump).bind(await sha256(phone), 'otp-phone', day),
    db().prepare(bump).bind(await sha256(clientIp), 'otp-ip', day),
  ]);
  if ((perPhone.results[0]?.count ?? 0) > OTP_PER_PHONE_PER_DAY || (perIp.results[0]?.count ?? 0) > OTP_PER_IP_PER_DAY) {
    return { ok: false, error: 'Daily limit for login codes reached. Please try again tomorrow.', status: 429 };
  }

  const code = randomCode();
  await db()
    .prepare(`INSERT INTO otp_codes (phone, code_hash, attempts, expires_at, last_sent_at) VALUES (?, ?, 0, ?, ?)
      ON CONFLICT(phone) DO UPDATE SET code_hash = excluded.code_hash,
        attempts = CASE WHEN otp_codes.expires_at > ? THEN otp_codes.attempts ELSE 0 END,
        expires_at = CASE WHEN otp_codes.expires_at > ? THEN otp_codes.expires_at ELSE excluded.expires_at END,
        last_sent_at = excluded.last_sent_at`)
    .bind(phone, await sha256(`${phone}:${code}`), now + OTP_TTL_MS, now, now, now)
    .run();

  // Production: POST to an SMS gateway configured as a secret. Development: return the code to the UI.
  const testCode = testOtp() ?? undefined;
  if (cfg.SMS_WEBHOOK_URL) {
    const smsFailed = { ok: false, error: 'Could not send the SMS. Please try again.', status: 502 } as const;
    try {
      const res = await fetch(cfg.SMS_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ to: `+91${phone}`, message: `${code} is your InspiState login code. It expires in ${minutesLeft(expiresAt)} minutes.` }),
      });
      if (!res.ok) return smsFailed;
    } catch {
      // Network error, DNS failure or a bad URL: answer clearly instead of a 500.
      return smsFailed;
    }
    return { ok: true, testCode };
  }
  if (devShowOtp()) return { ok: true, devCode: code, testCode };
  if (testCode) return { ok: true, testCode };
  return { ok: false, error: 'Login by SMS is not configured yet.', status: 503 };
}

export async function verifyOtp(phone: string, code: string): Promise<{ ok: true; user: User; token: string } | { ok: false; error: string }> {
  const row = await db().prepare('SELECT code_hash, attempts, expires_at FROM otp_codes WHERE phone = ?').bind(phone).first<{ code_hash: string; attempts: number; expires_at: number }>();
  if (!row || row.expires_at < Date.now()) return { ok: false, error: 'The code has expired. Request a new one.' };
  if (row.attempts >= OTP_MAX_ATTEMPTS) return { ok: false, error: tooManyAttempts(row.expires_at) };
  // The dev test code still needs a requested, unexpired code row and respects the attempt limit.
  if (code !== testOtp() && row.code_hash !== (await sha256(`${phone}:${code}`))) {
    await db().prepare('UPDATE otp_codes SET attempts = attempts + 1 WHERE phone = ?').bind(phone).run();
    return { ok: false, error: 'Incorrect code.' };
  }
  await db().prepare('DELETE FROM otp_codes WHERE phone = ?').bind(phone).run();
  const user = (await db()
    .prepare(`INSERT INTO users (phone) VALUES (?) ON CONFLICT(phone) DO UPDATE SET phone = excluded.phone RETURNING ${USER_COLS}`)
    .bind(phone)
    .first<User>())!;
  const token = [...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, '0')).join('');
  await db().prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').bind(await sha256(token), user.id, Date.now() + SESSION_DAYS * 86400000).run();
  return { ok: true, user, token };
}

export function setSessionCookie(cookies: AstroCookies, token: string, secure: boolean) {
  cookies.set(SESSION_COOKIE, token, { path: '/', httpOnly: true, sameSite: 'lax', secure, maxAge: SESSION_DAYS * 86400 });
}

export async function userFromCookies(cookies: AstroCookies): Promise<User | null> {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
  return db()
    .prepare(`SELECT ${USER_COLS.split(', ').map((c) => `u.${c}`).join(', ')} FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?`)
    .bind(await sha256(token), Date.now())
    .first<User>();
}

export async function logout(cookies: AstroCookies) {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (token) await db().prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(token)).run();
  cookies.delete(SESSION_COOKIE, { path: '/' });
}

export interface Registration { name: string; email: string | null; role: Role; citySlug: string; company: string | null }

/** Finish a new account (or update an existing one's role and details). */
export async function completeRegistration(userId: number, r: Registration) {
  await db()
    .prepare('UPDATE users SET name = ?, email = ?, role = ?, city_slug = ?, company = ? WHERE id = ?')
    .bind(r.name, r.email, r.role, r.citySlug, r.role === 'agent' ? r.company : null, userId)
    .run();
}

export async function setRole(userId: number, role: Role) {
  await db().prepare('UPDATE users SET role = ? WHERE id = ?').bind(role, userId).run();
}
