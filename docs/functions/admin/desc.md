# Admin

**Area:** Operations · **Route:** `/admin` (+ `/api/admin/*`) · **Status:** built

## What it does
One page for the team: moderate listings and reviews, approve agent plans, see leads, and (from this
branch) audit admin actions.

## Layout (item 112)
- Every admin page uses `src/layouts/AdminLayout.astro` (no site header / footer): a dark sidebar (`#1C1A17`) with the
  InspiState mark, a “Manage” label, the menu from `src/lib/admin-nav.ts` (icons, sub-items under the active parent,
  the active item in the bronze accent) and **Logout**; a white top bar with the page title, a breadcrumb (home icon /
  section / page) and the admin’s name (the username typed at the password prompt — any username works, only the
  password is checked); content on a light background. On phones the sidebar folds into a **Menu** button (CSS only,
  no JavaScript).
- **Logout** (`/admin/logout`): Basic auth has no real logout. The route answers 401 so most browsers forget the
  password; it is handled before the password check and never counted as a wrong password. The note under the
  button says: “To fully log out, close the browser.”

## Sections (item 113)
The old single `/admin` page is split into one page per section, each one card (`AdminCard`: title, optional Search and
“+ Add …” / Export button) with a table: S.No., image where there is one, title, type, status pill (`Pill`), date and
action icon buttons (`ActionButton`, labelled for screen readers). The forms and endpoints are unchanged (same URLs,
same `action` values, same checks and audit entries); only where an endpoint sends the admin back changed.

| Sidebar | Page | Endpoint (unchanged) → back to |
|---|---|---|
| Dashboard | `/admin` — headline numbers + what is waiting in each section | — |
| Listings → Pending | `/admin/listings` | `/api/admin/listings/{id}` → `/admin/listings?done=…` |
| Users → All users / Blocked | `/admin/users`, `/admin/users?state=blocked`, `/admin/users/{id}` | `/api/admin/users/{id}` → the user page |
| Reviews | `/admin/reviews` (project + site reviews) | `/api/admin/reviews/{id}`, `/api/admin/platform-reviews/{id}` → `/admin/reviews?done=…` |
| Plan requests | `/admin/plans` | `/api/admin/subscriptions/{id}` → `/admin/plans?done=…` |
| Orders | `/admin/orders` | `/api/admin/orders/{id}` → `/admin/orders?done=…` |
| Enquiries | `/admin/enquiries` (`?leads=<kind>` filter) | — |
| Forum | `/admin/forum` | `/api/admin/forum/{kind}/{id}` → `/admin/forum?done=…` |
| Newsletter | `/admin/newsletter` (Export CSV) | `/api/admin/newsletter.csv` |
| Audit log | `/admin/audit` | — |

## Search, sort and pages (item 114)
- Long lists read `?q=`, `?sort=<key>&dir=asc|desc` and `?page=` (`paged` in `src/lib/admin-tables.ts`, 25 per page,
  `Pagination`): search is “contains” on the listed columns (a number also matches the id), sorting only uses each
  page’s whitelist of columns (`Th` shows ▲ / ▼ and links to the next direction). Used by All listings, Users, Orders,
  Enquiries, Forum, Newsletter and Audit log; the search box keeps the page’s filters and sort.
- **Listings → All listings** (`/admin/listings/all`): every listing with a status filter (Pending, Live, Rejected,
  Sold / rented, Deleted), search (id, contact name, locality, city, type) and the existing actions of
  `/api/admin/listings/{id}` — approve / reject (pending), mark sold or rented (live), delete (asks first) — all
  audited as before. Each form sends `back` (only `/admin/listings…` pages are accepted) so the admin returns to the
  same filtered page.

## Access
- HTTP Basic auth with the `ADMIN_PASSWORD` secret (`src/middleware.ts`); admin is disabled (503) when the
  secret is not set. State-changing admin requests must come from our own pages (same-origin check).
