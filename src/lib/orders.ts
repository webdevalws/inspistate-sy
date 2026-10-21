// Service orders: pricing, validation and storage. See docs/functions/{title-search,litigation-search,escrow,rent-agreement,rent-receipt,property-valuation}/desc.md.
import { env } from 'cloudflare:workers';

export type OrderKind = 'title-search' | 'rent-agreement' | 'rent-receipt' | 'valuation-report' | 'litigation-search' | 'escrow';

export { AGREEMENT_PLANS, LITIGATION_SEARCH_PRICE, RENT_STAMP_DUTY, TITLE_SEARCH_PLANS, VALUATION_PLANS } from '../data/services';

// Server-only: coupon codes must never ship to the browser.
/** Flat discounts in rupees. */
const COUPONS: Record<string, number> = { WELCOME200: 200, FIRSTHOME: 500 };

export function applyCoupon(amount: number, code: string | null) {
  const c = (code ?? '').trim().toUpperCase();
  if (!c) return { amount, coupon: null, discount: 0 };
  const off = COUPONS[c];
  if (off === undefined) return { error: 'Invalid coupon code' } as const;
  const discount = Math.min(off, amount);
  return { amount: amount - discount, coupon: c, discount };
}


export async function createOrder(o: { kind: OrderKind; userId: number | null; name: string; phone: string; email: string | null; details: unknown; amount: number; coupon: string | null; status: 'submitted' | 'awaiting_payment' }) {
  return (await env.DB.prepare('INSERT INTO service_orders (kind, user_id, name, phone, email, details, amount, coupon, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id')
    .bind(o.kind, o.userId, o.name, o.phone, o.email, JSON.stringify(o.details), o.amount, o.coupon, o.status)
    .first<number>('id'))!;
}

export async function recentOrders(limit = 100) {
  const { results } = await env.DB.prepare('SELECT * FROM service_orders ORDER BY id DESC LIMIT ?').bind(limit).all<{ id: number; kind: OrderKind; name: string; phone: string; email: string | null; details: string; amount: number; coupon: string | null; status: string; created_at: string }>();
  return results;
}
