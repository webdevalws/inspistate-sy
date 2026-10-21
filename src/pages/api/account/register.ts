import type { APIRoute } from 'astro';
import { completeRegistration } from '../../../lib/auth';
import { getRefs } from '../../../lib/repo';
import { isRole } from '../../../data/plans';

// Completes sign-up after OTP: role (user / seller / agent), name, optional email and city and, for
// agents, the (required) agency name. Only for new accounts: role changes go through /api/account/role.
export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user) return Response.json({ error: 'Your session has expired. Log in again.' }, { status: 401 });
  if (locals.user.role) return Response.json({ error: 'Your account is already set up. Change your account type from your account page.' }, { status: 409 });
  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const str = (k: string, max: number) => String(b[k] ?? '').trim().slice(0, max);
  const role = b.role;
  const name = str('name', 100);
  const email = str('email', 200) || null;
  const citySlug = str('city', 60) || null;
  const company = str('company', 120) || null;
  if (!isRole(role)) return Response.json({ error: 'Choose whether you are a buyer, seller or agent.' }, { status: 422 });
  if (name.length < 2) return Response.json({ error: 'Enter your full name.' }, { status: 422 });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: 'Enter a valid email address.' }, { status: 422 });
  if (role === 'agent' && (company ?? '').length < 2) return Response.json({ error: 'Enter your agency or firm name.' }, { status: 422 });
  if (citySlug && !(await getRefs()).city(citySlug)) return Response.json({ error: 'Choose a city from the list.' }, { status: 422 });
  await completeRegistration(locals.user.id, { name, email, role, citySlug, company });
  // Where to go next is decided in the browser by destinationAfterRegister (src/lib/redirect.ts).
  return Response.json({ ok: true, role });
};
