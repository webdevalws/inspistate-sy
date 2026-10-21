import type { APIRoute } from 'astro';
import { setRole } from '../../../lib/auth';
import { isRole } from '../../../data/plans';
import { safeNext } from '../../../lib/redirect';

// Switch account type, e.g. a User who now wants to sell becomes a Seller.
export const POST: APIRoute = async ({ request, locals, redirect }) => {
  if (!locals.user) return redirect('/login', 303);
  const f = await request.formData();
  const role = f.get('role');
  const safeBack = safeNext(f.get('back'), '/account')!;
  if (!isRole(role)) return redirect(`${safeBack}${safeBack.includes('?') ? '&' : '?'}error=role`, 303);
  await setRole(locals.user.id, role);
  return redirect(safeBack, 303);
};
