// "Find sellers": sellers mark listings as open to working with an agent; agents find those listings and offer to
// help; the seller accepts or declines (migration 0016). See docs/functions/agent-offers/desc.md.
import { env } from 'cloudflare:workers';
import { live } from './repo';
import { hasRealPhone, realPhone, type User } from './auth';
import { overDailyLimit } from './limits';

const db = () => env.DB;

/**
 * Sets a listing's "open to working with an agent" flag. Only the owner's open listings, and only for Seller
 * accounts (agents' own listings are never offered to other agents). Returns false when nothing was changed.
 */
export async function setOpenToAgents(listingId: number, sellerId: number, open: boolean): Promise<boolean> {
  const r = await db()
    .prepare("UPDATE listings SET open_to_agents = ? WHERE id = ? AND user_id = ? AND closed IS NULL AND EXISTS (SELECT 1 FROM users WHERE id = ? AND role = 'seller')")
    .bind(open ? 1 : 0, listingId, sellerId, sellerId)
    .run();
  return (r.meta.changes ?? 0) > 0;
}

// ---------- agents: find sellers ----------

export const FIND_PAGE_SIZE = 12;
export const FIND_TYPES = ['Apartment', 'Builder Floor', 'Villa', 'Plot', 'PG', 'Office', 'Shop'];
export interface FindFilters { city?: string; locality?: string; purpose?: 'buy' | 'rent'; type?: string; bhk?: number; page: number }

/** A listing as an agent sees it on Find sellers: no seller name, no phone, no contact details. */
export interface SellerListing {
  id: number; purpose: 'buy' | 'rent'; segment: string; type: string; bhk: number; area_sqft: number; price: number;
  city_slug: string; locality_slug: string; posted_at: string; hue: number; photo: string | null;
  /** This agent's offer on the listing, if any (pending / accepted / declined). */
  offer: 'pending' | 'accepted' | 'declined' | null;
}

/** Listings agents may see: live (owner not blocked), opted in, posted by a Seller account, not the agent's own. */
const ELIGIBLE = `${live('l')} AND l.open_to_agents = 1 AND l.posted_by = 'Owner'
  AND EXISTS (SELECT 1 FROM users s WHERE s.id = l.user_id AND s.role = 'seller' AND s.blocked_at IS NULL)`;

export async function findSellerListings(agentId: number, f: FindFilters): Promise<{ rows: SellerListing[]; total: number; page: number; pages: number }> {
  const where = [ELIGIBLE, 'l.user_id != ?'];
  const binds: unknown[] = [agentId];
  if (f.city) { where.push('l.city_slug = ?'); binds.push(f.city); }
  if (f.city && f.locality) { where.push('l.locality_slug = ?'); binds.push(f.locality); }
  if (f.purpose) { where.push('l.purpose = ?'); binds.push(f.purpose); }
  if (f.type) { where.push('l.type = ?'); binds.push(f.type); }
  // 5 = 5 BHK and above, as in search.
  if (f.bhk) { where.push(f.bhk >= 5 ? 'l.bhk >= 5' : 'l.bhk = ?'); if (f.bhk < 5) binds.push(f.bhk); }
  const sql = where.join(' AND ');
  const total = (await db().prepare(`SELECT count(*) AS n FROM listings l WHERE ${sql}`).bind(...binds).first<number>('n')) ?? 0;
  const pages = Math.max(1, Math.ceil(total / FIND_PAGE_SIZE));
  const page = Math.min(Math.max(1, f.page), pages);
  // Only public listing fields are selected: never contact_name, contact_phone or anything about the seller.
  const { results } = await db()
    .prepare(`SELECT l.id, l.purpose, l.segment, l.type, l.bhk, l.area_sqft, l.price, l.city_slug, l.locality_slug, l.posted_at, l.hue,
        (SELECT r2_key FROM listing_photos ph WHERE ph.listing_id = l.id ORDER BY position LIMIT 1) AS photo,
        (SELECT o.status FROM agent_offers o WHERE o.listing_id = l.id AND o.agent_id = ?) AS offer
      FROM listings l WHERE ${sql} ORDER BY l.posted_at DESC, l.id DESC LIMIT ? OFFSET ?`)
    .bind(agentId, ...binds, FIND_PAGE_SIZE, (page - 1) * FIND_PAGE_SIZE)
    .all<SellerListing>();
  return { rows: results, total, page, pages };
}

