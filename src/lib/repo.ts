// Data access backed by Cloudflare D1. Pages and API routes only talk to the database through here.
import { env } from 'cloudflare:workers';
import type {
  Builder, City, Lead, Listing, ListingStatus, Locality, PgFor, PgSharing, Project, ProjectDetail, UnitConfig,
} from '../data/types';
import type { Filters, Mode } from './search';
import { BUDGET_BANDS, MODES, PAGE_SIZE } from './search';

const db = () => env.DB;
const json = <T,>(s: unknown, fallback: T): T => {
  if (typeof s !== 'string') return fallback;
  try { return JSON.parse(s) as T; } catch { return fallback; }
};
type Row = Record<string, unknown>;

// ---------- reference data (cities, localities, builders) ----------
// Small and rarely changed, so cached per isolate for a few minutes.

export interface Refs {
  cities: City[];
  localities: Locality[];
  builders: Builder[];
  city(slug: string): City | undefined;
  locality(citySlug: string, slug: string): Locality | undefined;
  localitiesOf(citySlug: string): Locality[];
  builder(slug: string): Builder | undefined;
}

const REFS_TTL_MS = 5 * 60 * 1000;
let refsCache: { at: number; value: Promise<Refs> } | null = null;

export function getRefs(): Promise<Refs> {
  if (refsCache && Date.now() - refsCache.at < REFS_TTL_MS) return refsCache.value;
  const value = loadRefs();
  refsCache = { at: Date.now(), value };
  value.catch(() => (refsCache = null));
  return value;
}

async function loadRefs(): Promise<Refs> {
  const [c, l, b] = await db().batch([
    db().prepare('SELECT * FROM cities ORDER BY sort_order'),
    db().prepare('SELECT * FROM localities ORDER BY city_slug, name'),
    db().prepare('SELECT * FROM builders ORDER BY name'),
  ]);
  const cities: City[] = (c.results as Row[]).map((r) => ({
    slug: r.slug as string, name: r.name as string, state: r.state as string,
    stampDutyPct: r.stamp_duty_pct as number, lat: r.lat as number, lng: r.lng as number,
  }));
  const localities: Locality[] = (l.results as Row[]).map((r) => ({
    slug: r.slug as string, name: r.name as string, citySlug: r.city_slug as string,
    ratePerSqft: r.rate_per_sqft as number, rentPerSqft: r.rent_per_sqft as number,
    yoyGrowthPct: r.yoy_growth_pct as number, lat: r.lat as number, lng: r.lng as number,
  }));
  const builders: Builder[] = (b.results as Row[]).map((r) => ({
    slug: r.slug as string, name: r.name as string, founded: r.founded as number, hq: r.hq as string,
    delivered: r.delivered as number, ongoing: r.ongoing as number, about: r.about as string, hue: r.hue as number,
  }));
  return {
    cities, localities, builders,
    city: (slug) => cities.find((x) => x.slug === slug),
    locality: (citySlug, slug) => localities.find((x) => x.citySlug === citySlug && x.slug === slug),
    localitiesOf: (citySlug) => localities.filter((x) => x.citySlug === citySlug),
    builder: (slug) => builders.find((x) => x.slug === slug),
  };
}

// ---------- projects ----------

const toProject = (r: Row): Project => ({
  id: r.id as number, slug: r.slug as string, name: r.name as string,
  citySlug: r.city_slug as string, localitySlug: r.locality_slug as string, builderSlug: r.builder_slug as string,
  status: r.status as Project['status'], possession: r.possession as string, rera: r.rera as string,
  landAcres: r.land_acres as number, totalUnits: r.total_units as number, towers: r.towers as number, floors: r.floors as number,
  ratePerSqft: r.rate_per_sqft as number, priceMin: r.price_min as number, priceMax: r.price_max as number, bhkLabel: r.bhk_label as string,
  amenities: json(r.amenities, []), highlights: json(r.highlights, []), priceTrend: json(r.price_trend, []), nearby: json(r.nearby, []),
  hue: r.hue as number, launchedYear: r.launched_year as number,
});

