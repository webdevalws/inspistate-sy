import type { APIRoute } from 'astro';
import { googleEnabled, startFlow } from '../../../../lib/google';
import { guard } from '../../../../lib/limits';
import { safeNext } from '../../../../lib/redirect';

// "Continue with Google" → Google's consent screen (state + PKCE + nonce in a signed, short-lived cookie).
// A logged-in visitor links Google to their current account. 404 when Google login isn't configured.
const START_PER_IP_PER_DAY = 30;

export const GET: APIRoute = async (ctx) => {
  if (!googleEnabled()) return new Response('Not found', { status: 404 });
  const blocked = await guard(ctx, 'google-start', START_PER_IP_PER_DAY);
  if (blocked) return blocked;
  const next = safeNext(ctx.url.searchParams.get('next'));
  // `from`: the page a generic login was opened on (buyers return to it); `next`: an action to come back to.
  const from = safeNext(ctx.url.searchParams.get('from'));
  return ctx.redirect(await startFlow(ctx.cookies, ctx.url, next, ctx.locals.user?.id ?? null, from), 302);
};
