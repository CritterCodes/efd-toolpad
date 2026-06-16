/**
 * S3 — Drops & Designs (production-grade, idempotent, dry-run capable).
 *
 * The drops/designs/pieces collections were created empty in S0. S3 introduces the
 * Design schema (CAD/BOM/routing/estCost) and the catalog layer; the only data-layer
 * change is ensuring the Design/Drop indexes. Additive, idempotent. New designs are
 * written by the app (DesignsModel) — no data to backfill.
 */
import { runMigration } from './_lib.mjs';

const steps = [
  {
    title: 'drops/designs: ensure indexes',
    run: async ({ db, dryRun }) => {
      const drops = db.collection('drops');
      const designs = db.collection('designs');

      if (dryRun) {
        const dropIdx = (await drops.indexes()).length;
        const designIdx = (await designs.indexes()).length;
        return `would ensure drop/design indexes (drops has ${dropIdx}, designs has ${designIdx})`;
      }

      await drops.createIndex({ dropID: 1 }, { unique: true });
      await drops.createIndex({ status: 1 });
      await designs.createIndex({ designID: 1 }, { unique: true });
      await designs.createIndex({ dropID: 1 });
      await designs.createIndex({ status: 1 });
      return 'ensured drop/design indexes';
    },
  },
];

runMigration({ name: 's3-drops-designs', steps }).catch((e) => {
  console.error(`✖ ${e.stack || e.message}`);
  process.exit(1);
});
