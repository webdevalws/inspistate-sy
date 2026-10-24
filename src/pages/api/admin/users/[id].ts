import type { APIRoute } from 'astro';
import { adminUser, updateUserProfile } from '../../../../lib/admin-users';
import { normalizePhone } from '../../../../lib/auth';
import { getRefs } from '../../../../lib/repo';
import { logAdmin } from '../../../../lib/audit';
import { isRole } from '../../../../data/plans';

// Admin edits to one account (protected by middleware: admin Basic auth + same-origin). Plain form posts from
// /admin/users/{id}; every change is audited as user.<field> with old → new. See docs/functions/admin/desc.md.
const short = (v: string | null) => (v ? (v.length > 80 ? `${v.slice(0, 79)}…` : v) : '—');

export const POST: APIRoute = async (ctx) => {
  const { params, request, redirect } = ctx;
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return new Response('Bad id', { status: 400 });
  const user = await adminUser(id);
  if (!user) return new Response('User not found', { status: 404 });
  const form = await request.formData();
  const str = (k: string, max: number) => String(form.get(k) ?? '').trim().slice(0, max);
  const back = (q: string) => redirect(`/admin/users/${id}?${q}#edit`, 303);
  const action = str('action', 20);

  if (action === 'profile') {
    const phone = normalizePhone(str('phone', 20));
    const name = str('name', 100) || null;
    const roleRaw = str('role', 10);
    const citySlug = str('city', 60) || null;
    const company = str('company', 120) || null;
    if (!phone) return back('error=phone');
    if (name && name.length < 2) return back('error=name');
    // A registered account keeps a role; "Not registered" is only offered while the account has none.
    if (roleRaw ? !isRole(roleRaw) : user.role !== null) return back('error=role');
    const role = isRole(roleRaw) ? roleRaw : null;
    if (role === 'agent' && (company ?? '').length < 2) return back('error=company');
    if (citySlug && !(await getRefs()).city(citySlug)) return back('error=city');
    const res = await updateUserProfile(id, { name, phone, role, citySlug, company });
    if (res === 'not-found') return new Response('User not found', { status: 404 });
    if (res === 'phone-taken') return back('error=phone-taken');
    for (const [field, from, to] of res.changes) {
      await logAdmin(ctx, `user.${field}`, `user #${id}: ${short(from)} → ${short(to)}${field === 'phone' && res.sessionsEnded ? ' (logged out)' : ''}`);
    }
    return back(`done=${res.changes.length ? 'profile' : 'unchanged'}`);
  }
  return new Response('Bad action', { status: 400 });
};
