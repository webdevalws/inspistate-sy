import type { APIRoute } from 'astro';
import { setListingStatus } from '../../../../lib/repo';

// Approve or reject a pending listing (protected by middleware).
export const POST: APIRoute = async ({ params, request, redirect }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return new Response('Bad id', { status: 400 });
  const action = String((await request.formData()).get('action') ?? '');
  if (action !== 'approve' && action !== 'reject') return new Response('Bad action', { status: 400 });
  await setListingStatus(id, action === 'approve' ? 'active' : 'rejected');
  return redirect(`/admin?done=${action}#listings`, 303);
};
