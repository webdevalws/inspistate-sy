// Project photos for the admin (/admin/projects/{id}, "Photos" card): upload, cover, order, remove. Stored like
// listing photos: type checked from the bytes, at most 5 MB, metadata (EXIF incl. GPS) stripped, R2 key
// projects/<id>/<uuid>.<ext>. project_photos.position 1 is the cover. Projects without photos keep their stock images.
import { env } from 'cloudflare:workers';
import { sniffImage, stripMetadata, type ImageMime } from './strip-metadata';

export const MAX_PROJECT_PHOTOS = 12;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

const db = () => env.DB;

export async function projectPhotoKeys(projectId: number): Promise<string[]> {
  const { results } = await db().prepare('SELECT r2_key FROM project_photos WHERE project_id = ? ORDER BY position, r2_key').bind(projectId).all<{ r2_key: string }>();
  return results.map((r) => r.r2_key);
}

/** Positions 1..n in the given order (one batch). */
async function saveOrder(projectId: number, keys: string[]) {
  if (!keys.length) return;
  await db().batch(keys.map((k, i) => db().prepare('UPDATE project_photos SET position = ? WHERE project_id = ? AND r2_key = ?').bind(i + 1, projectId, k)));
}

/** Checks every file before storing any; appends them after the existing photos. */
export async function addProjectPhotos(projectId: number, files: File[]): Promise<{ ok: true; added: number; total: number } | { ok: false; error: string }> {
  if (!files.length) return { ok: false, error: 'Choose at least one photo.' };
  const existing = await projectPhotoKeys(projectId);
  if (existing.length + files.length > MAX_PROJECT_PHOTOS) return { ok: false, error: `A project can have at most ${MAX_PROJECT_PHOTOS} photos (it has ${existing.length}).` };
  const photos: { bytes: Uint8Array; ext: string; mime: ImageMime }[] = [];
  for (const f of files) {
    if (f.size > MAX_PHOTO_BYTES) return { ok: false, error: `${f.name} is larger than 5 MB.` };
    const bytes = await f.arrayBuffer();
    const kind = sniffImage(new Uint8Array(bytes.slice(0, 12)));
    if (!kind) return { ok: false, error: `${f.name} is not a JPEG, PNG or WebP image.` };
    photos.push({ bytes: stripMetadata(bytes, kind.mime), ...kind });
  }
  const keys = photos.map((p) => `projects/${projectId}/${crypto.randomUUID()}.${p.ext}`);
  await Promise.all(photos.map((p, i) => env.MEDIA.put(keys[i], p.bytes, { httpMetadata: { contentType: p.mime } })));
  await db().batch(keys.map((k, i) => db().prepare('INSERT INTO project_photos (project_id, r2_key, position) VALUES (?, ?, ?)').bind(projectId, k, existing.length + i + 1)));
  return { ok: true, added: keys.length, total: existing.length + keys.length };
}

/** cover / up / down / remove one photo. Returns the audit text, or null when the key is not this project's or nothing moved. */
export async function changeProjectPhoto(projectId: number, action: string, key: string): Promise<string | null> {
  const keys = await projectPhotoKeys(projectId);
  const i = keys.indexOf(key);
  if (i < 0) return null;
  const n = (k: number) => `photo ${k + 1}`;
  if (action === 'remove') {
    await db().prepare('DELETE FROM project_photos WHERE project_id = ? AND r2_key = ?').bind(projectId, key).run();
    await env.MEDIA.delete(key);
    await saveOrder(projectId, keys.filter((k) => k !== key));
    return `${n(i)} of ${keys.length} removed${i === 0 ? ' (was the cover)' : ''}`;
  }
  const j = action === 'cover' ? 0 : action === 'up' ? i - 1 : action === 'down' ? i + 1 : -1;
  if (j < 0 || j >= keys.length || j === i) return null;
  const order = keys.filter((k) => k !== key);
  order.splice(j, 0, key);
  await saveOrder(projectId, order);
  return action === 'cover' ? `${n(i)} → cover` : `${n(i)} → ${n(j)}`;
}
