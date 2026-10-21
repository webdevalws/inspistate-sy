# Home Loan Eligibility

**Area:** Tools · **Route:** `/tools/loan-eligibility` · **Status:** built

## What it does
How much a bank may lend, with co-applicant, employment type and credit score, plus best-rate lender offers.

## Inputs
- Salaried / self-employed
- Net income, existing EMIs, age
- Credit score band
- Optional co-applicant income, EMIs, age

## Outputs
- Eligible loan, max EMI, FOIR, max tenure, property value supported
- Four lowest-rate lenders with loan amount at their rate

## How it works
- FOIR by combined income: ≥1.5 L 60%, ≥75 k 55%, ≥40 k 50%, else 45%; −5% for self-employed.
- Tenure = retirement age (60 salaried / 65 self-employed) − older applicant’s age, max 30.
- Rate = lender min rate + credit adjustment (0 / 0.25 / 0.75 / 1.5).
- Loan = max EMI ÷ EMI per ₹1 lakh × 1 lakh; property value from RBI LTV caps 90/80/75%.

## Files
- `src/components/islands/LoanTools.tsx (Eligibility)`
- `src/data/loans.ts (HOME_LOAN_LENDERS)`

## Reference behaviour (Square Yards)
Reference: https://www.urbanmoney.com/home-loan/eligibility-calculator — for home loans only an OTP lead form (name, mobile, city, loan type) that redirects to a loan gateway; the dormant calculator posts income/EMIs/tenure/DOB/occupation to `/api/v1/calculator` and shows a best offer. FOIR/age/LTV rules are server-side; page text cites FOIR 40–60%, youngest applicant sets tenure, LTV 75–90%.

## Gaps vs reference
- **Better:** works instantly without OTP; co-applicant; credit score adjustment; offers from our lender table.
- **Not built:** OTP-verified application to a lender.
