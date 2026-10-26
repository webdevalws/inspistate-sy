import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { localityPhotoVisible, photosVisible, projectPhotosVisible } from '../../lib/repo';

// Serves uploaded photos from R2. Keys are random UUIDs, so an object never changes; but photos of rejected or
// deleted listings (and of hidden projects and localities) must stop being served, so the owner is checked and
// caches keep a copy for a day only.
export const GET: APIRoute = async ({ params, request }) => {
  const key = params.key;
  const m = key?.match(/^(listings|projects)\/(\d+)\/[0-9a-f-]{36}\.(jpg|png|webp)$/);
  const loc = key?.match(/^localities\/([a-z0-9-]+)\/([a-z0-9-]+)\/[0-9a-f-]{36}\.(jpg|png|webp)$/);
  if (!key || !(m || loc)) return new Response('Not found', { status: 404 });
  const visible = m ? await (m[1] === 'listings' ? photosVisible : projectPhotosVisible)(Number(m[2])) : await localityPhotoVisible(loc![1], loc![2]);
  if (!visible) return new Response('Not found', { status: 404 });

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
