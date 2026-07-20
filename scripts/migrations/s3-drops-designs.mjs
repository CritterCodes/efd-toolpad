/**
 * S3 — Drops & Designs (production-grade, idempotent, dry-run capable).
 *
 * The drops/designs/pieces collections were created empty in S0. S3 introduces the
 * Design schema (CAD/BOM/routing/estCost) and the catalog layer; the only data-layer
 * change is ensuring the Design/Drop indexes. Additive, idempotent. New designs are
 * written by the app (DesignsModel) — no data to backfill.
 */
import { runMigration, collExists } from './_lib.mjs';

const steps = [
  {
    title: 'drops/designs: ensure indexes',
    run: async ({ db, dryRun }) => {
      const drops = db.collection('drops');
      const designs = db.collection('designs');

      if (dryRun) {
        // On a fresh clone the collections may not exist yet (S0 creates them on apply).
        const dropIdx = (await collExists(db, 'drops')) ? (await drops.indexes()).length : 0;
        const designIdx = (await collExists(db, 'designs')) ? (await designs.indexes()).length : 0;
        return `would ensure drop/design indexes (drops has ${dropIdx}, designs has ${designIdx})`;
      }

      // NOTE: original S3 created these on `dropID` (uppercase) — a field the models
      // never write (DropsModel/DesignsModel use `dropId`). That drift is fixed here
      // and remediated on already-migrated DBs by pp3-drops-index-fix.mjs.
      await drops.createIndex({ dropId: 1 }, { unique: true });
      await drops.createIndex({ slug: 1 }, { unique: true });
      await drops.createIndex({ status: 1 });
      await designs.createIndex({ designID: 1 }, { unique: true });
      await designs.createIndex({ dropId: 1 });
      await designs.createIndex({ status: 1 });
      return 'ensured drop/design indexes';
    },
  },
];

runMigration({ name: 's3-drops-designs', steps }).catch((e) => {
  console.error(`✖ ${e.stack || e.message}`);
  process.exit(1);
});
