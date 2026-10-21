import type { APIRoute } from 'astro';
import { requestSubscription } from '../../../lib/accounts';

// "Proceed to buy" on an agent plan. No payment gateway yet: this records a request and alerts the sales team.
export const POST: APIRoute = async ({ request, locals, redirect }) => {
  if (!locals.user) return redirect('/login?next=/account/plans', 303);
  if (locals.user.role !== 'agent') return redirect('/account/plans?error=agent', 303);
  const plan = String((await request.formData()).get('plan') ?? '');
  const res = await requestSubscription(locals.user, plan as 'yearly' | 'half-yearly');
  return redirect(res.ok ? '/account/plans?requested=1' : `/account/plans?error=${encodeURIComponent(res.error)}`, 303);
};
