# Admin

**Area:** Operations · **Route:** `/admin` (+ `/api/admin/*`) · **Status:** built

## What it does
One page for the team: moderate listings and reviews, approve agent plans, see leads, and (from this
branch) audit admin actions.

## Access
- HTTP Basic auth with the `ADMIN_PASSWORD` secret (`src/middleware.ts`); admin is disabled (503) when the
  secret is not set. State-changing admin requests must come from our own pages (same-origin check).

## Audit trail
- **Migration 0013** adds `admin_audit` (`id`, `at`, `action`, `target`, `ip`). Additive only. The IP is stored
  as received (not hashed) so actions can be traced.

## Files
- `src/pages/admin/index.astro`, `src/pages/api/admin/*`, `src/middleware.ts`
- `migrations/0013_admin_audit.sql`
