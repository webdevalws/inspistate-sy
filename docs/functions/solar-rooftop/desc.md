# Solar Rooftop

**Area:** Home services · **Route:** `/services/solar-rooftop` · **Status:** built

## What it does
Solar system size, cost after subsidy, savings and payback; free roof survey booking.

## Inputs
- Monthly bill, tariff ₹/unit, shadow-free roof sq ft
- Home or society/commercial

## Outputs
- Recommended kW, monthly units, system cost, central subsidy, net cost, monthly saving, payback, 25-year net savings

## How it works
- kW = min(bill ÷ tariff ÷ 30 ÷ 4, roof ÷ 100), floored to 0.5, 1–10 kW.
- Cost ₹60,000/kW; homes get ₹30,000/kW for 2 kW + ₹18,000 for the 3rd kW, max ₹78,000.
- Saving = min(bill, kW × 4 × 30 × tariff); payback = net ÷ yearly saving.

## Files
- `src/data/home-services.ts`
- `src/components/islands/HomeServices.tsx (SolarEstimator)`
- `src/pages/services/[slug].astro`

## Reference behaviour (Square Yards)
Reference page: https://www.squareyards.com/solar-rooftop — no calculator; benefits, 6-step process, partner products, system types, document checklist, tilt guidance, FAQ ("no exact cost can be figured out"); common lead form.

## Gaps vs reference
- **Ahead of reference:** savings and subsidy calculator.
- **Not built:** state subsidy top-ups, EMI plans, project gallery.
