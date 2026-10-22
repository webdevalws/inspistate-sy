# Managed Rentals

**Area:** Rent · **Route:** `/managed-rentals/{city}` · **Status:** built

## What it does
Owner-managed rental homes with zero brokerage and a one-month deposit; filters and a callback form.

## Inputs
- City chips
- BHK, budget, furnishing (query params)
- Callback lead

## Outputs
- Listing cards with "Managed · Zero brokerage" badge, count, pagination
- USPs, owner CTA to property management, FAQ

## How it works
- Listings gain `managed`, `deposit_months`, `available_from` (migration 0008).
- **Demo data:** `db/build-seed.ts` writes these columns into `db/seed.sql` — every residential rental
  whose id is divisible by 3 gets `managed = 1`, `deposit_months = 1` and `available_from` = posting date
  + 7 days (86 of the 804 demo listings; Lucknow's two sample rentals are not managed); all others
  `managed = 0`, `deposit_months = 2`. Migration 0008
  applies the same rule only to rows that exist when it runs; on a fresh `npm run db:reset:local` the
  migrations run before any listings exist, so the seed is what fills `/managed-rentals/{city}`.
  (0008's comment "also re-applied by db/seed.sql" was only true from this change on.)
- `searchListings` honours `managed`; `/rent/{city}?managed=1` also works.

## Files
- `src/pages/managed-rentals/[city].astro`
- `migrations/0008_managed_rentals.sql`
- `db/build-seed.ts`
- `src/lib/repo.ts`
- `src/lib/search.ts`
- `src/components/ListingCard.astro`

## Reference behaviour (Square Yards)
Reference: https://www.squareyards.com/azuro — hero, USPs (zero brokerage, managed homes, inspections, rent on app, move-in help), locality search with chips and nearby suggestions, commute search, filters (BHK, type, budget, more), 24 per page with infinite scroll (`/getResaleFilterTile`, `/getListingsRR` return HTML), cards with WhatsApp and Contact Agent, OTP lead.

## Gaps vs reference
- **Matched:** managed inventory, USPs, filters, count, cards, lead, owner CTA.
- **Not built:** commute search, nearby-locality chips, WhatsApp CTA, deposit shown on the card, infinite scroll.
