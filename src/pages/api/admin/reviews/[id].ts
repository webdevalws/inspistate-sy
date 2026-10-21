import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

// Publish or reject a submitted review (protected by middleware).
export const POST: APIRoute = async ({ params, request, redirect }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return new Response('Bad id', { status: 400 });
  const action = String((await request.formData()).get('action') ?? '');
  if (action !== 'publish' && action !== 'reject') return new Response('Bad action', { status: 400 });
  await env.DB.prepare('UPDATE reviews SET status = ? WHERE id = ?').bind(action === 'publish' ? 'published' : 'rejected', id).run();
  return redirect('/admin#reviews', 303);
};
