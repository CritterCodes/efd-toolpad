import { ObjectId } from 'mongodb';
import { db } from '@/lib/database';
export const WHOLESALE_LEAD_STATUSES = [
  'new',
  'researching',
  'qualified',
  'contacted',
  'follow_up',
  'interested',
  'invited',
  'applied',
  'approved',
  'not_fit',
  'no_response',
];

export const COLLECTION = 'wholesaleLeads';
export const IMPORT_JOBS_COLLECTION = 'wholesaleLeadImportJobs';
export const GOOGLE_API_BASE = 'https://maps.googleapis.com/maps/api/place';
export const GOOGLE_PLACES_NEW_API_BASE = 'https://places.googleapis.com/v1';
export const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
export const GEMINI_MODEL = 'gemini-2.5-flash';
export const METERS_PER_MILE = 1609.344;
export const DEFAULT_RADIUS_METERS = 160934;
export const DEFAULT_IMPORT_MIN_SCORE = 40;
export const DEFAULT_IMPORT_MAX_CANDIDATES = 150;
export const DEFAULT_DISCOVER_EMAILS = true;
export const DEFAULT_SEARCH_LOCATIONS = [''];
export const DEFAULT_SEARCH_QUERIES = [
  'independent jeweler',
  'jewelry repair',
  'watch repair',
  'pawn shop jewelry',
  'bridal jewelry store',
  'local jewelry store',
];

export const normalizeString = (value) => String(value || '').trim();
export const normalizeNullableString = (value) => {
  const normalized = normalizeString(value);
  return normalized || null;
};

