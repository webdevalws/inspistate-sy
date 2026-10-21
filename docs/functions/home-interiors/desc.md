# Home Interiors service

**Area:** Services · **Route:** `/services/home-interiors` · **Status:** built

## What it does
Interiors service page with the full-home estimator embedded, steps, features and FAQ.

## Inputs
- Estimator inputs (see interior-cost)

## Outputs
- Estimate + lead; links to kitchen calculator and design ideas

## How it works
- `SERVICE_CONTENT['home-interiors']` supplies steps, features, FAQ; page renders `InteriorEstimator` in the wide section.

## Files
- `src/pages/services/[slug].astro`
- `src/data/home-services.ts`

## Reference behaviour (Square Yards)
Reference: Interior Company pages linked from Square Yards' Interiors menu.

## Gaps vs reference
- **Not built:** designer booking calendar.
