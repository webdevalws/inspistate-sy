// Single registry for tools, services and header menus.

export const TOOLS = [
  { slug: 'emi-calculator', title: 'EMI Calculator', sub: 'Monthly payment, interest and total cost of a home loan.', icon: '₹' },
  { slug: 'loan-eligibility', title: 'Home Loan Eligibility', sub: 'How much a bank may lend you on your income.', icon: '✓' },
  { slug: 'balance-transfer', title: 'Balance Transfer Calculator', sub: 'Savings from moving your home loan to a cheaper lender.', icon: '⇆' },
  { slug: 'prepayment', title: 'Prepayment Calculator', sub: 'Interest saved by part-prepaying your home loan.', icon: '⏩' },
  { slug: 'tax-benefit', title: 'Home Loan Tax Benefit', sub: 'Tax saved under 80C and 24(b), old vs new regime.', icon: '🧾' },
  { slug: 'affordability', title: 'Affordability Calculator', sub: 'How much home your income and savings can buy.', icon: '⌂' },
  { slug: 'buy-vs-rent', title: 'Buy vs Rent', sub: 'Compare the long-term cost of buying and renting.', icon: '⚖' },
  { slug: 'property-valuation', title: 'Property Valuation', sub: 'Estimate market value from locality rates.', icon: '◎' },
  { slug: 'stamp-duty', title: 'Stamp Duty Calculator', sub: 'Indicative stamp duty and registration by state.', icon: '§' },
  { slug: 'capital-gains', title: 'Capital Gains Calculator', sub: 'Tax on selling a property, short or long term.', icon: '%' },
  { slug: 'area-converter', title: 'Area Converter', sub: 'Sq.ft, sq.m, gaj, acres, bigha and more.', icon: '⇄' },
  { slug: 'vastu', title: 'Vastu Calculator', sub: 'Upload your floor plan and get a Vastu score with remedies.', icon: '☸' },
  { slug: 'interior-cost', title: 'Full Home Interior Cost', sub: 'Room-by-room interior estimate in three packages.', icon: '🛋' },
  { slug: 'modular-kitchen', title: 'Modular Kitchen Cost', sub: 'Kitchen cost by shape, size and package.', icon: '🍳' },
  { slug: 'rent-receipt', title: 'Rent Receipt Generator', sub: 'Printable rent receipts for HRA claims.', icon: '🧾' },
  { slug: 'rent-agreement', title: 'Rent Agreement Draft', sub: 'Generate a standard 11-month agreement draft.', icon: '📄' },
  { slug: 'cost-of-living', title: 'Cost of Living Calculator', sub: 'Monthly budget to live in a locality.', icon: '🧺' },
  { slug: 'property-tax', title: 'Property Tax Estimator', sub: 'Indicative annual municipal property tax.', icon: '🏛' },
  { slug: 'credit-score', title: 'Check Free Credit Score', sub: 'Get your free CIBIL report and what it means for loans.', icon: '📈' },
] as const;
export type ToolSlug = (typeof TOOLS)[number]['slug'];

