// Newsletter subscribers, for /admin and its CSV export. Signups come from /api/newsletter.
import { env } from 'cloudflare:workers';

export interface Subscriber { email: string; created_at: string }

export async function subscribers(limit?: number): Promise<{ total: number; list: Subscriber[] }> {
  const [count, rows] = await env.DB.batch([
    env.DB.prepare('SELECT count(*) AS n FROM newsletter_subscribers'),
    env.DB.prepare(`SELECT email, created_at FROM newsletter_subscribers ORDER BY created_at DESC, email${limit ? ' LIMIT ?' : ''}`).bind(...(limit ? [limit] : [])),
  ]);
  return { total: ((count.results[0] as { n: number } | undefined)?.n) ?? 0, list: rows.results as Subscriber[] };
}

/** CSV cell: quoted, and cells a spreadsheet would read as a formula (=, +, -, @) are prefixed with '. */
const cell = (v: string) => `"${(/^[=+\-@\t\r]/.test(v) ? `'${v}` : v).replace(/"/g, '""')}"`;

export function subscribersCsv(list: Subscriber[]): string {
  return ['email,subscribed_at', ...list.map((s) => `${cell(s.email)},${cell(s.created_at)}`)].join('\r\n') + '\r\n';
}
