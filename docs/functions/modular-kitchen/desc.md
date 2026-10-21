# Modular Kitchen Cost

**Area:** Tools · **Route:** `/tools/modular-kitchen` · **Status:** built

## What it does
Kitchen cost by layout, wall lengths and package, with optional appliances.

## Inputs
- Shape: straight, L, parallel, U, island
- Each wall in feet + inches
- Package: Basic / Plus / Signature
- Add-ons: chimney, hob, sink, tall unit, lights

## Outputs
- Total, running feet, cabinet sq ft, cabinets and extras; consultation lead

## How it works
- Running ft = Σ walls; sq ft = 2.5 × running ft; cabinets = sq ft × rate (₹3,900 / 4,500 / 5,200); total = cabinets + add-ons.

## Files
- `src/components/islands/Interiors.tsx (KitchenCalculator)`
- `src/data/interiors.ts (KITCHEN_*, kitchenCost)`

## Reference behaviour (Square Yards)
Reference: https://www.interiorcompany.com/in/modular-kitchen-cost-calculator — shape (L/U/straight/parallel) → sides in ft+in → package Silver/Gold/Platinum (₹4,044 / 4,575 / 5,136 per sq ft) → lead form. Formula: sq ft = 2.5 × running ft; total = sq ft × rate. Their summary always says "U Shape" (bug).

## Gaps vs reference
- **Matched:** same method (2.5 sq ft per running foot), shapes, three tiers with board/countertop/finish/exclusions.
- **Better:** island layout, appliance add-ons, estimate before the lead form.
