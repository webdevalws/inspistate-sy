import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import Anthropic from '@anthropic-ai/sdk';
import { sha256 } from '../../../lib/auth';
import { ROOMS, ROOM_TYPES } from '../../../data/vastu';

// Detects rooms on an uploaded floor plan with Claude vision (equivalent of the reference
// "/generate-node-points" step). Returns room centres as normalised image coordinates.
const DAILY_LIMIT = 10;
const MAX_BASE64 = 7_000_000; // ~5 MB image

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['is_floor_plan', 'rooms', 'north_arrow_degrees'],
  properties: {
    is_floor_plan: { type: 'boolean', description: 'False if the image is not an architectural floor plan.' },
    north_arrow_degrees: {
      anyOf: [{ type: 'number' }, { type: 'null' }],
      description: 'If the plan shows a north arrow or compass, the clockwise angle in degrees from the image top to where it points. Null if none is drawn.',
    },
    rooms: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['type', 'x', 'y', 'label_on_plan'],
        properties: {
          type: { type: 'string', enum: ROOM_TYPES },
          x: { type: 'number', description: 'Room centre, 0 = left edge, 1 = right edge of the image.' },
          y: { type: 'number', description: 'Room centre, 0 = top edge, 1 = bottom edge of the image.' },
          label_on_plan: { type: 'string', description: 'The text written in the room on the plan, or empty.' },
        },
      },
    },
  },
} as const;

const SYSTEM = `You read architectural floor plans of Indian homes and locate every room for a Vastu analysis.
For each room or space, give its centre as normalised image coordinates and map it to the closest allowed type:
${ROOM_TYPES.map((t) => `${t} (${ROOMS[t].label})`).join(', ')}.
Use "main_entrance" for the main door of the home. Map "bath", "WC", "toilet" to toilet; "puja" or "mandir" to pooja_room; "drawing"/"hall"/"lounge" to living_room; "M. bed"/"master" to master_bedroom; other bedrooms to bedroom unless labelled for children or guests. Skip corridors, ducts and shafts. Only report rooms you can actually see.`;

export const POST: APIRoute = async ({ request, url, clientAddress }) => {
  if (request.headers.get('origin') !== url.origin) return new Response('Forbidden', { status: 403 });
  const apiKey = (env as unknown as { ANTHROPIC_API_KEY?: string }).ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ error: 'Automatic room detection is not configured. Mark rooms manually instead.' }, { status: 503 });

  const body = (await request.json().catch(() => null)) as { image?: string; mediaType?: string } | null;
  const mediaType = body?.mediaType === 'image/png' ? 'image/png' : body?.mediaType === 'image/jpeg' ? 'image/jpeg' : null;
  if (!body?.image || !mediaType || body.image.length > MAX_BASE64 || !/^[A-Za-z0-9+/=]+$/.test(body.image)) {
    return Response.json({ error: 'Upload a JPG or PNG floor plan up to 5 MB.' }, { status: 422 });
  }

  // Per-client daily cap.
  const client = await sha256(clientAddress ?? 'unknown');
  const day = new Date().toISOString().slice(0, 10);
  const used = await env.DB.prepare(`INSERT INTO ai_usage (client, feature, day, count) VALUES (?, 'vastu', ?, 1)
    ON CONFLICT(client, feature, day) DO UPDATE SET count = count + 1 RETURNING count`).bind(client, day).first<number>('count');
  if ((used ?? 0) > DAILY_LIMIT) return Response.json({ error: 'Daily limit for automatic detection reached. Mark rooms manually or try tomorrow.' }, { status: 429 });
  // Failures on our side (API errors, a cut-off or unreadable reply) give the use back. Refusals and
  // "not a floor plan" still count: the call was made and paid for.
  const failed = async (error: string, status: number) => {
    await env.DB.prepare("UPDATE ai_usage SET count = count - 1 WHERE client = ? AND feature = 'vastu' AND day = ? AND count > 0").bind(client, day).run();
    return Response.json({ error }, { status });
  };

  const anthropic = new Anthropic({ apiKey });
  try {
    const response = await anthropic.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: SYSTEM,
      output_config: { format: { type: 'json_schema', schema: SCHEMA as unknown as Record<string, unknown> } },
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: body.image } },
          { type: 'text', text: 'Locate every room on this floor plan.' },
        ],
      }],
    });
    if (response.stop_reason === 'refusal') return Response.json({ error: 'This image could not be analysed. Mark rooms manually.' }, { status: 422 });
    // A reply cut off at max_tokens is incomplete JSON; say so instead of a generic parse error.
    if (response.stop_reason === 'max_tokens') return await failed('Detection was cut short on this plan. Try again or mark rooms manually.', 502);
    const text = response.content.find((b) => b.type === 'text');
    if (!text || text.type !== 'text') throw new Error('No output');
    const parsed = JSON.parse(text.text) as { is_floor_plan: boolean; north_arrow_degrees: number | null; rooms: { type: string; x: number; y: number; label_on_plan: string }[] };
    if (!parsed.is_floor_plan) return Response.json({ error: 'This does not look like a floor plan. Upload a clear 2D plan.' }, { status: 422 });
    const clamp = (n: number) => Math.min(1, Math.max(0, Number(n) || 0));
    return Response.json({
      northRotation: parsed.north_arrow_degrees == null ? null : (((Math.round(parsed.north_arrow_degrees / 22.5) * 22.5) % 360) + 360) % 360,
      rooms: parsed.rooms.filter((r) => (ROOM_TYPES as string[]).includes(r.type)).map((r) => ({ type: r.type, x: clamp(r.x), y: clamp(r.y), labelOnPlan: r.label_on_plan })),
    });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return await failed('Detection is busy right now. Try again in a minute or mark rooms manually.', 503);
    if (err instanceof Anthropic.APIError) return await failed('Detection failed. Mark rooms manually.', 502);
    return await failed('Could not read the detection result. Mark rooms manually.', 502);
  }
};
