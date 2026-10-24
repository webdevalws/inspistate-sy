# Title Search

**Area:** Services · **Route:** `/services/title-search` · **Status:** built

## Reference behaviour (Square Yards)
Reference page: https://www.squareyards.com/title-search — script `business-service-forms-detail-common-*.min.js`.

**Paid order form (₹1,500):** Building Name*, Flat Number*, State*, City*, Village, Wing Number, CTS Number, Landmark, Loan Application No., Locality, Location, Pin Code, Report Duration, PAN; coupon code; **Place Order** → `/payment/order-id`. Report covers **title chain** and **mortgage records** across 13 years. Cost guidance: 0.05–0.15% of property value.

## Gaps vs reference
- Ours was a generic lead page. Rebuilt as an order form saved to the database with price, coupon and status; online payment needs a payment gateway (e.g. Razorpay) — orders are created as "awaiting payment".
- Orders are limited to 10 per IP per day, and each coupon works once per person (same phone or account). See `docs/functions/leads/desc.md`.
