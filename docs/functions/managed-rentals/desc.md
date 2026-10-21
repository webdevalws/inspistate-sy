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
- Listings gain `managed`, `deposit_months`, `available_from` (migration 0008); seed marks every third residential rental managed.
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
