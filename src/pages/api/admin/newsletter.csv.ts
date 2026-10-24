import type { APIRoute } from 'astro';
import { subscribers, subscribersCsv } from '../../../lib/newsletter';
import { logAdmin } from '../../../lib/audit';

// All newsletter subscribers as CSV (protected by middleware: admin Basic auth).
export const GET: APIRoute = async (ctx) => {
  const { list } = await subscribers();
  await logAdmin(ctx, 'newsletter.export', `${list.length} subscribers`);
  const day = new Date().toISOString().slice(0, 10);
  return new Response(subscribersCsv(list), {
    headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="inspistate-newsletter-${day}.csv"` },
  });
};
