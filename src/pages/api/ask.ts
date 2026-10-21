import type { APIRoute } from 'astro';
import { getRefs } from '../../lib/repo';
import { parseQuery } from '../../lib/nlsearch';

export const GET: APIRoute = async ({ url }) => {
  const q = (url.searchParams.get('q') ?? '').slice(0, 300);
  if (!q.trim()) return Response.json({ error: 'Empty query' }, { status: 422 });
  const refs = await getRefs();
  const fallback = refs.city(url.searchParams.get('city') ?? '') ?? refs.cities[0];
  const parsed = parseQuery(q, refs.cities, refs.localities, fallback);
  return Response.json({ url: parsed.url, summary: parsed.summary });
};