export async function getProjects(
  filter: { citySlug?: string; builderSlug?: string; localitySlug?: string; status?: string } = {},
  opts: { limit?: number; orderBy?: 'newest' | 'default' } = {},
): Promise<Project[]> {
  const where: string[] = [];
  const args: unknown[] = [];
  const cols = { citySlug: 'city_slug', builderSlug: 'builder_slug', localitySlug: 'locality_slug', status: 'status' } as const;
  for (const [k, col] of Object.entries(cols)) {
    const v = filter[k as keyof typeof filter];
    if (v) { where.push(`${col} = ?`); args.push(v); }
  }
  const sql = `SELECT * FROM projects ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY ${opts.orderBy === 'newest' ? 'launched_year DESC, id' : 'id'} ${opts.limit ? `LIMIT ${Number(opts.limit)}` : ''}`;
  const { results } = await db().prepare(sql).bind(...args).all<Row>();
  return results.map(toProject);
}

export async function getProject(citySlug: string, slug: string): Promise<ProjectDetail | undefined> {
  const r = await db().prepare('SELECT * FROM projects WHERE city_slug = ? AND slug = ?').bind(citySlug, slug).first<Row>();
  if (!r) return undefined;
  const { results } = await db().prepare('SELECT bhk, label, carpet_sqft, price FROM project_units WHERE project_id = ? ORDER BY bhk, price').bind(r.id).all<Row>();
  const units: UnitConfig[] = results.map((u) => ({ bhk: u.bhk as number, label: u.label as string, carpetSqft: u.carpet_sqft as number, price: u.price as number }));
  return { ...toProject(r), units };
}

export async function getProjectsByIds(ids: number[]): Promise<Project[]> {
  if (!ids.length) return [];
  const { results } = await db().prepare(`SELECT * FROM projects WHERE id IN (${ids.map(() => '?').join(',')})`).bind(...ids).all<Row>();
  return results.map(toProject);
}

// ---------- listings ----------

const LISTING_SELECT = `
  SELECT l.*, p.name AS project_name, p.slug AS project_slug,
    (SELECT json_group_array(r2_key) FROM (SELECT r2_key FROM listing_photos ph WHERE ph.listing_id = l.id ORDER BY position)) AS photos
  FROM listings l LEFT JOIN projects p ON p.id = l.project_id`;

const toListing = (r: Row): Listing => ({
  id: r.id as number, purpose: r.purpose as Listing['purpose'], segment: r.segment as Listing['segment'],
  type: r.type as Listing['type'], bhk: r.bhk as number, bathrooms: r.bathrooms as number,
  areaSqft: r.area_sqft as number, price: r.price as number, citySlug: r.city_slug as string, localitySlug: r.locality_slug as string,
  projectId: (r.project_id as number) ?? null, projectName: (r.project_name as string) ?? null, projectSlug: (r.project_slug as string) ?? null,
  furnishing: r.furnishing as Listing['furnishing'], postedBy: r.posted_by as Listing['postedBy'], possession: r.possession as Listing['possession'],
  floor: r.floor as number, totalFloors: r.total_floors as number, facing: r.facing as string, ageYears: r.age_years as number,
  amenities: json(r.amenities, []), description: (r.description as string) ?? null, postedAt: r.posted_at as string,
  contactName: r.contact_name as string, verified: !!r.verified, status: r.status as ListingStatus,
  photos: json(r.photos, []), hue: r.hue as number,
  managed: !!r.managed, depositMonths: (r.deposit_months as number) ?? 2, availableFrom: (r.available_from as string) ?? null,
  pg: r.type === 'PG' && r.pg_sharing ? { sharing: r.pg_sharing as PgSharing, for: (r.pg_for as PgFor) ?? 'any', food: !!r.pg_food } : null,
});

/** WHERE clause for the active inventory of a search mode in a city (before user filters). */
function scope(mode: Mode, citySlug: string, commercialPurpose?: 'buy' | 'rent') {
  const where = ["l.status = 'active' AND l.closed IS NULL", 'l.city_slug = ?'];
  const args: unknown[] = [citySlug];
  if (mode === 'commercial') {
    where.push("l.segment = 'commercial'");
    if (commercialPurpose) { where.push('l.purpose = ?'); args.push(commercialPurpose); }
  } else {
    where.push("l.segment = 'residential'", 'l.purpose = ?');
    args.push(MODES[mode].purpose);
  }
  return { where, args };
}

