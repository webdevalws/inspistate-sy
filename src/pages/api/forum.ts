import type { APIRoute } from 'astro';
import { createAnswer, createQuestion, getQuestion } from '../../lib/forum';
import { getRefs } from '../../lib/repo';
import { realPhone } from '../../lib/auth';

// Form posts from /forum pages. Logged-in users only (spam control); same-origin enforced below.
export const POST: APIRoute = async ({ request, locals, redirect, url }) => {
  if (request.headers.get('origin') !== url.origin) return new Response('Forbidden', { status: 403 });
  if (!locals.user) return redirect('/login?next=/forum', 303);
  const f = await request.formData();
  const author = (locals.user.name ?? (realPhone(locals.user.phone) ? `User ${locals.user.phone.slice(-4)}` : 'Member')).slice(0, 60);
  const body = String(f.get('body') ?? '').trim();

  const questionId = Number(f.get('questionId'));
  if (questionId) {
    if (!(await getQuestion(questionId))) return new Response('Not found', { status: 404 });
    if (body.length < 10 || body.length > 3000) return redirect(`/forum/${questionId}?error=length#answer`, 303);
    await createAnswer(questionId, locals.user.id, author, body);
    return redirect(`/forum/${questionId}#answers`, 303);
  }

  const title = String(f.get('title') ?? '').trim();
  if (title.length < 10 || title.length > 200 || body.length < 10 || body.length > 3000) return redirect('/forum?error=length#ask', 303);
  const refs = await getRefs();
  const city = refs.city(String(f.get('city') ?? '')) ? String(f.get('city')) : null;
  const id = await createQuestion(locals.user.id, author, city, title, body);
  return redirect(`/forum/${id}`, 303);
};
