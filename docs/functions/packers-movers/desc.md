# Packers & Movers

**Area:** Home services · **Route:** `/services/packers-movers` · **Status:** built

## What it does
Instant moving-cost estimate and a quote request to partner movers.

## Inputs
- From, to, distance (1–2,500 km), date
- Home size 1–4 BHK, car, bike
- Name, mobile, email, consent

## Outputs
- Estimated min–max cost for the distance band
- Full price table
- Lead with the estimate in its subject

## How it works
- Band = first of 50/500/1,000/1,500/2,500 km ≥ distance; estimate = home row + car row + bike row for that band (`moveEstimate`).

## Files
- `src/data/home-services.ts`
- `src/components/islands/HomeServices.tsx (PackersEstimator, ServiceLead)`
- `src/pages/services/[slug].astro`

## Reference behaviour (Square Yards)
Reference page: https://www.squareyards.com/packers-and-movers — no estimator in its JS; static "Approximate Relocation Charges" table (1–4 BHK, car, bike × 5 distance bands), 4-step process, tips, partner, city links, FAQ; common OTP lead form (`pageCategory: movers-packers`).

## Gaps vs reference
- **Ahead of reference:** live estimator from the same distance bands.
- **Not built:** OTP on leads, per-city pages, partner branding.