const SORT_SQL: Record<Filters['sort'], string> = {
  relevance: 'l.verified DESC, l.posted_at DESC',
  newest: 'l.posted_at DESC',
  'price-asc': 'l.price ASC',
  'price-desc': 'l.price DESC',
  'area-desc': 'l.area_sqft DESC',
};

export async function searchListings(mode: Mode, citySlug: string, f: Filters) {
  const { where, args } = scope(mode, citySlug, f.commercialPurpose);
  const inList = (col: string, vals: (string | number)[]) => {
    if (!vals.length) return;
    where.push(`${col} IN (${vals.map(() => '?').join(',')})`);
    args.push(...vals);
  };
  inList('l.locality_slug', f.locality);
  inList('l.type', f.type);
  inList('l.furnishing', f.furnishing);
  inList('l.posted_by', f.postedBy);
  inList('l.possession', f.possession);
  inList('l.pg_sharing', f.pgSharing);
  inList('l.pg_for', f.pgFor);
  if (f.pgFood) where.push('l.pg_food = 1');
  if (f.bhk.length) {
    // "5" in the UI means 5 BHK and above.
    const exact = f.bhk.filter((b) => b < 5);
    const parts = [];
    if (exact.length) { parts.push(`l.bhk IN (${exact.map(() => '?').join(',')})`); args.push(...exact); }
    if (f.bhk.includes(5)) parts.push('l.bhk >= 5');
    where.push(`(${parts.join(' OR ')})`);
  }
  const range = (col: string, min?: number, max?: number) => {
    if (min !== undefined) { where.push(`${col} >= ?`); args.push(min); }
    if (max !== undefined) { where.push(`${col} <= ?`); args.push(max); }
  };
  range('l.price', f.priceMin, f.priceMax);
  range('l.area_sqft', f.areaMin, f.areaMax);
  for (const a of f.amenities) { where.push('EXISTS (SELECT 1 FROM json_each(l.amenities) WHERE value = ?)'); args.push(a); }
  if (f.verified) where.push('l.verified = 1');
  if (f.managed) where.push('l.managed = 1');

  const whereSql = where.join(' AND ');
  const total = (await db().prepare(`SELECT count(*) AS n FROM listings l WHERE ${whereSql}`).bind(...args).first<number>('n')) ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(f.page, pages);
  const { results } = await db()
    .prepare(`${LISTING_SELECT} WHERE ${whereSql} ORDER BY ${SORT_SQL[f.sort]}, l.id LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`)
    .bind(...args)
    .all<Row>();
  return { items: results.map(toListing), total, page, pages };
}

/** Market snapshot for a search scope, computed on the unfiltered inventory. */
export async function marketStats(mode: Mode, citySlug: string, commercialPurpose?: 'buy' | 'rent') {
  const { where, args } = scope(mode, citySlug, commercialPurpose);
  const w = where.join(' AND ');
  const [overall, byBhk, byType, byFurnishing] = await db().batch([
    // PG rents are per bed, so PGs are left out of the per-sq.ft average.
    db().prepare(`SELECT count(*) AS n, avg(CASE WHEN type != 'PG' THEN 1.0 * price / area_sqft END) AS rate, min(price) AS lo, max(price) AS hi FROM listings l WHERE ${w}`).bind(...args),
    db().prepare(`SELECT bhk, count(*) AS n, avg(price) AS avg FROM listings l WHERE ${w} AND bhk BETWEEN 1 AND 4 GROUP BY bhk ORDER BY bhk`).bind(...args),
    db().prepare(`SELECT type AS k, count(*) AS n, avg(price) AS avg FROM listings l WHERE ${w} GROUP BY type ORDER BY n DESC`).bind(...args),
    db().prepare(`SELECT furnishing AS k, count(*) AS n, avg(price) AS avg FROM listings l WHERE ${w} AND type != 'Plot' GROUP BY furnishing ORDER BY n DESC`).bind(...args),
  ]);
  const group = (res: D1Result) => (res.results as Row[]).map((r) => ({ key: r.k as string, count: r.n as number, avg: r.avg as number }));
  const o = (overall.results as Row[])[0];
  return {
    count: o.n as number,
    avgRate: (o.rate as number) ?? 0,
    min: (o.lo as number) ?? 0,
    max: (o.hi as number) ?? 0,
    byBhk: (byBhk.results as Row[]).map((r) => ({ bhk: r.bhk as number, count: r.n as number, avg: r.avg as number })),
    byType: group(byType),
    byFurnishing: group(byFurnishing),
  };
}

