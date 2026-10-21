# Account roles, listing limits & agent plans

**Area:** Accounts · **Routes:** `/account`, `/account/plans`, `/post-property` · **Status:** built

## What it does
Every account is a **User**, **Seller** or **Agent** (chosen at registration, changeable in Profile).
- **User** — shortlist, saved searches, enquiries. Cannot post; offered "Become a seller".
- **Seller** — up to 3 live/under-review listings, sees full contact details of buyers who enquire.
- **Agent** — 3 free listings; a Yearly or Half-Yearly plan unlocks unlimited listings, buyer phone
  numbers on leads (masked on the free tier) and priority review in the admin queue.

## Inputs
- Role switch (`/api/account/role`), plan choice (`/api/account/subscription`)
- Admin: Activate / Cancel a plan request (`/api/admin/subscriptions/[id]`)

## Outputs
- Account dashboard with role-based sidebar: Overview, My Listings, List Property, Leads Received,
  Subscription Plans (agents), Shortlist, Saved Searches, My Enquiries, Profile, Logout.
- `subscriptions` rows: `requested` → `active` (starts now, ends after the plan's months) or `cancelled`.

## How it works
- `listingAllowance(user)` (`src/lib/accounts.ts`) counts `active` + `pending` listings against
  `FREE_LISTINGS[role]`; an active, unexpired agent plan makes the limit unlimited.
  `/api/listings` enforces it server-side (login required) and records `posted_by` = Agent / Owner.
- **No payment gateway yet:** "Proceed to buy" stores a `requested` subscription and a lead of kind
  `subscription` so sales can call; staff activate it in `/admin#subscriptions` once paid.
- Prices, perks and limits live in `src/data/plans.ts` (Yearly ₹9,999 vs ₹14,000; Half-Yearly ₹5,999 vs ₹7,000).

## Files
- `src/data/plans.ts`, `src/lib/accounts.ts`, `src/lib/auth.ts`
- `src/pages/account.astro`, `src/pages/account/plans.astro`, `src/components/AccountNav.astro`
- `src/pages/post-property.astro`, `src/pages/api/listings.ts`
- `src/pages/api/account/{register,role,subscription}.ts`, `src/pages/api/admin/subscriptions/[id].ts`
- `src/pages/admin/index.astro` (Agent plan requests), `migrations/0010_roles_plans.sql`

## Reference behaviour (Square Yards)
From user-supplied screenshots of `/user/subscription-plans`: sidebar (My Listings, List Property,
Property Videos, My Services, Subscription Plans, Profile, My Portfolio, Logout) and two plan cards
(Yearly, Half-Yearly) with struck-through MRP, per-month price, four perks and "Proceed To Buy".

## Gaps vs reference
- No online payment, invoices or auto-renewal; no property videos / portfolio sections.
- "Claim pool" (shared buyer-lead pool) not built — perks list only what InspiState delivers.
