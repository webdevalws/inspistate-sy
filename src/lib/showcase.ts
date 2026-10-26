// Showcase: what two home page sections show, picked and ordered by the admin (/admin/showcase, migration 0017).
// Read live on every home page request (one small query), so changes show at once. With fewer picks than cards, the
// home page shows the picks first and fills the rest with its automatic choice (no duplicates); with none, it is
// exactly as before. See docs/functions/admin/desc.md.
import { env } from 'cloudflare:workers';

export type ShowcaseSection = 'hot_projects' | 'top_localities';
/** Cards the home page shows: hot projects in total, localities per city tab. */
export const SHOWCASE_CARDS: Record<ShowcaseSection, number> = { hot_projects: 5, top_localities: 5 };
export const SHOWCASE_LABELS: Record<ShowcaseSection, string> = { hot_projects: 'Hot Selling Projects', top_localities: 'Top Localities' };
export const isShowcaseSection = (v: unknown): v is ShowcaseSection => v === 'hot_projects' || v === 'top_localities';

const db = () => env.DB;

/** Every pick, in order, grouped as "<section>:<city>" → items (one query for the whole home page). */
export async function showcasePicks(): Promise<Map<string, string[]>> {
  const { results } = await db().prepare('SELECT section, city_slug, item FROM showcase ORDER BY section, city_slug, position').all<{ section: string; city_slug: string; item: string }>();
  const out = new Map<string, string[]>();
  for (const r of results) {
    const k = `${r.section}:${r.city_slug}`;
    out.set(k, [...(out.get(k) ?? []), r.item]);
  }
  return out;
}

export async function showcaseItems(section: ShowcaseSection, city = ''): Promise<string[]> {
  const { results } = await db().prepare('SELECT item FROM showcase WHERE section = ? AND city_slug = ? ORDER BY position').bind(section, city).all<{ item: string }>();
  return results.map((r) => r.item);
}

/** Puts picks first (in their order), then fills up to `n` from `auto`, skipping duplicates and unknown items. */
export function withPicks<T>(picks: string[], auto: T[], key: (t: T) => string, find: (item: string) => T | undefined, n: number): T[] {
  const chosen = picks.map(find).filter((t): t is T => !!t);
  const seen = new Set(chosen.map(key));
  return [...chosen, ...auto.filter((t) => !seen.has(key(t)))].slice(0, n);
}

/** Adds an item at the end. Returns false when it was already picked. (The caller checks the item exists.) */
export async function addShowcaseItem(section: ShowcaseSection, city: string, item: string): Promise<boolean> {
  const r = await db()
    .prepare(`INSERT INTO showcase (section, city_slug, item, position)
      VALUES (?, ?, ?, (SELECT coalesce(max(position), 0) + 1 FROM showcase WHERE section = ? AND city_slug = ?))
      ON CONFLICT DO NOTHING`)
    .bind(section, city, item, section, city)
    .run();
  return (r.meta.changes ?? 0) > 0;
}

export async function removeShowcaseItem(section: ShowcaseSection, city: string, item: string): Promise<boolean> {
  const r = await db().prepare('DELETE FROM showcase WHERE section = ? AND city_slug = ? AND item = ?').bind(section, city, item).run();
  return (r.meta.changes ?? 0) > 0;
}

/** Swaps an item with its neighbour above or below. Returns its new 1-based place, or null when it can't move. */
export async function moveShowcaseItem(section: ShowcaseSection, city: string, item: string, dir: 'up' | 'down'): Promise<number | null> {
  const items = await showcaseItems(section, city);
  const i = items.indexOf(item);
  const j = dir === 'up' ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= items.length) return null;
  [items[i], items[j]] = [items[j], items[i]];
  // Rewrite positions 1..n in the new order (a handful of rows).
  await db().batch(items.map((it, k) => db().prepare('UPDATE showcase SET position = ? WHERE section = ? AND city_slug = ? AND item = ?').bind(k + 1, section, city, it)));
  return j + 1;
}

/**
 * The home page's "Top Localities" city tabs: the first eight cities, then later-added cities that have projects.
 * Shared by the home page and /admin/showcase so both list the same tabs.
 */
export const ORIGINAL_CITIES = 10;
export function localityTabCities<C extends { slug: string }>(cities: C[], projects: { citySlug: string }[]): C[] {
  return [...cities.slice(0, 8), ...cities.slice(ORIGINAL_CITIES).filter((c) => projects.some((p) => p.citySlug === c.slug))];
}

/** The home page's automatic locality choice for a city: the five with the highest year-on-year growth. */
export const autoLocalities = <L extends { yoyGrowthPct: number }>(localities: L[]) => [...localities].sort((a, b) => b.yoyGrowthPct - a.yoyGrowthPct);
