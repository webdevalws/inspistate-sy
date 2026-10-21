# Login / Register (phone OTP + role)

**Area:** Accounts · **Route:** `/login` and a site-wide dialog · **Status:** built

## What it does
Passwordless sign-in that doubles as registration. Mobile number → **Continue** → 6-digit code →
returning accounts are logged in; new numbers go on to **Register**, where they pick one of three roles:
**User** (buy / rent), **Seller** (3 free listings) or **Agent** (3 free, unlimited with a plan), plus
name, optional email, city and (agents) an optional agency name.

## Inputs
- Mobile number, 6-digit code
- Register: role, full name, email (optional), city, agency name (agents, optional)

## Outputs
- HttpOnly session cookie (30 days); `users.role`, `city_slug`, `company`
- Redirect after register: `next` if given, else Seller → `/post-property`, Agent → `/account/plans`, User → current page

## How it works
- Codes and session tokens stored as SHA-256; 30 s resend (UI countdown), 5 attempts, 10 min expiry;
  `DEV_SHOW_OTP=1` shows the code in the UI locally.
- The OTP is verified **before** the register form, so the site never reveals whether a number already
  has an account (Square Yards shows the register form first).
- `/api/auth/verify` returns `needsRegistration` when `users.role` is NULL. Accounts that verified but
  never registered are prompted again (dialog auto-opens once per browser session; header menu shows
  "Finish registration").
- Any element with `data-auth-open` opens the dialog (`data-auth-next` sets the redirect, and pre-selects
  Seller for `/post-property`, Agent for `/account/plans`). Without JS these are links to `/login`.
- `/api/account/register` validates role, name, email and city; cross-origin POSTs are rejected by middleware.

## Files
- `src/components/islands/AuthFlow.tsx` — the three steps (shared by dialog and page)
- `src/components/islands/AuthDialog.tsx` — dialog + `data-auth-open` wiring (mounted in `Header.astro`)
- `src/pages/login.astro`, `src/lib/auth.ts`, `src/pages/api/auth/*`, `src/pages/api/account/register.ts`
- `src/data/plans.ts` — role definitions and perks
- `migrations/0010_roles_plans.sql`

## Reference behaviour (Square Yards)
From user-supplied screenshots: "Login" opens a modal; a new number gets a **Register** modal with
"I am an — Individual (3 free listings) / Agent (unlimited listings)", name, mobile, email, city.
InspiState adds a third role (User for buyers/tenants) and splits Individual into Seller.

## Gaps vs reference
- No Google / email login.
