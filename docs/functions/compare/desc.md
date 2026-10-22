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

## Files
- `src/pages/compare.astro`

## Reference behaviour (Square Yards)
_No direct reference page identified yet._

## Gaps vs reference
_To be filled after REA analysis._
