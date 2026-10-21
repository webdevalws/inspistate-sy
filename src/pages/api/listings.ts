import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { addListingPhotos, createListing, getRefs } from '../../lib/repo';
import { listingAllowance } from '../../lib/accounts';

const MAX_PHOTOS = 8;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const RES_TYPES = ['Apartment', 'Builder Floor', 'Villa', 'Plot'];
const COM_TYPES = ['Office', 'Shop'];
const FURNISHING = ['Furnished', 'Semi-Furnished', 'Unfurnished'];

/** Identify image type from magic bytes rather than trusting the client-supplied MIME type. */
function sniffImage(b: Uint8Array): { ext: string; mime: string } | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: 'jpg', mime: 'image/jpeg' };
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { ext: 'png', mime: 'image/png' };
  if (String.fromCharCode(...b.slice(0, 4)) === 'RIFF' && String.fromCharCode(...b.slice(8, 12)) === 'WEBP') return { ext: 'webp', mime: 'image/webp' };
  return null;
}

const bad = (error: string, status = 422) => Response.json({ error }, { status });

export const POST: APIRoute = async ({ request, locals }) => {
  // Posting needs an account, and each role has its own listing allowance.
  const allowance = await listingAllowance(locals.user);
  if (!allowance.canPost) {
    const msg = {
      login: 'Log in to post your property.',
      register: 'Finish creating your account first.',
      buyer: 'Your account is set up as a User. Switch to Seller to list a property.',
      limit: `You have used all ${allowance.limit} free listings. ${locals.user?.role === 'agent' ? 'Choose a plan for unlimited listings.' : 'Remove a listing to post another.'}`,
    }[allowance.reason ?? 'login'];
    return bad(msg, allowance.reason === 'login' ? 401 : 403);
  }
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return bad('Expected multipart form data', 400);
  }
  const s = (k: string) => String(form.get(k) ?? '').trim();
  const n = (k: string) => Number(s(k));

  const purpose = s('purpose') === 'rent' ? 'rent' : s('purpose') === 'buy' ? 'buy' : null;
  const segment = s('segment') === 'commercial' ? 'commercial' : s('segment') === 'residential' ? 'residential' : null;
  if (!purpose || !segment) return bad('Choose whether you want to sell or rent, and the category');
  const type = s('type');
  if (!(segment === 'residential' ? RES_TYPES : COM_TYPES).includes(type)) return bad('Invalid property type');

  const refs = await getRefs();
  const citySlug = s('city');
  const localitySlug = s('locality');
  if (!refs.locality(citySlug, localitySlug)) return bad('Choose a city and locality');

  const hasBhk = segment === 'residential' && type !== 'Plot';
  const bhk = hasBhk ? n('bhk') : 0;
  if (hasBhk && !(Number.isInteger(bhk) && bhk >= 1 && bhk <= 10)) return bad('Invalid BHK');
  const areaSqft = n('area');
  if (!(areaSqft >= 50 && areaSqft <= 1_000_000)) return bad('Area must be between 50 and 10,00,000 sq.ft');
  const price = n('price');
  const [minPrice, maxPrice] = purpose === 'buy' ? [100_000, 10_000_000_000] : [1_000, 50_000_000];
  if (!(price >= minPrice && price <= maxPrice)) return bad(purpose === 'buy' ? 'Price looks out of range' : 'Rent looks out of range');
  const furnishing = type === 'Plot' ? 'Unfurnished' : FURNISHING.includes(s('furnishing')) ? s('furnishing') : 'Unfurnished';
  const description = s('description').slice(0, 2000) || null;
  const contactName = s('name').slice(0, 100);
  const contactPhone = s('phone').replace(/\D/g, '').slice(-10);
  if (!contactName) return bad('Your name is required');
  if (!/^[6-9]\d{9}$/.test(contactPhone)) return bad('Enter a valid 10-digit mobile number');

  // Validate every photo before writing anything.
  const files = form.getAll('photos').filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > MAX_PHOTOS) return bad(`Upload at most ${MAX_PHOTOS} photos`);
  const photos: { bytes: ArrayBuffer; ext: string; mime: string }[] = [];
  for (const f of files) {
    if (f.size > MAX_PHOTO_BYTES) return bad(`${f.name} is larger than 5 MB`);
    const bytes = await f.arrayBuffer();
    const kind = sniffImage(new Uint8Array(bytes.slice(0, 12)));
    if (!kind) return bad(`${f.name} is not a JPEG, PNG or WebP image`);
    photos.push({ bytes, ...kind });
  }

  const { id, editToken } = await createListing({
    purpose, segment, type, bhk, areaSqft: Math.round(areaSqft), price: Math.round(price),
    citySlug, localitySlug, furnishing, description, contactName, contactPhone, userId: locals.user!.id,
    postedBy: locals.user!.role === 'agent' ? 'Agent' : 'Owner',
  });

  const keys = photos.map((p) => `listings/${id}/${crypto.randomUUID()}.${p.ext}`);
  await Promise.all(photos.map((p, i) => env.MEDIA.put(keys[i], p.bytes, { httpMetadata: { contentType: p.mime } })));
  await addListingPhotos(id, keys);

  return Response.json({ ok: true, id, previewUrl: `/property/${id}?token=${editToken}` }, { status: 201 });
};
