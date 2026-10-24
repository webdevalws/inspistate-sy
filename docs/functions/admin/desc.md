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

## Users (items 93–97)
- `/admin` → **Users**: total accounts, counts by role (Buyers, Sellers, Agents, Not registered) linking to the
  filtered list, and **Manage users**.
- `/admin/users` (item 93): every account, newest first, 25 per page (`Pagination`). Search by name (contains)
  or phone (3+ digits, contains); filter by role. Columns: name (→ detail page), full phone, role, city, agency
  (agents), plan (active plan, else Free; "requested" when a plan request waits), joined date, listings (not
  counting owner-deleted ones) and enquiries (leads the user sent). Queries in `src/lib/admin-users.ts`.
- `/admin/users/{id}` (item 94): the account's details; **Listings** in every state (Live, Under review,
  Rejected, Sold, Rented, Deleted — non-live ones open with the edit token, deleted ones are not linked);
  **Enquiries sent**; **Leads on their listings**; and **Plans** (every request and plan with dates).
  Unknown ids are 404.

## Forum moderation
- **Forum posts** section: Hide / Unhide questions and answers (see [forum](../forum/desc.md)).

## Service orders (item 61)
- Each row in **Service orders** has a status dropdown + Save: submitted → awaiting payment → paid → in
  progress → completed / cancelled (`ORDER_STATUSES` / `setOrderStatus` in `src/lib/orders.ts`, same values as
  the table's CHECK constraint; `/api/admin/orders/{id}`). Changes are audited as `order.status`
  ("order #12: awaiting_payment → in_progress").

## Newsletter (item 62)
- **Newsletter subscribers** section: total, the newest 50, and **Export CSV** (`/api/admin/newsletter.csv`,
  all subscribers, `email,subscribed_at`). Cells that start with = + - @ are prefixed with ' so spreadsheets
  don't run them as formulas. Exports are audited (`newsletter.export`).

## Files
- `src/pages/admin/index.astro`, `src/pages/api/admin/*`, `src/middleware.ts`
- `migrations/0013_admin_audit.sql`
