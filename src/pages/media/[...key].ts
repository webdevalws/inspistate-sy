import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { photosVisible } from '../../lib/repo';

// Serves uploaded photos from R2. Keys are random UUIDs, so an object never changes; but photos of rejected or
// deleted listings must stop being served, so the listing is checked and caches keep a copy for a day only.
export const GET: APIRoute = async ({ params, request }) => {
  const key = params.key;
  const m = key?.match(/^listings\/(\d+)\/[0-9a-f-]{36}\.(jpg|png|webp)$/);
  if (!key || !m) return new Response('Not found', { status: 404 });
  if (!(await photosVisible(Number(m[1])))) return new Response('Not found', { status: 404 });

  const obj = await env.MEDIA.get(key, { onlyIf: request.headers });
  if (!obj) return new Response('Not found', { status: 404 });

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  headers.set('cache-control', 'public, max-age=86400');
  headers.set('x-content-type-options', 'nosniff');
  if (!('body' in obj)) return new Response(null, { status: 304, headers });
  return new Response(obj.body, { headers });
};
