/**
 * Put the store back on its own tickets.
 *
 * Owner, 2026-10-04: "Whether they enter it or I enter it, it needs to be attributed to the right
 * people." Stores mail in envelopes, the shop keys them in, and where a piece carries an end customer
 * that customer is entered. Until the intake fix that shipped alongside this, keying a repair against a
 * store's own customer left the store off the ticket entirely.
 *
 * Audit at the time (scripts/audit-wholesale-attribution.mjs, production): of 292 wholesale repairs only
 * 90 were attributed correctly. 198 had no `storeName`, 2 had no usable `storeId` — and in every one of
 * those the store was derivable from the client's `parentWholesalerId`. The Smith alone accounted for
 * 135 of them.
 *
 * Derives, never guesses:
 *   repair.userID → clients.parentWholesalerId → that store's own record → wholesalerBusinessName()
 *
 * The business name comes from the store's record and never from the repair payload — the same rule the
 * intake route follows, and for the same reason: the admin form once named Greers Pawn "Sam Johnson"
 * (the contact), and 20 repairs plus 7 invoices were keyed to a person no portal login matched.
 *
 * SKIPS anything it cannot derive, and anything where an existing storeId disagrees with the client's
 * parent — a disagreement is a question for a human, not a thing to overwrite.
 *
 * Dry run by default. `--apply` backs up every touched document whole first.
 * Run: MONGO_DB_NAME=efd-database node --env-file=.env.local scripts/migrations/backfill-wholesale-store-attribution.mjs [--apply]
 */
import { MongoClient } from 'mongodb';
import { wholesalerBusinessName } from '../../src/services/wholesale/businessName.js';

const APPLY = process.argv.includes('--apply');
const DB = process.env.MONGO_DB_NAME;
if (!DB) { console.error('✖ MONGO_DB_NAME required (refusing to guess).'); process.exit(1); }
const uri = process.env.MONGODB_URI;
if (!uri) { console.error('✖ MONGODB_URI required (node --env-file=.env.local ...).'); process.exit(1); }

const client = new MongoClient(uri);
await client.connect();
try {
  const db = client.db(DB);

  const stores = await db.collection('users').find({ role: 'wholesaler' }).toArray();
  const storeByID = new Map(stores.map((s) => [s.userID, s]));

  const clients = await db.collection('clients')
    .find({}, { projection: { _id: 0, clientID: 1, userID: 1, parentWholesalerId: 1 } }).toArray();
  const parentOf = new Map();
  for (const c of clients) {
    for (const id of [c.clientID, c.userID]) if (id && c.parentWholesalerId) parentOf.set(id, c.parentWholesalerId);
  }

  const repairs = await db.collection('repairs').find({ isWholesale: true }).toArray();

  const plan = [];
  const skipped = { noStore: 0, disagree: 0, alreadyFine: 0, noBusinessName: 0 };

  for (const r of repairs) {
    const truth = parentOf.get(r.userID) || (storeByID.has(r.userID) ? r.userID : null)
      || (storeByID.has(r.storeId) ? r.storeId : null);
    if (!truth || !storeByID.has(truth)) { skipped.noStore += 1; continue; }

    if (r.storeId && storeByID.has(r.storeId) && r.storeId !== truth) { skipped.disagree += 1; continue; }

    const name = wholesalerBusinessName(storeByID.get(truth));
    if (!name) { skipped.noBusinessName += 1; continue; }

    const set = {};
    if (r.storeId !== truth) set.storeId = truth;
    if (r.storeName !== name) set.storeName = name;
    if (!r.businessName) set.businessName = name;

    if (!Object.keys(set).length) { skipped.alreadyFine += 1; continue; }
    plan.push({ _id: r._id, repairID: r.repairID, set, store: name });
  }

  console.log(`database: ${DB}`);
  console.log(`mode:     ${APPLY ? 'APPLY' : 'DRY RUN (pass --apply to write)'}`);
  console.log(`scanned:  ${repairs.length} wholesale repairs\n`);
  console.log(`  to correct ............ ${plan.length}`);
  console.log(`  already correct ....... ${skipped.alreadyFine}`);
  console.log(`  no store derivable .... ${skipped.noStore}`);
  console.log(`  storeId disagrees ..... ${skipped.disagree}   (left for a human)`);
  console.log(`  store has no name ..... ${skipped.noBusinessName}`);

  const byStore = plan.reduce((m, p) => m.set(p.store, (m.get(p.store) || 0) + 1), new Map());
  console.log('\n  by store:');
  [...byStore.entries()].sort((a, b) => b[1] - a[1]).forEach(([s, n]) => console.log(`    ${String(n).padStart(4)}  ${s}`));

  if (!plan.length) { console.log('\nNothing to do.'); process.exit(0); }
  if (!APPLY) { console.log('\nDry run — nothing was written.'); process.exit(0); }

  const stamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
  const backupName = `wholesaleAttributionBackup_${stamp}`;
  await db.collection(backupName).insertMany(
    repairs.filter((r) => plan.some((p) => String(p._id) === String(r._id))));
  console.log(`\nbacked up ${plan.length} whole documents → ${backupName}`);

  let modified = 0;
  for (const p of plan) {
    const res = await db.collection('repairs').updateOne({ _id: p._id }, { $set: p.set });
    modified += res.modifiedCount;
  }
  console.log(`updated ${modified} repairs`);
} finally {
  await client.close();
}
