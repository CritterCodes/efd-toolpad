import { getActiveWholesalers } from '@/lib/wholesaleReconciliationService';
import { getAllWholesaleApplications } from '@/lib/wholesaleReconciliationService';
import { matchAccountToPlace } from '@/services/lookalike/lookalike.match.service.js';
import { ObjectId } from 'mongodb';
import { buildProfiles } from '@/services/lookalike/lookalike.profile.service.js';
import { GEMINI_MODEL, buildActivity, getLeadsCollection, getUsersCollection, normalizeLeadKey, normalizeString, objectIdFilter, serializeLead } from './shared';
import { hydrateLeadGoogleReviewResearch, hydrateLeadWebsiteResearch } from './websiteScrape';
import { evaluateWholesaleLead } from './scoring';
import { mapGoogleLead } from './googleImport';
export const wholesalerSearchText = (wholesaler = {}) => {
  const application = wholesaler.wholesaleApplication || {};
  return [
    wholesaler.businessName,
    application.businessName,
    application.businessAddress,
    wholesaler.businessAddress,
    application.businessCity,
    wholesaler.businessCity,
    application.businessState,
    wholesaler.businessState,
    wholesaler.business,
  ].map(normalizeString).filter(Boolean).join(' ');
};

export const normalizeWholesalerAccount = (wholesaler = {}) => {
  const application = wholesaler.wholesaleApplication || {};
  const businessName = normalizeString(wholesaler.businessName || application.businessName || wholesaler.business);
  const city = normalizeString(application.businessCity || wholesaler.businessCity);
  const state = normalizeString(application.businessState || wholesaler.businessState);
  const address = normalizeString(application.businessAddress || wholesaler.businessAddress);
  return {
    userId: wholesaler.userID || wholesaler.accountUserID || wholesaler.id || '',
    applicationId: application.applicationId || wholesaler.applicationId || '',
    businessName,
    email: normalizeString(application.contactEmail || wholesaler.contactEmail || wholesaler.email),
    phone: normalizeString(application.contactPhone || wholesaler.contactPhone || wholesaler.phoneNumber),
    address,
    city,
    state,
    zip: normalizeString(application.businessZip || wholesaler.businessZip),
    placeMatch: wholesaler.placeMatch || application.placeMatch || null,
    searchText: wholesalerSearchText(wholesaler),
  };
};

export const customerLookalikePatch = (account, placeMatch, source = 'active_wholesaler_match') => ({
  knownCustomerSignal: {
    isCurrentWholesaler: true,
    isTrainingExample: true,
    source,
    matchConfidence: placeMatch?.confidence || 1,
    matchAssessment: placeMatch?.assessment || {},
    businessName: account.businessName,
    userId: account.userId,
    applicationId: account.applicationId,
    address: account.address,
    city: account.city,
    state: account.state,
    matchedAt: new Date(),
  },
  linkedUserId: account.userId || null,
  linkedWholesaleApplicationId: account.applicationId || null,
  linkedWholesalerUserId: account.userId || null,
  invitedApplicationEmail: account.email || null,
  status: 'approved',
  sourceType: 'customer',
  placeMatch,
  updatedAt: new Date(),
});

export async function enrichCustomerSeedLead(collection, leadId, actor) {
  let lead = await collection.findOne(objectIdFilter(leadId));
  if (!lead) return null;
  try {
    lead = await hydrateLeadWebsiteResearch(collection, lead, actor);
    lead = await hydrateLeadGoogleReviewResearch(collection, lead, actor);
    const update = {
      ...(await evaluateWholesaleLead({ ...lead, sourceType: 'customer' })),
      sourceType: 'customer',
      status: 'approved',
      fitScore: null,
      scoreSource: null,
      aiScore: null,
      updatedBy: actor || null,
    };
    await collection.updateOne(
      objectIdFilter(lead._id?.toString() || lead.leadId),
      {
        $set: update,
        $push: {
          activity: buildActivity({
            type: 'customer_seed_enriched',
            message: 'Current customer seed enriched for lookalike scoring',
            actor,
            metadata: { model: GEMINI_MODEL },
          }),
        },
      },
    );
    return { ...lead, ...update };
  } catch (error) {
    await collection.updateOne(
      objectIdFilter(lead._id?.toString() || lead.leadId),
      {
        $push: {
          activity: buildActivity({
            type: 'customer_seed_enrichment_failed',
            message: `Customer seed enrichment failed: ${error.message}`,
            actor,
          }),
        },
      },
    );
    return lead;
  }
}

