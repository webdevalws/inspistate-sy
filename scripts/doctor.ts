// `npm run doctor` — checks that this machine and the Cloudflare setup can run InspiState, and says how to fix
// what isn't. Local by default (Node, .dev.vars, the local D1 database and its migrations, wrangler bindings);
// `npm run doctor -- --remote` checks the deployed setup instead (secrets, remote D1, R2 bucket) using read-only
// wrangler commands. Setting values are never printed. See DEPLOY.md.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const remote = process.argv.includes('--remote');
const DB = 'inspistate-db';
const MIN_NODE = [22, 22];
const REQUIRED = ['ADMIN_PASSWORD', 'SMS_WEBHOOK_URL'];
let failed = 0;

const ok = (msg: string) => console.log(`✅ ${msg}`);
const bad = (msg: string, fix: string) => { failed++; console.log(`❌ ${msg}\n   → ${fix}`); };
// Runs the project's wrangler with this Node (no shell, so arguments such as SQL stay intact on Windows too).
const WRANGLER = 'node_modules/wrangler/bin/wrangler.js';
const wrangler = (args: string[]) => {
  const r = spawnSync(process.execPath, [WRANGLER, ...args], { encoding: 'utf8' });
  return { ok: r.status === 0, out: `${r.stdout ?? ''}${r.stderr ?? ''}` };
};
if (!existsSync(WRANGLER)) { console.log('❌ wrangler is not installed\n   → npm install'); process.exit(1); }

console.log(`InspiState doctor — checking ${remote ? 'the REMOTE (deployed) setup' : 'this machine (local)'}\n`);

// 1. Node
const [maj, min] = process.versions.node.split('.').map(Number);
if (maj > MIN_NODE[0] || (maj === MIN_NODE[0] && min >= MIN_NODE[1])) ok(`Node ${process.versions.node}`);
else bad(`Node ${process.versions.node} is too old`, `Install Node ${MIN_NODE.join('.')} or newer (package.json "engines").`);

// 2. wrangler.jsonc bindings
const config = (() => {
  try {
    // Strip // and /* */ comments (not inside strings) and trailing commas, then parse.
    const text = readFileSync('wrangler.jsonc', 'utf8').replace(/("(?:\\.|[^"\\])*")|\/\/[^\n]*|\/\*[\s\S]*?\*\//g, (_m, str) => str ?? '').replace(/,(\s*[}\]])/g, '$1');
    return JSON.parse(text) as Record<string, any>;
  } catch { return null; }
})();
if (!config) bad('wrangler.jsonc could not be read', 'Make sure wrangler.jsonc exists and is valid JSON with comments.');
else {
  const d1 = (config.d1_databases ?? []).find((d: any) => d.binding === 'DB');
  const r2 = (config.r2_buckets ?? []).find((b: any) => b.binding === 'MEDIA');
  d1 ? ok(`D1 binding DB → ${d1.database_name}`) : bad('No D1 binding "DB" in wrangler.jsonc', 'Add it under "d1_databases" (see DEPLOY.md).');
  r2 ? ok(`R2 binding MEDIA → ${r2.bucket_name}`) : bad('No R2 binding "MEDIA" in wrangler.jsonc', 'Add it under "r2_buckets" (see DEPLOY.md).');
  if (remote && r2) {
    const list = wrangler(['r2', 'bucket', 'list']);
    list.ok && list.out.includes(r2.bucket_name) ? ok(`R2 bucket ${r2.bucket_name} exists`) : bad(`R2 bucket ${r2.bucket_name} not found`, `npx wrangler r2 bucket create ${r2.bucket_name}`);
  }
}

// 3. Settings (names only — values are never printed)
if (remote) {
  const r = wrangler(['secret', 'list']);
  if (!r.ok) bad('Could not list Worker secrets', 'Run `npx wrangler login`, deploy once, then try again.');
  else for (const k of REQUIRED) r.out.includes(`"${k}"`) ? ok(`Secret ${k} is set`) : bad(`Secret ${k} is missing`, `npx wrangler secret put ${k}`);
} else if (!existsSync('.dev.vars')) {
  bad('.dev.vars not found', 'cp .dev.vars.example .dev.vars, then fill in the values.');
} else {
  const vars = Object.fromEntries(readFileSync('.dev.vars', 'utf8').split(/\r?\n/).map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)).filter((m): m is RegExpMatchArray => !!m).map((m) => [m[1], m[2].trim()]));
  vars.ADMIN_PASSWORD ? ok('ADMIN_PASSWORD is set') : bad('ADMIN_PASSWORD is not set', 'Add ADMIN_PASSWORD=... to .dev.vars (see .dev.vars.example).');
  // Locally, login can run without an SMS gateway via TEST_OTP or DEV_SHOW_OTP.
  vars.SMS_WEBHOOK_URL || vars.TEST_OTP || vars.DEV_SHOW_OTP === '1'
    ? ok(`Login codes: ${vars.SMS_WEBHOOK_URL ? 'SMS_WEBHOOK_URL is set' : 'dev login (TEST_OTP / DEV_SHOW_OTP)'}`)
    : bad('No way to send login codes', 'Set SMS_WEBHOOK_URL, or for local testing TEST_OTP=123456 or DEV_SHOW_OTP=1 in .dev.vars.');
}

// 4. Database reachable, and migrations applied
const where = remote ? '--remote' : '--local';
const ping = wrangler(['d1', 'execute', DB, where, '--json', '--command', 'SELECT count(*) AS n FROM cities']);
if (ping.ok) {
  const n = ping.out.match(/"n":\s*(\d+)/)?.[1];
  ok(`D1 ${DB} (${where.slice(2)}) is reachable — ${n ?? '?'} cities`);
  if (n === '0') bad('No cities in the database', remote ? 'npm run db:reference:remote (reference data only — never the demo seed).' : 'npm run db:reset:local');
} else {
  bad(`D1 ${DB} (${where.slice(2)}) is not reachable or has no tables`, remote ? 'npm run db:migrate:remote (see DEPLOY.md).' : 'npm run db:reset:local');
}
const mig = wrangler(['d1', 'migrations', 'list', DB, where]);
if (!mig.ok) bad('Could not read the migration status', `npx wrangler d1 migrations list ${DB} ${where}`);
else if (/No migrations to apply/i.test(mig.out)) ok('All migrations are applied');
else bad('Some migrations are not applied yet', remote ? 'npm run db:migrate:remote' : 'npm run db:migrate:local (or db:reset:local for a fresh demo database)');

console.log(failed ? `\n${failed} problem${failed > 1 ? 's' : ''} found.` : '\nAll good.');
process.exit(failed ? 1 : 0);
