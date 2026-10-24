# Compare Projects

**Area:** Projects · **Route:** `/compare` · **Status:** built

## What it does
Side-by-side comparison of up to 3 projects.

## Inputs
- Project ids

## Outputs
- Table with best values highlighted

## How it works
- Lowest price/rate/density and highest area/amenities/rating win.
- `?ids=` keeps the first 3 **unique** project ids, so a repeated id (e.g. `ids=1,1,1`) shows that project once.

- **Unknown ids (item 86):** ids that don't match a project are ignored in the Remove and "+ Add" links, so
  `/compare?ids=1001,99999` offers `/compare?ids=1001,1005`, not `…,99999,1005`.

## Files
- `src/pages/compare.astro`

## Reference behaviour (Square Yards)
_No direct reference page identified yet._

## Gaps vs reference
_To be filled after REA analysis._
