# Prepayment Calculator

**Area:** Tools · **Route:** `/tools/prepayment` · **Status:** built

## What it does
Interest saved by part-prepaying a home loan, reducing either tenure or EMI.

## Inputs
- Amount, tenure, rate, EMIs paid
- Prepayment (capped at outstanding)
- Reduce tenure / reduce EMI

## Outputs
- Interest saved (words), outstanding, original vs revised EMI, remaining months before → after

## How it works
- O = outstanding after k EMIs; O′ = O − prepayment.
- Reduce EMI: E₂ = EMI(O′, r, n − k). Reduce tenure: months = −ln(1 − iO′/E₁)/ln(1+i).
- Saving = (E₁(n − k) − O) − (E₂·months − O′).

## Files
- `src/components/islands/LoanTools.tsx (Prepayment, monthsToRepay)`

## Reference behaviour (Square Yards)
Reference: https://www.urbanmoney.com/home-loan/pre-payment-calculator — reduce-EMI only; prepayment 1,000 to outstanding; server returns original/revised EMI and savings; "Apply for a loan" lead.

## Gaps vs reference
- **Better:** both modes (reduce tenure saves more), computed locally.
