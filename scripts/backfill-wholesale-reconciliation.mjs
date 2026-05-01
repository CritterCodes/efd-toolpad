import { db } from '../src/lib/database.js';
import {
  backfillLegacyWholesalerProfile,
  getWholesaleReconciliationAuditReport,
  mergeWholesaleApplicationIntoAccount,
} from '../src/lib/wholesaleReconciliationService.js';

const REVIEWED_BY = process.env.WHOLESALE_RECONCILIATION_ACTOR || 'script:backfill-wholesale-reconciliation';

function printSummary(label, stats) {
  console.log(`\n${label}`);
  Object.entries(stats).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });
}

async function backfillWholesaleReconciliation() {
  try {
    const before = await getWholesaleReconciliationAuditReport();
    printSummary('Before', before.stats);

    const results = {
      legacyBackfills: [],
      mergedApplications: [],
      ambiguousApplications: before.ambiguousMatches.map((item) => item.applicationId),
    };

    for (const item of before.legacyWholesalers) {
      const result = await backfillLegacyWholesalerProfile({
        targetUserId: item.wholesaler.id,
        reviewedBy: REVIEWED_BY,
      });
      results.legacyBackfills.push(result);
    }

    for (const item of before.safeMatches) {
      const candidate = item.candidates[0];
      if (!candidate) continue;

      const result = await mergeWholesaleApplicationIntoAccount({
        applicationId: item.applicationId,
        targetUserId: candidate.id,
        reviewedBy: REVIEWED_BY,
        reviewNotes: 'Automatic merge from reconciliation backfill script.',
      });
      results.mergedApplications.push(result);
    }

    console.log(`\nBackfilled legacy wholesalers: ${results.legacyBackfills.length}`);
    results.legacyBackfills.forEach((item) => {
      console.log(`  ${item.accountUserID || item.userId}: ${item.applicationId}`);
    });

    console.log(`\nMerged safe applicant matches: ${results.mergedApplications.length}`);
    results.mergedApplications.forEach((item) => {
      console.log(`  ${item.applicationId} -> ${item.targetAccountUserID || item.targetUserId}`);
    });

    console.log(`\nAmbiguous applications left for manual review: ${results.ambiguousApplications.length}`);
    results.ambiguousApplications.forEach((applicationId) => {
      console.log(`  ${applicationId}`);
    });

    const after = await getWholesaleReconciliationAuditReport();
    printSummary('After', after.stats);
  } finally {
    await db.client?.close();
  }
}

backfillWholesaleReconciliation().catch((error) => {
  console.error('Wholesale reconciliation backfill failed:', error);
  process.exit(1);
});
