import type { APIRoute } from 'astro';
import { closeListing, setListingStatus } from '../../../../lib/repo';
import { logAdmin } from '../../../../lib/audit';
import { safeNext } from '../../../../lib/redirect';

// Approve or reject a pending listing, or (like its owner) mark it sold / rented / delete it.
// Protected by middleware (admin Basic auth + same-origin). Back to the listings page the form came from (`back`,
// only /admin/listings pages), else Pending.
export const POST: APIRoute = async (ctx) => {
  const { params, request, redirect } = ctx;
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return new Response('Bad id', { status: 400 });
  const form = await request.formData();
  const action = String(form.get('action') ?? '');
  const backRaw = safeNext(form.get('back'));
  const back = backRaw?.startsWith('/admin/listings') ? backRaw : '/admin/listings';
  const to = (done: string) => { const u = new URL(back, 'https://x'); u.searchParams.set('done', done); return redirect(`${u.pathname}${u.search}`, 303); };
  if (action === 'sold' || action === 'rented' || action === 'delete') {
    await closeListing(id, action === 'delete' ? 'deleted' : action);
    await logAdmin(ctx, `listing.${action}`, `listing #${id}`);
    return to(action);
  }
  if (action !== 'approve' && action !== 'reject') return new Response('Bad action', { status: 400 });
  await setListingStatus(id, action === 'approve' ? 'active' : 'rejected');
  await logAdmin(ctx, `listing.${action}`, `listing #${id}`);
  return to(action);
};
