import { randomUUID } from 'crypto';
import { ObjectId } from 'mongodb';
import { db } from './database.js';

const WHOLESALE_PROFILE_FIELDS = [
  'businessName',
  'businessAddress',
  'businessCity',
  'businessState',
  'businessZip',
  'businessCountry',
  'contactFirstName',
  'contactLastName',
  'contactTitle',
  'contactEmail',
  'contactPhone',
];

const WHOLESALE_ROLES = ['wholesaler', 'wholesale-applicant'];
export const APPLICATION_STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  MERGED: 'merged',
};

function cleanObject(object = {}) {
  return Object.fromEntries(
    Object.entries(object).filter(([, value]) => value !== undefined)
  );
}

function sanitizeText(value, fallback = '') {
  return String(value ?? fallback).trim();
}

export function normalizeEmail(email) {
  const value = sanitizeText(email).toLowerCase();
  return value || '';
}

function uniqueStrings(values = []) {
  return [...new Set(values.filter(Boolean).map((value) => String(value)))];
}

function stringifyObjectId(value) {
  if (!value) return '';
  return typeof value === 'string' ? value : value.toString();
}

function generateApplicationId() {
  return `wholesale-${randomUUID().slice(0, 8)}`;
}

export function getWholesaleFallbackProfile(user = {}) {
  return {
    businessName: sanitizeText(user.business),
    businessAddress: '',
    businessCity: '',
    businessState: '',
    businessZip: '',
    businessCountry: 'United States',
    contactFirstName: sanitizeText(user.firstName),
    contactLastName: sanitizeText(user.lastName),
    contactTitle: '',
    contactEmail: sanitizeText(user.email),
    contactPhone: sanitizeText(user.phoneNumber),
  };
}

export function buildCanonicalWholesaleApplication(user = {}, overrides = {}) {
  const existing = user.wholesaleApplication && typeof user.wholesaleApplication === 'object'
    ? user.wholesaleApplication
    : {};
  const fallback = getWholesaleFallbackProfile(user);
  const now = new Date();
  const merged = {
    ...existing,
    ...overrides,
  };

  const canonical = {};
  for (const field of WHOLESALE_PROFILE_FIELDS) {
    canonical[field] = sanitizeText(
      merged[field],
      existing[field] ?? fallback[field] ?? ''
    );
  }

  const status = sanitizeText(merged.status || existing.status)
    || (user.role === 'wholesaler' ? APPLICATION_STATUSES.APPROVED : APPLICATION_STATUSES.PENDING);

  return {
    ...existing,
    ...merged,
    ...canonical,
    applicationId: sanitizeText(merged.applicationId || existing.applicationId) || generateApplicationId(),
    status,
    submittedAt: merged.submittedAt || existing.submittedAt || user.createdAt || now,
    approvedAt: merged.approvedAt || existing.approvedAt || (status === APPLICATION_STATUSES.APPROVED ? now : null),
    reviewedAt: merged.reviewedAt || existing.reviewedAt || null,
    reviewedBy: sanitizeText(merged.reviewedBy || existing.reviewedBy),
    reviewNotes: sanitizeText(merged.reviewNotes || existing.reviewNotes),
    updatedAt: merged.updatedAt || now,
    source: sanitizeText(merged.source || existing.source) || (existing.applicationId ? 'applicant' : 'legacy_backfill'),
    migratedFromLegacy: Boolean(merged.migratedFromLegacy ?? existing.migratedFromLegacy ?? !existing.applicationId),
    reconciledAt: merged.reconciledAt || existing.reconciledAt || null,
    reconciledBy: sanitizeText(merged.reconciledBy || existing.reconciledBy),
    mergedApplicationIds: uniqueStrings([
      ...(Array.isArray(existing.mergedApplicationIds) ? existing.mergedApplicationIds : []),
      ...(Array.isArray(merged.mergedApplicationIds) ? merged.mergedApplicationIds : []),
    ]),
    reconciliation: {
      ...(existing.reconciliation && typeof existing.reconciliation === 'object' ? existing.reconciliation : {}),
      ...(merged.reconciliation && typeof merged.reconciliation === 'object' ? merged.reconciliation : {}),
      dismissedUserIDs: uniqueStrings([
        ...((existing.reconciliation?.dismissedUserIDs) || []),
        ...((merged.reconciliation?.dismissedUserIDs) || []),
      ]),
    },
  };
}

