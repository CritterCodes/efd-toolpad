/**
 * S7a — Custom orders (production-grade, idempotent, dry-run capable).
 *
 * Creates the NEW `customOrders` collection (legacy `customTickets` stays frozen and
 * untouched — drains its lifecycle). Additive: indexes only; new custom orders are
 * written by the app (CustomOrdersModel). No legacy data migrated.
 */
import { runMigration } from './_lib.mjs';

const steps = [
  {
    title: 'customOrders: ensure collection + indexes (legacy customTickets untouched)',
    run: async ({ db, dryRun }) => {
      const exists = (await db.listCollections({ name: 'customOrders' }).toArray()).length > 0;
      const customOrders = db.collection('customOrders');
      if (dryRun) {
        const idx = exists ? (await customOrders.indexes()).length : 0;
        return `would ensure customOrders indexes (collection ${exists ? `exists, ${idx} indexes` : 'will be created'})`;
      }
      await customOrders.createIndex({ customID: 1 }, { unique: true });
      await customOrders.createIndex({ clientID: 1 });
      await customOrders.createIndex({ status: 1 });
      await customOrders.createIndex({ createdAt: -1 });
      await customOrders.createIndex({ 'share.token': 1 }, { sparse: true }); // storefront /d/<token> lookup
      return 'ensured customOrders indexes';
    },
  },
  {
    title: 'customInvoices: ensure indexes (single-source custom billing)',
    run: async ({ db, dryRun }) => {
      const exists = (await db.listCollections({ name: 'customInvoices' }).toArray()).length > 0;
      const customInvoices = db.collection('customInvoices');
      if (dryRun) {
        return `would ensure customInvoices indexes (collection ${exists ? 'exists' : 'will be created'})`;
      }
      await customInvoices.createIndex({ invoiceID: 1 }, { unique: true });
      await customInvoices.createIndex({ customID: 1 });
      await customInvoices.createIndex({ status: 1 });
      return 'ensured customInvoices indexes';
    },
  },
];

runMigration({ name: 's7-custom-orders', steps }).catch((e) => {
  console.error(`✖ ${e.stack || e.message}`);
  process.exit(1);
});
