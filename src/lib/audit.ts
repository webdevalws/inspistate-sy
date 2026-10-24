// Admin audit trail (migration 0013). Every state-changing admin endpoint records what it did, to what and
// from which IP (stored as received). See docs/functions/admin/desc.md.
import { env } from 'cloudflare:workers';
import type { APIContext } from 'astro';
import { clientIp } from './limits';

export interface AdminAction { id: number; at: string; action: string; target: string; ip: string | null }

/** Records one admin action, e.g. logAdmin(ctx, 'listing.approve', 'listing #50801'). */
export async function logAdmin(ctx: Pick<APIContext, 'clientAddress'>, action: string, target: string) {
  await env.DB.prepare('INSERT INTO admin_audit (action, target, ip) VALUES (?, ?, ?)').bind(action, target.slice(0, 200), clientIp(ctx)).run();
}

export async function recentAdminActions(limit = 30): Promise<AdminAction[]> {
  const { results } = await env.DB.prepare('SELECT id, at, action, target, ip FROM admin_audit ORDER BY id DESC LIMIT ?').bind(limit).all<AdminAction>();
  return results;
}
