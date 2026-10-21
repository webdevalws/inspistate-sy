# Cost of Living Calculator

**Area:** Tools · **Route:** `/tools/cost-of-living` · **Status:** built

## What it does
Monthly household budget to live in a chosen locality.

## Inputs
- City, locality, home size, adults, children, meals out, car

## Outputs
- Itemised monthly cost and total

## How it works
- Rent = locality rent/sq.ft × home size.
- Other items are urban baselines scaled by the locality price level (rent ÷ 30, clamped 0.75–1.6).

## Files
- `src/components/islands/LivingTools.tsx (CostOfLiving)`

## Reference behaviour (Square Yards)
Reference page: https://www.squareyards.com/cost-of-living-calculator — script `cost-of-living-*.min.js`.

**Flow:** 3-step wizard — (1) city → (2) micromarket, configuration (BHK + sq.ft range), monthly income (₹10,000–₹1 crore), expense level per category → (3) results.

**Data endpoints:** `/get-micromarkets` (cityId), `/get-avg-resale-price` (POST: micromarket, area range, units), `/get-rental-listings` (live rentals for the config), `/download-cost-report` (POST → PDF).

**Algorithm (recovered):**
- Family type from BHK: 3–5 → large family, 2–3 → small family, 1–2 → single/couple.
- Non-housing cost = sum over expense categories of the amount for the chosen level (city × configuration table).
- **Rent scenario:** rent (micromarket average) + non-housing; savings and savings % of income.
- **Buy scenario:** property value = average resale price; down payment 20%; EMI at 8.5% for 240 months; total = EMI + non-housing; savings %; price-to-income ratio = value ÷ (12 × income); EMI-to-income %.
- Micromarket comparison table and cheaper alternatives; live rental listings; Download Report (PDF) and Share.

## Gaps vs reference
- Ours had no rent-vs-buy comparison, configuration step, expense levels, micromarket comparison, listings or report → **rebuilt as the same 3-step wizard**.
