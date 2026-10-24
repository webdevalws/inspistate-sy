# Admin

**Area:** Operations · **Route:** `/admin` (+ `/api/admin/*`) · **Status:** built

## What it does
One page for the team: moderate listings and reviews, approve agent plans, see leads, and (from this
branch) audit admin actions.

## Access
- HTTP Basic auth with the `ADMIN_PASSWORD` secret (`src/middleware.ts`); admin is disabled (503) when the
  secret is not set. State-changing admin requests must come from our own pages (same-origin check).
- **Wrong passwords** are counted per IP per UTC day in `ai_usage` (feature `admin-fail`, IP hashed like the
  other counters). From the 5th wrong try each failure waits ~2 s; at 20 the IP gets **429** for the rest of the
  day (`ADMIN_SLOW_AFTER` / `ADMIN_LOCK_AFTER` in `src/middleware.ts`). The browser's first request without a
  password is not counted.

## Audit trail
- **Migration 0013** adds `admin_audit` (`id`, `at`, `action`, `target`, `ip`). Additive only. The IP is stored
  as received (not hashed) so actions can be traced.
- `logAdmin(ctx, action, target)` (`src/lib/audit.ts`) is called by every state-changing admin endpoint:
  `listing.approve|reject|sold|rented|delete`, `review.publish|reject`, `site-review.publish|reject`,
  `plan.activate|cancel` (and, below, order status and forum moderation).
- `/admin` → **Recent admin actions**: the last 30 (time, action, target, IP).

## Files
- `src/pages/admin/index.astro`, `src/pages/api/admin/*`, `src/middleware.ts`
- `migrations/0013_admin_audit.sql`
