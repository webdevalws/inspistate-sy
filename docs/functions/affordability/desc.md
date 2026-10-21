# Affordability Calculator

**Area:** Tools · **Route:** `/tools/affordability` · **Status:** built

## What it does
Home budget from income, existing EMIs and savings.

## Inputs
- Net monthly income, existing EMIs, savings, rate, tenure

## Outputs
- Affordable EMI, eligible loan, home budget

## How it works
- Affordable EMI = 50% of income − existing EMIs.
- Loan = affordable EMI ÷ EMI per ₹1 lakh × 1 lakh; budget = loan + savings.

## Files
- `src/components/islands/Calculators.tsx (Affordability)`

## Reference behaviour (Square Yards)
Reference page: https://www.squareyards.com/affordability-calculator — script `affordability-calculator-*.min.js` (static analysis via REA export-web-scripts).

**Inputs:** city, micromarket, BHK, area min/max, net monthly income, existing obligations (EMIs), down payment, interest rate, tenure (only 10/15/20/25 years).

**Algorithm (recovered):**
- Obligation ratio = obligations ÷ income → FOIR tier: ≤10% → 50%, ≤20% → 45%, ≤30% → 40%, ≤40% → 35%, else 30%.
- Max comfortable EMI = max(income × FOIR − obligations, 0).
- Max eligible loan = present value of that EMI at the applied rate over the tenure.
- Max property budget = loan + down payment. Monthly buffer = income − obligations − EMI.
- Buffer message: ≥35% "healthy", ≥20% "workable but watchful", else "tight".
- If comfortable EMI ≤ 0 → advisory "reduce obligations / increase down payment", recommendations paused (shows 85% of budget).
- Sensitivity chips: rate delta and alternative tenure re-run the calculation.
- Project recommendations (`GET /getCalculatorProjects` with city, micromarket, bhk, area) grouped in bands: **Most comfortable** 85–100% of budget, **Stretch** 100–115%, **Only if obligations reduce** 115–130%. A project qualifies when its price range overlaps the band; BHK match exact or ±1 ("adjacent"); area overlap or nearest; preferred micromarket first.

## Gaps vs reference
- Ours used a flat 50% FOIR and no project recommendations, sensitivity chips, buffer advice or tenure presets → **rebuilt to match**.
