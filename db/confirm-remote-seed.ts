// Guard for `npm run db:seed:remote`: db/seed.sql starts by deleting real data, so seeding the remote
// (production) database must be confirmed explicitly. Exits with an error unless
// CONFIRM_REMOTE_SEED=inspistate-db is set for this one command.
// Run: node db/confirm-remote-seed.ts   (package.json runs it before the wrangler command)
import { readFileSync } from 'node:fs';

const DATABASE = 'inspistate-db';
const sql = readFileSync(new URL('./seed.sql', import.meta.url), 'utf8');
const tables = [...sql.matchAll(/DELETE FROM (\w+)/g)].map((m) => m[1]).filter((t) => t !== 'sqlite_sequence');

console.error(`
!!  db:seed:remote replaces the data in the REMOTE (production) D1 database "${DATABASE}".
!!  It first DELETES every row in: ${tables.join(', ')}.
!!  Owner-posted listings, leads, reviews, shortlists, saved searches and the forum are lost,
!!  and uploaded photos stay in R2 with nothing pointing to them. This cannot be undone.
`);

if (process.env.CONFIRM_REMOTE_SEED !== DATABASE) {
  console.error(`Blocked. To really do this, set CONFIRM_REMOTE_SEED=${DATABASE} for this one command:
  PowerShell:  $env:CONFIRM_REMOTE_SEED='${DATABASE}'; npm run db:seed:remote; Remove-Item Env:CONFIRM_REMOTE_SEED
  bash:        CONFIRM_REMOTE_SEED=${DATABASE} npm run db:seed:remote
For local data use npm run db:seed:local (or db:reset:local) instead.
`);
  process.exit(1);
}
console.error(`CONFIRM_REMOTE_SEED=${DATABASE} is set — seeding the remote database.`);