/** Active listing by id; a pending listing is returned only with its owner's edit token. Sold, rented or deleted listings are gone. */
export async function getListing(id: number, editToken?: string | null): Promise<Listing | undefined> {
  const r = await db().prepare(`${LISTING_SELECT} WHERE l.id = ?`).bind(id).first<Row>();
  if (!r || r.closed) return undefined;
  if (r.status !== 'active' && (!editToken || editToken !== r.edit_token)) return undefined;
  return toListing(r);
}

export async function getListingsByIds(ids: number[]): Promise<Listing[]> {
  if (!ids.length) return [];
  const { results } = await db().prepare(`${LISTING_SELECT} WHERE l.status = 'active' AND l.closed IS NULL AND l.id IN (${ids.map(() => '?').join(',')})`).bind(...ids).all<Row>();
  return results.map(toListing);
}

export async function getSimilarListings(l: Listing, limit = 3): Promise<Listing[]> {
  const { results } = await db()
    .prepare(`${LISTING_SELECT} WHERE l.status = 'active' AND l.closed IS NULL AND l.id != ? AND l.city_slug = ? AND l.purpose = ? AND l.segment = ? AND abs(l.bhk - ?) <= 1
        AND (l.type = 'PG') = (? = 'PG')
      ORDER BY abs(l.price - ?) LIMIT ?`)
    .bind(l.id, l.citySlug, l.purpose, l.segment, l.bhk, l.type, l.price, limit)
    .all<Row>();
  return results.map(toListing);
}

export async function getProjectListings(projectId: number, limit = 3): Promise<Listing[]> {
  const { results } = await db().prepare(`${LISTING_SELECT} WHERE l.status = 'active' AND l.closed IS NULL AND l.project_id = ? ORDER BY l.posted_at DESC LIMIT ?`).bind(projectId, limit).all<Row>();
  return results.map(toListing);
}

// ---------- stats ----------

export async function cityStats() {
  const [l, p] = await db().batch([
    db().prepare(`SELECT city_slug, count(*) AS total, sum(purpose = 'buy') AS sale, sum(purpose = 'rent') AS rent,
      avg(CASE WHEN purpose = 'buy' AND segment = 'residential' THEN 1.0 * price / area_sqft END) AS rate
      FROM listings WHERE status = 'active' AND closed IS NULL GROUP BY city_slug`),
    db().prepare('SELECT city_slug, count(*) AS n FROM projects GROUP BY city_slug'),
  ]);
  const projects = new Map((p.results as Row[]).map((r) => [r.city_slug as string, r.n as number]));
  const out = new Map<string, { total: number; forSale: number; forRent: number; projects: number; avgRate: number }>();
  for (const r of l.results as Row[]) {
    out.set(r.city_slug as string, {
      total: r.total as number, forSale: r.sale as number, forRent: r.rent as number,
      projects: projects.get(r.city_slug as string) ?? 0, avgRate: (r.rate as number) ?? 0,
    });
  }
  return (slug: string) => out.get(slug) ?? { total: 0, forSale: 0, forRent: 0, projects: projects.get(slug) ?? 0, avgRate: 0 };
}

/** Listing counts per city for the header city picker; cached like reference data. */
let cityCountCache: { at: number; value: Promise<Record<string, number>> } | null = null;
export function cityListingCounts(): Promise<Record<string, number>> {
  if (cityCountCache && Date.now() - cityCountCache.at < REFS_TTL_MS) return cityCountCache.value;
  const value = db()
    .prepare("SELECT city_slug, count(*) AS n FROM listings WHERE status = 'active' AND closed IS NULL GROUP BY city_slug")
    .all<{ city_slug: string; n: number }>()
    .then(({ results }) => Object.fromEntries(results.map((r) => [r.city_slug, r.n])));
  cityCountCache = { at: Date.now(), value };
  value.catch(() => (cityCountCache = null));
  return value;
}

// ---------- city hub facets ----------

