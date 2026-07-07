/**
 * Pipeline C-5 (0008 §5) — normalize the three drifting product shapes in the ONE
 * `products` collection onto the 0004 contract, so the unified list + polymorphic
 * editor can render every doc. This is a FIELD-NORMALIZATION BACKFILL (not a
 * collection move — all three writers already target `products`).
 *
 * Per-doc, additively (no deletes, no rewrite of a conformant value):
 *   1. productType   — inferred from the productId prefix, else default `jewelry`
 *   2. references.gemstoneId — gemstoneIds[0] when the singular is absent (D5); the
 *                      deprecated `gemstoneIds[]` array is RETAINED
 *   3. runSize       — left absent (§5.3: absent = unlimited; not fabricated)
 *   4. status        — default `draft` when absent (§5.4)
 *   5. productId     — minted string when absent / non-URL-safe (§5.5 / D6)
 *
 * Pure rules live in src/services/products/productsNormalize.js (unit-tested,
 * dependency-free). Idempotent: a conformant doc yields an empty patch and is
 * skipped, so re-running is a no-op.
 *
 * Target-guarded by _lib.mjs: DEV / efd-db-migrate only unless MIGRATE_ALLOW_PROD is
 * set. The PROD run is a deliberate owner CUTOVER step (0008 §5) — do NOT run against
 * `efd-database` here. Run DEV first:
 *   MIGRATE_DB=efd-db-migrate node --env-file=.env.local scripts/migrations/ppN-products-normalize.mjs --dry-run
 *   MIGRATE_DB=efd-db-migrate MDB_BIN="...\\bin" node --env-file=.env.local scripts/migrations/ppN-products-normalize.mjs
 */
import { runMigration, collExists } from './_lib.mjs';
// Relative import: migration scripts run under plain `node` (no `@/` alias resolver).
import { computeProductNormalizePatch } from '../../src/services/products/productsNormalize.js';

const steps = [
  {
    title: 'products: normalize drifting shapes onto the 0004 contract (additive, idempotent)',
    run: async ({ db, dryRun, log }) => {
      if (!(await collExists(db, 'products'))) return 'no products collection — skip';
      const products = db.collection('products');
      const all = await products.find({}).toArray();

      // Bucket the intended changes so the summary is auditable (dry-run reports the
      // exact per-field counts that APPLY will make).
      const tally = { productType: 0, productId: 0, 'references.gemstoneId': 0, status: 0 };
      const toApply = [];
      for (const doc of all) {
        const { set, changed } = computeProductNormalizePatch(doc);
        if (changed.length === 0) continue;
        for (const f of changed) if (tally[f] != null) tally[f] += 1;
        toApply.push({ _id: doc._id, set });
      }

      const fieldSummary = Object.entries(tally).map(([k, v]) => `${k}=${v}`).join(', ');
      log(`scanned ${all.length} product(s); ${toApply.length} need normalization`);
      log(`field changes: ${fieldSummary}`);

      if (dryRun) {
        return `would normalize ${toApply.length}/${all.length} product(s) [${fieldSummary}]`;
      }

      let n = 0;
      for (const { _id, set } of toApply) {
        // eslint-disable-next-line no-await-in-loop
        await products.updateOne({ _id }, { $set: { ...set, updatedAt: new Date() } });
        n += 1;
      }
      return `normalized ${n}/${all.length} product(s) [${fieldSummary}]`;
    },
  },
  {
    title: 'products: ensure contract indexes (productId, productType, status)',
    run: async ({ db, dryRun }) => {
      if (dryRun) return 'would ensure products indexes (productId, productType, status)';
      const products = db.collection('products');
      // Non-unique: legacy docs may still be mid-normalization on prod; a unique index
      // is a later hardening step once every doc is proven to carry a distinct productId.
      await products.createIndex({ productId: 1 }, { sparse: true });
      await products.createIndex({ productType: 1 });
      await products.createIndex({ status: 1 });
      return 'ensured products indexes';
    },
  },
];

runMigration({ name: 'ppN-products-normalize', steps }).catch((e) => {
  console.error(`✖ ${e.stack || e.message}`);
  process.exit(1);
});
