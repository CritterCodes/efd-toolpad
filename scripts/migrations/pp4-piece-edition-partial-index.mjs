/**
 * PP4 — pieces {designID, editionNumber} unique index: SPARSE → PARTIAL.
 *
 * The edition-number uniqueness guard was a compound SPARSE unique index. A compound sparse index
 * only omits a doc that is missing EVERY indexed field — `designID` is always present, so every
 * unnumbered piece (scrapped/cancelled with editionNumber unset, or planned MTO with editionNumber
 * null) was indexed as {designID, null} and the 2nd such piece per design threw E11000. That broke
 * production-run scrap-reuse + cancelRun (and was a latent MTO-checkout collision).
 *
 * Fix: a PARTIAL unique index scoped to `editionNumber: { $type: 'number' }` — uniqueness is
 * enforced only among pieces that actually hold a number; unnumbered pieces are excluded. Idempotent:
 * drops the old index only if present and not already partial, then creates the partial one.
 *
 * Run: MIGRATE_DB=efd-database-DEV node --env-file=.env.local scripts/migrations/pp4-piece-edition-partial-index.mjs [--dry-run]
 */
import { runMigration, collExists } from './_lib.mjs';

const INDEX_NAME = 'designID_1_editionNumber_1';
const PARTIAL = { editionNumber: { $type: 'number' } };

const steps = [
  {
    title: `pieces: reshape ${INDEX_NAME} sparse → partial(editionNumber is number)`,
    run: async ({ db, dryRun }) => {
      if (!(await collExists(db, 'pieces'))) {
        return dryRun ? 'pieces collection absent — would create partial index on first ensureIndexes' : 'pieces absent — nothing to reshape';
      }
      const pieces = db.collection('pieces');
      const existing = (await pieces.indexes()).find((i) => i.name === INDEX_NAME);
      const alreadyPartial = existing && existing.partialFilterExpression
        && JSON.stringify(existing.partialFilterExpression) === JSON.stringify(PARTIAL);

      if (alreadyPartial) return 'already partial — no change';
      if (dryRun) {
        return existing
          ? `would DROP ${INDEX_NAME} (${existing.sparse ? 'sparse' : 'non-partial'}) and CREATE it partial`
          : `would CREATE ${INDEX_NAME} partial`;
      }
      if (existing) await pieces.dropIndex(INDEX_NAME);
      await pieces.createIndex({ designID: 1, editionNumber: 1 }, { unique: true, partialFilterExpression: PARTIAL });
      return existing ? 'dropped old index + created partial' : 'created partial index';
    },
  },
];

runMigration({ name: 'pp4-piece-edition-partial-index', steps }).catch((e) => {
  console.error(`✖ ${e.stack || e.message}`);
  process.exit(1);
});