/** One group of a city's live listings: purpose × segment × type × BHK (5 = 5+) × locality × budget band. */
export interface FacetRow { purpose: 'buy' | 'rent'; segment: 'residential' | 'commercial'; type: string; bhk: number; locality: string; band: number; n: number; ready: number; rateSum: number }
export type FacetFilter = Partial<Pick<FacetRow, 'purpose' | 'segment' | 'type' | 'bhk' | 'locality' | 'band'>>;
export interface CityFacets {
  rows: FacetRow[];
  /** Live listings matching the filter. */
  count(f: FacetFilter): number;
  /** Of those, how many are ready to move. */
  ready(f: FacetFilter): number;
  /** Average price (or monthly rent) per sq ft of those, or 0. PGs (rent per bed) count only when asked for by type. */
  avgRate(f: FacetFilter): number;
}

const bandCase = (bands: readonly (readonly [number, number])[]) =>
  `CASE ${bands.slice(0, -1).map(([, hi], i) => `WHEN price <= ${Number(hi)} THEN ${i}`).join(' ')} ELSE ${bands.length - 1} END`;
const facetCache = new Map<string, { at: number; value: Promise<CityFacets> }>();

/**
 * Counts of a city's live listings by purpose, segment, type, BHK, locality and budget band (bands match
 * BUDGET_BANDS), plus ready-to-move counts and rate sums. One grouped query per city, cached per isolate for
 * 5 minutes like reference data. Used by the city hub to build links that never lead to empty pages.
 */
export function cityFacets(citySlug: string): Promise<CityFacets> {
  const hit = facetCache.get(citySlug);
  if (hit && Date.now() - hit.at < REFS_TTL_MS) return hit.value;
  const value = db()
    .prepare(`SELECT purpose, segment, type, min(bhk, 5) AS bhk, locality_slug AS locality,
        CASE WHEN purpose = 'buy' THEN ${bandCase(BUDGET_BANDS.buy)} ELSE ${bandCase(BUDGET_BANDS.rent)} END AS band,
        count(*) AS n, sum(possession = 'Ready to Move') AS ready, sum(1.0 * price / area_sqft) AS rateSum
      FROM listings WHERE status = 'active' AND closed IS NULL AND city_slug = ?
      GROUP BY 1, 2, 3, 4, 5, 6`)
    .bind(citySlug)
    .all<FacetRow>()
    .then(({ results }) => {
      const match = (f: FacetFilter) => results.filter((r) => (Object.keys(f) as (keyof FacetFilter)[]).every((k) => f[k] === undefined || r[k] === f[k]));
      const sum = (rows: FacetRow[], k: 'n' | 'ready' | 'rateSum') => rows.reduce((s, r) => s + (r[k] ?? 0), 0);
      return {
        rows: results,
        count: (f) => sum(match(f), 'n'),
        ready: (f) => sum(match(f), 'ready'),
        avgRate: (f) => { const m = match(f).filter((r) => f.type === 'PG' || r.type !== 'PG'); const n = sum(m, 'n'); return n ? sum(m, 'rateSum') / n : 0; },
      } satisfies CityFacets;
    });
  facetCache.set(citySlug, { at: Date.now(), value });
  value.catch(() => facetCache.delete(citySlug));
  return value;
}

export async function platformTotals() {
  const r = await db()
    .prepare(`SELECT (SELECT count(*) FROM listings WHERE status = 'active' AND closed IS NULL) AS listings, (SELECT count(*) FROM projects) AS projects,
      (SELECT count(*) FROM builders) AS builders, (SELECT count(*) FROM cities) AS cities, (SELECT count(*) FROM localities) AS localities`)
    .first<Record<string, number>>();
  return r!;
}

export async function countProjectsByBuilder(): Promise<Map<string, number>> {
  const { results } = await db().prepare('SELECT builder_slug, count(*) AS n FROM projects GROUP BY builder_slug').all<Row>();
  return new Map(results.map((r) => [r.builder_slug as string, r.n as number]));
}

// ---------- writes ----------

export const LEAD_KINDS = ['enquiry', 'callback', 'view-number', 'brochure', 'service', 'chat'] as const;
export type LeadKind = (typeof LEAD_KINDS)[number];

export async function createLead(lead: Omit<Lead, 'id' | 'createdAt'> & { kind: LeadKind; userId: number | null }): Promise<number> {
  const r = await db()
    .prepare('INSERT INTO leads (name, phone, email, subject, page, listing_id, project_id, kind, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id')
    .bind(lead.name, lead.phone, lead.email, lead.subject, lead.page, lead.listingId, lead.projectId, lead.kind, lead.userId)
    .first<number>('id');
  return r!;
}

