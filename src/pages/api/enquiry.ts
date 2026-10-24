import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { createLead, getListing, getRefs, LEAD_KINDS, listingContact, REFERRAL_NEEDS, type LeadKind } from '../../lib/repo';
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
  let subject = String(body.subject ?? '').trim().slice(0, 200);
  // The page the enquiry came from: only same-site paths are kept (shown as a link in admin and /account).
  const page = safeNext(String(body.page ?? '').slice(0, 300));
  const kind: LeadKind = LEAD_KINDS.includes(body.kind as LeadKind) ? (body.kind as LeadKind) : 'enquiry';
  const optId = (v: unknown) => (Number.isInteger(Number(v)) && Number(v) > 0 ? Number(v) : null);

  if (!name || name.length > 100) return Response.json({ error: 'Name is required' }, { status: 422 });
  if (!/^[6-9]\d{9}$/.test(phone)) return Response.json({ error: 'Invalid mobile number' }, { status: 422 });
  if (email && (email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return Response.json({ error: 'Invalid email' }, { status: 422 });
  // Referrals (/refer): the friend's details are checked here and the subject is written on the server.
  if (kind === 'referral') {
    const friend = String(body.friendName ?? '').trim().slice(0, 100);
    const friendPhone = String(body.friendPhone ?? '').replace(/\D/g, '').slice(-10);
    const need = String(body.need ?? '');
    const city = (await getRefs()).city(String(body.city ?? ''));
    if (!friend) return Response.json({ error: 'Enter your friend’s name' }, { status: 422 });
    if (!/^[6-9]\d{9}$/.test(friendPhone)) return Response.json({ error: 'Enter your friend’s 10-digit mobile number' }, { status: 422 });
    if (friendPhone === phone) return Response.json({ error: 'Your friend’s number must be different from yours' }, { status: 422 });
    if (!Object.hasOwn(REFERRAL_NEEDS, need) || !city) return Response.json({ error: 'Choose what your friend needs and the city' }, { status: 422 });
    subject = `Referral: ${friend} (${friendPhone}) wants to ${REFERRAL_NEEDS[need as keyof typeof REFERRAL_NEEDS]} in ${city.name}`.slice(0, 200);
  }
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
  // Request to book: a request for a call and a visit, never a payment. Needs a project or a sale listing
  // and a visit date from today to 90 days ahead; the preferred unit / budget and the date go in the subject.
  if (kind === 'booking') {
    if (!projectId && !listingId) return Response.json({ error: 'Choose a project or property.' }, { status: 422 });
    if (listingId && (await getListing(listingId))?.purpose !== 'buy') return Response.json({ error: 'Only properties for sale can be booked.' }, { status: 422 });
    const visit = String(body.visitDate ?? '');
    const today = new Date().toISOString().slice(0, 10);
    const last = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(visit) || visit < today || visit > last) return Response.json({ error: 'Choose a visit date within the next 90 days.' }, { status: 422 });
    const unit = String(body.unit ?? '').trim().slice(0, 80);
    subject = `Booking request: ${subject}${unit ? ` · ${unit}` : ''} · visit ${visit}`.slice(0, 200);
  }
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
