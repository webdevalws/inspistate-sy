# Home Loan Interest Rates

**Area:** Finance · **Route:** `/home-loan-interest-rates` · **Status:** built

## What it does
Bank-wise home loan rates with EMI per lakh, fees and filters.

## Inputs
- Tabs: All / Public bank / Private bank / Housing finance
- Rate filter (<9% / ≥9%), Quick approval, sort by rate

## Outputs
- Lender cards: rate range, EMI per lakh (20 yrs), processing fee, amount, tenure, Enquire
- Rate factors, lowest rate by year, FAQ

## How it works
- Data in `HOME_LOAN_LENDERS` (18 lenders, indicative Oct 2026); EMI per lakh computed with `emi()`.

## Files
- `src/components/islands/LoanTools.tsx (RateTable)`
- `src/pages/home-loan-interest-rates.astro`
- `src/data/loans.ts`

## Reference behaviour (Square Yards)
Reference: https://www.urbanmoney.com/home-loan/interest-rate — tabs Nationalized/Private/NBFC, >10%/<10% and quick-approval filters, sort; cards with rate, EMI per lakh (5 yrs), amount, tenure, fees, prepayment; Apply/Enquire; yearly lowest-rate table.

## Gaps vs reference
- **Matched:** tabs, filters, sort, card fields, history table.
- **Different:** EMI per lakh on 20 years (more meaningful for home loans).
- **Not built:** per-lender pages; live rate updates (data is a static table to refresh monthly).
