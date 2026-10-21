import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { createLead, LEAD_KINDS, listingContact, type LeadKind } from '../../lib/repo';

export const POST: APIRoute = async ({ request, locals, url }) => {
  if (request.headers.get('origin') !== url.origin) return new Response('Forbidden', { status: 403 });
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
  const page = String(body.page ?? '').slice(0, 300) || null;
  const kind: LeadKind = LEAD_KINDS.includes(body.kind as LeadKind) ? (body.kind as LeadKind) : 'enquiry';
  const optId = (v: unknown) => (Number.isInteger(Number(v)) && Number(v) > 0 ? Number(v) : null);

  if (!name || name.length > 100) return Response.json({ error: 'Name is required' }, { status: 422 });
  if (!/^[6-9]\d{9}$/.test(phone)) return Response.json({ error: 'Invalid mobile number' }, { status: 422 });
  if (email && (email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return Response.json({ error: 'Invalid email' }, { status: 422 });
  if (!subject) return Response.json({ error: 'Subject is required' }, { status: 422 });

  const listingId = optId(body.listingId);
  const id = await createLead({
    name, phone, email: email || null, subject, page, listingId, projectId: optId(body.projectId), kind, userId: locals.user?.id ?? null,
  });

  if (kind === 'view-number' && listingId) {
    const c = await listingContact(listingId);
    const helpline = (env as unknown as { PUBLIC_HELPLINE?: string }).PUBLIC_HELPLINE ?? null;
    return Response.json({ ok: true, id, contact: c ? { name: c.contact_name, phone: c.contact_phone, postedBy: c.posted_by, helpline } : null }, { status: 201 });
  }
  return Response.json({ ok: true, id }, { status: 201 });
};
