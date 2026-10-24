import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

// Serves uploaded photos from R2. Keys are random UUIDs, so objects are immutable.
export const GET: APIRoute = async ({ params, request }) => {
  const key = params.key;
  if (!key || !/^listings\/\d+\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(key)) return new Response('Not found', { status: 404 });

  const obj = await env.MEDIA.get(key, { onlyIf: request.headers });
  if (!obj) return new Response('Not found', { status: 404 });

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  headers.set('x-content-type-options', 'nosniff');
  if (!('body' in obj)) return new Response(null, { status: 304, headers });
  return new Response(obj.body, { headers });
};
