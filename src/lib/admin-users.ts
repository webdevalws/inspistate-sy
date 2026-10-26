// Admin user management: list, search and filter accounts (Buyers, Sellers, Agents) for /admin/users.
// See docs/functions/admin/desc.md.
import { env } from 'cloudflare:workers';
import type { PlanKey, Role } from '../data/plans';
import { isRole, planByKey } from '../data/plans';
import { subscriptionState } from './accounts';
import { hasRealPhone } from './auth';

const db = () => env.DB;

export const USERS_PAGE_SIZE = 25;

/** How the account logs in: a real mobile number (OTP), a linked Google account, or both. */
export const loginMethod = (u: Pick<AdminUserRow, 'phone' | 'google'>) => {
  const phone = hasRealPhone(u.phone);
  return phone && u.google ? 'Phone + Google' : u.google ? 'Google' : 'Phone';
};

/** Role filter values: a role, or 'none' for accounts that never finished registration. */
export type RoleFilter = Role | 'none';
export const isRoleFilter = (v: unknown): v is RoleFilter => v === 'none' || isRole(v);

export interface AdminUserRow {
  id: number; phone: string; name: string | null; email: string | null; role: Role | null; city_slug: string | null;
  company: string | null; created_at: string; listings: number; enquiries: number;
  /** When the admin blocked the account (null = active). */
  blocked_at: string | null;
  /** Verified Google email of a linked Google account (migration 0015), else null. */
  google_email: string | null;
  /** 1 when a Google account is linked. */
  google: number;
  /** Active, unexpired plan, if any. */
  plan: PlanKey | null;
  /** A plan request is waiting for activation. */
  plan_requested: number;
}

export type StateFilter = 'active' | 'blocked';
export const isStateFilter = (v: unknown): v is StateFilter => v === 'active' || v === 'blocked';

export interface UserQuery { q?: string; role?: RoleFilter; state?: StateFilter; page: number }

// Listings count excludes owner-deleted ones (as on the owner's own account page); enquiries are the leads the
// user sent.
const ROW_SELECT = `SELECT u.id, u.phone, u.name, u.email, u.role, u.city_slug, u.company, u.created_at, u.blocked_at, u.google_email, u.google_sub IS NOT NULL AS google,
  (SELECT count(*) FROM listings l WHERE l.user_id = u.id AND (l.closed IS NULL OR l.closed != 'deleted')) AS listings,
  (SELECT count(*) FROM leads ld WHERE ld.user_id = u.id) AS enquiries,
  (SELECT s.plan FROM subscriptions s WHERE s.user_id = u.id AND s.status = 'active' AND s.ends_at > strftime('%Y-%m-%dT%H:%M:%SZ', 'now') ORDER BY s.id DESC LIMIT 1) AS plan,
  EXISTS (SELECT 1 FROM subscriptions s WHERE s.user_id = u.id AND s.status = 'requested') AS plan_requested
  FROM users u`;

/** WHERE clause for the search box (name contains, or phone contains the typed digits) and the filters. */
function where(f: UserQuery): { sql: string; binds: unknown[] } {
  const parts: string[] = [];
  const binds: unknown[] = [];
  const q = (f.q ?? '').trim().slice(0, 60);
  if (q) {
    const digits = q.replace(/\D/g, '');
    // instr() rather than LIKE, so % and _ in the search box are plain characters.
    // Digits never match a Google account's placeholder phone ('g:<id>').
    parts.push(digits.length >= 3 ? "(instr(lower(coalesce(u.name, '')), lower(?)) > 0 OR (u.phone NOT LIKE 'g:%' AND instr(u.phone, ?) > 0))" : "instr(lower(coalesce(u.name, '')), lower(?)) > 0");
    binds.push(q, ...(digits.length >= 3 ? [digits.slice(-10)] : []));
  }
  if (f.role === 'none') parts.push('u.role IS NULL');
  else if (f.role) { parts.push('u.role = ?'); binds.push(f.role); }
  if (f.state) parts.push(f.state === 'blocked' ? 'u.blocked_at IS NOT NULL' : 'u.blocked_at IS NULL');
  return { sql: parts.length ? ` WHERE ${parts.join(' AND ')}` : '', binds };
}

