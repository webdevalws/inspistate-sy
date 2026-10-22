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
- **Clean URLs from the filter panel:** when filters change, `facetPath` (`src/lib/search.ts`) puts a
  single locality, BHK or type in the path and the rest in the query string, e.g. Powai + 2 BHK +
  Apartment → `/buy/mumbai/powai/2-bhk/apartment`; two localities → `?locality=a,b`. Query values the
  panel doesn't own (e.g. `managed=1`) are kept; `page` resets.
- **Free-text search (`?q=`):** when nothing in the search box's autocomplete matches, it submits
  `/{tab}/{city}?q=…`. The search page (and `/new-projects/{city}`) reads `q` with the Ask AI parser
  (`parseQuery` in `src/lib/nlsearch.ts`) — using the page's city, mode and path facets as defaults — and
  302-redirects to the resulting filtered URL, e.g. `/buy/mumbai?q=3 bhk ready to move under 2 cr` →
  `/buy/mumbai?bhk=3&priceMax=20000000&possession=Ready+to+Move`. Text the parser can't read leads to the
  plain city (or city + facet) page.
- Unknown mode, city or facet segment → 404. Lookups use `Object.hasOwn`, so built-in object names such
  as `constructor` or `toString` (`/constructor/mumbai`, `/buy/mumbai/constructor`) are a 404, not a 500.
  The same applies to `/localities/{city}/{theme}`, the company pages `/{page}` (e.g. `/constructor`),
  and the review `service` / `source` values on `/reviews` and `POST /api/platform-reviews`.
- **Near me** (target icon in the search box, `nearMe` in `SearchBox.tsx`): asks the browser for the
  location, picks the nearest locality in any city and opens it for the current tab (Buy/Rent/Commercial
  → `/{tab}/{city}/{locality}`, Plots → `/buy/{city}/{locality}/plot`, New projects →
  `/new-projects/{city}?locality=…`). More than 60 km from every locality → "We don't have listings near
  you yet". Permission refused → "Location permission was denied."; timeout or position unavailable →
  "Couldn't get your location. Try again or pick a city." Needs `localhost` or https.

## Files
- `src/pages/[mode]/[city]/[...facets].astro`
- `src/lib/search.ts`
- `src/lib/repo.ts (searchListings, marketStats)`

## Reference behaviour (Square Yards)
_No direct reference page identified yet._

## Gaps vs reference
_To be filled after REA analysis._
