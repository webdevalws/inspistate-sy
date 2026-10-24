# Furniture & Appliances on Rent

**Area:** Home services · **Route:** `/services/furniture-appliances-rental` · **Status:** built

## What it does
Furnish a whole home on rent: 1/2/3 BHK furniture packages plus appliances (fridge, washing machine, AC,
TV) on 3, 6 or 12-month plans, with an estimate of the monthly rent and a callback request, plus a
single-item cart for anyone who only needs a few pieces.

**Replaces** the old `/services/furniture-rental` and `/services/appliance-rental` pages (item 48): both URLs
return a **301** to this page (`MERGED` in `src/pages/services/[slug].astro`) and are no longer listed anywhere.

## Inputs
- Furniture package (1 BHK, 2 BHK, 3 BHK or none), appliances, plan (3 / 6 / 12 months)
- Or single items: category tab (Bedroom, Living room, Dining, Study, Refrigerators, Washing machines, Air
  conditioners, TV & more), items (add / remove), tenure 3 / 6 / 12 / 24 months
- Contact details (name, mobile, optional email, consent)

## Outputs
- Estimated monthly rent and refundable deposit (about 2 months' rent)
- A `service` lead via `/api/enquiry` whose subject carries the selection and estimate (existing limit:
  30 service leads per IP per day)

## How it works
- Same page, layout and components as the other home services: `src/pages/services/[slug].astro` with the
  estimator in the hero card, then packages, appliances, individual items (`RentalCatalogue`: the item cart
  from the old two pages, now with furniture and appliances together), plans by tenure, how it works
  (choose → schedule delivery → free maintenance → return or upgrade), why book, FAQ and the partner note.
- **All prices are DEMO prices**, labelled on the page: package rents in `RENT_PACKAGES`, appliance add-ons in
  `RENT_ADDONS` (same prices as the appliance catalogue), single items from `FURNITURE` / `APPLIANCES`.
- Monthly rent = (package + add-ons, 12-month price) × tenure factor (3 mo 1.3, 6 mo 1.15, 12 mo 1, from
  `RENTAL_TENURES`), in `rentPackageEstimate()`.
- Features and FAQs include everything from the old two pages (billing start, early returns with a week's
  notice, 24-month plans, free installation incl. AC, 48–72 h breakdown fixes, buying later, branded
  appliances, seasonal renting, upgrades, free relocation).
- Listed in `SERVICES` (services index, "Other services", sitemap), the header's Rent → For tenants and
  Services → Home & move menus, and the city hub's "For tenants" tab.
- No new tables: leads use the existing `leads` table.

## Accessibility of the chips (item 77)
- Chip groups in every home-service estimator (`Chips` in `HomeServices.tsx`: furniture package, plan, home size,
  paint scope, solar property, configuration, resident type) are a `<fieldset>` with a visible `<legend>`. They used
  to sit inside a `<label>`, which gave the first chip the group's name ("Furniture package" instead of "1 BHK")
  and made a click on the label text select the first option. `L` (a `<label>`) is now only used for single inputs
  and selects.

## Files
- `src/data/home-services.ts` (`RENT_PACKAGES`, `RENT_ADDONS`, `RENT_PLANS`, `rentPackageEstimate`, `SERVICE_CONTENT`)
- `src/components/islands/HomeServices.tsx` (`RentPackageEstimator`, `RentalCatalogue`, `ServiceLead`)
- `src/pages/services/[slug].astro`, `src/lib/catalog.ts` (`SERVICES`, `headerMenus`)

## Reference behaviour (Square Yards)
Reference pages: https://www.squareyards.com/rent-furniture and /rent-appliances — packages, item cards with
monthly prices, tenure plans, FAQs and a show-interest form.

## Gaps vs reference
- **Not built:** real partner prices per city, item photos, KYC and checkout.
