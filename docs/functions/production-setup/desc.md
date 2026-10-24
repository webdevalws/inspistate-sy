# Production setup

**Area:** Operations · **Route:** — (scripts and config) · **Status:** built

## What it does
Everything needed to run InspiState outside a developer's laptop: the settings it reads, a health check,
reference data for an empty production database, Cloudflare bindings, deployment steps and CI.

## Settings
- `.dev.vars.example` lists every setting with comments: required in production (`ADMIN_PASSWORD`,
  `SMS_WEBHOOK_URL`), optional (`ANTHROPIC_API_KEY`, `PUBLIC_HELPLINE`, `PUBLIC_WHATSAPP`) and dev-only
  (`TEST_OTP`, `DEV_SHOW_OTP`, ignored by built Workers). Locally they live in `.dev.vars` (git-ignored); in
  production each is a Worker secret (`npx wrangler secret put NAME`).

## `npm run doctor`
- `scripts/doctor.ts` prints ✅ / ❌ with a fix for each check and exits 1 if anything fails:
  Node ≥ 22.22; `wrangler.jsonc` declares the D1 (`DB`) and R2 (`MEDIA`) bindings; required settings are set
  (locally in `.dev.vars` — login may use `TEST_OTP` / `DEV_SHOW_OTP` instead of an SMS gateway); the D1
  database is reachable and has cities; all migrations are applied.
- `npm run doctor -- --remote` checks the deployed setup with read-only wrangler commands: Worker secrets
  (names only), the remote D1 database and migrations, and that the R2 bucket exists. Values are never printed.
- wrangler runs through `node_modules/wrangler/bin/wrangler.js` with the current Node (no shell), so SQL
  arguments stay intact on Windows.

## Startup check (item 66)
- In production builds, the first request each Worker instance handles runs `checkRequiredSettings()`
  (`src/lib/startup.ts`, called from the middleware). If `ADMIN_PASSWORD` or `SMS_WEBHOOK_URL` is missing it logs
  **one** clear `console.error` naming each missing setting, what breaks without it and the
  `wrangler secret put` command — visible in `npx wrangler tail` and the dashboard logs. Values are never
  logged; nothing runs on the dev server.

## Production reference data (item 67)
- `npm run db:reference:build` writes `db/reference.sql` from `db/build-reference.ts`: the 12 cities and 57
  localities with their reference prices (sale rate, rent rate, yearly growth) and coordinates — **nothing
  else** (no demo listings, projects, builders, people, reviews or leads).
- Every insert is `ON CONFLICT DO NOTHING` and the file has no DELETE / UPDATE, so it is safe on an empty or a
  live database and can be run again. Tested on a fresh database after all migrations: 12 cities, 57
  localities, 0 listings / projects / builders; a second run changes nothing.
- `npm run db:reference:remote` loads it into the production D1 (run it yourself; see DEPLOY.md). The demo
  seed (`db/seed.sql`, `db:seed:*`) stays local-only — **never run `db:seed:remote`** (it deletes everything).
- Note: locality coordinates and rates for the ten original cities are demo estimates (generated around the
  city centre); Lucknow's and Navi Mumbai's coordinates are real. Review them before relying on them.

## Cloudflare bindings (item 68)
- `wrangler.jsonc` declares every binding the Worker uses: `DB` (D1), `MEDIA` (R2), `IMAGES` (Cloudflare Images,
  used by the Astro adapter for image processing in production) and `SESSION` (KV, used by the adapter for
  sessions). A comment at the top lists the **ids to replace per environment**: the D1 `database_id` (from
  `wrangler d1 create`) and the SESSION KV `id` (from `wrangler kv namespace create SESSION`, placeholder
  `000…0` in the repo). The R2 bucket is referenced by name; IMAGES needs no id.
- `npm run doctor` checks that all four bindings are declared; with `--remote` it also flags placeholder ids.

## Deployment guide (item 69)
- `DEPLOY.md`: first-time setup (create D1 / R2 / KV, put the ids in `wrangler.jsonc`, set secrets, migrate,
  deploy, load reference data, `npm run doctor -- --remote`, a 5-minute browser check), updating (back up,
  migrate, deploy, doctor; `wrangler rollback`), backups (D1 Time Travel and exports, R2 copies) and restoring
  (Time Travel restore, or an export into a new database). The README's Deploy section points to it and no
  longer suggests the remote demo seed.

## CI (item 70)
- `.github/workflows/ci.yml` runs on every pull request and on pushes to `main`: `npm ci`, `npm run build`,
  `npx astro check` on Node 24 (read-only permissions, no secrets, older runs on the same branch cancelled).

## Repository cleanup (item 73)
- Removed (all checked unreferenced): four one-off Python scripts (`check_candidates.py`, `download_videos.py`,
  `find_landscape.py`, `find_videos.py`), an unused 14 MB root `.mp4`, 24 unused SVGs in `public/images`
  (`apt-*`, `builder-floor`, `city-*`, `expert-villa`, `hero`, `house-icon`, `living-room`, `locality-1…6`), and the
  old `Affordability()` in `Calculators.tsx` (the live calculator is `islands/Affordability.tsx`).
  `project-1…6.svg` stay (picked by number in `Cover.astro` and the calculator API).
- `public/videos/` (41 MB, 4 files) is used by the home page video tour and was left as is. Workers static
  assets are limited to 25 MiB per file and `modern_building.mp4` is 20.4 MB; consider serving the videos from
  R2 or Cloudflare Stream, or compressing them.

## Dev cache (item 74)
- `astro.config.mjs`: only `astro dev` uses `node_modules/.vite`; build / check / sync use `node_modules/.vite-build`,
  so a build can't overwrite or mix the dev server's pre-bundled dependencies (that broke islands in dev with
  `_jsxDEV is not a function` and 404s on `.vite/deps/leaflet.js`). `optimizeDeps.include: ['leaflet']` pre-bundles
  Leaflet, which the map islands load with a dynamic `import()` the start-up scan can't see. README and DEPLOY.md say
  what to do if islands still break: stop dev, delete `node_modules/.vite`, restart.

## Files
- `.dev.vars.example`, `scripts/doctor.ts`, `package.json` (`doctor`, `db:reference:*`), `src/lib/startup.ts`, `db/build-reference.ts`, `db/reference.sql`, `wrangler.jsonc`, `DEPLOY.md`, `.github/workflows/ci.yml`, `astro.config.mjs`
