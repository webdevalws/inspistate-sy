# Buy vs Rent

**Area:** Tools · **Route:** `/tools/buy-vs-rent` · **Status:** built

## What it does
Compares your net worth after N years of buying a home vs renting and investing, using locality prices and rents.

## Inputs
- City and locality (auto-fills price = rate × area and rent = rent/sq ft × area; both can be overridden)
- BHK chips (sets area) and area
- Stay duration chips 5/7/10/15/20 + slider 1–30
- Rent rises yearly (0–15%) or constant
- Down payment 0–90% (30), tenure 1–30 (20), loan rate 5–20% (8.5), investment return 1–20% (8.5), price growth −5–20% (5)
- Buying costs: stamp duty & fees % (7), upkeep % per year (0.5)

## Outputs
- Verdict: Buy wins / Rent wins / Close call (within 5%)
- Net worth each way, breakeven year, EMI
- Net worth chart and year-by-year table
- Where the money goes
- What would change the outcome (breakeven growth, price, return, loan rate)
- Locality comparison: price, rent, rental yield, breakeven, verdict
- Links to matching homes for sale and rent

## How it works
- Both sides start with the same cash (down payment + buying costs) and spend the same each month.
- Buyer: EMI + upkeep (on current value); net worth = home value − loan balance + any surplus invested when rent would have cost more.
- Renter: invests the upfront cash and, each month, the amount by which owning would have cost more than rent; compounding monthly at the investment return.
- Breakeven = first year buy > rent. Sensitivity values found by bisection on the final gap (`solveLevel`).

## Files
- `src/components/islands/BuyVsRent.tsx`
- `src/pages/tools/[tool].astro`

## Reference behaviour (Square Yards)
Reference page: https://www.squareyards.com/buy-vs-rent-calculator — `buy-vs-rent-calculator-*.min.js`.

- Flow: city chips → micromarket (`GET /getCalculatorMicromarkets/{cityId}`) → BHK (`GET /getCalculatorBhks/{mmId}`) → area min/max → horizon chips/slider (default 15) → rent increase % or constant → sliders: down payment 30%, tenure 20, rate 8.5%, return 8.5%.
- Calculation is server-side: `POST /buy-vs-rent/calculate` returns verdict (Buy/Rent/Close Call), side-by-side table, simple explanation, stay-duration insight and "what would change", money flow, key numbers, yearly projection (buy net worth vs rent corpus), locality comparison, AI explanation. Projects/listings carousels via `/getCalculatorProjects` and `/get-rental-listings`.
- Documented logic: EMI formula; buy net worth = appreciated value − outstanding loan; rent = down payment compounded at the investment return; breakeven = first year buy > rent; rent escalation not assumed without data.

## Gaps vs reference
- **Matched:** locality-driven inputs with override, horizon chips, constant-rent option, all four sliders with the same defaults, verdict incl. close call, breakeven, yearly projection chart, what-would-change, locality comparison, links to listings.
- **Different:** computed in the browser; our model also invests the monthly cost difference on both sides and includes buying costs and upkeep (shown as adjustable inputs).
- **Not built:** AI-written explanation, project carousels inside the tool.
