// Original editorial guides. Each section is a heading plus paragraphs or bullet lists.
export interface Guide {
  slug: string;
  title: string;
  summary: string;
  audience: string;
  readMins: number;
  sections: { heading: string; body?: string[]; bullets?: string[] }[];
}

export const GUIDES: Guide[] = [
  {
    slug: 'buyer-guide',
    title: 'Home buyer’s guide: from budget to registration',
    summary: 'Every step of buying a home in India — budgeting, shortlisting, due diligence, loans and registration.',
    audience: 'Buyers',
    readMins: 8,
    sections: [
      { heading: 'Set a realistic budget', body: ['Add up your down payment savings and the loan a bank will offer. Lenders usually cap total EMIs at about 50% of your take-home pay.', 'Keep 8–10% of the property price aside for stamp duty, registration, brokerage, interiors and moving.'], bullets: ['Use the affordability calculator to size your budget', 'Check your credit score before applying for a loan', 'Don’t stretch the loan tenure just to fit a bigger EMI'] },
      { heading: 'Ready-to-move or under construction?', body: ['Ready-to-move homes carry no delivery risk and no GST, but cost more. Under-construction homes are cheaper and allow staggered payments, but possession can be delayed.'], bullets: ['Ready to move: check the occupancy certificate (OC)', 'Under construction: check the RERA possession date and the builder’s delivery history'] },
      { heading: 'Due diligence checklist', bullets: ['RERA registration number and approved plans on the state RERA portal', 'Clear title — ideally a 30-year title search', 'Encumbrance certificate (no loans or disputes on the land)', 'Commencement certificate and building approvals', 'For resale: previous sale deeds, society NOC, paid-up property tax and utility bills'] },
      { heading: 'Carpet area vs built-up vs super built-up', body: ['RERA requires prices to be quoted on carpet area — the usable floor area inside your walls. Built-up adds wall thickness and balconies; super built-up adds a share of common areas. Always compare projects on price per sq.ft of carpet area.'] },
      { heading: 'Registration and possession', body: ['Pay stamp duty and register the sale deed at the sub-registrar office. After registration, apply for mutation in municipal records and transfer utility connections to your name.'] },
    ],
  },
  {
    slug: 'seller-guide',
    title: 'Seller’s guide: price right and close faster',
    summary: 'How to price, prepare, list and legally transfer your property.',
    audience: 'Sellers',
    readMins: 6,
    sections: [
      { heading: 'Price it using real data', body: ['Compare your asking price with the locality average on our property rates page and with recently registered transactions in your building. Overpriced listings sit unsold and end up selling below market.'] },
      { heading: 'Prepare the documents', bullets: ['Title deed and previous chain of sale deeds', 'Society NOC and share certificate', 'Latest property tax receipts and utility bills', 'Loan closure letter if the home was mortgaged', 'Occupancy certificate'] },
      { heading: 'Make the listing work', bullets: ['Add 8–15 bright, well-framed photos', 'Mention carpet area, floor, facing and parking', 'Respond to enquiries within the same day'] },
      { heading: 'Taxes on sale', body: ['Gains on a property held for more than 24 months are long-term capital gains. Reinvesting in another home (Section 54) or in specified bonds (Section 54EC) can reduce tax. Use the capital gains calculator for an estimate and confirm with a tax advisor.'] },
    ],
  },
  {
    slug: 'tenant-guide',
    title: 'Tenant’s guide: renting without surprises',
    summary: 'Searching, negotiating, the rent agreement, deposits and moving in.',
    audience: 'Tenants',
    readMins: 5,
    sections: [
      { heading: 'Know the total monthly cost', body: ['Ask for rent, maintenance, parking and any society charges separately. In most cities a security deposit of 2–6 months’ rent is common; Bengaluru is often higher.'] },
      { heading: 'Inspect before you agree', bullets: ['Water pressure and hours of supply', 'Seepage on walls and ceilings', 'Working fittings, geysers and electrical points', 'Mobile signal and internet providers'] },
      { heading: 'Get a written agreement', body: ['An 11-month leave and licence agreement is standard. It should state rent, deposit, notice period, lock-in, maintenance responsibilities and the condition of fittings. Use our rent agreement draft as a starting point.'] },
      { heading: 'Claim HRA', body: ['Salaried tenants can claim house rent allowance with rent receipts. If annual rent exceeds ₹1 lakh, you also need the landlord’s PAN. Our rent receipt generator creates printable receipts.'] },
    ],
  },
  {
    slug: 'nri-guide',
    title: 'NRI guide to buying property in India',
    summary: 'What NRIs can buy, how to pay, taxes and managing property from abroad.',
    audience: 'NRIs',
    readMins: 6,
    sections: [
      { heading: 'What you can buy', body: ['NRIs and OCIs can buy residential and commercial property freely. Agricultural land, plantations and farmhouses generally cannot be bought, only inherited.'] },
      { heading: 'How to pay', body: ['Payments must come through normal banking channels — an NRE, NRO or FCNR account in India, or inward remittance. Cash and foreign currency notes are not allowed.'] },
      { heading: 'Home loans for NRIs', body: ['Most Indian banks lend to NRIs. Expect to provide overseas income proof, a valid visa or work permit and an Indian co-applicant or power of attorney holder in some cases.'] },
      { heading: 'Managing from abroad', bullets: ['Register a specific power of attorney for a trusted person', 'Use a property management service for tenants and upkeep', 'TDS applies when an NRI sells; plan repatriation within the permitted limits'] },
    ],
  },
  {
    slug: 'rera-explained',
    title: 'RERA explained: what it protects and how to check a project',
    summary: 'How the Real Estate (Regulation and Development) Act protects buyers and how to verify a registration.',
    audience: 'Buyers',
    readMins: 4,
    sections: [
      { heading: 'What RERA requires', bullets: ['Projects above a size threshold must register before advertising', 'Prices must be on carpet area', '70% of buyer payments go into an escrow account for that project', 'Five-year liability for structural defects', 'Compensation for delayed possession'] },
      { heading: 'How to verify', body: ['Search the RERA number on the state RERA portal. Check the registered possession date, approved plans, the promoter’s other projects and any complaints filed.'] },
    ],
  },
  {
    slug: 'home-loan-basics',
    title: 'Home loan basics: rates, tenure and tax benefits',
    summary: 'Fixed vs floating rates, how EMI is calculated, prepayment and tax deductions.',
    audience: 'Buyers',
    readMins: 5,
    sections: [
      { heading: 'Fixed or floating', body: ['Most Indian home loans are floating, linked to an external benchmark like the repo rate. They fall when rates drop and carry no prepayment penalty for individuals.'] },
      { heading: 'How EMI works', body: ['EMI = P × r × (1+r)^n / ((1+r)^n − 1), where r is the monthly rate and n the number of months. Early EMIs are mostly interest; prepaying in the first few years saves the most.'] },
      { heading: 'Tax benefits', bullets: ['Section 24(b): up to ₹2 lakh a year on interest for a self-occupied home', 'Section 80C: up to ₹1.5 lakh on principal repayment (old tax regime)', 'Joint borrowers who are co-owners can each claim'] },
    ],
  },
  {
    slug: 'women-home-buyers',
    title: 'Women home buyers: benefits you should claim',
    summary: 'Lower stamp duty, better loan rates and tax benefits available when a woman owns or co-owns a home.',
    audience: 'Buyers',
    readMins: 4,
    sections: [
      { heading: 'Lower stamp duty', body: ['Several states charge women buyers a lower stamp duty — commonly 1–2 percentage points less. Delhi, Uttar Pradesh, Haryana, Rajasthan and Maharashtra (for first homes) are examples. Check the current rate for your state on the stamp duty calculator.'] },
      { heading: 'Cheaper home loans', body: ['Many banks offer a small interest-rate concession, often around 0.05%, when a woman is the primary borrower or co-borrower. Over a 20-year loan this adds up.'] },
      { heading: 'Tax benefits for co-owners', body: ['When spouses co-own and co-borrow, each can claim the interest deduction under Section 24(b) and the principal deduction under Section 80C (old regime), doubling the household benefit.'] },
      { heading: 'PMAY eligibility', body: ['Under the Pradhan Mantri Awas Yojana, women ownership or co-ownership is encouraged for eligible households. Check current scheme status before applying.'] },
      { heading: 'Checklist', bullets: ['Register the property in the woman’s name or as joint owner', 'Ask lenders for the women-borrower rate', 'Confirm stamp duty concession eligibility before registration', 'Keep income documents for both co-borrowers ready'] },
    ],
  },
];
