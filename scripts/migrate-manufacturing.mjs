/**
 * Manufacturing/Production cycle — Phase 1 data migration (Work Order spine).
 *
 * Idempotent: safe to re-run. Each step checks what's already applied and skips
 * it, and logs an audit doc to the `_migrations` collection.
 *
 * Transforms (see design notes):
 *   1. Create `workOrders` — one per existing repair (source-agnostic bench unit).
 *   2. Rename `repairLaborLogs`   -> `laborLogs`     (+ workOrderID/sourceType/sourceID).
 *   3. Rename `repairPayrollBatches` -> `payrollBatches`.
 *   4. Add `billing.mode: "retail"` to existing repairs that lack it.
 *   5. Create empty `drops` / `designs` / `pieces` with indexes.
 *
 * Usage (Node 20.6+):
 *   node --env-file=.env.local scripts/migrate-manufacturing.mjs
 *
 * Env:
 *   MONGODB_URI  (required)
 *   MIGRATE_DB   default 'efd-database-DEV'   (NEVER prod unless forced)
 *   MIGRATE_ALLOW_PROD = 'YES_I_AM_SURE'      required to target 'efd-database'
 */
import { MongoClient } from 'mongodb';
import { randomUUID } from 'node:crypto';

const URI = process.env.MONGODB_URI;
const DB = process.env.MIGRATE_DB || 'efd-database-DEV';
const MIGRATION_NAME = 'manufacturing-phase1-workorder-spine';

function die(msg) {
  console.error(`✖ ${msg}`);
  process.exit(1);
}
if (!URI) die('MONGODB_URI is required.');
if (DB === 'efd-database' && process.env.MIGRATE_ALLOW_PROD !== 'YES_I_AM_SURE') {
  die('Refusing to migrate production. Set MIGRATE_ALLOW_PROD=YES_I_AM_SURE to override.');
}

async function collExists(db, name) {
  return (await db.listCollections({ name }).toArray()).length > 0;
}

