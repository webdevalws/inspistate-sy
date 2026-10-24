import type { APIRoute } from 'astro';
import { closeListing, deleteListingPhotos, getOwnedListing, getRefs, updateListing } from '../../../../lib/repo';
import { parseListingFields } from '../../../../lib/listing-form';

// Owner actions on one listing: edit (JSON, from the post-property form) or mark sold / rented / delete
// (plain form posts from /account, answered with a redirect). Only the listing's owner may act; admins
// moderate through /api/admin/listings/[id]. Cross-origin POSTs are rejected by middleware.
export const POST: APIRoute = async ({ params, request, locals, redirect }) => {
  // Read the body before any early return: the local dev runtime fails the next request when a
  // response is sent with the request body still unread.
  const form = await request.formData().catch(() => null);
  if (!locals.user) return Response.json({ error: 'Log in to manage your listings.' }, { status: 401 });
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return Response.json({ error: 'Unknown listing' }, { status: 404 });
  if (!form) return Response.json({ error: 'Expected form data' }, { status: 400 });
  const action = String(form.get('action') ?? '');

  const listing = await getOwnedListing(id);
  if (!listing || listing.closed === 'deleted') return Response.json({ error: 'Unknown listing' }, { status: 404 });
  if (listing.user_id !== locals.user.id) return Response.json({ error: 'You can only change your own listings.' }, { status: 403 });
  if (listing.closed) return Response.json({ error: `This listing is already marked ${listing.closed}.` }, { status: 409 });

  if (action === 'edit') {
    const parsed = parseListingFields(form, await getRefs());
    if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 422 });
    await updateListing(id, parsed.fields);
    return Response.json({ ok: true, id, previewUrl: `/property/${id}?token=${listing.edit_token}` });
  }

  const as = action === 'sold' || action === 'rented' || action === 'delete' ? (action === 'delete' ? 'deleted' : action) : null;
  if (!as) return Response.json({ error: 'Unknown action' }, { status: 400 });
  if (as === 'sold' && listing.purpose !== 'buy') return Response.json({ error: 'Only a listing for sale can be marked sold.' }, { status: 422 });
  if (as === 'rented' && listing.purpose !== 'rent') return Response.json({ error: 'Only a listing for rent can be marked rented.' }, { status: 422 });
  await closeListing(id, as);
  // Deleting is final for the owner: the photos go too (sold / rented listings keep theirs).
  if (as === 'deleted') await deleteListingPhotos(id);
  return redirect(`/account?listing=${as}#listings`, 303);
};
