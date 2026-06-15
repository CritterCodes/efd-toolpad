/**
 * S0 — Work Order spine (production-grade, idempotent, dry-run capable).
 *
 * Transforms (see docs/manufacturing/data-model.md):
 *   1. workOrders: one per repair (discipline=bench_jewelry) + indexes
 *   2. laborLogs: rename from repairLaborLogs; link logs to their work order
 *   3. payrollBatches: rename from repairPayrollBatches
 *   4. repairs.billing.mode default = 'retail'
 *   5. drops / designs / pieces: ensure exist + indexes
 *
 * Idempotent: safe to re-run. Dry-run reports counts without writing.
 * See scripts/migrations/_lib.mjs for invocation + guards.
 */
import { randomUUID } from 'node:crypto';
import { runMigration, collExists } from './_lib.mjs';

const BENCH_JEWELRY = 'bench_jewelry';

const steps = [
  {
    title: 'workOrders: one per repair (+discipline, +indexes)',
    run: async ({ db, dryRun, log }) => {
      const repairs = db.collection('repairs');
      const workOrders = db.collection('workOrders');

      const existingSourceIDs = new Set(
        await workOrders.distinct('sourceID', { sourceType: 'repair' })
      );
      const allRepairs = await repairs
        .find({}, { projection: { _id: 0, repairID: 1, description: 1, metalType: 1, karat: 1, isRush: 1, promiseDate: 1, status: 1, assignedJeweler: 1, assignedTo: 1, claimedAt: 1, completedAt: 1, requiresLaborReview: 1, qcBy: 1, qcDate: 1, tasks: 1, createdAt: 1 } })
        .toArray();
      const missing = allRepairs.filter((r) => !existingSourceIDs.has(r.repairID));
      const needDiscipline = await workOrders.countDocuments({ sourceType: 'repair', discipline: { $exists: false } });

      if (dryRun) {
        return `would create ${missing.length} work orders; would set discipline on ${needDiscipline} (repairs=${allRepairs.length}, existing WOs=${existingSourceIDs.size})`;
      }

      await workOrders.createIndex({ workOrderID: 1 }, { unique: true });
      await workOrders.createIndex({ sourceType: 1, sourceID: 1 });
      await workOrders.createIndex({ assignedToUserID: 1, status: 1 });
      await workOrders.createIndex({ discipline: 1, status: 1 });
      await workOrders.createIndex({ status: 1 });

      const now = new Date();
      for (const r of missing) {
        await workOrders.insertOne({
          workOrderID: randomUUID(),
          sourceType: 'repair',
          sourceID: r.repairID,
          seq: 1,
          discipline: BENCH_JEWELRY,
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
          createdBy: 'migration:s0',
        });
      }
      const disc = await workOrders.updateMany(
        { sourceType: 'repair', discipline: { $exists: false } },
        { $set: { discipline: BENCH_JEWELRY } }
      );
      return `created ${missing.length} work orders; discipline set on ${disc.modifiedCount}`;
    },
  },

  {
    title: 'laborLogs: rename from repairLaborLogs + link to work orders',
    run: async ({ db, dryRun, log }) => {
      const hasOld = await collExists(db, 'repairLaborLogs');
      const hasNew = await collExists(db, 'laborLogs');

      if (dryRun) {
        const src = hasNew ? 'laborLogs' : (hasOld ? 'repairLaborLogs' : null);
        if (!src) return 'no labor logs collection present';
        const unlinked = await db.collection(src).countDocuments({ workOrderID: { $exists: false } });
        return `${hasOld && !hasNew ? 'would rename repairLaborLogs -> laborLogs; ' : ''}would link ${unlinked} logs to work orders`;
      }

      if (hasOld && !hasNew) await db.collection('repairLaborLogs').rename('laborLogs');
      if (!(await collExists(db, 'laborLogs'))) return 'no laborLogs collection; nothing to link';

      const laborLogs = db.collection('laborLogs');
      await laborLogs.createIndex({ workOrderID: 1 });
      await laborLogs.createIndex({ sourceType: 1, sourceID: 1 });

      // Map repairID -> workOrderID for logs that aren't linked yet.
      const repairToWO = new Map(
        (await db.collection('workOrders')
          .find({ sourceType: 'repair' }, { projection: { _id: 0, sourceID: 1, workOrderID: 1 } })
          .toArray()
        ).map((w) => [w.sourceID, w.workOrderID])
      );

      const unlinked = await laborLogs.find({ workOrderID: { $exists: false } }, { projection: { _id: 1, repairID: 1 } }).toArray();
      let linked = 0, unmatched = 0;
      for (const lg of unlinked) {
        const woID = repairToWO.get(lg.repairID);
        if (!woID) { unmatched++; continue; }
        await laborLogs.updateOne({ _id: lg._id }, { $set: { workOrderID: woID, sourceType: 'repair', sourceID: lg.repairID } });
        linked++;
      }
      return `${hasOld && !hasNew ? 'renamed; ' : ''}linked ${linked} logs (${unmatched} unmatched repairID — orphaned)`;
    },
  },

  {
    title: 'payrollBatches: rename from repairPayrollBatches',
    run: async ({ db, dryRun }) => {
      const hasOld = await collExists(db, 'repairPayrollBatches');
      const hasNew = await collExists(db, 'payrollBatches');
      if (dryRun) {
        return hasOld && !hasNew ? 'would rename repairPayrollBatches -> payrollBatches' : 'rename not needed';
      }
      if (hasOld && !hasNew) {
        await db.collection('repairPayrollBatches').rename('payrollBatches');
        return 'renamed repairPayrollBatches -> payrollBatches';
      }
      return 'rename not needed (already done or source missing)';
    },
  },

  {
    title: "repairs: default billing.mode = 'retail'",
    run: async ({ db, dryRun }) => {
      const repairs = db.collection('repairs');
      const count = await repairs.countDocuments({ 'billing.mode': { $exists: false } });
      if (dryRun) return `would set billing.mode on ${count} repairs`;
      const res = await repairs.updateMany(
        { 'billing.mode': { $exists: false } },
        { $set: { billing: { mode: 'retail' } } }
      );
      return `billing.mode set on ${res.modifiedCount} repairs`;
    },
  },

  {
    title: 'production collections: drops / designs / pieces (+indexes)',
    run: async ({ db, dryRun }) => {
      const want = ['drops', 'designs', 'pieces'];
      const present = [];
      for (const n of want) if (await collExists(db, n)) present.push(n);
      if (dryRun) {
        const toCreate = want.filter((n) => !present.includes(n));
        return toCreate.length ? `would create: ${toCreate.join(', ')}` : 'all present';
      }
      for (const n of want) if (!(await collExists(db, n))) await db.createCollection(n);
      await db.collection('drops').createIndex({ dropID: 1 }, { unique: true });
      await db.collection('designs').createIndex({ designID: 1 }, { unique: true });
      await db.collection('designs').createIndex({ dropID: 1 });
      await db.collection('pieces').createIndex({ pieceID: 1 }, { unique: true });
      await db.collection('pieces').createIndex({ designID: 1 });
      await db.collection('pieces').createIndex({ status: 1 });
      return 'ensured drops, designs, pieces (+indexes)';
    },
  },
];

runMigration({ name: 's0-workorder-spine', steps }).catch((e) => {
  console.error(`✖ ${e.stack || e.message}`);
  process.exit(1);
});
