# Home Inspection

**Area:** Home services · **Route:** `/services/property-inspection` · **Status:** built

## What it does
Book an instrument-based home inspection with a photo report.

## Inputs
- Home size (1/2/3/4+ BHK), purpose, preferred date
- Contact details

## Outputs
- Inspection fee (₹3,999–7,999), what we check, lead

## How it works
- Fee from `INSPECTION_PRICES` by size.

## Files
- `src/data/home-services.ts`
- `src/components/islands/HomeServices.tsx (InspectionBooking)`
- `src/pages/services/[slug].astro`

## Reference behaviour (Square Yards)
Reference page: https://www.squareyards.com/home-property-inspection — inline form (name, email, country code, phone, consent) + OTP; inspect/detect/protect, coverage (quality, material, area, brand, dimension), who should book, sample report, partner coupon for 10% off, FAQ. No prices shown.

## Gaps vs reference
- **Matched:** coverage list, who should book (as purpose), FAQ, lead.
- **Better:** upfront fee by home size and date picker.
- **Not built:** sample report, coupon, OTP.