export const normalizeLeadKey = (value) => normalizeString(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export const DEFAULT_WHOLESALE_APPLICATION_URL = 'https://shop.engelfinedesign.com/wholesale/request';

export const normalizeWholesaleApplicationUrl = (value) => {
  const raw = normalizeString(value);
  if (!raw || raw.includes('your-efd-shop-domain.com') || raw.includes('engelfinedesign.com/wholesale/request')) {
    return DEFAULT_WHOLESALE_APPLICATION_URL;
  }
  return raw;
};

export const replaceWholesaleApplicationLinks = (value) => {
  if (typeof value !== 'string') return value;
  return value
    .replaceAll('https://your-efd-shop-domain.com/wholesale/request', DEFAULT_WHOLESALE_APPLICATION_URL)
    .replaceAll('http://your-efd-shop-domain.com/wholesale/request', DEFAULT_WHOLESALE_APPLICATION_URL)
    .replaceAll('https://engelfinedesign.com/wholesale/request', DEFAULT_WHOLESALE_APPLICATION_URL)
    .replaceAll('http://engelfinedesign.com/wholesale/request', DEFAULT_WHOLESALE_APPLICATION_URL);
};

export const normalizeOutreachDraftLinks = (draft) => {
  if (!draft || typeof draft !== 'object') return draft;
  return {
    ...draft,
    applicationUrl: normalizeWholesaleApplicationUrl(draft.applicationUrl),
    emailBody: replaceWholesaleApplicationLinks(draft.emailBody),
    inviteMessage: replaceWholesaleApplicationLinks(draft.inviteMessage),
    followUpNote: replaceWholesaleApplicationLinks(draft.followUpNote),
    callOpener: replaceWholesaleApplicationLinks(draft.callOpener),
  };
};

export const serializeLead = (lead) => ({
  ...lead,
  outreachDraft: normalizeOutreachDraftLinks(lead.outreachDraft),
  businessProfileHints: inferLeadBusinessHints(lead),
  id: lead._id?.toString(),
  _id: undefined,
});

export const serializeJob = (job) => ({
  ...job,
  id: job._id?.toString(),
  _id: undefined,
});

export const objectIdFilter = (leadId) => {
  if (ObjectId.isValid(leadId)) return { _id: new ObjectId(leadId) };
  return { leadId };
};

export const getLeadsCollection = async () => {
  const dbInstance = await db.connect();
  return dbInstance.collection(COLLECTION);
};

export const getUsersCollection = async () => {
  const dbInstance = await db.connect();
  return dbInstance.collection('users');
};

export const getImportJobsCollection = async () => {
  const dbInstance = await db.connect();
  return dbInstance.collection(IMPORT_JOBS_COLLECTION);
};

export const getGoogleApiKey = () => process.env.GOOGLE_PLACES_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
export const getWholesaleApplicationUrl = () => normalizeWholesaleApplicationUrl(
  process.env.WHOLESALE_APPLICATION_URL
    || process.env.NEXT_PUBLIC_WHOLESALE_APPLICATION_URL
    || DEFAULT_WHOLESALE_APPLICATION_URL,
);

export const buildActivity = ({ type, message, actor, metadata = {} }) => ({
  type,
  message,
  actor: actor || 'system',
  metadata,
  createdAt: new Date(),
});

export const safeDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const cleanPatch = (payload = {}) => {
  const allowed = [
    'storeName',
    'contactName',
    'contactTitle',
    'email',
    'phone',
    'website',
    'address',
    'city',
    'state',
    'zip',
    'status',
    'fitScore',
    'scoreOverrideReason',
    'notes',
    'nextFollowUpAt',
    'lastContactedAt',
    'shippingRequired',
    'preferredCarrier',
    'shippingNotes',
    'estimatedMonthlyRepairs',
    'invitedApplicationEmail',
    'inviteSentAt',
    'websiteResearch',
    'websiteSummary',
    'websiteSignals',
    'websiteResearchCheckedAt',
    'googleReviews',
    'googleReviewResearch',
    'googleReviewSummary',
    'googleReviewSignals',
    'googleReviewCheckedAt',
    'truthSignals',
    'signalBreakdown',
    'sourceType',
  ];

  const patch = {};
  for (const key of allowed) {
    if (!(key in payload)) continue;
    patch[key] = payload[key];
  }

  if (patch.status && !WHOLESALE_LEAD_STATUSES.includes(patch.status)) {
    throw new Error('Invalid lead status');
  }

  if ('fitScore' in patch) {
    if (patch.fitScore === null || patch.fitScore === '') {
      patch.fitScore = null;
      patch.scoreSource = null;
    } else {
      patch.fitScore = Math.max(0, Math.min(100, Number(patch.fitScore)));
      patch.scoreSource = 'manual';
    }
  }

  if ('shippingRequired' in patch) patch.shippingRequired = Boolean(patch.shippingRequired);
  if ('estimatedMonthlyRepairs' in patch) {
    const parsed = Number(patch.estimatedMonthlyRepairs);
    patch.estimatedMonthlyRepairs = Number.isFinite(parsed) ? Math.max(0, parsed) : null;
  }
  if ('nextFollowUpAt' in patch) patch.nextFollowUpAt = safeDate(patch.nextFollowUpAt);
  if ('lastContactedAt' in patch) patch.lastContactedAt = safeDate(patch.lastContactedAt);
  if ('inviteSentAt' in patch) patch.inviteSentAt = safeDate(patch.inviteSentAt);

  return patch;
};

export async function findDuplicateLead(collection, lead) {
  if (lead.googlePlaceId) {
    const byPlace = await collection.findOne({ googlePlaceId: lead.googlePlaceId });
    if (byPlace) return byPlace;
  }
  if (lead.normalizedName && lead.normalizedAddress) {
    return collection.findOne({
      normalizedName: lead.normalizedName,
      normalizedAddress: lead.normalizedAddress,
    });
  }
  return null;
}

export const inferLeadBusinessHints = (lead = {}) => {
  const reviewText = [
    lead.googleReviewSummary,
    lead.googleReviewResearch?.summary,
    ...(Array.isArray(lead.googleReviews) ? lead.googleReviews.map((review) => review.text) : []),
  ].join(' ');
  const text = [
    lead.storeName,
    lead.website,
    lead.notes,
    lead.likelyRepairNeed,
    reviewText,
    ...(Array.isArray(lead.googleBusinessTypes) ? lead.googleBusinessTypes : []),
  ].join(' ').toLowerCase();

  const hasPawnSignal = /\bpawn|pawnshop|pawn shop/.test(text);
  const hasRepairSignal = /\brepair|service|watch repair|jewelry repair|jewellery repair|bench/.test(text);
  const hasRefurbishmentSignal = /\brefurb|restore|restoration|polish|clean|cleaning|pre-owned|preowned|used|estate|resale|secondhand|second-hand|scrap gold|gold buyer|cash for gold/.test(text);
  const hasJewelrySignal = /\bjewel|jewelry|jewellery|diamond|gold|bridal|engagement|ring/.test(text);
  const hasWatchSignal = /\bwatch|clock/.test(text);
  const hasBridalSignal = /\bbridal|engagement|wedding/.test(text);

  return {
    likelyBusinessType: hasPawnSignal
      ? 'pawn_shop'
      : hasWatchSignal
        ? 'watch_or_clock_business'
        : hasBridalSignal
          ? 'bridal_or_fine_jewelry_store'
          : hasJewelrySignal
            ? 'jewelry_business'
            : 'unclear',
    knownRepairSignal: hasRepairSignal,
    refurbishmentOpportunity: hasRefurbishmentSignal || hasPawnSignal,
    jewelrySignal: hasJewelrySignal,
    pawnSignal: hasPawnSignal,
    watchSignal: hasWatchSignal,
    bridalSignal: hasBridalSignal,
  };
};
