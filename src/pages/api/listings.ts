import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { addListingPhotos, createListing, getRefs } from '../../lib/repo';
import { listingAllowance } from '../../lib/accounts';
import { parseListingFields } from '../../lib/listing-form';
import { stripMetadata, type ImageMime } from '../../lib/strip-metadata';

const MAX_PHOTOS = 8;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

/** Identify image type from magic bytes rather than trusting the client-supplied MIME type. */
function sniffImage(b: Uint8Array): { ext: string; mime: ImageMime } | null {
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
      buyer: 'Your account is set up as a Buyer. Switch to Seller to list a property.',
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
  const parsed = parseListingFields(form, await getRefs());
  if (!parsed.ok) return bad(parsed.error);

  // Validate every photo before writing anything.
  const files = form.getAll('photos').filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > MAX_PHOTOS) return bad(`Upload at most ${MAX_PHOTOS} photos`);
  const photos: { bytes: Uint8Array; ext: string; mime: ImageMime }[] = [];
  for (const f of files) {
    if (f.size > MAX_PHOTO_BYTES) return bad(`${f.name} is larger than 5 MB`);
    const bytes = await f.arrayBuffer();
    const kind = sniffImage(new Uint8Array(bytes.slice(0, 12)));
    if (!kind) return bad(`${f.name} is not a JPEG, PNG or WebP image`);
    // EXIF (incl. GPS location), XMP, IPTC and text metadata are removed before anything is stored.
    photos.push({ bytes: stripMetadata(bytes, kind.mime), ...kind });
  }

  const { id, editToken } = await createListing({
    ...parsed.fields, userId: locals.user!.id,
    postedBy: locals.user!.role === 'agent' ? 'Agent' : 'Owner',
  });

  const keys = photos.map((p) => `listings/${id}/${crypto.randomUUID()}.${p.ext}`);
  await Promise.all(photos.map((p, i) => env.MEDIA.put(keys[i], p.bytes, { httpMetadata: { contentType: p.mime } })));
  await addListingPhotos(id, keys);

  return Response.json({ ok: true, id, previewUrl: `/property/${id}?token=${editToken}` }, { status: 201 });
};
