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

## Offer to help (item 107)
- Each row without an offer has a message box (10–500 characters) and **Offer to help** → `POST /api/account/agent-offers`
  (`action=send`), back to the same page and filters with `?offer=sent` or an error.
- `sendOffer` checks, in order: agent with an agency name and a **real** mobile number (it is shared on Accept; a
  Google-only agent adds one first) → message length → the listing is still open to agents → no earlier offer on it
  (**one per agent per listing, ever**: `UNIQUE (listing_id, agent_id)`) → the daily limit, **20 per agent per day**
  (`ai_usage` feature `agent-offer`, key `user:<id>`; only offers that pass the other checks are counted).
- Agent dashboard → **Offers sent**: listing, sent / answered dates, status (Waiting, Accepted, Declined). Offers to
  sellers who are now blocked are left out.

## Seller answers (item 108)
- `/account` → **Agent offers** (Seller accounts, `AgentOffers.astro`): agent name, agency, the listing, message and date,
  waiting offers first, with **Accept** / **Decline** (`action=accept|decline`, `respondToOffer`, only the seller’s own
  pending offers). A listing that has been sold, rented or deleted since offers Decline only.
- **Phones only after Accept:** the seller then sees the agent’s phone; the agent sees the seller’s name and **account**
  phone (their verified login number) under Offers sent. Before that neither query selects a phone; a Google-only
  placeholder is never shown (`realPhone`). Declined is final: that agent can’t offer again on that listing.
- **Blocked accounts:** offers from a blocked agent are hidden from the seller and can’t be answered; offers to a
  blocked seller are hidden from the agent. Blocked users can’t log in, so they can’t send or answer.
- **Counts** (no email / SMS yet): sellers see “Agent offers (N)” (waiting) in the header account menu and the account
  sidebar, plus a line at the top of `/account`; agents see “Agent dashboard (N)” for offers accepted in the last
  7 days (`NEW_ACCEPTED_DAYS`), plus a line at the top of the dashboard (`offerBadge`).

## Admin (item 109)
- `/admin/users/{id}` → **Agent offers**: every offer the account sent (as agent) or received (as seller), blocked
  parties included — date, listing, agent (with agency) and seller linking to their admin pages, message, status and
  answer date (`adminUserOffers`).

## Files
- `src/lib/agent-offers.ts`, `migrations/0016_agent_offers.sql`, `src/pages/api/account/agent-offers.ts`,
  `src/pages/account/agent/find-sellers.astro`, `src/pages/account/agent.astro`, `src/components/account/AgentOffers.astro`
- `src/components/islands/PostPropertyForm.tsx`, `src/components/account/MyListings.astro`,
  `src/pages/api/listings.ts`, `src/pages/api/account/listings/[id].ts`
