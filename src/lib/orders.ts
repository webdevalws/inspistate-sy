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


/**
 * Each coupon can be used once per person: true if a non-cancelled order already used `coupon` from this
 * phone number or (when logged in) this account. No separate table — it reads service_orders.
 */
export async function couponUsed(coupon: string, phone: string | null, userId: number | null) {
  const row = await env.DB.prepare(`SELECT 1 FROM service_orders WHERE coupon = ? AND status != 'cancelled'
      AND (phone = ? OR (? IS NOT NULL AND user_id = ?)) LIMIT 1`)
    .bind(coupon, phone, userId, userId)
    .first();
  return !!row;
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

/** Order statuses (same list as the CHECK constraint in migrations 0005 / 0007), in workflow order. */
export const ORDER_STATUSES = ['submitted', 'awaiting_payment', 'paid', 'in_progress', 'completed', 'cancelled'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Admin: changes an order's status. Returns the previous status, or null if the order doesn't exist. */
export async function setOrderStatus(id: number, status: OrderStatus): Promise<string | null> {
  const prev = await env.DB.prepare('SELECT status FROM service_orders WHERE id = ?').bind(id).first<string>('status');
  if (!prev) return null;
  await env.DB.prepare('UPDATE service_orders SET status = ? WHERE id = ?').bind(status, id).run();
  return prev;
}
