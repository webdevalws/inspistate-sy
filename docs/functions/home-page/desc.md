# Home Page (hero & editorial landing)

**Route:** `/` · **Area:** Discovery

## What it does
The landing page. A full-screen "layered depth" hero shows a giant INSPISTATE wordmark sitting
*behind* a cut-out of a residential tower, with live platform stats, the headline, CTAs and a
short excerpt overlaid. Below it the whole page uses one editorial system (sand bands alternating with
espresso bands, hairline borders, mono bracket labels, wide display headings):
1. Search dock overlapping the hero, then a scrolling city marquee (pauses on hover).
2. About — photo collage + statement heading + 4 live stats + CTAs.
3. Curated collections — 6-tile bento (exactly fills 4×3 / 2×N) + "Also explore" chips.
4. Hot selling projects — espresso band, tall photo cards (snap rail on mobile, 5-col grid on desktop).
5. Market insights — mono city tabs; 4 data cards (price movement, trend, rental yield, registrations).
6. Owner & seller band — full-bleed photo, post-property CTAs, 3 stats.
7. Top localities (mono city tabs, photo rail) + top developers monogram grid.
8. Residents' reviews (big rating + quotes) beside a numbered guides list.
9. Tools — espresso band, numbered hairline grid.
10. City directory — hairline grid, cells invert on hover.
11. Expert strip (`#expert`) — compact: heading, consultation + tour buttons, one row of platform numbers.
12. Footer (site-wide, `Footer.astro`) — opens with the signature full-width INSPISTATE wordmark
    behind the tower cut-out (`.ft-art`, dusk glow; image rendered at 210vw on phones); **on the home
    page only** (`flush`), the tagline "Search smarter. Live better." sits centred under the wordmark in
    the same mono style as the bottom-bar tagline; below that the options: blurb, Explore/Post buttons (`.ed-pair-tight`), newsletter, socials and the hairline link
    directory (2 columns on phones, 4 from sm); then a mono bottom bar.

**Phones:** every button pair uses `.ed-pair` (two equal halves side by side, inline from `sm`); the
search form puts city + Search on one row under the query field.

## Inputs
- Platform totals from D1 (`platformTotals()`): active listings, projects, cities.
- Search box props (`searchBoxProps()`), discover-category starting prices (`homeMarket()`).
- User interaction: scroll / pointer move (parallax), city tabs, tour and consultation buttons.

## Outputs
- Server-rendered HTML; `SearchBox` hydrates on load.
- "Explore Homes" scrolls to `#home-search`; "Watch 4K Tour" opens the existing video-tour modal.
- Collection tiles and chips link to the matching search pages; cards link to projects, localities,
  builders, tools, guides and city pages.

## How it works
- **Layering:** `hero-towers-bg.webp` (z-0) + warm `mix-blend-color` sky tint → wordmark (z-1) →
  `hero-towers-cut.webp`, the same photo with a transparent sky (z-2) → legibility gradient (z-3) →
  content (z-4). Both photo layers share `object-cover` + `object-position` so they stay aligned; the
  cut-out has its own lighter grade (`.hero-cut`), which is safe because it fully covers the towers.
- **Art direction:** a `<picture>` swaps in `hero-towers-portrait-*.webp` (3:4 crop around the
  middle tower) when `orientation: portrait`.
- **Source photo:** Pexels photo #39135603 (free Pexels licence), 5472×3080. Top 23% of sky cropped so
  rooflines sit 23–37% down the hero; cut-out made with OpenCV GrabCut, exported at 3200 px (landscape)
  and 1350×1800 (portrait). Regenerate both layers together if the photo changes.
- **Responsive rules:** `--wm-size: clamp(36px, min(12.4vw, 24svh), 250px)`; `--wm-top` is
  `max(5.5rem, 13svh)` in landscape and `calc(31svh - wm-size × 0.6)` in portrait, so the wordmark's
  lower edge tucks behind the roofline at any ratio. Content padding is derived from the same vars,
  and the hero is `min-h-[100svh]`, so it grows instead of overlapping on short screens.
- **Motion:** CSS entry animations (photo settles, wordmark rises, overlays fade up). An inline
  script moves each `.hero-layer` by its `data-depth` on scroll and pointer move; disabled under
  `prefers-reduced-motion`.
- **Header:** every page uses the INSPISTATE wordmark, mono uppercase nav with a hairline underline
  (`.nav-line`) and hairline buttons; on `/` it floats transparent over the hero, elsewhere it is a
  sticky espresso bar.
