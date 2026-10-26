// Admin add / edit of projects (/admin/projects/new, /admin/projects/{id}): reads and checks the form on the server,
// saves the project, its configurations (project_units) and, if asked, a new builder, and lists what changed for the
// audit log. See docs/functions/admin/desc.md.
import { env } from 'cloudflare:workers';
import type { NearbyPlace, ProjectStatus } from '../data/types';
import type { Refs } from './repo';

const db = () => env.DB;
export const PROJECT_STATUSES: ProjectStatus[] = ['New Launch', 'Under Construction', 'Ready to Move'];
export const NEARBY_KINDS: NearbyPlace['kind'][] = ['School', 'Hospital', 'Metro', 'Mall', 'Office Hub', 'Airport', 'Railway'];
/** Empty configuration rows offered on the form (save, and the form offers more). */
export const EXTRA_UNIT_ROWS = 3;

export const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);

export interface UnitInput { bhk: number; label: string; carpetSqft: number; price: number }
export interface ProjectInput {
  name: string; slug: string; citySlug: string; localitySlug: string; builderSlug: string; status: ProjectStatus;
  possession: string; rera: string; landAcres: number; totalUnits: number; towers: number; floors: number; ratePerSqft: number;
  launchedYear: number; amenities: string[]; highlights: string[]; nearby: NearbyPlace[]; description: string | null; units: UnitInput[];
}
/** builders columns are all required: the founded year is asked for, the head office defaults to the project's city. */
export interface NewBuilder { slug: string; name: string; founded: number; hq: string; about: string }

/** Form values as text, for showing the form again after an error. */
export type ProjectFormValues = Record<string, string | string[]>;

type Parsed = { ok: true; project: ProjectInput; newBuilder: NewBuilder | null } | { ok: false; error: string };

