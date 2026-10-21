# Reference analysis — search results & project detail

Source: REA `inspect_web_page` on user-opened tabs (passive; no clicks/navigation by REA).
- Search page `/sale/property-for-sale-in-mumbai` — evidence `ev_40bc64c7…` (12,995 a11y nodes, 468 links)
- Project page `/mumbai-residential-property/{slug}/{id}/project` — saved capture `…1792297591526.txt`

Structure only. No listing data, copy, or media is reused.

## Search results page

### Observed
- **Search bar:** "Project, Locality or Builder" autocomplete + a natural-language box
  (placeholder like "Ready-to-move 2BHK in …"), voice search, "Ask AI".
- **Result count + sort:** "Showing N Listings", "Sort By" control.
- **Filter groups:** Budget (min/max dropdowns, ₹5 L → ₹75 Cr), Area (min/max, 100 → 1.1M sq.ft),
  BHK Type (1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 6+), Property Type (Apartment, Builder Floor,
  Villa, Plot; plus Residential/Industrial plots), Building Type, Furnishing Status
  (Furnished / Semi / Unfurnished), Posted by (Owners / Partner Agents), Possession Status
  (Ready To Move / Under Construction), Amenities, Reset.
- **Listing card:** title (e.g. "2 BHK Flat for Sale in {locality}, {city}"), price, ₹/sq.ft,
  total area, agent name, "Contact Agent", "View Number", shortlist.
- **Project cards (mixed in):** "2, 3 BHK Flats in {project} {locality}", ₹/sq.ft,
  "REPUTED BUILDER" badge, mini location map.
- **Below results (SEO block):** market-at-a-glance stats (total properties, avg price, min/max),
  breakdowns by type / BHK / furnishing, top localities, top developers, browse by budget,
  near landmarks, possession-status tabs (New Launch / Under Construction / Ready to Move),
  FAQ, walkthrough videos.
- **Lead capture:** "Request More Information or a Callback", "Get a Call Back".

### Observed: filter → URL design (crawlable facet pages)
- `/sale/{n}-bhk-for-sale-in-{city}`, `/rent/1-rk-for-rent-in-{city}`
- `/sale/properties-in-{city}-{min}-to-{max}` (e.g. `50-lakhs-to-60-lakhs`, `under-50-lakhs`)
- `/rent/properties-for-rent-in-{city}-{min}-thousand-to-{max}-thousand`
- `/property-rates-in-{city}`, `/property-rates/{locality}-{city}`
- `/{locality}-in-{city}-overview-{id}` (locality overview)
- `/hi/...` (Hindi version exists)

### Inferred
- No XHR/fetch observed during the 1.5 s observation window and none needed for content:
  listings are **server-rendered**; every popular filter combination has its own indexable URL.
  → For SEO parity we should SSR search pages and expose common facets as clean paths,
  with remaining filters as query params.

## Project detail page

### Observed sections (in order)
1. Header: name, locality/city, developer, shortlist, share, map, video, review CTA,
   "Request a callback".
2. Key details: price per sq.ft, starting price, configuration (e.g. 2,3,4 BHK),
   unit size range, possession date, status, RERA no., land area, total units, density (units/acre).
3. **Floor plans & pricing** — tabs per BHK; each unit: type, carpet area, price, 3D floor plan.
4. Recent transactions & government registrations (floor/unit, area, rate/sq.ft).
5. Price trends & market insights (chart), comparable projects, rentals.
6. Master plan, photos, walkthrough video, brochure download.
7. Amenities (Sports & Fitness, Convenience, Safety, Leisure, Environment, Utilities) + specifications.
8. Location & connectivity: nearby landmarks (schools, hospitals, transit), travel-time tool
   ("Choose Starting Point").
9. RERA details with link to the state RERA site.
10. Compare with similar projects; developer track record; resale listings in the project.
11. FAQ; buyer-guidance Q&A; tools (valuation, vastu, interior cost, stamp duty).
12. Enquiry form: name, email, country code + phone; WhatsApp contact; "Enquire Now".

## Not inspected
- Individual resale/rental listing detail page (no tab was open). Card fields above cover
  its core data; will design from those and can verify later.
