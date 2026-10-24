// Generates db/seed.sql from the deterministic demo data.
// Run: node db/build-seed.ts   (Node 22.18+/24 strips TypeScript types natively)
import { writeFileSync } from 'node:fs';
import { builders, cities, extraListings, extraProjects, listings, localities, naviMumbaiListings, naviMumbaiProjects, pgListings, projects } from './seed-data.ts';

const q = (v: unknown): string => {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  if (typeof v === 'boolean') return v ? '1' : '0';
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  return `'${s.replace(/'/g, "''")}'`;
};
const row = (vals: unknown[]) => `(${vals.map(q).join(', ')})`;
// D1 caps statement size, so long inserts are split into batches.
const BATCH = 50;
const insert = (table: string, cols: string[], rows: unknown[][]) => {
  const parts: string[] = [];
  for (let i = 0; i < rows.length; i += BATCH) {
    parts.push(`INSERT INTO ${table} (${cols.join(', ')}) VALUES\n${rows.slice(i, i + BATCH).map(row).join(',\n')};\n`);
  }
  return parts.join('');
};

// A fixed "today" so db/seed.sql is the same on every machine and every run (it used to change after each
// reset). Demo dates ("posted 3 days ago", transactions, reviews) are relative to this date, so on the live
// site they slowly look older; move the date forward and regenerate when that matters.
const SEED_DATE = '2026-10-24T10:00:00Z';
const now = Date.parse(SEED_DATE);
const iso = (daysAgo: number) => new Date(now - daysAgo * 86400000).toISOString().replace(/\.\d{3}Z$/, 'Z');

const LISTING_COLS = ['id', 'purpose', 'segment', 'type', 'bhk', 'bathrooms', 'area_sqft', 'price', 'city_slug', 'locality_slug', 'project_id', 'furnishing', 'posted_by', 'possession', 'floor', 'total_floors', 'facing', 'age_years', 'amenities', 'contact_name', 'verified', 'status', 'hue', 'posted_at', 'managed', 'deposit_months', 'available_from'];
const listingRow = (l: (typeof listings)[number]) => {
  // Managed rentals (same rule as migration 0008): every third residential rental, one-month
  // deposit, available a week after posting. Kept here because a reset re-inserts all listings.
  const managed = l.purpose === 'rent' && l.segment === 'residential' && l.type !== 'PG' && l.id % 3 === 0;
  return [l.id, l.purpose, l.segment, l.type, l.bhk, l.bathrooms, l.areaSqft, l.price, l.citySlug, l.localitySlug, l.projectId, l.furnishing, l.postedBy, l.possession, l.floor, l.totalFloors, l.facing, l.ageYears, l.amenities, l.contactName, l.verified, 'active', l.hue, iso(l.postedDaysAgo),
    managed ? 1 : 0, managed ? 1 : 2, managed ? iso(l.postedDaysAgo - 7).slice(0, 10) : null];
};

// Separate deterministic stream for the extra demo tables.
let s = 977;
const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
const ri = (a: number, b: number) => a + Math.floor(r() * (b - a + 1));
const pickR = <T,>(a: readonly T[]) => a[Math.floor(r() * a.length)];

const transactionsFor = (list: typeof projects) => list.filter((p) => p.status !== 'New Launch').flatMap((p) =>
  Array.from({ length: ri(5, 10) }, () => {
    const u = pickR(p.units);
    const floor = ri(1, p.floors);
    const area = Math.round(u.carpetSqft * 1.3);
    return [p.id, iso(ri(10, 540)).slice(0, 10), `T${ri(1, p.towers)}`, floor, `${floor}${String(ri(1, 8)).padStart(2, '0')}`, area,
      Math.round((p.ratePerSqft * area * (0.82 + r() * 0.2)) / 10000) * 10000];
  }));
const transactions = transactionsFor(projects);

