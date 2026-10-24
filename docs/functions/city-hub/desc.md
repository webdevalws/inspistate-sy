# City Hub

**Area:** Discovery · **Route:** `/city/{city}` · **Status:** built

## What it does
One page per city that links into everything we have for it: search, localities, projects and services.

## Inputs
- City slug (unknown city → 404)

## Outputs
- Hero with Buy / Rent / New Projects / Commercial tiles
- Trending searches, Buy / Rent quick links, price insights, localities table, top projects (6, with "View all N projects →"), top builders, services by audience, other cities

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
- **Buy / Rent quick links:** two cards (buy, rent; residential) with groups By budget (`BUDGET_BANDS`, same
  labels and `priceMin`/`priceMax` URLs as the search page), By type (flats, builder floors, villas, plots →
  `/buy/{city}/{type}`) and By BHK (1–5+ → `/buy/{city}/{n}-bhk`), each with its count. Links with no
  listings, groups with no links and a card with no groups are hidden.
- **Price insights:** tiles for average sale rate (`cityStats`), average rent per sq ft and ready-to-move
  share (`cityFacets`), average YoY growth and the priciest / most affordable locality (locality reference
  data, linking to locality pages), plus links to `/property-rates/{city}` and `/heatmap/{city}`. Each tile
  shows only when it has data; the whole section and the rate/heatmap links hide when there is nothing.
- **Localities table:** each name links to its locality page (`/locality/{city}/{slug}`, via `localityUrl`
  in `src/lib/urls.ts`); hidden when the city has no localities. The Buy and Rent links show only when that locality has listings for sale / rent.
- **Top projects:** the first 6 of the city's projects as `ProjectCard`s; when there are more than 6, a
  "View all N projects →" link goes to `/new-projects/{city}`. Hidden when the city has no projects.
- **Top builders:** up to 4 developers with projects in the city (most projects first, then most delivered),
  counted from the projects the page already loads, shown with the `/builders` card markup and linking to
  `/builders/{slug}`. Hidden when the city has no projects.
- **Services by audience:** `Tabs` (pill) with For buyers / For tenants / For owners, using the
  `/services` card markup. Cards are built from `SERVICES`, `TOOLS` and `GUIDES` by slug, so a card only
  appears if its page exists; plus "Post your property" for owners. Tenants get Furniture & appliances on
  rent, packers & movers, rent agreement, rent receipts, buy vs rent and the tenant guide.
- **Other cities:** a card per other city (name, state, listing count, average rate) linking to
  `/city/{slug}`, from the `cityStats()` result the page already loads; cities without listings show
  "New on InspiState".

- **New cities** appear here automatically (city picker, footer, other-cities grid all read the `cities`
  table); Navi Mumbai (item 50) is the 12th.

## Files
- `src/pages/city/[city].astro`, `src/components/Tabs.astro`, `src/lib/catalog.ts`, `src/data/guides.ts`
- `src/lib/repo.ts` (`cityFacets`), `src/lib/search.ts` (`BUDGET_BANDS`)

## Reference behaviour (Square Yards)
Reference page: city landing pages (e.g. https://www.squareyards.com/mumbai-real-estate) — trending
searches, top projects, localities, builders, services and price insights.

## Gaps vs reference
- **Not built:** zone tabs (no zone data; phase 2).
