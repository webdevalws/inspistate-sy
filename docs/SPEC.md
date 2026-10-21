# Product spec — real-estate portal (working name: "Plotline")

Original product inspired by the feature set of large Indian property portals
(see `docs/analysis/`). Own name, branding, copy, and data.

## Stack
- **Astro 5** (SSR, `@astrojs/cloudflare` adapter) + **React** islands + **TypeScript** + **Tailwind**
- **Cloudflare Pages/Workers** runtime, **D1** (SQLite) database, **R2** for images, **KV** for cache
- Charts: lightweight (e.g. Chart.js/uPlot) ; Maps: Leaflet + OpenStreetMap tiles

## Phases

### Phase 1 — Clickable prototype (demo data, no backend)
- Home: city picker, hero search with autocomplete, featured projects, top localities,
  top developers, collections, tools strip, footer link grid
- Search `/buy/{city}`, `/rent/{city}`, `/new-projects/{city}`, `/commercial/{city}`:
  filters (budget, area, BHK, property type, furnishing, posted by, possession, amenities),
  sort, result count, listing + project cards, pagination, SEO stats block, FAQ
- Project detail `/projects/{city}/{slug}`: all sections from analysis §Project
- Listing detail `/property/{id}`
- Builder profile `/builders/{slug}`, city hub `/{city}`
- Tools: EMI calculator, affordability, buy-vs-rent, area converter, stamp duty
- Shortlist (local), enquiry modal (no-op)

### Phase 2 — Core MVP
- D1 schema: cities, localities, builders, projects, units, listings, media, amenities, leads, users
- SSR search with SQL filters; facet pages as clean URLs; sitemap.xml; JSON-LD
- Lead capture → D1 + email notification; R2 image upload
- Price trends from listing data

### Phase 3 — Full platform
- Auth (email OTP), user dashboard: saved searches, shortlists, enquiries
- Post property flow (owners/agents), listing moderation
- Builder/agent dashboard: projects, units, leads
- Admin panel: approvals, content, users
- Blog / guides / research (MDX content collections)
- Reviews & ratings, price heatmap, compare projects
