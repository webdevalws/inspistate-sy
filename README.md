# InspiState

Real-estate portal for India — buy, rent, new projects and commercial — built with
Astro + React islands + TypeScript + Tailwind, deployed on Cloudflare.

**Status: Phase 2** — data in Cloudflare D1, photos in R2, enquiries and owner listings are saved,
admin moderation at `/admin`. See [docs/SPEC.md](docs/SPEC.md) for the phase plan and
[docs/analysis/](docs/analysis/) for the reference-site study.

## Run locally

```sh
npm install
npm run db:reset:local   # build seed SQL, apply migrations, load demo data into local D1
npm run dev              # http://localhost:4321
```

Local D1/R2 data lives in `.wrangler/state/`. Local secrets go in `.dev.vars` (git-ignored):

```
ADMIN_PASSWORD=choose-a-strong-password
# Optional, local dev only — ignored by `astro build`, `npm run preview` and production.
# This 6-digit code logs in any mobile number:
TEST_OTP=123456
# Show the real login code on screen instead of sending an SMS:
DEV_SHOW_OTP=1
```

`/admin` uses HTTP Basic auth — any username, the password above.

Phone login needs one of `TEST_OTP`, `DEV_SHOW_OTP` (local) or `SMS_WEBHOOK_URL` (production); without
them the login dialog says "Login by SMS is not configured yet". See `docs/functions/login/desc.md`.

## Database

| Command | Where | What it does |
|---|---|---|
| `npm run db:seed:build` | files only | Regenerate `db/seed.sql` from `db/seed-data.ts` |
| `npm run db:migrate:local` | **local** | Apply `migrations/*.sql` to `.wrangler/state/` |
| `npm run db:seed:local` | **local** | Replace all local data with the demo seed (destructive, local only) |
| `npm run db:reset:local` | **local** | `db:seed:build` + `db:migrate:local` + `db:seed:local` |
| `npm run db:migrate:remote` | ⚠️ **remote** | Apply new migrations to the production database |
| `npm run db:reference:build` | files only | Regenerate `db/reference.sql` (cities + localities only) |
| `npm run db:reference:remote` | ⚠️ **remote** | Load reference data into production — inserts only, never deletes |
| `npm run db:seed:remote` | ⛔ **remote** | **Never on production.** Deletes production data and loads the demo seed — blocked unless confirmed (below) |

> ⛔ **`db:seed:remote` wipes production.** `db/seed.sql` starts with `DELETE FROM` for leads, listings
> (including owner-posted ones), listing photos, shortlists, saved searches, reviews, transactions, the
> forum and the reference tables. The command runs `db/confirm-remote-seed.ts` first, which prints this
> warning and stops. Don't use it for production at all: a new production database gets
> `db:reference:remote` instead (see [DEPLOY.md](DEPLOY.md)). Day to day, use the **local** commands.

Schema: `migrations/0001_init.sql`. New schema changes go in a new numbered migration file.

## Deploy (Cloudflare)

See **[DEPLOY.md](DEPLOY.md)** for the step-by-step first-time setup (D1, R2, KV, secrets, migrations, reference
data, deploy, `npm run doctor -- --remote`, verification), plus updating, backups and restoring.

Production never gets the demo seed: it gets **reference data only** (`npm run db:reference:build` and
`npm run db:reference:remote`). Every setting is listed in [`.dev.vars.example`](.dev.vars.example);
`npm run doctor` checks a local or (`-- --remote`) deployed setup.

## Routes

| Page | URL |
|---|---|
| Home | `/` |
| Search (SSR, crawlable facets) | `/buy/{city}`, `/rent/{city}`, `/commercial/{city}`, plus `/{mode}/{city}/{locality}/{n}-bhk/{type}` and query filters |
| New projects | `/new-projects/{city}?status=…` |
| Project detail | `/projects/{city}/{slug}` |
| Listing detail | `/property/{id}` |
| Builders | `/builders`, `/builders/{slug}` |
| City hub | `/city/{city}` |
| Tools | `/tools`, `/tools/{emi-calculator,affordability,stamp-duty,area-converter}` |
| Shortlist / Post property | `/shortlist`, `/post-property` |
| Admin | `/admin` (Basic auth) |
| API | `POST /api/enquiry`, `POST /api/listings` (multipart, photos), `GET /api/items?listings=…&projects=…`, `POST /api/admin/listings/{id}` |
| Media / SEO | `/media/listings/{id}/{uuid}.{ext}`, `/sitemap.xml`, `/robots.txt` |

## Code map

- `migrations/` — D1 schema; `db/` — demo data generator and generated `seed.sql` (all builders, projects, listings, people are fictional)
- `src/data/` — shared types and constants
- `src/lib/repo.ts` — all D1 queries (reference data is cached per isolate for 5 minutes)
- `src/lib/search.ts` — filter/facet parsing; SQL filtering lives in `repo.searchListings`
- `src/middleware.ts` — admin authentication and same-origin check
- `src/components/` — Astro (server-rendered) components; `islands/` are React components hydrated on the client
- `src/pages/` — routes
