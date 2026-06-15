/**
 * Clone the production database into the canonical dev database using
 * mongodb-database-tools (mongodump + mongorestore).
 *
 * Flow: mongodump SOURCE  ->  dropDatabase(TARGET)  ->  mongorestore into TARGET
 *
 * Usage (Node 20.6+ for --env-file):
 *   MDB_BIN="C:\\path\\to\\database-tools\\bin" \
 *     node --env-file=.env.local scripts/clone-prod-to-dev.mjs
 *
 * Env:
 *   MONGODB_URI   (required)  base connection string (no default db in path)
 *   MDB_BIN       (required)  directory containing mongodump.exe / mongorestore.exe
 *   CLONE_SOURCE_DB           default 'efd-database'      (production)
 *   CLONE_TARGET_DB           default 'efd-database-DEV'  (canonical dev)
 *   CLONE_DUMP_DIR            default './_dbdump'
 *
 * Safety: refuses to run if TARGET === SOURCE, or if TARGET looks like prod.
 */
import { MongoClient } from 'mongodb';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

const URI = process.env.MONGODB_URI;
const BIN = process.env.MDB_BIN;
const SOURCE = process.env.CLONE_SOURCE_DB || 'efd-database';
const TARGET = process.env.CLONE_TARGET_DB || 'efd-database-DEV';
const DUMP = process.env.CLONE_DUMP_DIR || './_dbdump';

function die(msg) {
  console.error(`✖ ${msg}`);
  process.exit(1);
}

if (!URI) die('MONGODB_URI is required.');
if (!BIN) die('MDB_BIN (path to mongodb-database-tools bin) is required.');
if (SOURCE === TARGET) die(`Refusing to clone: SOURCE and TARGET are both "${SOURCE}".`);
// Guardrail: never let this script write into production.
if (/^efd-database$/.test(TARGET)) die(`Refusing to clone INTO production ("${TARGET}").`);

const mongodump = join(BIN, 'mongodump.exe');
const mongorestore = join(BIN, 'mongorestore.exe');
for (const exe of [mongodump, mongorestore]) {
  if (!existsSync(exe)) die(`Not found: ${exe}`);
}

// Put SOURCE db in the URI path for mongodump (URI has no default db).
const dumpUri = URI.includes('/?') ? URI.replace('/?', `/${SOURCE}?`) : URI;

async function main() {
  console.log(`▶ Cloning "${SOURCE}"  ->  "${TARGET}"`);

  console.log(`\n[1/3] mongodump "${SOURCE}" -> ${DUMP}`);
  execFileSync(mongodump, [`--uri=${dumpUri}`, `--out=${DUMP}`], { stdio: 'inherit' });

  console.log(`\n[2/3] dropDatabase("${TARGET}")`);
  const client = new MongoClient(URI);
  await client.connect();
  await client.db(TARGET).dropDatabase();
  await client.close();
  console.log(`    dropped.`);

  console.log(`\n[3/3] mongorestore -> "${TARGET}"`);
  execFileSync(
    mongorestore,
    [
      `--uri=${URI}`,
      `--nsFrom=${SOURCE}.*`,
      `--nsTo=${TARGET}.*`,
      '--drop',
      DUMP,
    ],
    { stdio: 'inherit' }
  );

  console.log(`\n✔ Clone complete: "${SOURCE}" -> "${TARGET}"`);
}

main().catch((e) => die(e.stack || e.message));
