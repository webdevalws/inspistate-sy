// Home-service content and estimator constants. Prices are our own indicative ranges unless noted.
// See docs/functions/<service>/desc.md for each service.

export interface ServiceContent {
  steps: string[];
  features: [string, string][];
  faq: { q: string; a: string }[];
  /** Shown when the work is done by a partner. */
  partnerNote?: boolean;
}

export const PARTNER_DISCLAIMER = 'InspiState connects you with verified partners who carry out the work. Prices and timelines are confirmed by the partner after a survey.';

// ---------- Packers & movers ----------
export const MOVE_BANDS = [50, 500, 1000, 1500, 2500] as const; // km, upper bound of each band
/** Indicative charges (₹ min–max) by move size and distance band. */
export const MOVE_RATES: Record<string, [number, number][]> = {
  '1 BHK': [[7000, 10000], [12000, 18000], [18000, 26500], [22000, 32500], [28000, 38500]],
  '2 BHK': [[9000, 12000], [15000, 24500], [22000, 31500], [28000, 39000], [38000, 48000]],
  '3 BHK': [[12000, 18000], [16000, 36000], [24000, 47500], [35000, 55000], [45000, 72500]],
  '4 BHK': [[15000, 25000], [25000, 45500], [35000, 58000], [45000, 68000], [55000, 85500]],
  Car: [[1000, 2500], [7500, 15000], [12500, 18000], [16500, 22000], [23000, 27500]],
  Bike: [[800, 2500], [2500, 5500], [3500, 6500], [4500, 7200], [5800, 7500]],
};
export function moveEstimate(size: string, km: number, car: boolean, bike: boolean) {
  const band = MOVE_BANDS.findIndex((b) => km <= b);
  const i = band === -1 ? MOVE_BANDS.length - 1 : band;
  const parts = [MOVE_RATES[size][i], car ? MOVE_RATES.Car[i] : null, bike ? MOVE_RATES.Bike[i] : null].filter(Boolean) as [number, number][];
  return { band: i, outOfRange: band === -1, min: parts.reduce((s, p) => s + p[0], 0), max: parts.reduce((s, p) => s + p[1], 0) };
}

// ---------- Painting ----------
/** ₹ per sq ft of paintable area, labour + material. */
export const PAINT_FINISHES = {
  fresh: { label: 'Economy (distemper)', interior: 14, exterior: 20 },
  standard: { label: 'Standard emulsion', interior: 20, exterior: 28 },
  premium: { label: 'Premium emulsion', interior: 28, exterior: 38 },
  luxury: { label: 'Luxury / washable sheen', interior: 40, exterior: 50 },
} as const;
export const PAINT_CARPET: Record<string, number> = { '1 BHK': 550, '2 BHK': 900, '3 BHK': 1300, '4 BHK': 1900 };
/** Walls + ceiling of a typical flat ≈ 3.5 × carpet area; exterior walls ≈ 1.2 × carpet area. Repainting needs fewer coats. */
export function paintEstimate(carpet: number, finish: keyof typeof PAINT_FINISHES, scope: 'interior' | 'exterior' | 'both', repaint: boolean, ceiling: boolean) {
  const f = PAINT_FINISHES[finish];
  const interiorArea = carpet * (ceiling ? 3.5 : 2.5);
  const exteriorArea = carpet * 1.2;
  const k = repaint ? 0.85 : 1;
  const interior = scope !== 'exterior' ? interiorArea * f.interior * k : 0;
  const exterior = scope !== 'interior' ? exteriorArea * f.exterior * k : 0;
  const total = interior + exterior;
  const area = (scope !== 'exterior' ? interiorArea : 0) + (scope !== 'interior' ? exteriorArea : 0);
  return { area: Math.round(area), min: Math.round(total * 0.9 / 100) * 100, max: Math.round(total * 1.15 / 100) * 100, days: Math.max(2, Math.ceil(area / 900)) };
}
export const PAINT_TIPS: [string, string][] = [
  ['Living room', 'Washable emulsion in a matt or eggshell finish hides marks and handles cleaning.'],
  ['Kitchen', 'Semi-gloss or enamel resists grease and steam and wipes clean.'],
  ['Bathroom', 'Anti-fungal, moisture-resistant paint in a gloss or semi-gloss finish.'],
  ['Bedroom', 'Low-sheen, low-odour paint for a calm, glare-free room.'],
  ['Kids’ room', 'Low-VOC, highly washable paint — crayons and hands will happen.'],
];

