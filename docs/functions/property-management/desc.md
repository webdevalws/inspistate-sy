# Property Management

**Area:** Home services · **Route:** `/services/property-management` · **Status:** built

## What it does
Tenant finding, verification, rent collection and upkeep for owners, including NRIs.

## Inputs
- Step 1: city*, property type*, BHK* (hidden for plots and commercial)
- Step 2: resident or NRI, name, mobile, email, consent

## Outputs
- Lead "Property management: <type> <BHK> in <city>, owner <Resident/NRI>"
- Comparison table (yourself / broker / us), features, FAQ

## How it works
- Continue enabled only when city, type and (if needed) BHK are set; `PM_NO_BHK` lists types without BHK.

## Files
- `src/data/home-services.ts`
- `src/components/islands/HomeServices.tsx (PropertyManagementForm)`
- `src/pages/services/[slug].astro`

## Reference behaviour (Square Yards)
Reference page: https://www.squareyards.com/property-management — 4-step modal (city, property type, BHK hidden for commercial/land → resident/NRI, name, mobile → OTP → thanks) posting to `/pms-send-otp-v2` and `/pms-submit-form`; stats, "5 zeros", features, 4-step process, comparison table, NRI block, FAQ.

## Gaps vs reference
- **Matched:** multi-step form with the same conditional BHK rule, resident/NRI, comparison table, process, FAQ.
- **Not built:** OTP step; owner dashboard.
