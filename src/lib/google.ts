// "Continue with Google": server-side OAuth 2.0 authorization-code flow (OpenID Connect) with state, PKCE (S256)
// and nonce. The flow's secrets live in a short-lived, HttpOnly, HMAC-signed cookie; the code is exchanged with
// Google server to server and the ID token is checked (signature, iss, aud, exp, nonce, email_verified) before an
// account is found, linked or created. Sessions are the same as phone + OTP login. See docs/functions/login/desc.md.
import { env } from 'cloudflare:workers';
import type { AstroCookies } from 'astro';
import { BLOCKED_MESSAGE, createSession, googlePlaceholderPhone, type User } from './auth';
import type { Role } from '../data/plans';

const cfg = env as unknown as { GOOGLE_CLIENT_ID?: string; GOOGLE_CLIENT_SECRET?: string };
const clientId = () => cfg.GOOGLE_CLIENT_ID?.trim() ?? '';
const clientSecret = () => cfg.GOOGLE_CLIENT_SECRET?.trim() ?? '';
/** The button and both endpoints exist only when both settings are present. */
export const googleEnabled = () => !!clientId() && !!clientSecret();

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];
const FLOW_COOKIE = 'is_google_flow';
const FLOW_PATH = '/api/auth/google';
const FLOW_TTL_S = 10 * 60;

const db = () => env.DB;
const enc = new TextEncoder();

// ---------- base64url ----------
const b64url = (bytes: Uint8Array | ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=')), (c) => c.charCodeAt(0));
const random = (n: number) => b64url(crypto.getRandomValues(new Uint8Array(n)));
const sha256 = async (s: string) => new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(s)));

// ---------- flow cookie ----------
/** What the callback needs from the start of the flow. */
export interface Flow { state: string; verifier: string; nonce: string; next: string | null; from?: string | null; linkUserId: number | null; exp: number }

