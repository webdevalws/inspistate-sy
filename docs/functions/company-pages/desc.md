# Company & business pages

**Area:** Company · **Route:** `/careers, /press, /app-download, /partner-with-us, /advertise, /business` · **Status:** built

## What it does
Careers (open roles + application form), press, app (notify me), partner with us, advertise, and B2B solutions (data intelligence, mortgage partnerships, sales acceleration, agent CRM, virtual tours).

## Inputs
- Enquiry form per page (subject tagged by page)

## Outputs
- Content sections, role list, lead

## How it works
- Entries in `PAGES` of the static page route with optional `form` subject and `list`.

## Files
- `src/pages/[page].astro`
- `src/components/Footer.astro`
- `src/lib/catalog.ts (menu)`

## Reference behaviour (Square Yards)
Reference: https://www.squareyards.com footer links — Careers, Media Coverage, Financials, Download App, Partner With Square Yards, Advertise, Data Intelligence, Mortgage Partnerships, SuperAgent Pro, Site Accelerator, PropVR.

## Gaps vs reference
- **Not built:** investor financials (not applicable), actual mobile app, agent CRM product.
