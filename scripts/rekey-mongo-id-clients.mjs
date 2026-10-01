/**
 * EFD-DEFECTS C1 — re-key customers who were filed under their Mongo `_id` instead of their `userID`.
 *
 * 75 retail repairs (41 customers) carry `userID: "<24-hex _id>"`. Every one of those ids is a real user
 * with a real `userID`, so the customer's own account, the shop's "my repairs", and the account totals
 * never found them. This rewrites every reference to those ids to the user's `userID`:
 *   repairs.userID · repairInvoices.clientID · repairInvoices.accountID (retail only — a store invoice's
 *   account is the store) · notifications.userId
 *
 * Reversible: each change is recorded in `clientRekeyBackup_20260930` ({ collection, docId, field, from, to }).
 * Owner approved 2026-09-30 ("rekey the 75 repairs").
 *
 *   MONGODB_URI=... MONGO_DB_NAME=efd-database node scripts/rekey-mongo-id-clients.mjs           # dry run
 *   MONGODB_URI=... MONGO_DB_NAME=efd-database node scripts/rekey-mongo-id-clients.mjs --apply
 */
import { MongoClient, ObjectId } from 'mongodb';

const HEX = /^[a-f0-9]{24}$/;
const BACKUP = 'clientRekeyBackup_20260930';

async function main() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGO_DB_NAME;
  if (!uri || !dbName) throw new Error('MONGODB_URI and MONGO_DB_NAME are required (name the database explicitly).');
  const apply = process.argv.includes('--apply');

  const client = new MongoClient(uri);
  await client.connect();
  try {
    const db = client.db(dbName);

    // The customers: retail repairs keyed by a hex id that resolves to a user with a userID.
    const hexes = [...new Set((await db.collection('repairs')
      .find({ isWholesale: { $ne: true }, userID: { $regex: HEX.source } }, { projection: { userID: 1 } })
      .toArray()).map((r) => r.userID))];
    const users = await db.collection('users')
      .find({ _id: { $in: hexes.map((h) => new ObjectId(h)) } }, { projection: { userID: 1 } })
      .toArray();
    const map = new Map(users.filter((u) => u.userID).map((u) => [String(u._id), String(u.userID)]));
    const unresolved = hexes.filter((h) => !map.has(h));
    console.log(`${hexes.length} customer id(s) keyed by _id; ${map.size} resolve to a userID${unresolved.length ? `; UNRESOLVED (left alone): ${unresolved.join(', ')}` : ''}`);
    const ids = [...map.keys()];

    const targets = [
      { collection: 'repairs', field: 'userID', filter: {} },
      { collection: 'repairInvoices', field: 'clientID', filter: {} },
      { collection: 'repairInvoices', field: 'accountID', filter: { accountType: 'retail' } },
      { collection: 'notifications', field: 'userId', filter: {} },
    ];

    for (const { collection, field, filter } of targets) {
      const docs = await db.collection(collection)
        .find({ ...filter, [field]: { $in: ids } }, { projection: { [field]: 1 } })
        .toArray();
      console.log(`${collection}.${field}: ${docs.length}${apply ? '' : ' (dry run)'}`);
      if (!apply || docs.length === 0) continue;
      const at = new Date();
      await db.collection(BACKUP).insertMany(docs.map((d) => ({ collection, docId: d._id, field, from: d[field], to: map.get(d[field]), at })));
      let changed = 0;
      for (const [from, to] of map) {
        const res = await db.collection(collection).updateMany({ ...filter, [field]: from }, { $set: { [field]: to } });
        changed += res.modifiedCount;
      }
      console.log(`  re-keyed ${changed}; recorded in ${BACKUP}`);
    }
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
