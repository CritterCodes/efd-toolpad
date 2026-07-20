/**
 * PP3 — Drops/Designs index drift fix (idempotent, dry-run capable).
 *
 * ROOT CAUSE: s3-drops-designs.mjs created the indexes on the WRONG field name —
 * `dropID` (uppercase) — while DropsModel/DesignsModel write `dropId` (lowercase).
 * On `drops` the stray index was UNIQUE, so every drop got `dropID: null` and the
 * SECOND drop insert collided ("E11000 dup key { dropID: null }") — breaking the
 * app's own New Drop on the 2nd drop, and any seeding.
 *
 * This migration drops the stale `dropID_1` indexes on `drops` and `designs` and
 * (re)applies the correct indexes that match the models' ensureIndexes(). Data is
 * UNAFFECTED — drops already store `dropId` correctly; only the indexes drifted.
 * (s3-drops-designs.mjs has also been corrected so it can't reintroduce the drift.)
 */
import { runMigration, collExists } from './_lib.mjs';

async function dropIfExists(coll, name, log, dryRun) {
  const present = (await coll.indexes()).some((i) => i.name === name);
  if (!present) return false;
  if (!dryRun) await coll.dropIndex(name);
  log(`${dryRun ? 'would drop' : 'dropped'} stale index ${name}`);
  return true;
}

async function dupCount(coll, field) {
  const rows = await coll.aggregate([
    { $group: { _id: `$${field}`, n: { $sum: 1 } } },
    { $match: { n: { $gt: 1 } } },
    { $count: 'dups' },
  ]).toArray();
  return rows[0]?.dups || 0;
}

const steps = [
  {
    title: 'drops: drop stale dropID_1; apply dropId(unique)/slug(unique)/owner/status indexes',
    run: async ({ db, dryRun, log }) => {
      if (!(await collExists(db, 'drops'))) return 'drops collection absent — nothing to do';
      const drops = db.collection('drops');
      if (dryRun) {
        const names = (await drops.indexes()).map((i) => i.name);
        const dupDropId = await dupCount(drops, 'dropId');
        const dupSlug = await dupCount(drops, 'slug');
        const unsafe = dupDropId || dupSlug;
        return `indexes=[${names.join(', ')}]; dropID_1 present=${names.includes('dropID_1')}; `
          + `dropId dups=${dupDropId}; slug dups=${dupSlug} — unique creation ${unsafe ? 'WOULD FAIL, resolve dups first' : 'safe'}`;
      }
      await dropIfExists(drops, 'dropID_1', log, false);
      await drops.createIndex({ dropId: 1 }, { unique: true });
      await drops.createIndex({ slug: 1 }, { unique: true });
      await drops.createIndex({ ownerType: 1, ownerId: 1 });
      await drops.createIndex({ status: 1, releaseAt: 1 });
      return 'drops indexes aligned to DropsModel.ensureIndexes()';
    },
  },
  {
    title: 'designs: drop stale dropID_1; apply designID(unique)/dropId/primaryArtisanId/status/variants.sku',
    run: async ({ db, dryRun, log }) => {
      if (!(await collExists(db, 'designs'))) return 'designs collection absent — nothing to do';
      const designs = db.collection('designs');
      if (dryRun) {
        const names = (await designs.indexes()).map((i) => i.name);
        const dupDesignID = await dupCount(designs, 'designID');
        return `indexes=[${names.join(', ')}]; dropID_1 present=${names.includes('dropID_1')}; designID dups=${dupDesignID}`;
      }
      await dropIfExists(designs, 'dropID_1', log, false);
      await designs.createIndex({ designID: 1 }, { unique: true });
      await designs.createIndex({ dropId: 1 });
      await designs.createIndex({ primaryArtisanId: 1 });
      await designs.createIndex({ status: 1 });
      await designs.createIndex({ 'variants.sku': 1 }, { unique: true, sparse: true });
      return 'designs indexes aligned to DesignsModel.ensureIndexes()';
    },
  },
];

runMigration({ name: 'pp3-drops-index-fix', steps }).catch((e) => {
  console.error(`✖ ${e.stack || e.message}`);
  process.exit(1);
});