- **City picker** (`islands/CityPicker.tsx`, next to the wordmark on every page and screen size): the
  trigger shows the current city in the header's mono nav-link style and opens the existing dialog
  (search box + every city in the `cities` table — 11 in the demo data — with live listing counts; native `<dialog>`, so Tab/Enter work and Esc or
  a backdrop click closes it). Choosing a city stores it in the `is_city` cookie (1 year) and goes to the
  same page for that city on city pages (`/buy/{city}…` etc.), else to `/city/{city}`. The current city is
  `currentCity()` (`src/lib/city.ts`): city in the URL, else the cookie, else the first city — used by
  the header menus, the footer's "Popular searches" links and the home search box's default city.
- **Site-wide theme:** `global.css` overrides the Tailwind palettes so every page follows the hero:
  `brand` = espresso, `accent`/`amber` = bronze-sand, `slate`/`neutral`/`gray` = warm stone,
  `violet`/`purple` = clay, `blue`/`sky`/`indigo` = olive-taupe; `canvas` = #F7F4EE. Emerald/rose are
  untouched (price up/down). Inline chart colours were moved to the same palette.
- **Tokens:** `--color-sand-50/100/200`, `--font-display` (Archivo, wide axis), `--font-mono`
  (DM Mono) in `global.css`; helpers `.hero-*`, `.bracket`, `.warm-tone`, `.nav-line`, `.ed-label`, `.ed-link`,
  `.ed-btn(-sand|-dark|-ghost-light|-ghost-dark)`, `.ed-rail` (snap rail → grid at lg, `--cols`), `.ed-marquee`.

## Data loading (item 79)
- The asking-price histogram and median per city are computed in SQL (`homeInsights` in `src/lib/community.ts`: one
  grouped query for 6 equal-width buckets, one window-function query for the median) — about 75 rows instead of
  one row per live sale listing (411 in the demo data). Results are identical to the old JS calculation.
- Projects are loaded once through `allProjects()` (`src/lib/repo.ts`, newest first, cached for 5 minutes) and
  shared by the home page and the search box (they used to query all projects twice).
- `homeInsights` is cached for 5 minutes with the shared `cached(key, load)` helper in `src/lib/repo.ts`.

## Footer newsletter without JS (item 78)
- The footer signup is a real form (`method="post" action="/api/newsletter"`, input `name="email"`, hidden
  `back` = current page). With JS it still posts JSON and shows the result in place. If it is submitted before
  the island loads (it hydrates when the footer scrolls into view) or without JS, `/api/newsletter` reads the
  form, then redirects (303) back to `back` (checked with `safeNext`) with `?newsletter=ok|invalid|error#site-footer`,
  and the footer shows the matching message. The same-site check and 5-per-day limit apply to both.

## Header city picker on phones (item 76)
- Below the `sm` breakpoint the city picker shows only the pin and caret; the city name is kept as screen-reader
  text (the button is announced as the city, and its tooltip says "Change city (Navi Mumbai)"). This stops long
  names from running under the shortlist and account buttons when logged in. From `sm` up the name shows, capped
  at `max-w-40` and truncated (`src/components/islands/CityPicker.tsx`).

## Ask in plain words (item 75)
- The "Ask in plain words →" link above the hero search box used to point at `/property-search` (a 404). It now
  jumps to `#home-search` and, with JS, focuses the search box with an example ("Try: 2 BHK in Powai under 3 Cr,
  ready to move"); the box already reads plain-language queries with the Ask AI parser (`src/lib/nlsearch.ts`).

## Files
- `src/pages/index.astro` — all sections, collection/project data, parallax script.
- `src/components/EdHead.astro` — shared editorial section header (label, title, intro, link; `dark`).
- `src/components/Tabs.astro` — `mono` variant (hairline underline tabs) used for city switchers.
- `src/components/Footer.astro`, `src/components/islands/Newsletter.tsx` — editorial footer.
- `src/components/islands/SearchBox.tsx` — mobile row layout (city + Search side by side).
- `src/components/Header.astro` — overlay header variant.
- `src/styles/global.css` — tokens and hero styles. `src/layouts/Base.astro` — font links.
- `public/images/hero-towers-{bg,cut}.webp`, `public/images/hero-towers-portrait-{bg,cut}.webp`.

## Reference behaviour
Visual direction taken from a user-supplied design video (a "HESTIA" desert-brutalist residence
concept): wordmark behind building, stacked micro-stats, bottom-left headline + boxed CTA,
bottom-right excerpt, cream About section and asymmetric mood-board with a large preview.
Only the layout idea was used; all copy, data and imagery are InspiState's own.

## Gaps vs reference
- One hero photo only (the old 4-video background switcher was removed; tours remain in the modal).
- Only six real photos exist, so localities/projects reuse them. `interior-luxury-living.jpg` carries an
  "AD" watermark (top-left); it is cropped out where used, but the file should be replaced.
