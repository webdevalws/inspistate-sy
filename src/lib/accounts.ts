// Per-user data: shortlist, saved searches, own listings and enquiries.
import { env } from 'cloudflare:workers';
import { FREE_LISTINGS, planByKey, type PlanKey } from '../data/plans';
import { hasRealPhone, type User } from './auth';

const db = () => env.DB;
type Kind = 'listing' | 'project';

export async function userShortlist(userId: number): Promise<{ kind: Kind; id: number }[]> {
  const { results } = await db().prepare('SELECT kind, item_id FROM shortlists WHERE user_id = ? ORDER BY created_at DESC').bind(userId).all<{ kind: Kind; item_id: number }>();
  return results.map((r) => ({ kind: r.kind, id: r.item_id }));
}

export async function setShortlisted(userId: number, kind: Kind, id: number, saved: boolean) {
  await db()
    .prepare(saved ? 'INSERT OR IGNORE INTO shortlists (user_id, kind, item_id) VALUES (?, ?, ?)' : 'DELETE FROM shortlists WHERE user_id = ? AND kind = ? AND item_id = ?')
    .bind(userId, kind, id)
    .run();
}

export async function mergeShortlist(userId: number, items: { kind: Kind; id: number }[]) {
  const valid = items.filter((i) => (i.kind === 'listing' || i.kind === 'project') && Number.isInteger(i.id) && i.id > 0).slice(0, 200);
  if (!valid.length) return;
  await db().batch(valid.map((i) => db().prepare('INSERT OR IGNORE INTO shortlists (user_id, kind, item_id) VALUES (?, ?, ?)').bind(userId, i.kind, i.id)));
}

export async function savedSearches(userId: number) {
  const { results } = await db().prepare('SELECT id, label, url, created_at FROM saved_searches WHERE user_id = ? ORDER BY id DESC').bind(userId).all<{ id: number; label: string; url: string; created_at: string }>();
  return results;
}

export async function saveSearch(userId: number, label: string, url: string) {
  await db().prepare('INSERT OR IGNORE INTO saved_searches (user_id, label, url) VALUES (?, ?, ?)').bind(userId, label.slice(0, 150), url.slice(0, 500)).run();
}

export async function deleteSavedSearch(userId: number, id: number) {
  await db().prepare('DELETE FROM saved_searches WHERE user_id = ? AND id = ?').bind(userId, id).run();
}

export async function myListings(userId: number) {
  const { results } = await db()
    // Deleted listings disappear from the owner's list; sold / rented ones stay with their own chip.
    .prepare("SELECT id, purpose, type, bhk, area_sqft, price, city_slug, locality_slug, status, closed, edit_token, posted_at, open_to_agents FROM listings WHERE user_id = ? AND (closed IS NULL OR closed != 'deleted') ORDER BY id DESC")
    .bind(userId)
    .all<{ id: number; purpose: string; type: string; bhk: number; area_sqft: number; price: number; city_slug: string; locality_slug: string; status: string; closed: 'sold' | 'rented' | null; edit_token: string; posted_at: string; open_to_agents: number }>();
  return results;
}

export async function myEnquiries(userId: number) {
  const { results } = await db()
    .prepare('SELECT id, subject, page, kind, created_at FROM leads WHERE user_id = ? ORDER BY id DESC LIMIT 100')
    .bind(userId)
    .all<{ id: number; subject: string; page: string | null; kind: string; created_at: string }>();
  return results;
}

export async function updateCompany(userId: number, company: string) {
  await db().prepare("UPDATE users SET company = ? WHERE id = ? AND role = 'agent'").bind(company, userId).run();
}

export async function updateProfile(userId: number, name: string | null, email: string | null) {
  await db().prepare('UPDATE users SET name = ?, email = ? WHERE id = ?').bind(name, email, userId).run();
}

// ---------- roles, listing allowance and agent plans ----------

export interface Subscription { id: number; plan: PlanKey; amount: number; status: 'requested' | 'active' | 'cancelled'; starts_at: string | null; ends_at: string | null; created_at: string }

