import { WHOLESALE_LEAD_STATUSES, buildActivity, cleanPatch, getLeadsCollection, normalizeLeadKey, normalizeNullableString, normalizeString, objectIdFilter, safeDate, serializeLead } from './wholesaleLeads/shared';
import { findDuplicateLead } from './wholesaleLeads/shared';
export { WHOLESALE_LEAD_STATUSES } from './wholesaleLeads/shared';
export { discoverEmailFromWebsite, scrapeWholesaleLeadWebsiteResearch } from './wholesaleLeads/websiteScrape';
export { importGoogleWholesaleLeads } from './wholesaleLeads/googleImport';
export { createWholesaleImportJob, getWholesaleImportJob, getLatestWholesaleImportJob, claimNextQueuedWholesaleImportJob, cancelWholesaleImportJob, runWholesaleImportJob } from './wholesaleLeads/importJobs';
export { scoreWholesaleLead, bulkRescoreWholesaleLeads, createWholesaleRescoreJob, getWholesaleRescoreJob, getLatestWholesaleRescoreJob, runWholesaleRescoreJob } from './wholesaleLeads/scoring';
export { findWholesaleLeadEmail, generateWholesaleLeadOutreach, bulkWholesaleLeadOutreach } from './wholesaleLeads/outreach';
export { matchCurrentWholesalersToGoogleLeads, markWholesaleLeadAsKnownCustomer, linkWholesaleLeadApplication } from './wholesaleLeads/customerMatching';

export async function listWholesaleLeads(filters = {}) {
  const collection = await getLeadsCollection();
  const query = {};

  if (filters.status) query.status = filters.status;
  if (filters.city) query.city = new RegExp(normalizeString(filters.city), 'i');
  if (filters.state) query.state = new RegExp(`^${normalizeString(filters.state)}$`, 'i');
  if (filters.source) query.source = filters.source;
  if (filters.minScore) query.fitScore = { $gte: Number(filters.minScore) };
  if (filters.search) {
    const search = normalizeString(filters.search);
    query.$or = [
      { storeName: new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') },
      { phone: new RegExp(search, 'i') },
      { address: new RegExp(search, 'i') },
      { city: new RegExp(search, 'i') },
      { notes: new RegExp(search, 'i') },
    ];
  }

  const leads = await collection.find(query).sort({ nextFollowUpAt: 1, updatedAt: -1 }).limit(500).toArray();
  return leads.map(serializeLead);
}

export async function getWholesaleLead(leadId) {
  const collection = await getLeadsCollection();
  const lead = await collection.findOne(objectIdFilter(leadId));
  return lead ? serializeLead(lead) : null;
}

export async function createWholesaleLead(payload = {}, actor) {
  const collection = await getLeadsCollection();
  const now = new Date();
  const storeName = normalizeString(payload.storeName);
  if (!storeName) throw new Error('storeName is required');

  const lead = {
    leadId: `WLEAD-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    storeName,
    contactName: normalizeNullableString(payload.contactName),
    contactTitle: normalizeNullableString(payload.contactTitle),
    email: normalizeNullableString(payload.email),
    phone: normalizeNullableString(payload.phone),
    website: normalizeNullableString(payload.website),
    address: normalizeNullableString(payload.address),
    city: normalizeNullableString(payload.city),
    state: normalizeNullableString(payload.state),
    zip: normalizeNullableString(payload.zip),
    googlePlaceId: normalizeNullableString(payload.googlePlaceId),
    googleRating: payload.googleRating ?? null,
    googleReviewCount: payload.googleReviewCount ?? null,
    googleBusinessTypes: Array.isArray(payload.googleBusinessTypes) ? payload.googleBusinessTypes : [],
    googleUrl: normalizeNullableString(payload.googleUrl),
    source: payload.source || 'manual',
    sourceType: payload.sourceType || 'prospect',
    status: WHOLESALE_LEAD_STATUSES.includes(payload.status) ? payload.status : 'new',
    fitScore: payload.fitScore === undefined || payload.fitScore === '' ? null : Math.max(0, Math.min(100, Number(payload.fitScore))),
    scoreSource: payload.fitScore === undefined || payload.fitScore === '' ? null : 'manual',
    aiScore: null,
    aiConfidence: null,
    aiSummary: '',
    likelyRepairNeed: '',
    aiConcerns: [],
    recommendedOutreachAngle: '',
    outreachDraft: null,
    notes: normalizeString(payload.notes),
    nextFollowUpAt: safeDate(payload.nextFollowUpAt),
    lastContactedAt: safeDate(payload.lastContactedAt),
    shippingRequired: Boolean(payload.shippingRequired),
    preferredCarrier: normalizeNullableString(payload.preferredCarrier),
    shippingNotes: normalizeString(payload.shippingNotes),
    estimatedMonthlyRepairs: payload.estimatedMonthlyRepairs ? Number(payload.estimatedMonthlyRepairs) : null,
    invitedApplicationEmail: normalizeNullableString(payload.invitedApplicationEmail),
    inviteSentAt: safeDate(payload.inviteSentAt),
    linkedUserId: null,
    linkedWholesaleApplicationId: null,
    linkedWholesalerUserId: null,
    normalizedName: normalizeLeadKey(storeName),
    normalizedAddress: normalizeLeadKey(payload.address),
    activity: [buildActivity({ type: 'created', message: 'Lead created', actor })],
    createdAt: now,
    updatedAt: now,
    createdBy: actor || null,
    updatedBy: actor || null,
  };

  const existing = await findDuplicateLead(collection, lead);
  if (existing) {
    return { lead: serializeLead(existing), created: false, duplicate: true };
  }

  const result = await collection.insertOne(lead);
  return { lead: serializeLead({ ...lead, _id: result.insertedId }), created: true, duplicate: false };
}

export async function updateWholesaleLead(leadId, payload = {}, actor) {
  const collection = await getLeadsCollection();
  const patch = cleanPatch(payload);
  const activity = [];
  if (payload.activityNote) {
    activity.push(buildActivity({ type: 'note', message: normalizeString(payload.activityNote), actor }));
  }
  if (patch.status) {
    activity.push(buildActivity({ type: 'status', message: `Status changed to ${patch.status}`, actor }));
    if (patch.status === 'not_fit') patch.sourceType = 'not_fit';
    if (patch.status !== 'not_fit' && payload.sourceType !== 'customer') patch.sourceType = payload.sourceType || 'prospect';
  }

  patch.updatedAt = new Date();
  patch.updatedBy = actor || null;
  if (patch.storeName) patch.normalizedName = normalizeLeadKey(patch.storeName);
  if (patch.address) patch.normalizedAddress = normalizeLeadKey(patch.address);

  const update = { $set: patch };
  if (activity.length) update.$push = { activity: { $each: activity } };

  const result = await collection.findOneAndUpdate(objectIdFilter(leadId), update, { returnDocument: 'after' });
  return result ? serializeLead(result) : null;
}
