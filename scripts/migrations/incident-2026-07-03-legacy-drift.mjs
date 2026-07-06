/**
 * INCIDENT 2026-07-03 — legacy-drift repair.
 *
 * Context: the manufacturing/customs cutover swapped the migrated DB into
 * `efd-database` on ~2026-07-01, but the new code did not deploy successfully
 * until 2026-07-03 19:03 UTC (every deploy in between ERRORed). During that
 * window the still-live pre-cutover code wrote pre-S0-shaped documents into
 * the migrated database:
 *
 *   A. Repair labor was logged into the OLD `repairLaborLogs` collection
 *      (sourceAction 'move_to_qc', no S0 fields) instead of `laborLogs`, so the
 *      new payroll code can't see it → 5 logs, $70 for Vernon McNabb III, week
 *      of 2026-06-29.
 *   B. Repairs created in the window never got a `workOrders` spine doc (the
 *      old code didn't maintain it) → the new unified bench can't see them.
 *
 * This migration (idempotent, dry-run capable, backup-first — see _lib.mjs):
 *   1. workOrders: create one per repair missing a WO (same shape as S0).
 *   2. laborLogs: relocate every `repairLaborLogs` doc into `laborLogs`,
 *      preserving the recorded hours/pay, adding S0 fields (workOrderID,
 *      sourceType, sourceID, pendingQc:false), and normalizing sourceAction
 *      -> 'repair_qc_pass' so a future QC re-approve can't double-credit.
 *      Provenance kept in `legacySourceAction` + `migratedBy`.
 *   3. drop the now-empty `repairLaborLogs` collection.
 *
 * Run (dry-run against prod, read-only intent):
 *   MIGRATE_DB=efd-database MIGRATE_ALLOW_PROD=YES_I_AM_SURE \
 *     node --env-file=<abs>/.env.production scripts/migrations/incident-2026-07-03-legacy-drift.mjs --dry-run
 *
 * Apply (backup runs first; needs MDB_BIN):
 *   MIGRATE_DB=efd-database MIGRATE_ALLOW_PROD=YES_I_AM_SURE \
 *     MDB_BIN="C:\\Program Files\\MongoDB\\Tools\\100\\bin" \
 *     node --env-file=<abs>/.env.production scripts/migrations/incident-2026-07-03-legacy-drift.mjs
 */
import { randomUUID } from 'node:crypto';
import { runMigration, collExists } from './_lib.mjs';

const BENCH_JEWELRY = 'bench_jewelry';
const QC_PASS_ACTION = 'repair_qc_pass';
const MIGRATED_BY = 'migration:incident-2026-07-03-legacy-drift';

