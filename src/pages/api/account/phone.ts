import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { checkOtp, hasRealPhone, normalizePhone, sendOtp } from '../../../lib/auth';
import { clientIp } from '../../../lib/limits';

// Adds a mobile number to an account created with Google (its users.phone is still the 'g:<id>' placeholder):
// { action: 'send', phone } texts a code (same rules and limits as login); { action: 'verify', phone, code } checks it
// and saves the number. This never logs anyone in or creates an account. Cross-origin POSTs are refused by middleware.
const TAKEN = 'This number already has an InspiState account. Log in with it, then use Continue with Google to link your Google account.';

export const POST: APIRoute = async (ctx) => {
  const user = ctx.locals.user;
  if (!user) return Response.json({ error: 'Your session has expired. Log in again.' }, { status: 401 });
  if (hasRealPhone(user.phone)) return Response.json({ error: 'Your account already has a mobile number.' }, { status: 409 });
  const body = (await ctx.request.json().catch(() => ({}))) as { action?: string; phone?: string; code?: string };
  const phone = normalizePhone(body.phone ?? '');
  if (!phone) return Response.json({ error: 'Enter a valid 10-digit Indian mobile number.' }, { status: 422 });
  const taken = async () => !!(await env.DB.prepare('SELECT 1 FROM users WHERE phone = ? AND id != ?').bind(phone, user.id).first());

  if (body.action === 'send') {
    if (await taken()) return Response.json({ error: TAKEN }, { status: 409 });
    const res = await sendOtp(phone, clientIp(ctx));
    if (!res.ok) return Response.json({ error: res.error }, { status: res.status });
    return Response.json({ ok: true, devCode: res.devCode, testCode: res.testCode });
  }

  if (body.action === 'verify') {
    const code = String(body.code ?? '').replace(/\D/g, '');
    if (code.length !== 6) return Response.json({ error: 'Enter the 6-digit code.' }, { status: 422 });
    const check = await checkOtp(phone, code);
    if (!check.ok) return Response.json({ error: check.error }, { status: 401 });
    try {
      // Only replaces the Google placeholder, never a real number.
      const r = await env.DB.prepare("UPDATE users SET phone = ? WHERE id = ? AND phone LIKE 'g:%'").bind(phone, user.id).run();
      if (!r.meta.changes) return Response.json({ error: 'Your account already has a mobile number.' }, { status: 409 });
    } catch (e) {
      if (String(e).includes('UNIQUE')) return Response.json({ error: TAKEN }, { status: 409 });
      throw e;
    }
    return Response.json({ ok: true });
  }
  return Response.json({ error: 'Bad request' }, { status: 400 });
};
