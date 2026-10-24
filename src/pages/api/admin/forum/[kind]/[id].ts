import type { APIRoute } from 'astro';
import { setForumStatus } from '../../../../../lib/forum';
import { logAdmin } from '../../../../../lib/audit';

// Hide or unhide a forum question or answer (protected by middleware: admin Basic auth + same-origin).
export const POST: APIRoute = async (ctx) => {
  const { params, request, redirect } = ctx;
  const kind = params.kind === 'question' || params.kind === 'answer' ? params.kind : null;
  const id = Number(params.id);
  const action = String((await request.formData()).get('action') ?? '');
  if (!kind || !Number.isInteger(id) || id <= 0) return new Response('Bad target', { status: 400 });
  if (action !== 'hide' && action !== 'unhide') return new Response('Bad action', { status: 400 });
  if (!(await setForumStatus(kind, id, action === 'hide' ? 'hidden' : 'published'))) return new Response('Not found', { status: 404 });
  await logAdmin(ctx, `forum.${action}`, `${kind} #${id}`);
  return redirect('/admin#forum', 303);
};
