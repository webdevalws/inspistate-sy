// Where to send people after login / registration ("next" and "back" values). Only paths on our own
// site are allowed; anything else falls back. Shared by server pages and client islands.
import type { Role } from '../data/plans';

const BASE = 'https://inspistate.invalid'; // only used to resolve a path and compare origins

/** A safe same-site path (pathname + query + hash) from untrusted input, or `fallback`. */
export function safeNext(raw: unknown, fallback: string | null = null): string | null {
  if (typeof raw !== 'string' || !raw || raw.length > 2048) return fallback;
  // Check the value and up to two decoded forms, so %5C, %2F%2F and double-encoding are caught too.
  // Control characters are rejected because browsers strip tabs/newlines ("/\t/evil.com" → "//evil.com").
  let s = raw;
  for (let i = 0; i < 3; i++) {
    if (!s.startsWith('/') || s.startsWith('//') || s.includes('\\') || /[\u0000-\u001f\u007f]/.test(s)) return fallback;
    let decoded: string;
    try { decoded = decodeURIComponent(s); } catch { return fallback; }
    if (decoded === s) break;
    s = decoded;
  }
  const url = new URL(raw, BASE);
  return url.origin === BASE ? url.pathname + url.search + url.hash : fallback;
}

/** Role pre-selected on the register step, from where the visitor was heading. */
export const roleForNext = (next: string | null): Role =>
  next?.startsWith('/post-property') ? 'seller' : next?.startsWith('/account/plans') ? 'agent' : 'user';

/** True when `path` is `prefix` itself or a page below it ("/account" matches "/account/plans", not "/accounts"). */
const isUnder = (path: string, prefix: string) => {
  const p = new URL(path, BASE).pathname;
  return p === prefix || p.startsWith(`${prefix}/`);
};
const SELLER_PAGES = ['/post-property', '/account'];
const AGENT_PAGES = ['/account'];

/**
 * The page a returning seller or agent lands on after logging in: sellers manage their listings, agents get their
 * dashboard. Buyers have none (null), so their login keeps its usual result (stay on the page, or /account).
 */
export function landingFor(role: Role | null | undefined): string | null {
  if (role === 'seller') return '/account#listings';
  if (role === 'agent') return '/account/agent';
  return null;
}

/**
 * Where a login (phone code or Google, page or dialog) goes: a safe `next` always wins (the visitor logged in to do
 * something there, e.g. View Number), otherwise the role's landing page (`landingFor`), otherwise — buyers — `from`,
 * the page a generic "Login / Register" was opened on (null = stay on the current page / default).
 * Generic login links must pass the page as `from`, never as `next`, or sellers and agents would stay on it.
 * Accounts without a role go to registration first; that step decides with `destinationAfterRegister`.
 */
export const afterLogin = (role: Role | null | undefined, next: unknown, from?: unknown): string | null =>
  safeNext(next) ?? landingFor(role) ?? safeNext(from);

/**
 * Where a brand-new account goes after the register step. `null` means "stay on the current page".
 * Buyer → `next` or current page · Seller → `/post-property` unless `next` is already a seller page ·
 * Agent → `/account` unless `next` is already an account page. Returning users who only log in use `afterLogin`.
 */
export function destinationAfterRegister(role: Role, next: string | null): string | null {
  const n = safeNext(next);
  if (role === 'seller') return n && SELLER_PAGES.some((p) => isUnder(n, p)) ? n : safeNext('/post-property');
  if (role === 'agent') return n && AGENT_PAGES.some((p) => isUnder(n, p)) ? n : safeNext('/account');
  return n;
}