// ---------- Solar rooftop ----------
export const SOLAR = {
  unitsPerKwDay: 4, // average generation in India, kWh per kW per day
  sqftPerKw: 100, // shadow-free roof area needed
  costPerKw: 60000, // installed on-grid residential system, before subsidy
  maxKw: 10,
  /** Central residential subsidy (PM Surya Ghar): ₹30,000/kW for the first 2 kW, ₹18,000 for the 3rd kW, max ₹78,000. */
  subsidy: (kw: number) => Math.min(78000, Math.min(kw, 2) * 30000 + Math.max(0, Math.min(kw, 3) - 2) * 18000),
  panelLifeYears: 25,
};
export function solarEstimate(monthlyBill: number, tariff: number, roofSqft: number, residential: boolean) {
  const units = monthlyBill / tariff;
  const byNeed = units / 30 / SOLAR.unitsPerKwDay;
  const byRoof = roofSqft / SOLAR.sqftPerKw;
  const kw = Math.max(1, Math.min(SOLAR.maxKw, Math.floor(Math.min(byNeed, byRoof) * 2) / 2));
  const cost = kw * SOLAR.costPerKw;
  const subsidy = residential ? SOLAR.subsidy(kw) : 0;
  const net = cost - subsidy;
  const monthlyUnits = kw * SOLAR.unitsPerKwDay * 30;
  const monthlySaving = Math.min(monthlyBill, monthlyUnits * tariff);
  return { kw, limitedByRoof: byRoof < byNeed, cost, subsidy, net, monthlyUnits: Math.round(monthlyUnits), monthlySaving: Math.round(monthlySaving), payback: monthlySaving ? net / (monthlySaving * 12) : null, lifetime: Math.round(monthlySaving * 12 * SOLAR.panelLifeYears - net) };
}

// ---------- Furniture & appliance rental ----------
export interface RentalItem { name: string; from: number; icon: string }
export const RENTAL_TENURES = [{ months: 3, k: 1.3 }, { months: 6, k: 1.15 }, { months: 12, k: 1 }, { months: 24, k: 0.9 }];
export const FURNITURE: Record<string, RentalItem[]> = {
  Bedroom: [{ name: 'Queen bed with mattress', from: 649, icon: '🛏' }, { name: 'Single bed with mattress', from: 449, icon: '🛏' }, { name: 'Two-door wardrobe', from: 549, icon: '🚪' }, { name: 'Bedside table', from: 129, icon: '🗄' }, { name: 'Dressing table', from: 299, icon: '🪞' }],
  'Living room': [{ name: '3-seater sofa', from: 699, icon: '🛋' }, { name: 'L-shaped sofa', from: 1199, icon: '🛋' }, { name: 'Coffee table', from: 199, icon: '🪵' }, { name: 'TV unit', from: 299, icon: '📺' }, { name: 'Recliner', from: 599, icon: '💺' }],
  Dining: [{ name: '4-seater dining set', from: 599, icon: '🍽' }, { name: '6-seater dining set', from: 899, icon: '🍽' }, { name: 'Crockery unit', from: 349, icon: '🗄' }],
  Study: [{ name: 'Study table', from: 249, icon: '📚' }, { name: 'Ergonomic chair', from: 299, icon: '💺' }, { name: 'Bookshelf', from: 199, icon: '📚' }],
};
export const APPLIANCES: Record<string, RentalItem[]> = {
  Refrigerators: [{ name: 'Single-door fridge', from: 699, icon: '🧊' }, { name: 'Double-door fridge', from: 999, icon: '🧊' }],
  'Washing machines': [{ name: 'Semi-automatic 7 kg', from: 549, icon: '🫧' }, { name: 'Fully automatic 7 kg', from: 799, icon: '🫧' }],
  'Air conditioners': [{ name: '1 ton split AC', from: 1299, icon: '❄' }, { name: '1.5 ton split AC', from: 1599, icon: '❄' }, { name: 'Window AC', from: 999, icon: '❄' }],
  'TV & more': [{ name: '43" smart TV', from: 799, icon: '📺' }, { name: 'Microwave', from: 299, icon: '🍲' }, { name: 'RO water purifier', from: 399, icon: '💧' }, { name: 'Air purifier', from: 449, icon: '🌬' }, { name: 'Air cooler', from: 399, icon: '🌀' }],
};

