# EMI Calculator

**Area:** Tools · **Route:** `/tools/emi-calculator` · **Status:** built

## What it does
Monthly EMI, total interest and a full amortisation schedule for home, personal, business loans and loan against property.

## Inputs
- Loan type (sets ranges and defaults)
- Amount, rate, tenure — typed box + slider, clamped to range
- Optional processing fee %

## Outputs
- EMI with amount in Indian words
- Half-doughnut principal vs interest (+fee)
- Principal, interest, fee, total payable
- Year-by-year schedule, each year expandable to months; 5 years then "show all"

## How it works
- EMI = P·r·(1+r)^n / ((1+r)^n − 1), r = rate/1200, n = months.
- Schedule: interest = balance·r; principal = EMI − interest.
- Ranges per product in `LOAN_KINDS` (home ₹5 L–₹20 Cr, 1–30 yrs, 6–20%).
- Tab bar links EMI / eligibility / balance transfer / prepayment / tax benefit.

## Files
- `src/components/islands/LoanTools.tsx (LoanEmi, LoanTabs, inWords)`
- `src/data/loans.ts (LOAN_KINDS)`
- `src/components/islands/EmiCalculator.tsx (emi(), compact widget on property/project pages)`

## Reference behaviour (Square Yards)
Reference: https://www.urbanmoney.com/home-loan/emi-calculator (Urban Money, linked from Square Yards). Amount 5 L–20 Cr, tenure 5–30, rate 6–20 (default 6.5); result from `POST core.urbanmoney.com/app-flow/calculator/emi` → `{Emi{emi, interstPayable, totalAmountPayable}, EmiBreakup[year→months]}`; amount in words; half-doughnut; yearly schedule with monthly breakup; loan-type radios.

## Gaps vs reference
- **Matched:** inputs + sliders, words, half-doughnut, yearly→monthly schedule, loan-type switch, tab bar.
- **Better:** computed in the browser (no API), optional processing fee.
