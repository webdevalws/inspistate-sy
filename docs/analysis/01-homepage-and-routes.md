# Reference analysis — homepage & site map

Source: REA passive inspection of the public homepage in a user-opened Chrome tab
(`inspect_web_page`, evidence `ev_7e10aacd…` target list; homepage capture saved to tool-results).
Automated headless access was refused by the site's CDN (403, evidence `ev_3474116e…`), so all
observation is passive on pages a human opened.

Purpose: learn *structure and features* to design our own portal. No branding, copy, images,
listing data, or API usage is carried over.

## Observed: homepage structure (accessibility tree, 8,125 nodes)

- Header: city selector (popup with searchable list of all cities, each with a listing count),
  login button, app-download QR widget.
- Hero search: free-text "locality" search box, Search button, an "Ask AI" assistant button.
- Floating widgets: property chat, shortlist (saved properties), login dialog.
- Sections in order (h2 headings):
  1. Hot selling projects (cards)
  2. Property price insights (charts — Highcharts loaded)
  3. Discover more properties (collections by type)
  4. Top localities
  5. Top developers
  6. Research, recognitions & media coverage
  7. Company/platform stats block
  8. Referral banner (refer a friend for services)
- Footer: large SEO link grid (city × category), tools, guides, company links.

## Observed: tech of the reference site (for context only)

Server-rendered HTML pages with jQuery + per-page minified bundles (`home-v2-*.js`,
`common-library-*.js`, `shortlist-common-*.js`, `commonleadform.js`), Highcharts, GTM, WordPress blog
under `/blog`. Our stack (Astro + React islands on Cloudflare) is a modern equivalent of this
SSR-first, SEO-heavy model.

## Observed: URL / route patterns (786 links on homepage)

| Page type | Pattern | Our equivalent |
|---|---|---|
| Buy search (city) | `/sale/property-for-sale-in-{city}` | `/buy/{city}` |
| Commercial search | `/sale/commercial-properties-in-{city}` | `/commercial/{city}` |
| Rent search | `/rent/property-for-rent-in-{city}` | `/rent/{city}` |
| New launches | `/new-launch-projects-in-{city}` | `/new-projects/{city}` |
| Project detail | `/{city}-residential-property/{slug}/{id}/project` | `/projects/{city}/{slug}-{id}` |
| New project (alt) | `/{slug}-{locality}-{city}-npd-{id}` | (same as above) |
| Builder profile | `/{builder}-projects/{id}/builder` | `/builders/{slug}` |
| City hub | `/{city}-real-estate` | `/{city}` |
| Locality guides | `/{theme}-localities-in-{city}-lgp` (affordable, emerging, family-friendly, business-friendly, transportation-friendly, educational-centers) | `/{city}/localities/{theme}` |
| Price heatmap | `/heatmap/{city}` | `/{city}/price-map` |
| Research reports | `/research-reports/{slug}` | `/insights/{slug}` |
| Guides | `/guide/{buyer,seller,tenant,nri}-guide` | `/guides/{slug}` |
| Blog | `/blog/{slug}`, `/blog/category/{cat}` | `/blog/...` |
| Post property | `/post-property` | `/post-property` |

## Observed: tools & services linked

Calculators: affordability, buy-vs-rent, cost-of-living, area converter, stamp duty, vastu,
capital gains, property tax, online valuation.
Services: home loans, interiors, property management, packers & movers, rent agreement,
rent receipts, legal / title search / litigation search, property inspection, painting,
furniture/appliance rental, solar rooftop, escrow.
Other: reviews, rewards/referrals, forum, FAQ, fraud identification, careers, partner program,
advertise.

## Still to inspect

- [ ] Search results page — filters, sort, card fields, pagination, map, how results load
- [ ] Property listing detail page
- [ ] New project detail page
