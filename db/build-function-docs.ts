// One-time scaffold for docs/functions/<slug>/desc.md. Existing files are never overwritten —
// after scaffolding, each desc.md is maintained by hand as functions change.
// Run: node db/build-function-docs.ts
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

type Fn = {
  slug: string; name: string; route: string; area: string;
  does: string; inputs: string[]; outputs: string[]; logic: string[]; files: string[];
  reference?: string; // Square Yards page this corresponds to
};

const FNS: Fn[] = [
  // ---------- Tools ----------
  { slug: 'vastu', name: 'Vastu Calculator (floor-plan analyzer)', route: '/tools/vastu', area: 'Tools', reference: 'https://www.squareyards.com/vastu-calculator',
    does: 'Scores a home against traditional Vastu direction rules.', inputs: ['Direction of main entrance, kitchen, master bedroom, pooja room, living room, toilet'],
    outputs: ['Compliance % and per-room verdict (ideal / acceptable / consider X)'], logic: ['Each room has ideal and acceptable directions; ideal = 2 points, acceptable = 1, else 0.', 'Score = points / (rooms × 2).'],
    files: ['src/components/islands/MoreTools.tsx (Vastu)', 'src/pages/tools/[tool].astro'] },
  { slug: 'property-valuation', name: 'Property Valuation', route: '/tools/property-valuation', area: 'Tools', reference: 'https://www.squareyards.com/online-property-valuation',
    does: 'Estimates market value of a property from locality rates.', inputs: ['City, locality, built-up area, age, floor band, furnishing'], outputs: ['Adjusted ₹/sq.ft and a ±7% value range'],
    logic: ['Base = locality average sale rate (D1 localities table).', 'Multipliers: age (new +5%, −1%/yr to 10 yrs, then further), floor (low −3%, high +4%), furnishing (+2% / +5%).'],
    files: ['src/components/islands/MoreTools.tsx (Valuation)', 'src/pages/tools/[tool].astro'] },
  { slug: 'cost-of-living', name: 'Cost of Living Calculator', route: '/tools/cost-of-living', area: 'Tools', reference: 'https://www.squareyards.com/cost-of-living-calculator',
    does: 'Monthly household budget to live in a chosen locality.', inputs: ['City, locality, home size, adults, children, meals out, car'], outputs: ['Itemised monthly cost and total'],
    logic: ['Rent = locality rent/sq.ft × home size.', 'Other items are urban baselines scaled by the locality price level (rent ÷ 30, clamped 0.75–1.6).'],
    files: ['src/components/islands/LivingTools.tsx (CostOfLiving)'] },
  { slug: 'affordability', name: 'Affordability Calculator', route: '/tools/affordability', area: 'Tools', reference: 'https://www.squareyards.com/affordability-calculator',
    does: 'Home budget from income, existing EMIs and savings.', inputs: ['Net monthly income, existing EMIs, savings, rate, tenure'], outputs: ['Affordable EMI, eligible loan, home budget'],
    logic: ['Affordable EMI = 50% of income − existing EMIs.', 'Loan = affordable EMI ÷ EMI per ₹1 lakh × 1 lakh; budget = loan + savings.'], files: ['src/components/islands/Calculators.tsx (Affordability)'] },
  { slug: 'rent-agreement', name: 'Rent Agreement Draft', route: '/tools/rent-agreement', area: 'Tools', reference: 'https://www.squareyards.com/rent-agreement',
    does: 'Generates a standard 11-month leave & licence agreement draft.', inputs: ['Parties, addresses, rent, deposit, start, term, lock-in, notice, hike, furnishing'], outputs: ['Printable / copyable agreement text'],
    logic: ['Fills a fixed clause template; end date = start + term − 1 day.'], files: ['src/components/islands/MoreTools.tsx (RentAgreement)'] },
  { slug: 'rent-receipt', name: 'Rent Receipt Generator', route: '/tools/rent-receipt', area: 'Tools', reference: 'https://www.squareyards.com/rent-receipts',
    does: 'Printable monthly rent receipts for HRA claims.', inputs: ['Tenant, landlord, PAN, address, rent, month range, payment mode'], outputs: ['One receipt per month (max 24), print-ready'],
    logic: ['Iterates months between from/to; print CSS hides site chrome.'], files: ['src/components/islands/MoreTools.tsx (RentReceipt)'] },
  { slug: 'emi-calculator', name: 'EMI Calculator', route: '/tools/emi-calculator', area: 'Tools', does: 'Monthly EMI, total interest and principal split.', inputs: ['Loan amount, rate, tenure'], outputs: ['EMI, principal, interest, donut chart'],
    logic: ['EMI = P·r·(1+r)^n / ((1+r)^n − 1), r = monthly rate.'], files: ['src/components/islands/EmiCalculator.tsx'] },
  { slug: 'loan-eligibility', name: 'Home Loan Eligibility', route: '/tools/loan-eligibility', area: 'Tools', does: 'Maximum loan a bank may sanction.', inputs: ['Income, existing EMIs, age, retirement age, rate'], outputs: ['Tenure, affordable EMI, eligible loan, property value supported'],
    logic: ['FOIR 50/55/60% by income band; tenure = retirement age − age (max 30).', 'Property value from RBI LTV caps (90/80/75%).'], files: ['src/components/islands/MoreTools.tsx (LoanEligibility)'] },
  { slug: 'buy-vs-rent', name: 'Buy vs Rent', route: '/tools/buy-vs-rent', area: 'Tools', does: 'Compares net worth after N years of buying vs renting and investing.', inputs: ['Price, down payment, rate, rent, rent hike, appreciation, investment return, horizon'], outputs: ['Net worth for each path and the winner'],
    logic: ['Month-by-month simulation; renter invests down payment + 7% purchase costs and any monthly saving.'], files: ['src/components/islands/MoreTools.tsx (BuyVsRent)'] },
  { slug: 'stamp-duty', name: 'Stamp Duty Calculator', route: '/tools/stamp-duty', area: 'Tools', does: 'Indicative stamp duty and registration.', inputs: ['State, property value, woman buyer'], outputs: ['Duty rate, duty, registration, total'],
    logic: ['State rate from cities table; −1 pt for women (indicative); registration = min(1%, ₹30,000).'], files: ['src/components/islands/Calculators.tsx (StampDuty)'] },
  { slug: 'capital-gains', name: 'Capital Gains Calculator', route: '/tools/capital-gains', area: 'Tools', does: 'Tax on selling property.', inputs: ['Buy/sell dates, cost, improvements, sale price, expenses, slab'], outputs: ['Holding period, gain, estimated tax'],
    logic: ['> 24 months = long-term: lower of 12.5% without indexation or (bought before 23-Jul-2024) 20% with CII indexation; +4% cess.', 'Short-term at slab rate.'], files: ['src/components/islands/MoreTools.tsx (CapitalGains)'] },
  { slug: 'area-converter', name: 'Area Converter', route: '/tools/area-converter', area: 'Tools', does: 'Converts between land units.', inputs: ['Value, unit'], outputs: ['Equivalent in all units'], logic: ['Conversion via square feet factors.'], files: ['src/components/islands/Calculators.tsx (AreaConverter)'] },
  { slug: 'interior-cost', name: 'Interior Cost Estimator', route: '/tools/interior-cost', area: 'Tools', does: 'Budget for furnishing a home.', inputs: ['BHK, area, package, scope'], outputs: ['Itemised estimate and total'], logic: ['Per-item baselines × package multiplier.'], files: ['src/components/islands/MoreTools.tsx (InteriorCost)'] },
  { slug: 'property-tax', name: 'Property Tax Estimator', route: '/tools/property-tax', area: 'Tools', does: 'Indicative annual municipal tax.', inputs: ['City, area, age, use'], outputs: ['Annual and monthly tax'], logic: ['City ₹/sq.ft rate × area × use (1/1.5/2.5) × age factor.'], files: ['src/components/islands/LivingTools.tsx (PropertyTax)'] },
  { slug: 'credit-score', name: 'Free Credit Score', route: '/tools/credit-score', area: 'Tools', does: 'Links to the official free CIBIL report and explains score bands.', inputs: ['Optional known score'], outputs: ['Band and loan guidance'], logic: ['Bands: ≥750 excellent, ≥700 good, ≥650 fair.'], files: ['src/components/islands/LivingTools.tsx (CreditScore)'] },
  { slug: 'price-heatmap', name: 'Price Heatmap', route: '/heatmap/{city}', area: 'Insights', reference: 'https://www.squareyards.com/heatmap/mumbai',
    does: 'Map of localities coloured by sale rate, growth or rent.', inputs: ['City, metric'], outputs: ['Leaflet map with circles; most expensive / affordable lists'],
    logic: ['Circle colour = metric scaled green→amber→red; size = live listings.'], files: ['src/pages/heatmap/[city].astro', 'src/components/islands/HeatMap.tsx', 'src/lib/community.ts (localityMarket)'] },
  // ---------- Core features ----------
  { slug: 'property-search', name: 'Property Search', route: '/{buy|rent|commercial}/{city}/{facets}', area: 'Search', does: 'Filtered, sorted, paginated listings with SEO facet URLs.', inputs: ['Facets in path (locality, n-bhk, type) + query filters'], outputs: ['Listing cards, featured projects, market blocks, FAQ'],
    logic: ['SQL WHERE built from filters (amenities via json_each); 12 per page.'], files: ['src/pages/[mode]/[city]/[...facets].astro', 'src/lib/search.ts', 'src/lib/repo.ts (searchListings, marketStats)'] },
  { slug: 'ask-ai', name: 'Ask AI search & assistant', route: '/api/ask', area: 'Search', does: 'Turns a sentence into a search URL.', inputs: ['Free text, current city'], outputs: ['URL + human-readable summary'],
    logic: ['Rule-based parser: city/alias, locality, mode, BHK, type, budget phrases, possession, furnishing, owner, sort.'], files: ['src/lib/nlsearch.ts', 'src/pages/api/ask.ts', 'src/components/islands/ChatWidget.tsx'] },
  { slug: 'project-page', name: 'Project Detail', route: '/projects/{city}/{slug}', area: 'Projects', does: 'Full project dossier.', inputs: ['Project slug'], outputs: ['Details, floor plans, transactions, trends, amenities, location, RERA, reviews, FAQ'],
    logic: ['Loads project + units, transactions, reviews, similar projects in parallel.'], files: ['src/pages/projects/[city]/[slug].astro'] },
  { slug: 'post-property', name: 'Post Property', route: '/post-property', area: 'Listings', does: 'Owner listing submission with photos and moderation.', inputs: ['Details, location, photos (≤8, ≤5 MB, JPEG/PNG/WebP)'], outputs: ['Pending listing + private preview link'],
    logic: ['Server validates fields and image magic bytes; photos stored in R2; status pending until admin approves.'], files: ['src/components/islands/PostPropertyForm.tsx', 'src/pages/api/listings.ts'] },
  { slug: 'leads', name: 'Enquiries / leads', route: '/api/enquiry', area: 'Leads', does: 'Stores callback, view-number, brochure, service and chat leads.', inputs: ['Name, mobile, email, subject, kind, listing/project'], outputs: ['Lead id; for view-number, contact details'],
    logic: ['Indian mobile validation; linked to user when logged in.'], files: ['src/pages/api/enquiry.ts', 'src/components/islands/LeadDialog.tsx', 'src/components/islands/EnquiryForm.tsx'] },
  { slug: 'login', name: 'Phone OTP login', route: '/login', area: 'Accounts', does: 'Passwordless login.', inputs: ['Mobile number, 6-digit code'], outputs: ['HttpOnly session cookie'],
    logic: ['Codes and session tokens stored as SHA-256; 30 s resend, 5 attempts, 10 min expiry; DEV_SHOW_OTP shows code locally.'], files: ['src/lib/auth.ts', 'src/pages/api/auth/*', 'src/components/islands/LoginForm.tsx'] },
  { slug: 'compare', name: 'Compare Projects', route: '/compare', area: 'Projects', does: 'Side-by-side comparison of up to 3 projects.', inputs: ['Project ids'], outputs: ['Table with best values highlighted'], logic: ['Lowest price/rate/density and highest area/amenities/rating win.'], files: ['src/pages/compare.astro'] },
  { slug: 'forum', name: 'Real Estate Forum', route: '/forum', area: 'Community', does: 'Q&A for logged-in users.', inputs: ['Question title/body/city; answers'], outputs: ['Threads'], logic: ['Same-origin form posts; login required.'], files: ['src/pages/forum/*', 'src/pages/api/forum.ts', 'src/lib/forum.ts'] },
  { slug: 'agents', name: 'Agents Directory', route: '/agents', area: 'Community', does: 'Agents ranked by live listings.', inputs: ['City'], outputs: ['Agent cards with contact'], logic: ['Grouped from agent-posted listings.'], files: ['src/pages/agents.astro', 'src/lib/community.ts (agentsDirectory)'] },
];

