# Deploying InspiState to Cloudflare

InspiState runs as one Cloudflare Worker (Astro SSR) with:

| Binding | Service | What for |
|---|---|---|
| `DB` | D1 (`inspistate-db`) | All data |
| `MEDIA` | R2 (`inspistate-media`) | Listing photos |
| `IMAGES` | Cloudflare Images | Image processing (Astro adapter) |
| `SESSION` | Workers KV | Sessions (Astro adapter) |

> ⚠️ **Never run `npm run db:seed:remote`.** The demo seed starts by **deleting** every listing, lead, review,
> shortlist and forum post. Production gets *reference data only* (step 5). The demo seed is for local use.

---

## First-time setup

### 0. Prerequisites
- Node **22.22 or newer** (`node -v`), then `npm ci`.
- A Cloudflare account. Log in once: `npx wrangler login`. If you use an API token instead, it needs
  **D1 Edit**, **Workers R2 Storage Edit**, **Workers KV Storage Edit** and **Workers Scripts Edit**.
- Cloudflare Images must be enabled on the account for the `IMAGES` binding.

### 1. Create the database, bucket and KV namespace
```sh
npx wrangler d1 create inspistate-db              # prints a database_id
npx wrangler r2 bucket create inspistate-media
npx wrangler kv namespace create SESSION          # prints an id
```
Put the two ids into `wrangler.jsonc` (a comment at the top lists them):
- `d1_databases[0].database_id` ← the D1 id
- `kv_namespaces[0].id` ← the KV id (the repo has a `000…0` placeholder)

### 2. Set the secrets
Every setting is explained in [`.dev.vars.example`](.dev.vars.example). In production they are Worker secrets:
```sh
npx wrangler secret put ADMIN_PASSWORD     # required — long and random
npx wrangler secret put SMS_WEBHOOK_URL    # required — your SMS gateway (login codes)
npx wrangler secret put ANTHROPIC_API_KEY  # optional — Vastu automatic room detection
npx wrangler secret put PUBLIC_HELPLINE    # optional
npx wrangler secret put PUBLIC_WHATSAPP    # optional
```
Do **not** set `TEST_OTP` or `DEV_SHOW_OTP` in production (built Workers ignore them anyway).

### 3. Create the tables
```sh
npm run db:migrate:remote
```
This applies every file in `migrations/` that hasn't run yet. Migrations are additive.

### 4. Build and deploy
```sh
npm run build
npx wrangler deploy
```

### 5. Load the reference data (cities, localities, reference prices)
```sh
npm run db:reference:build     # writes db/reference.sql
npm run db:reference:remote    # loads it into the production D1
```
Only cities and localities with reference prices — no demo listings, projects, builders, people or reviews.
It only inserts missing rows and never deletes or updates, so it is safe to run again.
Review the locality rates and coordinates first: for the ten original cities they are demo estimates.

### 6. Check the setup
```sh
npm run doctor -- --remote
```
Every line should be ✅: secrets present, D1 reachable with cities, all migrations applied, R2 bucket found,
no placeholder ids. Fix anything marked ❌ (each line says how).

### 7. Verify in the browser (5 minutes)
1. Open the site: home page, a city page (`/city/mumbai`), a search (`/buy/mumbai`, also `?view=map`).
   With reference data only, searches show the normal "no listings" state — that is expected.
2. Log in with your phone: the SMS code arrives.
3. Post a test property with a photo; it shows "submitted for review".
4. Open `/admin` (any username + `ADMIN_PASSWORD`): approve the test listing, then check it appears in search and
   under **Recent admin actions**. Delete it from your account afterwards.
5. `npx wrangler tail` while loading a page: there must be no "[InspiState] Missing required settings" error.

---

> **Local dev note:** don't run `npm run build` while `npm run dev` is running. If islands break in dev (missing forms or
> maps, `_jsxDEV is not a function`, 404s on `/node_modules/.vite/deps/…`), stop the dev server, delete
> `node_modules/.vite` and start it again. Production builds are not affected.

---

## Updating

```sh
git pull && npm ci
npx wrangler d1 export inspistate-db --remote --output backups/inspistate-$(date +%Y%m%d).sql   # back up first
npm run db:migrate:remote        # only if the update added migrations (the PR says so)
npm run build && npx wrangler deploy
npm run doctor -- --remote
```
Something wrong after a deploy? `npx wrangler rollback` returns to the previous Worker version
(it does not undo database migrations — restore those from a backup, below).

---

## Backups

**Database (D1).**
- *Time Travel* (built in, last 30 days): `npx wrangler d1 time-travel info inspistate-db` shows the current
  bookmark; note it before risky changes.
- *Export* (keep your own copies): `npx wrangler d1 export inspistate-db --remote --output backups/inspistate-YYYYMMDD.sql`.
  Keep `backups/` out of git — it contains people's phone numbers.

**Photos (R2).** Photo keys never change, so a backup is a copy of the bucket. Use an S3-compatible tool such as
`rclone` with an R2 API token (`rclone sync r2:inspistate-media ./backups/media`), or Cloudflare's
bucket-to-bucket replication. Owner-deleted listings' photos are removed from R2 on purpose.

## Restoring

**Database, to a point in time (Time Travel):**
```sh
npx wrangler d1 time-travel restore inspistate-db --timestamp=2026-10-24T10:00:00Z
```
This replaces the current data with the data as it was then (you get a bookmark to undo the restore).

**Database, from an export:** restore into a **new** database and switch to it, so nothing is overwritten:
```sh
npx wrangler d1 create inspistate-db-restore
npx wrangler d1 execute inspistate-db-restore --remote --file backups/inspistate-YYYYMMDD.sql
```
Then put the new `database_id` (and `database_name`) in `wrangler.jsonc`, `npm run build && npx wrangler deploy`,
and run `npm run doctor -- --remote`.

**Photos:** copy them back into the bucket with the same keys (`rclone sync ./backups/media r2:inspistate-media`).

---

## Reference

| Command | What it does |
|---|---|
| `npm run doctor` / `-- --remote` | Health check, local or production |
| `npm run db:migrate:remote` | Apply new migrations to production |
| `npm run db:reference:build` / `:remote` | Build / load reference data (cities, localities) |
| `npm run db:reset:local` | Local only: rebuild the demo database |
| `npm run db:seed:remote` | ⛔ Never on production — deletes data (guarded by a confirmation) |
