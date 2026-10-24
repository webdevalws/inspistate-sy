import { getRefs } from './repo';

/**
 * Data the SearchBox island needs in the page: cities and localities (for near-me and plain-language search).
 * Project and builder suggestions are fetched on demand from /api/suggest.
 */
export async function searchBoxProps() {
  const refs = await getRefs();
  return {
    cities: refs.cities.map((c) => ({ slug: c.slug, name: c.name, lat: c.lat, lng: c.lng })),
    localities: refs.localities.map((l) => ({ slug: l.slug, name: l.name, citySlug: l.citySlug, lat: +l.lat.toFixed(3), lng: +l.lng.toFixed(3) })),
  };
}
