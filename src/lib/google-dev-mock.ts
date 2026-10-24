// DEV SERVER ONLY: a stand-in for Google's token endpoint and signing keys, so the "Continue with Google" callback
// can be tested end to end without a Google account. Imported only behind import.meta.env.DEV
// (src/pages/api/dev/google-mock.ts), so production builds don't contain it.
//
// A test passes code = "mock." + base64url(JSON { challenge, claims }) to the callback. The mock checks the PKCE
// verifier against `challenge` (S256), then returns an RS256-signed ID token whose claims are Google-like defaults
// (iss, aud = our client id, iat, exp, email_verified: true) overridden by `claims` (sub, email, nonce, …).
import { env } from 'cloudflare:workers';

const enc = new TextEncoder();
const b64url = (bytes: Uint8Array | ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64url = (s: string) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=')), (c) => c.charCodeAt(0)));
const KID = 'dev-mock';

let keyPair: Promise<CryptoKeyPair> | null = null;
const keys = () => (keyPair ??= crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']) as Promise<CryptoKeyPair>);

/** GET: the mock's public signing key, in Google's JWKS format. */
export async function mockJwks(): Promise<Response> {
  const jwk = await crypto.subtle.exportKey('jwk', (await keys()).publicKey) as JsonWebKey;
  return Response.json({ keys: [{ kty: 'RSA', n: jwk.n, e: jwk.e, alg: 'RS256', use: 'sig', kid: KID }] });
}

/** POST: exchanges a mock code for an ID token, like https://oauth2.googleapis.com/token. */
export async function mockToken(request: Request): Promise<Response> {
  const form = new URLSearchParams(await request.text());
  const code = form.get('code') ?? '';
  const clientId = (env as unknown as { GOOGLE_CLIENT_ID?: string }).GOOGLE_CLIENT_ID?.trim() ?? '';
  let spec: { challenge?: string; claims?: Record<string, unknown> };
  try { spec = JSON.parse(fromB64url(code.slice('mock.'.length))); } catch { return Response.json({ error: 'invalid_grant' }, { status: 400 }); }
  if (form.get('grant_type') !== 'authorization_code' || form.get('client_id') !== clientId || !form.get('redirect_uri')?.endsWith('/api/auth/google/callback')) {
    return Response.json({ error: 'invalid_request' }, { status: 400 });
  }
  const verifier = form.get('code_verifier') ?? '';
  if (b64url(await crypto.subtle.digest('SHA-256', enc.encode(verifier))) !== spec.challenge) return Response.json({ error: 'invalid_grant', error_description: 'PKCE verification failed' }, { status: 400 });
  const now = Math.floor(Date.now() / 1000);
  const claims = { iss: 'https://accounts.google.com', aud: clientId, iat: now, exp: now + 3600, email_verified: true, ...spec.claims };
  const head = b64url(enc.encode(JSON.stringify({ alg: 'RS256', kid: KID, typ: 'JWT' })));
  const body = b64url(enc.encode(JSON.stringify(claims)));
  const sig = b64url(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', (await keys()).privateKey, enc.encode(`${head}.${body}`)));
  return Response.json({ access_token: 'mock', token_type: 'Bearer', expires_in: 3600, id_token: `${head}.${body}.${sig}` });
}