/** The newest active, unexpired plan, plus any request still waiting for activation. */
export async function subscriptionState(userId: number): Promise<{ active: Subscription | null; requested: Subscription | null }> {
  const { results } = await db()
    .prepare("SELECT id, plan, amount, status, starts_at, ends_at, created_at FROM subscriptions WHERE user_id = ? AND status IN ('active', 'requested') ORDER BY id DESC")
    .bind(userId)
    .all<Subscription>();
  const now = new Date().toISOString();
  return {
    active: results.find((s) => s.status === 'active' && (s.ends_at ?? '') > now) ?? null,
    requested: results.find((s) => s.status === 'requested') ?? null,
  };
}

export type Allowance = { used: number; limit: number | null; canPost: boolean; hasPlan: boolean; reason: 'login' | 'register' | 'buyer' | 'phone' | 'limit' | null };

/** How many listings this account may still post. Live and under-review listings count; rejected ones don't. */
export async function listingAllowance(user: User | null): Promise<Allowance> {
  if (!user) return { used: 0, limit: 0, canPost: false, hasPlan: false, reason: 'login' };
  if (!user.role) return { used: 0, limit: 0, canPost: false, hasPlan: false, reason: 'register' };
  // Sold, rented and deleted listings free their slot.
  const used = (await db().prepare("SELECT count(*) AS n FROM listings WHERE user_id = ? AND status IN ('active', 'pending') AND closed IS NULL").bind(user.id).first<number>('n')) ?? 0;
  // A paid plan belongs to the account, not the current role: it survives switching agent → seller.
  const hasPlan = !!(await subscriptionState(user.id)).active;
  const limit = hasPlan ? null : FREE_LISTINGS[user.role];
  if (user.role === 'user') return { used, limit: 0, canPost: false, hasPlan, reason: 'buyer' };
  // Accounts created with Google add a mobile number before posting (buyers reach the owner through it).
  if (!hasRealPhone(user.phone)) return { used, limit, canPost: false, hasPlan, reason: 'phone' };
  const canPost = limit === null || used < limit;
  return { used, limit, canPost, hasPlan, reason: canPost ? null : 'limit' };
}

export async function requestSubscription(user: User, plan: PlanKey): Promise<{ ok: true } | { ok: false; error: string }> {
  const p = planByKey(plan);
  if (!p) return { ok: false, error: 'Unknown plan' };
  // The sales team calls the agent on this number to collect payment.
  if (!hasRealPhone(user.phone)) return { ok: false, error: 'Add your mobile number on your account page first, so our team can call you about the plan.' };
  const state = await subscriptionState(user.id);
  if (state.requested) return { ok: false, error: 'You already have a plan request in progress — our team will call you shortly.' };
  await db().batch([
    db().prepare('INSERT INTO subscriptions (user_id, plan, amount) VALUES (?, ?, ?)').bind(user.id, p.key, p.price),
    // Also raise a lead so the sales team calls the agent to collect payment and activate the plan.
    db().prepare("INSERT INTO leads (name, phone, email, subject, page, user_id, kind) VALUES (?, ?, ?, ?, '/account/plans', ?, 'subscription')")
      .bind(user.name ?? 'Agent', user.phone, user.email, `Agent plan request: ${p.name} (₹${p.price.toLocaleString('en-IN')})`, user.id),
  ]);
  return { ok: true };
}

/** Enquiries buyers sent on this account's own listings. */
export async function leadsReceived(userId: number) {
  const { results } = await db()
    .prepare(`SELECT ld.id, ld.name, ld.phone, ld.subject, ld.kind, ld.created_at, ld.listing_id, l.posted_by
      FROM leads ld JOIN listings l ON l.id = ld.listing_id WHERE l.user_id = ? ORDER BY ld.id DESC LIMIT 100`)
    .bind(userId)
    .all<{ id: number; name: string; phone: string; subject: string; kind: string; created_at: string; listing_id: number; posted_by: string }>();
  return results;
}