/** Contact details revealed after a "View Number" lead. Seeded demo listings have no real phone. */
export async function listingContact(id: number) {
  return db().prepare("SELECT contact_name, contact_phone, posted_by FROM listings WHERE id = ? AND status = 'active' AND closed IS NULL").bind(id).first<{ contact_name: string; contact_phone: string | null; posted_by: string }>();
}

export interface NewListing {
  purpose: 'buy' | 'rent';
  segment: 'residential' | 'commercial';
  type: string;
  bhk: number;
  areaSqft: number;
  price: number;
  citySlug: string;
  localitySlug: string;
  furnishing: string;
  description: string | null;
  contactName: string;
  contactPhone: string;
  userId: number | null;
  postedBy?: 'Owner' | 'Agent';
  /** PG / co-living details; null unless type is PG. */
  pgSharing: string | null;
  pgFor: string | null;
  pgFood: number | null;
}

export async function createListing(l: NewListing): Promise<{ id: number; editToken: string }> {
  const editToken = crypto.randomUUID().replace(/-/g, '');
  const id = await db()
    .prepare(`INSERT INTO listings (purpose, segment, type, bhk, bathrooms, area_sqft, price, city_slug, locality_slug, furnishing,
        posted_by, possession, description, contact_name, contact_phone, status, edit_token, hue, user_id, pg_sharing, pg_for, pg_food)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Ready to Move', ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?) RETURNING id`)
    .bind(l.purpose, l.segment, l.type, l.bhk, Math.max(l.bhk ? 1 : 0, l.bhk - 1), l.areaSqft, l.price, l.citySlug, l.localitySlug,
      l.furnishing, l.postedBy ?? 'Owner', l.description, l.contactName, l.contactPhone, editToken, 150 + Math.floor(Math.random() * 110), l.userId, l.pgSharing, l.pgFor, l.pgFood)
    .first<number>('id');
  return { id: id!, editToken };
}

export async function addListingPhotos(listingId: number, keys: string[]) {
  if (!keys.length) return;
  await db().batch(keys.map((k, i) => db().prepare('INSERT INTO listing_photos (listing_id, r2_key, position) VALUES (?, ?, ?)').bind(listingId, k, i)));
}

// ---------- owner listing management ----------

export type ClosedAs = 'sold' | 'rented' | 'deleted';

/** A listing's editable fields plus ownership and lifecycle, for the owner's edit / close actions. */
export async function getOwnedListing(id: number) {
  return db()
    .prepare(`SELECT id, user_id, purpose, segment, type, bhk, area_sqft, price, city_slug, locality_slug, furnishing, description,
        contact_name, contact_phone, status, closed, edit_token, pg_sharing, pg_for, pg_food FROM listings WHERE id = ?`)
    .bind(id)
    .first<{ id: number; user_id: number | null; purpose: 'buy' | 'rent'; segment: 'residential' | 'commercial'; type: string; bhk: number; area_sqft: number; price: number;
      city_slug: string; locality_slug: string; furnishing: string; description: string | null; contact_name: string; contact_phone: string | null;
      status: ListingStatus; closed: ClosedAs | null; edit_token: string | null; pg_sharing: string | null; pg_for: string | null; pg_food: number | null }>();
}

/** Saves an owner's edit. Any edit goes back to review (pending, not verified), even for a live listing. */
export async function updateListing(id: number, f: Omit<NewListing, 'userId' | 'postedBy'>) {
  await db()
    .prepare(`UPDATE listings SET purpose = ?, segment = ?, type = ?, bhk = ?, area_sqft = ?, price = ?, city_slug = ?, locality_slug = ?,
        furnishing = ?, description = ?, contact_name = ?, contact_phone = ?, pg_sharing = ?, pg_for = ?, pg_food = ?, status = 'pending', verified = 0
      WHERE id = ? AND closed IS NULL`)
    .bind(f.purpose, f.segment, f.type, f.bhk, f.areaSqft, f.price, f.citySlug, f.localitySlug, f.furnishing, f.description, f.contactName, f.contactPhone,
      f.pgSharing, f.pgFor, f.pgFood, id)
    .run();
}