/** Reads and checks every field. `id` is the project being edited (null when adding). */
export async function parseProjectForm(form: FormData, refs: Refs, id: number | null): Promise<Parsed> {
  const s = (k: string, max = 200) => String(form.get(k) ?? '').trim().slice(0, max);
  const n = (k: string) => Number(s(k, 20));
  const lines = (k: string, maxLines: number, maxLen: number) => s(k, 20000).split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, maxLines).map((l) => l.slice(0, maxLen));
  const fail = (error: string): Parsed => ({ ok: false, error });

  const name = s('name', 120);
  if (name.length < 3) return fail('Enter the project name (3+ characters).');
  const citySlug = s('city', 60);
  if (!refs.city(citySlug)) return fail('Choose a city.');
  const localitySlug = s('locality', 80);
  const loc = refs.locality(citySlug, localitySlug);
  if (!loc) return fail('Choose a locality in that city.');
  const slug = slugify(s('slug', 100) || `${name} ${loc.name}`);
  if (slug.length < 3) return fail('The URL name (slug) needs at least 3 letters or digits.');
  const clash = await db().prepare('SELECT id FROM projects WHERE city_slug = ? AND slug = ? AND id != ?').bind(citySlug, slug, id ?? -1).first<number>('id');
  if (clash) return fail(`The URL /projects/${citySlug}/${slug} is already used by project #${clash}. Change the slug.`);

  // Builder: an existing one, or a new one created with the project.
  let builderSlug = s('builder', 80);
  let newBuilder: NewBuilder | null = null;
  if (builderSlug === '__new') {
    const bName = s('newBuilderName', 100);
    if (bName.length < 2) return fail('Enter the new builder’s name.');
    const bSlug = slugify(bName);
    if (refs.builders.some((b) => b.slug === bSlug)) return fail(`A builder called “${bName}” already exists: pick it from the list.`);
    const founded = n('newBuilderFounded');
    if (!(Number.isInteger(founded) && founded >= 1800 && founded <= new Date().getFullYear())) return fail('Enter the year the new builder was founded.');
    newBuilder = { slug: bSlug, name: bName, founded, hq: s('newBuilderHq', 80) || refs.city(citySlug)!.name, about: s('newBuilderAbout', 1000) || `${bName} is a real-estate developer.` };
    builderSlug = bSlug;
  } else if (!refs.builders.some((b) => b.slug === builderSlug)) return fail('Choose a builder (or “New builder”).');

  const status = s('status', 30) as ProjectStatus;
  if (!PROJECT_STATUSES.includes(status)) return fail('Choose the project status.');
  const possession = s('possession', 40);
  if (!possession) return fail('Enter the possession date (e.g. Dec 2027 or Ready).');
  const rera = s('rera', 60);
  const int = (k: string, lo: number, hi: number, label: string) => { const v = n(k); return Number.isInteger(v) && v >= lo && v <= hi ? v : fail(`${label} must be a whole number from ${lo} to ${hi}.`); };
  const landAcres = n('landAcres');
  if (!(landAcres >= 0 && landAcres <= 10000)) return fail('Land (acres) must be between 0 and 10,000.');
  const totalUnits = int('totalUnits', 0, 100000, 'Total units'); if (typeof totalUnits !== 'number') return totalUnits;
  const towers = int('towers', 0, 500, 'Towers'); if (typeof towers !== 'number') return towers;
  const floors = int('floors', 0, 200, 'Floors'); if (typeof floors !== 'number') return floors;
  const ratePerSqft = int('ratePerSqft', 500, 500000, 'Rate per sq.ft'); if (typeof ratePerSqft !== 'number') return ratePerSqft;
  const launchedYear = int('launchedYear', 1990, new Date().getFullYear() + 5, 'Launch year'); if (typeof launchedYear !== 'number') return launchedYear;

  // Configurations: rows of BHK / label / carpet / price; blank rows are skipped.
  const units: UnitInput[] = [];
  const all = (k: string) => form.getAll(k).map((v) => String(v).trim());
  const [bhks, labels, carpets, prices] = [all('unitBhk'), all('unitLabel'), all('unitCarpet'), all('unitPrice')];
  for (let i = 0; i < Math.min(bhks.length, 30); i++) {
    if (!bhks[i] && !labels[i] && !carpets[i] && !prices[i]) continue;
    const u = { bhk: Number(bhks[i]), label: (labels[i] ?? '').slice(0, 60), carpetSqft: Number(carpets[i]), price: Number(prices[i]) };
    if (!(Number.isInteger(u.bhk) && u.bhk >= 0 && u.bhk <= 10)) return fail(`Configuration ${i + 1}: BHK must be 0–10.`);
    if (!u.label) u.label = u.bhk ? `${u.bhk} BHK` : 'Studio';
    if (!(Number.isInteger(u.carpetSqft) && u.carpetSqft >= 100 && u.carpetSqft <= 100000)) return fail(`Configuration ${i + 1}: carpet area must be 100–1,00,000 sq.ft.`);
    if (!(Number.isInteger(u.price) && u.price >= 100000 && u.price <= 10_000_000_000)) return fail(`Configuration ${i + 1}: price must be ₹1 lakh to ₹1,000 crore (whole rupees).`);
    units.push(u);
  }
  if (!units.length) return fail('Add at least one configuration (BHK, carpet area, price).');

  const nearby: NearbyPlace[] = [];
  for (const line of lines('nearby', 20, 120)) {
    const [pName, kind, km] = line.split(',').map((x) => x.trim());
    const k = NEARBY_KINDS.find((x) => x.toLowerCase() === (kind ?? '').toLowerCase());
    const d = Number(km);
    if (!pName || !k || !(d >= 0 && d <= 100)) return fail(`Nearby place “${line}”: write it as “name, type, km” with type one of ${NEARBY_KINDS.join(', ')}.`);
    nearby.push({ name: pName, kind: k, km: Math.round(d * 10) / 10 });
  }

  return {
    ok: true,
    newBuilder,
    project: {
      name, slug, citySlug, localitySlug, builderSlug, status, possession, rera, landAcres: Math.round(landAcres * 10) / 10, totalUnits, towers, floors,
      ratePerSqft, launchedYear, amenities: lines('amenities', 40, 60), highlights: lines('highlights', 20, 200), nearby,
      description: s('description', 5000) || null, units,
    },
  };
}

/** Price range and "2, 3 BHK" label worked out from the configurations. */
export function unitSummary(units: UnitInput[]) {
  const prices = units.map((u) => u.price);
  const bhks = [...new Set(units.map((u) => u.bhk).filter((b) => b > 0))].sort((a, b) => a - b);
  return { priceMin: Math.min(...prices), priceMax: Math.max(...prices), bhkLabel: bhks.length ? `${bhks.join(', ')} BHK` : units[0].label };
}

/**
 * A flat eight-quarter price trend at the project's rate, ending this quarter: the project page charts it and the
 * home page averages it per quarter with the city's other projects (the seed data has eight quarters too).
 */
