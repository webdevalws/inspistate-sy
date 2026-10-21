# Enquiries / leads

**Area:** Leads · **Route:** `/api/enquiry` · **Status:** built

## What it does
Stores callback, view-number, brochure, service and chat leads.

## Inputs
- Name, mobile, email, subject, kind, listing/project

## Outputs
- Lead id; for view-number, contact details

## How it works
- Same-origin only: requests whose `Origin` header differs from the site are rejected with 403.
- Home-service estimators post `kind: service` leads whose subject carries the estimate (see `src/components/islands/HomeServices.tsx`).
- Indian mobile validation; linked to user when logged in.
- **View number (owner phone) needs an account.** `kind: view-number` without a login → 401 "Log in or
  register to see the owner's number."; without a `listingId` → 422; more than **20 per account per UTC
  day** → 429 (counted in `ai_usage`, feature `view-number`, key = hashed `user:<id>`). These checks run
  before the lead is saved, so refused requests create no lead and return no number.
- **The `page` field is a same-site path only.** It is cleaned with `safeNext()` (`src/lib/redirect.ts`)
  when saved (anything else, e.g. `javascript:` or `https://…`, is stored as NULL), and the admin
  enquiries table and the account page's "My enquiries" only render it as a link if it is still safe, so
  older rows can't produce a dangerous link either. All forms send `location.pathname`.
- On listing cards, logged-out visitors get a "View Number" link with the same look that opens the login
  dialog (`data-auth-open`; a `/login?next=…` link without JS) instead of the lead form.

## Files
- `src/pages/api/enquiry.ts`, `src/lib/limits.ts` (daily counters), `src/components/ListingCard.astro`
- `src/components/islands/LeadDialog.tsx`
- `src/components/islands/EnquiryForm.tsx`

## Reference behaviour (Square Yards)
_No direct reference page identified yet._

## Gaps vs reference
_To be filled after REA analysis._