export const SERVICES = [
  { slug: 'home-loans', title: 'Home Loans', sub: 'Compare offers from partner banks and get approved faster.', icon: '🏦', points: ['Offers from multiple lenders', 'Eligibility check in minutes', 'Doorstep document pickup'] },
  { slug: 'home-interiors', title: 'Home Interiors', sub: 'Design and execution for kitchens, wardrobes and full homes.', icon: '🛋', points: ['Free design consultation', 'Fixed-price quotes', 'Warranty on modular work'] },
  { slug: 'property-management', title: 'Property Management', sub: 'Tenant search, rent collection and upkeep for owners.', icon: '🔑', points: ['Verified tenants', 'Monthly rent collection', 'Periodic inspections'] },
  { slug: 'legal-services', title: 'Legal Services', sub: 'Document review, agreements, due diligence and builder complaints at fixed prices.', icon: '⚖', points: ['Free document review', 'Agreements and power of attorney', 'RERA and consumer complaints'] },
  { slug: 'property-inspection', title: 'Home Inspection', sub: 'Pre-purchase or handover inspection with a detailed report.', icon: '🔍', points: ['Civil, seepage, electrical and plumbing checks', 'Carpet area verified', 'Photo report in 48 hours'] },
  { slug: 'packers-movers', title: 'Packers & Movers', sub: 'Local and intercity relocation with insurance.', icon: '🚚', points: ['Instant cost estimate', 'Verified movers', 'Optional transit insurance'] },
  { slug: 'home-painting', title: 'Home Painting', sub: 'Interior and exterior painting with supervised crews.', icon: '🎨', points: ['Free site visit', 'Branded paints', 'Furniture covering included'] },
  { slug: 'furniture-rental', title: 'Furniture Rental', sub: 'Rent beds, sofas, dining and study furniture monthly.', icon: '🪑', points: ['Free delivery and installation', 'Flexible tenure', 'Free maintenance'] },
  { slug: 'title-search', title: 'Title Search', sub: 'Lawyer-verified 30-year title report before you buy.', icon: '📜', points: ['30-year chain of title', 'Encumbrance check', 'Report in 5 working days'] },
  { slug: 'litigation-search', title: 'Litigation Search', sub: 'Check if a property or seller is involved in court cases.', icon: '🔎', points: ['District and high court records', 'Seller and builder checks', 'Written report'] },
  { slug: 'escrow', title: 'Escrow Services', sub: 'Hold the payment safely until the deal and documents are complete.', icon: '🔒', points: ['Bank-held escrow account', 'Release on agreed milestones', 'Protects buyer and seller'] },
  { slug: 'solar-rooftop', title: 'Solar Rooftop', sub: 'Rooftop solar installation with subsidy assistance.', icon: '☀', points: ['Savings and subsidy calculator', 'Free roof survey', 'Subsidy and net-metering paperwork'] },
  { slug: 'appliance-rental', title: 'Appliance Rental', sub: 'Rent fridges, washing machines and ACs monthly.', icon: '🧊', points: ['Free delivery', 'Free maintenance', 'Upgrade anytime'] },
  { slug: 'furniture-appliances-rental', title: 'Furniture & Appliances on Rent', sub: 'Furnish a 1, 2 or 3 BHK with furniture packages and appliances on 3, 6 or 12-month plans.', icon: '🛋', points: ['1, 2 and 3 BHK packages', 'Fridge, washing machine, AC and TV', 'Free delivery and maintenance'] },
  { slug: 'nri-services', title: 'NRI Services', sub: 'Buy, sell and manage property in India from abroad.', icon: '✈', points: ['Power of attorney support', 'Virtual site visits', 'Repatriation guidance'] },
] as const;
export type ServiceSlug = (typeof SERVICES)[number]['slug'];