/** One page of users, newest first, with the total for pagination. */
export async function listUsers(f: UserQuery): Promise<{ rows: AdminUserRow[]; total: number; page: number; pages: number }> {
  const w = where(f);
  const total = (await db().prepare(`SELECT count(*) AS n FROM users u${w.sql}`).bind(...w.binds).first<number>('n')) ?? 0;
  const pages = Math.max(1, Math.ceil(total / USERS_PAGE_SIZE));
  const page = Math.min(Math.max(1, f.page), pages);
  const { results } = await db()
    .prepare(`${ROW_SELECT}${w.sql} ORDER BY u.id DESC LIMIT ? OFFSET ?`)
    .bind(...w.binds, USERS_PAGE_SIZE, (page - 1) * USERS_PAGE_SIZE)
    .all<AdminUserRow>();
  return { rows: results, total, page, pages };
}

/** Account counts by role for the /admin overview ('none' = registration not finished), plus blocked accounts. */
export async function userCounts(): Promise<Record<RoleFilter | 'all' | 'blocked', number>> {
  const { results } = await db().prepare('SELECT role, count(*) AS n, sum(blocked_at IS NOT NULL) AS blocked FROM users GROUP BY role').all<{ role: Role | null; n: number; blocked: number }>();
  const out: Record<RoleFilter | 'all' | 'blocked', number> = { all: 0, user: 0, seller: 0, agent: 0, none: 0, blocked: 0 };
  for (const r of results) { out[r.role ?? 'none'] += r.n; out.all += r.n; out.blocked += r.blocked; }
  return out;
}

/** One account with the same summary columns as the list, or null. */
export async function adminUser(id: number): Promise<AdminUserRow | null> {
  return db().prepare(`${ROW_SELECT} WHERE u.id = ?`).bind(id).first<AdminUserRow>();
}

export interface AdminUserListing {
  id: number; purpose: 'buy' | 'rent'; type: string; bhk: number; area_sqft: number; price: number; city_slug: string;
  locality_slug: string; status: 'active' | 'pending' | 'rejected'; closed: 'sold' | 'rented' | 'deleted' | null; edit_token: string; posted_at: string;
  owner_blocked: number;
}

/** All of the user's listings, owner-deleted ones included (the admin sees everything), newest first. */
export async function adminUserListings(userId: number): Promise<AdminUserListing[]> {
  const { results } = await db()
    .prepare('SELECT id, purpose, type, bhk, area_sqft, price, city_slug, locality_slug, status, closed, edit_token, posted_at, owner_blocked FROM listings WHERE user_id = ? ORDER BY id DESC')
    .bind(userId)
    .all<AdminUserListing>();
  return results;
}

/** Listing state as one label: owner lifecycle (sold / rented / deleted) first, then moderation status. */
export const listingStateLabel = (l: Pick<AdminUserListing, 'status' | 'closed'>) =>
  l.closed ? l.closed[0].toUpperCase() + l.closed.slice(1) : ({ active: 'Live', pending: 'Under review', rejected: 'Rejected' } as const)[l.status];

/** Every plan request and plan of the account, newest first. */
export async function adminUserPlans(userId: number) {
  const { results } = await db()
    .prepare('SELECT id, plan, amount, status, starts_at, ends_at, created_at FROM subscriptions WHERE user_id = ? ORDER BY id DESC')
    .bind(userId)
    .all<{ id: number; plan: PlanKey; amount: number; status: 'requested' | 'active' | 'cancelled'; starts_at: string | null; ends_at: string | null; created_at: string }>();
  return results;
}

// ---------- admin edits (every change is written to the admin audit log by the endpoint) ----------

export interface ProfileEdit { name: string | null; phone: string; role: Role | null; citySlug: string | null; company: string | null }
/** One changed field: [field, old value, new value]. */
export type Change = [string, string | null, string | null];

/**
 * Saves the admin's edits to an account and returns what changed. A new phone number becomes the login, so all
 * of the account's sessions are ended (a lost phone or misuse must not keep old sessions working) and any
 * pending code for the old number is dropped. Returns 'phone-taken' when another account has that number.
 */
