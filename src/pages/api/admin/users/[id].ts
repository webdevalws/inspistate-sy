import type { APIRoute } from 'astro';
import { adminUser, setUserBlocked, setUserPlan, updateUserProfile } from '../../../../lib/admin-users';
import { normalizePhone } from '../../../../lib/auth';
import { getRefs } from '../../../../lib/repo';
import { logAdmin } from '../../../../lib/audit';
import { isRole, planByKey } from '../../../../data/plans';

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

  if (action === 'plan') {
    const raw = str('plan', 20);
    const plan = raw === 'free' ? null : planByKey(raw)?.key;
    if (plan === undefined) return back('error=plan');
    const res = await setUserPlan(id, plan);
    if (!res) return back('done=unchanged');
    const label = (k: string | null) => (k ? planByKey(k)?.name ?? k : 'Free');
    await logAdmin(ctx, 'user.plan', `user #${id}: ${label(res[0])} → ${label(res[1])}`);
    return back('done=plan');
  }

  if (action === 'block' || action === 'unblock') {
    const blocked = action === 'block';
    if (!(await setUserBlocked(id, blocked))) return back('done=unchanged');
    await logAdmin(ctx, `user.${action}`, blocked
      ? `user #${id} (+91 ${user.phone}): active → blocked; logged out, listings hidden`
      : `user #${id} (+91 ${user.phone}): blocked → active; listings shown again`);
    return back(`done=${action}`);
  }
  return new Response('Bad action', { status: 400 });
};