const flowKey = () => crypto.subtle.importKey('raw', enc.encode(`inspistate-google-flow:${clientSecret()}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);

/**
 * Starts a login: stores state, PKCE verifier, nonce, where to go next and (when someone is logged in) the account
 * to link, then returns Google's consent URL. Scopes are openid email profile only.
 */
export async function startFlow(cookies: AstroCookies, url: URL, next: string | null, linkUserId: number | null, from: string | null = null): Promise<string> {
  const flow: Flow = { state: random(32), verifier: random(32), nonce: random(16), next, from, linkUserId, exp: Date.now() + FLOW_TTL_S * 1000 };
  const payload = b64url(enc.encode(JSON.stringify(flow)));
  const sig = b64url(await crypto.subtle.sign('HMAC', await flowKey(), enc.encode(payload)));
  cookies.set(FLOW_COOKIE, `${payload}.${sig}`, { path: FLOW_PATH, httpOnly: true, sameSite: 'lax', secure: url.protocol === 'https:', maxAge: FLOW_TTL_S });
  const q = new URLSearchParams({
    client_id: clientId(), redirect_uri: redirectUri(url.origin), response_type: 'code', scope: 'openid email profile',
    state: flow.state, nonce: flow.nonce, code_challenge: b64url(await sha256(flow.verifier)), code_challenge_method: 'S256', prompt: 'select_account',
  });
  return `${AUTH_URL}?${q}`;
}

/** Reads and clears the flow cookie; null when it is missing or its signature is wrong. Expiry is checked by the caller. */
export async function takeFlow(cookies: AstroCookies): Promise<Flow | null> {
  const raw = cookies.get(FLOW_COOKIE)?.value ?? '';
  cookies.delete(FLOW_COOKIE, { path: FLOW_PATH });
  const [payload, sig, extra] = raw.split('.');
  if (!payload || !sig || extra !== undefined) return null;
  try {
    if (!(await crypto.subtle.verify('HMAC', await flowKey(), fromB64url(sig), enc.encode(payload)))) return null;
    return JSON.parse(new TextDecoder().decode(fromB64url(payload))) as Flow;
  } catch {
    return null;
  }
}

export const redirectUri = (origin: string) => `${origin}/api/auth/google/callback`;

// ---------- code exchange + ID token ----------
export interface GoogleIdentity { sub: string; email: string; name: string | null }
type IdentityResult = { ok: true; identity: GoogleIdentity } | { ok: false; reason: 'failed' | 'unverified' };

/**
 * Google's token and key endpoints. On the dev server only, a code starting with "mock." goes to the local mock
 * (src/pages/api/dev/google-mock.ts) so the whole flow can be tested without a Google account; production
 * builds replace import.meta.env.DEV with false and drop that branch.
 */
function endpoints(code: string, origin: string) {
  if (import.meta.env.DEV && code.startsWith('mock.')) return { token: `${origin}/api/dev/google-mock`, jwks: `${origin}/api/dev/google-mock` };
  return { token: TOKEN_URL, jwks: JWKS_URL };
}

/** Exchanges the code (with the PKCE verifier) and validates the ID token. */
export async function googleIdentity(code: string, flow: Flow, origin: string): Promise<IdentityResult> {
  const ep = endpoints(code, origin);
  let idToken: unknown;
  try {
    const res = await fetch(ep.token, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: clientId(), client_secret: clientSecret(), redirect_uri: redirectUri(origin), grant_type: 'authorization_code', code_verifier: flow.verifier }),
    });
    if (!res.ok) return { ok: false, reason: 'failed' };
    idToken = ((await res.json()) as { id_token?: unknown }).id_token;
  } catch {
    return { ok: false, reason: 'failed' };
  }
  if (typeof idToken !== 'string') return { ok: false, reason: 'failed' };
  const claims = await verifyIdToken(idToken, ep.jwks);
  if (!claims) return { ok: false, reason: 'failed' };
  const now = Math.floor(Date.now() / 1000);
  const aud = claims.aud;
  const audOk = aud === clientId() || (Array.isArray(aud) && aud.includes(clientId()) && claims.azp === clientId());
  if (!ISSUERS.includes(String(claims.iss)) || !audOk || typeof claims.exp !== 'number' || claims.exp <= now
    || (typeof claims.iat === 'number' && claims.iat > now + 300) || claims.nonce !== flow.nonce
    || typeof claims.sub !== 'string' || !/^[\w-]{1,255}$/.test(claims.sub) || typeof claims.email !== 'string') {
    return { ok: false, reason: 'failed' };
  }
  if (claims.email_verified !== true) return { ok: false, reason: 'unverified' };
  return { ok: true, identity: { sub: claims.sub, email: claims.email.toLowerCase().slice(0, 200), name: typeof claims.name === 'string' ? claims.name.trim().slice(0, 100) || null : null } };
}

// Google's signing keys, cached per Worker instance for an hour (refetched when an unknown key id shows up).
const jwksCache = new Map<string, { at: number; keys: Map<string, CryptoKey> }>();
async function signingKey(jwksUrl: string, kid: string): Promise<CryptoKey | null> {
  let hit = jwksCache.get(jwksUrl);
  if (!hit || Date.now() - hit.at > 3600_000 || !hit.keys.has(kid)) {
    const res = await fetch(jwksUrl);
    if (!res.ok) return null;
    const { keys = [] } = (await res.json()) as { keys?: (JsonWebKey & { kid?: string })[] };
    const map = new Map<string, CryptoKey>();
    for (const k of keys) {
      if (k.kty !== 'RSA' || !k.kid) continue;
      map.set(k.kid, await crypto.subtle.importKey('jwk', { kty: 'RSA', n: k.n, e: k.e, alg: 'RS256', ext: true }, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']));
    }
    hit = { at: Date.now(), keys: map };
    jwksCache.set(jwksUrl, hit);
  }
  return hit.keys.get(kid) ?? null;
}

/** The ID token's claims when its RS256 signature checks out against Google's published keys, else null. */
async function verifyIdToken(token: string, jwksUrl: string): Promise<Record<string, unknown> | null> {
  try {
    const [h, p, s, extra] = token.split('.');
    if (!h || !p || !s || extra !== undefined) return null;
    const header = JSON.parse(new TextDecoder().decode(fromB64url(h))) as { alg?: string; kid?: string };
    if (header.alg !== 'RS256' || !header.kid) return null;
    const key = await signingKey(jwksUrl, header.kid);
    if (!key || !(await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, fromB64url(s), enc.encode(`${h}.${p}`)))) return null;
    return JSON.parse(new TextDecoder().decode(fromB64url(p))) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// ---------- accounts ----------
export type GoogleError = 'blocked' | 'google-taken' | 'google-other' | 'google-email-exists';
type SignInResult = { ok: true; token: string | null; needsRegistration: boolean; role: Role | null } | { ok: false; error: GoogleError };

/** Messages for /login?error=… (the blocked one is the same as phone login's). */
export const GOOGLE_ERRORS: Record<string, string> = {
  blocked: BLOCKED_MESSAGE,
  'google-state': 'Your Google sign-in could not be verified. Please try again.',
  'google-expired': 'Your Google sign-in took too long. Please try again.',
  'google-cancelled': 'Google sign-in was cancelled.',
  'google-failed': 'Google sign-in failed. Please try again or use your mobile number.',
  'google-unverified': 'Your Google email address is not verified. Verify it with Google, or log in with your mobile number.',
  'google-limit': 'Too many sign-in attempts today. Please try again tomorrow or use your mobile number.',
  'google-taken': 'That Google account is already linked to another InspiState account.',
  'google-other': 'Your account is already linked to a different Google account.',
  'google-email-exists': 'An account with this email exists — log in with your phone, then use Continue with Google to link it.',
};

/**
 * Finds the account for a Google identity, in this order: (1) by Google account id; (2) when someone is logged in
 * (and started the flow), link Google to that account; (3) an account with the same email is NOT linked automatically
 * (emails typed at registration aren't verified), so the person is asked to log in with their phone and link it;
 * (4) otherwise a new account is created and goes through the usual Buyer / Seller / Agent registration.
 */
export async function signInWithGoogle(g: GoogleIdentity, current: User | null): Promise<SignInResult> {
  const byGoogle = await db().prepare('SELECT id, role, blocked_at FROM users WHERE google_sub = ?').bind(g.sub).first<{ id: number; role: Role | null; blocked_at: string | null }>();

  if (current) {
    if (byGoogle && byGoogle.id !== current.id) return { ok: false, error: 'google-taken' };
    const linked = await db().prepare('UPDATE users SET google_sub = ?, google_email = ? WHERE id = ? AND (google_sub IS NULL OR google_sub = ?)')
      .bind(g.sub, g.email, current.id, g.sub).run().catch((e: unknown) => { if (String(e).includes('UNIQUE')) return null; throw e; });
    if (!linked) return { ok: false, error: 'google-taken' };
    if (!linked.meta.changes) return { ok: false, error: 'google-other' };
    return { ok: true, token: null, needsRegistration: !current.role, role: current.role };
  }

  if (byGoogle) {
    if (byGoogle.blocked_at) return { ok: false, error: 'blocked' };
    await db().prepare('UPDATE users SET google_email = ? WHERE id = ?').bind(g.email, byGoogle.id).run();
    return { ok: true, token: await createSession(byGoogle.id), needsRegistration: !byGoogle.role, role: byGoogle.role };
  }

  if (await db().prepare('SELECT 1 FROM users WHERE lower(email) = ? OR lower(google_email) = ?').bind(g.email, g.email).first()) {
    return { ok: false, error: 'google-email-exists' };
  }

  const created = await db()
    .prepare('INSERT INTO users (phone, name, email, google_sub, google_email) VALUES (?, ?, ?, ?, ?) ON CONFLICT DO NOTHING RETURNING id')
    .bind(googlePlaceholderPhone(g.sub), g.name, g.email, g.sub, g.email)
    .first<number>('id');
  // Created by a parallel callback for the same Google account a moment ago: sign in to that one.
  const id = created ?? (await db().prepare('SELECT id FROM users WHERE google_sub = ?').bind(g.sub).first<number>('id'));
  if (!id) return { ok: false, error: 'google-taken' };
  return { ok: true, token: await createSession(id), needsRegistration: true, role: null };
}
