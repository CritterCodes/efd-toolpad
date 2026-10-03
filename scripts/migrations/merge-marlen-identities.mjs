/**
 * Marlen Jewelers is two identities, and the portal only shows one of them.
 *
 * `andrew@marlenjewelers.com` is `user-c9f82772` (role wholesaler, verified, password set). 21 of his 47
 * repairs carry that userID. The other 26 carry `client-35605079` — a bare id in the `clients` collection
 * with no user record behind it, created when the work was keyed in at our counter rather than by him.
 *
 * It matters because `/api/wholesale/repairs` scopes to
 *   { $or: [ { userID: session.user.userID }, { createdBy: session.user.userID } ] }
 * and those 26 match neither: Andrew did not create them, we did (154 of this store's repairs were
 * entered by the owner, 102 by Vernon). **So the first time he signs in he sees 21 of 47 jobs** and
 * concludes our system has lost half his work. The invoices are already unified — all three carry
 * `accountID: wholesale-business:marlen-jewelers` — so this is the repairs collection alone.
 *
 * What it changes, per repair, for the 26 on the stray id:
 *   userID     client-35605079 → user-c9f82772      (the whole point: portal visibility)
 *   storeId    → user-c9f82772, ONLY where unset or holding an email address (some hold
 *               `jacobaengel55@gmail.com`, which is the operator who typed it, not a store)
 *   storeName  → 'Marlen Jewelers', ONLY where unset
 *
 * What it deliberately leaves alone:
 *   clientName   'Andrew Eilberg' on these, 'Marlen Jewelers' on the others. A person and a business are
 *                a real distinction and flattening it is not this script's business.
 *   clients/     the client-35605079 record stays; nothing is deleted.
 *   invoices     already correct.
 *
 * Dry run by default. `--apply` backs every touched document up first, whole, into a timestamped
 * collection, then writes field-by-field with $set — never a document replace, which is how four
 * subdocument-loss incidents started here.
 */
import { MongoClient } from 'mongodb';

const KEEP = 'user-c9f82772';
const STRAY = 'client-35605079';
const STORE_NAME = 'Marlen Jewelers';

const APPLY = process.argv.includes('--apply');
const DB = process.env.MONGO_DB_NAME;
if (!DB) { console.error('✖ MONGO_DB_NAME required (refusing to guess).'); process.exit(1); }
const uri = process.env.MONGODB_URI;
if (!uri) { console.error('✖ MONGODB_URI required (node --env-file=.env.local ...).'); process.exit(1); }

const looksLikeEmail = (v) => typeof v === 'string' && v.includes('@');

const client = new MongoClient(uri);
await client.connect();
try {
  const db = client.db(DB);
  const repairs = db.collection('repairs');

  const docs = await repairs.find({ userID: STRAY }).toArray();
  console.log(`database: ${DB}`);
  console.log(`mode:     ${APPLY ? 'APPLY' : 'DRY RUN (pass --apply to write)'}`);
  console.log(`found:    ${docs.length} repairs on ${STRAY}\n`);

  if (!docs.length) { console.log('Nothing to do.'); process.exit(0); }

  const plan = docs.map((r) => {
    const set = { userID: KEEP };
    if (!r.storeId || looksLikeEmail(r.storeId)) set.storeId = KEEP;
    if (!r.storeName) set.storeName = STORE_NAME;
    return { repairID: r.repairID, _id: r._id, set, before: { storeId: r.storeId, storeName: r.storeName } };
  });

  const changedStoreId = plan.filter((p) => 'storeId' in p.set).length;
  const changedStoreName = plan.filter((p) => 'storeName' in p.set).length;
  console.log(`userID    → ${KEEP} on all ${plan.length}`);
  console.log(`storeId   → ${KEEP} on ${changedStoreId} (unset or an email address)`);
  console.log(`storeName → ${STORE_NAME} on ${changedStoreName} (unset)\n`);
  plan.slice(0, 5).forEach((p) => console.log(
    `  ${p.repairID}  storeId ${p.before.storeId ?? '(unset)'} → ${p.set.storeId ?? '(kept)'}`
    + `   storeName ${p.before.storeName ?? '(unset)'} → ${p.set.storeName ?? '(kept)'}`));
  if (plan.length > 5) console.log(`  … and ${plan.length - 5} more`);

  if (!APPLY) {
    console.log('\nDry run — nothing was written.');
    process.exit(0);
  }

  const stamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
  const backupName = `marlenMergeBackup_${stamp}`;
  await db.collection(backupName).insertMany(docs);
  console.log(`\nbacked up ${docs.length} whole documents → ${backupName}`);

  let modified = 0;
  for (const p of plan) {
    const res = await repairs.updateOne({ _id: p._id }, { $set: p.set });
    modified += res.modifiedCount;
  }
  console.log(`updated ${modified} repairs`);

  const left = await repairs.countDocuments({ userID: STRAY });
  const now = await repairs.countDocuments({ userID: KEEP });
  console.log(`\nverify: ${STRAY} now holds ${left} repairs; ${KEEP} holds ${now}`);
  console.log(left === 0 && now === 47 ? '✔ all 47 of Marlen\'s repairs are on the account he signs in with'
    : '⚠ unexpected counts — check before telling anyone it worked');
} finally {
  await client.close();
}