function getUserLookupValue(user = {}) {
  return user.userID || stringifyObjectId(user._id);
}

export function summarizeWholesaleUser(user = {}) {
  const canonical = buildCanonicalWholesaleApplication(user);
  const hasWholesaleApplication = Boolean(user.wholesaleApplication);

  return {
    id: stringifyObjectId(user._id),
    userID: sanitizeText(user.userID),
    email: sanitizeText(user.email),
    normalizedEmail: normalizeEmail(user.email),
    firstName: sanitizeText(user.firstName),
    lastName: sanitizeText(user.lastName),
    business: sanitizeText(user.business),
    phoneNumber: sanitizeText(user.phoneNumber),
    role: sanitizeText(user.role),
    createdAt: user.createdAt || null,
    updatedAt: user.updatedAt || null,
    wholesaleApplication: canonical,
    hasWholesaleApplication,
    businessName: canonical.businessName || sanitizeText(user.business),
    contactPhone: canonical.contactPhone || sanitizeText(user.phoneNumber),
    reconciliationState: hasWholesaleApplication
      ? (canonical.reconciledAt ? 'reconciled' : 'canonical')
      : 'legacy_missing_profile',
  };
}

function collectFieldConflicts(targetCanonical = {}, applicantCanonical = {}) {
  return WHOLESALE_PROFILE_FIELDS.filter((field) => {
    const targetValue = sanitizeText(targetCanonical[field]);
    const applicantValue = sanitizeText(applicantCanonical[field]);
    return targetValue && applicantValue && targetValue !== applicantValue;
  });
}

export function buildApplicantMatchReport(applicantUser = {}, activeWholesalers = []) {
  const applicantCanonical = buildCanonicalWholesaleApplication(applicantUser);
  const applicantEmail = normalizeEmail(applicantCanonical.contactEmail || applicantUser.email);
  const dismissedUserIDs = applicantCanonical.reconciliation?.dismissedUserIDs || [];

  if (!applicantEmail) {
    return {
      applicantId: stringifyObjectId(applicantUser._id),
      applicationId: applicantCanonical.applicationId,
      status: 'no_email',
      candidates: [],
      canAutoMerge: false,
      conflictFields: [],
    };
  }

  const candidates = activeWholesalers
    .filter((user) => normalizeEmail(user.email) === applicantEmail)
    .filter((user) => stringifyObjectId(user._id) !== stringifyObjectId(applicantUser._id))
    .filter((user) => !dismissedUserIDs.includes(getUserLookupValue(user)))
    .map((user) => {
      const targetCanonical = buildCanonicalWholesaleApplication(user);
      return {
        ...summarizeWholesaleUser(user),
        conflictFields: collectFieldConflicts(targetCanonical, applicantCanonical),
      };
    });

  const canAutoMerge = candidates.length === 1;
  return {
    applicantId: stringifyObjectId(applicantUser._id),
    applicationId: applicantCanonical.applicationId,
    status: canAutoMerge ? 'safe_match' : (candidates.length > 1 ? 'ambiguous' : 'no_match'),
    candidates,
    canAutoMerge,
    conflictFields: canAutoMerge ? candidates[0].conflictFields : [],
  };
}

async function loadWholesaleUsers() {
  const usersCollection = await db.dbUsers();
  return usersCollection.find({
    $or: [
      { role: { $in: WHOLESALE_ROLES } },
      { wholesaleApplication: { $exists: true } },
    ],
  }).toArray();
}

function buildDuplicateApplicantEmailReport(applicants = []) {
  const buckets = new Map();

  for (const applicant of applicants) {
    const canonical = buildCanonicalWholesaleApplication(applicant);
    const email = normalizeEmail(canonical.contactEmail || applicant.email);
    if (!email) continue;

    if (!buckets.has(email)) {
      buckets.set(email, []);
    }

    buckets.get(email).push({
      applicantId: stringifyObjectId(applicant._id),
      applicationId: canonical.applicationId,
      businessName: canonical.businessName,
      status: canonical.status,
    });
  }

  return [...buckets.entries()]
    .filter(([, matches]) => matches.length > 1)
    .map(([email, matches]) => ({ email, matches }))
    .sort((a, b) => a.email.localeCompare(b.email));
}

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

