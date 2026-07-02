/**
 * Pipeline M1-T5 — unify `drops` + `collections` onto ONE `collections` collection
 * (Collection≡Drop; see docs/manufacturing/data-model.md + goal M1 build specs).
 *
 * Idempotent + additive (no deletes): legacy `collections` docs are normalized in
 * place onto the unified shape; each `drops` doc spawns a `collections` doc and the
 * drop is RETAINED, marked `migratedToCollectionId` (a deliberate drop of the old
 * `drops` collection is a later, separate step). Pure mapping lives in
 * src/services/production/collectionsUnify.js (unit-tested).
 *
 * Target-guarded by _lib.mjs: DEV / efd-db-migrate only unless MIGRATE_ALLOW_PROD is
 * set. The PROD collections-unify cutover is HELD for the owner — do NOT run against
 * `efd-database` here. Run DEV first: `node scripts/migrations/pp1-collections-unify.mjs --dry-run`.
 */
import { randomUUID } from 'crypto';
import { runMigration, collExists } from './_lib.mjs';
// Relative import: migration scripts run under plain `node` (no `@/` alias resolver).
import { unifiedFieldsFromLegacy, unifiedDocFromDrop } from '../../src/services/production/collectionsUnify.js';

async function uniqueSlug(collections, base) {
  const root = base || `drop-${randomUUID().slice(0, 6)}`;
  for (const slug of [root, `${root}-drop`]) {
    // eslint-disable-next-line no-await-in-loop
    if (!(await collections.findOne({ slug }))) return slug;
  }
  return `${root}-${randomUUID().slice(0, 6)}`;
}

const steps = [
  {
    title: 'collections: normalize legacy docs onto the unified shape (additive)',
    run: async ({ db, dryRun }) => {
      if (!(await collExists(db, 'collections'))) return 'no collections collection — skip';
      const collections = db.collection('collections');
      const legacy = await collections.find({ ownerType: { $exists: false } }).toArray();
      if (dryRun) return `would normalize ${legacy.length} legacy collection doc(s)`;
      let n = 0;
      for (const doc of legacy) {
        const set = { ...unifiedFieldsFromLegacy(doc), updatedAt: new Date() };
        if (!doc.collectionId) set.collectionId = randomUUID();
        // eslint-disable-next-line no-await-in-loop
        await collections.updateOne({ _id: doc._id }, { $set: set });
        n += 1;
      }
      return `normalized ${n} legacy collection doc(s)`;
    },
  },
  {
    title: 'drops → collections (Collection≡Drop); drops retained + marked migrated',
    run: async ({ db, dryRun }) => {
      if (!(await collExists(db, 'drops'))) return 'no drops collection — skip';
      const drops = db.collection('drops');
      const collections = db.collection('collections');
      const designs = (await collExists(db, 'designs')) ? db.collection('designs') : null;

      const pending = await drops.find({ migratedToCollectionId: { $exists: false } }).toArray();
      if (dryRun) return `would migrate ${pending.length} drop(s) → collections`;

      let n = 0;
      for (const drop of pending) {
        // idempotency: reuse an already-created collection for this drop
        // eslint-disable-next-line no-await-in-loop
        const existing = await collections.findOne({ sourceDropID: drop.dropID });
        if (existing) {
          // eslint-disable-next-line no-await-in-loop
          await drops.updateOne({ _id: drop._id }, { $set: { migratedToCollectionId: existing.collectionId, updatedAt: new Date() } });
          continue;
        }
        // members = products of designs linked to this drop that have been listed
        let memberProductIds = [];
        if (designs) {
          // eslint-disable-next-line no-await-in-loop
          const linked = await designs
            .find({ dropID: drop.dropID, productID: { $exists: true, $ne: null } }, { projection: { productID: 1 } })
            .toArray();
          memberProductIds = linked.map((d) => d.productID);
        }
        const collectionId = randomUUID();
        // eslint-disable-next-line no-await-in-loop
        const slug = await uniqueSlug(collections, drop.slug);
        const now = new Date();
        const doc = { ...unifiedDocFromDrop(drop, memberProductIds), collectionId, slug, createdAt: now, updatedAt: now };
        // eslint-disable-next-line no-await-in-loop
        await collections.insertOne(doc);
        // eslint-disable-next-line no-await-in-loop
        await drops.updateOne({ _id: drop._id }, { $set: { migratedToCollectionId: collectionId, updatedAt: now } });
        n += 1;
      }
      return `migrated ${n} drop(s) → collections (drops retained)`;
    },
  },
  {
    title: 'collections: ensure unified indexes',
    run: async ({ db, dryRun }) => {
      if (dryRun) return 'would ensure collections indexes (collectionId unique, slug, status, ownerType, sourceDropID)';
      const collections = db.collection('collections');
      await collections.createIndex({ collectionId: 1 }, { unique: true, sparse: true });
      await collections.createIndex({ slug: 1 });
      await collections.createIndex({ status: 1 });
      await collections.createIndex({ ownerType: 1 });
      await collections.createIndex({ sourceDropID: 1 }, { sparse: true });
      return 'ensured collections indexes';
    },
  },
];

runMigration({ name: 'pp1-collections-unify', steps }).catch((e) => {
  console.error(`✖ ${e.stack || e.message}`);
  process.exit(1);
});
