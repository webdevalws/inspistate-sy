// Field validation for a listing form, shared by "post property" (/api/listings) and the owner's edit
// (/api/account/listings/[id]) so both accept exactly the same values.
import type { NewListing, Refs } from './repo';
import { PG_FOR, PG_SHARING } from './search';

const RES_TYPES = ['Apartment', 'Builder Floor', 'Villa', 'Plot', 'PG'];
const COM_TYPES = ['Office', 'Shop'];
const FURNISHING = ['Furnished', 'Semi-Furnished', 'Unfurnished'];

export type ListingFields = Omit<NewListing, 'userId' | 'postedBy'>;

export function parseListingFields(form: FormData, refs: Refs): { ok: true; fields: ListingFields } | { ok: false; error: string } {
  const s = (k: string) => String(form.get(k) ?? '').trim();
  const n = (k: string) => Number(s(k));
  const fail = (error: string) => ({ ok: false as const, error });

  const purpose = s('purpose') === 'rent' ? 'rent' : s('purpose') === 'buy' ? 'buy' : null;
  const segment = s('segment') === 'commercial' ? 'commercial' : s('segment') === 'residential' ? 'residential' : null;
  if (!purpose || !segment) return fail('Choose whether you want to sell or rent, and the category');
  const type = s('type');
  if (!(segment === 'residential' ? RES_TYPES : COM_TYPES).includes(type)) return fail('Invalid property type');
  // PG / co-living: rent only, no BHK; sharing and who it is for are required, rent is per bed.
  const isPg = type === 'PG';
  if (isPg && purpose !== 'rent') return fail('A PG / co-living can only be rented out');
  const pgSharing = isPg ? s('pgSharing') : null;
  const pgFor = isPg ? s('pgFor') : null;
  if (isPg && !(Object.hasOwn(PG_SHARING, pgSharing!) && Object.hasOwn(PG_FOR, pgFor!))) return fail('Choose the sharing type and who the PG is for');
  const pgFood = isPg ? (s('pgFood') === '1' ? 1 : 0) : null;

  const citySlug = s('city');
  const localitySlug = s('locality');
  if (!refs.locality(citySlug, localitySlug)) return fail('Choose a city and locality');

  const hasBhk = segment === 'residential' && type !== 'Plot' && !isPg;
  const bhk = hasBhk ? n('bhk') : 0;
  if (hasBhk && !(Number.isInteger(bhk) && bhk >= 1 && bhk <= 10)) return fail('Invalid BHK');
  const areaSqft = n('area');
  if (!(areaSqft >= 50 && areaSqft <= 1_000_000)) return fail('Area must be between 50 and 10,00,000 sq.ft');
  const price = n('price');
  const [minPrice, maxPrice] = purpose === 'buy' ? [100_000, 10_000_000_000] : [1_000, 50_000_000];
  if (!(price >= minPrice && price <= maxPrice)) return fail(purpose === 'buy' ? 'Price looks out of range' : 'Rent looks out of range');
  const furnishing = type === 'Plot' ? 'Unfurnished' : FURNISHING.includes(s('furnishing')) ? s('furnishing') : 'Unfurnished';
  const description = s('description').slice(0, 2000) || null;
  const contactName = s('name').slice(0, 100);
  const contactPhone = s('phone').replace(/\D/g, '').slice(-10);
  if (!contactName) return fail('Your name is required');
  if (!/^[6-9]\d{9}$/.test(contactPhone)) return fail('Enter a valid 10-digit mobile number');

  return {
    ok: true,
    fields: { purpose, segment, type, bhk, areaSqft: Math.round(areaSqft), price: Math.round(price), citySlug, localitySlug, furnishing, description, contactName, contactPhone, pgSharing, pgFor, pgFood },
  };
}
