# Furniture Rental

**Area:** Home services · **Route:** `/services/furniture-rental` · **Status:** built

## What it does
Browse rental furniture by room, build a cart and request delivery.

## Inputs
- Room tab, items (add / remove), tenure 3/6/12/24 months
- Contact details

## Outputs
- Monthly rent for the cart; lead with items, tenure and rent

## How it works
- Monthly price = 12-month price × tenure factor (3 mo 1.3, 6 mo 1.15, 12 mo 1, 24 mo 0.9).

## Files
- `src/data/home-services.ts (FURNITURE)`
- `src/components/islands/HomeServices.tsx (RentalCatalogue)`

## Reference behaviour (Square Yards)
Reference page: https://www.squareyards.com/rent-furniture — room tabs (bedroom, living, dining, study) with "starting ₹/month" item cards and Show Interest; partner rental companies; FAQ (delivery after KYC, billing from delivery, free relocation after 6 months, 1-week notice); sticky lead form.

## Gaps vs reference
- **Matched:** room tabs, item cards with monthly prices, show-interest lead, rental FAQs.
- **Better:** cart with tenure-based total.
- **Not built:** item photos, per-item pages, KYC and checkout.