// ---------- agents: offers ----------

export const OFFERS_PER_AGENT_PER_DAY = 20;
export const OFFER_MESSAGE_MIN = 10;
export const OFFER_MESSAGE_MAX = 500;
export type SendError = 'not-agent' | 'no-agency' | 'no-phone' | 'message' | 'not-available' | 'duplicate' | 'limit';

/** Why an offer wasn't sent (find-sellers page, ?offer=…). */
export const SEND_ERRORS: Record<SendError, string> = {
  'not-agent': 'Only agent accounts can offer to help sellers.',
  'no-agency': 'Add your agency name to your profile first.',
  'no-phone': 'Add your mobile number first — the owner gets it if they accept.',
  message: `Write a short message (${OFFER_MESSAGE_MIN}–${OFFER_MESSAGE_MAX} characters).`,
  'not-available': 'This listing is no longer open to agents.',
  duplicate: 'You have already made an offer on this listing.',
  limit: `You can send up to ${OFFERS_PER_AGENT_PER_DAY} offers a day. Try again tomorrow.`,
};

/**
 * Sends an agent's offer on a listing. Checks, in order: agent with an agency name and a real mobile number, message
 * length, the listing is still open to agents, no earlier offer on it (one per agent per listing, ever), then counts
 * against the agent's daily limit (ai_usage 'agent-offer'). Only offers that pass every other check are counted.
 */
export async function sendOffer(agent: User, listingId: number, message: string): Promise<{ ok: true } | { ok: false; error: SendError }> {
  if (agent.role !== 'agent') return { ok: false, error: 'not-agent' };
  if (!agent.company?.trim()) return { ok: false, error: 'no-agency' };
  if (!hasRealPhone(agent.phone)) return { ok: false, error: 'no-phone' };
  const text = message.trim();
  if (text.length < OFFER_MESSAGE_MIN || text.length > OFFER_MESSAGE_MAX) return { ok: false, error: 'message' };
  const sellerId = await db().prepare(`SELECT l.user_id FROM listings l WHERE l.id = ? AND ${ELIGIBLE} AND l.user_id != ?`).bind(listingId, agent.id).first<number>('user_id');
  if (!sellerId) return { ok: false, error: 'not-available' };
  if (await db().prepare('SELECT 1 FROM agent_offers WHERE listing_id = ? AND agent_id = ?').bind(listingId, agent.id).first()) return { ok: false, error: 'duplicate' };
  if (await overDailyLimit('agent-offer', `user:${agent.id}`, OFFERS_PER_AGENT_PER_DAY)) return { ok: false, error: 'limit' };
  const id = await db()
    .prepare('INSERT INTO agent_offers (listing_id, agent_id, seller_id, message) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING RETURNING id')
    .bind(listingId, agent.id, sellerId, text)
    .first<number>('id');
  return id ? { ok: true } : { ok: false, error: 'duplicate' };
}

export interface SentOffer {
  id: number; listing_id: number; status: 'pending' | 'accepted' | 'declined'; message: string; created_at: string; responded_at: string | null;
  purpose: 'buy' | 'rent'; type: string; bhk: number; city_slug: string; locality_slug: string;
  /** The seller's name and phone: only filled in once the seller has accepted. */
  seller_name: string | null; seller_phone: string | null;
}

/** The agent's offers, newest first. Offers to sellers who are now blocked are left out. */
export async function offersSent(agentId: number): Promise<SentOffer[]> {
  const { results } = await db()
    .prepare(`SELECT o.id, o.listing_id, o.status, o.message, o.created_at, o.responded_at,
        l.purpose, l.type, l.bhk, l.city_slug, l.locality_slug,
        CASE WHEN o.status = 'accepted' THEN s.name END AS seller_name,
        CASE WHEN o.status = 'accepted' THEN s.phone END AS seller_phone
      FROM agent_offers o JOIN listings l ON l.id = o.listing_id JOIN users s ON s.id = o.seller_id
      WHERE o.agent_id = ? AND s.blocked_at IS NULL ORDER BY o.id DESC LIMIT 200`)
    .bind(agentId)
    .all<SentOffer>();
  // A Google-only placeholder is never shown (sellers need a real number to post, but be safe).
  return results.map((r) => ({ ...r, seller_phone: realPhone(r.seller_phone) }));
}
