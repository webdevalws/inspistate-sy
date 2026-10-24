import type { APIRoute } from 'astro';
import { googleEnabled, googleIdentity, signInWithGoogle, takeFlow } from '../../../../lib/google';
import { setSessionCookie } from '../../../../lib/auth';
import { clientIp, overDailyLimit } from '../../../../lib/limits';
import { safeNext } from '../../../../lib/redirect';

// Google redirects back here with ?code&state. Every failure goes to /login?error=<code> (messages in GOOGLE_ERRORS).
// Google's redirect is a cross-site navigation, so guard()'s same-site check can't apply; the signed state cookie is
// what ties this request to a login started on our site. The per-IP daily limit is the same counter guard() uses.
const CALLBACK_PER_IP_PER_DAY = 60;

export const GET: APIRoute = async (ctx) => {
  const { url, cookies, redirect, locals } = ctx;
  if (!googleEnabled()) return new Response('Not found', { status: 404 });
  const fail = (error: string, next?: string | null) => redirect(`/login?error=${error}${next ? `&next=${encodeURIComponent(next)}` : ''}`, 303);
  if (await overDailyLimit('google-callback', `ip:${clientIp(ctx)}`, CALLBACK_PER_IP_PER_DAY)) return fail('google-limit');

  const flow = await takeFlow(cookies);
  const state = url.searchParams.get('state');
  if (!flow || !state || state !== flow.state) return fail('google-state');
  if (flow.exp < Date.now()) return fail('google-expired', flow.next);
  if (url.searchParams.has('error')) return fail('google-cancelled', flow.next);
  const code = url.searchParams.get('code');
  if (!code) return fail('google-failed', flow.next);

  const id = await googleIdentity(code, flow, url.origin);
  if (!id.ok) return fail(id.reason === 'unverified' ? 'google-unverified' : 'google-failed', flow.next);
  // Link only to the account that started the flow and is still logged in.
  const current = flow.linkUserId !== null && locals.user?.id === flow.linkUserId ? locals.user : null;
  const res = await signInWithGoogle(id.identity, current);
  if (!res.ok) return fail(res.error, flow.next);
  if (res.token) setSessionCookie(cookies, res.token, url.protocol === 'https:');
  // New accounts finish the usual Buyer / Seller / Agent registration on /login (it opens on that step).
  if (res.needsRegistration) return redirect(`/login${flow.next ? `?next=${encodeURIComponent(flow.next)}` : ''}`, 303);
  return redirect(safeNext(flow.next) ?? '/account', 303);
};
