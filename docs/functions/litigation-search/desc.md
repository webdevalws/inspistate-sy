# Litigation Search

**Area:** Services · **Route:** `/services/litigation-search` · **Status:** built

## What it does
Paid report of court and tribunal cases involving a seller, company or property.

## Inputs
- Party name*, PAN*
- Flat*, building*, wing, state*, city, locality, village, landmark, PIN
- Name*, mobile*, email, consent*
- Coupon

## Outputs
- Order saved as `awaiting_payment` with final amount; confirmation with order number

## How it works
- Fixed price ₹1,799 (`LITIGATION_SEARCH_PRICE`); coupons via `/api/coupon`, discount capped at the price.
- Live per-field validation (PAN `AAAAA9999A`, 6-digit PIN); Place Order disabled until valid.
- `POST /api/orders` kind `litigation-search` re-validates server-side, uppercases PAN, same-origin only.

## Files
- `src/components/islands/LegalOrders.tsx (LitigationOrder)`
- `src/pages/services/litigation-search.astro`
- `src/pages/api/orders.ts`
- `src/data/services.ts`
- `migrations/0007_more_order_kinds.sql`

## Reference behaviour (Square Yards)
Reference page: https://www.squareyards.com/litigation-search — `business-service-forms-detail-common-*.min.js` (same engine as title search).

- Single product ₹1,799. Form: Party Name*, PAN*, Flat*, Building*, State*, Village, Wing, Landmark, Locality, Location, PIN; coupon box; Place Order enabled only when the form is valid.
- Place Order requires OTP login and a name/email profile, then `GET /payment/order-id` → Razorpay checkout → POST back to the page. Coupons: `POST /verify-coupon-code`.
- Their coupon code sets the discount to at least the total (makes any valid coupon free) — not copied.
- Content: key-takeaways accordion, case types, process, reviews, FAQ.

## Gaps vs reference
- **Matched:** fields, price, coupon, live validation with disabled Place Order, key takeaways, process, FAQ.
- **Not built:** online payment gateway (orders wait for a payment link) and OTP login before ordering; reviews.
