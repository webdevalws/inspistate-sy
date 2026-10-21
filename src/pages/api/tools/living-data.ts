import type { APIRoute } from 'astro';
import { getRefs } from '../../../lib/repo';
import { livingData, sampleRentals } from '../../../lib/community';

// Data for the cost-of-living (rent vs buy) wizard. With ?locality&bhk also returns live rentals.
export const GET: APIRoute = async ({ url }) => {
  const refs = await getRefs();
  const city = refs.city(url.searchParams.get('city') ?? '');
  if (!city) return Response.json({ error: 'Unknown city' }, { status: 422 });
  const locality = url.searchParams.get('locality');
  const bhk = Number(url.searchParams.get('bhk'));
  if (locality && bhk) {
    if (!refs.locality(city.slug, locality)) return Response.json({ error: 'Unknown locality' }, { status: 422 });
    const rentals = await sampleRentals(city.slug, locality, bhk);
    return Response.json({ rentals: rentals.map((r) => ({ ...r, href: `/property/${r.id}`, localityName: refs.locality(city.slug, r.locality_slug)?.name })) });
  }
  const rows = await livingData(city.slug);
  const localities = refs.localitiesOf(city.slug).map((l) => {
    const pick = (purpose: 'buy' | 'rent', bhk: number) => rows.find((r) => r.locality_slug === l.slug && r.purpose === purpose && r.bhk === bhk);
    return {
      slug: l.slug, name: l.name, ratePerSqft: l.ratePerSqft, rentPerSqft: l.rentPerSqft,
      byBhk: Object.fromEntries([1, 2, 3, 4].map((b) => [b, { sale: pick('buy', b)?.avg ?? null, rent: pick('rent', b)?.avg ?? null }])),
    };
  });
  return Response.json({ city: city.name, localities }, { headers: { 'cache-control': 'public, max-age=300' } });
};
