import type { APIRoute } from 'astro';
import { SITEMAP_PARTS, urlsetXml } from '../lib/sitemap';

// One sitemap part, e.g. /sitemap-search.xml. Unknown parts are 404. See src/lib/sitemap.ts.
export const GET: APIRoute = async ({ params, site, url }) => {
  const part = params.part ?? '';
  if (!Object.hasOwn(SITEMAP_PARTS, part)) return new Response('Not found', { status: 404 });
  return urlsetXml((site ?? url).origin, await SITEMAP_PARTS[part]());
};
