# Free Credit Score

**Area:** Tools · **Route:** `/tools/credit-score` · **Status:** built

## What it does
Estimate your credit score from the main factors, see improvement tips, and request your full bureau report.

## Inputs
- Late payments, card utilisation %, age of oldest account, recent applications, credit mix

## Outputs
- Estimated score on a 300–900 gauge with band (Excellent ≥750, Good ≥700, Fair ≥650, Below average ≥600, Poor)
- Personalised tips
- Credit report request lead with consent

## How it works
- Our own heuristic: 500 + payment (−80…+120) + utilisation (−40…+90) + age (≤60) + enquiries (−20…+30) + mix (20), clamped 300–900. Clearly labelled as an estimate.

## Files
- `src/components/islands/Finance.tsx (CreditScoreCheck, bandFor)`

## Reference behaviour (Square Yards)
Reference: https://www.urbanmoney.com/cibil-credit-score — form (name, DOB, mobile, email, PAN, TransUnion CIBIL consent) → OTP or security questions → bureau report page: 300–900 gauge, payment history, utilisation (target <30%), credit age, accounts, enquiries, download, offers.

## Gaps vs reference
- **Different:** we cannot fetch bureau data without a bureau partnership; we estimate and collect a consented request instead.
- **Not built:** live CIBIL fetch and report page (needs a bureau/aggregator contract).
