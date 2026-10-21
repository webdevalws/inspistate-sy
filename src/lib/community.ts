// Reviews, registered transactions and locality insights.
import { env } from 'cloudflare:workers';
import type { Locality } from '../data/types';

const db = () => env.DB;

export interface Review {
  id: number; author: string; rating: number; connectivity: number | null; amenities: number | null;
  construction: number | null; body: string; residentType: string | null; createdAt: string;
}

export async function projectReviews(projectId: number) {
  const [list, agg] = await db().batch([
    db().prepare("SELECT * FROM reviews WHERE project_id = ? AND status = 'published' ORDER BY created_at DESC LIMIT 20").bind(projectId),
    db().prepare(`SELECT count(*) AS n, avg(rating) AS rating, avg(connectivity) AS connectivity, avg(amenities) AS amenities, avg(construction) AS construction,
      sum(rating = 5) AS r5, sum(rating = 4) AS r4, sum(rating = 3) AS r3, sum(rating = 2) AS r2, sum(rating = 1) AS r1
      FROM reviews WHERE project_id = ? AND status = 'published'`).bind(projectId),
  ]);
  const a = (agg.results as Record<string, number>[])[0];
  return {
    reviews: (list.results as Record<string, unknown>[]).map((r) => ({
      id: r.id as number, author: r.author as string, rating: r.rating as number, connectivity: r.connectivity as number | null,
      amenities: r.amenities as number | null, construction: r.construction as number | null, body: r.body as string,
      residentType: r.resident_type as string | null, createdAt: r.created_at as string,
    })) as Review[],
    summary: {
      count: a.n ?? 0, rating: a.rating ?? 0, connectivity: a.connectivity ?? 0, amenities: a.amenities ?? 0, construction: a.construction ?? 0,
      distribution: [a.r5 ?? 0, a.r4 ?? 0, a.r3 ?? 0, a.r2 ?? 0, a.r1 ?? 0],
    },
  };
}

export async function ratingsFor(projectIds: number[]): Promise<Map<number, { rating: number; count: number }>> {
  if (!projectIds.length) return new Map();
  const { results } = await db()
    .prepare(`SELECT project_id, avg(rating) AS rating, count(*) AS n FROM reviews WHERE status = 'published' AND project_id IN (${projectIds.map(() => '?').join(',')}) GROUP BY project_id`)
    .bind(...projectIds)
    .all<{ project_id: number; rating: number; n: number }>();
  return new Map(results.map((r) => [r.project_id, { rating: r.rating, count: r.n }]));
}

