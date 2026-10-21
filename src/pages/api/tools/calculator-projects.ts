import type { APIRoute } from 'astro';
import { getRefs, projectsWithUnits } from '../../../lib/repo';
import { projectUrl } from '../../../lib/urls';

// Projects with price range and unit mix for the affordability calculator's recommendation bands.
export const GET: APIRoute = async ({ url }) => {
  const refs = await getRefs();
  const city = refs.city(url.searchParams.get('city') ?? '');
  if (!city) return Response.json({ error: 'Unknown city' }, { status: 422 });
  const projects = await projectsWithUnits(city.slug);
  return Response.json({
    data: projects.map((p) => ({
      id: p.id, name: p.name, href: projectUrl(p), image: `/images/project-${(p.id % 6) + 1}.svg`,
      locality: p.localitySlug, localityName: refs.locality(city.slug, p.localitySlug)?.name ?? '',
      builder: refs.builder(p.builderSlug)?.name ?? '', status: p.status, possession: p.possession,
      priceMin: p.priceMin, priceMax: p.priceMax,
      units: p.units,
    })),
  }, { headers: { 'cache-control': 'public, max-age=300' } });
};
