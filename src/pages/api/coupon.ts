import type { APIRoute } from 'astro';
import { applyCoupon, couponUsed } from '../../lib/orders';
import { guard } from '../../lib/limits';

// Validates a coupon against an amount without revealing the list of codes.
export const GET: APIRoute = async (ctx) => {
  const blocked = await guard(ctx, 'coupon', 30);
  if (blocked) return blocked;
  const { url, locals } = ctx;
  const amount = Number(url.searchParams.get('amount'));
  if (!(amount > 0)) return Response.json({ error: 'Invalid amount' }, { status: 422 });
  const r = applyCoupon(amount, url.searchParams.get('code'));
  if ('error' in r) return Response.json({ error: r.error }, { status: 422 });
  // Same once-per-person rule as /api/orders, so the preview matches the order (only knowable when logged in).
  if (r.coupon && locals.user && (await couponUsed(r.coupon, locals.user.phone, locals.user.id))) {
    return Response.json({ error: 'You’ve already used this coupon.' }, { status: 422 });
  }
  return Response.json(r);
};
