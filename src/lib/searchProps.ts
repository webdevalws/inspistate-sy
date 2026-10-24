import { allProjects, getRefs } from './repo';
import { projectUrl } from './urls';

/** Data the SearchBox island needs for autocomplete, near-me and AI search. */
export async function searchBoxProps() {
  const [refs, projects] = await Promise.all([getRefs(), allProjects()]);
  return {
    cities: refs.cities.map((c) => ({ slug: c.slug, name: c.name, lat: c.lat, lng: c.lng })),
    localities: refs.localities.map((l) => ({ slug: l.slug, name: l.name, citySlug: l.citySlug, lat: +l.lat.toFixed(3), lng: +l.lng.toFixed(3) })),
    projects: projects.map((p) => ({ name: p.name, href: projectUrl(p), citySlug: p.citySlug, locality: refs.locality(p.citySlug, p.localitySlug)?.name ?? '' })),
    builders: refs.builders.map((b) => ({ name: b.name, slug: b.slug })),
  };
}
