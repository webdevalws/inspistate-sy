import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { addShowcaseItem, isShowcaseSection, moveShowcaseItem, removeShowcaseItem, SHOWCASE_LABELS } from '../../../lib/showcase';
import { getRefs } from '../../../lib/repo';
import { logAdmin } from '../../../lib/audit';

// Showcase edits from /admin/showcase (plain form posts; protected by middleware: admin Basic auth + same-origin).
// action=add|remove|up|down, section, city (localities), item (project id or locality slug). Every change is
// audited as showcase.<action>. See docs/functions/admin/desc.md.
export const POST: APIRoute = async (ctx) => {
  const form = await ctx.request.formData();
  const s = (k: string) => String(form.get(k) ?? '').trim().slice(0, 80);
  const action = s('action');
  const section = s('section');
  if (!isShowcaseSection(section) || !['add', 'remove', 'up', 'down'].includes(action)) return new Response('Bad request', { status: 400 });
  const city = section === 'top_localities' ? s('city') : '';
  const item = s('item');
  const back = (done: string) => ctx.redirect(`/admin/showcase?${section === 'top_localities' ? `city=${encodeURIComponent(city)}&` : ''}done=${done}#${section}`, 303);

  // Only existing projects / localities of that city can be picked; describe the item for the audit log.
  const refs = await getRefs();
  let label: string | null = null;
  if (section === 'hot_projects') {
    const p = /^\d+$/.test(item) ? await env.DB.prepare('SELECT name FROM projects WHERE id = ?').bind(Number(item)).first<string>('name') : null;
    label = p ? `#${item} ${p}` : null;
  } else {
    const l = refs.city(city) ? refs.locality(city, item) : undefined;
    label = l ? `${l.name}, ${refs.city(city)!.name}` : null;
  }
  if (!label && action === 'add') return back('unknown');

  let done = action;
  let at = '';
  if (action === 'add') { if (!(await addShowcaseItem(section, city, item))) return back('exists'); }
  else if (action === 'remove') { if (!(await removeShowcaseItem(section, city, item))) return back('unchanged'); done = 'removed'; }
  else {
    const place = await moveShowcaseItem(section, city, item, action as 'up' | 'down');
    if (place === null) return back('unchanged');
    at = ` → ${place}`;
    done = 'moved';
  }
  await logAdmin(ctx, `showcase.${action}`, `${SHOWCASE_LABELS[section].toLowerCase()}: ${label ?? item}${at}`);
  return back(done === 'add' ? 'added' : done);
};
