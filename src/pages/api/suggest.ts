import type { APIRoute } from 'astro';
import { allProjects, cached, getRefs } from '../../lib/repo';
import { guard } from '../../lib/limits';
import { projectUrl } from '../../lib/urls';

// Project and builder suggestions for the search box, fetched as the visitor types (localities stay in the page,
// since near-me and plain-language search need them in the browser). Answers from a cached in-memory list, so
// a keystroke never queries projects; a generous per-IP daily limit stops abuse.
const SUGGEST_PER_IP_PER_DAY = 2000;
const MAX = 8;

type Item = { label: string; sub: string; href: string; key: string; citySlug: string | null };
const suggestIndex = () => cached('suggestIndex', async (): Promise<Item[]> => {
  const [refs, projects] = await Promise.all([getRefs(), allProjects()]);
  return [
    ...projects.map((p) => ({ label: p.name, sub: `Project · ${refs.locality(p.citySlug, p.localitySlug)?.name ?? ''}`, href: projectUrl(p), key: p.name.toLowerCase(), citySlug: p.citySlug })),
    ...refs.builders.map((b) => ({ label: b.name, sub: 'Builder', href: `/builders/${b.slug}`, key: b.name.toLowerCase(), citySlug: null })),
  ];
});

export const GET: APIRoute = async (ctx) => {
  const blocked = await guard(ctx, 'suggest', SUGGEST_PER_IP_PER_DAY);
  if (blocked) return blocked;
  const q = (ctx.url.searchParams.get('q') ?? '').trim().toLowerCase().slice(0, 60);
  const city = ctx.url.searchParams.get('city') ?? '';
  if (q.length < 2) return Response.json({ items: [] });
  const items = (await suggestIndex())
    .filter((i) => i.key.includes(q))
    .sort((a, b) => Number(b.citySlug === city) - Number(a.citySlug === city)) // the chosen city's projects first
    .slice(0, MAX)
    .map(({ label, sub, href }) => ({ label, sub, href }));
  return Response.json({ items }, { headers: { 'cache-control': 'private, max-age=300' } });
};
