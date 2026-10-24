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
     **no navigation**; the note under the box says "We're not in Jaipur yet." followed by one label,
     "Our cities:", with links to all our cities (same box and label as the near-me note). It never quietly
     shows another city. The 404 page for an unknown city also uses a single label ("InspiState covers these
     N cities for now:").
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
- **Seed date (item 72):** `db/build-seed.ts` uses a fixed "today" (`SEED_DATE = 2026-10-24`) instead of the
  clock, so `db/seed.sql` no longer changes after every reset. Demo "posted N days ago" dates, transactions and
  reviews are relative to that date and will look older over time.
- **Cities:** 12 — the ten original demo cities plus **Lucknow** and **Navi Mumbai** (hand-written sample
  data, 5 localities each with real coordinates; Lucknow 4 listings and 3 projects, Navi Mumbai — Vashi,
  Nerul, CBD Belapur, Kharghar, Panvel — 4 listings (ids 50808–50811) and 3 projects (ids 1034–1036,
  `MAHARERA-DEMO-…`); see `db/seed-data.ts`). Navi Mumbai is no longer in the not-covered list
  (`src/data/indian-cities.ts`). The Ask AI parser matches longer city names first, so "navi mumbai" is
  Navi Mumbai, not Mumbai. Every city list (city picker, header menus, footer,
  home city strip and "Popular cities", search box city menu, "Our cities" links, the 404 page, near me)
  reads the `cities` table, so a new city appears everywhere automatically. The home page's market-insight
  and locality tabs show the first 8 cities plus every city added **after the original ten** demo cities
  that has projects (`ORIGINAL_CITIES = 10` in `src/pages/index.astro`) — today Mumbai…Chennai plus Lucknow
  and Navi Mumbai (10 tabs; Thane and Kolkata are not tabs).

## PG / co-living (item 49)
- **Type:** `PG` (shown as "PG / Co-living", `typeLabel` in `src/lib/search.ts`), residential and **rent only**; BHK 0,
  price = monthly rent per bed, area = room size. Details in `listings.pg_sharing` / `pg_for` / `pg_food`
  (migration 0012), read into `Listing.pg`.
- **URLs:** `/rent/{city}/pg` is a normal type facet (`TYPE_SLUGS.pg`). `/buy/{city}/pg` and
  `/commercial/{city}/pg` **301** to the same facets under `/rent`.
- **Filters:** in Rent mode the type list adds "PG / Co-living"; while it is chosen, a PG group offers sharing
  (`sharing=single,double,triple`), who it is for (`pgFor=men,women,any`) and `food=1`, and BHK is hidden.
- **Ask AI / search box text:** "pg", "paying guest", "co-living" and "hostel" mean Rent + type PG; "women /
  girls / ladies" or "men / boys" set `pgFor`, "single / double / triple" set `sharing`, "with food" sets `food=1`.
- **Rates:** PGs are left out of per-sq.ft rent averages (search market stats, locality rent rate, city hub),
  because their rent is per bed. The property page hides "Is this a fair price?" for PGs.
- **Display:** titles like "Double sharing PG for Women in Koramangala, Bengaluru"; price "₹14,000/month per bed".
- **Demo data:** 3 hand-written PGs (ids 50805–50807: Koramangala women / double / food, Hinjewadi men / triple /
  food, Powai anyone / single / no food), inserted after the Lucknow rows so every earlier row is unchanged.

## Map view (item 55)
- **Toggle:** a "List / Map" pair of real `<button>`s (a GET form that resubmits the current search with or
  without `view=map`, so it works with the keyboard and without JS). `view` is not a filter key, so the
  filter panel, sort, pagination, Reset and "Clear all filters" keep it; it is in the URL, so sharing and
  back/forward work. Works for buy, rent, commercial and PG results.
- **Pins:** `searchLocalityPins(mode, city, filters)` in `src/lib/repo.ts` — **one grouped query** by locality
  (count, min and max price) using the same WHERE builder (`filtered()`) as the list, so pins match the
  current search and filters exactly; it never loads listings. Coordinates come from the cached locality
  reference data.
- **Map:** `src/components/islands/SearchMap.tsx` reuses the heatmap's Leaflet + OpenStreetMap setup and is
  rendered (`client:only`) **only in Map view**, so Leaflet loads only then. Pins use the theme's brand
  colour. Popup: locality name, matching count, price range (`formatRange`), and "View N homes in X →" to
  that locality with the same filters (list view).
- No results → the normal empty state. Map view hides pagination and shows "Pins show localities, not
  exact addresses." Listings have no coordinates of their own; exact pins would need a migration.

## Cached stats (item 80)
- Whole-table and whole-city stats are cached per isolate for 5 minutes with `cached(key, load)` (`src/lib/repo.ts`):
  `cityStats`, `platformTotals`, `countProjectsByBuilder`, `marketStats(mode, city, purpose)` (the snapshot below
  search results) and, in `src/lib/community.ts`, `homeMarket`, `homeInsights` and `localityMarket(city)`. Callers
  are unchanged. **Counts and averages can lag up to 5 minutes** after a listing is approved, edited or closed;
  the listings themselves (search results, detail pages) are always read live.

## Search box data (item 81)
- The page only sends the search box **cities and localities** (`searchBoxProps`), which it needs in the browser for
  near-me and plain-language search. Locality suggestions are still instant.
- **Projects and builders** are suggested on demand: from 2 characters, after a 150 ms pause, the box calls
  `GET /api/suggest?q=…&city=…` (`src/pages/api/suggest.ts`), which filters a cached in-memory list (5 minutes) and
  returns at most 8 matches, the chosen city's projects first. Answers are remembered per query on the page.
- Pressing Enter before the server suggestions arrive waits for them, so "ganga gomti" + Enter still opens the
  project. `/api/suggest` has the same-site check and a per-IP daily limit of 2,000 (`guard()`), generous for
  normal typing.

## Canonical URLs (item 82)
- `Base.astro` sets the canonical to the page path without query filters. Paginated lists pass their current page
  (`<Base page={…}>`): search results, managed rentals and reviews — so page 2+ points at itself
  (`/buy/mumbai?page=2`) instead of page 1. Listing, project, city and locality pages use their own path.

## Files
- `src/pages/[mode]/[city]/[...facets].astro`
- `src/lib/search.ts`
- `src/lib/repo.ts (searchListings, marketStats)`

## Reference behaviour (Square Yards)
_No direct reference page identified yet._

## Gaps vs reference
_To be filled after REA analysis._
