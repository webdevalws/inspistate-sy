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
```

`/admin` uses HTTP Basic auth — any username, the password above.

## Database

| Command | What it does |
|---|---|
| `npm run db:seed:build` | Regenerate `db/seed.sql` from `db/seed-data.ts` |
| `npm run db:migrate:local` / `:remote` | Apply `migrations/*.sql` |
| `npm run db:seed:local` / `:remote` | Replace all data with the demo seed (**destructive**) |

Schema: `migrations/0001_init.sql`. New schema changes go in a new numbered migration file.

## Deploy (Cloudflare)

The API token needs **D1 Edit**, **Workers R2 Storage Edit** and **Workers Scripts Edit** permissions.

```sh
npx wrangler d1 create inspistate-db          # copy the database_id into wrangler.jsonc
npx wrangler r2 bucket create inspistate-media
npm run db:migrate:remote && npm run db:seed:remote
npx wrangler secret put ADMIN_PASSWORD
npm run build && npx wrangler deploy
```

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
