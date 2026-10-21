// Platform reviews (migration 0009) plus published project reviews, for the /reviews page.
import { env } from 'cloudflare:workers';

export const REVIEW_SERVICES = { buying: 'Buying', renting: 'Renting', selling: 'Selling', 'home-loans': 'Home loans', interiors: 'Interiors', 'home-services': 'Home services', legal: 'Legal services' } as const;
export type ReviewService = keyof typeof REVIEW_SERVICES;
export const PAGE_SIZE = 20;

export interface ShownReview { author: string; rating: number; title: string | null; body: string; source: string; city: string | null; createdAt: string; project?: { name: string; url: string } }

/** Union of platform reviews and project reviews, filtered by source ('projects' or a service) and city. */
export async function listReviews(opts: { source?: string; city?: string; page: number }) {
  const parts: string[] = [], args: (string | number)[] = [];
  const wantPlatform = !opts.source || opts.source in REVIEW_SERVICES;
  const wantProjects = !opts.source || opts.source === 'projects';
  if (wantPlatform) {
    let w = "status = 'published'";
    if (opts.source) { w += ' AND service = ?'; args.push(opts.source); }
    if (opts.city) { w += ' AND city_slug = ?'; args.push(opts.city); }
    parts.push(`SELECT author, rating, title, body, service AS source, city_slug AS city, created_at, NULL AS project_name, NULL AS project_url FROM platform_reviews WHERE ${w}`);
  }
  if (wantProjects) {
    let w = "r.status = 'published'";
    if (opts.city) { w += ' AND p.city_slug = ?'; args.push(opts.city); }
    parts.push(`SELECT r.author, r.rating, NULL AS title, r.body, 'projects' AS source, p.city_slug AS city, r.created_at, p.name AS project_name, '/projects/' || p.city_slug || '/' || p.slug AS project_url FROM reviews r JOIN projects p ON p.id = r.project_id WHERE ${w}`);
  }
  const union = parts.join(' UNION ALL ');
  const db = env.DB;
  const stats = await db.prepare(`SELECT count(*) AS n, avg(rating) AS avg, sum(rating = 5) AS r5, sum(rating = 4) AS r4, sum(rating = 3) AS r3, sum(rating = 2) AS r2, sum(rating = 1) AS r1 FROM (${union})`).bind(...args).first<Record<string, number>>();
  const total = stats?.n ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, opts.page), pages);
  const { results } = await db.prepare(`SELECT * FROM (${union}) ORDER BY created_at DESC LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`).bind(...args).all<Record<string, string | number | null>>();
  const reviews: ShownReview[] = results.map((r) => ({
    author: String(r.author), rating: Number(r.rating), title: (r.title as string) ?? null, body: String(r.body), source: String(r.source),
    city: (r.city as string) ?? null, createdAt: String(r.created_at), project: r.project_name ? { name: String(r.project_name), url: String(r.project_url) } : undefined,
  }));
  const dist = [5, 4, 3, 2, 1].map((s) => ({ stars: s, count: Number(stats?.[`r${s}`] ?? 0) }));
  return { reviews, total, page, pages, avg: total ? Number(stats?.avg ?? 0) : 0, dist };
}

/** Counts per source for the tab bar. */
export async function reviewSourceCounts() {
  const db = env.DB;
  const p = await db.prepare("SELECT service, count(*) AS n FROM platform_reviews WHERE status = 'published' GROUP BY service").all<{ service: string; n: number }>();
  const proj = await db.prepare("SELECT count(*) AS n FROM reviews WHERE status = 'published'").first<number>('n');
  const counts: Record<string, number> = Object.fromEntries(p.results.map((r) => [r.service, r.n]));
  counts.projects = proj ?? 0;
  return counts;
}

export async function createPlatformReview(r: { userId: number | null; service: ReviewService; city: string | null; author: string; rating: number; title: string | null; body: string }) {
  return (await env.DB.prepare('INSERT INTO platform_reviews (user_id, service, city_slug, author, rating, title, body) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id')
    .bind(r.userId, r.service, r.city, r.author, r.rating, r.title, r.body).first<number>('id'))!;
}
