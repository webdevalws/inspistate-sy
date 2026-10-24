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
- **"Verified" means reviewed and approved by our team before going live.** Approving a listing in
  `/admin` sets `verified = 1` (`setListingStatus` in `src/lib/repo.ts`); no separate document check exists
  yet. The search FAQ, the company FAQ and the About page say exactly this. (A separate document
  verification step is planned later.)
- Field rules live in `parseListingFields` (`src/lib/listing-form.ts`), shared by posting and editing.

## PG / co-living columns
- **Migration 0012** adds `listings.pg_sharing` (`single` | `double` | `triple`), `listings.pg_for`
  (`men` | `women` | `any`) and `listings.pg_food` (0 | 1). They are NULL for every listing that is not a
  PG. Nullable columns, so existing rows are unchanged.

## Owners manage their listings
- **Lifecycle column** (migration 0011): `listings.closed` = `sold` | `rented` | `deleted` (NULL while open)
  and `closed_at`, kept separate from the moderation `status`. A listing is public only when
  `status = 'active' AND closed IS NULL` — every public query (search, detail, similar, counts, stats,
  sitemap, view-number) checks both. Deleting is soft, so leads and photos keep their listing.
- **Account page → My Listings:** open listings show **Edit · Mark sold** (sale) or **Mark rented**
  (rental) **· Delete** (asks for confirmation). Sold / rented listings stay in the list with a Sold /
  Rented chip and no link; deleted ones disappear from the list.
- **`POST /api/account/listings/[id]`** (`action` = `edit` | `sold` | `rented` | `delete`): not logged in
  → 401; not the owner → **403**; unknown or deleted → 404; already sold/rented → 409; `sold` only for
  sale listings and `rented` only for rentals → otherwise 422. Close actions redirect to
  `/account?listing=…#listings` with a confirmation note. Admins can do the same through
  `POST /api/admin/listings/[id]` (`action` = `sold` | `rented` | `delete`, as well as `approve` / `reject`).
- **Edit:** `/post-property?edit={id}` reuses the post form prefilled, without the Photos step (photos
  can't be changed yet). Saving any edit — even to a live listing — sets `status = 'pending'` and
  `verified = 0`, so it goes back to admin review and leaves search until approved.
- **Limit:** sold, rented and deleted listings no longer count towards the free-listing limit
  (`listingAllowance` counts `active` + `pending` with `closed IS NULL`).

## Files
- `src/components/islands/PostPropertyForm.tsx`
- `src/pages/api/listings.ts`, `src/pages/api/account/listings/[id].ts`, `src/pages/api/admin/listings/[id].ts`
- `src/pages/post-property.astro`, `src/pages/account.astro`, `src/lib/accounts.ts`
- `src/lib/listing-form.ts`, `src/lib/repo.ts` (`getOwnedListing`, `updateListing`, `closeListing`)
- `migrations/0011_listing_closed.sql`

## Reference behaviour (Square Yards)
_No direct reference page identified yet._

## Gaps vs reference
_To be filled after REA analysis._
