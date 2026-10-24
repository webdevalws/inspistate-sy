# Feature parity with the reference portal

InspiState follows the feature set and page structure of large Indian property portals; the name, logo, copy,
images and data are our own. Visual theme: dark header, skyline hero with tabbed search, light canvas with white
rounded panels, InspiState gold accent, dark editorial footer.

✅ built · 🟡 built with a limitation · ⛔ not built

12 cities (10 generated demo cities + Lucknow and Navi Mumbai) · Astro 7 on Cloudflare Workers · details per
function in [functions/README.md](functions/README.md).

## Navigation & search
| Feature | Status | Where |
|---|---|---|
| City picker with search and listing counts (12 cities) | ✅ | Header → city button |
| Mega-menus (Buy, Rent, Projects, Services, Tools, Insights, More) | ✅ | Header |
| Search by locality, project or builder (autocomplete) | ✅ | Home hero, search bar |
| Ask AI natural-language search ("2 bhk in powai under 2 cr", "pg for women in koramangala") | 🟡 rule-based parser, no LLM | `src/lib/nlsearch.ts`, `/api/ask` |
| "We're not in {City} yet" for cities we don't cover; never silently searches another city | ✅ | Search box, 404 |
| Voice search | 🟡 browsers with the Web Speech API | Mic icon in search |
| Near me | ✅ | Target icon in search |
| Filters: budget, area, BHK (5 = 5+), type, locality, possession, furnishing, posted by, amenities, verified | ✅ | Search pages |
| PG / co-living: `/rent/{city}/pg`, sharing / for / food filters | ✅ | Rent search |
| Sort, pagination, crawlable facet URLs | ✅ | `/buy/{city}/{locality}/{n}-bhk/{type}` |
| **Map view** (List / Map toggle, one pin per locality with count and price range) | 🟡 locality pins, not exact addresses | `?view=map` on search |
| Save search | ✅ (login) | Search header → account |
| Featured projects in results, market snapshot, breakdowns, budget links, FAQ | ✅ | Search pages |
| Managed rentals (low deposit, zero brokerage) | ✅ | `/managed-rentals/{city}` |

## Listings & projects
| Feature | Status | Where |
|---|---|---|
| Listing cards with View Number (login, daily cap) and Contact | 🟡 demo listings have no phone; owner-posted ones do | Search results |
| Property detail: facts, fair-price meter (not for PGs), EMI, similar | ✅ | `/property/{id}` |
| **Request to book** (unit / budget + visit date; a request, no payment) | ✅ | Project pages, sale listings |
| Project detail: key details, floor plans by BHK, price list, single price when ends are equal | ✅ | `/projects/{city}/{slug}` |
| Recent transactions, price trends, comparable projects, rentals | 🟡 transactions are demo data | Project page |
| Master plan, photos, walkthrough | 🟡 placeholders until media is uploaded | Project page |
| Amenities, specifications, location map, nearby places, travel time | ✅ | Project page |
| RERA details and buyer protections | ✅ | Project page |
| Reviews & ratings with moderation | ✅ | Project page, `/admin` |
| Brochure download (lead-gated on the server, printable) | ✅ | Project page → `/brochure` |
| Share, shortlist, compare, WhatsApp | 🟡 WhatsApp shows once `PUBLIC_WHATSAPP` is set | Project page |
| Compare up to 3 projects | ✅ | `/compare` |
| Builders directory and profiles | ✅ | `/builders` |

## Cities & insights
| Feature | Status | Where |
|---|---|---|
| City hubs: trending searches, buy / rent quick links, price insights, localities, top projects and builders, services by audience, other cities | ✅ | `/city/{city}` |
| Property rates by city and locality | ✅ | `/property-rates/{city}` |
| Price heatmap | ✅ | `/heatmap/{city}` |
| Locality overview pages and guides (affordable, emerging, premium, rental yield) | ✅ | `/locality/…`, `/localities/…` |
| Research reports from our own data | ✅ | `/research` |
| Buyer / seller / tenant / NRI guides, RERA, home loans, women home buyers | ✅ | `/guides`, `/women-homebuyers` |
| Zone tabs on city pages | ⛔ no zone data yet | — |
| News, media coverage | ⛔ needs an editorial team / CMS | — |

## Tools (19)
EMI, home loan eligibility, balance transfer, prepayment, home loan tax benefit, affordability, buy vs rent,
property valuation, stamp duty, capital gains, area converter, vastu (🟡 automatic room detection needs
`ANTHROPIC_API_KEY`; capped per user and per day site-wide), interior cost, modular kitchen, rent receipt, rent
agreement, cost of living, property tax, free credit score — all at `/tools`.

## Services (13)
Home loans, home interiors, property management, legal services, home inspection, packers & movers, home
painting, title search, litigation search, escrow, solar rooftop, **furniture & appliances on rent** (one page;
the old furniture and appliance rental URLs 301 to it), NRI services — at `/services`, with estimators and lead
forms; title search, litigation search, rent agreement, rent receipts, valuation reports and escrow are orders
with coupons. 🟡 Fulfilment needs partners; orders wait for payment until a gateway is added.

## Accounts & engagement
| Feature | Status | Where |
|---|---|---|
| Phone + OTP login, Buyer / Seller / Agent roles, safe redirects back | 🟡 real SMS needs `SMS_WEBHOOK_URL` | Login dialog, `/login` |
| Account: my listings (edit, mark sold / rented, delete), leads received, shortlist, saved searches, enquiries, profile | ✅ | `/account` |
| Listing allowances (3 free) and agent plans (activated by the team after payment) | 🟡 no online payment | `/account/plans`, `/admin` |
| Post property with photos (EXIF / GPS removed), PG / co-living, moderation | ✅ | `/post-property`, `/admin` |
| **Refer a friend** (buyer, seller, tenant, owner) | 🟡 no reward payouts | `/refer` |
| AI property assistant (describe a home → results, or request a call back) | 🟡 rule-based, not an LLM | Every page |
| Real estate forum (ask & answer, login; admin can hide posts) | ✅ | `/forum` |
| Site reviews, newsletter, glossary, agents directory | ✅ | `/reviews`, footer, `/glossary`, `/agents` |

## Admin & operations
| Feature | Status | Where |
|---|---|---|
| Moderation: listings, project reviews, site reviews, forum posts; agent plan requests | ✅ | `/admin` |
| Leads by kind (enquiry, call-back, view number, brochure, service, chat, referral, booking) | ✅ | `/admin?leads=…` |
| Service order status, newsletter subscribers with CSV export | ✅ | `/admin` |
| Audit trail of admin actions; wrong-password slow-down and lock-out | ✅ | `/admin` → Recent admin actions |
| Health check, startup check, reference data, deployment guide, CI | ✅ | `npm run doctor`, `DEPLOY.md`, `.github/workflows` |

## Not built
Mobile apps (and the app-download section), Hindi site, dark mode, video testimonials, awards / press coverage,
referral reward payouts, online payments (orders, plans, bookings), agent CRM, developer self-serve dashboard,
exact listing locations on the map.
