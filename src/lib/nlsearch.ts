// "Ask AI" search: turns a free-text query into a search URL with rule-based parsing.
// Works without any external model; e.g. "ready to move 3bhk villa in whitefield bangalore under 2 cr".
import type { City, Locality } from '../data/types';

export interface ParsedQuery {
  url: string;
  summary: string[];
  mode: 'buy' | 'rent' | 'commercial' | 'new-projects';
  city: City;
  /** True when the text named one of our cities or localities, a mode or any filter. */
  matched: boolean;
}

const CITY_ALIASES: Record<string, string> = { bangalore: 'bengaluru', gurgaon: 'gurugram', bombay: 'mumbai', calcutta: 'kolkata', madras: 'chennai', 'new delhi': 'delhi' };

const amount = (num: string, unit: string | undefined) => {
  const n = parseFloat(num);
  const u = (unit ?? '').toLowerCase();
  if (/^(cr|crore|crores)$/.test(u)) return n * 1e7;
  if (/^(l|lac|lacs|lakh|lakhs)$/.test(u)) return n * 1e5;
  if (/^(k|thousand)$/.test(u)) return n * 1e3;
  return n;
};
const AMT = String.raw`(\d+(?:\.\d+)?)\s*(cr|crores?|l|lacs?|lakhs?|k|thousand)?\b`;

