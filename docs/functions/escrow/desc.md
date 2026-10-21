# Escrow Services

**Area:** Services · **Route:** `/services/escrow` · **Status:** built

## What it does
Request a bank escrow for token money, sale consideration or deposits; released only when all parties approve.

## Inputs
- Your role (buyer / seller / agent)
- Amount to hold (min ₹10,000), property, purpose, release condition
- Other party role, name, mobile
- Your name, mobile, email, consent

## Outputs
- Escrow request saved (kind `escrow`, status `submitted`) and confirmation

## How it works
- `POST /api/orders` validates amount, role, property and the other party’s mobile. The escrow desk follows up for KYC, e-signing and funding.

## Files
- `src/components/islands/LegalOrders.tsx (EscrowRequest)`
- `src/pages/services/escrow.astro`
- `src/pages/api/orders.ts`

## Reference behaviour (Square Yards)
Reference page: https://www.squareyards.com/escrow (partner-run digital escrow).

- Landing page with one CTA: phone + country code → OTP → redirect into the escrow app (after login).
- Content: bank-held funds, approval by all parties, SEBI-registered trustee, agreement in minutes; risks (failed transactions, fraud, deal fallout); e-stamp, e-KYC, e-sign; 3-stage, 10-step flow (create → approve & pay in → settle); FAQ.

## Gaps vs reference
- **Matched:** pillars, risks, 3-stage flow, FAQ; a way to start an escrow from the page.
- **Different:** we collect the deal details up front as a request instead of logging in to a self-serve escrow app.
- **Not built:** self-serve escrow dashboard (KYC, e-sign, deposits, settlement approvals) — needs a banking partner.
