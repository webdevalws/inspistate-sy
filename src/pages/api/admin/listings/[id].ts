import type { APIRoute } from 'astro';
import { closeListing, setListingStatus } from '../../../../lib/repo';

// Approve or reject a pending listing, or (like its owner) mark it sold / rented / delete it.
// Protected by middleware (admin Basic auth + same-origin).
export const POST: APIRoute = async ({ params, request, redirect }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return new Response('Bad id', { status: 400 });
  const action = String((await request.formData()).get('action') ?? '');
  if (action === 'sold' || action === 'rented' || action === 'delete') {
    await closeListing(id, action === 'delete' ? 'deleted' : action);
    return redirect(`/admin?done=${action}#listings`, 303);
  }
  if (action !== 'approve' && action !== 'reject') return new Response('Bad action', { status: 400 });
  await setListingStatus(id, action === 'approve' ? 'active' : 'rejected');
  return redirect(`/admin?done=${action}#listings`, 303);
};