export async function matchCurrentWholesalersToGoogleLeads({ limit = 50 } = {}, actor) {
  const collection = await getLeadsCollection();
  const users = await getUsersCollection();
  const activeWholesalers = await getActiveWholesalers();
  const approvedApplications = (await getAllWholesaleApplications({ status: 'approved' }))
    .filter((application) => application.businessName);
  const accountsByKey = new Map();
  for (const account of [...activeWholesalers, ...approvedApplications].map(normalizeWholesalerAccount)) {
    if (!account.businessName) continue;
    const key = normalizeLeadKey(`${account.businessName} ${account.address} ${account.city} ${account.state}`);
    if (!accountsByKey.has(key)) accountsByKey.set(key, account);
  }
  const wholesalers = [...accountsByKey.values()]
    .slice(0, Math.max(1, Math.min(200, Number(limit) || 50)));

  const results = [];
  for (const account of wholesalers) {
    try {
      const rawAccount = [...activeWholesalers, ...approvedApplications]
        .find((candidate) => normalizeLeadKey(candidate.businessName) === normalizeLeadKey(account.businessName)) || account;
      const placeMatch = await matchAccountToPlace({
        ...rawAccount,
        businessName: account.businessName,
        businessAddress: account.address,
        businessCity: account.city,
        businessState: account.state,
        contactPhone: account.phone,
        placeMatch: account.placeMatch,
      });

      if (account.userId || account.applicationId) {
        await users.updateOne(
          account.applicationId
            ? { 'wholesaleApplication.applicationId': account.applicationId }
            : { $or: [{ userID: account.userId }, ...(ObjectId.isValid(account.userId) ? [{ _id: new ObjectId(account.userId) }] : [])] },
          { $set: { 'wholesaleApplication.placeMatch': placeMatch, updatedAt: new Date() } },
        );
      }

      if (!placeMatch.matched) {
        results.push({ account: account.businessName, action: 'no_verified_google_match', confidence: placeMatch.confidence || 0, placeMatch });
        continue;
      }

      let matchedLead = await collection.findOne({
        $or: [
          ...(account.applicationId ? [{ linkedWholesaleApplicationId: account.applicationId }] : []),
          ...(account.userId ? [{ linkedWholesalerUserId: account.userId }, { linkedUserId: account.userId }] : []),
          ...(account.email ? [{ email: new RegExp(`^${account.email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }] : []),
          { googlePlaceId: placeMatch.placeId },
        ],
      });

      const patch = customerLookalikePatch(account, placeMatch);
      const activity = buildActivity({
        type: 'customer_lookalike_seed',
        message: `Seeded current wholesaler lookalike profile for ${account.businessName}`,
        actor,
        metadata: { confidence: placeMatch.confidence, userId: account.userId, applicationId: account.applicationId, placeMatch },
      });

      if (matchedLead) {
        await collection.updateOne(
          objectIdFilter(matchedLead._id?.toString() || matchedLead.leadId),
          { $set: patch, $push: { activity } },
        );
        await enrichCustomerSeedLead(collection, matchedLead._id?.toString() || matchedLead.leadId, actor);
        results.push({ account: account.businessName, action: 'updated_existing_lead', confidence: placeMatch.confidence, leadId: matchedLead._id?.toString() || matchedLead.leadId });
        continue;
      }

      const leadPayload = mapGoogleLead({ place_id: placeMatch.placeId }, placeMatch.details || {});
      const now = new Date();
      const lead = {
        ...leadPayload,
        ...patch,
        leadId: `WLEAD-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        contactName: null,
        contactTitle: null,
        email: account.email || null,
        phone: account.phone || leadPayload.phone || null,
        outreachDraft: null,
        websiteResearch: null,
        websiteSummary: '',
        websiteSignals: {},
        websiteResearchCheckedAt: null,
        notes: 'Imported as a current-customer lookalike seed.',
        nextFollowUpAt: null,
        lastContactedAt: null,
        shippingRequired: false,
        preferredCarrier: null,
        shippingNotes: '',
        estimatedMonthlyRepairs: null,
        inviteSentAt: null,
        normalizedName: normalizeLeadKey(leadPayload.storeName || account.businessName),
        normalizedAddress: normalizeLeadKey(leadPayload.address || account.address),
        source: 'current_wholesale_account',
        sourceType: 'customer',
        activity: [activity],
        createdAt: now,
        updatedAt: now,
        createdBy: actor || null,
        updatedBy: actor || null,
      };
      const result = await collection.insertOne(lead);
      await enrichCustomerSeedLead(collection, result.insertedId.toString(), actor);
      results.push({ account: account.businessName, action: 'created_training_lead', confidence: placeMatch.confidence, leadId: result.insertedId.toString() });
    } catch (error) {
      results.push({ account: account.businessName, action: 'failed', error: error.message });
    }
  }

  await buildProfiles();

  return {
    totalAccounts: wholesalers.length,
    matched: results.filter((result) => ['updated_existing_lead', 'created_training_lead'].includes(result.action)).length,
    created: results.filter((result) => result.action === 'created_training_lead').length,
    updated: results.filter((result) => result.action === 'updated_existing_lead').length,
    unmatched: results.filter((result) => result.action === 'no_verified_google_match').length,
    failed: results.filter((result) => result.action === 'failed').length,
    results,
  };
}

export async function markWholesaleLeadAsKnownCustomer(leadId, actor) {
  const collection = await getLeadsCollection();
  const lead = await collection.findOne(objectIdFilter(leadId));
  if (!lead) return null;

  const account = {
    userId: lead.linkedWholesalerUserId || lead.linkedUserId || '',
    applicationId: lead.linkedWholesaleApplicationId || '',
    businessName: lead.storeName,
    email: lead.email || lead.invitedApplicationEmail || '',
    address: lead.address || '',
    city: lead.city || '',
    state: lead.state || '',
  };
  const patch = customerLookalikePatch(account, {
    matched: true,
    confidence: 1,
    placeId: lead.googlePlaceId || null,
    name: lead.storeName,
    address: lead.address,
    latitude: lead.latitude,
    longitude: lead.longitude,
    categories: lead.googleBusinessTypes || [],
    lastMatchedAt: new Date(),
    assessment: { manual: true },
  }, 'manual_admin_mark');
  const result = await collection.findOneAndUpdate(
    objectIdFilter(leadId),
    {
      $set: {
        ...patch,
        updatedBy: actor || null,
      },
      $push: {
        activity: buildActivity({
          type: 'known_customer_match',
          message: 'Marked as current-customer lookalike seed',
          actor,
          metadata: { source: 'manual_admin_mark' },
        }),
      },
    },
    { returnDocument: 'after' },
  );

  await buildProfiles();
  return result ? serializeLead(result) : null;
}

export async function linkWholesaleLeadApplication(leadId, payload = {}, actor) {
  const collection = await getLeadsCollection();
  const users = await getUsersCollection();
  const applicationId = normalizeString(payload.applicationId);
  const email = normalizeString(payload.email);

  const query = applicationId
    ? { 'wholesaleApplication.applicationId': applicationId }
    : { $or: [{ email }, { 'wholesaleApplication.contactEmail': email }, { 'wholesaleApplication.userEmail': email }] };

  if (!applicationId && !email) throw new Error('applicationId or email is required');

  const user = await users.findOne(query);
  if (!user?.wholesaleApplication) return null;

  const status = user.wholesaleApplication.status === 'approved' || user.role === 'wholesale' ? 'approved' : 'applied';
  const result = await collection.findOneAndUpdate(
    objectIdFilter(leadId),
    {
      $set: {
        linkedUserId: user.userID || user._id?.toString() || null,
        linkedWholesaleApplicationId: user.wholesaleApplication.applicationId,
        linkedWholesalerUserId: user.role === 'wholesale' ? (user.userID || user._id?.toString()) : null,
        status,
        updatedAt: new Date(),
        updatedBy: actor || null,
      },
      $push: {
        activity: buildActivity({
          type: 'linked_application',
          message: `Linked wholesale application ${user.wholesaleApplication.applicationId}`,
          actor,
          metadata: { userID: user.userID || user._id?.toString(), status },
        }),
      },
    },
    { returnDocument: 'after' },
  );

  return serializeLead(result);
}

