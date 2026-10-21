// Service plans, coupons and stamp-duty rules shared by the server (orders API) and the browser (forms).
/** Title search report options (duration of records searched). */
export const TITLE_SEARCH_PLANS = {
  '13y': { label: 'Digital report — 13 years of records', price: 1500 },
  '30y': { label: 'Lawyer-verified report — 30 years of records', price: 4500 },
} as const;

/** E-stamped rent agreement packages. Stamp duty is charged at actuals on top. */
export const AGREEMENT_PLANS = {
  estamp: { label: 'E-stamped agreement delivered by email', price: 499 },
  doorstep: { label: 'E-stamped + doorstep signing & registration help', price: 1499 },
} as const;

export const VALUATION_PLANS = {
  desktop: { label: 'Desktop valuation report', price: 2999 },
  site: { label: 'Site-visit valuation by a certified valuer', price: 7999 },
} as const;

/** Indicative state-wise stamp duty for rent agreements, as presented on the reference page. */
export const RENT_STAMP_DUTY: { state: string; term: string; rule: string; calc: (annualRent: number, deposit: number, months: number) => number }[] = [
  { state: 'Maharashtra', term: 'Up to 5 years', rule: '0.25% of total rent for the term', calc: (a, _d, m) => Math.ceil(0.0025 * (a / 12) * m) },
  { state: 'Karnataka', term: 'Up to 10 years', rule: '1% of annual rent + deposit, max ₹500', calc: (a, d) => Math.min(500, Math.ceil(0.01 * (a + d))) },
  { state: 'Tamil Nadu', term: 'Up to 5 years', rule: '1% of annual rent with deposit', calc: (a, d) => Math.ceil(0.01 * (a + d)) },
  { state: 'Uttar Pradesh', term: 'Less than 1 year', rule: '4% of annual rent with deposit', calc: (a, d) => Math.ceil(0.04 * (a + d)) },
  { state: 'Delhi', term: 'Up to 5 years', rule: '2% of average annual rent (₹100 minimum for 11 months)', calc: (a, _d, m) => (m <= 11 ? 100 : Math.ceil(0.02 * a)) },
  { state: 'Haryana', term: '5–10 years', rule: '1.5–3% of average annual rent', calc: (a) => Math.ceil(0.015 * a) },
  { state: 'Telangana', term: 'Up to 5 years', rule: '0.4% of annual rent + deposit', calc: (a, d) => Math.ceil(0.004 * (a + d)) },
  { state: 'West Bengal', term: 'Up to 1 year', rule: '0.25% of annual rent', calc: (a) => Math.max(10, Math.ceil(0.0025 * a)) },
];


/** Litigation search: one fixed-price report (party + property court-record check). */
export const LITIGATION_SEARCH_PRICE = 1799;

/** Legal service catalogue (Book Now opens a consultation lead). Prices are our own offer prices; mrp is the list price. */
export const LEGAL_CATALOGUE: Record<string, { name: string; price: number; mrp: number; points: string[]; badge?: string; href?: string }[]> = {
  'Legal services': [
    { name: 'Document Review', price: 0, mrp: 2500, badge: 'Most booked', points: ['Ideal before you pay a token amount', 'An in-house lawyer reviews your sale documents', 'Flags missing approvals and compliance gaps'] },
    { name: 'Power of Attorney', price: 5500, mrp: 9000, badge: 'Most booked', points: ['Drafted for the specific rights you want to delegate', 'General or special POA, fixed term or open', 'Guidance on notarisation and registration'] },
    { name: 'Lease / Rent Agreement', price: 2750, mrp: 10000, points: ['Contract between owner and tenant', 'Covers rent, deposit, lock-in and maintenance', 'Drafted for your state’s stamp rules'] },
    { name: 'Agreement for Sale', price: 5500, mrp: 15000, points: ['Sets the terms of a resale or builder sale', 'Payment schedule, possession and penalties', 'Reviewed against title documents'] },
    { name: 'Full Due Diligence', price: 11000, mrp: 20000, points: ['Title, approvals and compliance in one report', 'Mortgage and encumbrance checks', 'Useful for loans and valuations'] },
    { name: 'Builder / Seller Complaint', price: 27500, mrp: 75000, badge: 'Most booked', points: ['Assessment of your case and options', 'Legal notice for refund or settlement', 'Filing before RERA, consumer forum or arbitration'] },
    { name: 'Title Search', price: 1500, mrp: 10000, href: '/services/title-search', points: ['Ownership chain from registry records', 'Current owner and transfer history', '13-year digital or 30-year lawyer-verified'] },
    { name: 'Litigation Search', price: LITIGATION_SEARCH_PRICE, mrp: 3000, href: '/services/litigation-search', points: ['Court cases against the seller or property', 'Pending, active and disposed matters', 'Written summary with case numbers'] },
  ],
  'Monitoring & valuation': [
    { name: 'Construction Monitoring Report', price: 5500, mrp: 10000, points: ['For under-construction purchases', 'Progress, approvals and transactions tracked', 'Litigation check on the project'] },
    { name: 'Valuation Report', price: 2999, mrp: 5000, href: '/tools/property-valuation', points: ['Market value from comparable deals', 'Desktop or site-visit options', 'Accepted for loan and tax purposes'] },
  ],
};
