# City Hub

**Area:** Discovery · **Route:** `/city/{city}` · **Status:** built

## What it does
One page per city that links into everything we have for it: search, localities, projects and services.

## Inputs
- City slug (unknown city → 404)

## Outputs
- Hero with Buy / Rent / New Projects / Commercial tiles
- Trending searches, localities table, projects

## How it works
- **Data:** reference data from `getRefs()`, `cityStats()`, the city's projects, and one extra grouped query,
  `cityFacets(city)` in `src/lib/repo.ts`. It counts the city's live listings (`status = 'active' AND
  closed IS NULL`) by purpose × segment × type × BHK (5 = 5+) × locality × budget band, with
  ready-to-move counts and rate sums, and is cached per isolate for 5 minutes (like `cityListingCounts`).
  Helpers: `count(filter)`, `ready(filter)`, `avgRate(filter)`. Budget bands come from `BUDGET_BANDS` in
  `src/lib/search.ts`, shared with the search page's budget links.
- **Hidden when empty:** every link built from facets is shown only when it has at least one listing, and a
  section with no links is not rendered.
- **Trending searches:** the 3 busiest localities for sale, 2 BHK for sale, ready to move, homes under
  ₹50 L and flats for rent, each with its listing count.

## Files
- `src/pages/city/[city].astro`
- `src/lib/repo.ts` (`cityFacets`), `src/lib/search.ts` (`BUDGET_BANDS`)

## Reference behaviour (Square Yards)
Reference page: city landing pages (e.g. https://www.squareyards.com/mumbai-real-estate) — trending
searches, top projects, localities, builders, services and price insights.

## Gaps vs reference
- **Not built:** zone tabs (no zone data; phase 2).
