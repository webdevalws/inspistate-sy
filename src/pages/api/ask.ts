import type { APIRoute } from 'astro';
import { getRefs } from '../../lib/repo';
import { parseQuery } from '../../lib/nlsearch';
import { guard } from '../../lib/limits';

export const GET: APIRoute = async (ctx) => {
  const blocked = await guard(ctx, 'ask', 60);
  if (blocked) return blocked;
  const { url } = ctx;
  const q =(url.searchParams.get('q') ?? '').slice(0, 300);
  if (!q.trim()) return Response.json({ error: 'Empty query' }, { status: 422 });
  const refs = await getRefs();
  const fallback = refs.city(url.searchParams.get('city') ?? '') ?? refs.cities[0];
  const parsed = parseQuery(q, refs.cities, refs.localities, fallback);
  return Response.json({ url: parsed.url, summary: parsed.summary });
};