/** `defaultMode` is used when the text doesn't say (e.g. the search box's current tab). */
export function parseQuery(raw: string, cities: City[], localities: Locality[], fallbackCity: City, defaultMode: ParsedQuery['mode'] = 'buy'): ParsedQuery {
  const q = ` ${raw.toLowerCase().replace(/[^a-z0-9.\s]/g, ' ').replace(/\s+/g, ' ')} `;
  const summary: string[] = [];
  const params = new URLSearchParams();

  // City (aliases first), then locality within it — a locality name also implies its city.
  // Longest names first, so "navi mumbai" is Navi Mumbai rather than Mumbai.
  let city = [...cities].sort((a, b) => b.name.length - a.name.length).find((c) => q.includes(` ${c.name.toLowerCase()} `) || q.includes(` ${c.slug} `));
  for (const [alias, slug] of Object.entries(CITY_ALIASES)) if (!city && q.includes(` ${alias} `)) city = cities.find((c) => c.slug === slug);
  const locs = [...localities].sort((a, b) => b.name.length - a.name.length);
  const loc = locs.find((l) => (!city || l.citySlug === city.slug) && q.includes(` ${l.name.toLowerCase()} `));
  if (!city && loc) city = cities.find((c) => c.slug === loc.citySlug);
  const namedPlace = !!city || !!loc;
  city ??= fallbackCity;
  summary.push(loc ? `${loc.name}, ${city.name}` : city.name);

  let mode: ParsedQuery['mode'] = defaultMode;
  const modeWords: [RegExp, ParsedQuery['mode']][] = [
    [/\b(buy|buying|sale|purchase|resale)\b/, 'buy'], [/\b(rent|rental|lease|pg|tenant|paying guests?|co-?living|hostel)\b/, 'rent'],
    [/\b(office|shop|showroom|commercial|retail|coworking)\b/, 'commercial'], [/\b(new project|new launch|upcoming|pre ?launch|builder project)s?\b/, 'new-projects'],
  ];
  for (const [re, m] of modeWords) if (re.test(q)) mode = m;
  const namedMode = modeWords.some(([re]) => re.test(q));
  if (mode === 'commercial' && /\b(rent|lease)\b/.test(q)) { params.set('for', 'rent'); summary.push('for lease'); }
  summary.unshift({ buy: 'For sale', rent: 'For rent', commercial: 'Commercial', 'new-projects': 'New projects' }[mode]);

  const bhk = [...q.matchAll(/\b(\d)\s*(?:bhk|bed(?:room)?s?|rk)\b/g)].map((m) => Number(m[1]));
  if (bhk.length && mode !== 'commercial') { params.set('bhk', [...new Set(bhk.map((b) => Math.min(b, 5)))].join(',')); summary.push(`${bhk.join('/')} BHK`); }

  const types: [RegExp, string][] = [[/\bpgs?\b|paying guests?|co-?living|hostel/, 'PG'], [/\bvillas?\b|\bbungalows?\b|independent house/, 'Villa'], [/\bplots?\b|\bland\b/, 'Plot'], [/builder floor|\bfloors?\b/, 'Builder Floor'], [/\bflats?\b|apartments?/, 'Apartment'], [/\boffices?\b/, 'Office'], [/\bshops?\b|showroom|retail/, 'Shop']];
  const type = types.find(([re]) => re.test(q));
  if (type && mode !== 'new-projects') { params.set('type', type[1]); summary.push(type[1] === 'PG' ? 'PG / Co-living' : type[1]); }
  if (type?.[1] === 'PG') {
    if (/\b(women|girls|ladies|female)\b/.test(q)) { params.set('pgFor', 'women'); summary.push('for women'); }
    else if (/\b(men|boys|male|gents)\b/.test(q)) { params.set('pgFor', 'men'); summary.push('for men'); }
    const sharing = q.match(/\b(single|double|triple)\b/);
    if (sharing) { params.set('sharing', sharing[1]); summary.push(`${sharing[1]} sharing`); }
    if (/\b(with food|food included|meals)\b/.test(q)) { params.set('food', '1'); summary.push('food included'); }
  }

  const between = q.match(new RegExp(String.raw`(?:between|from)\s+${AMT}\s+(?:and|to|-)\s+${AMT}`));
  const under = q.match(new RegExp(String.raw`(?:under|below|less than|upto|up to|within|max(?:imum)?|budget)\s+(?:of\s+)?(?:rs\s+)?${AMT}`));
  const above = q.match(new RegExp(String.raw`(?:above|over|more than|min(?:imum)?|starting)\s+(?:rs\s+)?${AMT}`));
  if (between) {
    const lo = amount(between[1], between[2] ?? between[4]), hi = amount(between[3], between[4]);
    params.set('priceMin', String(Math.round(lo))); params.set('priceMax', String(Math.round(hi))); summary.push(`₹${between[1]}–${between[3]} ${between[4] ?? ''}`.trim());
  } else {
    if (under) { params.set('priceMax', String(Math.round(amount(under[1], under[2])))); summary.push(`under ₹${under[1]} ${under[2] ?? ''}`.trim()); }
    if (above) { params.set('priceMin', String(Math.round(amount(above[1], above[2])))); summary.push(`above ₹${above[1]} ${above[2] ?? ''}`.trim()); }
  }

  if (/ready to move|ready|immediate possession|move in/.test(q)) { params.set('possession', 'Ready to Move'); summary.push('Ready to move'); }
  else if (/under construction|ongoing/.test(q)) { params.set('possession', 'Under Construction'); summary.push('Under construction'); }
  if (/semi furnished|semi-furnished/.test(q)) { params.set('furnishing', 'Semi-Furnished'); summary.push('Semi-furnished'); }
  else if (/unfurnished/.test(q)) { params.set('furnishing', 'Unfurnished'); summary.push('Unfurnished'); }
  else if (/\bfurnished\b/.test(q)) { params.set('furnishing', 'Furnished'); summary.push('Furnished'); }
  if (/\bowner\b|no broker|without broker/.test(q)) { params.set('postedBy', 'Owner'); summary.push('Owner listings'); }
  if (/verified/.test(q)) { params.set('verified', '1'); summary.push('Verified'); }
  if (/cheap|lowest price|affordable|budget/.test(q) && !params.has('priceMax')) params.set('sort', 'price-asc');
  if (/latest|newest|recent/.test(q)) params.set('sort', 'newest');

  let url: string;
  if (mode === 'new-projects') {
    url = `/new-projects/${city.slug}${loc ? `?locality=${loc.slug}` : ''}`;
  } else {
    const qs = params.toString();
    url = `/${mode}/${city.slug}${loc ? `/${loc.slug}` : ''}${qs ? `?${qs}` : ''}`;
  }
  // Did the text say anything we understood? (Otherwise the result is just the fallback city.)
  const matched = namedPlace || namedMode || params.toString() !== '';
  return { url, summary, mode, city, matched };
}
