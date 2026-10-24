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
- **Photo privacy (item 57):** before a photo is stored, `stripMetadata()` (`src/lib/strip-metadata.ts`, no
  library, no re-encoding) removes EXIF — including **GPS location** — XMP, IPTC, comments and PNG text/time
  chunks. JPEG: APP1/APP13/other APPn and COM segments are dropped (JFIF, ICC profile and Adobe kept), and the
  EXIF **Orientation** is written back as a minimal EXIF block so phone photos stay upright. PNG: `eXIf`, `tEXt`,
  `zTXt`, `iTXt`, `tIME` dropped. WebP: `EXIF` and `XMP ` chunks dropped and the VP8X flags cleared. Image data
  is copied byte for byte.
- **Photo cleanup (item 58):** when the **owner deletes** a listing, its photos are deleted from R2 and from
  `listing_photos` (`deleteListingPhotos`). When an **admin rejects** a listing (or closes it as deleted from
  /admin) the photos stay in R2 so a later approval still has them, but `/media/…` returns **404** for any
  rejected or deleted listing (`photosVisible`). Sold / rented listings keep their photos. Photos are cached
  for a day (`max-age=86400`, was a year) so hidden photos drop out of caches.
- `listingAllowance` gates both the page (login / register / switch-role / limit-reached panels) and `/api/listings`; `posted_by` is Agent for agents, Owner otherwise.
- **"Verified" means reviewed and approved by our team before going live.** Approving a listing in
  `/admin` sets `verified = 1` (`setListingStatus` in `src/lib/repo.ts`); no separate document check exists
  yet. The search FAQ, the company FAQ and the About page say exactly this. (A separate document
  verification step is planned later.)
- **Same-site check (item 63):** `/api/listings` now rejects cross-site posts with 403 (`sameSite()` from
  `src/lib/limits.ts`, like the other public APIs). Before this it relied on the login cookie only. (`/api/forum`
  and `/api/tools/vastu-detect` already checked Origin; account, auth and admin APIs are checked in middleware.)
- Field rules live in `parseListingFields` (`src/lib/listing-form.ts`), shared by posting and editing.

## PG / co-living columns
- **Migration 0012** adds `listings.pg_sharing` (`single` | `double` | `triple`), `listings.pg_for`
  (`men` | `women` | `any`) and `listings.pg_food` (0 | 1). They are NULL for every listing that is not a
  PG. Nullable columns, so existing rows are unchanged.

- **Posting a PG:** with "Rent out" + Residential the type list adds "PG / Co-living". Its details step asks
  for sharing, who it is for and food (instead of BHK), "Room area" and "Monthly rent per bed".
  `parseListingFields` rejects a PG for sale and requires valid sharing and "for" values; the edit form
  pre-fills them.

- **Previews are not indexed (item 84):** a pending listing's preview (`/property/{id}?token=…`) has `noindex`;
  closed (sold / rented / deleted) listings already return 404.

## Owners manage their listings
- **Lifecycle column** (migration 0011): `listings.closed` = `sold` | `rented` | `deleted` (NULL while open)
  and `closed_at`, kept separate from the moderation `status`. A listing is public only when
  `status = 'active' AND closed IS NULL AND owner_blocked = 0` (item 97: the owner's account isn't blocked) —
  every public query (search, map, detail, similar, project and city pages, compare, counts, stats, sitemap,
  view-number) uses the shared `live()` condition in `src/lib/repo.ts`. Deleting is soft, so leads and photos keep their listing.
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
