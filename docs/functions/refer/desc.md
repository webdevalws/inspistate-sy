# Refer a Friend

**Area:** Leads · **Route:** `/refer` · **Status:** built

## What it does
Lets anyone refer a friend who wants to buy, sell, rent or rent out a property. Our team then calls the
friend. Rewards are subject to the referral terms on the page; **no payouts are implemented**.

## Inputs
- Your name, mobile (required) and email
- Friend's name and mobile (required), what they need (buy / sell / rent / rent out) and the city
- "My friend is happy to be contacted" and "I agree to be contacted" tick boxes (both required)

## Outputs
- A lead with `kind = 'referral'` in `leads` (no new table). The lead's name / phone / email are the
  referrer's; the subject is written on the server: "Referral: {friend} ({mobile}) wants to {need} in {city}".
- Shown in `/admin` with the other leads (kind chip), and under **My Enquiries** for a logged-in referrer.

## How it works
- `src/components/islands/ReferralForm.tsx` posts JSON to `/api/enquiry` with `kind: 'referral'` and
  `friendName`, `friendPhone`, `need`, `city`.
- `/api/enquiry` validates the friend's mobile (10 digits, starting 6–9, not the referrer's own), `need`
  (`REFERRAL_NEEDS` in `src/lib/repo.ts`) and the city (must be one of ours), then builds the subject.
- Existing limits apply: the enquiry guard (30 per IP per day) covers referrals too.
- Linked from the footer (Services column), the account sidebar and the account page's My Enquiries
  section; listed in the sitemap.

## Files
- `src/pages/refer.astro`, `src/components/islands/ReferralForm.tsx`
- `src/pages/api/enquiry.ts`, `src/lib/repo.ts` (`LEAD_KINDS`, `REFERRAL_NEEDS`)

## Reference behaviour (Square Yards)
Reference: a refer-and-earn page — explains who can be referred, a short referral form and terms.

## Gaps vs reference
- **Not built:** reward tracking and payouts, referral codes/links, a referral status page.
