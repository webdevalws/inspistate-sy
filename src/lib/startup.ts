// Startup check for production builds: on the first request a Worker instance handles, log one clear error
// listing required settings that are missing, so a misconfigured deploy shows up in the logs immediately
// (`npx wrangler tail`, or the dashboard's Observability). Values are never logged. The list matches
// .dev.vars.example and `npm run doctor`. See docs/functions/production-setup/desc.md.
import { env } from 'cloudflare:workers';

export const REQUIRED_SETTINGS = {
  ADMIN_PASSWORD: '/admin is disabled (503) until it is set',
  SMS_WEBHOOK_URL: 'nobody can log in or register: login codes cannot be sent',
} as const;

let checked = false;

export function checkRequiredSettings() {
  if (checked || !import.meta.env.PROD) return;
  checked = true;
  const cfg = env as unknown as Record<string, string | undefined>;
  const missing = (Object.keys(REQUIRED_SETTINGS) as (keyof typeof REQUIRED_SETTINGS)[]).filter((k) => !cfg[k]?.trim());
  if (!missing.length) return;
  console.error(
    `[InspiState] Missing required settings: ${missing.join(', ')}.\n` +
      missing.map((k) => `  - ${k}: ${REQUIRED_SETTINGS[k]}. Set it with: npx wrangler secret put ${k}`).join('\n') +
      '\n  See .dev.vars.example and DEPLOY.md; run `npm run doctor -- --remote` to check.',
  );
}
