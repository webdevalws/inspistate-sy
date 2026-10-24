# Product spec — InspiState

InspiState is a real-estate portal for India: buy, rent (including PG / co-living), new projects and commercial,
with city and locality insights, tools, home services and owner/agent accounts. The feature set follows large
Indian property portals (see `docs/analysis/`); the name, branding, copy and data are our own. Every builder,
project, listing and person in the demo data is fictional.

Feature-by-feature status: [FEATURES.md](FEATURES.md). Per-function details: [functions/README.md](functions/README.md).
Deployment: [../DEPLOY.md](../DEPLOY.md).

## Stack
- **Astro 7** (server-rendered, `@astrojs/cloudflare` 14 adapter) + **React 19** islands + **TypeScript** +
  **Tailwind 4**
- **Cloudflare Workers** runtime with **D1** (SQLite) for all data, **R2** for listing photos, and the
  **Images** and **KV** (`SESSION`) bindings the Astro adapter uses
- Maps: **Leaflet** + OpenStreetMap tiles (price heatmap, search map view). Charts: hand-drawn SVG.
- AI: the Vastu tool's room detection calls Claude (optional, cost-capped); Ask AI search and the site assistant
  use our own rule-based parser.

## Data
- **13 migrations** in `migrations/` (additive since 0002). Highlights: accounts and reviews (0002), forum (0003),
  newsletter (0004), service orders (0005, 0007), AI usage counters (0006), managed rentals (0008), site reviews
  (0009), roles and plans (0010), listing lifecycle (0011), **PG / co-living details (0012)**, **admin audit
  (0013)**.
- **12 cities**: Mumbai, Bengaluru, Delhi, Gurugram, Noida, Pune, Hyderabad, Chennai, Thane, Kolkata (generated
  demo data) plus Lucknow and Navi Mumbai (hand-written, real locality coordinates). 57 localities.
- **Local**: `npm run db:reset:local` builds `db/seed.sql` (fixed seed date 2026-10-24, so the file is the same
  on every machine and run) and loads 36 projects and 811 listings. **Production**: reference data only (`db/reference.sql`: cities and
  localities with reference prices); the demo seed is never loaded remotely.

## What is built (Phase 1 complete)
- **Search**: `/buy|rent|commercial/{city}` with crawlable facets (`/{mode}/{city}/{locality}/{n}-bhk/{type}`),
  every filter, sort, pagination, saved searches, Ask AI text search, near me, voice; **List / Map view**
  (locality pins); PG / co-living at `/rent/{city}/pg` with sharing / for / food filters.
- **Detail pages**: listings (fair-price meter, EMI, similar, request to book for sales), projects (units, floor
  plans, transactions, trends, reviews, RERA, brochure behind a lead, request to book), builders, localities.
- **City hubs** `/city/{city}`: trending searches, buy/rent quick links, price insights, localities, top projects
  and builders, services by audience, other cities. Insights: property rates, heatmap, locality guides, research.
- **Accounts**: phone OTP login with Buyer / Seller / Agent roles, listing allowances and agent plans; account
  page with listings (edit, sold / rented, delete), leads received, shortlist, saved searches, enquiries.
- **Leads**: enquiries, call-backs, view number (login), brochures, service requests, chat, **referrals**
  (`/refer`) and **booking requests** — one `leads` table with a kind, rate-limited per IP.
- **Tools (19)** and **home services (13)** with estimators and lead or order forms; service orders with
  coupons and statuses.
- **Admin** `/admin`: listing, review, site-review and plan moderation; leads filtered by kind; service order
  status; forum hide / unhide; newsletter list with CSV export; audit trail of every admin action; wrong-password
  slow-down and lock-out.
- **Privacy & safety**: EXIF/GPS stripped from uploaded photos; photos of rejected or deleted listings are not
  served (owner-deleted ones are removed from R2); same-site checks and daily limits on every public API.
- **Operations**: `.dev.vars.example`, `npm run doctor`, a production startup check, reference data script,
  `DEPLOY.md` (setup, update, backup, restore) and GitHub Actions CI (build + type check on every PR).

## Next (Phase 2 ideas, not built)
- Exact listing locations (needs listing coordinates and a pin picker) on the map view.
- Payments (service orders, agent plans, bookings) through a payment gateway; referral rewards.
- Builder / agent self-serve dashboards; real media for projects; editorial content (news, research) via a CMS.
- Zone-level city pages; Hindi; mobile apps.
