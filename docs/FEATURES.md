# Feature parity with the reference portal

Visual theme mirrors the reference layout: black header, skyline hero with tabbed search, light-grey canvas
with white rounded section panels, dark city pills, pastel insight cards, black footer with gold headings.
Accent colour is InspiState gold (not the reference yellow) and the logo/name are our own.

✅ built · 🟡 built with a limitation · ⛔ not built (out of scope)

## Navigation & search
| Feature | Status | Where |
|---|---|---|
| City picker with search and listing counts | ✅ | Header → city button |
| Mega-menus (Buy, Rent, Projects, Manage, Finance, Interiors, For Professionals, Insights) | ✅ | Header |
| Search by project, locality or builder (autocomplete) | ✅ | Home hero, search bar |
| Ask AI natural-language search | 🟡 rule-based parser, no LLM | `src/lib/nlsearch.ts`, `/api/ask` |
| Voice search | 🟡 browsers with Web Speech API (Chrome, Edge) | Mic icon in search |
| Near me | ✅ | Target icon in search |
| Filters: budget, area, BHK, type, locality, possession, furnishing, posted by, amenities, verified | ✅ | Search pages |
| Sort, pagination, crawlable facet URLs | ✅ | `/buy/{city}/{locality}/{n}-bhk/{type}` |
| Save search | ✅ (login) | Search header → My account |
| Featured projects mixed into results | ✅ | Search results |
| Market snapshot, type/BHK/furnishing breakdowns, budget links, possession tabs, top developers, FAQ | ✅ | Below search results |

## Listings & projects
| Feature | Status | Where |
|---|---|---|
| Listing cards with View Number and Contact | 🟡 demo listings have no phone; owner-posted ones do | Search results |
| Property detail: facts, fair-price meter, EMI, similar | ✅ | `/property/{id}` |
| Project detail: key details, floor plans by BHK, price list | ✅ | `/projects/{city}/{slug}` |
| Recent transactions, price trends, comparable projects, rentals tabs | 🟡 transactions are demo data | Project page |
| Master plan, photos, walkthrough tabs | 🟡 placeholders until media is uploaded | Project page |
| Amenities by group, specifications | ✅ | Project page |
| Location map, nearby places, travel-time tool | ✅ | Project page |
| RERA details and buyer protections | ✅ | Project page |
| Reviews & ratings with moderation | ✅ | Project page, `/admin` |
| Developer track record, resale in project, similar projects | ✅ | Project page |
| Brochure download (lead-gated, printable) | ✅ | Project page → `/brochure` |
| Share, shortlist, compare, WhatsApp | 🟡 WhatsApp shows once `PUBLIC_WHATSAPP` is set | Project page |
| Compare up to 3 projects | ✅ | `/compare` |

## Insights
| Feature | Status | Where |
|---|---|---|
| Property rates by city and locality | ✅ | `/property-rates/{city}` |
| Price heatmap | ✅ | `/heatmap/{city}` |
| Locality overview pages | ✅ | `/locality/{city}/{slug}` |
| Locality guides (affordable, emerging, premium, rental yield) | ✅ | `/localities/{city}/{theme}` |
| Buyer / seller / tenant / NRI guides, RERA, home loans | ✅ | `/guides` |
| News, research reports, media coverage | ⛔ needs an editorial team / CMS | — |

## Tools (15)
EMI, home loan eligibility, affordability, buy vs rent, property valuation, stamp duty, capital gains,
area converter, vastu, interior cost, rent receipt generator, rent agreement draft, cost of living,
property tax estimator, free credit score (links to official CIBIL report) — all ✅ at `/tools`.

## Services (14)
Home loans, interiors, property management, legal services, title search, litigation search, escrow,
inspection, packers & movers, painting, furniture rental, appliance rental, solar rooftop, NRI services — ✅ lead-capture pages at `/services`. Fulfilment needs partners.

## Accounts & engagement
| Feature | Status | Where |
|---|---|---|
| Phone + OTP login | 🟡 code shown on screen locally; set `SMS_WEBHOOK_URL` for real SMS | `/login` |
| Synced shortlist, saved searches, my listings, my enquiries, profile | ✅ | `/account` |
| Post property with photos, moderation | ✅ | `/post-property`, `/admin` |
| AI property assistant (describe a home → matching results, or request a call back) | 🟡 rule-based, not an LLM | Every page |
| Admin: leads by type, listing and review moderation | ✅ | `/admin` |
| Agents directory (hero “Agents” tab) | ✅ | `/agents` |
| Real estate forum (ask & answer, login required) | ✅ | `/forum` |
| Glossary | ✅ | `/glossary` |
| Women home buyers guide | ✅ | `/guides/women-home-buyers` |

## Not built
Mobile apps (and the app-download/QR section), Hindi site, dark mode, video testimonials, awards/media
coverage (needs real press), rewards/referral programme, agent CRM (SuperAgent-style),
developer self-serve dashboard, escrow/payments.