export function buildMergedWholesaleApplication(targetUser, applicantUser, reviewedBy, reviewNotes = '') {
  const targetCanonical = buildCanonicalWholesaleApplication(targetUser);
  const applicantCanonical = buildCanonicalWholesaleApplication(applicantUser);
  const now = new Date();
  const merged = { ...targetCanonical };

  for (const field of WHOLESALE_PROFILE_FIELDS) {
    const applicantValue = sanitizeText(applicantCanonical[field]);
    const targetValue = sanitizeText(targetCanonical[field]);
    merged[field] = applicantValue || targetValue;
  }

  return {
    ...merged,
    applicationId: sanitizeText(targetCanonical.applicationId) || applicantCanonical.applicationId,
    status: APPLICATION_STATUSES.APPROVED,
    source: 'merged',
    migratedFromLegacy: Boolean(targetCanonical.migratedFromLegacy),
    submittedAt: targetCanonical.submittedAt || applicantCanonical.submittedAt || now,
    approvedAt: targetCanonical.approvedAt || applicantCanonical.approvedAt || now,
    reviewedAt: now,
    reviewedBy,
    reviewNotes: sanitizeText(reviewNotes || targetCanonical.reviewNotes),
    reconciledAt: now,
    reconciledBy: reviewedBy,
    updatedAt: now,
    mergedApplicationIds: uniqueStrings([
      targetCanonical.applicationId,
      applicantCanonical.applicationId,
      ...(targetCanonical.mergedApplicationIds || []),
    ]),
    mergedFromApplicantId: stringifyObjectId(applicantUser._id),
    mergedFromApplicantUserID: sanitizeText(applicantUser.userID),
    reconciliation: {
      ...(targetCanonical.reconciliation || {}),
      needsReview: false,
      candidateUserIDs: [],
      dismissedUserIDs: [],
      lastResolvedAt: now,
      lastResolvedBy: reviewedBy,
    },
  };
}

async function getUsersForMerge(applicationId, targetUserId) {
  const usersCollection = await db.dbUsers();
  const applicantUser = await usersCollection.findOne({
    'wholesaleApplication.applicationId': applicationId,
  });

  if (!applicantUser) throw new Error('Wholesale application not found.');

  const targetQuery = ObjectId.isValid(targetUserId)
    ? { _id: new ObjectId(targetUserId) }
    : { userID: targetUserId };
  const targetUser = await usersCollection.findOne(targetQuery);

  if (!targetUser) throw new Error('Target wholesaler account not found.');
  if (targetUser.role !== 'wholesaler') throw new Error('Target account must be an active wholesaler.');

  return { usersCollection, applicantUser, targetUser };
}

export async function mergeWholesaleApplicationIntoAccount({ applicationId, targetUserId, reviewedBy, reviewNotes = '' }) {
  const { usersCollection, applicantUser, targetUser } = await getUsersForMerge(applicationId, targetUserId);
  const mergedApplication = buildMergedWholesaleApplication(targetUser, applicantUser, reviewedBy, reviewNotes);
  const now = new Date();

  await usersCollection.updateOne(
    { _id: targetUser._id },
    {
      $set: {
        role: 'wholesaler',
        wholesaleApplication: mergedApplication,
        business: mergedApplication.businessName || targetUser.business || '',
        phoneNumber: targetUser.phoneNumber || mergedApplication.contactPhone || '',
        firstName: targetUser.firstName || mergedApplication.contactFirstName || '',
        lastName: targetUser.lastName || mergedApplication.contactLastName || '',
        updatedAt: now,
      },
    }
  );

  await usersCollection.updateOne(
    { _id: applicantUser._id },
    {
      $set: {
        'wholesaleApplication.status': APPLICATION_STATUSES.MERGED,
        'wholesaleApplication.source': 'applicant',
        'wholesaleApplication.reconciledAt': now,
        'wholesaleApplication.reconciledBy': reviewedBy,
        'wholesaleApplication.reviewedAt': now,
        'wholesaleApplication.reviewedBy': reviewedBy,
        'wholesaleApplication.reviewNotes': sanitizeText(reviewNotes),
        'wholesaleApplication.updatedAt': now,
        'wholesaleApplication.mergedIntoUserID': sanitizeText(targetUser.userID),
        'wholesaleApplication.mergedIntoMongoId': stringifyObjectId(targetUser._id),
        'wholesaleApplication.reconciliation.needsReview': false,
        'wholesaleApplication.reconciliation.candidateUserIDs': [],
        updatedAt: now,
      },
    }
  );

  return {
    targetUserId: stringifyObjectId(targetUser._id),
    targetAccountUserID: targetUser.userID,
    applicationId,
    mergedApplicationId: mergedApplication.applicationId,
  };
}