const steps = [
  {
    // Mirrors S0 step 1: any repair without a work order gets one. Post-cutover
    // the only repairs missing a WO are those created during the failed-deploy
    // window, so this targets exactly them (and self-heals any other gap).
    title: 'workOrders: create one per repair missing a WO',
    run: async ({ db, dryRun }) => {
      const repairs = db.collection('repairs');
      const workOrders = db.collection('workOrders');

      const existingSourceIDs = new Set(
        await workOrders.distinct('sourceID', { sourceType: 'repair' })
      );
      const allRepairs = await repairs
        .find({}, { projection: { _id: 0, repairID: 1, description: 1, metalType: 1, karat: 1, isRush: 1, promiseDate: 1, status: 1, assignedJeweler: 1, assignedTo: 1, claimedAt: 1, completedAt: 1, requiresLaborReview: 1, qcBy: 1, qcDate: 1, tasks: 1, createdAt: 1 } })
        .toArray();
      const missing = allRepairs.filter((r) => !existingSourceIDs.has(r.repairID));

      if (dryRun) {
        return `would create ${missing.length} work orders (${missing.map((r) => r.repairID).join(', ') || 'none'})`;
      }

      await workOrders.createIndex({ workOrderID: 1 }, { unique: true });
      await workOrders.createIndex({ sourceType: 1, sourceID: 1 });

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
          createdBy: MIGRATED_BY,
        });
      }
      return `created ${missing.length} work orders`;
    },
  },

  {
    title: 'laborLogs: relocate legacy repairLaborLogs (preserve pay, add S0 fields)',
    run: async ({ db, dryRun, log }) => {
      if (!(await collExists(db, 'repairLaborLogs'))) {
        return 'no repairLaborLogs collection; nothing to relocate';
      }
      const legacy = db.collection('repairLaborLogs');
      const laborLogs = db.collection('laborLogs');
      const legacyDocs = await legacy.find({}).toArray();

      // Resolve repairID -> workOrderID (WOs guaranteed present after step 1).
      const repairToWO = new Map(
        (await db.collection('workOrders')
          .find({ sourceType: 'repair' }, { projection: { _id: 0, sourceID: 1, workOrderID: 1 } })
          .toArray()
        ).map((w) => [w.sourceID, w.workOrderID])
      );

      const plan = [];
      for (const d of legacyDocs) {
        const already = await laborLogs.findOne({ logID: d.logID }, { projection: { _id: 1 } });
        plan.push({
          logID: d.logID,
          repairID: d.repairID,
          jeweler: d.primaryJewelerName,
          value: d.creditedValue,
          hours: d.creditedLaborHours,
          workOrderID: repairToWO.get(d.repairID) || null,
          skip: !!already,
        });
      }

      if (dryRun) {
        const toMove = plan.filter((p) => !p.skip);
        const noWO = toMove.filter((p) => !p.workOrderID);
        log(`legacy docs: ${legacyDocs.length}; already in laborLogs: ${plan.length - toMove.length}`);
        for (const p of toMove) log(`  → ${p.repairID}  ${p.jeweler}  ${p.hours}h/$${p.value}  WO=${p.workOrderID ? 'yes' : 'MISSING'}`);
        return `would relocate ${toMove.length} logs${noWO.length ? `; ${noWO.length} MISSING workOrderID (would block)` : ''}`;
      }

      let moved = 0, skipped = 0;
      for (const d of legacyDocs) {
        if (await laborLogs.findOne({ logID: d.logID }, { projection: { _id: 1 } })) { skipped++; continue; }
        const workOrderID = repairToWO.get(d.repairID);
        if (!workOrderID) throw new Error(`No workOrder for ${d.repairID}; run step 1 first.`);
        const { _id, sourceAction, ...rest } = d; // drop old _id; re-key sourceAction
        await laborLogs.insertOne({
          ...rest,
          sourceType: 'repair',
          sourceID: d.repairID,
          workOrderID,
          pendingQc: false,
          sourceAction: QC_PASS_ACTION,
          legacySourceAction: sourceAction ?? null,
          migratedBy: MIGRATED_BY,
          migratedAt: new Date(),
        });
        await legacy.deleteOne({ _id: d._id });
        moved++;
      }
      return `relocated ${moved} logs (${skipped} already present)`;
    },
  },

  {
    title: 'drop empty repairLaborLogs collection',
    run: async ({ db, dryRun }) => {
      if (!(await collExists(db, 'repairLaborLogs'))) return 'already gone';
      const remaining = await db.collection('repairLaborLogs').countDocuments();
      if (remaining > 0) {
        if (dryRun) return `would NOT drop — ${remaining} docs still present`;
        throw new Error(`Refusing to drop repairLaborLogs — ${remaining} docs remain (relocation incomplete).`);
      }
      if (dryRun) return 'would drop empty repairLaborLogs';
      await db.collection('repairLaborLogs').drop();
      return 'dropped empty repairLaborLogs';
    },
  },
];

runMigration({ name: 'incident-2026-07-03-legacy-drift', steps }).catch((e) => {
  console.error(`✖ ${e.stack || e.message}`);
  process.exit(1);
});
