// Brochures are lead-gated on the server: a project's /brochure page opens only for a visitor who made a
// brochure enquiry for that project. After the enquiry, /api/enquiry stores "<leadId>.<sig>" in an
// HttpOnly cookie, where sig = SHA-256 of the lead id and the visitor's phone. The page re-reads the lead
// and recomputes sig, so a cookie can't be forged without knowing the phone used for that lead.
// Logged-in users also pass if one of their own brochure leads is for the project.
import { env } from 'cloudflare:workers';
import type { AstroCookies } from 'astro';
import { sha256, type User } from './auth';

const COOKIE = 'is_brochures';
const MAX_ENTRIES = 20;
const MAX_AGE = 30 * 86400; // 30 days

const sig = async (leadId: number, phone: string) => (await sha256(`brochure:${leadId}:${phone}`)).slice(0, 32);
const entries = (cookies: AstroCookies) =>
  (cookies.get(COOKIE)?.value ?? '').split(',').map((e) => e.split('.')).filter(([id, s]) => /^\d+$/.test(id ?? '') && /^[0-9a-f]{32}$/.test(s ?? '')).map(([id, s]) => ({ id: Number(id), sig: s }));

/** Called by /api/enquiry after saving a brochure lead. */
export async function rememberBrochureLead(cookies: AstroCookies, leadId: number, phone: string, secure: boolean) {
  const list = [...entries(cookies).map((e) => `${e.id}.${e.sig}`), `${leadId}.${await sig(leadId, phone)}`].slice(-MAX_ENTRIES);
  cookies.set(COOKIE, list.join(','), { path: '/', httpOnly: true, sameSite: 'lax', secure, maxAge: MAX_AGE });
}

/** True when this visitor made a brochure enquiry for the project (cookie) or, if logged in, has one on their account. */
export async function canOpenBrochure(cookies: AstroCookies, user: User | null, projectId: number): Promise<boolean> {
  if (user) {
    const own = await env.DB.prepare("SELECT 1 FROM leads WHERE user_id = ? AND kind = 'brochure' AND project_id = ? LIMIT 1").bind(user.id, projectId).first();
    if (own) return true;
  }
  const list = entries(cookies);
  if (!list.length) return false;
  const { results } = await env.DB.prepare(`SELECT id, phone FROM leads WHERE kind = 'brochure' AND project_id = ? AND id IN (${list.map(() => '?').join(',')})`)
    .bind(projectId, ...list.map((e) => e.id))
    .all<{ id: number; phone: string }>();
  for (const r of results) {
    const e = list.find((x) => x.id === r.id);
    if (e && e.sig === (await sig(r.id, r.phone))) return true;
  }
  return false;
}
