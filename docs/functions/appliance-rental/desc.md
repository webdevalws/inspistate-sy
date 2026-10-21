# Appliance Rental

**Area:** Home services · **Route:** `/services/appliance-rental` · **Status:** built

## What it does
Browse rental appliances by category, build a cart and request delivery.

## Inputs
- Category tab, items, tenure
- Contact details

## Outputs
- Monthly rent for the cart; lead

## How it works
- Same as furniture rental, with the `APPLIANCES` catalogue.

## Files
- `src/data/home-services.ts (APPLIANCES)`
- `src/components/islands/HomeServices.tsx (RentalCatalogue)`

## Reference behaviour (Square Yards)
Reference page: https://www.squareyards.com/rent-appliances — category tabs (refrigerators, AC, washing machine, air purifier, microwave, TV, cooler, RO) with starting prices; same lead flow as furniture.

## Gaps vs reference
- **Matched:** category tabs, starting prices, show interest.
- **Not built:** item photos, KYC and checkout.