const root = new URL('../docs/functions/', import.meta.url);
mkdirSync(root, { recursive: true });
let created = 0;
for (const f of FNS) {
  const dir = new URL(`${f.slug}/`, root);
  mkdirSync(dir, { recursive: true });
  const file = new URL('desc.md', dir);
  if (existsSync(file)) continue;
  writeFileSync(file, `# ${f.name}

**Area:** ${f.area} · **Route:** \`${f.route}\` · **Status:** built

## What it does
${f.does}

## Inputs
${f.inputs.map((x) => `- ${x}`).join('\n')}

## Outputs
${f.outputs.map((x) => `- ${x}`).join('\n')}

## How it works
${f.logic.map((x) => `- ${x}`).join('\n')}

## Files
${f.files.map((x) => `- \`${x}\``).join('\n')}

## Reference behaviour (Square Yards)
${f.reference ? `Reference page: ${f.reference}\n\n_REA analysis pending — observed flow, inputs and outputs will be recorded here._` : '_No direct reference page identified yet._'}

## Gaps vs reference
_To be filled after REA analysis._
`);
  created++;
}
writeFileSync(new URL('README.md', root), `# Function catalogue

Each function has a \`desc.md\` describing what it does, its inputs/outputs, how it works,
the files that implement it, and what REA observed on the reference site. Update the
\`desc.md\` in the same change as the code.

| Function | Area | Route |
|---|---|---|
${FNS.map((f) => `| [${f.name}](${f.slug}/desc.md) | ${f.area} | \`${f.route}\` |`).join('\n')}
`);
console.log(`desc.md created: ${created}, total functions: ${FNS.length}`);
