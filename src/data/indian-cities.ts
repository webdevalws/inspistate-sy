// Major Indian cities InspiState does not cover yet. Used to answer a typed city name ("jaipur") with
// "We're not in Jaipur yet" instead of quietly searching another city. Our own cities live in the
// `cities` table; don't list them here (when a city is added to the site, remove it from this list).
export const UNCOVERED_CITIES = [
  'Ahmedabad', 'Agra', 'Allahabad', 'Amritsar', 'Aurangabad', 'Bhopal', 'Bhubaneswar', 'Chandigarh', 'Coimbatore',
  'Dehradun', 'Faridabad', 'Ghaziabad', 'Goa', 'Guwahati', 'Gwalior', 'Indore', 'Jabalpur', 'Jaipur', 'Jalandhar',
  'Jammu', 'Jodhpur', 'Kanpur', 'Kochi', 'Kota', 'Kozhikode', 'Ludhiana', 'Madurai', 'Mangaluru',
  'Meerut', 'Mohali', 'Mysuru', 'Nagpur', 'Nashik', 'Panchkula', 'Patna', 'Prayagraj', 'Puducherry',
  'Raipur', 'Rajkot', 'Ranchi', 'Shimla', 'Srinagar', 'Surat', 'Thiruvananthapuram', 'Tiruchirappalli', 'Udaipur',
  'Vadodara', 'Varanasi', 'Vijayawada', 'Visakhapatnam',
] as const;

/** Other spellings people type, mapped to the name above. */
const ALIASES: Record<string, string> = {
  cochin: 'Kochi', ernakulam: 'Kochi', mysore: 'Mysuru', mangalore: 'Mangaluru', trivandrum: 'Thiruvananthapuram',
  vizag: 'Visakhapatnam', baroda: 'Vadodara', benares: 'Varanasi', banaras: 'Varanasi', calicut: 'Kozhikode',
  trichy: 'Tiruchirappalli', pondicherry: 'Puducherry', panaji: 'Goa',
};

/** The uncovered city named in `text` (whole words, any case), or null. */
export function uncoveredCityIn(text: string): string | null {
  const t = ` ${text.toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ')} `;
  const named = UNCOVERED_CITIES.find((c) => t.includes(` ${c.toLowerCase()} `));
  if (named) return named;
  const alias = Object.keys(ALIASES).find((a) => t.includes(` ${a.replace('-', ' ')} `));
  return alias ? ALIASES[alias] : null;
}
