/**
 * Create the `repairInvoices` indexes (tech-debt #49).
 *
 *   node scripts/ensure-repair-invoice-indexes.mjs                 # DRY RUN — report only
 *   node scripts/ensure-repair-invoice-indexes.mjs --apply         # create them on the default DB
 *   node scripts/ensure-repair-invoice-indexes.mjs --apply --all   # ...on BOTH prod and DEV
 *
 * Why this exists: `{ repairIDs: <id> }` became a correctness-path query. The closeout route asks
 * whether an invoice already exists for a repair before releasing the auto-invoice claim, because
 * createRepairInvoice inserts the invoice document BEFORE it writes repair.invoiceID — so the repair
 * row cannot answer "was this billed". Unindexed, that lookup collection-scans a monotonically
 * growing collection.
 *
 * This mirrors RepairInvoicesModel.ensureIndexes(); it exists as a script because nothing in the app
 * calls ensureIndexes at runtime (the other models that define one are decorative).
 *
 * Index creation is additive and reversible (`dropIndex`), and does not modify a single document.
 *
 * Reads MONGODB_URI / MONGO_DB_NAME from .env.local.
 */
import fs from 'node:fs';
import { MongoClient } from 'mongodb';

const APPLY = process.argv.includes('--apply');
const ALL_DBS = process.argv.includes('--all');

function envValue(key) {
  const env = fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  const match = env.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return match ? match[1].trim().replace(/^["']|["']$/g, '') : '';
}

const INDEXES = [
  { key: { repairIDs: 1 }, name: 'repairIDs_1' },
  { key: { invoiceID: 1 }, name: 'invoiceID_1' },
];

async function run() {
  const uri = envValue('MONGODB_URI');
  if (!uri) throw new Error('MONGODB_URI not found in .env.local');

  const defaultDb = envValue('MONGO_DB_NAME') || 'efd-database';
  const dbNames = ALL_DBS ? [...new Set([defaultDb, 'efd-database', 'efd-database-DEV'])] : [defaultDb];

  const client = new MongoClient(uri);
  await client.connect();

  try {
    for (const dbName of dbNames) {
      const col = client.db(dbName).collection('repairInvoices');
      const count = await col.countDocuments();
      const existing = await col.indexes();
      const existingNames = new Set(existing.map((index) => index.name));

      console.log(`\n${dbName}  (${count} invoices)`);
      console.log(`  existing indexes: ${[...existingNames].join(', ') || '(none)'}`);

      for (const { key, name } of INDEXES) {
        if (existingNames.has(name)) {
          console.log(`  = ${name} already present`);
          continue;
        }
        if (!APPLY) {
          console.log(`  + ${name} WOULD be created ${JSON.stringify(key)}  (dry run)`);
          continue;
        }
        await col.createIndex(key, { name });
        console.log(`  + ${name} created ${JSON.stringify(key)}`);
      }
    }

    if (!APPLY) console.log('\nDRY RUN — nothing was created. Re-run with --apply.');
  } finally {
    await client.close();
  }
}

run().catch((error) => {
  console.error('FAILED:', error.message);
  process.exit(1);
});
