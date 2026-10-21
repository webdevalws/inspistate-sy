# Home Loan Tax Benefit

**Area:** Tools · **Route:** `/tools/tax-benefit` · **Status:** built

## What it does
Income tax saved with a home loan under the old regime, compared with the new regime, for single or joint owners.

## Inputs
- Interest and principal paid this year
- Other 80C investments
- Self-occupied or let-out (rent)
- Late construction (₹30 k cap), 80EEA toggle
- Joint loan: each owner’s income and share

## Outputs
- Tax saved (old regime)
- Per-owner table: house-property deduction, 80C, 80EEA, tax without loan, with loan, new-regime tax
- Which regime is better and by how much

## How it works
- FY 2025-26 slabs. Old: 0/5/20/30% at 2.5/5/10 L, std deduction ₹50 k, 87A rebate ₹12,500 up to ₹5 L. New: 0–30% in ₹4 L steps to ₹24 L, std ₹75 k, rebate ₹60 k up to ₹12 L. 4% cess; no surcharge.
- 24(b) self-occupied ≤ ₹2 L (₹30 k if late); let-out: 70% of rent − interest, loss set-off ≤ ₹2 L.
- 80C = min(₹1.5 L, other + principal share); 80EEA extra ≤ ₹1.5 L on interest above ₹2 L.
- New regime: no deduction for a self-occupied home.

## Files
- `src/components/islands/LoanTools.tsx (TaxBenefit)`
- `src/data/loans.ts (OLD_REGIME, NEW_REGIME, LIMITS, slabTax)`

## Reference behaviour (Square Yards)
Reference: https://www.urbanmoney.com/home-loan/tax-benefit-calculator — browser-only: old-regime slabs, 80C ≤ 1.5 L, 24(b) ≤ 2 L, a flat ₹5,000 rebate; no cess, standard deduction, new regime, joint owners or let-out case.

## Gaps vs reference
- **Better:** correct 87A rebate, cess, standard deduction, new-regime comparison, joint owners, let-out and 80EEA.