export async function updateUserProfile(id: number, e: ProfileEdit): Promise<{ changes: Change[]; sessionsEnded: boolean } | 'not-found' | 'phone-taken'> {
  const cur = await db().prepare('SELECT phone, name, role, city_slug, company FROM users WHERE id = ?').bind(id)
    .first<{ phone: string; name: string | null; role: Role | null; city_slug: string | null; company: string | null }>();
  if (!cur) return 'not-found';
  // Agency is kept for agents only, as at registration.
  const company = e.role === 'agent' ? e.company : null;
  const changes: Change[] = (
    [['name', cur.name, e.name], ['phone', cur.phone, e.phone], ['role', cur.role, e.role], ['city', cur.city_slug, e.citySlug], ['agency', cur.company, company]] as Change[]
  ).filter(([, a, b]) => (a ?? null) !== (b ?? null));
  if (!changes.length) return { changes, sessionsEnded: false };
  const phoneChanged = cur.phone !== e.phone;
  if (phoneChanged && (await db().prepare('SELECT 1 FROM users WHERE phone = ? AND id != ?').bind(e.phone, id).first())) return 'phone-taken';
  try {
    await db().batch([
      db().prepare('UPDATE users SET name = ?, phone = ?, role = ?, city_slug = ?, company = ? WHERE id = ?').bind(e.name, e.phone, e.role, e.citySlug, company, id),
      ...(phoneChanged ? [
        db().prepare('DELETE FROM sessions WHERE user_id = ?').bind(id),
        db().prepare('DELETE FROM otp_codes WHERE phone = ?').bind(cur.phone),
      ] : []),
    ]);
  } catch (err) {
    // Another account took the number between the check and the update (UNIQUE on users.phone).
    if (String(err).includes('UNIQUE')) return 'phone-taken';
    throw err;
  }
  return { changes, sessionsEnded: phoneChanged };
}

/**
 * Sets the account's plan: null cancels the active plan; a plan key starts it today for its length (activating a
 * waiting request for the same plan, so it leaves the /admin requests list). Any other active plan is cancelled
 * first. Returns [old, new] plan keys (null = Free), or null when nothing changed.
 */
export async function setUserPlan(id: number, plan: PlanKey | null): Promise<[PlanKey | null, PlanKey | null] | null> {
  const { active, requested } = await subscriptionState(id);
  const from = active?.plan ?? null;
  if (from === plan) return null;
  const stmts = active ? [db().prepare("UPDATE subscriptions SET status = 'cancelled' WHERE id = ?").bind(active.id)] : [];
  const p = plan ? planByKey(plan) : undefined;
  if (p) {
    const start = new Date();
    const end = new Date(start);
    end.setMonth(end.getMonth() + p.months);
    stmts.push(requested?.plan === p.key
      ? db().prepare("UPDATE subscriptions SET status = 'active', starts_at = ?, ends_at = ? WHERE id = ?").bind(start.toISOString(), end.toISOString(), requested.id)
      : db().prepare("INSERT INTO subscriptions (user_id, plan, amount, status, starts_at, ends_at) VALUES (?, ?, ?, 'active', ?, ?)").bind(id, p.key, p.price, start.toISOString(), end.toISOString()));
  }
  await db().batch(stmts);
  return [from, plan];
}

/**
 * Blocks or unblocks an account. Blocking ends all of its sessions at once and hides its listings from every public
 * page (listings.owner_blocked); login and posting are refused while blocked_at is set (src/lib/auth.ts).
 * Unblocking restores both. Returns false when the account was already in that state.
 */
export async function setUserBlocked(id: number, blocked: boolean): Promise<boolean> {
  const res = await db().batch([
    db().prepare(blocked ? "UPDATE users SET blocked_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ? AND blocked_at IS NULL" : 'UPDATE users SET blocked_at = NULL WHERE id = ? AND blocked_at IS NOT NULL').bind(id),
    db().prepare('UPDATE listings SET owner_blocked = ? WHERE user_id = ?').bind(blocked ? 1 : 0, id),
    ...(blocked ? [db().prepare('DELETE FROM sessions WHERE user_id = ?').bind(id)] : []),
  ]);
  return (res[0].meta.changes ?? 0) > 0;
}
