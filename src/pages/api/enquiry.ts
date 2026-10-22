import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { createLead, LEAD_KINDS, listingContact, type LeadKind } from '../../lib/repo';
import { guard, overDailyLimit, tooManyToday } from '../../lib/limits';
import { safeNext } from '../../lib/redirect';
import { rememberBrochureLead } from '../../lib/brochure';

/** Owner numbers a logged-in account can reveal per day ("View number"). */
const VIEW_NUMBER_PER_USER_PER_DAY = 20;

export const POST: APIRoute = async (ctx) => {
  const blocked = await guard(ctx, 'enquiry', 30);
  if (blocked) return blocked;
  const { request, locals } = ctx;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const name = String(body.name ?? '').trim();
  const phone = String(body.phone ?? '').replace(/\D/g, '').slice(-10);
  const email = String(body.email ?? '').trim();
  const subject = String(body.subject ?? '').trim().slice(0, 200);
  // The page the enquiry came from: only same-site paths are kept (shown as a link in admin and /account).
  const page = safeNext(String(body.page ?? '').slice(0, 300));
  const kind: LeadKind = LEAD_KINDS.includes(body.kind as LeadKind) ? (body.kind as LeadKind) : 'enquiry';
  const optId = (v: unknown) => (Number.isInteger(Number(v)) && Number(v) > 0 ? Number(v) : null);

  if (!name || name.length > 100) return Response.json({ error: 'Name is required' }, { status: 422 });
  if (!/^[6-9]\d{9}$/.test(phone)) return Response.json({ error: 'Invalid mobile number' }, { status: 422 });
  if (email && (email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return Response.json({ error: 'Invalid email' }, { status: 422 });
  if (!subject) return Response.json({ error: 'Subject is required' }, { status: 422 });

  const listingId = optId(body.listingId);
  // Owner phone numbers are only revealed to logged-in accounts, within a daily cap. Refused requests
  // return before createLead, so they leave no lead behind.
  if (kind === 'view-number') {
    if (!locals.user) return Response.json({ error: 'Log in or register to see the owner’s number.' }, { status: 401 });
    if (!listingId) return Response.json({ error: 'Choose a listing.' }, { status: 422 });
    if (await overDailyLimit('view-number', `user:${locals.user.id}`, VIEW_NUMBER_PER_USER_PER_DAY)) return tooManyToday();
  }
  const projectId = optId(body.projectId);
  const id = await createLead({
    name, phone, email: email || null, subject, page, listingId, projectId, kind, userId: locals.user?.id ?? null,
  });
  // Unlocks /projects/{city}/{slug}/brochure for this visitor (see src/lib/brochure.ts).
  if (kind === 'brochure' && projectId) await rememberBrochureLead(ctx.cookies, id, phone, ctx.url.protocol === 'https:');

  if (kind === 'view-number' && listingId) {
    const c = await listingContact(listingId);
    const helpline = (env as unknown as { PUBLIC_HELPLINE?: string }).PUBLIC_HELPLINE ?? null;
    return Response.json({ ok: true, id, contact: c ? { name: c.contact_name, phone: c.contact_phone, postedBy: c.posted_by, helpline } : null }, { status: 201 });
  }
  return Response.json({ ok: true, id }, { status: 201 });
};
