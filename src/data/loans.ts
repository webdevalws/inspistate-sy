// Loan data: lender rate tables and tax constants. Rates are indicative (October 2026) — lenders change them often.
// See docs/functions/{home-loan-rates,balance-transfer,prepayment,tax-benefit,emi-calculator}/desc.md.

export type LenderType = 'Public bank' | 'Private bank' | 'Housing finance / NBFC';
export interface Lender { name: string; slug: string; type: LenderType; min: number; max: number; amount: string; tenure: string; fee: string; prepay: string; quick?: boolean }

export const HOME_LOAN_LENDERS: Lender[] = [
  { name: 'Indian Bank', slug: 'indian-bank', type: 'Public bank', min: 7.15, max: 9.55, amount: '₹5 L – ₹75 L', tenure: '1–30 yrs', fee: '0.23% (max ₹20,470)', prepay: 'Nil on floating rate' },
  { name: 'Bank of Baroda', slug: 'bank-of-baroda', type: 'Public bank', min: 7.2, max: 10.45, amount: '₹10 L – ₹10 Cr', tenure: '5–30 yrs', fee: 'Up to 0.50% (max ₹15,000)', prepay: 'Nil on floating rate' },
  { name: 'State Bank of India', slug: 'sbi', type: 'Public bank', min: 7.25, max: 8.45, amount: '₹5 L – ₹40 Cr', tenure: '1–30 yrs', fee: '0.35% (min ₹2,000, max ₹10,000)', prepay: 'Nil on floating rate', quick: true },
  { name: 'Bank of Maharashtra', slug: 'bank-of-maharashtra', type: 'Public bank', min: 7.25, max: 9.9, amount: '₹10 L – ₹2 Cr', tenure: '3–30 yrs', fee: 'Nil (offer)', prepay: 'Nil on floating rate' },
  { name: 'Bank of India', slug: 'bank-of-india', type: 'Public bank', min: 7.35, max: 12.55, amount: '₹5 L – ₹7.5 Cr', tenure: '3–30 yrs', fee: '0.25% (max ₹20,000)', prepay: 'Nil on floating rate' },
  { name: 'Union Bank of India', slug: 'union-bank', type: 'Public bank', min: 7.4, max: 12.65, amount: '₹5 L – ₹2 Cr', tenure: '1–30 yrs', fee: '0.50% (max ₹15,000)', prepay: 'Nil on floating rate' },
  { name: 'Punjab National Bank', slug: 'pnb', type: 'Public bank', min: 7.4, max: 11.35, amount: '₹1 L – ₹5 Cr', tenure: '1–30 yrs', fee: '0.35% (max ₹15,000)', prepay: 'Nil on floating rate' },
  { name: 'Canara Bank', slug: 'canara-bank', type: 'Public bank', min: 7.5, max: 10.95, amount: '₹10 L – ₹50 L', tenure: '1–30 yrs', fee: '0.50% (max ₹10,000)', prepay: 'Nil on floating rate' },
  { name: 'Kotak Mahindra Bank', slug: 'kotak', type: 'Private bank', min: 7.6, max: 12, amount: '₹5 L – ₹10 Cr', tenure: '1–30 yrs', fee: 'Up to 0.50%', prepay: 'Nil on floating rate', quick: true },
  { name: 'HDFC Bank', slug: 'hdfc-bank', type: 'Private bank', min: 8, max: 13.45, amount: '₹5 L – ₹10 Cr', tenure: '1–30 yrs', fee: 'Up to 0.50% or ₹3,000', prepay: 'Nil on floating rate', quick: true },
  { name: 'Axis Bank', slug: 'axis-bank', type: 'Private bank', min: 8, max: 9.1, amount: '₹3 L – ₹5 Cr', tenure: '1–30 yrs', fee: 'Up to 1% (min ₹10,000)', prepay: 'Nil on floating rate' },
  { name: 'ICICI Bank', slug: 'icici-bank', type: 'Private bank', min: 8.75, max: 11.2, amount: '₹5 L – ₹10 Cr', tenure: '1–30 yrs', fee: '0.50%–2%', prepay: 'Nil on floating rate', quick: true },
  { name: 'LIC Housing Finance', slug: 'lic-hfl', type: 'Housing finance / NBFC', min: 7.15, max: 8.2, amount: '₹1 L – ₹15 Cr', tenure: '1–30 yrs', fee: '0.25% (max ₹15,000)', prepay: 'Nil on floating rate' },
  { name: 'Bajaj Finserv', slug: 'bajaj-finserv', type: 'Housing finance / NBFC', min: 7.15, max: 20, amount: '₹10 L – ₹15 Cr', tenure: '1–40 yrs', fee: 'Up to 4%', prepay: 'Nil on floating rate', quick: true },
  { name: 'PNB Housing Finance', slug: 'pnb-hfl', type: 'Housing finance / NBFC', min: 7.75, max: 9.95, amount: '₹5 L – ₹5 Cr', tenure: '1–30 yrs', fee: 'Up to 1%', prepay: 'Nil on floating rate' },
  { name: 'Tata Capital Housing', slug: 'tata-capital', type: 'Housing finance / NBFC', min: 7.75, max: 11.5, amount: '₹2 L – ₹5 Cr', tenure: '1–30 yrs', fee: 'Up to 0.50%', prepay: 'Nil on floating rate', quick: true },
  { name: 'L&T Finance', slug: 'lt-finance', type: 'Housing finance / NBFC', min: 7.8, max: 11, amount: '₹10 L – ₹7.5 Cr', tenure: '1–30 yrs', fee: 'Up to 3%', prepay: 'Nil on floating rate', quick: true },
  { name: 'Aditya Birla Housing', slug: 'aditya-birla', type: 'Housing finance / NBFC', min: 8, max: 13, amount: '₹5 L – ₹10 Cr', tenure: '1–30 yrs', fee: 'Up to 1%', prepay: 'Nil on floating rate' },
];

