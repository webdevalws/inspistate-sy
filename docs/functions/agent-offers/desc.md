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

## Find sellers (item 106)
- `/account/agent/find-sellers`, agents only (others are sent to `/account`); linked from the agent sidebar, header
  account menu and the agent dashboard. Agents need an agency name: without one the page asks for it, and the account
  page Profile now has an **Agency name** field for agents (agents who switched role from Seller have none).
- Lists live listings (shared `live()`: approved, open, owner not blocked) with `open_to_agents = 1`, posted as Owner
  by an active **Seller** account, never the agent’s own; newest first, 12 per page (`Pagination`).
- Filters (GET): city, locality (of the chosen city), buy / rent, type, BHK (5 = 5 and above).
- Each row: photo, title (BHK, type, sale / rent, locality, city), price, area, posted date, link to the public listing,
  and the agent’s offer status if any. **Never** the seller’s name or phone or the listing’s contact details:
  `findSellerListings` doesn’t select them.

## Files
- `src/lib/agent-offers.ts`, `migrations/0016_agent_offers.sql`
- `src/components/islands/PostPropertyForm.tsx`, `src/components/account/MyListings.astro`,
  `src/pages/api/listings.ts`, `src/pages/api/account/listings/[id].ts`
