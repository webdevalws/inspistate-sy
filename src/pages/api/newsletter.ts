import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { guard } from '../../lib/limits';

export const POST: APIRoute = async (ctx) => {
  const blocked = await guard(ctx, 'newsletter', 5);
  if (blocked) return blocked;
  const { request } = ctx;
  const body =(await request.json().catch(() => ({}))) as { email?: string };
  const email = String(body.email ?? '').trim().toLowerCase();
  if (email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: 'Enter a valid email address' }, { status: 422 });
  await env.DB.prepare('INSERT OR IGNORE INTO newsletter_subscribers (email) VALUES (?)').bind(email).run();
  return Response.json({ ok: true });
};