export const RATE_HISTORY: [number, string][] = [[2021, '6.40%'], [2022, '6.55% → 8.60%'], [2023, '8.30%'], [2024, '8.30%'], [2025, '7.35%'], [2026, '7.10%']];

/** Loan products for the EMI calculator. */
export const LOAN_KINDS = {
  home: { label: 'Home loan', amount: [500000, 200000000, 5000000], rate: [6, 20, 8.5], years: [1, 30, 20] },
  personal: { label: 'Personal loan', amount: [50000, 5000000, 500000], rate: [9, 30, 11.5], years: [1, 7, 4] },
  business: { label: 'Business loan', amount: [100000, 50000000, 2000000], rate: [10, 30, 15], years: [1, 10, 5] },
  lap: { label: 'Loan against property', amount: [500000, 100000000, 5000000], rate: [8, 18, 10], years: [1, 20, 15] },
} as const;
export type LoanKind = keyof typeof LOAN_KINDS;

// ---------- Income tax (FY 2025-26 / AY 2026-27, individuals below 60) ----------
export const OLD_REGIME = { slabs: [[250000, 0], [500000, 0.05], [1000000, 0.2], [Infinity, 0.3]] as [number, number][], std: 50000, rebateLimit: 500000, rebateMax: 12500 };
export const NEW_REGIME = { slabs: [[400000, 0], [800000, 0.05], [1200000, 0.1], [1600000, 0.15], [2000000, 0.2], [2400000, 0.25], [Infinity, 0.3]] as [number, number][], std: 75000, rebateLimit: 1200000, rebateMax: 60000 };
export const LIMITS = { sec80c: 150000, sec24bSelf: 200000, sec24bLate: 30000, sec80eea: 150000, hpLossSetOff: 200000 };

