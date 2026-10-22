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
- **Search box (home hero and the search-page bar, `SearchBox.tsx`) — what pressing Search does:**
  1. Empty box → the chosen tab and city (`/buy/mumbai`).
  2. An autocomplete match (locality, project, builder) → its page, e.g. "powai" → `/buy/mumbai/powai`.
  3. A major Indian city we don't cover (`src/data/indian-cities.ts`, e.g. Jaipur, Kanpur, "mysore") →
     **no navigation**; the note under the box says "We're not in Jaipur yet. Pick one of our cities:" with
     links to all our cities (same box as the near-me note). It never quietly shows another city.
  4. Otherwise the text is read with the Ask AI parser (`parseQuery`, using the chosen city and tab as
     defaults). If it understood something (`matched`: one of our cities or localities, buy/rent/office/new
     project words, or a filter) → that URL, e.g. "3 bhk ready to move under 2 cr" →
     `/buy/mumbai?bhk=3&priceMax=20000000&possession=Ready+to+Move`, "pune" → `/buy/pune`.
  5. Nothing understood (e.g. "asdfgh") → **no navigation**; note "No matches for 'asdfgh'. Try a locality,
     project or builder in one of our cities."
- **`?q=` on a search URL** (old links, typed URLs): the search page (and `/new-projects/{city}`) still
  reads `q` with `parseQuery`, using the page's city, mode and path facets as defaults, and 302-redirects
  to the result.
- Unknown mode, city or facet segment → 404. Lookups use `Object.hasOwn`, so built-in object names such
  as `constructor` or `toString` (`/constructor/mumbai`, `/buy/mumbai/constructor`) are a 404, not a 500.
  The same applies to `/localities/{city}/{theme}`, the company pages `/{page}` (e.g. `/constructor`),
  and the review `service` / `source` values on `/reviews` and `POST /api/platform-reviews`.
- **Near me** (target icon in the search box, `nearMe` in `SearchBox.tsx`): asks the browser for the
  location, picks the nearest locality in any city and opens it for the current tab (Buy/Rent/Commercial
  → `/{tab}/{city}/{locality}`, Plots → `/buy/{city}/{locality}/plot`, New projects →
  `/new-projects/{city}?locality=…`). More than 60 km from every locality → "We don't have listings near
  you yet" (no city found at all) or, normally, the **not-covered note**: "We don't cover your area yet.
  Nearest city: {City} (~{N} km). View homes in {City} →" plus links to all our cities, for the current
  tab. Permission refused → "Location permission was denied."; timeout or position unavailable →
  "Couldn't get your location. Try again or pick a city." Needs `localhost` or https.
- **Notes under the search box** behave the same on the home hero and the search-page bar: they appear
  right under the search bar, are scrolled into view (clear of the sticky header), and the "not covered"
  box (near me outside our cities, or a typed city we don't cover) also takes keyboard focus. On the bar it
  uses the site's amber callout style (`border-amber-300 bg-amber-50 text-amber-900`) so it stands out
  on the light page; on the hero it keeps the dark amber style.
- **Cities we don't cover:** an unknown city in a city-scoped URL (`/buy/jaipur`, `/rent/…`,
  `/commercial/…`, `/new-projects/…`, `/city/…`, `/property-rates/…`, `/heatmap/…`, `/managed-rentals/…`,
  `/localities/…`, `/locality/…`) still returns **404**, but `src/pages/404.astro` shows "We're not in
  Jaipur yet" with links to the same section for our cities (city hub for the locality pages). Any
  other 404 looks as before.
- **Cities:** 11 — the ten original demo cities plus **Lucknow** (hand-written sample data: 5 localities,
  4 listings and 3 projects; see `db/seed-data.ts`). Every city list (city picker, header menus, footer,
  home city strip and "Popular cities", search box city menu, "Our cities" links, the 404 page, near me)
  reads the `cities` table, so a new city appears everywhere automatically. The home page's market-insight
  and locality tabs show the cities that have projects, up to 9 (currently the first 8 plus Lucknow).

## Files
- `src/pages/[mode]/[city]/[...facets].astro`
- `src/lib/search.ts`
- `src/lib/repo.ts (searchListings, marketStats)`

## Reference behaviour (Square Yards)
_No direct reference page identified yet._

## Gaps vs reference
_To be filled after REA analysis._