const reviewTexts = [
  ['Good layout and ventilation. Clubhouse is well maintained, though traffic at peak hours can be slow.', 4, 3, 4, 4],
  ['Construction quality feels solid and the builder kept us updated on progress. Parking could be better planned.', 4, 4, 3, 5],
  ['Great location for office commute. Amenities are decent; the pool area gets crowded on weekends.', 4, 5, 3, 4],
  ['Value for money compared to nearby projects. Some delays in possession but communication was transparent.', 3, 4, 4, 3],
  ['Very happy with the green spaces and kids play area. Water supply has been consistent.', 5, 4, 5, 4],
  ['Maintenance charges are on the higher side. Otherwise a peaceful community with good security.', 3, 3, 4, 4],
] as const;
const reviewers = ['Amit K.', 'Sunita R.', 'Deepak M.', 'Pooja S.', 'Rakesh V.', 'Nisha P.', 'Harsh T.', 'Anjali D.'];
const reviewsFor = (list: typeof projects) => list.flatMap((p) =>
  Array.from({ length: p.status === 'New Launch' ? ri(0, 1) : ri(2, 4) }, () => {
    const [body, rating, conn, amen, cons] = pickR(reviewTexts);
    return [p.id, pickR(reviewers), rating, conn, amen, cons, body, pickR(['Owner', 'Tenant', 'Visitor']), 'published', iso(ri(5, 400))];
  }));
const reviews = reviewsFor(projects);
// Hand-written projects (Lucknow) draw their transactions and reviews from the same stream *after* all the
// generated ones, so every generated row stays the same.
const extraTransactions = transactionsFor(extraProjects);
const extraReviews = reviewsFor(extraProjects);
// Navi Mumbai projects draw theirs after Lucknow's, so Lucknow's rows stay the same too.
const naviMumbaiTransactions = transactionsFor(naviMumbaiProjects);
const naviMumbaiReviews = reviewsFor(naviMumbaiProjects);

const PROJECT_COLS = ['id', 'slug', 'name', 'city_slug', 'locality_slug', 'builder_slug', 'status', 'possession', 'rera', 'land_acres', 'total_units', 'towers', 'floors', 'rate_per_sqft', 'price_min', 'price_max', 'bhk_label', 'amenities', 'highlights', 'price_trend', 'nearby', 'hue', 'launched_year'];
const projectRow = (p: (typeof projects)[number]) => {
  const prices = p.units.map((u) => u.price);
  return [p.id, p.slug, p.name, p.citySlug, p.localitySlug, p.builderSlug, p.status, p.possession, p.rera, p.landAcres, p.totalUnits, p.towers, p.floors, p.ratePerSqft,
    Math.min(...prices), Math.max(...prices), `${[...new Set(p.units.map((u) => u.bhk))].join(', ')} BHK`,
    p.amenities, p.highlights, p.priceTrend, p.nearby, p.hue, p.launchedYear];
};
const unitRows = (list: typeof projects) => list.flatMap((p) => p.units.map((u) => [p.id, u.bhk, u.label, u.carpetSqft, u.price]));

