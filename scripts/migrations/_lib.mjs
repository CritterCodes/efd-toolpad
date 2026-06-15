/**
 * Shared harness for hardened, production-grade sprint migrations.
 *
 * Each sprint ships one migration script under scripts/migrations/ that calls
 * runMigration({ name, steps }). The harness provides:
 *   - target-DB guards (only known non-prod DBs, or prod with an explicit flag)
 *   - --dry-run (report intended changes, write nothing)
 *   - a pre-flight mongodump backup before any write (skippable, never on prod)
 *   - idempotent step execution + an audit record in `_migrations`
 *
 * Run (Node 20.6+ for --env-file):
 *   MIGRATE_DB=efd-database-DEV node --env-file=.env.local scripts/migrations/sX-*.mjs [--dry-run]
 *
 * Staging dry-run / real-data test (clone of prod):
 *   MIGRATE_DB=efd-db-migrate MDB_BIN="...\\bin" node --env-file=.env.local scripts/migrations/sX-*.mjs
 *
 * Production cutover (deliberate, after staging passes):
 *   MIGRATE_DB=efd-database MIGRATE_ALLOW_PROD=YES_I_AM_SURE \
 *     MDB_BIN="...\\bin" node --env-file=.env.production scripts/migrations/sX-*.mjs
 */
import { MongoClient } from 'mongodb';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

const PROD_DB = 'efd-database';
const KNOWN_NONPROD = new Set(['efd-database-DEV', 'efd-db-migrate']);

export function parseArgs(argv = process.argv.slice(2)) {
  const flags = new Set(argv.filter((a) => a.startsWith('--')));
  return { dryRun: flags.has('--dry-run'), skipBackup: flags.has('--skip-backup') };
}

function getUri() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required (use node --env-file=.env.local ...).');
  return uri;
}

function resolveTargetDb() {
  const db = process.env.MIGRATE_DB;
  if (!db) {
    throw new Error('MIGRATE_DB is required (efd-database-DEV, efd-db-migrate, or efd-database with override).');
  }
  if (db === PROD_DB) {
    if (process.env.MIGRATE_ALLOW_PROD !== 'YES_I_AM_SURE') {
      throw new Error(`Refusing to target production "${PROD_DB}". Set MIGRATE_ALLOW_PROD=YES_I_AM_SURE.`);
    }
    return { db, isProd: true };
  }
  if (!KNOWN_NONPROD.has(db)) {
    throw new Error(`Unknown target DB "${db}". Allowed: ${[...KNOWN_NONPROD].join(', ')}, or ${PROD_DB} (with override).`);
  }
  return { db, isProd: false };
}

export async function collExists(db, name) {
  return (await db.listCollections({ name }).toArray()).length > 0;
}

function runBackup({ uri, dbName, isProd, skipBackup, stamp }) {
  if (skipBackup) {
    if (isProd) throw new Error('--skip-backup is not allowed when targeting production.');
    console.log('• --skip-backup set; skipping backup (non-prod only).');
    return null;
  }
  const bin = process.env.MDB_BIN;
  if (!bin) {
    throw new Error('MDB_BIN (mongodb-database-tools bin dir) is required for the pre-flight backup. '
      + 'Set it, or pass --skip-backup on a non-prod target.');
  }
  const mongodump = join(bin, process.platform === 'win32' ? 'mongodump.exe' : 'mongodump');
  if (!existsSync(mongodump)) throw new Error(`mongodump not found at ${mongodump}`);
  const outDir = join(process.env.MIGRATE_BACKUP_DIR || '.', `backup-${dbName}-${stamp}`);
  const dumpUri = uri.includes('/?') ? uri.replace('/?', `/${dbName}?`) : uri;
  console.log(`• pre-flight backup: ${dbName} -> ${outDir}`);
  execFileSync(mongodump, [`--uri=${dumpUri}`, `--out=${outDir}`], { stdio: 'inherit' });
  return outDir;
}

/**
 * Execute a migration.
 * @param {{ name: string, steps: Array<{ title: string, run: (ctx) => Promise<string> }> }} cfg
 * ctx = { db, dbName, dryRun, log }. Steps must be idempotent and, in dry-run,
 * must only read + report (never write).
 */
export async function runMigration({ name, steps }) {
  const { dryRun, skipBackup } = parseArgs();
  const { db: dbName, isProd } = resolveTargetDb();
  const uri = getUri();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');

  console.log(`\n=== Migration: ${name} ===`);
  console.log(`Target DB : ${dbName}${isProd ? '   *** PRODUCTION ***' : ''}`);
  console.log(`Mode      : ${dryRun ? 'DRY-RUN (no writes)' : 'APPLY'}`);
  console.log('');

  const client = new MongoClient(uri);
  await client.connect();
  try {
    const database = client.db(dbName);
    const ctx = { db: database, dbName, dryRun, log: (m) => console.log(`    ${m}`) };

    if (!dryRun) runBackup({ uri, dbName, isProd, skipBackup, stamp });

    const results = [];
    for (const step of steps) {
      console.log(`▶ ${step.title}`);
      const summary = await step.run(ctx);
      results.push({ step: step.title, summary });
      console.log(`    ${summary}\n`);
    }

    if (!dryRun) {
      await database.collection('_migrations').insertOne({
        name, appliedAt: new Date(), db: dbName, dryRun: false, results,
      });
    }

    console.log(dryRun ? '✔ Dry-run complete (nothing written).' : '✔ Migration complete.');
    return results;
  } finally {
    await client.close();
  }
}
