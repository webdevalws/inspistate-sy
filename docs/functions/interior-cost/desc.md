# Full Home Interior Cost

**Area:** Tools · **Route:** `/tools/interior-cost` · **Status:** built

## What it does
Step-by-step room-by-room interior estimate in three packages, with an itemised breakdown.

## Inputs
- Step 1: BHK and carpet area band (or exact area)
- Step 2: rooms (other bedrooms × BHK−1) and items — tick, quantity or sq ft
- Step 3: package Essential / Premium / Luxe
- Step 4: name, mobile, email, consent (lead gate)

## Outputs
- Running estimate range on every step
- Package cards with range and specs
- Itemised table by room (qty, price), total, low–high range, print/PDF

## How it works
- Line = qty × Essential unit price × package factor (1 / 1.35 / 1.8); painting, electrical and cleaning are not scaled.
- Range = total × 0.92 … × 1.10.
- Default quantities scale with BHK and area (e.g. ceiling 25% of area, paint 3.5 × area).

## Files
- `src/components/islands/Interiors.tsx (InteriorEstimator)`
- `src/data/interiors.ts (ROOMS, TIERS, interiorEstimate)`

## Reference behaviour (Square Yards)
Reference: https://www.interiorcompany.com/in/full-home-interior-cost-calculator — 5 steps (home type by project or address → rooms & items → package Essential/Exclusive/Bespoke → lead form with OTP → estimate). Room/item prices come from `/api/interiorCalcConfig` and `/api/calculateEstimate` (server-side, not recoverable). Page text ranges: 1 BHK ₹4–7 L, 2 BHK ₹8–11 L, 3 BHK ₹10–15 L.

## Gaps vs reference
- **Matched:** step flow, area bands, rooms/items with qty or area, three packages with specs, lead gate, itemised estimate.
- **Different:** our own unit prices; computed in the browser.
- **Not built:** pick a project to prefill unit sizes; OTP.
