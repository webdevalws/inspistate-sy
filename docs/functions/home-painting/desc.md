# Home Painting

**Area:** Home services · **Route:** `/services/home-painting` · **Status:** built

## What it does
Painting cost estimate and free site-visit booking.

## Inputs
- BHK / carpet area
- Finish (economy, standard, premium, luxury)
- Interior, exterior or both
- Repaint, include ceilings

## Outputs
- Paintable area, cost range, working days
- Room-wise paint tips
- Lead with the estimate

## How it works
- Interior area = carpet × 3.5 (2.5 without ceilings); exterior = carpet × 1.2.
- Cost = area × ₹/sq ft for the finish (interior 14/20/28/40, exterior 20/28/38/50) × 0.85 if repainting; range −10% / +15%; days = area / 900 (min 2).

## Files
- `src/data/home-services.ts`
- `src/components/islands/HomeServices.tsx (PaintingEstimator)`
- `src/pages/services/[slug].astro`

## Reference behaviour (Square Yards)
Reference page: https://www.squareyards.com/home-painting-services — no estimator; services list, 6-step process (form → consultation → colour selection → first day → execution → post-completion), benefits, gallery, room tips, partner, FAQ; common lead form.

## Gaps vs reference
- **Ahead of reference:** cost estimator.
- **Not built:** gallery, waterproofing/wallpaper sub-services as separate products.
