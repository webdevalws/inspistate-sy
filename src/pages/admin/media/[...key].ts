import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

// Admin copy of /media for project and locality photos (admin password via middleware): shown in the admin even while
// the project or locality is hidden, when the public /media route no longer serves them. Never cached by shared caches.
export const GET: APIRoute = async ({ params }) => {
  const key = params.key;
  if (!key || !/^(projects\/\d+|localities\/[a-z0-9-]+\/[a-z0-9-]+)\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(key)) return new Response('Not found', { status: 404 });
  const obj = await env.MEDIA.get(key);
  if (!obj) return new Response('Not found', { status: 404 });
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('cache-control', 'private, max-age=3600');
  headers.set('x-content-type-options', 'nosniff');
  return new Response(obj.body, { headers });
};
