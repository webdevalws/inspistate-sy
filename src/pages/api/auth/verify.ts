import type { APIRoute } from 'astro';
import { normalizePhone, setSessionCookie, verifyOtp } from '../../../lib/auth';
import { mergeShortlist } from '../../../lib/accounts';

export const POST: APIRoute = async ({ request, cookies, url }) => {
  const body = (await request.json().catch(() => ({}))) as { phone?: string; code?: string; shortlist?: { kind: 'listing' | 'project'; id: number }[] };
  const phone = normalizePhone(body.phone ?? '');
  const code = String(body.code ?? '').replace(/\D/g, '');
  if (!phone || code.length !== 6) return Response.json({ error: 'Enter the 6-digit code.' }, { status: 422 });
  const res = await verifyOtp(phone, code);
  if (!res.ok) return Response.json({ error: res.error }, { status: 401 });
  setSessionCookie(cookies, res.token, url.protocol === 'https:');
  // Carry over anything shortlisted on this device before logging in.
  if (Array.isArray(body.shortlist)) await mergeShortlist(res.user.id, body.shortlist);
  // A brand-new number (or one that never finished signing up) goes on to the register step.
  return Response.json({ ok: true, needsRegistration: !res.user.role, user: { name: res.user.name, phone: res.user.phone, role: res.user.role } });
};
