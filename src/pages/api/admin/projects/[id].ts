import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { clearContentCaches } from '../../../../lib/repo';
import { logAdmin } from '../../../../lib/audit';
import { safeNext } from '../../../../lib/redirect';

// Admin actions on one project (protected by middleware: admin Basic auth + same-origin): hide / unhide.
// Hidden projects leave every public page (VISIBLE_PROJECT); nothing is deleted. Audited; caches cleared on save.
export const POST: APIRoute = async (ctx) => {
  const form = await ctx.request.formData();
  const id = Number(ctx.params.id);
  if (!Number.isInteger(id) || id <= 0) return new Response('Bad id', { status: 400 });
  const action = String(form.get('action') ?? '');
  const backRaw = safeNext(form.get('back'));
  const back = backRaw?.startsWith('/admin/projects') ? backRaw : '/admin/projects';
  const to = (done: string) => { const u = new URL(back, 'https://x'); u.searchParams.set('done', done); return ctx.redirect(`${u.pathname}${u.search}`, 303); };

  if (action === 'hide' || action === 'unhide') {
    const p = await env.DB.prepare('SELECT name, hidden FROM projects WHERE id = ?').bind(id).first<{ name: string; hidden: number }>();
    if (!p) return new Response('Project not found', { status: 404 });
    const hidden = action === 'hide' ? 1 : 0;
    if (p.hidden !== hidden) {
      await env.DB.prepare("UPDATE projects SET hidden = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?").bind(hidden, id).run();
      await logAdmin(ctx, `project.${action}`, `project #${id} ${p.name}: ${p.hidden ? 'hidden' : 'live'} → ${hidden ? 'hidden' : 'live'}`);
      clearContentCaches();
    }
    return to(action);
  }
  return new Response('Bad action', { status: 400 });
};
