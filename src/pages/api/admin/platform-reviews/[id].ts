import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { logAdmin } from '../../../../lib/audit';

// Publish or reject a submitted platform review (protected by middleware).
export const POST: APIRoute = async (ctx) => {
  const { params, request, redirect } = ctx;
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return new Response('Bad id', { status: 400 });
  const action = String((await request.formData()).get('action') ?? '');
  if (action !== 'publish' && action !== 'reject') return new Response('Bad action', { status: 400 });
  await env.DB.prepare('UPDATE platform_reviews SET status = ? WHERE id = ?').bind(action === 'publish' ? 'published' : 'rejected', id).run();
  await logAdmin(ctx, `site-review.${action}`, `site-review #${id}`);
  return redirect('/admin#platform-reviews', 303);
};