// ---------- Furniture & appliances on rent (packages) ----------
// DEMO prices: illustrative 12-month rents, not partner quotes.
export const RENT_PACKAGES = [
  { name: '1 BHK', items: ['Queen bed with mattress', 'Two-door wardrobe', '3-seater sofa', 'Coffee table', 'Study table'], monthly: 1999 },
  { name: '2 BHK', items: ['2 queen beds with mattresses', '2 two-door wardrobes', '3-seater sofa', 'Coffee table', '4-seater dining set', 'Study table'], monthly: 3499 },
  { name: '3 BHK', items: ['3 queen beds with mattresses', '3 two-door wardrobes', 'L-shaped sofa', 'Coffee table', 'TV unit', '6-seater dining set', 'Study table'], monthly: 4999 },
] as const;
/** Appliance add-ons for the package estimator, priced like the appliance catalogue. */
export const RENT_ADDONS = [
  { name: 'Fridge', item: 'Double-door fridge', monthly: 999, icon: '🧊' },
  { name: 'Washing machine', item: 'Fully automatic 7 kg', monthly: 799, icon: '🫧' },
  { name: 'AC', item: '1.5 ton split AC', monthly: 1599, icon: '❄' },
  { name: 'TV', item: '43" smart TV', monthly: 799, icon: '📺' },
] as const;
/** Plans offered on this page: 3, 6 and 12 months (factors from RENTAL_TENURES). */
export const RENT_PLANS = RENTAL_TENURES.filter((t) => t.months <= 12);
export function rentPackageEstimate(pkg: string | null, addons: string[], months: number) {
  const k = RENT_PLANS.find((t) => t.months === months)?.k ?? 1;
  const base = (RENT_PACKAGES.find((p) => p.name === pkg)?.monthly ?? 0) + RENT_ADDONS.filter((a) => addons.includes(a.name)).reduce((s, a) => s + a.monthly, 0);
  const monthly = Math.round(base * k);
  return { monthly, deposit: monthly * 2, total: monthly * months };
}

// ---------- Property management ----------
export const PM_CITIES = ['Mumbai', 'Pune', 'Bengaluru', 'Gurugram', 'Noida', 'Delhi', 'Hyderabad', 'Navi Mumbai', 'Thane', 'Chennai'];
export const PM_TYPES = ['Flat', 'Builder floor', 'Independent house', 'Villa', 'Penthouse', 'PG', 'Plot', 'Office space', 'Shop', 'Warehouse', 'Showroom'];
export const PM_NO_BHK = new Set(['Plot', 'Office space', 'Shop', 'Warehouse', 'Showroom']);
export const PM_COMPARE: [string, string, string, string][] = [
  ['Finding a tenant', 'Weeks of calls and visits', 'Limited reach', 'Listed across our portal; most homes let within weeks'],
  ['Tenant verification', 'Do it yourself', 'Rarely done', 'ID, employment and police verification'],
  ['Rent collection', 'You follow up', 'Not included', 'Collected and credited monthly'],
  ['Repairs & upkeep', 'Your weekends', 'Not included', 'Handled by your property manager'],
  ['Upfront cost', 'Your time', '1–2 months’ rent brokerage', 'Nothing until the home is let'],
];

// ---------- Inspection ----------
export const INSPECTION_CHECKS: [string, string][] = [
  ['Civil & finishing', 'Walls, plaster, tiles, flooring levels, cracks and hollow sounds.'],
  ['Seepage & dampness', 'Moisture meter readings on walls, ceilings, bathrooms and balconies.'],
  ['Electrical', 'Socket polarity, earthing, MCB/RCCB, wiring load and switchboards.'],
  ['Plumbing', 'Water pressure, leaks, drainage slope and fittings.'],
  ['Doors, windows & fittings', 'Alignment, locks, hardware and promised brand specifications.'],
  ['Area check', 'Measured carpet area compared with the agreement.'],
];
export const INSPECTION_PRICES: Record<string, number> = { '1 BHK': 3999, '2 BHK': 4999, '3 BHK': 5999, '4 BHK+': 7999 };

