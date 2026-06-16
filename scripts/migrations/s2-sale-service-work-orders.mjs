/**
 * S2 — Sale-service work orders (production-grade, idempotent, dry-run capable).
 *
 * Sale-service work (e.g. a resize attached to a sale) is delivered as a repair
 * linked to a sales-invoice line (existing `linkRepairToSalesInvoice` flow),
 * comped via S1, and surfaced on the bench + payroll via the S0 work-order spine.
 *
 * This migration backfills the *tracking* link for repairs that were attached to a
 * sale before S2: it reads each sales invoice's linked repairs and stamps
 *   repairs.salesInvoiceID / salesLineID   and   workOrders.saleContext
 * so sale-service work is directly queryable. Additive + idempotent.
 */
import { runMigration } from './_lib.mjs';

const steps = [
  {
    title: 'sale-service: backfill repair sale refs + workOrder.saleContext from sales invoices',
    run: async ({ db, dryRun }) => {
      const invoices = await db.collection('salesInvoices')
        .find({}, { projection: { _id: 0, invoiceID: 1, lineItems: 1, linkedRepairIDs: 1 } })
        .toArray();

      // repairID -> { salesInvoiceID, salesLineID } (first/most-specific wins)
      const map = new Map();
      for (const inv of invoices) {
        for (const line of inv.lineItems || []) {
          for (const rid of line.linkedRepairIDs || []) {
            if (rid && !map.has(rid)) map.set(rid, { salesInvoiceID: inv.invoiceID, salesLineID: line.lineID || null });
          }
        }
        for (const rid of inv.linkedRepairIDs || []) {
          if (rid && !map.has(rid)) map.set(rid, { salesInvoiceID: inv.invoiceID, salesLineID: null });
        }
      }

      if (map.size === 0) return `no sale-linked repairs found (${invoices.length} invoices scanned)`;

      const repairs = db.collection('repairs');
      const workOrders = db.collection('workOrders');
      const repairOps = [];
      const woOps = [];

      for (const [rid, ref] of map) {
        const repair = await repairs.findOne({ repairID: rid }, { projection: { _id: 1, salesInvoiceID: 1, salesLineID: 1 } });
        if (repair) {
          if (repair.salesInvoiceID !== ref.salesInvoiceID || (repair.salesLineID ?? null) !== (ref.salesLineID ?? null)) {
            repairOps.push({ updateOne: { filter: { _id: repair._id }, update: { $set: { salesInvoiceID: ref.salesInvoiceID, salesLineID: ref.salesLineID } } } });
          }
        }
        const wo = await workOrders.findOne({ sourceType: 'repair', sourceID: rid }, { projection: { _id: 1, saleContext: 1 } });
        if (wo) {
          const desired = { salesInvoiceID: ref.salesInvoiceID, salesLineID: ref.salesLineID ?? null };
          const cur = wo.saleContext || null;
          if (!cur || cur.salesInvoiceID !== desired.salesInvoiceID || (cur.salesLineID ?? null) !== desired.salesLineID) {
            woOps.push({ updateOne: { filter: { _id: wo._id }, update: { $set: { saleContext: desired } } } });
          }
        }
      }

      if (dryRun) {
        return `would tag ${repairOps.length} repairs + ${woOps.length} work orders (${map.size} sale-linked repairs across ${invoices.length} invoices)`;
      }
      if (repairOps.length) await repairs.bulkWrite(repairOps);
      if (woOps.length) await workOrders.bulkWrite(woOps);
      await workOrders.createIndex({ 'saleContext.salesInvoiceID': 1 });
      return `tagged ${repairOps.length} repairs + ${woOps.length} work orders (${map.size} sale-linked)`;
    },
  },
];

runMigration({ name: 's2-sale-service-work-orders', steps }).catch((e) => {
  console.error(`✖ ${e.stack || e.message}`);
  process.exit(1);
});
