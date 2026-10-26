// Admin add / edit of localities (/admin/localities, /admin/localities/new, /admin/localities/{city}/{slug}): checks the
// form on the server, saves, lists what changed for the audit log, hides / unhides (refused while live listings or
// projects use the locality) and stores its one photo. See docs/functions/admin/desc.md.
import { env } from 'cloudflare:workers';
import { live, VISIBLE_PROJECT } from './repo';
import { slugify } from './admin-projects';
import { sniffImage, stripMetadata } from './strip-metadata';

const db = () => env.DB;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export interface LocalityRow {
  city_slug: string; slug: string; name: string; rate_per_sqft: number; rent_per_sqft: number; yoy_growth_pct: number;
  lat: number; lng: number; hidden: number; description: string | null; photo_key: string | null;
}
export interface LocalityInput { name: string; ratePerSqft: number; rentPerSqft: number; yoyGrowthPct: number; lat: number; lng: number; description: string | null }
export type LocalityFormValues = Record<string, string>;

export const getLocality = (city: string, slug: string) =>
  db().prepare('SELECT * FROM localities WHERE city_slug = ? AND slug = ?').bind(city, slug).first<LocalityRow>();

/** Reads and checks the editable fields (the same on add and edit; slug and city are fixed once added). */
export function parseLocalityForm(form: FormData): { ok: true; locality: LocalityInput } | { ok: false; error: string } {
  const s = (k: string, max = 200) => String(form.get(k) ?? '').trim().slice(0, max);
  const n = (k: string) => (s(k, 20) === '' ? NaN : Number(s(k, 20)));
  const fail = (error: string) => ({ ok: false as const, error });
  const name = s('name', 80);
  if (name.length < 2) return fail('Enter the locality name (2+ characters).');
  const ratePerSqft = n('ratePerSqft');
  if (!(Number.isInteger(ratePerSqft) && ratePerSqft >= 500 && ratePerSqft <= 500000)) return fail('Reference rate must be a whole number of ₹ per sq.ft from 500 to 5,00,000.');
  const rentPerSqft = n('rentPerSqft');
  if (!(rentPerSqft >= 1 && rentPerSqft <= 2000)) return fail('Rent must be between ₹1 and ₹2,000 per sq.ft per month.');
  const yoyGrowthPct = n('yoyGrowthPct');
  if (!(yoyGrowthPct >= -50 && yoyGrowthPct <= 100)) return fail('Yearly growth must be between -50% and 100%.');
  const lat = n('lat'), lng = n('lng');
  // India's bounding box: catches swapped or mistyped coordinates.
  if (!(lat >= 6 && lat <= 37.5)) return fail('Latitude must be between 6 and 37.5 (India).');
  if (!(lng >= 68 && lng <= 97.5)) return fail('Longitude must be between 68 and 97.5 (India).');
  return {
    ok: true,
    locality: { name, ratePerSqft, rentPerSqft: Math.round(rentPerSqft * 10) / 10, yoyGrowthPct: Math.round(yoyGrowthPct * 10) / 10, lat: Math.round(lat * 1e5) / 1e5, lng: Math.round(lng * 1e5) / 1e5, description: s('description', 3000) || null },
  };
}

/** Slug (from the name when empty) and city for a new locality; the slug must be new in that city. */
export async function parseNewLocality(form: FormData, cities: string[]): Promise<{ ok: true; city: string; slug: string } | { ok: false; error: string }> {
  const city = String(form.get('city') ?? '').trim();
  if (!cities.includes(city)) return { ok: false, error: 'Choose a city.' };
  const slug = slugify(String(form.get('slug') ?? '').trim().slice(0, 80) || String(form.get('name') ?? '').trim().slice(0, 80));
  if (slug.length < 2) return { ok: false, error: 'The URL name (slug) needs at least 2 letters or digits.' };
  if (await getLocality(city, slug)) return { ok: false, error: `The URL /locality/${city}/${slug} is already used. Change the slug.` };
  return { ok: true, city, slug };
}

