# Property Search

**Area:** Search · **Route:** `/{buy|rent|commercial}/{city}/{facets}` · **Status:** built

## What it does
Filtered, sorted, paginated listings with SEO facet URLs.

## Inputs
- Facets in path (locality, n-bhk, type) + query filters

## Outputs
- Listing cards, featured projects, market blocks, FAQ

## How it works
- SQL WHERE built from filters (amenities via json_each); 12 per page.

## Files
- `src/pages/[mode]/[city]/[...facets].astro`
- `src/lib/search.ts`
- `src/lib/repo.ts (searchListings, marketStats)`

## Reference behaviour (Square Yards)
_No direct reference page identified yet._

## Gaps vs reference
_To be filled after REA analysis._
