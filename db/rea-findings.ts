// Writes REA findings into docs/functions/<slug>/desc.md ("Reference behaviour" + "Gaps").
// Source: REA CLI inspect-web-page + export-web-scripts on user-opened squareyards.com tabs (2026-10-18).
// Run: node db/rea-findings.ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const F: Record<string, { name?: string; route?: string; reference: string; gaps: string }> = {
  affordability: {
    reference: `Reference page: https://www.squareyards.com/affordability-calculator — script \`affordability-calculator-*.min.js\` (static analysis via REA export-web-scripts).

**Inputs:** city, micromarket, BHK, area min/max, net monthly income, existing obligations (EMIs), down payment, interest rate, tenure (only 10/15/20/25 years).

**Algorithm (recovered):**
- Obligation ratio = obligations ÷ income → FOIR tier: ≤10% → 50%, ≤20% → 45%, ≤30% → 40%, ≤40% → 35%, else 30%.
- Max comfortable EMI = max(income × FOIR − obligations, 0).
- Max eligible loan = present value of that EMI at the applied rate over the tenure.
- Max property budget = loan + down payment. Monthly buffer = income − obligations − EMI.
- Buffer message: ≥35% "healthy", ≥20% "workable but watchful", else "tight".
- If comfortable EMI ≤ 0 → advisory "reduce obligations / increase down payment", recommendations paused (shows 85% of budget).
- Sensitivity chips: rate delta and alternative tenure re-run the calculation.
- Project recommendations (\`GET /getCalculatorProjects\` with city, micromarket, bhk, area) grouped in bands: **Most comfortable** 85–100% of budget, **Stretch** 100–115%, **Only if obligations reduce** 115–130%. A project qualifies when its price range overlaps the band; BHK match exact or ±1 ("adjacent"); area overlap or nearest; preferred micromarket first.`,
    gaps: '- Ours used a flat 50% FOIR and no project recommendations, sensitivity chips, buffer advice or tenure presets → **rebuilt to match**.',
  },
  'cost-of-living': {
    reference: `Reference page: https://www.squareyards.com/cost-of-living-calculator — script \`cost-of-living-*.min.js\`.

**Flow:** 3-step wizard — (1) city → (2) micromarket, configuration (BHK + sq.ft range), monthly income (₹10,000–₹1 crore), expense level per category → (3) results.

**Data endpoints:** \`/get-micromarkets\` (cityId), \`/get-avg-resale-price\` (POST: micromarket, area range, units), \`/get-rental-listings\` (live rentals for the config), \`/download-cost-report\` (POST → PDF).

**Algorithm (recovered):**
- Family type from BHK: 3–5 → large family, 2–3 → small family, 1–2 → single/couple.
- Non-housing cost = sum over expense categories of the amount for the chosen level (city × configuration table).
- **Rent scenario:** rent (micromarket average) + non-housing; savings and savings % of income.
- **Buy scenario:** property value = average resale price; down payment 20%; EMI at 8.5% for 240 months; total = EMI + non-housing; savings %; price-to-income ratio = value ÷ (12 × income); EMI-to-income %.
- Micromarket comparison table and cheaper alternatives; live rental listings; Download Report (PDF) and Share.`,
    gaps: '- Ours had no rent-vs-buy comparison, configuration step, expense levels, micromarket comparison, listings or report → **rebuilt as the same 3-step wizard**.',
  },
  'property-valuation': {
    reference: `Reference page: https://www.squareyards.com/online-property-valuation — mostly long-form content (methods: sales comparison, income, cost, development) plus an **e-Valuation request form** (lead via \`/getcommonleadform\`) and a **View Sample Report** button. No instant estimate on the page.`,
    gaps: '- Ours already gives an instant estimate. Missing: request a detailed valuation report (lead) and a sample report → **added**.',
  },
  'rent-agreement': {
    reference: `Reference page: https://www.squareyards.com/rent-agreement.

**Flow:** fill details online → pay → digitally sign → e-stamped agreement emailed. Phone login required.
**State table (time span / stamp duty):** Delhi ≤5 yrs; Noida ≤11 months; Karnataka 1% of total rent + deposit per year or ₹500, whichever is less; Tamil Nadu 1% of rent with deposit; Uttar Pradesh <1 yr: 4% of yearly rent with deposit; Maharashtra ≤5 yrs: 0.25% of total rent; Gurgaon 5–10 yrs: 1.5–3% of average yearly rent.
Content: types (rent / lease / leave & licence), required details, documents, format, stamp duty.`,
    gaps: '- Ours generated a draft only. Added: state selection with indicative stamp duty, "order e-stamped agreement" request (stored in DB). Online payment + e-sign need a payment gateway and an e-sign provider — not yet integrated.',
  },
  'rent-receipt': {
    reference: `Reference page: https://www.squareyards.com/rent-receipts.

**Fields:** rent amount, rented property address, landlord name, landlord PAN (optional), start date, end date, tenant name, tenant mobile, email to receive receipt PDF, T&C consent → **Generate Free Rent Receipt** (receipt PDF by email).`,
    gaps: '- Ours lacked tenant mobile/email/consent and saved nothing. Added those fields and a saved request; receipts are downloaded/printed as PDF in the browser (email delivery needs an email provider).',
  },
  vastu: {
    reference: `Reference pages: https://www.squareyards.com/vastu-calculator (landing) and \`/vastu-calculator-process\` — script \`vastuFloorplan-*.min.js\`.

- **Landing:** JPEG/PNG up to 5 MB (click or drag-drop), stored as a data URL in localStorage key \`floorplan\`, then redirects to the process page.
- **Process — 5 steps:** Upload Floor Plan (or pick a project unit from their database via \`/autosuggest\` + \`/getProjectUnitData\`) → **Set Orientation** (compass dial rotated in 22.5° steps) → **Confirm Center Point** (draggable purple dot) → **Verify Room Labels** (\`POST /generate-node-points {imageBuffer}\` auto-detects room points; user can delete/add points) → **Get Report**.
- **Maths:** \`DIRECTION_CONFIG {SECTOR_SIZE: 45, HALF_SECTOR: 22.5, DISTANCE_THRESHOLD: .01}\`; angle = \`(atan2(dx, -dy)·180/π + 360) % 360\` from the centre, minus the north rotation, bucketed into 8 sectors of 45°. Points within the threshold count as centre. Option to flip the plan.
- **Ratings:** room type × direction table rated **Best / Good / Poor / Danger** (priority 3–0), ~49 room types.
- **Monetisation:** free preview, then "Unlock Full Report ₹399" (name, email, phone → \`/vastu-order-id\`, \`/vastu-payment-post\`, \`/vastu-report-status\`; drafts via \`/vastu-save-draft\`).`,
    gaps: `- **Matched:** upload limits, 22.5° orientation dial, draggable centre, auto-detect + manual verify, same sector maths, 4-level ratings, score + per-room report + remedies, PDF via print.
- **Different by design:** rating table and remedies are our own (20 room types, not 49); full report is free with an expert-callback lead instead of a ₹399 paywall; detection uses Claude vision (\`/api/tools/vastu-detect\`), capped at 10 per client per day.
- **Not yet built:** choosing a floor plan from our project database, plan flip, saved drafts, paid report option.`,
  },
  'price-heatmap': {
    reference: 'Reference page: https://www.squareyards.com/heatmap/mumbai — a separate **Next.js** app (`/heatmap/_next/`) rendering vector tiles with **MapLibre GL**.',
    gaps: '- Ours uses Leaflet + OSM raster tiles with locality circles. Functionally equivalent for our data size.',
  },
  'title-search': {
    name: 'Title Search', route: '/services/title-search',
    reference: `Reference page: https://www.squareyards.com/title-search — script \`business-service-forms-detail-common-*.min.js\`.

**Paid order form (₹1,500):** Building Name*, Flat Number*, State*, City*, Village, Wing Number, CTS Number, Landmark, Loan Application No., Locality, Location, Pin Code, Report Duration, PAN; coupon code; **Place Order** → \`/payment/order-id\`. Report covers **title chain** and **mortgage records** across 13 years. Cost guidance: 0.05–0.15% of property value.`,
    gaps: '- Ours was a generic lead page. Rebuilt as an order form saved to the database with price, coupon and status; online payment needs a payment gateway (e.g. Razorpay) — orders are created as "awaiting payment".',
  },
};

for (const [slug, f] of Object.entries(F)) {
  const dir = new URL(`../docs/functions/${slug}/`, import.meta.url);
  mkdirSync(dir, { recursive: true });
  const file = new URL('desc.md', dir);
  let md = existsSync(file) ? readFileSync(file, 'utf8') : `# ${f.name}\n\n**Area:** Services · **Route:** \`${f.route}\` · **Status:** built\n\n## Reference behaviour (Square Yards)\n\n## Gaps vs reference\n`;
  md = md.replace(/## Reference behaviour \(Square Yards\)[\s\S]*?(?=## Gaps vs reference)/, `## Reference behaviour (Square Yards)\n${f.reference}\n\n`);
  md = md.replace(/## Gaps vs reference[\s\S]*$/, `## Gaps vs reference\n${f.gaps}\n`);
  writeFileSync(file, md);
}
console.log('updated', Object.keys(F).length, 'desc.md files');
