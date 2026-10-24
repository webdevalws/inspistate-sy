import { defineMiddleware } from 'astro:middleware';
import { env } from 'cloudflare:workers';
import { userFromCookies } from './lib/auth';
import { clientIp, dailyCount, overDailyLimit } from './lib/limits';

const encoder = new TextEncoder();
/** Wrong admin passwords per IP per day: slow down from the 5th, lock out at 20. */
const ADMIN_SLOW_AFTER = 5;
const ADMIN_LOCK_AFTER = 20;

/** Constant-time comparison via SHA-256 digests so lengths don't leak either. */
async function safeEqual(a: string, b: string) {
  const [x, y] = await Promise.all([crypto.subtle.digest('SHA-256', encoder.encode(a)), crypto.subtle.digest('SHA-256', encoder.encode(b))]);
  const ax = new Uint8Array(x), by = new Uint8Array(y);
  let diff = 0;
  for (let i = 0; i < ax.length; i++) diff |= ax[i] ^ by[i];
  return diff === 0;
}

const unauthorized = () =>
  new Response('Authentication required', { status: 401, headers: { 'www-authenticate': 'Basic realm="InspiState admin", charset="UTF-8"' } });

export const onRequest = defineMiddleware(async (ctx, next) => {
  const { pathname } = ctx.url;
  const isAsset = pathname.startsWith('/_astro/') || pathname.startsWith('/media/') || /\.(svg|ico|png|txt|xml)$/.test(pathname);
  ctx.locals.user = isAsset ? null : await userFromCookies(ctx.cookies);

  // Account APIs that change state must come from our own pages.
  if ((pathname.startsWith('/api/account/') || pathname.startsWith('/api/auth/')) && ctx.request.method !== 'GET' && ctx.request.headers.get('origin') !== ctx.url.origin) {
    return new Response('Forbidden', { status: 403 });
  }
  if (pathname.startsWith('/account') && !ctx.locals.user) {
    return ctx.redirect(`/login?next=${encodeURIComponent(pathname + ctx.url.search)}`);
  }
  if (pathname === '/admin' || pathname.startsWith('/admin/') || pathname.startsWith('/api/admin/')) {
    const password = (env as { ADMIN_PASSWORD?: string }).ADMIN_PASSWORD;
    if (!password) return new Response('Admin is disabled: set the ADMIN_PASSWORD secret.', { status: 503 });

    // Wrong passwords are counted per IP per UTC day (ai_usage 'admin-fail'): from ADMIN_SLOW_AFTER on, each
    // wrong try waits a couple of seconds; at ADMIN_LOCK_AFTER the IP is locked out until tomorrow.
    const ipKey = `ip:${clientIp(ctx)}`;
    const failures = await dailyCount('admin-fail', ipKey);
    if (failures >= ADMIN_LOCK_AFTER) {
      return new Response('Too many wrong admin passwords from this network. Admin is locked until tomorrow (UTC).', { status: 429 });
    }
    const header = ctx.request.headers.get('authorization') ?? '';
    const [scheme, encoded] = header.split(' ');
    if (scheme !== 'Basic' || !encoded) return unauthorized(); // the browser's first, header-less request: not a failure
    let supplied = '';
    try {
      supplied = atob(encoded).split(':').slice(1).join(':');
    } catch {
      return unauthorized();
    }
    if (!(await safeEqual(supplied, password))) {
      await overDailyLimit('admin-fail', ipKey, ADMIN_LOCK_AFTER);
      if (failures + 1 >= ADMIN_SLOW_AFTER) await new Promise((r) => setTimeout(r, 2000));
      return unauthorized();
    }

    // State-changing admin requests must come from our own pages.
    if (ctx.request.method !== 'GET' && ctx.request.headers.get('origin') !== ctx.url.origin) {
      return new Response('Forbidden', { status: 403 });
    }
    const res = await next();
    res.headers.set('x-robots-tag', 'noindex');
    res.headers.set('cache-control', 'no-store');
    return res;
  }
  return next();
});
