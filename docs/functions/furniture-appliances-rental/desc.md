# Furniture & Appliances on Rent

**Area:** Home services · **Route:** `/services/furniture-appliances-rental` · **Status:** built

## What it does
Furnish a whole home on rent: 1/2/3 BHK furniture packages plus appliances (fridge, washing machine, AC,
TV) on 3, 6 or 12-month plans, with an estimate of the monthly rent and a callback request.

## Inputs
- Furniture package (1 BHK, 2 BHK, 3 BHK or none), appliances, plan (3 / 6 / 12 months)
- Contact details (name, mobile, optional email, consent)

## Outputs
- Estimated monthly rent and refundable deposit (about 2 months' rent)
- A `service` lead via `/api/enquiry` whose subject carries the selection and estimate (existing limit:
  30 service leads per IP per day)

## How it works
- Same page, layout and components as the other home services: `src/pages/services/[slug].astro` with the
  estimator in the hero card, then packages, appliances, individual items, plans by tenure, how it works
  (choose → schedule delivery → free maintenance → return or upgrade), why book, FAQ and the partner note.
- **All prices are DEMO prices**, labelled on the page: package rents in `RENT_PACKAGES`, appliance add-ons in
  `RENT_ADDONS` (same prices as the appliance catalogue), single items from `FURNITURE` / `APPLIANCES`.
- Monthly rent = (package + add-ons, 12-month price) × tenure factor (3 mo 1.3, 6 mo 1.15, 12 mo 1, from
  `RENTAL_TENURES`), in `rentPackageEstimate()`.
- Listed in `SERVICES` (services index, "Other services", sitemap), the header's Rent → For tenants and
  Services → Home & move menus, and the city hub's "For tenants" tab.
- No new tables: leads use the existing `leads` table.

## Files
- `src/data/home-services.ts` (`RENT_PACKAGES`, `RENT_ADDONS`, `RENT_PLANS`, `rentPackageEstimate`, `SERVICE_CONTENT`)
- `src/components/islands/HomeServices.tsx` (`RentPackageEstimator`, `ServiceLead`)
- `src/pages/services/[slug].astro`, `src/lib/catalog.ts` (`SERVICES`, `headerMenus`)

## Reference behaviour (Square Yards)
Reference pages: https://www.squareyards.com/rent-furniture and /rent-appliances — packages, item cards with
monthly prices, tenure plans, FAQs and a show-interest form.

## Gaps vs reference
- **Not built:** real partner prices per city, item photos, KYC and checkout.