function flatTrend(rate: number) {
  const now = new Date();
  let y = now.getFullYear(); let q = Math.floor(now.getMonth() / 3) + 1;
  const out: { label: string; rate: number }[] = [];
  for (let i = 0; i < 8; i++) { out.unshift({ label: `Q${q} ${y}`, rate }); q--; if (q === 0) { q = 4; y--; } }
  return out;
}

type Change = [string, string, string];
const AUDIT_FIELDS: [keyof ProjectInput | 'priceRange', string][] = [
  ['name', 'name'], ['slug', 'slug'], ['citySlug', 'city'], ['localitySlug', 'locality'], ['builderSlug', 'builder'], ['status', 'status'],
  ['possession', 'possession'], ['rera', 'rera'], ['landAcres', 'land'], ['totalUnits', 'units total'], ['towers', 'towers'], ['floors', 'floors'],
  ['ratePerSqft', 'rate'], ['launchedYear', 'launched'], ['priceRange', 'price range'], ['description', 'description'],
];
const short = (v: string) => (v.length > 50 ? `${v.slice(0, 49)}…` : v || '—');

/**
 * Saves a new project (id null) or changes to an existing one, plus its configurations and a new builder. Returns the
 * project id and the changed fields ([field, old, new]) for the audit log.
 */
export async function saveProject(id: number | null, p: ProjectInput, newBuilder: NewBuilder | null): Promise<{ id: number; changes: Change[] }> {
  const { priceMin, priceMax, bhkLabel } = unitSummary(p.units);
  const json = JSON.stringify;
  const stmts = [];
  if (newBuilder) {
    stmts.push(db().prepare('INSERT INTO builders (slug, name, founded, hq, delivered, ongoing, about, hue) VALUES (?, ?, ?, ?, 0, 0, ?, ?)')
      .bind(newBuilder.slug, newBuilder.name, newBuilder.founded, newBuilder.hq, newBuilder.about, 150 + Math.floor(Math.random() * 110)));
  }
  if (id === null) {
    if (stmts.length) await db().batch(stmts);
    const newId = (await db()
      .prepare(`INSERT INTO projects (slug, name, city_slug, locality_slug, builder_slug, status, possession, rera, land_acres, total_units, towers, floors,
          rate_per_sqft, price_min, price_max, bhk_label, amenities, highlights, price_trend, nearby, hue, launched_year, description, hidden, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) RETURNING id`)
      .bind(p.slug, p.name, p.citySlug, p.localitySlug, p.builderSlug, p.status, p.possession, p.rera, p.landAcres, p.totalUnits, p.towers, p.floors,
        p.ratePerSqft, priceMin, priceMax, bhkLabel, json(p.amenities), json(p.highlights), json(flatTrend(p.ratePerSqft)), json(p.nearby),
        150 + Math.floor(Math.random() * 110), p.launchedYear, p.description)
      .first<number>('id'))!;
    await db().batch(p.units.map((u) => db().prepare('INSERT INTO project_units (project_id, bhk, label, carpet_sqft, price) VALUES (?, ?, ?, ?, ?)').bind(newId, u.bhk, u.label, u.carpetSqft, u.price)));
    return { id: newId, changes: [] };
  }

  const old = await db().prepare('SELECT * FROM projects WHERE id = ?').bind(id).first<Record<string, unknown>>();
  if (!old) throw new Error('Project not found');
  const { results: oldUnits } = await db().prepare('SELECT bhk, label, carpet_sqft AS carpetSqft, price FROM project_units WHERE project_id = ? ORDER BY bhk, price').bind(id).all<UnitInput>();
  const before: Record<string, string> = {
    name: String(old.name), slug: String(old.slug), citySlug: String(old.city_slug), localitySlug: String(old.locality_slug), builderSlug: String(old.builder_slug),
    status: String(old.status), possession: String(old.possession), rera: String(old.rera ?? ''), landAcres: String(old.land_acres), totalUnits: String(old.total_units),
    towers: String(old.towers), floors: String(old.floors), ratePerSqft: String(old.rate_per_sqft), launchedYear: String(old.launched_year),
    priceRange: `${old.price_min}–${old.price_max}`, description: String(old.description ?? ''),
  };
  const after: Record<string, string> = { ...Object.fromEntries(Object.entries(p).map(([k, v]) => [k, String(v ?? '')])), priceRange: `${priceMin}–${priceMax}`, description: p.description ?? '' };
  const changes: Change[] = AUDIT_FIELDS.filter(([k]) => before[k] !== after[k]).map(([k, label]) => [label, short(before[k]), short(after[k])]);
  const listChange = (label: string, a: unknown, b: unknown[]) => { if (String(old[a as string] ?? '[]') !== json(b)) changes.push([label, `${(JSON.parse(String(old[a as string] ?? '[]')) as unknown[]).length} items`, `${b.length} items`]); };
  listChange('amenities', 'amenities', p.amenities); listChange('highlights', 'highlights', p.highlights); listChange('nearby', 'nearby', p.nearby);
  const unitsKey = (us: UnitInput[]) => json([...us].sort((a, b) => a.bhk - b.bhk || a.price - b.price).map((u) => [u.bhk, u.label, u.carpetSqft, u.price]));
  const unitsChanged = unitsKey(oldUnits) !== unitsKey(p.units);
  if (unitsChanged) changes.push(['configurations', `${oldUnits.length}`, `${p.units.length}`]);
  if (!changes.length && !newBuilder) return { id, changes };

  stmts.push(db().prepare(`UPDATE projects SET slug = ?, name = ?, city_slug = ?, locality_slug = ?, builder_slug = ?, status = ?, possession = ?, rera = ?,
      land_acres = ?, total_units = ?, towers = ?, floors = ?, rate_per_sqft = ?, price_min = ?, price_max = ?, bhk_label = ?, amenities = ?, highlights = ?,
      nearby = ?, launched_year = ?, description = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?`)
    .bind(p.slug, p.name, p.citySlug, p.localitySlug, p.builderSlug, p.status, p.possession, p.rera, p.landAcres, p.totalUnits, p.towers, p.floors,
      p.ratePerSqft, priceMin, priceMax, bhkLabel, json(p.amenities), json(p.highlights), json(p.nearby), p.launchedYear, p.description, id));
  if (unitsChanged) {
    stmts.push(db().prepare('DELETE FROM project_units WHERE project_id = ?').bind(id));
    for (const u of p.units) stmts.push(db().prepare('INSERT INTO project_units (project_id, bhk, label, carpet_sqft, price) VALUES (?, ?, ?, ?, ?)').bind(id, u.bhk, u.label, u.carpetSqft, u.price));
  }
  await db().batch(stmts);
  return { id, changes };
}

