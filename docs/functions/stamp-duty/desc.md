# Stamp Duty Calculator

**Area:** Tools · **Route:** `/tools/stamp-duty` · **Status:** built

## What it does
Stamp duty and registration fee for a property purchase, by state and buyer (man / woman / joint).

## Inputs
- State (30 states/UTs)
- Buyer: man, woman or joint
- Property value ₹5 lakh – ₹50 crore (number + slider, shown in lakh/crore)

## Outputs
- Stamp duty rate for you, stamp duty, registration fee (with cap), total government charges
- State note (metro cess, slabs, caps) and range errors

## How it works
- Rate = state flat rate, or the per-buyer rate where the state has gender rates (`rateFor`).
- Duty = value × rate / 100.
- Registration = value × state registration % (capped where the state caps it, e.g. Maharashtra ₹30,000; nil for women in Gujarat).
- Rates live in `src/data/stamp-duty.ts` and are indicative; duty is really charged on the higher of agreement value and circle rate.

## Files
- `src/data/stamp-duty.ts`
- `src/components/islands/Calculators.tsx (StampDuty)`
- `src/pages/tools/[tool].astro`

## Reference behaviour (Square Yards)
Reference page: https://www.squareyards.com/stamp-duty-calculator (inline script).

- Inputs: state (29), gender radios shown only when the state has gender rates (male/female/joint), property value with slider (min ₹5 L, max ₹50 Cr, amount in words).
- Formula: `duty = amount × rate / 100` (2 decimals). Rate = state `rate`, or the gender rate when `rate` is 0; missing joint rate falls back to male.
- Gender states in their data: Bihar, Haryana, Odisha, Punjab, Rajasthan, Uttar Pradesh, Uttarakhand. No registration fee is calculated; a static metro table lists registration (Chennai 4%, Hyderabad 0.5%, Ahmedabad free for women).
- Sticky OTP lead form; no backend for the calculation.

## Gaps vs reference
- **Matched:** state list, man/woman/joint rates, ₹5 L–₹50 Cr limits with errors, amount in words, live result.
- **Better than reference:** registration fee per state with caps and women exemptions; Delhi, HP and Maharashtra concessions added; their Bihar male/female swap and outdated Maharashtra 3% corrected.
- **Not built:** OTP lead form on the calculator; rural vs urban rates.
