import { db } from '@/lib/database';
import { ObjectId } from 'mongodb';
import { APPLICATION_STATUSES, buildApplicantMatchReport, buildDuplicateApplicantEmailReport, loadWholesaleUsers, summarizeWholesaleUser } from './shared';
export async function getActiveWholesalers() {
  const users = await loadWholesaleUsers();
  return users
    .filter((user) => user.role === 'wholesaler')
    .map(summarizeWholesaleUser)
    .sort((a, b) => a.businessName.localeCompare(b.businessName));
}

export async function getWholesaleReconciliationReport() {
  const users = await loadWholesaleUsers();
  const activeWholesalers = users.filter((user) => user.role === 'wholesaler');
  const applicants = users.filter((user) => user.role === 'wholesale-applicant' && user.wholesaleApplication);

  const legacyWholesalers = activeWholesalers
    .filter((user) => !user.wholesaleApplication)
    .map((user) => ({
      type: 'legacy_wholesaler',
      wholesaler: summarizeWholesaleUser(user),
      reason: 'missing_wholesale_application',
    }));

  const candidateReports = applicants
    .map((user) => {
      const applicant = summarizeWholesaleUser(user);
      const report = buildApplicantMatchReport(user, activeWholesalers);
      return {
        type: 'application_match',
        applicant,
        ...report,
      };
    })
    .filter((report) => ['safe_match', 'ambiguous'].includes(report.status));

  const safeMatches = candidateReports.filter((report) => report.status === 'safe_match');
  const ambiguousMatches = candidateReports.filter((report) => report.status === 'ambiguous');

  const activeWholesalerSummaries = activeWholesalers.map(summarizeWholesaleUser);
  const canonicalWholesalers = activeWholesalerSummaries.filter((user) => user.hasWholesaleApplication);
  const reconciledAccounts = canonicalWholesalers.filter((user) => user.wholesaleApplication.reconciledAt || ['merged', 'legacy_backfill'].includes(user.wholesaleApplication.source));

  return {
    stats: {
      applicantsPendingReview: applicants.filter((user) => (user.wholesaleApplication?.status || '') === APPLICATION_STATUSES.PENDING).length,
      activeWholesalers: activeWholesalers.length,
      canonicalWholesalers: canonicalWholesalers.length,
      legacyWholesalersRequiringRepair: legacyWholesalers.length,
      safeMatches: safeMatches.length,
      ambiguousMatches: ambiguousMatches.length,
      reconciledAccounts: reconciledAccounts.length,
    },
    legacyWholesalers,
    safeMatches,
    ambiguousMatches,
  };
}

export async function getWholesaleReconciliationAuditReport() {
  const users = await loadWholesaleUsers();
  const activeWholesalers = users.filter((user) => user.role === 'wholesaler');
  const applicants = users.filter((user) => user.role === 'wholesale-applicant' && user.wholesaleApplication);
  const reconciliation = await getWholesaleReconciliationReport();

  const duplicateApplicantEmails = buildDuplicateApplicantEmailReport(applicants);
  const unmatchedApplicants = applicants
    .map((user) => {
      const applicant = summarizeWholesaleUser(user);
      const matchReport = buildApplicantMatchReport(user, activeWholesalers);
      return {
        applicationId: applicant.wholesaleApplication.applicationId,
        applicant,
        ...matchReport,
      };
    })
    .filter((report) => report.status === 'no_match');

  const applicantsWithoutEmail = applicants
    .map((user) => {
      const applicant = summarizeWholesaleUser(user);
      const matchReport = buildApplicantMatchReport(user, activeWholesalers);
      return {
        applicationId: applicant.wholesaleApplication.applicationId,
        applicant,
        ...matchReport,
      };
    })
    .filter((report) => report.status === 'no_email');

  return {
    stats: {
      totalWholesalers: activeWholesalers.length,
      wholesalersWithCanonicalProfile: activeWholesalers.filter((user) => Boolean(user.wholesaleApplication)).length,
      legacyWholesalers: reconciliation.legacyWholesalers.length,
      applicants: applicants.length,
      pendingApplicants: applicants.filter((user) => user.wholesaleApplication?.status === APPLICATION_STATUSES.PENDING).length,
      approvedApplicants: applicants.filter((user) => user.wholesaleApplication?.status === APPLICATION_STATUSES.APPROVED).length,
      rejectedApplicants: applicants.filter((user) => user.wholesaleApplication?.status === APPLICATION_STATUSES.REJECTED).length,
      mergedApplicants: applicants.filter((user) => user.wholesaleApplication?.status === APPLICATION_STATUSES.MERGED).length,
      safeMatches: reconciliation.safeMatches.length,
      ambiguousMatches: reconciliation.ambiguousMatches.length,
      unmatchedApplicants: unmatchedApplicants.length,
      applicantsWithoutEmail: applicantsWithoutEmail.length,
      duplicateApplicantEmails: duplicateApplicantEmails.length,
    },
    legacyWholesalers: reconciliation.legacyWholesalers,
    safeMatches: reconciliation.safeMatches,
    ambiguousMatches: reconciliation.ambiguousMatches,
    unmatchedApplicants,
    applicantsWithoutEmail,
    duplicateApplicantEmails,
  };
}

