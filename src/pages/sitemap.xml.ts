import type { APIRoute } from 'astro';
import { getRefs, sitemapData } from '../lib/repo';
import { GUIDE_THEMES } from '../lib/community';
import { SERVICES, TOOLS } from '../lib/catalog';
import { GUIDES } from '../data/guides';
import { IDEA_CATEGORIES } from '../data/interiors';
import { LOAN_PRODUCTS } from '../data/loans';

export const GET: APIRoute = async ({ site, url }) => {
  const base = (site ?? url).origin;
  const [refs, data] = await Promise.all([getRefs(), sitemapData()]);
  const paths: { loc: string; lastmod?: string }[] = [
    { loc: '/' }, { loc: '/builders' }, { loc: '/tools' }, { loc: '/services' }, { loc: '/guides' }, { loc: '/post-property' }, { loc: '/compare' }, { loc: '/agents' }, { loc: '/forum' }, { loc: '/glossary' },
    ...['about', 'contact', 'faq', 'fraud-awareness', 'terms', 'privacy', 'careers', 'press', 'app-download', 'partner-with-us', 'advertise', 'business', 'reviews', 'research', 'women-homebuyers', 'home-loan-interest-rates', 'credit-cards', 'design-ideas', 'refer'].map((p) => ({ loc: `/${p}` })),
    ...LOAN_PRODUCTS.map((p) => ({ loc: `/loans/${p.slug}` })),
    ...IDEA_CATEGORIES.map((c) => ({ loc: `/design-ideas/${c.slug}` })),
    ...['india-price-index', 'rental-yield-report', 'fastest-growing-localities', 'cost-of-a-2bhk'].map((s) => ({ loc: `/research/${s}` })),
    ...TOOLS.map((t) => ({ loc: `/tools/${t.slug}` })),
    ...SERVICES.map((s) => ({ loc: `/services/${s.slug}` })),
    ...GUIDES.map((g) => ({ loc: `/guides/${g.slug}` })),
    ...refs.builders.map((b) => ({ loc: `/builders/${b.slug}` })),
    ...refs.localities.map((l) => ({ loc: `/locality/${l.citySlug}/${l.slug}` })),
    ...refs.cities.flatMap((c) => [
      { loc: `/city/${c.slug}` }, { loc: `/managed-rentals/${c.slug}` }, { loc: `/research/city-${c.slug}` }, { loc: `/new-projects/${c.slug}` }, { loc: `/property-rates/${c.slug}` }, { loc: `/heatmap/${c.slug}` },
      ...Object.keys(GUIDE_THEMES).map((t) => ({ loc: `/localities/${c.slug}/${t}` })),
      ...(['buy', 'rent', 'commercial'] as const).map((m) => ({ loc: `/${m}/${c.slug}` })),
      ...[1, 2, 3, 4].map((b) => ({ loc: `/buy/${c.slug}/${b}-bhk` })),
    ]),
    ...refs.localities.flatMap((l) => [{ loc: `/buy/${l.citySlug}/${l.slug}` }, { loc: `/rent/${l.citySlug}/${l.slug}` }]),
    ...data.projects.map((p) => ({ loc: `/projects/${p.city_slug}/${p.slug}` })),
    ...data.listings.map((l) => ({ loc: `/property/${l.id}`, lastmod: String(l.posted_at).slice(0, 10) })),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((p) => `  <url><loc>${base}${p.loc}</loc>${p.lastmod ? `<lastmod>${p.lastmod}</lastmod>` : ''}</url>`).join('\n')}
</urlset>`;
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
};
