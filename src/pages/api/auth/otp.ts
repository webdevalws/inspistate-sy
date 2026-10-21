import type { APIRoute } from 'astro';
import { normalizePhone, sendOtp } from '../../../lib/auth';

export const POST: APIRoute = async ({ request }) => {
  const body = (await request.json().catch(() => ({}))) as { phone?: string };
  const phone = normalizePhone(body.phone ?? '');
  if (!phone) return Response.json({ error: 'Enter a valid 10-digit Indian mobile number.' }, { status: 422 });
  const res = await sendOtp(phone);
  if (!res.ok) return Response.json({ error: res.error }, { status: res.status });
  return Response.json({ ok: true, devCode: res.devCode, testCode: res.testCode });
};