- **Wrong passwords** are counted per IP per UTC day in `ai_usage` (feature `admin-fail`, IP hashed like the
  other counters). From the 5th wrong try each failure waits ~2 s; at 20 the IP gets **429** for the rest of the
  day (`ADMIN_SLOW_AFTER` / `ADMIN_LOCK_AFTER` in `src/middleware.ts`). The browser's first request without a
  password is not counted.
- Refused admin POSTs (401 / 403 / 429) have their body read first (item 113): browsers send the admin password up front
  only below the page’s own path, so a form posting to `/api/admin/…` is challenged once and retried, and the local dev
  runtime fails a request answered with its body unread. No effect in production.

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
- **Agent offers** (item 109): the user detail page lists the offers the account sent or received (see
  [agent offers](../agent-offers/desc.md)).
- **Login method** (item 101): the list has a **Login** column — Phone, Google or Phone + Google (`loginMethod`: a real
  mobile number and/or a linked Google account, migration 0015) — with the Google email under it; the detail page
  shows **Login method** and **Google email**. Linking Google (by the user, see [login](../login/desc.md)) isn't
  audited; admin edits stay audited as before.
- **Edit account** (item 95), a plain form posting to `/api/admin/users/{id}` (`action=profile`): name, phone,
  role (Buyer / Seller / Agent; "Not registered" is only offered while the account has no role), city and
  agency. Same rules as registration: name 2+ characters (or empty), agents need an agency name (cleared for
  other roles), city from the list, phone a valid 10-digit mobile (`normalizePhone`).
  - **Phone** is the login (phone + OTP; there are no passwords). A number another account already has is
    refused ("Another account already uses that phone number"), also if it is taken at the same moment (UNIQUE).
    Changing it **ends all of the account's sessions** (logged out everywhere, so a lost phone or misused account
    can't keep old sessions) and drops any pending code for the old number.
  - Accounts created with Google with no mobile number yet (placeholder `g:<id>`, item 99) show "—" (no `tel:` link),
    the phone field is empty and optional (left empty, the account stays without one), phone search never matches the
    placeholder, and the audit log writes "none" instead of it.
  - Each changed field is audited separately: `user.name|phone|role|city|agency`, target
    `user #12: old → new` (phone changes add "(logged out)").
- **Plan** (item 96, `action=plan`): Free / Half-Yearly / Yearly (`setUserPlan`). A plan starts today and runs for
  its full length (`PLANS[].months`); a waiting request for the same plan is activated (it leaves **Agent plan
  requests**), otherwise a new active subscription is added. Any other active plan is cancelled first; Free
  cancels the active plan. Audited as `user.plan` (`user #12: Free → Yearly Plan`).
- **Block / unblock** (item 97, `action=block|unblock`, `setUserBlocked`). **Migration 0014** (additive) adds
  `users.blocked_at` (NULL = active) and `listings.owner_blocked` (0/1). Blocking, in one batch: sets
  `blocked_at`, ends all of the account's sessions (logged out at once) and flags all of its listings. While
  blocked: requesting or verifying a login code is refused ("This account has been blocked…"), sessions are
  ignored, posting needs a login so it is refused, and the listings are left out of every public page (shared
  `live()` condition, see [property search](../property-search/desc.md)). Unblocking clears both flags; they log in
  again normally. Audited as `user.block` / `user.unblock`.
  - The list has an Active / Blocked filter and a "blocked" chip; `/admin` shows the Blocked count. Admin pages
    still show the listings, marked "owner blocked" (user detail and pending listings); their links use the
    edit token so the admin can open them.
- **Protection:** like every admin route — admin Basic auth (with the wrong-password slow-down and lockout),
  same-origin check on every POST, `noindex` + `no-store` (`src/middleware.ts`).

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
- `migrations/0013_admin_audit.sql`, `migrations/0014_user_blocking.sql`
- `src/lib/admin-users.ts`, `src/pages/admin/users/*`, `src/pages/api/admin/users/[id].ts`