/** Marks a listing sold, rented or deleted (soft: leads and photos keep pointing at it). False if it was already closed. */
export async function closeListing(id: number, as: ClosedAs): Promise<boolean> {
  const r = await db()
    .prepare("UPDATE listings SET closed = ?, closed_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ? AND closed IS NULL")
    .bind(as, id)
    .run();
  return (r.meta.changes ?? 0) > 0;
}

// ---------- admin ----------

export async function recentLeads(limit = 100): Promise<(Lead & { listingTitle: string | null; projectName: string | null; kind: string })[]> {
  const { results } = await db()
    .prepare(`SELECT ld.*, p.name AS project_name, l.type AS l_type, l.bhk AS l_bhk, l.locality_slug AS l_loc
      FROM leads ld LEFT JOIN projects p ON p.id = ld.project_id LEFT JOIN listings l ON l.id = ld.listing_id
      ORDER BY ld.id DESC LIMIT ?`)
    .bind(limit)
    .all<Row>();
  return results.map((r) => ({
    id: r.id as number, name: r.name as string, phone: r.phone as string, email: (r.email as string) ?? null,
    subject: r.subject as string, page: (r.page as string) ?? null, listingId: (r.listing_id as number) ?? null,
    projectId: (r.project_id as number) ?? null, createdAt: r.created_at as string,
    projectName: (r.project_name as string) ?? null,
    kind: (r.kind as string) ?? 'enquiry',
    listingTitle: r.listing_id ? `#${r.listing_id}` : null,
  }));
}

export async function listingsByStatus(status: ListingStatus, limit = 100): Promise<(Listing & { contactPhone: string | null; editToken: string | null })[]> {
  // Agents on an active plan get priority review: their listings sort first.
  const { results } = await db()
    .prepare(`${LISTING_SELECT} WHERE l.status = ? AND l.closed IS NULL
      ORDER BY EXISTS (SELECT 1 FROM subscriptions s WHERE s.user_id = l.user_id AND s.status = 'active' AND s.ends_at > strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) DESC, l.id DESC LIMIT ?`)
    .bind(status, limit).all<Row>();
  return results.map((r) => ({ ...toListing(r), contactPhone: (r.contact_phone as string) ?? null, editToken: (r.edit_token as string) ?? null }));
}

export async function setListingStatus(id: number, status: ListingStatus) {
  await db().prepare('UPDATE listings SET status = ?, verified = ? WHERE id = ?').bind(status, status === 'active' ? 1 : 0, id).run();
}

export async function adminCounts() {
  const r = await db()
    .prepare(`SELECT (SELECT count(*) FROM leads) AS leads, (SELECT count(*) FROM leads WHERE created_at >= datetime('now', '-1 day')) AS leads24,
      (SELECT count(*) FROM listings WHERE status = 'pending' AND closed IS NULL) AS pending, (SELECT count(*) FROM listings WHERE status = 'active' AND closed IS NULL) AS active`)
    .first<Row>();
  return { leads: r!.leads as number, leads24: r!.leads24 as number, pending: r!.pending as number, active: r!.active as number };
}

export const sitemapData = async () => {
  const [p, l] = await db().batch([
    db().prepare('SELECT city_slug, slug FROM projects'),
    db().prepare("SELECT id, posted_at FROM listings WHERE status = 'active' AND closed IS NULL ORDER BY id"),
  ]);
  return { projects: p.results as Row[], listings: l.results as Row[] };
};

/** Projects in a city with their unit configurations (affordability recommendations). */
export async function projectsWithUnits(citySlug: string) {
  const projects = await getProjects({ citySlug });
  if (!projects.length) return [];
  const ids = projects.map((p) => p.id);
  const { results } = await db()
    .prepare(`SELECT project_id, bhk, carpet_sqft, price FROM project_units WHERE project_id IN (${ids.map(() => '?').join(',')}) ORDER BY price`)
    .bind(...ids)
    .all<{ project_id: number; bhk: number; carpet_sqft: number; price: number }>();
  return projects.map((p) => ({ ...p, units: results.filter((u) => u.project_id === p.id).map((u) => ({ bhk: u.bhk, carpetSqft: u.carpet_sqft, price: u.price })) }));
}
