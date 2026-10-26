import type { APIRoute } from 'astro';
import { respondToOffer, sendOffer } from '../../../lib/agent-offers';
import { safeNext } from '../../../lib/redirect';

// Agent offers (plain form posts, answered with a redirect; cross-origin POSTs are refused by middleware).
// action=send (agents, from Find sellers): listing, message → back to the find page with ?offer=sent or an error code.
// action=accept / decline (sellers, from /account): offer → back to /account?offer=accepted / declined / unavailable.
// See docs/functions/agent-offers/desc.md.
export const POST: APIRoute = async ({ request, locals, redirect }) => {
  // Read the body before any early return (the local dev runtime needs it).
  const form = await request.formData().catch(() => null);
  if (!locals.user) return redirect('/login', 303);
  if (!form) return new Response('Expected form data', { status: 400 });
  const action = String(form.get('action') ?? '');

  if (action === 'send') {
    const listingId = Number(form.get('listing'));
    // Back to the same find page (filters and page kept), at the listing.
    const back = safeNext(form.get('back')) ?? '/account/agent/find-sellers';
    const to = back.startsWith('/account/agent/find-sellers') ? back : '/account/agent/find-sellers';
    const res = Number.isInteger(listingId) && listingId > 0
      ? await sendOffer(locals.user, listingId, String(form.get('message') ?? ''))
      : ({ ok: false, error: 'not-available' } as const);
    const u = new URL(to, 'https://x');
    u.searchParams.set('offer', res.ok ? 'sent' : res.error);
    return redirect(`${u.pathname}${u.search}#listing-${listingId}`, 303);
  }

  // The seller answers an offer on one of their listings (from /account → Agent offers).
  if (action === 'accept' || action === 'decline') {
    const offerId = Number(form.get('offer'));
    const ok = Number.isInteger(offerId) && offerId > 0 && (await respondToOffer(locals.user.id, offerId, action === 'accept'));
    return redirect(`/account?offer=${ok ? (action === 'accept' ? 'accepted' : 'declined') : 'unavailable'}#offers`, 303);
  }
  return new Response('Bad action', { status: 400 });
};