export function slabTax(taxable: number, regime: typeof OLD_REGIME) {
  let tax = 0, prev = 0;
  for (const [upto, rate] of regime.slabs) { if (taxable > prev) tax += (Math.min(taxable, upto) - prev) * rate; prev = upto; }
  if (taxable <= regime.rebateLimit) tax = Math.max(0, tax - regime.rebateMax);
  return Math.round(tax * 1.04); // 4% health & education cess; surcharge not modelled
}

// ---------- Other loan products ----------
export const PERSONAL_LENDERS: Lender[] = [
  { name: 'Canara Bank', slug: 'canara-bank', type: 'Public bank', min: 8.25, max: 15.5, amount: '₹1 L – ₹10 L', tenure: '1–6 yrs', fee: 'Up to 0.5%', prepay: 'Nil' },
  { name: 'Indian Bank', slug: 'indian-bank', type: 'Public bank', min: 9, max: 11.5, amount: 'Up to ₹10 L', tenure: '1–7 yrs', fee: 'Up to 1%', prepay: 'Nil' },
  { name: 'State Bank of India', slug: 'sbi', type: 'Public bank', min: 10, max: 15, amount: '₹50 K – ₹35 L', tenure: '1–6 yrs', fee: 'Up to 1.5%', prepay: '3% if prepaid early', quick: true },
  { name: 'Bank of Baroda', slug: 'bank-of-baroda', type: 'Public bank', min: 10.4, max: 17.75, amount: '₹1 L – ₹20 L', tenure: '1–7 yrs', fee: 'Up to 2% + GST', prepay: 'Nil' },
  { name: 'Punjab National Bank', slug: 'pnb', type: 'Public bank', min: 10.5, max: 17.05, amount: '₹50 K – ₹20 L', tenure: '1–6 yrs', fee: 'Up to 1%', prepay: 'Nil' },
  { name: 'HDFC Bank', slug: 'hdfc-bank', type: 'Private bank', min: 10.9, max: 24, amount: '₹50 K – ₹40 L', tenure: '1–6 yrs', fee: 'Up to ₹6,500', prepay: 'Up to 4%', quick: true },
  { name: 'ICICI Bank', slug: 'icici-bank', type: 'Private bank', min: 10.85, max: 16.65, amount: '₹50 K – ₹50 L', tenure: '1–6 yrs', fee: 'Up to 2%', prepay: '3% + GST', quick: true },
  { name: 'Axis Bank', slug: 'axis-bank', type: 'Private bank', min: 11.25, max: 22, amount: '₹50 K – ₹40 L', tenure: '1–7 yrs', fee: 'Up to 2%', prepay: 'Nil after 12 EMIs', quick: true },
  { name: 'Kotak Mahindra Bank', slug: 'kotak', type: 'Private bank', min: 10.99, max: 24, amount: '₹50 K – ₹40 L', tenure: '1–6 yrs', fee: 'Up to 5%', prepay: '5% + GST' },
  { name: 'Bajaj Finserv', slug: 'bajaj-finserv', type: 'Housing finance / NBFC', min: 11, max: 31, amount: '₹40 K – ₹55 L', tenure: '1–8 yrs', fee: 'Up to 3.93%', prepay: 'Up to 4.72%', quick: true },
  { name: 'Tata Capital', slug: 'tata-capital', type: 'Housing finance / NBFC', min: 10.99, max: 29.99, amount: '₹40 K – ₹35 L', tenure: '1–6 yrs', fee: 'Up to 3.5%', prepay: 'Up to 4.5%', quick: true },
];
export const BUSINESS_LENDERS: Lender[] = [
  { name: 'Bank of Baroda', slug: 'bank-of-baroda', type: 'Public bank', min: 7.25, max: 13.5, amount: '₹5 L – ₹1 Cr', tenure: '1–7 yrs', fee: 'Up to 3%', prepay: '2% within 12 months' },
  { name: 'State Bank of India', slug: 'sbi', type: 'Public bank', min: 9.1, max: 11.55, amount: '₹10 L – ₹50 Cr', tenure: '1–10 yrs', fee: 'Flat ₹10,000', prepay: 'Nil' },
  { name: 'Canara Bank', slug: 'canara-bank', type: 'Public bank', min: 9.5, max: 11.55, amount: '₹50 K – ₹20 Cr', tenure: '1–7 yrs', fee: 'Up to 1%', prepay: '1%' },
  { name: 'Union Bank of India', slug: 'union-bank', type: 'Public bank', min: 9.55, max: 12.1, amount: 'Up to ₹15 L', tenure: '1–7 yrs', fee: 'Up to 1% (max ₹7,500)', prepay: 'Nil from own funds' },
  { name: 'HDFC Bank', slug: 'hdfc-bank', type: 'Private bank', min: 10, max: 22.5, amount: '₹50 K – ₹75 L', tenure: '1–4 yrs', fee: 'Up to 2%', prepay: 'Up to 4%', quick: true },
  { name: 'ICICI Bank', slug: 'icici-bank', type: 'Private bank', min: 11, max: 21, amount: '₹1 L – ₹2 Cr', tenure: '1–5 yrs', fee: 'Up to 2%', prepay: 'Up to 5%', quick: true },
  { name: 'Lendingkart', slug: 'lendingkart', type: 'Housing finance / NBFC', min: 15, max: 27, amount: '₹50 K – ₹2 Cr', tenure: '1–3 yrs', fee: 'Up to 3%', prepay: 'Nil after 6 months', quick: true },
];
export const LAP_LENDERS: Lender[] = [
  { name: 'State Bank of India', slug: 'sbi', type: 'Public bank', min: 9.2, max: 10.75, amount: '₹10 L – ₹7.5 Cr', tenure: 'Up to 15 yrs', fee: 'Up to 1% (max ₹50,000)', prepay: 'Nil' },
  { name: 'Canara Bank', slug: 'canara-bank', type: 'Public bank', min: 9.3, max: 12.55, amount: 'Up to ₹10 Cr', tenure: 'Up to 15 yrs', fee: 'Up to 1% (min ₹5,000)', prepay: '1%' },
  { name: 'Union Bank of India', slug: 'union-bank', type: 'Public bank', min: 9.45, max: 12.1, amount: '₹25 L – ₹1 Cr', tenure: 'Up to 15 yrs', fee: 'Up to 1%', prepay: 'Nil' },
  { name: 'Punjab National Bank', slug: 'pnb', type: 'Public bank', min: 9.75, max: 13.6, amount: '₹2 L – ₹5 Cr', tenure: 'Up to 15 yrs', fee: '0.75% (max ₹1 L)', prepay: 'Nil' },
  { name: 'Bank of Baroda', slug: 'bank-of-baroda', type: 'Public bank', min: 9.85, max: 17.5, amount: '₹2 L – ₹25 Cr', tenure: 'Up to 15 yrs', fee: 'Up to 1%', prepay: 'Nil' },
  { name: 'HDFC Bank', slug: 'hdfc-bank', type: 'Private bank', min: 9.5, max: 11.5, amount: '₹5 L – ₹10 Cr', tenure: 'Up to 15 yrs', fee: 'Up to 1%', prepay: 'Nil on floating', quick: true },
  { name: 'Bajaj Finserv', slug: 'bajaj-finserv', type: 'Housing finance / NBFC', min: 9.75, max: 18, amount: 'Up to ₹10.5 Cr', tenure: 'Up to 15 yrs', fee: 'Up to 4%', prepay: 'Nil on floating', quick: true },
];

