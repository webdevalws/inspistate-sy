import type { APIRoute } from 'astro';
import { setShortlisted, userShortlist } from '../../../lib/accounts';

export const GET: APIRoute = async ({ locals }) => {
  if (!locals.user) return Response.json({ items: null });
  return Response.json({ items: await userShortlist(locals.user.id) });
};

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user) return Response.json({ error: 'Login required' }, { status: 401 });
  const b = (await request.json().catch(() => ({}))) as { kind?: string; id?: number; saved?: boolean };
  if ((b.kind !== 'listing' && b.kind !== 'project') || !Number.isInteger(b.id) || (b.id ?? 0) <= 0) return Response.json({ error: 'Bad item' }, { status: 422 });
  await setShortlisted(locals.user.id, b.kind, b.id!, !!b.saved);
  return Response.json({ ok: true });
};
