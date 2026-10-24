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

## Files
- `.dev.vars.example`, `scripts/doctor.ts`, `package.json` (`doctor`), `src/lib/startup.ts`
