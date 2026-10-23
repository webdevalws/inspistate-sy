import type { Locality, PropertyType } from '../data/types';

export type Mode = 'buy' | 'rent' | 'commercial';
export const MODES: Record<Mode, { label: string; heading: (city: string) => string; purpose?: 'buy' | 'rent' }> = {
  buy: { label: 'Buy', heading: (c) => `Property for Sale in ${c}`, purpose: 'buy' },
  rent: { label: 'Rent', heading: (c) => `Property for Rent in ${c}`, purpose: 'rent' },
  commercial: { label: 'Commercial', heading: (c) => `Commercial Property in ${c}` },
};

export type Sort = 'relevance' | 'price-asc' | 'price-desc' | 'newest' | 'area-desc';
export const SORTS: { value: Sort; label: string }[] = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'newest', label: 'Newest first' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'area-desc', label: 'Largest area' },
];

export interface Filters {
  locality: string[];
  bhk: number[];
  type: PropertyType[];
  furnishing: string[];
  postedBy: string[];
  possession: string[];
  amenities: string[];
  priceMin?: number;
  priceMax?: number;
  areaMin?: number;
  areaMax?: number;
  commercialPurpose?: 'buy' | 'rent';
  verified: boolean;
  managed?: boolean;
  sort: Sort;
  page: number;
}

export const PAGE_SIZE = 12;

const list = (v: string | null) => (v ? v.split(',').filter(Boolean).slice(0, 20) : []);
const num = (v: string | null) => (v && !Number.isNaN(Number(v)) ? Number(v) : undefined);

const TYPE_SLUGS: Record<string, PropertyType> = {
  apartment: 'Apartment', 'builder-floor': 'Builder Floor', villa: 'Villa', plot: 'Plot', office: 'Office', shop: 'Shop',
};

/** Path slug for a property type ("Builder Floor" → "builder-floor"), the reverse of TYPE_SLUGS. */
export const typeSlug = (type: string) => Object.keys(TYPE_SLUGS).find((s) => TYPE_SLUGS[s] === type);

/** Query keys the filter panel owns; any others on the page (e.g. managed=1) are kept when filters change. */
export const FILTER_KEYS = ['locality', 'bhk', 'type', 'furnishing', 'postedBy', 'possession', 'amenities', 'priceMin', 'priceMax', 'areaMin', 'areaMax', 'for', 'verified', 'sort', 'page', 'q'];

/**
 * The URL for a set of filters: a single locality, BHK or type goes in the path (crawlable facet URLs such as
 * /buy/mumbai/powai/2-bhk/apartment, read back by parseFacets); several values, and everything else, go in
 * the query string.
 */
export function facetPath(basePath: string, f: { locality: string[]; bhk: number[]; type: string[] }, q: URLSearchParams) {
  const segs: string[] = [];
  if (f.locality.length === 1) segs.push(f.locality[0]); else if (f.locality.length) q.set('locality', f.locality.join(','));
  if (f.bhk.length === 1) segs.push(`${f.bhk[0]}-bhk`); else if (f.bhk.length) q.set('bhk', f.bhk.join(','));
  const ts = f.type.length === 1 ? typeSlug(f.type[0]) : undefined;
  if (ts) segs.push(ts); else if (f.type.length) q.set('type', f.type.join(','));
  const qs = q.toString();
  return `${[basePath, ...segs].join('/')}${qs ? `?${qs}` : ''}`;
}

const OVER_5_BHK = /^[6-9]-bhk$/;

/**
 * "5-bhk" is the top BHK option and means 5 BHK and above, so 6–9 BHK path segments are folded into it.
 * Returns the corrected segments (for a 301), or null when nothing needs changing.
 */
export function foldBhkSegments(segments: string[]): string[] | null {
  if (!segments.some((s) => OVER_5_BHK.test(s))) return null;
  const out = segments.map((s) => (OVER_5_BHK.test(s) ? '5-bhk' : s));
  return out.filter((s, i) => s !== '5-bhk' || out.indexOf(s) === i);
}

/** Facet path segments give crawlable URLs: /buy/mumbai/powai/2-bhk/apartment ("5-bhk" = 5 and above). */
export function parseFacets(segments: string[], localities: Locality[]) {
  const out: Pick<Filters, 'locality' | 'bhk' | 'type'> = { locality: [], bhk: [], type: [] };
  for (const s of segments) {
    const bhk = s.match(/^([1-5])-bhk$/);
    if (bhk) out.bhk.push(Number(bhk[1]));
    else if (Object.hasOwn(TYPE_SLUGS, s)) out.type.push(TYPE_SLUGS[s]); // hasOwn: "constructor" is not a type
    else if (localities.some((l) => l.slug === s)) out.locality.push(s);
    else return null;
  }
  return out;
}

export function parseFilters(url: URL, facets: Partial<Filters>): Filters {
  const q = url.searchParams;
  const sort = (q.get('sort') as Sort) || 'relevance';
  const purpose = q.get('for');
  return {
    locality: [...new Set([...(facets.locality ?? []), ...list(q.get('locality'))])],
    bhk: [...new Set([...(facets.bhk ?? []), ...list(q.get('bhk')).map(Number).filter((n) => n >= 1 && n <= 5)])],
    type: [...new Set([...(facets.type ?? []), ...(list(q.get('type')) as PropertyType[])])],
    furnishing: list(q.get('furnishing')),
    postedBy: list(q.get('postedBy')),
    possession: list(q.get('possession')),
    amenities: list(q.get('amenities')).slice(0, 8),
    priceMin: num(q.get('priceMin')),
    priceMax: num(q.get('priceMax')),
    areaMin: num(q.get('areaMin')),
    areaMax: num(q.get('areaMax')),
    commercialPurpose: purpose === 'buy' || purpose === 'rent' ? purpose : undefined,
    verified: q.get('verified') === '1',
    managed: q.get('managed') === '1',
    sort: SORTS.some((s) => s.value === sort) ? sort : 'relevance',
    page: Math.max(1, Math.floor(num(q.get('page')) ?? 1)),
  };
}

export const BUY_BUDGETS = [500000, 1000000, 2000000, 3000000, 5000000, 7500000, 10000000, 15000000, 20000000, 30000000, 50000000, 100000000];
export const RENT_BUDGETS = [5000, 10000, 15000, 20000, 30000, 50000, 75000, 100000, 150000, 250000, 500000];

/** Budget link bands as [min, max] (0 = open end), shared by the search page and the city hub. */
export const BUDGET_BANDS = {
  buy: [[0, 5000000], [5000000, 10000000], [10000000, 20000000], [20000000, 50000000], [50000000, 0]],
  rent: [[0, 15000], [15000, 30000], [30000, 50000], [50000, 100000], [100000, 0]],
} as const satisfies Record<'buy' | 'rent', readonly (readonly [number, number])[]>;