const forum: [string, string, string, string, [string, string][]][] = [
  ['Rohit S.', 'pune', 'Is Hinjewadi still a good bet for a 2 BHK in 2026?', 'Planning to buy for self-use, I work in Phase 1. Worried about traffic and water supply. Any residents here?', [['Meghna K.', 'Traffic on the main road is bad at peak hours, but Phase 2 and 3 societies are close to offices. Check water supply hours with the society before buying.'], ['Anil P.', 'Prices grew steadily here. If you work in Phase 1, Wakad is also worth checking for better social infrastructure.']]],
  ['Farah N.', 'mumbai', 'Carpet area vs built-up — how much difference is normal?', 'A resale flat is advertised as 1,000 sq.ft built-up. What carpet area should I expect?', [['Vivek R.', 'Typically carpet is 70–80% of built-up in Mumbai. Ask for the carpet area in writing and compare price per sq.ft of carpet.']]],
  ['Sanjay T.', 'bengaluru', 'What security deposit is normal for rentals in Whitefield?', 'Landlord is asking for 8 months deposit for a 2 BHK. Is that standard?', [['Divya M.', 'Bengaluru deposits are high, but 5–6 months is more common now. You can negotiate, especially for longer lock-ins.']]],
  ['Kiran D.', 'gurugram', 'Under-construction project delayed by 2 years — what are my options?', 'Builder keeps postponing possession. The RERA date has passed.', [['Advocate Mehra', 'You can file a complaint with Haryana RERA for interest on delayed possession or a full refund with interest. Keep all payment receipts and the builder-buyer agreement ready.']]],
];
const out = [
  '-- Generated by db/build-seed.ts — do not edit by hand.',
  'DELETE FROM forum_answers; DELETE FROM forum_questions; DELETE FROM reviews; DELETE FROM transactions; DELETE FROM shortlists; DELETE FROM saved_searches;',
  'DELETE FROM leads; DELETE FROM listing_photos; DELETE FROM listings; DELETE FROM project_units;',
  'DELETE FROM projects; DELETE FROM builders; DELETE FROM localities; DELETE FROM cities;',
  "DELETE FROM sqlite_sequence WHERE name IN ('listings', 'project_units', 'leads', 'listing_photos', 'reviews', 'transactions', 'saved_searches', 'forum_questions', 'forum_answers');",
  insert('cities', ['slug', 'name', 'state', 'stamp_duty_pct', 'lat', 'lng', 'sort_order'],
    cities.map((c, i) => [c.slug, c.name, c.state, c.stampDutyPct, c.lat, c.lng, i])),
  insert('localities', ['city_slug', 'slug', 'name', 'rate_per_sqft', 'rent_per_sqft', 'yoy_growth_pct', 'lat', 'lng'],
    localities.map((l) => [l.citySlug, l.slug, l.name, l.ratePerSqft, l.rentPerSqft, l.yoyGrowthPct, +l.lat.toFixed(5), +l.lng.toFixed(5)])),
  insert('builders', ['slug', 'name', 'founded', 'hq', 'delivered', 'ongoing', 'about', 'hue'],
    builders.map((b) => [b.slug, b.name, b.founded, b.hq, b.delivered, b.ongoing, b.about, b.hue])),
  insert('projects', PROJECT_COLS, projects.map(projectRow)),
  // Hand-written rows (Lucknow) go in their own inserts so the generated rows above stay unchanged.
  insert('projects', PROJECT_COLS, extraProjects.map(projectRow)),
  insert('projects', PROJECT_COLS, naviMumbaiProjects.map(projectRow)),
  insert('project_units', ['project_id', 'bhk', 'label', 'carpet_sqft', 'price'], unitRows(projects)),
  insert('project_units', ['project_id', 'bhk', 'label', 'carpet_sqft', 'price'], unitRows(extraProjects)),
  insert('project_units', ['project_id', 'bhk', 'label', 'carpet_sqft', 'price'], unitRows(naviMumbaiProjects)),
  insert('listings', LISTING_COLS, listings.map(listingRow)),
  insert('listings', [...LISTING_COLS, 'description'], extraListings.map((l) => [...listingRow(l), l.description])),
  insert('listings', [...LISTING_COLS, 'description', 'pg_sharing', 'pg_for', 'pg_food'],
    pgListings.map((l) => [...listingRow(l), l.description, l.pg.sharing, l.pg.for, l.pg.food ? 1 : 0])),
  insert('listings', [...LISTING_COLS, 'description'], naviMumbaiListings.map((l) => [...listingRow(l), l.description])),
  insert('transactions', ['project_id', 'registered_on', 'tower', 'floor', 'unit', 'area_sqft', 'price'], transactions),
  insert('transactions', ['project_id', 'registered_on', 'tower', 'floor', 'unit', 'area_sqft', 'price'], extraTransactions),
  insert('transactions', ['project_id', 'registered_on', 'tower', 'floor', 'unit', 'area_sqft', 'price'], naviMumbaiTransactions),
  insert('reviews', ['project_id', 'author', 'rating', 'connectivity', 'amenities', 'construction', 'body', 'resident_type', 'status', 'created_at'], reviews),
  insert('reviews', ['project_id', 'author', 'rating', 'connectivity', 'amenities', 'construction', 'body', 'resident_type', 'status', 'created_at'], extraReviews),
  insert('reviews', ['project_id', 'author', 'rating', 'connectivity', 'amenities', 'construction', 'body', 'resident_type', 'status', 'created_at'], naviMumbaiReviews),
  insert('forum_questions', ['id', 'author', 'city_slug', 'title', 'body', 'created_at'], forum.map(([a, c, t, b], i) => [i + 1, a, c, t, b, iso(40 - i * 7)])),
  insert('forum_answers', ['question_id', 'author', 'body', 'created_at'], forum.flatMap(([, , , , ans], i) => ans.map(([a, b], j) => [i + 1, a, b, iso(38 - i * 7 - j)]))),
].join('\n');

writeFileSync(new URL('./seed.sql', import.meta.url), out);
console.log(`seed.sql: ${cities.length} cities, ${localities.length} localities, ${builders.length} builders, ${projects.length + extraProjects.length + naviMumbaiProjects.length} projects, ${listings.length + extraListings.length + pgListings.length + naviMumbaiListings.length} listings`);
