/**
 * Pipeline PP-C5 — normalize legacy `products` docs onto the storefront contract
 * (docs/manufacturing/product-page-data-contract.md + data-model.md, decisions 0004/D5).
 *
 * Applied per doc (pure mapping lives in
 * src/services/production/productsNormalize.js — unit-tested):
 *   1. `productType` inferred from `productId` prefix (`gem_*`→gemstone, `jwl_*`→jewelry,
 *      `concept_*`→concept; else `jewelry`). Existing values preserved.
 *   2. `references.gemstoneId` (singular, D5) backfilled from `references.gemstoneIds[0]`
 *      when the product is not itself a gemstone. Existing singular preserved.
 *   3. Default `status: 'draft'` when the doc has neither `status` nor `isPublic`
 *      (contract §1 visibility). Existing values preserved.
 *   4. `runSize` DELIBERATELY left absent (§5.3: absent ≡ unlimited; fabricating would
 *      flip historically uncapped listings into an edition).
 *
 * Idempotent + additive: no deletes, no fabricated URL handles (docs missing a string
 * `productId` are reported for owner repair — not synthesized here). Target-guarded by
 * _lib.mjs — DEV / efd-db-migrate only unless MIGRATE_ALLOW_PROD=YES_I_AM_SURE. The PROD
 * cutover is HELD for the owner.
 *
 * Runs:
 *   MIGRATE_DB=efd-database-DEV node --env-file=.env.local \
 *     scripts/migrations/pp2-products-normalize.mjs --dry-run
 *   MIGRATE_DB=efd-database MIGRATE_ALLOW_PROD=YES_I_AM_SURE MDB_BIN=... \
 *     node --env-file=.env.production scripts/migrations/pp2-products-normalize.mjs
 */
import { runMigration, collExists } from './_lib.mjs';
// Relative import: migration scripts run under plain `node` (no `@/` alias resolver).
import { normalizeProduct } from '../../src/services/production/productsNormalize.js';

const steps = [
  {
    title: 'products: normalize legacy docs onto the storefront contract (additive)',
    run: async ({ db, dryRun, log }) => {
      if (!(await collExists(db, 'products'))) return 'no products collection — skip';
      const products = db.collection('products');

      const cursor = products.find({}, {
        projection: {
          _id: 1,
          productId: 1,
          productType: 1,
          status: 1,
          isPublic: 1,
          references: 1,
        },
      });

      let scanned = 0;
      let planned = 0;
      let applied = 0;
      const skips = [];

      // eslint-disable-next-line no-restricted-syntax
      for await (const doc of cursor) {
        scanned += 1;
        const { patch, skipped } = normalizeProduct(doc);
        if (skipped.length > 0) {
          skips.push({ _id: doc._id, productId: doc.productId ?? null, reasons: skipped });
        }
        if (Object.keys(patch).length === 0) continue;
        planned += 1;
        if (dryRun) continue;
        // eslint-disable-next-line no-await-in-loop
        const res = await products.updateOne(
          { _id: doc._id },
          { $set: { ...patch, updatedAt: new Date() } }
        );
        applied += res.modifiedCount;
      }

      if (skips.length > 0) {
        log(`skipped (needs owner repair): ${skips.length} doc(s)`);
        // Cap the log so a runaway data drift doesn't flood the pipeline output.
        for (const s of skips.slice(0, 20)) {
          log(`  _id=${s._id} productId=${s.productId} :: ${s.reasons.join('; ')}`);
        }
        if (skips.length > 20) log(`  … +${skips.length - 20} more`);
      }

      return dryRun
        ? `would normalize ${planned}/${scanned} product(s); skips=${skips.length}`
        : `normalized ${applied}/${scanned} product(s); skips=${skips.length}`;
    },
  },
];

runMigration({ name: 'pp2-products-normalize', steps }).catch((e) => {
  console.error(`✖ ${e.stack || e.message}`);
  process.exit(1);
});
