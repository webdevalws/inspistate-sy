# Post Property

**Area:** Listings · **Route:** `/post-property` · **Status:** built

## What it does
Listing submission with photos and moderation. Requires login; Sellers get 3 free listings, Agents 3 free or unlimited with a plan, Users are offered a switch to Seller (see [account roles](../account-roles/desc.md)).

## Inputs
- Details, location, photos (≤8, ≤5 MB, JPEG/PNG/WebP)

## Outputs
- Pending listing + private preview link

## How it works
- Server validates fields and image magic bytes; photos stored in R2; status pending until admin approves.
- `listingAllowance` gates both the page (login / register / switch-role / limit-reached panels) and `/api/listings`; `posted_by` is Agent for agents, Owner otherwise.

## Files
- `src/components/islands/PostPropertyForm.tsx`
- `src/pages/api/listings.ts`
- `src/pages/post-property.astro`, `src/lib/accounts.ts`

## Reference behaviour (Square Yards)
_No direct reference page identified yet._

## Gaps vs reference
_To be filled after REA analysis._
