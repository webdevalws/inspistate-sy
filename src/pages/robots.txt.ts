import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site, url }) =>
  new Response(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nDisallow: /shortlist\n\nSitemap: ${(site ?? url).origin}/sitemap.xml\n`, {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
