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
- **BHK:** options are 1–4 BHK and **5+ BHK** (`5-bhk` / `bhk=5` means `bhk >= 5`). Path segments
  `1-bhk`…`5-bhk` are accepted; `6-bhk`…`9-bhk` **301-redirect** to the same URL with `5-bhk` in their
  place, keeping the other segments and the query string (e.g. `/buy/mumbai/powai/7-bhk/apartment?sort=newest`
  → `/buy/mumbai/powai/5-bhk/apartment?sort=newest`). Any other `n-bhk` (e.g. `0-bhk`) is a 404.

## Files
- `src/pages/[mode]/[city]/[...facets].astro`
- `src/lib/search.ts`
- `src/lib/repo.ts (searchListings, marketStats)`

## Reference behaviour (Square Yards)
_No direct reference page identified yet._

## Gaps vs reference
_To be filled after REA analysis._
