import { defineMiddleware } from 'astro:middleware';
import { env } from 'cloudflare:workers';
import { userFromCookies } from './lib/auth';
import { clientIp, dailyCount, overDailyLimit } from './lib/limits';
import { syncContentVersion } from './lib/repo';
import { checkRequiredSettings } from './lib/startup';

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
  checkRequiredSettings(); // production only, once per Worker instance
  const { pathname } = ctx.url;
  const isAsset = pathname.startsWith('/_astro/') || pathname.startsWith('/media/') || /\.(svg|ico|png|txt|xml)$/.test(pathname);
  // Uploaded photos and build files use no cached content; everything else first checks the content version, so an
  // admin edit made on another Worker instance shows at once (one primary-key read, in parallel with the session).
  const usesContent = !(pathname.startsWith('/_astro/') || pathname.startsWith('/media/') || pathname.startsWith('/admin/media/') || /\.(svg|ico|png|txt)$/.test(pathname));
  const [user] = await Promise.all([isAsset ? null : userFromCookies(ctx.cookies), usesContent ? syncContentVersion() : null]);
  ctx.locals.user = user;

  // Account APIs that change state must come from our own pages.
  if ((pathname.startsWith('/api/account/') || pathname.startsWith('/api/auth/')) && ctx.request.method !== 'GET' && ctx.request.headers.get('origin') !== ctx.url.origin) {
    return new Response('Forbidden', { status: 403 });
  }
  if (pathname.startsWith('/account') && !ctx.locals.user) {
    return ctx.redirect(`/login?next=${encodeURIComponent(pathname + ctx.url.search)}`);
  }
  if (pathname === '/admin' || pathname.startsWith('/admin/') || pathname.startsWith('/api/admin/')) {
    // Refused admin POSTs answer before the endpoint reads the form, so read it here first: the local dev runtime fails
    // a request answered with its body unread (browsers send the admin password up front only below the page's own
    // path, so a form posting to /api/admin/… is first challenged with a 401 and then retried). No effect in production.
    const refuse = async (res: Response) => { if (ctx.request.method !== 'GET') await ctx.request.arrayBuffer().catch(() => {}); return res; };
    // Logout: Basic auth has no real logout. A 401 makes most browsers forget the admin password; it is not counted
    // as a wrong password. Closing the browser always works.
    if (pathname === '/admin/logout') {
      return new Response('<!doctype html><meta charset="utf-8"><title>Logged out</title><p style="font-family:system-ui;margin:3rem">You are logged out of InspiState admin. To fully log out, close the browser. <a href="/admin">Log in again</a></p>', {
        status: 401, headers: { 'www-authenticate': 'Basic realm="InspiState admin", charset="UTF-8"', 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
      });
    }
    const password = (env as { ADMIN_PASSWORD?: string }).ADMIN_PASSWORD;
    if (!password) return new Response('Admin is disabled: set the ADMIN_PASSWORD secret.', { status: 503 });

    // Wrong passwords are counted per IP per UTC day (ai_usage 'admin-fail'): from ADMIN_SLOW_AFTER on, each
    // wrong try waits a couple of seconds; at ADMIN_LOCK_AFTER the IP is locked out until tomorrow.
    const ipKey = `ip:${clientIp(ctx)}`;
    const failures = await dailyCount('admin-fail', ipKey);
    if (failures >= ADMIN_LOCK_AFTER) {
      return refuse(new Response('Too many wrong admin passwords from this network. Admin is locked until tomorrow (UTC).', { status: 429 }));
    }
    const header = ctx.request.headers.get('authorization') ?? '';
    const [scheme, encoded] = header.split(' ');
    if (scheme !== 'Basic' || !encoded) return refuse(unauthorized()); // the browser's first, header-less request: not a failure
    let supplied = '';
    let username = '';
    try {
      const decoded = atob(encoded);
      username = decoded.split(':')[0];
      supplied = decoded.split(':').slice(1).join(':');
    } catch {
      return refuse(unauthorized());
    }
    if (!(await safeEqual(supplied, password))) {
      await overDailyLimit('admin-fail', ipKey, ADMIN_LOCK_AFTER);
      if (failures + 1 >= ADMIN_SLOW_AFTER) await new Promise((r) => setTimeout(r, 2000));
      return refuse(unauthorized());
    }

    // Shown in the admin top bar (any username works; only the password is checked).
    ctx.locals.adminName = username.trim().slice(0, 40) || 'Admin';

    // State-changing admin requests must come from our own pages.
    if (ctx.request.method !== 'GET' && ctx.request.headers.get('origin') !== ctx.url.origin) {
      return refuse(new Response('Forbidden', { status: 403 }));
    }
    const res = await next();
    res.headers.set('x-robots-tag', 'noindex');
    res.headers.set('cache-control', 'no-store');
    return res;
  }
  return next();
});
