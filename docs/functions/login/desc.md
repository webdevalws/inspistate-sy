# Login / Register (phone OTP + role)

**Area:** Accounts · **Route:** `/login` and a site-wide dialog · **Status:** built

## What it does
Passwordless sign-in that doubles as registration, opened from the header's **Login / Register** link.
Mobile number → **Continue** → 6-digit code → returning accounts are logged in; new numbers go on to
**Create your account**, where they pick one of three roles (button "Create account as {Role} →"):
**Buyer** (buy / rent — stored as role `user`), **Seller** (3 free listings) or **Agent** (3 free, unlimited with a plan), plus
name, optional email, optional city and (agents) a required agency name.

## Inputs
- Mobile number, 6-digit code
- Register: role, full name, email (optional), city (optional), agency / firm name (agents, required)

## Outputs
- HttpOnly session cookie (30 days); `users.role`, `city_slug`, `company`
- Redirect after **login** (returning account): the safe `next`, else stay on the current page
  (`/login` itself then forwards to `/account`).
- Redirect after **register** (new account), from `destinationAfterRegister(role, next)`:
  - Buyer (`user`) → the safe `next`, else stay on the current page
  - Seller → `/post-property`, unless `next` is already a seller page (`/post-property…` or `/account…`)
  - Agent → `/account`, unless `next` is already an account page (`/account` or `/account/…`)

## How it works
- Codes and session tokens stored as SHA-256; 30 s resend (UI countdown), 5 attempts, 10 min expiry.
- **Wrong attempts survive a resend.** While the previous code is still valid, "Resend code" sends a new
  code but keeps the wrong-attempt count and the original expiry (the SMS says how many minutes are
  left), so resending can't reset or extend a lockout. After 5 wrong codes both verify and resend answer
  "Too many attempts. Try again in N minutes." until that expiry; after it, the next request starts fresh.
- **Daily limits:** at most **5 codes per phone** and **20 per IP** per UTC day. Every code request that
  passes the 30 s and lockout checks is counted in `ai_usage` — now a general daily counter, not only for
  AI — under feature `otp-phone` (client = SHA-256 of the phone) and `otp-ip` (client = SHA-256 of the IP,
  `'unknown'` when the runtime can't tell). Over either limit → 429 "Daily limit for login codes reached".
  The limits apply in local dev too (use another number to keep testing with `TEST_OTP`).
- SMS webhook failures — a non-2xx answer **or** a network error — return 502 "Could not send the SMS.
  Please try again." instead of a 500.
- Code delivery: `SMS_WEBHOOK_URL` if set; otherwise the dev-only options below; otherwise
  `/api/auth/otp` answers 503 "Login by SMS is not configured yet".
- **Dev-only login helpers** (set in `.dev.vars`). Both need `import.meta.env.DEV`, which is true only under
  `npm run dev`; `astro build` replaces it with `false`, so `npm run preview` and production ignore them
  even if the variables are set.
  - `DEV_SHOW_OTP=1` returns the real code to the UI (yellow "Development mode" note on the code step).
  - `TEST_OTP=123456` accepts that code for any number, so login works without SMS; the code step shows
    it in the same yellow note. Must be exactly 6 digits (other values are ignored). A code still has
    to be requested first, and the 10 min expiry and 5-attempt limit still apply.
- The OTP is verified **before** the register form, so the site never reveals whether a number already
  has an account (Square Yards shows the register form first).
- `/api/auth/verify` returns `needsRegistration` when `users.role` is NULL. Accounts that verified but
  never registered are prompted again (dialog auto-opens once per browser session; header menu shows
  "Finish registration").
- Any element with `data-auth-open` opens the dialog (`data-auth-next` sets the redirect, and pre-selects
  Seller for `/post-property`, Agent for `/account/plans` — `roleForNext`). Without JS these are links to `/login`.
- **Blocked accounts** (item 97, `users.blocked_at`, set from /admin): requesting a code answers 403 "This
  account has been blocked…" (no code is created or sent), verifying a code is refused too, and existing sessions
  are ended when the admin blocks and ignored while blocked (`userFromCookies`). With no session they can't post.
- **Admin phone change** (item 95): the admin can change an account's phone (its login); that ends all of the
  account's sessions.
- **Safe redirects** (`safeNext` in `src/lib/redirect.ts`): every `next` (login page, dialog, after
  login/register) and the role-switch `back` value must be a path on our own site. It must start with a
  single `/`; values with `//`, `\`, control characters (browsers drop tabs/newlines, so `/\t/x` becomes
  `//x`), the same patterns after up to two rounds of URL-decoding (`%5C`, `%2F%2F`, `%255C`), broken
  encoding, or anything that resolves to another origin are rejected. Rejected values fall back to "no
  `next`" (stay on the page / `/account`), or `/account` for the role switch.
- `/api/account/register` is **only for new accounts**: if the account already has a role it answers 409
  "Your account is already set up. Change your account type from your account page." (the `UPDATE` is
  also limited to `role IS NULL`), so role changes only happen through `/api/account/role`. It validates
  role, name (2+ chars), email (optional), city (optional, must be a listed city if given) and, for agents,
  the agency / firm name (required, 2+ chars). Cross-origin POSTs are rejected by middleware.

## Settings
- All runtime settings, with which are required in production, are listed and explained in
  `.dev.vars.example` (item 64). For login: `SMS_WEBHOOK_URL` (required in production), `TEST_OTP` and
  `DEV_SHOW_OTP` (dev server only; ignored by built Workers).

## Files
- `src/components/islands/AuthFlow.tsx` — the three steps (shared by dialog and page)
- `src/components/islands/AuthDialog.tsx` — dialog + `data-auth-open` wiring (mounted in `Header.astro`)
- `src/pages/login.astro`, `src/lib/auth.ts`, `src/pages/api/auth/*`, `src/pages/api/account/register.ts`
- `src/lib/redirect.ts` — `safeNext`, `roleForNext`, `destinationAfterRegister` (also used by `src/pages/api/account/role.ts`)
- `src/data/plans.ts` — role definitions and perks
- `migrations/0010_roles_plans.sql`

## Reference behaviour (Square Yards)
From user-supplied screenshots: "Login" opens a modal; a new number gets a **Register** modal with
"I am an — Individual (3 free listings) / Agent (unlimited listings)", name, mobile, email, city.
InspiState adds a third role (Buyer, for buyers/tenants; stored as `user`) and splits Individual into Seller.

## Gaps vs reference
- No Google / email login.
