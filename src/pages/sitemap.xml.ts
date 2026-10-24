import type { APIRoute } from 'astro';
import { sitemapIndexXml } from '../lib/sitemap';

// Sitemap index: lists the parts at /sitemap-{static,places,search,listings,projects}.xml (src/lib/sitemap.ts).
export const GET: APIRoute = ({ site, url }) => sitemapIndexXml((site ?? url).origin);
