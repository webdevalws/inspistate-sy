import type { APIRoute } from 'astro';
import { getListingsByIds, getProjectsByIds, getRefs } from '../../lib/repo';
import { listingPrice, listingTitle } from '../../lib/listing';
import { formatPrice } from '../../lib/format';
import { listingUrl, projectUrl } from '../../lib/urls';

// Resolves shortlist entries (stored client-side) into display data.
export const GET: APIRoute = async ({ url }) => {
  const ids = (key: string) => (url.searchParams.get(key) ?? '').split(',').map(Number).filter((n) => Number.isInteger(n) && n > 0).slice(0, 100);
  const [refs, listings, projects] = await Promise.all([getRefs(), getListingsByIds(ids('listings')), getProjectsByIds(ids('projects'))]);
  const items = [
    ...projects.map((p) => ({
      kind: 'project' as const, id: p.id, title: p.name, price: `${formatPrice(p.priceMin)} – ${formatPrice(p.priceMax)}`, href: projectUrl(p), hue: p.hue,
      sub: `${p.bhkLabel} · ${refs.locality(p.citySlug, p.localitySlug)?.name}`,
    })),
    ...listings.map((l) => ({
      kind: 'listing' as const, id: l.id, title: listingTitle(l, refs), price: listingPrice(l), href: listingUrl(l), hue: l.hue,
      sub: `${l.areaSqft.toLocaleString('en-IN')} sq.ft · ${l.postedBy}`, photo: l.photos[0] ? `/media/${l.photos[0]}` : null,
    })),
  ];
  return Response.json({ items });
};
