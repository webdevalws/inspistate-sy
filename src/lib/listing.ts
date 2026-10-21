import type { Listing } from '../data/types';
import type { Refs } from './repo';
import { formatPrice, formatRent } from './format';

export function listingTitle(l: Listing, refs: Refs): string {
  const loc = refs.locality(l.citySlug, l.localitySlug)?.name ?? '';
  const city = refs.city(l.citySlug)?.name ?? '';
  const what = l.bhk ? `${l.bhk} BHK ${l.type === 'Apartment' ? 'Flat' : l.type}` : l.type === 'Plot' ? 'Residential Plot' : `${l.type} Space`;
  return `${what} for ${l.purpose === 'buy' ? 'Sale' : 'Rent'} in ${loc}, ${city}`;
}

export const listingPrice = (l: Listing) => (l.purpose === 'buy' ? formatPrice(l.price) : formatRent(l.price));

export const daysSince = (iso: string) => Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 86400000));

export const photoUrl = (key: string) => `/media/${key}`;
