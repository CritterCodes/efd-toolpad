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
      return 'ensured customOrders indexes';
    },
  },
];

runMigration({ name: 's7-custom-orders', steps }).catch((e) => {
  console.error(`✖ ${e.stack || e.message}`);
  process.exit(1);
});
