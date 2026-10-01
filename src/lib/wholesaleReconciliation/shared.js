import { randomUUID } from 'crypto';
import { db } from '@/lib/database';
export const WHOLESALE_PROFILE_FIELDS = [
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

export const WHOLESALE_ROLES = ['wholesaler', 'wholesale-applicant'];
export const APPLICATION_STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  MERGED: 'merged',
};

export function cleanObject(object = {}) {
  return Object.fromEntries(
    Object.entries(object).filter(([, value]) => value !== undefined)
  );
}

export function sanitizeText(value, fallback = '') {
  return String(value ?? fallback).trim();
}

export function normalizeEmail(email) {
  const value = sanitizeText(email).toLowerCase();
  return value || '';
}

export function uniqueStrings(values = []) {
  return [...new Set(values.filter(Boolean).map((value) => String(value)))];
}

export function stringifyObjectId(value) {
  if (!value) return '';
  return typeof value === 'string' ? value : value.toString();
}

export function generateApplicationId() {
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

export function getUserLookupValue(user = {}) {
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

export function collectFieldConflicts(targetCanonical = {}, applicantCanonical = {}) {
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

export async function loadWholesaleUsers() {
  const usersCollection = await db.dbUsers();
  return usersCollection.find({
    $or: [
      { role: { $in: WHOLESALE_ROLES } },
      { wholesaleApplication: { $exists: true } },
    ],
  }).toArray();
}

export function buildDuplicateApplicantEmailReport(applicants = []) {
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

