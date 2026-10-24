import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { guard } from '../../lib/limits';
import { safeNext } from '../../lib/redirect';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Newsletter signup. The footer island posts JSON and gets JSON back. The same form also works as a plain HTML
// form post (before the island loads, or without JS): then we redirect (303) back to the page it came from with
// ?newsletter=ok|invalid|error, which the footer shows as a message.
export const POST: APIRoute = async (ctx) => {
  const { request } = ctx;
  // Read the body before any early return (the local dev runtime fails the next request otherwise).
  const isForm = !(request.headers.get('content-type') ?? '').includes('application/json');
  const form = isForm ? await request.formData().catch(() => null) : null;
  const json = isForm ? null : ((await request.json().catch(() => ({}))) as { email?: string });
  const back = isForm ? safeNext(String(form?.get('back') ?? ''), '/')! : '/';
  const done = (result: 'ok' | 'invalid' | 'error') => {
    const u = new URL(back, ctx.url.origin);
    u.searchParams.set('newsletter', result);
    return ctx.redirect(`${u.pathname}${u.search}#site-footer`, 303);
  };

  const blocked = await guard(ctx, 'newsletter', 5);
  if (blocked) return isForm ? done('error') : blocked;
  const email = String((isForm ? form?.get('email') : json?.email) ?? '').trim().toLowerCase();
  if (email.length > 200 || !EMAIL.test(email)) return isForm ? done('invalid') : Response.json({ error: 'Enter a valid email address' }, { status: 422 });
  await env.DB.prepare('INSERT OR IGNORE INTO newsletter_subscribers (email) VALUES (?)').bind(email).run();
  return isForm ? done('ok') : Response.json({ ok: true });
};
