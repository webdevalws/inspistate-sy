# Property Valuation

**Area:** Tools · **Route:** `/tools/property-valuation` · **Status:** built

## What it does
Estimates market value of a property from locality rates.

## Inputs
- City, locality, built-up area, age, floor band, furnishing

## Outputs
- Adjusted ₹/sq.ft and a ±7% value range

## How it works
- Base = locality average sale rate (D1 localities table).
- Multipliers: age (new +5%, −1%/yr to 10 yrs, then further), floor (low −3%, high +4%), furnishing (+2% / +5%).

## Files
- `src/components/islands/MoreTools.tsx (Valuation)`
- `src/pages/tools/[tool].astro`

## Reference behaviour (Square Yards)
Reference page: https://www.squareyards.com/online-property-valuation — mostly long-form content (methods: sales comparison, income, cost, development) plus an **e-Valuation request form** (lead via `/getcommonleadform`) and a **View Sample Report** button. No instant estimate on the page.

## Gaps vs reference
- Ours already gives an instant estimate. Missing: request a detailed valuation report (lead) and a sample report → **added**.
