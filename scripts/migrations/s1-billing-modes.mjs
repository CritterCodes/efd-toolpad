/**
 * S1 — Billing modes (production-grade, idempotent, dry-run capable).
 *
 * Backfills canonical `billing.mode` on repairs from the legacy comp/wholesale
 * flags, using the SAME resolver the runtime uses (imported, not duplicated):
 *   compRepair / includedWithSale -> comped  (+ compReason)
 *   isWholesale                   -> wholesale
 *   else                          -> retail
 *
 * S0 set every repair to billing.mode='retail'; this corrects the comped /
 * wholesale ones. Non-destructive: explicit internal/comped/wholesale modes are
 * preserved by the resolver. Idempotent. See scripts/migrations/_lib.mjs.
 */
import { runMigration } from './_lib.mjs';
import { resolveBillingMode, compReasonFor, BILLING_MODE } from '../../src/services/billing/modes.js';

const steps = [
  {
    title: 'repairs: canonical billing.mode from comp/wholesale flags',
    run: async ({ db, dryRun }) => {
      const repairs = db.collection('repairs');
      const all = await repairs
        .find({}, { projection: { _id: 1, billing: 1, compRepair: 1, includedWithSale: 1, isWholesale: 1 } })
        .toArray();

      const byMode = {};
      const ops = [];
      for (const r of all) {
        const desired = resolveBillingMode(r);
        byMode[desired] = (byMode[desired] || 0) + 1;
        const currentMode = r?.billing?.mode;
        const desiredReason = desired === BILLING_MODE.COMPED ? compReasonFor(r) : null;
        const currentReason = r?.billing?.compReason ?? null;

        const needsUpdate = currentMode !== desired
          || (desired === BILLING_MODE.COMPED && currentReason !== desiredReason);
        if (!needsUpdate) continue;

        const set = { 'billing.mode': desired };
        if (desired === BILLING_MODE.COMPED) set['billing.compReason'] = desiredReason;
        ops.push({ updateOne: { filter: { _id: r._id }, update: { $set: set } } });
      }

      if (dryRun) {
        return `would update ${ops.length} of ${all.length} repairs; target modes: ${JSON.stringify(byMode)}`;
      }
      if (ops.length) await repairs.bulkWrite(ops);
      return `updated ${ops.length} of ${all.length} repairs; modes now: ${JSON.stringify(byMode)}`;
    },
  },
];

runMigration({ name: 's1-billing-modes', steps }).catch((e) => {
  console.error(`✖ ${e.stack || e.message}`);
  process.exit(1);
});
