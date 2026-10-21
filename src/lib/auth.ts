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
const cfg = env as unknown as { DEV_SHOW_OTP?: string; SMS_WEBHOOK_URL?: string };

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

export type SendResult = { ok: true; devCode?: string } | { ok: false; error: string; status: number };

export async function sendOtp(phone: string): Promise<SendResult> {
  const now = Date.now();
  const existing = await db().prepare('SELECT last_sent_at FROM otp_codes WHERE phone = ?').bind(phone).first<{ last_sent_at: number }>();
  if (existing && now - existing.last_sent_at < OTP_RESEND_MS) {
    return { ok: false, error: 'Please wait 30 seconds before requesting another code.', status: 429 };
  }
  const code = randomCode();
  await db()
    .prepare(`INSERT INTO otp_codes (phone, code_hash, attempts, expires_at, last_sent_at) VALUES (?, ?, 0, ?, ?)
      ON CONFLICT(phone) DO UPDATE SET code_hash = excluded.code_hash, attempts = 0, expires_at = excluded.expires_at, last_sent_at = excluded.last_sent_at`)
    .bind(phone, await sha256(`${phone}:${code}`), now + OTP_TTL_MS, now)
    .run();

  // Production: POST to an SMS gateway configured as a secret. Development: return the code to the UI.
  if (cfg.SMS_WEBHOOK_URL) {
    const res = await fetch(cfg.SMS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ to: `+91${phone}`, message: `${code} is your InspiState login code. It expires in 10 minutes.` }),
    });
    if (!res.ok) return { ok: false, error: 'Could not send the SMS. Please try again.', status: 502 };
    return { ok: true };
  }
  if (cfg.DEV_SHOW_OTP === '1') return { ok: true, devCode: code };
  return { ok: false, error: 'Login by SMS is not configured yet.', status: 503 };
}

export async function verifyOtp(phone: string, code: string): Promise<{ ok: true; user: User; token: string } | { ok: false; error: string }> {
  const row = await db().prepare('SELECT code_hash, attempts, expires_at FROM otp_codes WHERE phone = ?').bind(phone).first<{ code_hash: string; attempts: number; expires_at: number }>();
  if (!row || row.expires_at < Date.now()) return { ok: false, error: 'The code has expired. Request a new one.' };
  if (row.attempts >= OTP_MAX_ATTEMPTS) return { ok: false, error: 'Too many attempts. Request a new code.' };
  if (row.code_hash !== (await sha256(`${phone}:${code}`))) {
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
