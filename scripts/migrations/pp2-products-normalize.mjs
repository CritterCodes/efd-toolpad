/**
 * 0008 C-5 — products field-normalization backfill. Reconciles the three drifting product shapes
 * (typed jewelry / typed gemstone / pipeline) onto the 0004 contract shape so the unified catalog
 * (C-1) segments + reads every doc consistently. Scope (per thread #213): `productType` present,
 * `references.gemstoneIds[0] → references.gemstoneId` (singular, 0004/D5), string `productId`, and a
 * `runSize`. Status-vocab drift is intentionally OUT of scope here (that's the C-6 write-path pass).
 *
 * Idempotent + additive (no deletes): each step filters to only the docs still needing the change, so
 * a re-run is a no-op; the legacy `references.gemstoneIds` array is LEFT in place (additive) — dropping
 * it is a later cleanup. Target-guarded by _lib.mjs.
 *   DEV-first:  MIGRATE_DB=efd-db-migrate MDB_BIN="…\bin" node --env-file=.env.local scripts/migrations/pp2-products-normalize.mjs --dry-run
 *   then apply: (drop --dry-run)
 * The PROD run stays OWNER-GATED (like the pp1 cutover): needs MIGRATE_DB=efd-database + MIGRATE_ALLOW_PROD=YES_I_AM_SURE.
 */
import { runMigration, collExists } from './_lib.mjs';

const steps = [
  {
    title: "products: ensure `productType` (default 'jewelry' per contract §8)",
    run: async ({ db, dryRun }) => {
      if (!(await collExists(db, 'products'))) return 'no products collection — skip';
      const products = db.collection('products');
      const q = { $or: [{ productType: { $exists: false } }, { productType: null }, { productType: '' }] };
      const n = await products.countDocuments(q);
      if (dryRun) return `would default productType='jewelry' on ${n} product(s)`;
      const r = await products.updateMany(q, { $set: { productType: 'jewelry', updatedAt: new Date() } });
      return `defaulted productType on ${r.modifiedCount} product(s)`;
    },
  },
  {
    title: 'products: references.gemstoneIds[0] → references.gemstoneId (singular, 0004/D5)',
    run: async ({ db, dryRun }) => {
      const products = db.collection('products');
      // docs with the legacy array but no singular yet
      const q = { 'references.gemstoneIds.0': { $exists: true }, 'references.gemstoneId': { $exists: false } };
      const docs = await products.find(q, { projection: { 'references.gemstoneIds': 1 } }).toArray();
      if (dryRun) return `would set references.gemstoneId from gemstoneIds[0] on ${docs.length} product(s)`;
      let n = 0;
      for (const d of docs) {
        const first = d.references?.gemstoneIds?.[0];
        if (first == null) continue;
        // eslint-disable-next-line no-await-in-loop
        await products.updateOne({ _id: d._id }, { $set: { 'references.gemstoneId': first, updatedAt: new Date() } });
        n += 1;
      }
      return `set references.gemstoneId on ${n} product(s)`;
    },
  },
  {
    title: 'products: ensure a string `productId` (fallback to _id string)',
    run: async ({ db, dryRun }) => {
      const products = db.collection('products');
      const q = { $or: [{ productId: { $exists: false } }, { productId: null }, { productId: '' }] };
      const docs = await products.find(q, { projection: { _id: 1 } }).toArray();
      if (dryRun) return `would set productId = String(_id) on ${docs.length} product(s)`;
      let n = 0;
      for (const d of docs) {
        // eslint-disable-next-line no-await-in-loop
        await products.updateOne({ _id: d._id }, { $set: { productId: String(d._id), updatedAt: new Date() } });
        n += 1;
      }
      return `set productId on ${n} product(s)`;
    },
  },
  {
    title: "products: ensure `runSize` (default { type: 'unlimited' })",
    run: async ({ db, dryRun }) => {
      const products = db.collection('products');
      const q = { $or: [{ runSize: { $exists: false } }, { runSize: null }] };
      const n = await products.countDocuments(q);
      if (dryRun) return `would default runSize={type:'unlimited'} on ${n} product(s)`;
      const r = await products.updateMany(q, { $set: { runSize: { type: 'unlimited' }, updatedAt: new Date() } });
      return `defaulted runSize on ${r.modifiedCount} product(s)`;
    },
  },
];

runMigration({ name: 'pp2-products-normalize', steps }).catch((e) => {
  console.error(`✖ ${e.stack || e.message}`);
  process.exit(1);
});