export async function backfillLegacyWholesalerProfile({ targetUserId, reviewedBy }) {
  const usersCollection = await db.dbUsers();
  const query = ObjectId.isValid(targetUserId)
    ? { _id: new ObjectId(targetUserId) }
    : { userID: targetUserId };
  const user = await usersCollection.findOne(query);

  if (!user) throw new Error('Wholesaler account not found.');
  if (user.role !== 'wholesaler') throw new Error('Only active wholesaler accounts can be backfilled.');

  const now = new Date();
  const canonical = buildCanonicalWholesaleApplication(user, {
    status: APPLICATION_STATUSES.APPROVED,
    source: 'legacy_backfill',
    migratedFromLegacy: true,
    approvedAt: user.createdAt || now,
    submittedAt: user.createdAt || now,
    reviewedAt: now,
    reviewedBy,
    reconciledAt: now,
    reconciledBy: reviewedBy,
    updatedAt: now,
  });

  await usersCollection.updateOne(
    { _id: user._id },
    {
      $set: {
        wholesaleApplication: canonical,
        business: canonical.businessName || user.business || '',
        phoneNumber: user.phoneNumber || canonical.contactPhone || '',
        updatedAt: now,
      },
    }
  );

  return {
    userId: stringifyObjectId(user._id),
    accountUserID: user.userID,
    applicationId: canonical.applicationId,
  };
}

export async function dismissWholesaleMatchSuggestions({ applicationId, dismissedUserIds = [], reviewedBy, reviewNotes = '' }) {
  const usersCollection = await db.dbUsers();
  const user = await usersCollection.findOne({
    'wholesaleApplication.applicationId': applicationId,
  });

  if (!user) throw new Error('Wholesale application not found.');

  const canonical = buildCanonicalWholesaleApplication(user);
  const now = new Date();
  const nextDismissed = uniqueStrings([
    ...(canonical.reconciliation?.dismissedUserIDs || []),
    ...dismissedUserIds,
  ]);

  await usersCollection.updateOne(
    { _id: user._id },
    {
      $set: {
        'wholesaleApplication.reconciliation.dismissedUserIDs': nextDismissed,
        'wholesaleApplication.reconciliation.needsReview': false,
        'wholesaleApplication.reconciliation.candidateUserIDs': [],
        'wholesaleApplication.reconciledAt': now,
        'wholesaleApplication.reconciledBy': reviewedBy,
        'wholesaleApplication.reviewNotes': sanitizeText(reviewNotes),
        'wholesaleApplication.updatedAt': now,
        updatedAt: now,
      },
    }
  );

  return {
    applicationId,
    dismissedUserIds: nextDismissed,
  };
}

export async function updateWholesaleApplicationStatus(applicationId, status, reviewedBy, reviewNotes = '') {
  const usersCollection = await db.dbUsers();
  const now = new Date();
  const result = await usersCollection.updateOne(
    { 'wholesaleApplication.applicationId': applicationId },
    {
      $set: cleanObject({
        'wholesaleApplication.status': status,
        'wholesaleApplication.reviewedAt': now,
        'wholesaleApplication.reviewedBy': reviewedBy,
        'wholesaleApplication.reviewNotes': reviewNotes,
        'wholesaleApplication.updatedAt': now,
        'wholesaleApplication.approvedAt': status === APPLICATION_STATUSES.APPROVED ? now : null,
        'wholesaleApplication.reconciledAt': status === APPLICATION_STATUSES.APPROVED ? now : undefined,
        'wholesaleApplication.reconciledBy': status === APPLICATION_STATUSES.APPROVED ? reviewedBy : undefined,
        role: status === APPLICATION_STATUSES.APPROVED ? 'wholesaler' : undefined,
        updatedAt: now,
      }),
    }
  );

  return result.modifiedCount > 0;
}
