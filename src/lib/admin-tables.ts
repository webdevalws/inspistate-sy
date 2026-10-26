// Search, sorting and pagination for admin tables, from the page URL (?q=, ?sort=<key>&dir=asc|desc, ?page=).
// Sorting only uses keys from the page's whitelist, so no URL value reaches the SQL. See docs/functions/admin/desc.md.
import { env } from 'cloudflare:workers';

export const ADMIN_PAGE_SIZE = 25;

export interface PagedOptions {
  /** `FROM …` part, with joins, e.g. "service_orders o". */
  from: string;
  select: string;
  where?: string[];
  binds?: unknown[];
  /** Text search: any of these columns contains ?q (case-insensitive); a number also matches `idColumn` exactly. */
  search?: { columns: string[]; idColumn?: string };
  /** Sortable columns: URL key → SQL expression. */
  sorts: Record<string, string>;
  defaultSort: string;
  defaultDir?: 'asc' | 'desc';
  url: URL;
  pageSize?: number;
}

export interface Paged<T> { rows: T[]; total: number; page: number; pages: number; offset: number; q: string }

export async function paged<T>(o: PagedOptions): Promise<Paged<T>> {
  const sp = o.url.searchParams;
  const q = (sp.get('q') ?? '').trim().slice(0, 60);
  const where = [...(o.where ?? [])];
  const binds = [...(o.binds ?? [])];
  if (q && o.search) {
    // instr() rather than LIKE, so % and _ typed in the search box are plain characters.
    const parts = o.search.columns.map((c) => `instr(lower(coalesce(${c}, '')), lower(?)) > 0`);
    binds.push(...o.search.columns.map(() => q));
    if (o.search.idColumn && /^\d+$/.test(q)) { parts.push(`${o.search.idColumn} = ?`); binds.push(Number(q)); }
    where.push(`(${parts.join(' OR ')})`);
  }
  const whereSql = where.length ? ` WHERE ${where.join(' AND ')}` : '';
  const sortKey = Object.hasOwn(o.sorts, sp.get('sort') ?? '') ? sp.get('sort')! : o.defaultSort;
  const dir = sp.get('sort') && sortKey === sp.get('sort') ? (sp.get('dir') === 'desc' ? 'DESC' : 'ASC') : (o.defaultDir ?? 'desc').toUpperCase();
  const size = o.pageSize ?? ADMIN_PAGE_SIZE;
  const total = (await env.DB.prepare(`SELECT count(*) AS n FROM ${o.from}${whereSql}`).bind(...binds).first<number>('n')) ?? 0;
  const pages = Math.max(1, Math.ceil(total / size));
  const page = Math.min(Math.max(1, Math.floor(Number(sp.get('page')) || 1)), pages);
  const offset = (page - 1) * size;
  const { results } = await env.DB
    .prepare(`SELECT ${o.select} FROM ${o.from}${whereSql} ORDER BY ${o.sorts[sortKey]} ${dir} LIMIT ? OFFSET ?`)
    .bind(...binds, size, offset)
    .all<T>();
  return { rows: results, total, page, pages, offset, q };
}
