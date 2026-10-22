# Project Detail

**Area:** Projects · **Route:** `/projects/{city}/{slug}` · **Status:** built

## What it does
Full project dossier.

## Inputs
- Project slug

## Outputs
- Details, floor plans, transactions, trends, amenities, location, RERA, reviews, FAQ

## How it works
- Loads project + units, transactions, reviews, similar projects in parallel.
- **Brochure (lead-gated on the server):** "Download Brochure" opens the lead dialog; after a successful
  `brochure` enquiry, `/api/enquiry` sets the HttpOnly `is_brochures` cookie (`<leadId>.<sig>`, sig =
  SHA-256 of the lead id and the visitor's phone; last 20 kept, 30 days) and the dialog opens
  `/projects/{city}/{slug}/brochure`. That page opens only if the cookie matches a brochure lead **for
  this project** (re-checked against `leads`) or the logged-in user has such a lead; otherwise it
  redirects (302) to the project page. The brochure page is also `noindex`.

## Files
- `src/pages/projects/[city]/[slug].astro`, `src/pages/projects/[city]/[slug]/brochure.astro`
- `src/lib/brochure.ts` (`rememberBrochureLead`, `canOpenBrochure`), `src/pages/api/enquiry.ts`

## Reference behaviour (Square Yards)
_No direct reference page identified yet._

## Gaps vs reference
_To be filled after REA analysis._
