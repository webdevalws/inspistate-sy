# Rent Receipt Generator

**Area:** Tools · **Route:** `/tools/rent-receipt` · **Status:** built

## What it does
Printable monthly rent receipts for HRA claims.

## Inputs
- Tenant, landlord, PAN, address, rent, month range, payment mode

## Outputs
- One receipt per month (max 24), print-ready

## How it works
- Iterates months between from/to; print CSS hides site chrome.

## Files
- `src/components/islands/MoreTools.tsx (RentReceipt)`

## Reference behaviour (Square Yards)
Reference page: https://www.squareyards.com/rent-receipts.

**Fields:** rent amount, rented property address, landlord name, landlord PAN (optional), start date, end date, tenant name, tenant mobile, email to receive receipt PDF, T&C consent → **Generate Free Rent Receipt** (receipt PDF by email).

## Gaps vs reference
- Ours lacked tenant mobile/email/consent and saved nothing. Added those fields and a saved request; receipts are downloaded/printed as PDF in the browser (email delivery needs an email provider).