export function headerMenus(city: string, cityName: string) {
  return [
    {
      label: 'Buy',
      groups: [
        { title: `Property in ${cityName}`, links: [
          ['All properties for sale', `/buy/${city}`], ['Ready to move', `/buy/${city}?possession=Ready+to+Move`], ['Under construction', `/buy/${city}?possession=Under+Construction`],
          ['Owner properties', `/buy/${city}?postedBy=Owner`], ['Verified properties', `/buy/${city}?verified=1`],
        ] },
        { title: 'By type', links: [['Flats', `/buy/${city}/apartment`], ['Villas', `/buy/${city}/villa`], ['Builder floors', `/buy/${city}/builder-floor`], ['Plots', `/buy/${city}/plot`], ['Commercial — buy', `/commercial/${city}?for=buy`], ['Commercial — lease', `/commercial/${city}?for=rent`]] },
        { title: 'By budget', links: [['Under ₹50 Lakh', `/buy/${city}?priceMax=5000000`], ['₹50 L – ₹1 Cr', `/buy/${city}?priceMin=5000000&priceMax=10000000`], ['₹1 Cr – ₹2 Cr', `/buy/${city}?priceMin=10000000&priceMax=20000000`], ['Above ₹2 Cr', `/buy/${city}?priceMin=20000000`]] },
      ],
    },
    {
      label: 'Rent',
      groups: [
        { title: `Rent in ${cityName}`, links: [['All rentals', `/rent/${city}`], ['Furnished homes', `/rent/${city}?furnishing=Furnished`], ['Owner properties', `/rent/${city}?postedBy=Owner`], ['1 BHK', `/rent/${city}/1-bhk`], ['2 BHK', `/rent/${city}/2-bhk`], ['3 BHK', `/rent/${city}/3-bhk`]] },
        { title: 'Managed homes', links: [['Zero-brokerage homes', `/managed-rentals/${city}`], ['Get your home managed', '/services/property-management']] },
        { title: 'For tenants', links: [['Rent agreement', '/tools/rent-agreement'], ['Rent receipts', '/tools/rent-receipt'], ['Packers & movers', '/services/packers-movers'], ['Furniture rental', '/services/furniture-rental'], ['Furniture & appliances on rent', '/services/furniture-appliances-rental'], ['Tenant guide', '/guides/tenant-guide']] },
      ],
    },
    {
      label: 'Projects',
      groups: [
        { title: `Projects in ${cityName}`, links: [['All new projects', `/new-projects/${city}`], ['New launch', `/new-projects/${city}?status=New+Launch`], ['Under construction', `/new-projects/${city}?status=Under+Construction`], ['Ready to move', `/new-projects/${city}?status=Ready+to+Move`]] },
        { title: 'Research', links: [['Top developers', '/builders'], ['Compare projects', '/compare'], ['Buyer guide', '/guides/buyer-guide']] },
      ],
    },
    {
      label: 'Services',
      groups: [
        { title: 'Finance & legal', links: [['Home loans', '/services/home-loans'], ['Title search', '/services/title-search'], ['Litigation search', '/services/litigation-search'], ['Legal services', '/services/legal-services'], ['Escrow', '/services/escrow']] },
        { title: 'Loans & cards', links: [['Home loan rates', '/home-loan-interest-rates'], ['Personal loan', '/loans/personal-loan'], ['Business loan', '/loans/business-loan'], ['Loan against property', '/loans/loan-against-property'], ['Credit cards', '/credit-cards'], ['Free credit score', '/tools/credit-score']] },
        { title: 'Interiors', links: [['Design ideas', '/design-ideas'], ['Full home cost', '/tools/interior-cost'], ['Modular kitchen cost', '/tools/modular-kitchen'], ['Home interiors', '/services/home-interiors']] },
        { title: 'Home & move', links: [['Home interiors', '/services/home-interiors'], ['Property management', '/services/property-management'], ['Packers & movers', '/services/packers-movers'], ['Home painting', '/services/home-painting'], ['Furniture rental', '/services/furniture-rental'], ['Furniture & appliances on rent', '/services/furniture-appliances-rental'], ['All services', '/services']] },
      ],
    },
    {
      label: 'Tools',
      groups: [
        { title: 'Calculators', links: [['EMI calculator', '/tools/emi-calculator'], ['Loan eligibility', '/tools/loan-eligibility'], ['Balance transfer', '/tools/balance-transfer'], ['Prepayment', '/tools/prepayment'], ['Home loan tax benefit', '/tools/tax-benefit'], ['Affordability', '/tools/affordability'], ['Buy vs rent', '/tools/buy-vs-rent'], ['Stamp duty', '/tools/stamp-duty'], ['Capital gains', '/tools/capital-gains']] },
        { title: 'Property tools', links: [['Property valuation', '/tools/property-valuation'], ['Rent agreement', '/tools/rent-agreement'], ['Rent receipts', '/tools/rent-receipt'], ['Vastu checker', '/tools/vastu'], ['Interior cost', '/tools/interior-cost'], ['All tools', '/tools']] },
      ],
    },
    {
      label: 'Guides',
      groups: [
        { title: 'Guides', links: [['Buyer guide', '/guides/buyer-guide'], ['Seller guide', '/guides/seller-guide'], ['Tenant guide', '/guides/tenant-guide'], ['NRI guide', '/guides/nri-guide'], ['All guides', '/guides']] },
        { title: `Insights · ${cityName}`, links: [['Property rates', `/property-rates/${city}`], ['Price heatmap', `/heatmap/${city}`], ['Emerging localities', `/localities/${city}/emerging`], ['Glossary', '/glossary']] },
      ],
    },
    {
      label: 'More',
      groups: [
        { title: 'Research', links: [['Research reports', '/research'], ['Women homebuyers', '/women-homebuyers'], ['Customer reviews', '/reviews']] },
        { title: 'Community', links: [['Agents directory', '/agents'], ['Real estate forum', '/forum'], ['Builders', '/builders'], ['Compare projects', '/compare']] },
        { title: 'Company', links: [['About us', '/about'], ['Careers', '/careers'], ['Partner with us', '/partner-with-us'], ['Advertise', '/advertise'], ['Contact us', '/contact'], ['FAQ', '/faq'], ['Fraud awareness', '/fraud-awareness']] },
      ],
    },
  ];
}