export async function addLocality(city: string, slug: string, l: LocalityInput) {
  await db().prepare('INSERT INTO localities (city_slug, slug, name, rate_per_sqft, rent_per_sqft, yoy_growth_pct, lat, lng, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(city, slug, l.name, l.ratePerSqft, l.rentPerSqft, l.yoyGrowthPct, l.lat, l.lng, l.description).run();
}

/** Saves the edit; returns [field, old, new] for each change (nothing is written when nothing changed). */
export async function updateLocality(old: LocalityRow, l: LocalityInput): Promise<[string, string, string][]> {
  const short = (v: unknown) => (v == null || v === '' ? '(none)' : String(v).length > 40 ? `${String(v).slice(0, 40)}…` : String(v));
  const fields: [string, unknown, unknown][] = [
    ['name', old.name, l.name], ['rate', old.rate_per_sqft, l.ratePerSqft], ['rent', old.rent_per_sqft, l.rentPerSqft],
    ['yoy', old.yoy_growth_pct, l.yoyGrowthPct], ['lat', old.lat, l.lat], ['lng', old.lng, l.lng], ['description', old.description ?? null, l.description],
  ];
  const changes = fields.filter(([, a, b]) => a !== b).map(([f, a, b]) => [f, short(a), short(b)] as [string, string, string]);
  if (changes.length) {
    await db().prepare('UPDATE localities SET name = ?, rate_per_sqft = ?, rent_per_sqft = ?, yoy_growth_pct = ?, lat = ?, lng = ?, description = ? WHERE city_slug = ? AND slug = ?')
      .bind(l.name, l.ratePerSqft, l.rentPerSqft, l.yoyGrowthPct, l.lat, l.lng, l.description, old.city_slug, old.slug).run();
  }
  return changes;
}

/** Live listings and live projects in a locality: a locality is not hidden while any remain. */
export async function localityUse(city: string, slug: string) {
  const r = await db().prepare(`SELECT (SELECT count(*) FROM listings WHERE city_slug = ?1 AND locality_slug = ?2 AND ${live()}) AS listings,
      (SELECT count(*) FROM projects WHERE city_slug = ?1 AND locality_slug = ?2 AND ${VISIBLE_PROJECT}) AS projects`).bind(city, slug).first<{ listings: number; projects: number }>();
  return r ?? { listings: 0, projects: 0 };
}

export const setLocalityHidden = (city: string, slug: string, hidden: boolean) =>
  db().prepare('UPDATE localities SET hidden = ? WHERE city_slug = ? AND slug = ?').bind(hidden ? 1 : 0, city, slug).run();

/** Replaces the locality's photo (checked, metadata stripped, R2 localities/<city>/<slug>/<uuid>.<ext>); null file = remove. */
export async function setLocalityPhoto(loc: LocalityRow, file: File | null): Promise<{ ok: true } | { ok: false; error: string }> {
  let key: string | null = null;
  if (file) {
    if (file.size > MAX_PHOTO_BYTES) return { ok: false, error: `${file.name} is larger than 5 MB.` };
    const bytes = await file.arrayBuffer();
    const kind = sniffImage(new Uint8Array(bytes.slice(0, 12)));
    if (!kind) return { ok: false, error: `${file.name} is not a JPEG, PNG or WebP image.` };
    key = `localities/${loc.city_slug}/${loc.slug}/${crypto.randomUUID()}.${kind.ext}`;
    await env.MEDIA.put(key, stripMetadata(bytes, kind.mime), { httpMetadata: { contentType: kind.mime } });
  }
  await db().prepare('UPDATE localities SET photo_key = ? WHERE city_slug = ? AND slug = ?').bind(key, loc.city_slug, loc.slug).run();
  if (loc.photo_key) await env.MEDIA.delete(loc.photo_key);
  return { ok: true };
}

export const localityFormValues = (l: LocalityRow): LocalityFormValues => ({
  name: l.name, ratePerSqft: String(l.rate_per_sqft), rentPerSqft: String(l.rent_per_sqft), yoyGrowthPct: String(l.yoy_growth_pct),
  lat: String(l.lat), lng: String(l.lng), description: l.description ?? '',
});
export const localityFormFrom = (form: FormData): LocalityFormValues =>
  Object.fromEntries(['name', 'slug', 'city', 'ratePerSqft', 'rentPerSqft', 'yoyGrowthPct', 'lat', 'lng', 'description'].map((k) => [k, String(form.get(k) ?? '').slice(0, 3000)]));