// ---------- Page content per service slug ----------
export const SERVICE_CONTENT: Record<string, ServiceContent> = {
  'home-interiors': {
    steps: ['Get an instant estimate', 'Meet a designer (free)', '3D designs and a fixed quote', 'Factory-made modules, installed in 45 days', 'Handover with warranty'],
    features: [['Fixed quotes', 'The price in your quote is the price you pay — no surprise extras.'], ['3D designs', 'See every room in 3D before production starts.'], ['Factory finish', 'Modules made on machines for precise fits and clean edges.'], ['Warranty', 'Up to 10 years on modular furniture and hardware.']],
    faq: [{ q: 'How much do full home interiors cost?', a: 'Typically ₹4–7 lakh for a 1 BHK, ₹7–12 lakh for a 2 BHK and ₹10–18 lakh for a 3 BHK, depending on scope and package. Use the estimator for your home.' }, { q: 'How long does it take?', a: 'Around 45 days from design sign-off for modular work; civil changes add time.' }, { q: 'Can I do only the kitchen or wardrobes?', a: 'Yes. Pick only the rooms and items you need in the estimator, or use the modular kitchen calculator.' }, { q: 'What is the difference between packages?', a: 'Packages change board material (MDF vs moisture-resistant HDHMR), shutter finish, hardware brand and accessories.' }],
  },
  'packers-movers': {
    partnerNote: true,
    steps: ['Tell us what, where and when', 'Get a call and a surveyed quote', 'Book your slot', 'Packing, transport and unpacking done for you'],
    features: [['Door-to-door', 'Packing at your old home, unpacking at the new one.'], ['Quality packing', 'Multi-layer packing, bubble wrap and wooden crates for fragile items.'], ['Transit insurance', 'Optional cover for damage during the move.'], ['Tracked vehicles', 'Know where your belongings are at all times.']],
    faq: [{ q: 'How early should I book?', a: 'One to two weeks ahead for local moves and two to three weeks for intercity moves, especially at month-end.' }, { q: 'What affects the price?', a: 'Volume of goods, distance, floor and lift access, vehicle transport, packing material and insurance.' }, { q: 'Is insurance included?', a: 'Transit insurance is optional and usually costs 1–3% of the declared value of goods.' }],
  },
  'home-painting': {
    partnerNote: true,
    steps: ['Share your requirement', 'Free site visit and colour consultation', 'Fixed quote and start date', 'Furniture covered, walls prepped and painted', 'Clean-up and final walkthrough'],
    features: [['Trained painters', 'Supervised crews with surface preparation done right.'], ['Colour consultation', 'Help choosing shades and finishes for every room.'], ['Branded paints', 'Genuine materials with the brand’s warranty.'], ['Clean & safe', 'Floors and furniture covered; site cleaned after work.']],
    faq: [{ q: 'How long does painting a 2 BHK take?', a: 'Usually 4–6 days for a full interior repaint, depending on wall condition and finish.' }, { q: 'Do I need to move out?', a: 'No. Rooms are done one or two at a time and furniture is covered.' }, { q: 'Is waterproofing included?', a: 'It can be added. Seepage should be fixed before painting or the paint will peel.' }],
  },
  'solar-rooftop': {
    partnerNote: true,
    steps: ['Free consultation', 'Roof survey', 'System design', 'Subsidy, net-metering and financing paperwork', 'Installation and commissioning', 'Monitoring and service'],
    features: [['Subsidy handled', 'We file the central subsidy application for eligible homes.'], ['Net metering', 'Export surplus power to the grid and cut your bill further.'], ['25-year panels', 'Tier-1 panels with long performance warranties.'], ['EMI options', 'Pay for the system from what you save each month.']],
    faq: [{ q: 'How much roof do I need?', a: 'About 100 sq ft of shadow-free roof per kW.' }, { q: 'How much does 1 kW generate?', a: 'Around 4 units a day on average in India, more in sunny regions.' }, { q: 'Which documents are needed?', a: 'Recent electricity bills, proof of ownership (or owner NOC), ID proof and, for societies, a resolution.' }],
  },
  'furniture-rental': {
    partnerNote: true,
    steps: ['Pick items and tenure', 'Complete quick KYC', 'Free delivery and installation', 'Free maintenance; return or extend anytime'],
    features: [['Free delivery', 'Delivered and assembled at no extra cost.'], ['Flexible tenure', '3 to 24 months — longer tenures cost less per month.'], ['Free maintenance', 'Repairs and replacements included.'], ['Free relocation', 'Move homes after 6 months and we move your rentals free.']],
    faq: [{ q: 'When does billing start?', a: 'From the delivery date. Rent is auto-debited monthly.' }, { q: 'Can I return some items early?', a: 'Yes, with a week’s notice; early-closure charges may apply before the minimum tenure.' }, { q: 'Is there a deposit?', a: 'A refundable deposit, usually one to two months’ rent, is collected at delivery.' }],
  },
  'appliance-rental': {
    partnerNote: true,
    steps: ['Pick appliances and tenure', 'Complete quick KYC', 'Free delivery and installation', 'Free servicing; upgrade or return anytime'],
    features: [['Branded appliances', 'Well-maintained, sanitised products from top brands.'], ['Seasonal renting', 'Rent an AC or cooler just for summer.'], ['Free servicing', 'Breakdowns fixed or replaced at no cost.'], ['Upgrade anytime', 'Swap to a bigger or newer model when you need.']],
    faq: [{ q: 'Is installation free?', a: 'Yes, including AC installation with standard piping.' }, { q: 'What if an appliance breaks down?', a: 'Raise a request and it is repaired or replaced, usually within 48–72 hours.' }, { q: 'Can I buy the appliance later?', a: 'Many partners let you buy it at a depreciated price after the tenure.' }],
  },
  'furniture-appliances-rental': {
    partnerNote: true,
    steps: ['Choose a package or single items', 'Schedule delivery', 'Free maintenance while you rent', 'Return or upgrade at the end of your plan'],
    features: [['Ready-to-live packages', '1, 2 and 3 BHK furniture sets, plus appliances, in one order.'], ['3, 6 or 12 months', 'Pick a plan; longer plans cost less per month.'], ['Free delivery & setup', 'Delivered, assembled and installed at no extra cost.'], ['Free maintenance', 'Repairs and replacements included for the whole plan.']],
    faq: [
      { q: 'Are the prices on this page final?', a: 'No. They are demo prices to show how plans compare. Our partner confirms the exact rent for your city and items when they call you.' },
      { q: 'How soon can items be delivered?', a: 'Usually within 3–5 days of confirming your order and completing KYC, depending on stock in your city.' },
      { q: 'Is there a deposit?', a: 'A refundable deposit, typically up to two months’ rent, is collected at delivery and returned when the items are picked up in good condition.' },
      { q: 'What happens at the end of my plan?', a: 'Return the items for free pickup, extend the plan, or upgrade to a bigger package or newer appliances.' },
      { q: 'Can I add or remove items mid-plan?', a: 'Yes. Add items anytime at the current rate; returning items before the plan ends may carry an early-closure charge.' },
    ],
  },
  'property-management': {
    steps: ['Add your property in two minutes', 'We find and verify a tenant', 'Rent agreement and move-in', 'Rent collection and upkeep, every month'],
    features: [['Verified tenants', 'ID, employment and police verification for every tenant.'], ['Dedicated manager', 'One person who knows your property.'], ['On-time rent', 'Collected and credited to your account monthly.'], ['Maintenance handled', 'Repairs, inspections and move-out checks.']],
    faq: [{ q: 'How much does it cost?', a: 'Nothing to sign up. A small share of the monthly rent is charged only while your property is let.' }, { q: 'I live abroad. Can you manage my property?', a: 'Yes — NRIs get updates on WhatsApp and email, remote document signing and rent credited to an NRO account.' }, { q: 'Who chooses the tenant?', a: 'We shortlist verified tenants; you approve the final choice.' }],
  },
  'property-inspection': {
    steps: ['Book a slot', 'An engineer inspects with instruments', 'Get a photo report with severity ratings', 'Share it with your builder or seller to get fixes done'],
    features: [['Instrument-based', 'Moisture meters, thermal cameras, laser measures and socket testers.'], ['Photo report', 'Every issue photographed, located and rated by severity.'], ['Area verification', 'Carpet area measured against your agreement.'], ['Re-inspection', 'Optional follow-up visit after the builder fixes issues.']],
    faq: [{ q: 'When should I get an inspection?', a: 'Before taking possession from a builder, before buying a resale home, after renovation, and before letting to a new tenant.' }, { q: 'How long does it take?', a: 'Two to four hours on site; the report arrives within 48 hours.' }, { q: 'Will the builder accept the report?', a: 'The report lists issues with photos and locations, which builders use to plan fixes before handover.' }],
  },
};
