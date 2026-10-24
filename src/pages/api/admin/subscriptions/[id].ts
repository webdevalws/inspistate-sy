import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { planByKey } from '../../../../data/plans';

// Activate (after payment is collected) or cancel an agent plan request (protected by middleware).
export const POST: APIRoute = async ({ params, request, redirect }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return new Response('Bad id', { status: 400 });
  const action = String((await request.formData()).get('action') ?? '');
  if (action !== 'activate' && action !== 'cancel') return new Response('Bad action', { status: 400 });
  const sub = await env.DB.prepare("SELECT plan FROM subscriptions WHERE id = ? AND status = 'requested'").bind(id).first<{ plan: string }>();
  if (!sub) return new Response('Request not found or already handled', { status: 404 });
  if (action === 'cancel') {
    await env.DB.prepare("UPDATE subscriptions SET status = 'cancelled' WHERE id = ?").bind(id).run();
  } else {
    const start = new Date();
    const end = new Date(start);
    end.setMonth(end.getMonth() + (planByKey(sub.plan)?.months ?? 12));
    await env.DB.prepare("UPDATE subscriptions SET status = 'active', starts_at = ?, ends_at = ? WHERE id = ?").bind(start.toISOString(), end.toISOString(), id).run();
  }
  return redirect(`/admin?done=sub-${action}#subscriptions`, 303);
};