/** An existing project as form values (edit page). */
export async function projectFormValues(id: number): Promise<ProjectFormValues | null> {
  const r = await db().prepare('SELECT * FROM projects WHERE id = ?').bind(id).first<Record<string, unknown>>();
  if (!r) return null;
  const { results: units } = await db().prepare('SELECT bhk, label, carpet_sqft, price FROM project_units WHERE project_id = ? ORDER BY bhk, price').bind(id).all<{ bhk: number; label: string; carpet_sqft: number; price: number }>();
  const list = (v: unknown) => (JSON.parse(String(v ?? '[]')) as unknown[]);
  return {
    name: String(r.name), slug: String(r.slug), city: String(r.city_slug), locality: String(r.locality_slug), builder: String(r.builder_slug), status: String(r.status),
    possession: String(r.possession), rera: String(r.rera ?? ''), landAcres: String(r.land_acres), totalUnits: String(r.total_units), towers: String(r.towers),
    floors: String(r.floors), ratePerSqft: String(r.rate_per_sqft), launchedYear: String(r.launched_year), description: String(r.description ?? ''),
    amenities: (list(r.amenities) as string[]).join('\n'), highlights: (list(r.highlights) as string[]).join('\n'),
    nearby: (list(r.nearby) as NearbyPlace[]).map((x) => `${x.name}, ${x.kind}, ${x.km}`).join('\n'),
    unitBhk: units.map((u) => String(u.bhk)), unitLabel: units.map((u) => u.label), unitCarpet: units.map((u) => String(u.carpet_sqft)), unitPrice: units.map((u) => String(u.price)),
  };
}

/** The submitted form as values, to show it again after an error. */
export function formValues(form: FormData): ProjectFormValues {
  const out: ProjectFormValues = {};
  for (const k of new Set(form.keys())) {
    const all = form.getAll(k).map((v) => (typeof v === 'string' ? v : ''));
    out[k] = k.startsWith('unit') ? all : all[0] ?? '';
  }
  return out;
}
