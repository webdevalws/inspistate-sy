# Login / Register (phone OTP or Google + role)

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
- Redirect after **login** (returning account), one rule for phone and Google, page and dialog (`afterLogin` in
  `src/lib/redirect.ts`, item 104): the safe `next` always wins; with no `next`, **sellers** go to `/account#listings`
  and **agents** to `/account/agent` (`landingFor`); **buyers** keep the old behaviour (stay on the current page; `/login`
  itself forwards to `/account`). A logged-in seller or agent opening `/login` without `next` is sent to their page too.
  Actions that need a login carry an explicit `next` so they always return: View Number on listing cards
  (`data-auth-next` = the current page), post property, save search, forum ask / answer. **Generic** login links never
  carry a `next`: the header "Login / Register" (desktop and mobile menu) is `/login?from=<page>`, and the Google button
  sends the page as `from` too. `afterLogin(role, next, from)` = `next` → the role’s page → (buyers) `from`. So sellers
  and agents land on their page whether the dialog opened or the link was followed (no JavaScript, or clicked before
  the dialog loaded — item 111), and buyers return to the page as before. The header "My account" link stays `/account`.
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
## Continue with Google (items 98–102)
Alongside phone + OTP (unchanged). Needs `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`; without them both
endpoints are 404 and the button is hidden (`googleEnabled()` in `src/lib/google.ts`).
- **Start** `GET /api/auth/google/start?next=` — `guard()` (same-site + 30 per IP per day, feature
  `google-start`). Creates `state` (32 random bytes), a PKCE `code_verifier` (S256 challenge) and a `nonce`,
  and stores them with the safe `next` and, when someone is logged in, their account id (to link) in the
  `is_google_flow` cookie: HttpOnly, SameSite=Lax, Secure on https, path `/api/auth/google`, 10 minutes, HMAC-signed
  (key derived from the client secret) so it can't be altered. Redirects to Google with scopes `openid email profile`
  only and `prompt=select_account`.
- **Callback** `GET /api/auth/google/callback` — Google's redirect back is cross-site, so `guard()`'s same-site
  check can't apply; the signed state cookie ties the request to a flow started on our site, and the same daily
  counter limits it (60 per IP per day, `google-callback`). The cookie is read once and deleted. Checks, in order:
  state matches → flow not expired → no `error` from Google → code exchanged **server to server** with
  `client_secret` + `code_verifier` → ID token **RS256 signature** checked against Google's published keys
  (cached 1 h) → `iss` (accounts.google.com), `aud` = our client id, `exp` in the future, `iat` sane, `nonce`
  matches → `email_verified === true`. Any failure redirects to `/login?error=…` with a message
  (`GOOGLE_ERRORS`; blocked accounts get the same message as phone login).
- **Accounts** (`signInWithGoogle`, migration 0015 adds `users.google_sub` with a unique index and
  `users.google_email`): (1) found by Google account id → logged in (refused if blocked); (2) someone logged in
  who started the flow → Google is **linked** to that account (refused if that Google account belongs to another
  account, or this account is linked to another Google account); (3) an account with the same email (registration
  email or Google email) is **not** linked automatically, because registration emails aren't verified — the
  message says "An account with this email exists — log in with your phone, then use Continue with Google to link
  it."; (4) otherwise a new account is created (name and email from Google) and goes through the usual
  **Create your account** step (`/login` opens on it).
- **No phone yet:** `users.phone` is NOT NULL UNIQUE, so a Google-only account stores the placeholder
  `g:<google id>`. `hasRealPhone()` / `realPhone()` (`src/lib/auth.ts`) keep it from ever being shown, texted
  (`sendOtp` refuses anything but a real mobile), called or used for leads: the account page shows "No mobile number
  yet", the login form and dialog aren't pre-filled with it, the forum falls back to "Member", admin pages show "—"
  with no `tel:` link, admin phone search never matches it and the audit log writes "none".
- **Adding a mobile number** (item 99): the account page's Profile shows **Add mobile number** (`AddPhone` island →
  `POST /api/account/phone`): number → code by SMS (same `sendOtp` rules and daily limits as login) → `checkOtp`
  → saved, replacing only the placeholder. It never logs in or creates an account. A number that already has an
  account is refused: "This number already has an InspiState account. Log in with it, then use Continue with Google
  to link your Google account." After adding it, the account can log in with either.
- **Sellers and agents need a mobile number** before posting or requesting a plan: `listingAllowance` returns reason
  `phone` (post page: "Add your mobile number to list your property" → account page; `/api/listings` refuses) and
  `requestSubscription` refuses (the sales callback uses it). Enquiries and View Number use each listing's own
  contact number, so without listings there is nothing to reach; buyers need no account phone (enquiry forms ask for
  one each time).
- Same sessions as phone login (`createSession`), redirect through `safeNext`.
- **UI** (item 100): on the first step of `AuthFlow` (login page and dialog), under **Continue →**, an "or" divider and a
  **Continue with Google** button (outlined, same type and borders as the form; the official Google "G" as inline SVG).
  It links to the start endpoint with the safe `next`, else the current page (no-JS fallback: plain link). Shown only
  when `googleEnabled()`; otherwise the form is exactly as before.
  - New Google accounts land on `/login`, which opens on **Create your account** with name and email pre-filled from
    Google. The registration nudge dialog no longer opens on `/login` itself (the page shows the same form).
  - Account page → Profile: "Google account <email> — you can log in with Google…" when linked; otherwise **Continue
    with Google** to link (start → callback with the logged-in account). Link results and errors (`google-taken`,
    `google-other`, …) come back as `/account?google=…` because a logged-in account can't see `/login`.
- **Dev-only mock** (`/api/dev/google-mock`, `src/lib/google-dev-mock.ts`): on `npm run dev` a code starting
  with `mock.` is exchanged with a local stand-in for Google's token endpoint and keys, so the callback can be
  tested end to end. It sits behind `import.meta.env.DEV`, so production builds answer 404 and don't contain
  the mock.
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
- Google login (optional, item 102): `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (both or neither). Local redirect URI
  `http://localhost:4321/api/auth/google/callback`; production setup (redirect URI, `wrangler secret put`, publishing
  the consent screen) is in DEPLOY.md step 2b.

## Files
- `src/components/islands/AuthFlow.tsx` — the three steps (shared by dialog and page)
- `src/components/islands/AuthDialog.tsx` — dialog + `data-auth-open` wiring (mounted in `Header.astro`)
- `src/pages/login.astro`, `src/lib/auth.ts`, `src/pages/api/auth/*`, `src/pages/api/account/register.ts`
- `src/lib/redirect.ts` — `safeNext`, `roleForNext`, `destinationAfterRegister` (also used by `src/pages/api/account/role.ts`)
- `src/data/plans.ts` — role definitions and perks
- `src/lib/google.ts`, `src/pages/api/auth/google/start.ts`, `src/pages/api/auth/google/callback.ts`
- `migrations/0010_roles_plans.sql`, `migrations/0015_google_login.sql`

## Reference behaviour (Square Yards)
From user-supplied screenshots: "Login" opens a modal; a new number gets a **Register** modal with
"I am an — Individual (3 free listings) / Agent (unlimited listings)", name, mobile, email, city.
InspiState adds a third role (Buyer, for buyers/tenants; stored as `user`) and splits Individual into Seller.

## Gaps vs reference
- No email (magic link) login.
