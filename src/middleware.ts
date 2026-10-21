import { defineMiddleware } from 'astro:middleware';
import { env } from 'cloudflare:workers';
import { userFromCookies } from './lib/auth';

const encoder = new TextEncoder();

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

    const header = ctx.request.headers.get('authorization') ?? '';
    const [scheme, encoded] = header.split(' ');
    if (scheme !== 'Basic' || !encoded) return unauthorized();
    let supplied = '';
    try {
      supplied = atob(encoded).split(':').slice(1).join(':');
    } catch {
      return unauthorized();
    }
    if (!(await safeEqual(supplied, password))) return unauthorized();

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
