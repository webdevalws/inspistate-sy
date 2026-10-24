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
- **Ranges** (price range, carpet area) use `formatRange(min, max, fmt)` from `src/lib/format.ts`, which
  shows one value when both ends are equal ("₹98 L", not "₹98 L – ₹98 L"). The same helper is used by
  project cards, the brochure, compare, the affordability tool and the home page's locality and project
  cards.
- **Images:** the project page's gallery and the listing pages use the generated SVG illustrations
  (`Cover.astro`: `public/images/project-1…6.svg` chosen by `hue`, plus villa/plot illustrations). Project
  **cards** (`ProjectCard.astro`) use a set of six stock `.jpg` photos chosen by `id % 6`.
- **Demo data:** 30 generated projects (ids 1001–1030) plus 3 hand-written Lucknow projects (ids
  1031–1033: Ganga Gomti Heights in Gomti Nagar, under construction; Meridian Golf Vista in Sushant Golf
  City, new launch; Vistaar Awadh Residency in Indira Nagar, ready to move), with existing fictional
  builders and RERA numbers marked `UPRERA-DEMO-…`, plus 3 hand-written Navi Mumbai projects (ids
  1034–1036: Sahyadri Skyline in Kharghar, under construction; Meridian Bayview in Vashi, ready to move;
  Aravalli Greens in Panvel, new launch; `MAHARERA-DEMO-NM-…`). Their transactions and reviews are
  generated after all the others (Navi Mumbai after Lucknow), so the rest of the seed is unchanged.
- **Request to book:** a "Request to book" button in the action row and the contact card opens the lead
  dialog with the project's units, a visit date and a "request, not a payment" note; saved as a `booking`
  lead (see [leads](../leads/desc.md)). Sale listing pages have the same button in their contact card.
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