export async function createReview(r: { projectId: number; userId: number | null; author: string; rating: number; connectivity: number | null; amenities: number | null; construction: number | null; body: string; residentType: string | null }) {
  await db()
    .prepare('INSERT INTO reviews (project_id, user_id, author, rating, connectivity, amenities, construction, body, resident_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(r.projectId, r.userId, r.author, r.rating, r.connectivity, r.amenities, r.construction, r.body, r.residentType)
    .run();
}

export async function projectTransactions(projectId: number) {
  const { results } = await db()
    .prepare('SELECT registered_on, tower, floor, unit, area_sqft, price FROM transactions WHERE project_id = ? ORDER BY registered_on DESC LIMIT 15')
    .bind(projectId)
    .all<{ registered_on: string; tower: string; floor: number; unit: string; area_sqft: number; price: number }>();
  return results;
}

/** Listing counts and averages per locality for a city, used by rates, heatmap and guides. */
export async function localityMarket(citySlug: string) {
  const { results } = await db()
    .prepare(`SELECT locality_slug, count(*) AS n,
        sum(purpose = 'buy') AS sale, sum(purpose = 'rent') AS rent,
        avg(CASE WHEN purpose = 'buy' AND segment = 'residential' THEN 1.0 * price / area_sqft END) AS sale_rate,
        avg(CASE WHEN purpose = 'rent' AND segment = 'residential' THEN 1.0 * price / area_sqft END) AS rent_rate,
        min(CASE WHEN purpose = 'buy' THEN price END) AS min_price
      FROM listings WHERE status = 'active' AND city_slug = ? GROUP BY locality_slug`)
    .bind(citySlug)
    .all<{ locality_slug: string; n: number; sale: number; rent: number; sale_rate: number | null; rent_rate: number | null; min_price: number | null }>();
  return new Map(results.map((r) => [r.locality_slug, r]));
}

/** Locality guide themes, each a transparent scoring rule over our own data. */
export const GUIDE_THEMES = {
  affordable: { title: 'Affordable localities', blurb: 'Lowest average price per sq.ft in the city.', score: (l: Locality) => -l.ratePerSqft },
  emerging: { title: 'Emerging localities', blurb: 'Fastest year-on-year price growth.', score: (l: Locality) => l.yoyGrowthPct },
  premium: { title: 'Premium localities', blurb: 'Highest average price per sq.ft.', score: (l: Locality) => l.ratePerSqft },
  'rental-yield': { title: 'High rental-yield localities', blurb: 'Best annual rent as a share of purchase price.', score: (l: Locality) => (l.rentPerSqft * 12) / l.ratePerSqft },
} as const;
export type GuideTheme = keyof typeof GUIDE_THEMES;

/** Everything the home page "insights" and "reviews" panels need, in one round trip. */
export async function homeInsights() {
  const [rates, tx, latest, overall] = await db().batch([
    db().prepare("SELECT city_slug, 1.0 * price / area_sqft AS rate FROM listings WHERE status = 'active' AND purpose = 'buy' AND segment = 'residential'"),
    db().prepare(`SELECT p.city_slug, count(*) AS n, sum(t.price) AS value, 1.0 * sum(t.price) / sum(t.area_sqft) AS rate, min(t.registered_on) AS first, max(t.registered_on) AS last
      FROM transactions t JOIN projects p ON p.id = t.project_id GROUP BY p.city_slug`),
    db().prepare(`SELECT r.author, r.rating, r.body, r.created_at, r.resident_type, p.name AS project, p.slug, p.city_slug
      FROM reviews r JOIN projects p ON p.id = r.project_id WHERE r.status = 'published' ORDER BY r.created_at DESC LIMIT 6`),
    db().prepare("SELECT avg(rating) AS rating, count(*) AS n FROM reviews WHERE status = 'published'"),
  ]);
  const ratesByCity = new Map<string, number[]>();
  for (const row of rates.results as { city_slug: string; rate: number }[]) {
    (ratesByCity.get(row.city_slug) ?? ratesByCity.set(row.city_slug, []).get(row.city_slug)!).push(row.rate);
  }
  const txByCity = new Map((tx.results as { city_slug: string; n: number; value: number; rate: number; first: string; last: string }[]).map((t) => [t.city_slug, t]));
  const o = (overall.results as { rating: number; n: number }[])[0];
  return {
    /** Listing counts in 6 equal-width rate buckets for the asking-price histogram. */
    histogram(city: string) {
      const vals = ratesByCity.get(city) ?? [];
      if (!vals.length) return { buckets: [] as { label: string; n: number }[], median: 0, count: 0 };
      const sorted = [...vals].sort((a, b) => a - b);
      const lo = sorted[0], hi = sorted.at(-1)!, step = (hi - lo) / 6 || 1;
      const k = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(0)}K` : n.toFixed(0));
      const buckets = Array.from({ length: 6 }, (_, i) => ({ label: `${k(lo + i * step)}–${k(lo + (i + 1) * step)}`, n: 0 }));
      for (const v of vals) buckets[Math.min(5, Math.floor((v - lo) / step))].n++;
      return { buckets, median: sorted[Math.floor(sorted.length / 2)], count: vals.length };
    },
    registrations: (city: string) => txByCity.get(city),
    reviews: latest.results as { author: string; rating: number; body: string; created_at: string; resident_type: string | null; project: string; slug: string; city_slug: string }[],
    overall: { rating: o.rating ?? 0, count: o.n ?? 0 },
  };
}

/** Agents are derived from the contact names on agent-posted listings. */
export async function agentsDirectory(citySlug?: string) {
  const { results } = await db()
    .prepare(`SELECT contact_name AS name, city_slug, count(*) AS listings, sum(verified) AS verified,
        sum(purpose = 'buy') AS sale, sum(purpose = 'rent') AS rent, group_concat(DISTINCT locality_slug) AS localities
      FROM listings WHERE status = 'active' AND posted_by = 'Agent' ${citySlug ? 'AND city_slug = ?' : ''}
      GROUP BY contact_name, city_slug ORDER BY listings DESC, name LIMIT 60`)
    .bind(...(citySlug ? [citySlug] : []))
    .all<{ name: string; city_slug: string; listings: number; verified: number; sale: number; rent: number; localities: string }>();
  return results.map((r) => ({ ...r, localities: r.localities.split(',') }));
}

/** Data for the home page "discover", "localities" and transactions-trend panels. */
export async function homeMarket() {
  const [cats, locs, tx] = await db().batch([
    db().prepare(`SELECT city_slug, segment, type, bhk, min(price) AS mn, count(*) AS n FROM listings
      WHERE status = 'active' AND purpose = 'buy' GROUP BY city_slug, segment, type, bhk`),
    db().prepare(`SELECT city_slug, locality_slug, min(price) AS mn, max(price) AS mx, count(*) AS n FROM listings
      WHERE status = 'active' AND purpose = 'buy' AND segment = 'residential' GROUP BY city_slug, locality_slug`),
    db().prepare(`SELECT p.city_slug, substr(t.registered_on, 1, 4) || '-Q' || ((cast(substr(t.registered_on, 6, 2) AS integer) + 2) / 3) AS q, count(*) AS n
      FROM transactions t JOIN projects p ON p.id = t.project_id GROUP BY p.city_slug, q ORDER BY q`),
  ]);
  const catRows = cats.results as { city_slug: string; segment: string; type: string; bhk: number; mn: number; n: number }[];
  const locRows = locs.results as { city_slug: string; locality_slug: string; mn: number; mx: number; n: number }[];
  const txRows = tx.results as { city_slug: string; q: string; n: number }[];
  return {
    /** Cheapest listing and count for a predicate within a city (or all cities). */
    from(pred: (r: (typeof catRows)[number]) => boolean, city?: string) {
      const rows = catRows.filter((r) => (!city || r.city_slug === city) && pred(r));
      return rows.length ? { min: Math.min(...rows.map((r) => r.mn)), count: rows.reduce((s, r) => s + r.n, 0) } : null;
    },
    locality: (city: string, slug: string) => locRows.find((r) => r.city_slug === city && r.locality_slug === slug),
    txQuarters: (city: string) => txRows.filter((r) => r.city_slug === city).map((r) => ({ label: r.q.replace(/^\d\d(\d\d)-/, "'$1 "), v: r.n })),
  };
}

/** Per-locality average sale price and monthly rent by BHK, from live residential listings. */
export async function livingData(citySlug: string) {
  const { results } = await db()
    .prepare(`SELECT locality_slug, purpose, min(bhk, 4) AS bhk, avg(price) AS avg, avg(1.0 * price / area_sqft) AS per_sqft, count(*) AS n
      FROM listings WHERE status = 'active' AND segment = 'residential' AND city_slug = ? AND bhk > 0 GROUP BY locality_slug, purpose, min(bhk, 4)`)
    .bind(citySlug)
    .all<{ locality_slug: string; purpose: 'buy' | 'rent'; bhk: number; avg: number; per_sqft: number; n: number }>();
  return results;
}

/** A few live rentals matching a locality and BHK, newest first. */
export async function sampleRentals(citySlug: string, localitySlug: string, bhk: number, limit = 4) {
  const { results } = await db()
    .prepare(`SELECT id, bhk, type, area_sqft, price, furnishing, locality_slug FROM listings
      WHERE status = 'active' AND purpose = 'rent' AND segment = 'residential' AND city_slug = ? AND locality_slug = ? AND min(bhk, 4) = ?
      ORDER BY posted_at DESC LIMIT ?`)
    .bind(citySlug, localitySlug, Math.min(bhk, 4), limit)
    .all<{ id: number; bhk: number; type: string; area_sqft: number; price: number; furnishing: string; locality_slug: string }>();
  return results;
}
