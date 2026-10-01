import { db } from '@/lib/database';
import { ObjectId } from 'mongodb';
import { APPLICATION_STATUSES, WHOLESALE_PROFILE_FIELDS, buildCanonicalWholesaleApplication, cleanObject, sanitizeText, stringifyObjectId, uniqueStrings } from './shared';
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

export async function getUsersForMerge(applicationId, targetUserId) {
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