export async function getAllWholesaleApplications(filters = {}) {
  const users = await loadWholesaleUsers();
  const activeWholesalers = users.filter((user) => user.role === 'wholesaler');

  return users
    .filter((user) => user.wholesaleApplication)
    .map((user) => {
      const summary = summarizeWholesaleUser(user);
      const reconciliation = user.role === 'wholesale-applicant'
        ? buildApplicantMatchReport(user, activeWholesalers)
        : null;

      return {
        applicationId: summary.wholesaleApplication.applicationId,
        userID: summary.id,
        accountUserID: summary.userID,
        firstName: summary.firstName,
        lastName: summary.lastName,
        email: summary.email,
        role: summary.role,
        createdAt: summary.createdAt,
        ...summary.wholesaleApplication,
        reconciliationState: reconciliation ? {
          status: reconciliation.status,
          candidateCount: reconciliation.candidates.length,
          candidates: reconciliation.candidates,
          canAutoMerge: reconciliation.canAutoMerge,
          conflictFields: reconciliation.conflictFields,
        } : null,
      };
    })
    .filter((application) => !filters.status || application.status === filters.status)
    .filter((application) => {
      if (!filters.dateFrom && !filters.dateTo) return true;
      const submittedAt = application.submittedAt ? new Date(application.submittedAt) : null;
      if (!submittedAt || Number.isNaN(submittedAt.getTime())) return false;
      if (filters.dateFrom && submittedAt < new Date(filters.dateFrom)) return false;
      if (filters.dateTo && submittedAt > new Date(filters.dateTo)) return false;
      return true;
    })
    .sort((a, b) => new Date(b.submittedAt || b.createdAt || 0) - new Date(a.submittedAt || a.createdAt || 0));
}

export async function getWholesaleApplicationById(applicationId) {
  const usersCollection = await db.dbUsers();
  const user = await usersCollection.findOne({
    'wholesaleApplication.applicationId': applicationId,
  });

  if (!user) return null;

  const activeWholesalers = (await getActiveWholesalers()).map((summary) => ({
    _id: new ObjectId(summary.id),
    userID: summary.userID,
    email: summary.email,
    firstName: summary.firstName,
    lastName: summary.lastName,
    business: summary.business,
    phoneNumber: summary.phoneNumber,
    role: summary.role,
    createdAt: summary.createdAt,
    updatedAt: summary.updatedAt,
    wholesaleApplication: summary.wholesaleApplication,
  }));
  const reconciliation = user.role === 'wholesale-applicant'
    ? buildApplicantMatchReport(user, activeWholesalers)
    : null;

  const summary = summarizeWholesaleUser(user);
  return {
    applicationId: summary.wholesaleApplication.applicationId,
    userID: summary.id,
    accountUserID: summary.userID,
    firstName: summary.firstName,
    lastName: summary.lastName,
    email: summary.email,
    role: summary.role,
    createdAt: summary.createdAt,
    ...summary.wholesaleApplication,
    reconciliationState: reconciliation ? {
      status: reconciliation.status,
      candidateCount: reconciliation.candidates.length,
      candidates: reconciliation.candidates,
      canAutoMerge: reconciliation.canAutoMerge,
      conflictFields: reconciliation.conflictFields,
    } : null,
  };
}

