// "Find sellers": sellers mark listings as open to working with an agent; agents find those listings and offer to
// help; the seller accepts or declines (migration 0016). See docs/functions/agent-offers/desc.md.
import { env } from 'cloudflare:workers';
import { live } from './repo';

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
