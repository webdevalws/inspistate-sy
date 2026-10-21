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

export const tooManyToday = () => Response.json({ error: 'Too many requests today. Please try again tomorrow.' }, { status: 429 });