export interface LoanProduct {
  slug: string; kind: LoanKind; name: string; tagline: string; lenders: Lender[]; perLakhYears: number;
  glance: [string, string][]; eligibility: [string, string][]; documents: string[]; faq: { q: string; a: string }[];
}
export const LOAN_PRODUCTS: LoanProduct[] = [
  {
    slug: 'personal-loan', kind: 'personal', name: 'Personal Loan', tagline: 'Instant approval up to ₹50 lakh for any need — no collateral.', lenders: PERSONAL_LENDERS, perLakhYears: 5,
    glance: [['Loan type', 'Unsecured — no collateral'], ['Amount', '₹10,000 – ₹50 lakh'], ['Interest', 'From 8.25% p.a.'], ['Tenure', '12 – 84 months'], ['End use', 'No restriction'], ['Approval', 'Same day for pre-approved profiles']],
    eligibility: [['Age', '21 – 60 years'], ['Income', 'From ₹15,000 a month'], ['Employment', 'Salaried, self-employed or pensioner'], ['Credit score', '650+ (750+ for the best rates)'], ['Work experience', '1–2 years']],
    documents: ['PAN and Aadhaar', 'Last 3 salary slips (salaried) or 2 years ITR (self-employed)', 'Last 6 months bank statements', 'Address proof'],
    faq: [{ q: 'How much personal loan can I get?', a: 'Most lenders allow an EMI of 40–50% of your net monthly income minus existing EMIs. The eligibility check on this page uses this rule.' }, { q: 'Does a personal loan need collateral?', a: 'No. Personal loans are unsecured, which is why rates are higher than home loans.' }, { q: 'Can I prepay a personal loan?', a: 'Usually after 6–12 EMIs, with a foreclosure charge of 2–5% at many lenders. Some public banks charge nothing.' }],
  },
  {
    slug: 'business-loan', kind: 'business', name: 'Business Loan', tagline: 'Working capital and term loans for MSMEs, traders and professionals.', lenders: BUSINESS_LENDERS, perLakhYears: 5,
    glance: [['Amount', '₹50,000 – ₹50 crore'], ['Interest', 'From 7.25% p.a.'], ['Tenure', '1 – 10 years'], ['Collateral', 'Unsecured up to about ₹75 lakh; secured above'], ['Schemes', 'CGTMSE, MUDRA, PSB loans in 59 minutes']],
    eligibility: [['Business vintage', 'At least 2–3 years'], ['Turnover', 'Usually ₹10 lakh+ a year'], ['Profitability', 'Profit in the last 1–2 years'], ['Documents', 'ITR, audited financials, GST returns'], ['Credit score', '700+ for promoters']],
    documents: ['KYC of promoters and business', 'Business registration / GST certificate', '2 years ITR with audited financials', '6–12 months bank statements'],
    faq: [{ q: 'What is CGTMSE?', a: 'A government credit guarantee that lets banks lend to micro and small enterprises without collateral.' }, { q: 'How is a business loan EMI calculated?', a: 'With the same reducing-balance EMI formula as other loans. Use the EMI calculator on this page.' }],
  },
  {
    slug: 'loan-against-property', kind: 'lap', name: 'Loan Against Property', tagline: 'Unlock up to 70% of your property’s value at home-loan-like rates.', lenders: LAP_LENDERS, perLakhYears: 15,
    glance: [['Amount', '₹5 lakh – ₹10 crore'], ['Loan-to-value', 'Up to 70% of market value'], ['Interest', 'From 9.2% p.a.'], ['Tenure', 'Up to 15–20 years'], ['Property', 'Residential, commercial or plot'], ['Processing', '3–7 working days']],
    eligibility: [['Age', '21 – 65 years at loan maturity'], ['Income', 'From ₹3 lakh a year'], ['Employment', 'Salaried or self-employed'], ['Credit score', '700+'], ['Property', 'Clear title, in the applicant’s name']],
    documents: ['PAN, Aadhaar and address proof', 'Income proof (salary slips / ITR)', '6 months bank statements', 'Property papers: title deed, approved plan, tax receipts'],
    faq: [{ q: 'How much can I borrow against my property?', a: 'The lower of (a) 60–70% of the property’s market value and (b) what your income can repay. The calculator on this page shows both.' }, { q: 'Can I keep living in the property?', a: 'Yes. You keep using or renting out the property; the lender only holds a mortgage on it.' }],
  },
];

