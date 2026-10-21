import type { APIRoute } from 'astro';
import { applyCoupon } from '../../lib/orders';

// Validates a coupon against an amount without revealing the list of codes.
export const GET: APIRoute = ({ url }) => {
  const amount = Number(url.searchParams.get('amount'));
  if (!(amount > 0)) return Response.json({ error: 'Invalid amount' }, { status: 422 });
  const r = applyCoupon(amount, url.searchParams.get('code'));
  if ('error' in r) return Response.json({ error: r.error }, { status: 422 });
  return Response.json(r);
};
