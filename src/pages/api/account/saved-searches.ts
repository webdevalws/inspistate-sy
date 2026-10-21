import type { APIRoute } from 'astro';
import { deleteSavedSearch, saveSearch } from '../../../lib/accounts';

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user) return Response.json({ error: 'Login required' }, { status: 401 });
  const b = (await request.json().catch(() => ({}))) as { label?: string; url?: string };
  const url = String(b.url ?? '');
  // Only same-site relative search URLs can be saved.
  if (!/^\/(buy|rent|commercial|new-projects)\/[a-z0-9-]+/.test(url)) return Response.json({ error: 'Not a search URL' }, { status: 422 });
  await saveSearch(locals.user.id, String(b.label ?? 'My search').trim() || 'My search', url);
  return Response.json({ ok: true });
};

export const DELETE: APIRoute = async ({ url, locals }) => {
  if (!locals.user) return Response.json({ error: 'Login required' }, { status: 401 });
  const id = Number(url.searchParams.get('id'));
  if (!Number.isInteger(id)) return Response.json({ error: 'Bad id' }, { status: 422 });
  await deleteSavedSearch(locals.user.id, id);
  return Response.json({ ok: true });
};
