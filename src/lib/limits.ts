// Abuse controls shared by API routes: the caller's IP, daily counters in `ai_usage` (a general daily
// counter keyed by hashed client + feature + UTC day), and a same-site check.
import { env } from 'cloudflare:workers';
import type { APIContext } from 'astro';
import { sha256 } from './auth';

/** The client IP, or 'unknown' when the runtime can't tell (Astro throws in that case). */
export function clientIp(ctx: Pick<APIContext, 'clientAddress'>): string {
  try { return ctx.clientAddress || 'unknown'; } catch { return 'unknown'; }
}

/** Counts one use of `feature` for `key` today and returns true once the count is above `limit`. */
export async function overDailyLimit(feature: string, key: string, limit: number): Promise<boolean> {
  const day = new Date().toISOString().slice(0, 10);
  const count = await env.DB.prepare(`INSERT INTO ai_usage (client, feature, day, count) VALUES (?, ?, ?, 1)
    ON CONFLICT(client, feature, day) DO UPDATE SET count = count + 1 RETURNING count`)
    .bind(await sha256(key), feature, day)
    .first<number>('count');
  return (count ?? 0) > limit;
}

/** Today's count of `feature` for `key`, without counting a use (e.g. wrong admin passwords so far). */
export async function dailyCount(feature: string, key: string): Promise<number> {
  const day = new Date().toISOString().slice(0, 10);
  return (await env.DB.prepare('SELECT count FROM ai_usage WHERE client = ? AND feature = ? AND day = ?')
    .bind(await sha256(key), feature, day)
    .first<number>('count')) ?? 0;
}

export const tooManyToday = () => Response.json({ error: 'Too many requests today. Please try again tomorrow.' }, { status: 429 });

/**
 * True when the request comes from our own pages. POSTs must carry a matching Origin. Browsers don't
 * send Origin on same-origin GETs, so GETs use Sec-Fetch-Site (or Origin when present). Requests with
 * neither header (non-browser clients) pass this check and are held back by the daily limits instead.
 */
export function sameSite(request: Request, url: URL): boolean {
  const origin = request.headers.get('origin');
  if (request.method !== 'GET' && request.method !== 'HEAD') return origin === url.origin;
  const site = request.headers.get('sec-fetch-site');
  if (site) return site === 'same-origin' || site === 'none';
  return origin === null || origin === url.origin;
}

/**
 * Spam guard for public endpoints: same-site check, then one count per IP against `perIpPerDay`.
 * Returns the error response to send, or null to carry on.
 */
export async function guard(ctx: Pick<APIContext, 'request' | 'url' | 'clientAddress'>, feature: string, perIpPerDay: number): Promise<Response | null> {
  if (!sameSite(ctx.request, ctx.url)) return new Response('Forbidden', { status: 403 });
  if (await overDailyLimit(feature, `ip:${clientIp(ctx)}`, perIpPerDay)) return tooManyToday();
  return null;
}
