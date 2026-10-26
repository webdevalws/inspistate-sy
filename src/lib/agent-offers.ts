// "Find sellers": sellers mark listings as open to working with an agent; agents find those listings and offer to
// help; the seller accepts or declines (migration 0016). See docs/functions/agent-offers/desc.md.
import { env } from 'cloudflare:workers';

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