// ---------- Credit cards ----------
export interface CreditCard { name: string; bank: string; tags: string[]; joining: number; annual: number; perks: string[] }
export const CARD_TAGS = ['Cashback', 'Rewards', 'Lifetime free', 'Shopping', 'Fuel', 'Travel', 'Dining', 'Movies', 'Premium'];
export const CREDIT_CARDS: CreditCard[] = [
  { name: 'Flipkart Axis Bank', bank: 'Axis Bank', tags: ['Cashback', 'Shopping'], joining: 500, annual: 500, perks: ['5% cashback on Flipkart', '4% on preferred partners', '1% on other spends'] },
  { name: 'Amazon Pay ICICI', bank: 'ICICI Bank', tags: ['Cashback', 'Lifetime free', 'Shopping'], joining: 0, annual: 0, perks: ['5% back on Amazon for Prime members', '2% on partner merchants', 'No joining or annual fee'] },
  { name: 'SBI SimplyCLICK', bank: 'SBI', tags: ['Rewards', 'Shopping'], joining: 499, annual: 499, perks: ['10X points on partner sites', '5X on other online spends', 'Fee waived on ₹1 L annual spend'] },
  { name: 'HDFC Millennia', bank: 'HDFC Bank', tags: ['Cashback', 'Shopping'], joining: 1000, annual: 1000, perks: ['5% cashback on popular apps', '1% on other spends', 'Lounge access on spends'] },
  { name: 'Swiggy HDFC Bank', bank: 'HDFC Bank', tags: ['Dining', 'Cashback'], joining: 500, annual: 500, perks: ['10% back on Swiggy', '5% on online spends', 'Fee waived on ₹2 L spend'] },
  { name: 'IndianOil Axis Bank', bank: 'Axis Bank', tags: ['Fuel'], joining: 500, annual: 500, perks: ['4% value back on IOCL fuel', '1% fuel surcharge waiver', 'Points on groceries'] },
  { name: 'IDFC FIRST Millennia', bank: 'IDFC FIRST Bank', tags: ['Lifetime free', 'Rewards', 'Movies'], joining: 0, annual: 0, perks: ['Never-expiring reward points', 'Movie ticket discounts', 'Low forex mark-up'] },
  { name: 'AU LIT', bank: 'AU Small Finance Bank', tags: ['Lifetime free', 'Cashback'], joining: 0, annual: 0, perks: ['Pick the features you pay for', 'Up to 5% cashback', 'Accelerated rewards'] },
  { name: 'Axis Atlas', bank: 'Axis Bank', tags: ['Travel', 'Premium'], joining: 5000, annual: 5000, perks: ['Miles on travel bookings', 'Airline and hotel transfers', 'Domestic and international lounges'] },
  { name: 'HDFC Regalia Gold', bank: 'HDFC Bank', tags: ['Travel', 'Rewards', 'Premium'], joining: 2500, annual: 2500, perks: ['Lounge access in India and abroad', 'Bonus points on milestones', 'Low forex mark-up'] },
  { name: 'Tata Neu Infinity HDFC', bank: 'HDFC Bank', tags: ['Shopping', 'Rewards'], joining: 1499, annual: 1499, perks: ['Up to 10% NeuCoins on Tata Neu', '1.5% on other spends', 'Lounge access'] },
  { name: 'Kotak 811 Dream Different', bank: 'Kotak Mahindra Bank', tags: ['Lifetime free'], joining: 0, annual: 0, perks: ['Secured card against a fixed deposit', 'Builds credit history', 'No income proof needed'] },
];
