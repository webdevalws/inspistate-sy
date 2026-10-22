import type { APIRoute } from 'astro';
import { createPlatformReview, REVIEW_SERVICES, type ReviewService } from '../../lib/platform-reviews';
import { guard } from '../../lib/limits';

// Submit a review of InspiState. Stored as pending until moderated in the admin panel.
export const POST: APIRoute = async (ctx) => {
  const { request, locals } = ctx;
  const blocked = await guard(ctx, 'platform-reviews', 5);
  if (blocked) return blocked;
  const b = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b) return Response.json({ error: 'Invalid request' }, { status: 400 });
  const service = String(b.service ?? '') as ReviewService;
  const author = String(b.author ?? '').trim().slice(0, 60);
  const body = String(b.body ?? '').trim();
  const rating = Number(b.rating);
  const title = String(b.title ?? '').trim().slice(0, 100) || null;
  const city = String(b.city ?? '').trim().slice(0, 40) || null;
  if (!Object.hasOwn(REVIEW_SERVICES, service)) return Response.json({ error: 'Choose what your review is about' }, { status: 422 });
  if (!author) return Response.json({ error: 'Name is required' }, { status: 422 });
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return Response.json({ error: 'Choose a rating from 1 to 5 stars' }, { status: 422 });
  if (body.length < 30 || body.length > 2000) return Response.json({ error: 'Review must be 30–2,000 characters' }, { status: 422 });
  const id = await createPlatformReview({ userId: locals.user?.id ?? null, service, city, author, rating, title, body });
  return Response.json({ ok: true, id }, { status: 201 });
};
