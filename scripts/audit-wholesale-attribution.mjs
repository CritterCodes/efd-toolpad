/**
 * READ ONLY. Is every wholesale repair attributed to the store that sent it?
 *
 * Owner, 2026-10-04: "Whether they enter it or I enter it, it needs to be attributed to the right
 * people." Envelopes arrive from stores; the owner keys them in; most pieces carry no end customer, and
 * where they do he enters one. Either way the STORE has to be on the ticket.
 *
 * This answers: for each wholesale repair, can we name the store — and does the record say so?
 *
 * Run: MONGO_DB_NAME=efd-database node --env-file=.env.local scripts/audit-wholesale-attribution.mjs
 */
import { db as mongo } from '../src/lib/database.js';

const run = async () => {
  const db = await mongo.connect();

  const stores = await db.collection('users')
    .find({ role: 'wholesaler' }, { projection: { _id: 0, userID: 1, firstName: 1, lastName: 1, email: 1 } })
    .toArray();
  const storeByID = new Map(stores.map((s) => [s.userID, s]));
  const storeLabel = (s) => (s ? `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.email : null);

  const clients = await db.collection('clients')
    .find({}, { projection: { _id: 0, clientID: 1, userID: 1, parentWholesalerId: 1, parentWholesalerName: 1, firstName: 1, lastName: 1 } })
    .toArray();
  const parentOf = new Map();
  for (const c of clients) {
    for (const id of [c.clientID, c.userID]) if (id) parentOf.set(id, c.parentWholesalerId || null);
  }

  const repairs = await db.collection('repairs').find({ isWholesale: true })
    .project({ _id: 0, repairID: 1, userID: 1, storeId: 1, storeName: 1, businessName: 1, createdBy: 1, createdAt: 1, clientName: 1 })
    .toArray();

  const buckets = { clean: [], missingName: [], missingId: [], disagree: [], unattributable: [] };

  for (const r of repairs) {
    // Who does this repair really belong to? In order of trust.
    const viaClient = parentOf.get(r.userID) || null;          // a client of a store
    const viaUser = storeByID.has(r.userID) ? r.userID : null;  // the store itself
    const viaStoreId = storeByID.has(r.storeId) ? r.storeId : null;
    const truth = viaClient || viaUser || viaStoreId;

    if (!truth) { buckets.unattributable.push(r); continue; }
    if (r.storeId && storeByID.has(r.storeId) && r.storeId !== truth) { buckets.disagree.push({ ...r, truth }); continue; }
    if (!r.storeId || !storeByID.has(r.storeId)) { buckets.missingId.push({ ...r, truth }); continue; }
    if (!r.storeName) { buckets.missingName.push({ ...r, truth }); continue; }
    buckets.clean.push(r);
  }

  const n = repairs.length;
  const pc = (x) => `${((x / n) * 100).toFixed(1)}%`;
  console.log(`wholesale repairs: ${n}\n`);
  console.log(`  attributed correctly ....... ${String(buckets.clean.length).padStart(4)}  ${pc(buckets.clean.length)}`);
  console.log(`  storeId missing or not a store ${String(buckets.missingId.length).padStart(2)}  ${pc(buckets.missingId.length)}   (store IS derivable)`);
  console.log(`  storeName missing .......... ${String(buckets.missingName.length).padStart(4)}  ${pc(buckets.missingName.length)}   (store IS derivable)`);
  console.log(`  storeId disagrees .......... ${String(buckets.disagree.length).padStart(4)}  ${pc(buckets.disagree.length)}`);
  console.log(`  UNATTRIBUTABLE ............. ${String(buckets.unattributable.length).padStart(4)}  ${pc(buckets.unattributable.length)}   (no store derivable at all)`);

  const byStore = (rows) => {
    const m = new Map();
    for (const r of rows) m.set(r.truth, (m.get(r.truth) || 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1])
      .map(([id, c]) => `${storeLabel(storeByID.get(id)) || id}:${c}`).join('  ');
  };
  if (buckets.missingId.length) console.log(`\n  missing storeId, by store: ${byStore(buckets.missingId)}`);
  if (buckets.missingName.length) console.log(`  missing storeName, by store: ${byStore(buckets.missingName)}`);
  if (buckets.disagree.length) {
    console.log('\n  DISAGREEMENTS (storeId says one store, the client\'s parent says another):');
    buckets.disagree.slice(0, 10).forEach((r) => console.log(
      `    ${r.repairID}  storeId=${storeLabel(storeByID.get(r.storeId)) || r.storeId}  truth=${storeLabel(storeByID.get(r.truth)) || r.truth}`));
  }
  if (buckets.unattributable.length) {
    console.log('\n  UNATTRIBUTABLE — flagged wholesale with no store anywhere:');
    buckets.unattributable.slice(0, 12).forEach((r) => console.log(
      `    ${r.repairID}  userID=${r.userID}  storeId=${r.storeId || '—'}  storeName=${r.storeName || '—'}  client=${r.clientName || '—'}  ${String(r.createdAt).slice(0, 10)}`));
    if (buckets.unattributable.length > 12) console.log(`    … and ${buckets.unattributable.length - 12} more`);
  }

  const fixable = buckets.missingId.length + buckets.missingName.length + buckets.disagree.length;
  console.log(`\n  ${fixable} repairs can be corrected from data already present; ${buckets.unattributable.length} need a human.`);
  process.exit(0);
};
run().catch((e) => { console.error(e); process.exit(1); });
