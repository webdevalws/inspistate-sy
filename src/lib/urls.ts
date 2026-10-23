import type { Listing, Project } from '../data/types';
import type { Mode } from './search';

export const searchUrl = (mode: Mode, citySlug: string, ...facets: string[]) =>
  `/${mode}/${citySlug}${facets.length ? '/' + facets.join('/') : ''}`;
export const newProjectsUrl = (citySlug: string) => `/new-projects/${citySlug}`;
export const projectUrl = (p: Pick<Project, 'citySlug' | 'slug'>) => `/projects/${p.citySlug}/${p.slug}`;
export const listingUrl = (l: Pick<Listing, 'id'>) => `/property/${l.id}`;
export const builderUrl = (slug: string) => `/builders/${slug}`;
export const cityUrl = (slug: string) => `/city/${slug}`;
export const localityUrl = (citySlug: string, slug: string) => `/locality/${citySlug}/${slug}`;
