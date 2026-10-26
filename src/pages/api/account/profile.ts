import type { APIRoute } from 'astro';
import { updateCompany, updateProfile } from '../../../lib/accounts';

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  if (!locals.user) return redirect('/login', 303);
  const f = await request.formData();
  const name = String(f.get('name') ?? '').trim().slice(0, 100) || null;
  const email = String(f.get('email') ?? '').trim().slice(0, 200) || null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return redirect('/account?error=email', 303);
  await updateProfile(locals.user.id, name, email);
  // Agents' agency name (shown to sellers with their offers; needed for Find sellers). Kept as is when left empty.
  const company = String(f.get('company') ?? '').trim().slice(0, 120);
  if (locals.user.role === 'agent' && company.length >= 2) await updateCompany(locals.user.id, company);
  return redirect('/account?saved=1', 303);
};
