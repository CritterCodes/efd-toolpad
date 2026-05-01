import { db } from '../src/lib/database.js';
import { getWholesaleReconciliationAuditReport } from '../src/lib/wholesaleReconciliationService.js';

function printSection(title) {
  console.log(`\n${title}`);
}

async function auditWholesaleReconciliation() {
  try {
    const report = await getWholesaleReconciliationAuditReport();

    console.log(`Audited wholesale accounts in ${process.env.MONGO_DB_NAME || 'efd-database'}`);

    printSection('Summary');
    Object.entries(report.stats).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });

    printSection(`Legacy wholesalers missing canonical profile: ${report.legacyWholesalers.length}`);
    report.legacyWholesalers.forEach((item) => {
      console.log(`  ${item.wholesaler.userID || item.wholesaler.id}: ${item.wholesaler.businessName || item.wholesaler.email}`);
    });

    printSection(`Safe applicant matches: ${report.safeMatches.length}`);
    report.safeMatches.forEach((item) => {
      const candidate = item.candidates[0];
      const conflicts = candidate?.conflictFields?.length ? ` conflicts=${candidate.conflictFields.join(',')}` : '';
      console.log(
        `  ${item.applicationId}: ${item.applicant.email} -> ${candidate?.userID || candidate?.id || 'unknown'}`
        + `${conflicts}`
      );
    });

    printSection(`Ambiguous applicant matches: ${report.ambiguousMatches.length}`);
    report.ambiguousMatches.forEach((item) => {
      console.log(`  ${item.applicationId}: ${item.applicant.email} candidates=${item.candidates.map((candidate) => candidate.userID || candidate.id).join(', ')}`);
    });

    printSection(`Duplicate applicant emails: ${report.duplicateApplicantEmails.length}`);
    report.duplicateApplicantEmails.forEach((item) => {
      console.log(`  ${item.email}: ${item.matches.map((match) => match.applicationId).join(', ')}`);
    });

    printSection(`Unmatched applicants: ${report.unmatchedApplicants.length}`);
    report.unmatchedApplicants.forEach((item) => {
      console.log(`  ${item.applicationId}: ${item.applicant.email || '(missing email)'}`);
    });

    printSection(`Applicants without email: ${report.applicantsWithoutEmail.length}`);
    report.applicantsWithoutEmail.forEach((item) => {
      console.log(`  ${item.applicationId}: ${item.applicant.businessName || item.applicant.userID || item.applicant.id}`);
    });
  } finally {
    await db.client?.close();
  }
}

auditWholesaleReconciliation().catch((error) => {
  console.error('Wholesale reconciliation audit failed:', error);
  process.exit(1);
});
