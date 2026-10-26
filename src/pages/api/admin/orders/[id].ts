import type { APIRoute } from 'astro';
import { ORDER_STATUSES, setOrderStatus, type OrderStatus } from '../../../../lib/orders';
import { logAdmin } from '../../../../lib/audit';

// Change a service order's status, e.g. awaiting payment → in progress → completed / cancelled
// (protected by middleware: admin Basic auth + same-origin).
export const POST: APIRoute = async (ctx) => {
  const { params, request, redirect } = ctx;
  const id = Number(params.id);
  const status = String((await request.formData()).get('status') ?? '');
  if (!Number.isInteger(id) || id <= 0) return new Response('Bad id', { status: 400 });
  if (!(ORDER_STATUSES as readonly string[]).includes(status)) return new Response('Bad status', { status: 400 });
  const prev = await setOrderStatus(id, status as OrderStatus);
  if (prev === null) return new Response('Order not found', { status: 404 });
  if (prev !== status) await logAdmin(ctx, 'order.status', `order #${id}: ${prev} → ${status}`);
  return redirect(`/admin/orders?done=order-${id}`, 303);
};
