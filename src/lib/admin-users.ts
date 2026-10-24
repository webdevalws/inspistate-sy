// Admin user management: list, search and filter accounts (Buyers, Sellers, Agents) for /admin/users.
// See docs/functions/admin/desc.md.
import { env } from 'cloudflare:workers';
import type { PlanKey, Role } from '../data/plans';
import { isRole } from '../data/plans';

const db = () => env.DB;

export const USERS_PAGE_SIZE = 25;

/** Role filter values: a role, or 'none' for accounts that never finished registration. */
export type RoleFilter = Role | 'none';
export const isRoleFilter = (v: unknown): v is RoleFilter => v === 'none' || isRole(v);

export interface AdminUserRow {
  id: number; phone: string; name: string | null; email: string | null; role: Role | null; city_slug: string | null;
  company: string | null; created_at: string; listings: number; enquiries: number;
  /** Active, unexpired plan, if any. */
  plan: PlanKey | null;
  /** A plan request is waiting for activation. */
  plan_requested: number;
}

export interface UserQuery { q?: string; role?: RoleFilter; page: number }

// Listings count excludes owner-deleted ones (as on the owner's own account page); enquiries are the leads the
// user sent.
const ROW_SELECT = `SELECT u.id, u.phone, u.name, u.email, u.role, u.city_slug, u.company, u.created_at,
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
    parts.push(digits.length >= 3 ? '(instr(lower(coalesce(u.name, \'\')), lower(?)) > 0 OR instr(u.phone, ?) > 0)' : 'instr(lower(coalesce(u.name, \'\')), lower(?)) > 0');
    binds.push(q, ...(digits.length >= 3 ? [digits.slice(-10)] : []));
  }
  if (f.role === 'none') parts.push('u.role IS NULL');
  else if (f.role) { parts.push('u.role = ?'); binds.push(f.role); }
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

/** Account counts by role for the /admin overview ('none' = registration not finished). */
export async function userCounts(): Promise<Record<RoleFilter | 'all', number>> {
  const { results } = await db().prepare('SELECT role, count(*) AS n FROM users GROUP BY role').all<{ role: Role | null; n: number }>();
  const out: Record<RoleFilter | 'all', number> = { all: 0, user: 0, seller: 0, agent: 0, none: 0 };
  for (const r of results) { out[r.role ?? 'none'] += r.n; out.all += r.n; }
  return out;
}
