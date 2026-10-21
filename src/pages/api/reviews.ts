import type { APIRoute } from 'astro';
import { createReview } from '../../lib/community';
import { getProjectsByIds } from '../../lib/repo';

export const POST: APIRoute = async ({ request, locals }) => {
  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const projectId = Number(b.projectId);
  const [project] = Number.isInteger(projectId) ? await getProjectsByIds([projectId]) : [];
  if (!project) return Response.json({ error: 'Unknown project' }, { status: 422 });
  const star = (v: unknown) => (Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= 5 ? Number(v) : null);
  const rating = star(b.rating);
  if (!rating) return Response.json({ error: 'Choose an overall rating' }, { status: 422 });
  const body = String(b.body ?? '').trim();
  if (body.length < 30 || body.length > 2000) return Response.json({ error: 'Write between 30 and 2,000 characters' }, { status: 422 });
  const author = String(b.author ?? locals.user?.name ?? '').trim().slice(0, 60);
  if (!author) return Response.json({ error: 'Your name is required' }, { status: 422 });
  const residentType = ['Owner', 'Tenant', 'Visitor'].includes(String(b.residentType)) ? String(b.residentType) : null;
  await createReview({
    projectId, userId: locals.user?.id ?? null, author, rating, body, residentType,
    connectivity: star(b.connectivity), amenities: star(b.amenities), construction: star(b.construction),
  });
  return Response.json({ ok: true, message: 'Thanks! Your review will appear after moderation.' }, { status: 201 });
};
