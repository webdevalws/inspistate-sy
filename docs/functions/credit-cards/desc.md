# Credit Cards

**Area:** Finance · **Route:** `/credit-cards` · **Status:** built

## What it does
Compare credit cards by category and bank; request a call to apply.

## Inputs
- Category (cashback, rewards, lifetime free, shopping, fuel, travel, dining, movies, premium)
- Bank checkboxes

## Outputs
- Card list: bank, tags, three benefits, joining and annual fee
- Apply → inline lead form tagged with the card
- Card types, FAQ

## How it works
- Card data in `CREDIT_CARDS` (12 cards, indicative). Filters are client-side.

## Files
- `src/pages/credit-cards.astro`
- `src/components/islands/Finance.tsx (CardCatalogue)`
- `src/data/loans.ts (CREDIT_CARDS)`

## Reference behaviour (Square Yards)
Reference: https://www.urbanmoney.com/credit-card — top-bank strip, category tags and bank filter, card list with tags, 3 benefits, joining/annual fees, Apply (bank link or lead popup with PAN + email + bureau consent).

## Gaps vs reference
- **Matched:** categories, bank filter, card fields, apply lead.
- **Not built:** bank deep links, card detail pages, PAN-based pre-approval.
