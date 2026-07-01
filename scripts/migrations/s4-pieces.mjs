/**
 * S4 — Pieces (production-grade, idempotent, dry-run capable).
 *
 * The `pieces` collection was created empty in S0. S4 introduces the Piece schema
 * (per-instance COGS, routed work orders, lifecycle status). Data-layer change is
 * ensuring the Piece indexes; pieces are created by the app (PiecesModel /
 * createPieceFromDesign) — no data to backfill. Additive, idempotent.
 */
import { runMigration, collExists } from './_lib.mjs';

const steps = [
  {
    title: 'pieces: ensure indexes',
    run: async ({ db, dryRun }) => {
      const pieces = db.collection('pieces');
      if (dryRun) {
        // On a fresh clone `pieces` may not exist yet (S0 creates it on apply).
        const idx = (await collExists(db, 'pieces')) ? (await pieces.indexes()).length : 0;
        return `would ensure piece indexes (pieces has ${idx})`;
      }
      await pieces.createIndex({ pieceID: 1 }, { unique: true });
      await pieces.createIndex({ designID: 1 });
      await pieces.createIndex({ status: 1 });
      await pieces.createIndex({ productID: 1 });
      return 'ensured piece indexes';
    },
  },
];

runMigration({ name: 's4-pieces', steps }).catch((e) => {
  console.error(`✖ ${e.stack || e.message}`);
  process.exit(1);
});
