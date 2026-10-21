# Area Converter

**Area:** Tools · **Route:** `/tools/area-converter` · **Status:** built

## What it does
Converts land and floor area between 43 Indian and international units, including regional units.

## Inputs
- Region / state (India general + 20 states)
- From unit, to unit (regional units appear for the chosen state)
- Value

## Outputs
- Result in the target unit and the "a = b" line
- Swap units, copy result, popular conversions, A–Z unit table with sq ft values and regions

## How it works
- Every unit is stored in square feet; result = value × from.sqft / to.sqft (6 decimals, 6 significant digits for tiny values).
- Regional units (bigha, kattha, dhur, marla, kanal, cent, guntha, ground…) are listed under the states that use them; values are common averages.

## Files
- `src/data/area-units.ts`
- `src/components/islands/Calculators.tsx (AreaConverter)`

## Reference behaviour (Square Yards)
Reference page: https://www.squareyards.com/area-converter — `area-conversion-*.min.js`.

- Region select (default "India General"), from unit, to unit (excludes from), value; Swap Units and Copy Result ("Copied!" for 1.5 s).
- `result = value × areaConversionMapping[region][from][to]` (6 decimals). The mapping table itself was not in the capture.
- Content: popular conversions, A–Z index of ~35 units, unit explainers, quick-reference factor table, FAQ.

## Gaps vs reference
- **Matched:** region-aware units, swap, copy, detail line, popular conversions, A–Z index.
- **Different:** our factors are our own standard values (theirs were not captured); 43 units vs ~35.
- **Not built:** per-unit explainer articles.
