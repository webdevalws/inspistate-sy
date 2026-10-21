# Enquiries / leads

**Area:** Leads · **Route:** `/api/enquiry` · **Status:** built

## What it does
Stores callback, view-number, brochure, service and chat leads.

## Inputs
- Name, mobile, email, subject, kind, listing/project

## Outputs
- Lead id; for view-number, contact details

## How it works
- Same-origin only: requests whose `Origin` header differs from the site are rejected with 403.
- Home-service estimators post `kind: service` leads whose subject carries the estimate (see `src/components/islands/HomeServices.tsx`).
- Indian mobile validation; linked to user when logged in.

## Files
- `src/pages/api/enquiry.ts`
- `src/components/islands/LeadDialog.tsx`
- `src/components/islands/EnquiryForm.tsx`

## Reference behaviour (Square Yards)
_No direct reference page identified yet._

## Gaps vs reference
_To be filled after REA analysis._
