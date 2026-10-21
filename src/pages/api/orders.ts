import type { APIRoute } from 'astro';
import { AGREEMENT_PLANS, LITIGATION_SEARCH_PRICE, TITLE_SEARCH_PLANS, VALUATION_PLANS, applyCoupon, createOrder, type OrderKind } from '../../lib/orders';

const KINDS: OrderKind[] = ['title-search', 'rent-agreement', 'rent-receipt', 'valuation-report', 'litigation-search', 'escrow'];
const str = (v: unknown, max = 200) => String(v ?? '').trim().slice(0, max);

// Creates a service order. Paid kinds are stored as "awaiting_payment" until a payment gateway confirms.
export const POST: APIRoute = async ({ request, locals, url }) => {
  if (request.headers.get('origin') !== url.origin) return new Response('Forbidden', { status: 403 });
  const b = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b) return Response.json({ error: 'Invalid request' }, { status: 400 });
  const kind = b.kind as OrderKind;
  if (!KINDS.includes(kind)) return Response.json({ error: 'Unknown service' }, { status: 422 });

  const name = str(b.name, 100);
  const phone = str(b.phone).replace(/\D/g, '').slice(-10);
  const email = str(b.email);
  if (!name) return Response.json({ error: 'Name is required' }, { status: 422 });
  if (!/^[6-9]\d{9}$/.test(phone)) return Response.json({ error: 'Enter a valid 10-digit mobile number' }, { status: 422 });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: 'Enter a valid email' }, { status: 422 });
  if (b.consent !== true) return Response.json({ error: 'Please accept the terms to continue' }, { status: 422 });
  const d = (b.details ?? {}) as Record<string, unknown>;

  let amount = 0;
  let details: Record<string, unknown> = {};
  if (kind === 'title-search') {
    const plan = TITLE_SEARCH_PLANS[d.plan as keyof typeof TITLE_SEARCH_PLANS];
    if (!plan) return Response.json({ error: 'Choose a report type' }, { status: 422 });
    for (const k of ['building', 'flat', 'state', 'city'] as const) if (!str(d[k])) return Response.json({ error: `${k[0].toUpperCase() + k.slice(1)} is required` }, { status: 422 });
    if (d.pin && !/^\d{6}$/.test(str(d.pin))) return Response.json({ error: 'PIN code must be 6 digits' }, { status: 422 });
    if (d.pan && !/^[A-Z]{5}\d{4}[A-Z]$/i.test(str(d.pan))) return Response.json({ error: 'Invalid PAN' }, { status: 422 });
    amount = plan.price;
    details = Object.fromEntries(['plan', 'building', 'flat', 'wing', 'state', 'city', 'locality', 'village', 'cts', 'landmark', 'pin', 'loanApplication', 'pan'].map((k) => [k, str(d[k])]));
  } else if (kind === 'rent-agreement') {
    const plan = AGREEMENT_PLANS[d.plan as keyof typeof AGREEMENT_PLANS];
    if (!plan) return Response.json({ error: 'Choose a package' }, { status: 422 });
    amount = plan.price;
    details = { plan: d.plan, state: str(d.state), agreement: d.agreement ?? null, stampDuty: Number(d.stampDuty) || 0 };
  } else if (kind === 'valuation-report') {
    const plan = VALUATION_PLANS[d.plan as keyof typeof VALUATION_PLANS];
    if (!plan) return Response.json({ error: 'Choose a report type' }, { status: 422 });
    amount = plan.price;
    details = { plan: d.plan, city: str(d.city), locality: str(d.locality), area: Number(d.area) || 0, estimate: d.estimate ?? null };
  } else if (kind === 'litigation-search') {
    for (const [k, label] of [['party', 'Party name'], ['pan', 'PAN'], ['flat', 'Flat number'], ['building', 'Building name'], ['state', 'State']] as const) if (!str(d[k])) return Response.json({ error: `${label} is required` }, { status: 422 });
    if (!/^[A-Z]{5}\d{4}[A-Z]$/i.test(str(d.pan))) return Response.json({ error: 'Enter a valid PAN, e.g. ABCDE1234F' }, { status: 422 });
    if (d.pin && !/^\d{6}$/.test(str(d.pin))) return Response.json({ error: 'PIN code must be 6 digits' }, { status: 422 });
    amount = LITIGATION_SEARCH_PRICE;
    details = Object.fromEntries(['party', 'pan', 'flat', 'building', 'wing', 'state', 'village', 'landmark', 'locality', 'city', 'pin'].map((k) => [k, k === 'pan' ? str(d[k]).toUpperCase() : str(d[k])]));
  } else if (kind === 'escrow') {
    const value = Number(d.amount);
    if (!(value >= 10000 && value <= 1e10)) return Response.json({ error: 'Escrow amount must be at least ₹10,000' }, { status: 422 });
    if (!['buyer', 'seller', 'agent'].includes(str(d.role))) return Response.json({ error: 'Choose your role in the deal' }, { status: 422 });
    if (!str(d.property)) return Response.json({ error: 'Property details are required' }, { status: 422 });
    const otherPhone = str(d.otherPhone).replace(/\D/g, '').slice(-10);
    if (!str(d.otherName) || !/^[6-9]\d{9}$/.test(otherPhone)) return Response.json({ error: 'Add the other party’s name and mobile number' }, { status: 422 });
    details = { role: str(d.role), property: str(d.property, 500), amount: value, purpose: str(d.purpose), release: str(d.release, 500), otherName: str(d.otherName, 100), otherPhone, otherRole: str(d.otherRole) };
  } else {
    details = { receipt: d.receipt ?? null };
  }

  const priced = applyCoupon(amount, amount ? str(b.coupon, 30) : null);
  if ('error' in priced) return Response.json({ error: priced.error }, { status: 422 });
  const id = await createOrder({
    kind, userId: locals.user?.id ?? null, name, phone, email: email || null, details,
    amount: priced.amount, coupon: priced.coupon, status: priced.amount > 0 ? 'awaiting_payment' : 'submitted',
  });
  return Response.json({ ok: true, id, amount: priced.amount, discount: priced.discount, status: priced.amount > 0 ? 'awaiting_payment' : 'submitted' }, { status: 201 });
};
