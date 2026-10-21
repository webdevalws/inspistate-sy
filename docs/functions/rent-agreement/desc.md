# Rent Agreement Draft

**Area:** Tools · **Route:** `/tools/rent-agreement` · **Status:** built

## What it does
Generates a standard 11-month leave & licence agreement draft.

## Inputs
- Parties, addresses, rent, deposit, start, term, lock-in, notice, hike, furnishing

## Outputs
- Printable / copyable agreement text

## How it works
- Fills a fixed clause template; end date = start + term − 1 day.

## Files
- `src/components/islands/MoreTools.tsx (RentAgreement)`

## Reference behaviour (Square Yards)
Reference page: https://www.squareyards.com/rent-agreement.

**Flow:** fill details online → pay → digitally sign → e-stamped agreement emailed. Phone login required.
**State table (time span / stamp duty):** Delhi ≤5 yrs; Noida ≤11 months; Karnataka 1% of total rent + deposit per year or ₹500, whichever is less; Tamil Nadu 1% of rent with deposit; Uttar Pradesh <1 yr: 4% of yearly rent with deposit; Maharashtra ≤5 yrs: 0.25% of total rent; Gurgaon 5–10 yrs: 1.5–3% of average yearly rent.
Content: types (rent / lease / leave & licence), required details, documents, format, stamp duty.

## Gaps vs reference
- Ours generated a draft only. Added: state selection with indicative stamp duty, "order e-stamped agreement" request (stored in DB). Online payment + e-sign need a payment gateway and an e-sign provider — not yet integrated.
