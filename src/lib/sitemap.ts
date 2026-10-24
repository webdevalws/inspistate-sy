// Sitemap parts, listed by the sitemap index at /sitemap.xml and served at /sitemap-{part}.xml.
// Search facet URLs are only listed when they have results (cached cityFacets counts), so empty filter pages —
// which answer 404 — are never submitted. Listings are active and open only. See docs/functions/property-search/desc.md.
import { cityFacets, getRefs, sitemapData } from './repo';
import { GUIDE_THEMES } from './community';
import { SERVICES, TOOLS } from './catalog';
import { GUIDES } from '../data/guides';
import { IDEA_CATEGORIES } from '../data/interiors';
import { LOAN_PRODUCTS } from '../data/loans';
import { typeSlug } from './search';

export type SitemapEntry = { loc: string; lastmod?: string };

const STATIC_PAGES = ['about', 'contact', 'faq', 'fraud-awareness', 'terms', 'privacy', 'careers', 'press', 'app-download', 'partner-with-us', 'advertise', 'business', 'reviews', 'research', 'women-homebuyers', 'home-loan-interest-rates', 'credit-cards', 'design-ideas', 'refer'];
const RESEARCH = ['india-price-index', 'rental-yield-report', 'fastest-growing-localities', 'cost-of-a-2bhk'];
const RES_TYPES = ['Apartment', 'Builder Floor', 'Villa', 'Plot', 'PG'];
const COM_TYPES = ['Office', 'Shop'];

export const SITEMAP_PARTS: Record<string, () => Promise<SitemapEntry[]>> = {
  /** Fixed pages: home, hubs, tools, services, guides, loans, design ideas, research reports. */
  static: async () => [
    { loc: '/' }, { loc: '/builders' }, { loc: '/tools' }, { loc: '/services' }, { loc: '/guides' }, { loc: '/post-property' }, { loc: '/compare' }, { loc: '/agents' }, { loc: '/forum' }, { loc: '/glossary' },
    ...STATIC_PAGES.map((p) => ({ loc: `/${p}` })),
    ...LOAN_PRODUCTS.map((p) => ({ loc: `/loans/${p.slug}` })),
    ...IDEA_CATEGORIES.map((c) => ({ loc: `/design-ideas/${c.slug}` })),
    ...RESEARCH.map((s) => ({ loc: `/research/${s}` })),
    ...TOOLS.map((t) => ({ loc: `/tools/${t.slug}` })),
    ...SERVICES.map((s) => ({ loc: `/services/${s.slug}` })),
    ...GUIDES.map((g) => ({ loc: `/guides/${g.slug}` })),
  ],
  /** City hubs and city pages, locality pages and locality guides. */
  places: async () => {
    const refs = await getRefs();
    return [
      ...refs.cities.flatMap((c) => [
        { loc: `/city/${c.slug}` }, { loc: `/new-projects/${c.slug}` }, { loc: `/managed-rentals/${c.slug}` }, { loc: `/property-rates/${c.slug}` },
        { loc: `/heatmap/${c.slug}` }, { loc: `/research/city-${c.slug}` },
        ...Object.keys(GUIDE_THEMES).map((t) => ({ loc: `/localities/${c.slug}/${t}` })),
      ]),
      ...refs.localities.map((l) => ({ loc: `/locality/${l.citySlug}/${l.slug}` })),
    ];
  },
  /** Search pages with results: each mode per city, and single facets (locality, BHK, type) that have listings. */
  search: async () => {
    const refs = await getRefs();
    const out: SitemapEntry[] = [];
    for (const c of refs.cities) {
      const f = await cityFacets(c.slug);
      for (const purpose of ['buy', 'rent'] as const) {
        const scope = { purpose, segment: 'residential' as const };
        if (!f.count(scope)) continue;
        out.push({ loc: `/${purpose}/${c.slug}` });
        for (const l of refs.localitiesOf(c.slug)) if (f.count({ ...scope, locality: l.slug })) out.push({ loc: `/${purpose}/${c.slug}/${l.slug}` });
        for (const b of [1, 2, 3, 4, 5]) if (f.count({ ...scope, bhk: b })) out.push({ loc: `/${purpose}/${c.slug}/${b}-bhk` });
        for (const t of RES_TYPES) if (f.count({ ...scope, type: t })) out.push({ loc: `/${purpose}/${c.slug}/${typeSlug(t)}` });
      }
      if (f.count({ segment: 'commercial' })) {
        out.push({ loc: `/commercial/${c.slug}` });
        for (const t of COM_TYPES) if (f.count({ segment: 'commercial', type: t })) out.push({ loc: `/commercial/${c.slug}/${typeSlug(t)}` });
      }
    }
    return out;
  },
  /** Active, open listings (pending and closed listings are left out). */
  listings: async () => (await sitemapData()).listings.map((l) => ({ loc: `/property/${l.id}`, lastmod: String(l.posted_at).slice(0, 10) })),
  /** Projects and builder profiles. */
  projects: async () => {
    const [refs, data] = await Promise.all([getRefs(), sitemapData()]);
    return [...data.projects.map((p) => ({ loc: `/projects/${p.city_slug}/${p.slug}` })), ...refs.builders.map((b) => ({ loc: `/builders/${b.slug}` }))];
  },
};

const xmlHeaders = { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' };

export function sitemapIndexXml(origin: string): Response {
  const parts = Object.keys(SITEMAP_PARTS).map((p) => `  <sitemap><loc>${origin}/sitemap-${p}.xml</loc></sitemap>`).join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${parts}\n</sitemapindex>`, { headers: xmlHeaders });
}

export function urlsetXml(origin: string, entries: SitemapEntry[]): Response {
  const urls = entries.map((e) => `  <url><loc>${origin}${e.loc}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ''}</url>`).join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`, { headers: xmlHeaders });
}
