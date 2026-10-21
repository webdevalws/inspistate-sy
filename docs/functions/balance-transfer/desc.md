# Balance Transfer Calculator

**Area:** Tools · **Route:** `/tools/balance-transfer` · **Status:** built

## What it does
Savings from moving a home loan to a lower-rate lender, net of processing fees.

## Inputs
- Original amount, tenure, current rate
- New rate (capped at current)
- EMIs paid (max 12n − 1)
- Processing fee %

## Outputs
- Net savings (words), outstanding principal, current vs revised EMI, gross interest saved, fee, months to recover the fee

## How it works
- Outstanding after k EMIs: O = P(1+i)^k − E₁((1+i)^k − 1)/i.
- Revised EMI E₂ = EMI(O, new rate, n − k).
- Gross saving = (E₁ − E₂)(n − k); net = gross − fee × O; breakeven = fee ÷ (E₁ − E₂) months.

## Files
- `src/components/islands/LoanTools.tsx (BalanceTransfer, outstanding)`

## Reference behaviour (Square Yards)
Reference: https://www.urbanmoney.com/home-loan/balance-transfer-calculator — inputs amount, tenure, current rate 7, expected rate 6.5 (max = current), EMIs paid; server `/calculator/balancetransfer` returns current/revised EMI, total saving and lender plans. No fee deduction.

## Gaps vs reference
- **Better:** nets off processing fee and shows breakeven month.
- **Not built:** list of lender BT offers inside the result (link to rates page instead).
