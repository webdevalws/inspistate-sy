import { env } from 'cloudflare:workers';

const db = () => env.DB;

export interface Question { id: number; author: string; citySlug: string | null; title: string; body: string; createdAt: string; answers: number }
export interface Answer { id: number; author: string; body: string; createdAt: string }

export async function listQuestions(opts: { city?: string; q?: string; limit?: number } = {}): Promise<Question[]> {
  const where = ["fq.status = 'published'"];
  const args: unknown[] = [];
  if (opts.city) { where.push('fq.city_slug = ?'); args.push(opts.city); }
  if (opts.q) { where.push('(fq.title LIKE ? OR fq.body LIKE ?)'); args.push(`%${opts.q}%`, `%${opts.q}%`); }
  const { results } = await db()
    .prepare(`SELECT fq.*, (SELECT count(*) FROM forum_answers fa WHERE fa.question_id = fq.id AND fa.status = 'published') AS answers
      FROM forum_questions fq WHERE ${where.join(' AND ')} ORDER BY fq.created_at DESC LIMIT ?`)
    .bind(...args, opts.limit ?? 50)
    .all<Record<string, unknown>>();
  return results.map((r) => ({ id: r.id as number, author: r.author as string, citySlug: (r.city_slug as string) ?? null, title: r.title as string, body: r.body as string, createdAt: r.created_at as string, answers: r.answers as number }));
}

export async function getQuestion(id: number) {
  const q = await db().prepare("SELECT * FROM forum_questions WHERE id = ? AND status = 'published'").bind(id).first<Record<string, unknown>>();
  if (!q) return null;
  const { results } = await db().prepare("SELECT id, author, body, created_at FROM forum_answers WHERE question_id = ? AND status = 'published' ORDER BY created_at").bind(id).all<Record<string, unknown>>();
  return {
    question: { id: q.id as number, author: q.author as string, citySlug: (q.city_slug as string) ?? null, title: q.title as string, body: q.body as string, createdAt: q.created_at as string, answers: results.length },
    answers: results.map((a) => ({ id: a.id as number, author: a.author as string, body: a.body as string, createdAt: a.created_at as string })) as Answer[],
  };
}

export async function createQuestion(userId: number, author: string, citySlug: string | null, title: string, body: string) {
  return (await db().prepare('INSERT INTO forum_questions (user_id, author, city_slug, title, body) VALUES (?, ?, ?, ?, ?) RETURNING id').bind(userId, author, citySlug, title, body).first<number>('id'))!;
}

export async function createAnswer(questionId: number, userId: number, author: string, body: string) {
  await db().prepare('INSERT INTO forum_answers (question_id, user_id, author, body) VALUES (?, ?, ?, ?)').bind(questionId, userId, author, body).run();
}

// ---------- moderation (admin) ----------

export type ForumKind = 'question' | 'answer';
export interface ForumPost { kind: ForumKind; id: number; questionId: number; title: string; body: string; author: string; status: 'published' | 'hidden'; createdAt: string }

/** Newest questions and answers, published or hidden, for /admin. */
export async function recentForumPosts(limit = 40): Promise<ForumPost[]> {
  const { results } = await db()
    .prepare(`SELECT * FROM (
        SELECT 'question' AS kind, id, id AS question_id, title, body, author, status, created_at FROM forum_questions
        UNION ALL
        SELECT 'answer', fa.id, fa.question_id, fq.title, fa.body, fa.author, fa.status, fa.created_at FROM forum_answers fa JOIN forum_questions fq ON fq.id = fa.question_id
      ) ORDER BY created_at DESC LIMIT ?`)
    .bind(limit)
    .all<Record<string, unknown>>();
  return results.map((r) => ({
    kind: r.kind as ForumKind, id: r.id as number, questionId: r.question_id as number, title: r.title as string, body: r.body as string,
    author: r.author as string, status: r.status as ForumPost['status'], createdAt: r.created_at as string,
  }));
}

/** Hides or shows a question or an answer. Hidden posts disappear from every public page. */
export async function setForumStatus(kind: ForumKind, id: number, status: 'published' | 'hidden'): Promise<boolean> {
  const table = kind === 'question' ? 'forum_questions' : 'forum_answers';
  const r = await db().prepare(`UPDATE ${table} SET status = ? WHERE id = ?`).bind(status, id).run();
  return (r.meta.changes ?? 0) > 0;
}
