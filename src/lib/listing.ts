import type { Listing } from '../data/types';
import type { Refs } from './repo';
import { formatPrice, formatRent } from './format';
import { PG_FOR, PG_SHARING } from './search';

export function listingTitle(l: Listing, refs: Refs): string {
  const loc = refs.locality(l.citySlug, l.localitySlug)?.name ?? '';
  const city = refs.city(l.citySlug)?.name ?? '';
  if (l.pg) return `${PG_SHARING[l.pg.sharing]} PG${l.pg.for === 'any' ? '' : ` for ${PG_FOR[l.pg.for]}`} in ${loc}, ${city}`;
  const what = l.bhk ? `${l.bhk} BHK ${l.type === 'Apartment' ? 'Flat' : l.type}` : l.type === 'Plot' ? 'Residential Plot' : `${l.type} Space`;
  return `${what} for ${l.purpose === 'buy' ? 'Sale' : 'Rent'} in ${loc}, ${city}`;
}

export const listingPrice = (l: Listing) => (l.purpose === 'buy' ? formatPrice(l.price) : l.pg ? `${formatRent(l.price)} per bed` : formatRent(l.price));

/** Short PG facts for cards and the detail page: ["Double sharing", "For women", "Food included"]. */
export const pgFacts = (l: Listing) =>
  l.pg ? [PG_SHARING[l.pg.sharing], l.pg.for === 'any' ? 'For anyone' : `For ${PG_FOR[l.pg.for].toLowerCase()}`, l.pg.food ? 'Food included' : 'No food'] : [];

export const daysSince = (iso: string) => Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 86400000));

export const photoUrl = (key: string) => `/media/${key}`;