async function main() {
  console.log(`▶ Migration "${MIGRATION_NAME}" on "${DB}"\n`);
  const client = new MongoClient(URI);
  await client.connect();
  const db = client.db(DB);
  const steps = [];

  // ── Step 1: workOrders (one per repair) ────────────────────────────────
  const repairs = db.collection('repairs');
  const workOrders = db.collection('workOrders');
  await db.createCollection('workOrders').catch(() => {});
  await workOrders.createIndex({ workOrderID: 1 }, { unique: true });
  await workOrders.createIndex({ sourceType: 1, sourceID: 1 });
  await workOrders.createIndex({ assignedToUserID: 1, status: 1 });
  await workOrders.createIndex({ status: 1 });

  const allRepairs = await repairs.find({}, {
    projection: {
      repairID: 1, description: 1, metalType: 1, karat: 1, isRush: 1,
      promiseDate: 1, status: 1, assignedJeweler: 1, assignedTo: 1,
      claimedAt: 1, completedAt: 1, requiresLaborReview: 1, qcBy: 1,
      qcDate: 1, tasks: 1, createdAt: 1,
    },
  }).toArray();

  const now = new Date();
  let woCreated = 0, woSkipped = 0;
  const repairToWO = new Map();
  for (const r of allRepairs) {
    const existing = await workOrders.findOne(
      { sourceType: 'repair', sourceID: r.repairID },
      { projection: { workOrderID: 1 } }
    );
    if (existing) { repairToWO.set(r.repairID, existing.workOrderID); woSkipped++; continue; }
    const workOrderID = randomUUID();
    await workOrders.insertOne({
      workOrderID,
      sourceType: 'repair',
      sourceID: r.repairID,
      seq: 1,
      title: r.description ? String(r.description).slice(0, 80) : `Repair ${r.repairID}`,
      description: r.description ?? null,
      metalType: r.metalType ?? null,
      karat: r.karat ?? null,
      isRush: !!r.isRush,
      promiseDate: r.promiseDate ?? null,
      status: r.status ?? null,
      assignedJeweler: r.assignedJeweler ?? null,
      assignedToUserID: r.assignedTo ?? null,
      claimedAt: r.claimedAt ?? null,
      completedAt: r.completedAt ?? null,
      requiresLaborReview: !!r.requiresLaborReview,
      qcBy: r.qcBy ?? null,
      qcDate: r.qcDate ?? null,
      tasks: Array.isArray(r.tasks) ? r.tasks : [],
      createdAt: r.createdAt ?? now,
      updatedAt: now,
      createdBy: 'migration',
    });
    repairToWO.set(r.repairID, workOrderID);
    woCreated++;
  }
  steps.push(`workOrders: ${woCreated} created, ${woSkipped} already existed (${allRepairs.length} repairs)`);

  // ── Step 2: rename repairLaborLogs -> laborLogs, link work orders ───────
  if (await collExists(db, 'repairLaborLogs') && !(await collExists(db, 'laborLogs'))) {
    await db.collection('repairLaborLogs').rename('laborLogs');
    steps.push('renamed repairLaborLogs -> laborLogs');
  } else {
    steps.push('laborLogs rename skipped (already done or source missing)');
  }
  if (await collExists(db, 'laborLogs')) {
    const laborLogs = db.collection('laborLogs');
    await laborLogs.createIndex({ workOrderID: 1 });
    await laborLogs.createIndex({ sourceType: 1, sourceID: 1 });
    const logs = await laborLogs.find(
      { workOrderID: { $exists: false } },
      { projection: { _id: 1, repairID: 1 } }
    ).toArray();
    let linked = 0, unmatched = 0;
    for (const log of logs) {
      const woID = repairToWO.get(log.repairID);
      if (!woID) { unmatched++; continue; }
      await laborLogs.updateOne(
        { _id: log._id },
        { $set: { workOrderID: woID, sourceType: 'repair', sourceID: log.repairID } }
      );
      linked++;
    }
    steps.push(`laborLogs linked to workOrders: ${linked} (${unmatched} unmatched repairID)`);
  }

  // ── Step 3: rename repairPayrollBatches -> payrollBatches ───────────────
  if (await collExists(db, 'repairPayrollBatches') && !(await collExists(db, 'payrollBatches'))) {
    await db.collection('repairPayrollBatches').rename('payrollBatches');
    steps.push('renamed repairPayrollBatches -> payrollBatches');
  } else {
    steps.push('payrollBatches rename skipped (already done or source missing)');
  }

  // ── Step 4: billing.mode on repairs ─────────────────────────────────────
  const billingRes = await repairs.updateMany(
    { 'billing.mode': { $exists: false } },
    { $set: { billing: { mode: 'retail' } } }
  );
  steps.push(`repairs billing.mode default set: ${billingRes.modifiedCount}`);

  // ── Step 5: empty production collections ────────────────────────────────
  for (const name of ['drops', 'designs', 'pieces']) {
    if (!(await collExists(db, name))) await db.createCollection(name);
  }
  await db.collection('designs').createIndex({ designID: 1 }, { unique: true });
  await db.collection('designs').createIndex({ dropID: 1 });
  await db.collection('drops').createIndex({ dropID: 1 }, { unique: true });
  await db.collection('pieces').createIndex({ pieceID: 1 }, { unique: true });
  await db.collection('pieces').createIndex({ designID: 1 });
  await db.collection('pieces').createIndex({ status: 1 });
  steps.push('production collections ensured: drops, designs, pieces (+indexes)');

  // ── audit ───────────────────────────────────────────────────────────────
  await db.collection('_migrations').insertOne({
    name: MIGRATION_NAME, appliedAt: now, db: DB, steps,
  });

  console.log('Steps:');
  steps.forEach((s) => console.log('  • ' + s));
  console.log('\n✔ Migration complete.');
  await client.close();
}

main().catch((e) => die(e.stack || e.message));
