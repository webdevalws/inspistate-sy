# Find sellers (agent offers)

**Area:** Accounts · **Routes:** `/account/agent/find-sellers`, `/account` (Agent offers), `/api/account/agent-offers` · **Status:** built (items 105–109)

## What it does
Sellers can say a listing is open to working with an agent. Registered agents browse those listings (never seeing
the seller's name or number) and offer to help with a short message. The seller accepts or declines; only after
Accept do both see each other's phone numbers.

## Seller opt-in (item 105)
- **Migration 0016** (additive): `listings.open_to_agents` (0/1, default 0) and the `agent_offers` table.
- "I’m open to working with an agent" — off by default — on the post / edit form (Contact step) and per listing on
  **My Listings** (a checkbox that saves at once; a Save button without JavaScript). Shown to **Seller** accounts
  only; agents' own listings are never offered to agents (`setOpenToAgents` checks the owner is a Seller).
- Toggling on My Listings doesn't send the listing back to review (an edit does).

## Files
- `src/lib/agent-offers.ts`, `migrations/0016_agent_offers.sql`
- `src/components/islands/PostPropertyForm.tsx`, `src/components/account/MyListings.astro`,
  `src/pages/api/listings.ts`, `src/pages/api/account/listings/[id].ts`
