# Business Loan

**Area:** Finance · **Route:** `/loans/business-loan` · **Status:** built

## What it does
Product page: at-a-glance terms, request form, eligibility calculator, EMI calculator, lender comparison, documents and FAQ.

## Inputs
- Request: amount, city, employment, income + name/mobile/email/consent
- Eligibility: employment, income, EMIs, age, tenure, rate

## Outputs
- Eligible amount with EMI capacity, tenure and EMI
- Lender table with tabs/filters/sort
- Lead saved with the request summary

## How it works
- EMI capacity = income × FOIR (50% personal, 55% others; −5% self-employed) − EMIs.
- Loan = capacity ÷ EMI per rupee for min(tenure, max age − age); max age 60 (65 for LAP).
- Lender data in `src/data/loans.ts`.

## Files
- `src/pages/loans/[product].astro`
- `src/components/islands/Finance.tsx (ProductEligibility, LoanRequest)`
- `src/components/islands/LoanTools.tsx (LoanEmi, RateTable)`
- `src/data/loans.ts (LOAN_PRODUCTS)`

## Reference behaviour (Square Yards)
Reference: https://www.urbanmoney.com/business-loan — hero + lead form (mobile/OTP), at-a-glance table, lender table (Nationalized/Private/NBFC, feature chips), embedded EMI widget, eligibility criteria, documents, FAQ.

## Gaps vs reference
- **Matched:** page structure, lender comparison, EMI widget, criteria, documents, FAQ, request form.
- **Better:** eligibility computed instantly.
- **Not built:** OTP verification, PAN-based offers, lender API integration.
