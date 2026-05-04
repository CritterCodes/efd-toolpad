import { ObjectId } from 'mongodb';
import { db } from './database.js';
import nodemailer from 'nodemailer';
import { getActiveWholesalers, getAllWholesaleApplications } from './wholesaleReconciliationService.js';
import { matchAccountToPlace } from '../services/lookalike/lookalike.match.service.js';
import { getLookalikeProfiles, buildProfiles } from '../services/lookalike/lookalike.profile.service.js';
import { buildFeatureVector } from '../services/lookalike/lookalike.vector.util.js';
import { calculateBlendedLookalikeScore, calculateLookalikeScoreFromProfiles } from '../services/lookalike/lookalike.score.util.js';
import { extractReviewSignals } from '../services/reviews/review-signals.service.js';
import { detectInHouseStrength } from '../services/signals/inhouse-detection.service.js';

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

const COLLECTION = 'wholesaleLeads';
const IMPORT_JOBS_COLLECTION = 'wholesaleLeadImportJobs';
const GOOGLE_API_BASE = 'https://maps.googleapis.com/maps/api/place';
const GOOGLE_PLACES_NEW_API_BASE = 'https://places.googleapis.com/v1';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_MODEL = 'gemini-2.5-flash';
const METERS_PER_MILE = 1609.344;
const DEFAULT_RADIUS_METERS = 160934;
const DEFAULT_IMPORT_MIN_SCORE = 40;
const DEFAULT_IMPORT_MAX_CANDIDATES = 150;
const DEFAULT_DISCOVER_EMAILS = true;
const DEFAULT_SEARCH_LOCATIONS = [''];
const DEFAULT_SEARCH_QUERIES = [
  'independent jeweler',
  'jewelry repair',
  'watch repair',
  'pawn shop jewelry',
  'bridal jewelry store',
  'local jewelry store',
];

const normalizeString = (value) => String(value || '').trim();
const normalizeNullableString = (value) => {
  const normalized = normalizeString(value);
  return normalized || null;
};

const normalizeLeadKey = (value) => normalizeString(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const normalizeLeadTokens = (value) => normalizeLeadKey(value).split(' ').filter((token) => token.length > 1);

const tokenSimilarity = (left, right) => {
  const leftTokens = new Set(normalizeLeadTokens(left));
  const rightTokens = new Set(normalizeLeadTokens(right));
  if (!leftTokens.size || !rightTokens.size) return 0;
  const overlap = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  return overlap / Math.max(leftTokens.size, rightTokens.size);
};

const DEFAULT_WHOLESALE_APPLICATION_URL = 'https://shop.engelfinedesign.com/wholesale/request';

const normalizeWholesaleApplicationUrl = (value) => {
  const raw = normalizeString(value);
  if (!raw || raw.includes('your-efd-shop-domain.com') || raw.includes('engelfinedesign.com/wholesale/request')) {
    return DEFAULT_WHOLESALE_APPLICATION_URL;
  }
  return raw;
};

const replaceWholesaleApplicationLinks = (value) => {
  if (typeof value !== 'string') return value;
  return value
    .replaceAll('https://your-efd-shop-domain.com/wholesale/request', DEFAULT_WHOLESALE_APPLICATION_URL)
    .replaceAll('http://your-efd-shop-domain.com/wholesale/request', DEFAULT_WHOLESALE_APPLICATION_URL)
    .replaceAll('https://engelfinedesign.com/wholesale/request', DEFAULT_WHOLESALE_APPLICATION_URL)
    .replaceAll('http://engelfinedesign.com/wholesale/request', DEFAULT_WHOLESALE_APPLICATION_URL);
};

const normalizeOutreachDraftLinks = (draft) => {
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

const serializeLead = (lead) => ({
  ...lead,
  outreachDraft: normalizeOutreachDraftLinks(lead.outreachDraft),
  businessProfileHints: inferLeadBusinessHints(lead),
  id: lead._id?.toString(),
  _id: undefined,
});

const serializeJob = (job) => ({
  ...job,
  id: job._id?.toString(),
  _id: undefined,
});

const objectIdFilter = (leadId) => {
  if (ObjectId.isValid(leadId)) return { _id: new ObjectId(leadId) };
  return { leadId };
};

const getLeadsCollection = async () => {
  const dbInstance = await db.connect();
  return dbInstance.collection(COLLECTION);
};

const getUsersCollection = async () => {
  const dbInstance = await db.connect();
  return dbInstance.collection('users');
};

const getImportJobsCollection = async () => {
  const dbInstance = await db.connect();
  return dbInstance.collection(IMPORT_JOBS_COLLECTION);
};

const getGoogleApiKey = () => process.env.GOOGLE_PLACES_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
const getWholesaleApplicationUrl = () => normalizeWholesaleApplicationUrl(
  process.env.WHOLESALE_APPLICATION_URL
    || process.env.NEXT_PUBLIC_WHOLESALE_APPLICATION_URL
    || DEFAULT_WHOLESALE_APPLICATION_URL,
);

const buildActivity = ({ type, message, actor, metadata = {} }) => ({
  type,
  message,
  actor: actor || 'system',
  metadata,
  createdAt: new Date(),
});

const safeDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const cleanPatch = (payload = {}) => {
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

async function findDuplicateLead(collection, lead) {
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

const googleFetch = async (path, params) => {
  const apiKey = getGoogleApiKey();
  if (!apiKey) throw new Error('GOOGLE_PLACES_API_KEY is not configured');
  const url = new URL(`${GOOGLE_API_BASE}/${path}/json`);
  Object.entries({ ...params, key: apiKey }).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  });
  const response = await fetch(url);
  const payload = await response.json();
  if (!response.ok || !['OK', 'ZERO_RESULTS'].includes(payload.status)) {
    const error = new Error(payload.error_message || `Google Places ${path} failed: ${payload.status || response.status}`);
    error.googleStatus = payload.status;
    error.googlePath = path;
    throw error;
  }
  return payload;
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const parseLatLng = (location) => {
  const [lat, lng] = String(location || '').split(',').map((value) => Number(value.trim()));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { latitude: lat, longitude: lng };
};

const distanceMilesBetween = (from, to) => {
  if (!from || !to) return null;
  const earthMiles = 3958.8;
  const toRadians = (degrees) => degrees * (Math.PI / 180);
  const dLat = toRadians(to.latitude - from.latitude);
  const dLng = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(earthMiles * c * 10) / 10;
};

const googleTextSearchPages = async (params, maxPages = 3) => {
  const pages = [];
  let payload = await googleFetch('textsearch', params);
  pages.push(payload);

  for (let page = 1; page < maxPages && payload.next_page_token; page += 1) {
    const pageToken = payload.next_page_token;
    let pagePayload = null;

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      await delay(attempt === 1 ? 3200 : 1800);
      try {
        pagePayload = await googleFetch('textsearch', { pagetoken: pageToken });
        break;
      } catch (error) {
        if (error.googleStatus !== 'INVALID_REQUEST' || attempt === 5) throw error;
      }
    }

    payload = pagePayload;
    pages.push(payload);
  }

  return pages;
};

const googlePlacesNewTextSearch = async ({ textQuery, location, radiusMeters, pageToken }) => {
  const apiKey = getGoogleApiKey();
  if (!apiKey) throw new Error('GOOGLE_PLACES_API_KEY is not configured');

  const body = {
    textQuery,
    pageSize: 20,
  };

  if (pageToken) body.pageToken = pageToken;

  const center = parseLatLng(location);
  if (center && radiusMeters) {
    body.locationBias = {
      circle: {
        center,
        radius: Math.min(Number(radiusMeters), 50000),
      },
    };
  }

  const response = await fetch(`${GOOGLE_PLACES_NEW_API_BASE}/places:searchText`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': [
        'places.id',
        'places.displayName',
        'places.formattedAddress',
        'places.rating',
        'places.userRatingCount',
        'places.types',
        'nextPageToken',
      ].join(','),
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json();
  if (!response.ok) {
    const message = payload?.error?.message || `Google Places text search failed: ${response.status}`;
    const error = new Error(message);
    error.googleStatus = payload?.error?.status;
    throw error;
  }

  return payload;
};

const mapPlacesNewSearchResult = (place = {}) => ({
  place_id: place.id,
  name: place.displayName?.text || '',
  formatted_address: place.formattedAddress || '',
  rating: place.rating ?? null,
  user_ratings_total: place.userRatingCount ?? null,
  types: place.types || [],
});

const googlePlacesNewTextSearchPages = async ({ query, location, radiusMeters }, maxPages = 3) => {
  const pages = [];
  let payload = await googlePlacesNewTextSearch({ textQuery: query, location, radiusMeters });
  pages.push({ results: (payload.places || []).map(mapPlacesNewSearchResult) });

  for (let page = 1; page < maxPages && payload.nextPageToken; page += 1) {
    const pageToken = payload.nextPageToken;
    let pagePayload = null;

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      await delay(attempt === 1 ? 2200 : 1600);
      try {
        pagePayload = await googlePlacesNewTextSearch({
          textQuery: query,
          location,
          radiusMeters,
          pageToken,
        });
        break;
      } catch (error) {
        if (error.googleStatus !== 'INVALID_ARGUMENT' || attempt === 5) throw error;
      }
    }

    payload = pagePayload;
    pages.push({ results: (payload.places || []).map(mapPlacesNewSearchResult) });
  }

  return pages;
};

const normalizeWebsiteUrl = (website) => {
  const raw = normalizeString(website);
  if (!raw) return null;
  try {
    return new URL(raw.startsWith('http') ? raw : `https://${raw}`);
  } catch {
    return null;
  }
};

const SOCIAL_RESEARCH_HOSTS = [
  'facebook.com',
  'instagram.com',
  'linkedin.com',
  'x.com',
  'twitter.com',
  'tiktok.com',
  'youtube.com',
  'yelp.com',
];

const isUnsupportedResearchHost = (url) => {
  const host = String(url?.hostname || '').replace(/^www\./, '').toLowerCase();
  return SOCIAL_RESEARCH_HOSTS.some((blocked) => host === blocked || host.endsWith(`.${blocked}`));
};

const decodeHtmlEntities = (value = '') => String(value)
  .replace(/&#64;|&commat;/gi, '@')
  .replace(/&#46;|&period;/gi, '.')
  .replace(/&amp;/gi, '&');

const cleanEmailCandidate = (email) => normalizeString(email)
  .toLowerCase()
  .replace(/^mailto:/, '')
  .replace(/[?].*$/, '')
  .replace(/^[^a-z0-9]+|[^a-z0-9.]+$/gi, '');

const isUsefulEmail = (email) => {
  if (!email || !email.includes('@')) return false;
  const lower = email.toLowerCase();
  return ![
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.webp',
    '.svg',
    'example.com',
    'sentry.io',
    'wixpress.com',
    'shopify.com',
    'wordpress.com',
  ].some((blocked) => lower.includes(blocked));
};

const extractEmailsFromHtml = (html = '') => {
  const decoded = decodeHtmlEntities(html);
  const emails = new Set();
  const mailtoRegex = /mailto:([^"'<>\s?]+)/gi;
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  for (const match of decoded.matchAll(mailtoRegex)) {
    const email = cleanEmailCandidate(match[1]);
    if (isUsefulEmail(email)) emails.add(email);
  }
  for (const match of decoded.matchAll(emailRegex)) {
    const email = cleanEmailCandidate(match[0]);
    if (isUsefulEmail(email)) emails.add(email);
  }
  return [...emails];
};

const extractVisibleWebsiteText = (html = '') => decodeHtmlEntities(html)
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
  .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const includesAny = (text, patterns) => patterns.some((pattern) => pattern.test(text));

const buildWebsiteSignals = (text = '') => {
  const normalized = text.toLowerCase();
  const inHouseDetection = detectInHouseStrength(normalized);
  const outsourcingEvidence = includesAny(normalized, [/\bsend out\b/, /\bsent out\b/, /\bsend it off\b/, /\bsent it off\b/, /\boff-?site\b/, /\bpartner jeweler\b/, /\bhandled by partner\b/, /\boutsourc/]);
  const timeEstimateMentioned = includesAny(normalized, [/\b\d+\s*-\s*\d+\s*(business\s*)?days\b/, /\b\d+\s*-\s*\d+\s*weeks\b/, /\bweeks?\b/, /\b7\s*-\s*10\s*days\b/]);
  const vagueRepairMention = includesAny(normalized, [/\bwe offer repair\b/, /\brepair services available\b/, /\bask us about repair\b/]) && !inHouseDetection.hasStrongInHouse;
  return {
    jewelryMentioned: includesAny(normalized, [/\bjewel/, /\bdiamond/, /\bgold/, /\bring/, /\bbridal/, /\bengagement/]),
    repairMentioned: includesAny(normalized, [/\brepair/, /\bfix/, /\bbench jeweler/, /\bsizing/, /\bstone setting/, /\bwatch battery/]),
    refurbishmentMentioned: includesAny(normalized, [/\brefurb/, /\brestore/, /\brestoration/, /\bpolish/, /\bcleaning/, /\bpre-owned/, /\bpreowned/, /\bestate jewelry/, /\bused jewelry/]),
    pawnMentioned: includesAny(normalized, [/\bpawn/, /\bcollateral loan/, /\bcash loan/]),
    goldBuyingMentioned: includesAny(normalized, [/\bbuy gold/, /\bcash for gold/, /\bgold buyer/, /\bscrap gold/]),
    inHouseRepairMentioned: inHouseDetection.inHouseRepairStrength > 0,
    strongInHouseRepairMentioned: inHouseDetection.hasStrongInHouse,
    inHouseRepairStrength: inHouseDetection.inHouseRepairStrength,
    staffJewelerMentioned: Boolean(inHouseDetection.staffSignal),
    outsourcingEvidence,
    timeEstimateMentioned,
    vagueRepairMention,
    manualSystemOpportunity: includesAny(normalized, [/\bpaper/, /\benvelope/, /\bmanual/, /\bdrop off/, /\bintake/, /\btracking/, /\bticket/]),
  };
};

const buildRepairTextSignals = (text = '') => {
  const normalized = String(text || '').toLowerCase();
  return {
    jewelryMentioned: includesAny(normalized, [/\bjewel/, /\bdiamond/, /\bgold/, /\bring/, /\bbridal/, /\bengagement/]),
    repairMentioned: includesAny(normalized, [/\brepair/, /\bfix/, /\bchain repair/, /\bring sizing/, /\bresizing/, /\bsizing/, /\bstone setting/, /\bwatch battery/, /\bwatch repair/]),
    refurbishmentMentioned: includesAny(normalized, [/\brefurb/, /\brestore/, /\brestoration/, /\bpolish/, /\bcleaning/, /\bcleaned/, /\bpre-owned/, /\bpreowned/, /\bestate jewelry/, /\bused jewelry/]),
    ownerJewelerMentioned: includesAny(normalized, [/\bowner[^.!?]{0,80}\bjeweler/, /\bjeweler[^.!?]{0,80}\bowner/, /\bmaster jeweler/, /\bbench jeweler/, /\bgoldsmith/]),
    chainRepairMentioned: includesAny(normalized, [/\bchain repair/, /\brepaired my chain/, /\bfixed my chain/, /\bnecklace repair/]),
    ringSizingMentioned: includesAny(normalized, [/\bring sizing/, /\bresized my ring/, /\bring resized/, /\bsized my ring/]),
    watchRepairMentioned: includesAny(normalized, [/\bwatch repair/, /\bwatch battery/, /\brepaired my watch/]),
    stoneSettingMentioned: includesAny(normalized, [/\bstone setting/, /\bset my stone/, /\bstone reset/, /\bprong/]),
    repeatIssueMentioned: includesAny(normalized, [/\bbroke again/, /\bcame loose again/, /\bfell out again/]),
    outsourcingEvidence: includesAny(normalized, [/\bsent it off/, /\bsend it off/, /\bhad to send/, /\bthey ship it/, /\boff-?site/, /\bsent out/]),
    turnaroundComplaint: includesAny(normalized, [/\btook weeks/, /\bweeks to repair/, /\btook too long/, /\blong wait/, /\bdelayed/, /\bstill waiting/, /\bsent it off/, /\bsend it off/, /\bshipped.*repair/]),
  };
};

const summarizeGoogleReviews = (reviews = []) => {
  const normalizedReviews = reviews
    .map((review) => ({
      authorName: review.authorName || review.author_name || '',
      rating: review.rating ?? null,
      relativeTimeDescription: review.relativeTimeDescription || review.relative_time_description || '',
      text: normalizeString(review.text).slice(0, 1000),
      time: review.time instanceof Date
        ? review.time
        : review.time
          ? new Date(typeof review.time === 'number' ? review.time * 1000 : review.time)
          : null,
    }))
    .filter((review) => review.text);
  const snippets = normalizedReviews
    .map((review) => normalizeString(review.text || review.relativeTimeDescription || ''))
    .filter(Boolean)
    .slice(0, 5)
    .map((text) => text.slice(0, 450));
  const combinedText = snippets.join(' ');
  const reviewTruthSignals = extractReviewSignals(normalizedReviews);
  const textSignals = buildRepairTextSignals(combinedText);
  return {
    reviews: normalizedReviews.slice(0, 5),
    snippets,
    summary: snippets.join(' ').slice(0, 1200),
    signals: {
      ...textSignals,
      repairVolume: reviewTruthSignals.repairVolume,
      repairMentions: reviewTruthSignals.repairMentions,
      outsourcingEvidence: textSignals.outsourcingEvidence || reviewTruthSignals.outsourcingEvidence,
      turnaroundComplaint: textSignals.turnaroundComplaint || reviewTruthSignals.turnaroundComplaints,
      repeatIssueMentioned: textSignals.repeatIssueMentioned || reviewTruthSignals.repeatIssues,
      mentionsSpecificRepairs: reviewTruthSignals.mentionsSpecificRepairs,
    },
    truthSignals: reviewTruthSignals,
    checkedAt: new Date(),
  };
};

const buildWebsiteSummary = (pages = [], maxLength = 900) => {
  const snippets = [];
  const signalWords = [
    'pawn',
    'jewel',
    'repair',
    'restore',
    'polish',
    'cleaning',
    'pre-owned',
    'estate',
    'gold',
    'watch',
    'bridal',
    'loan',
    'cash',
    'service',
  ];

  for (const page of pages) {
    const sentences = page.text
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean);
    for (const sentence of sentences) {
      const lower = sentence.toLowerCase();
      if (signalWords.some((word) => lower.includes(word))) snippets.push(sentence.slice(0, 220));
      if (snippets.length >= 10) break;
    }
    if (snippets.length >= 10) break;
  }

  const summary = snippets.join(' ').replace(/\s+/g, ' ').trim();
  if (summary) return summary.slice(0, maxLength);
  return pages.map((page) => page.text).join(' ').replace(/\s+/g, ' ').trim().slice(0, maxLength);
};

const sameHostUrl = (baseUrl, path) => {
  try {
    const nextUrl = new URL(path, baseUrl);
    return nextUrl.hostname === baseUrl.hostname ? nextUrl : null;
  } catch {
    return null;
  }
};

const isSameOrSubHost = (baseUrl, url) => url.hostname === baseUrl.hostname || url.hostname.endsWith(`.${baseUrl.hostname}`);

async function fetchPageText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 EngelFineDesign wholesale lead research',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    const contentType = response.headers.get('content-type') || '';
    if (!response.ok || !contentType.includes('text/html')) return '';
    return response.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchTextUrl(url, { accept = '*/*', timeoutMs = 9000 } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 EngelFineDesign wholesale lead research',
        Accept: accept,
      },
    });
    if (!response.ok) return '';
    return response.text();
  } finally {
    clearTimeout(timeout);
  }
}

const parseRobotsTxt = (robotsText = '') => {
  const sitemapUrls = [];
  const disallowPaths = [];
  for (const line of String(robotsText || '').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const sitemapMatch = trimmed.match(/^sitemap:\s*(.+)$/i);
    if (sitemapMatch) sitemapUrls.push(sitemapMatch[1].trim());
    const disallowMatch = trimmed.match(/^disallow:\s*(.+)$/i);
    if (disallowMatch) {
      const path = disallowMatch[1].trim();
      if (path && path !== '/') disallowPaths.push(path);
    }
  }
  return { sitemapUrls, disallowPaths };
};

async function fetchRobotsTxt(baseUrl) {
  const robotsUrl = new URL('/robots.txt', baseUrl);
  try {
    const robotsText = await fetchTextUrl(robotsUrl.toString(), { accept: 'text/plain,*/*', timeoutMs: 6000 });
    const parsed = parseRobotsTxt(robotsText);
    return {
      url: robotsUrl.toString(),
      found: Boolean(robotsText),
      ...parsed,
    };
  } catch {
    return { url: robotsUrl.toString(), found: false, sitemapUrls: [], disallowPaths: [] };
  }
}

const parseSitemapUrls = (xml = '') => {
  const decoded = decodeHtmlEntities(xml);
  return [...decoded.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)]
    .map((match) => normalizeString(match[1]))
    .filter(Boolean);
};

const normalizeResearchUrl = (baseUrl, value) => {
  try {
    const url = new URL(value, baseUrl);
    url.hash = '';
    return isSameOrSubHost(baseUrl, url) ? url.toString() : '';
  } catch {
    return '';
  }
};

const isLikelyXmlSitemap = (url = '') => /\.xml(\?|$)/i.test(url) || /sitemap/i.test(url);

async function discoverSitemapUrls(baseUrl, robots = null, depth = 0) {
  const candidates = [
    ...(robots?.sitemapUrls || []),
    '/sitemap.xml',
    '/sitemap_index.xml',
    '/wp-sitemap.xml',
  ]
    .map((url) => normalizeResearchUrl(baseUrl, url))
    .filter(Boolean);

  const sitemapUrls = [];
  const pageUrls = [];
  const seenSitemaps = new Set();

  for (const sitemapUrl of [...new Set(candidates)]) {
    if (seenSitemaps.has(sitemapUrl)) continue;
    seenSitemaps.add(sitemapUrl);
    try {
      const xml = await fetchTextUrl(sitemapUrl, { accept: 'application/xml,text/xml,*/*', timeoutMs: 7000 });
      if (!xml) continue;
      sitemapUrls.push(sitemapUrl);
      for (const loc of parseSitemapUrls(xml)) {
        const normalized = normalizeResearchUrl(baseUrl, loc);
        if (!normalized) continue;
        if (isLikelyXmlSitemap(normalized) && depth < 1) {
          const nested = await discoverSitemapUrls(baseUrl, { sitemapUrls: [normalized] }, depth + 1);
          sitemapUrls.push(...nested.sitemapUrls);
          pageUrls.push(...nested.pageUrls);
        } else {
          pageUrls.push(normalized);
        }
      }
    } catch {
      // Sitemap discovery is a quality boost, not a blocker.
    }
  }

  return {
    sitemapUrls: [...new Set(sitemapUrls)],
    pageUrls: [...new Set(pageUrls)],
  };
}

const isDisallowedByRobots = (url, disallowPaths = []) => {
  if (!disallowPaths.length) return false;
  let pathname = '';
  try {
    pathname = new URL(url).pathname || '/';
  } catch {
    return false;
  }
  return disallowPaths.some((path) => {
    if (!path || path === '/') return true;
    const normalized = path.endsWith('*') ? path.slice(0, -1) : path;
    return normalized && pathname.startsWith(normalized);
  });
};

const rankWebsiteResearchUrl = (url = '') => {
  const lower = String(url || '').toLowerCase();
  if (/(cart|checkout|account|login|privacy|terms|policy|shipping|returns|blog|news|category|collections|product|products|cdn|image|jpg|jpeg|png|webp|pdf)(\/|$|-|_|\.)/.test(lower)) return -100;
  let score = 0;
  if (/(jewelry-?repair|repair|repairs|watch-?repair|services?)(\/|$|-|_|\.)/.test(lower)) score += 100;
  if (/(about|team|staff|jewelers?|goldsmith|watchmaker|bench)(\/|$|-|_|\.)/.test(lower)) score += 85;
  if (/(pawn|estate|appraisal|custom|restore|restoration|sizing)(\/|$|-|_|\.)/.test(lower)) score += 45;
  if (lower.endsWith('/')) score += 5;
  return score;
};

const rankedWebsiteResearchUrls = async (baseUrl, fallbackPaths = []) => {
  const robots = await fetchRobotsTxt(baseUrl);
  const sitemap = await discoverSitemapUrls(baseUrl, robots);
  const sitemapTargets = sitemap.pageUrls
    .map((url) => ({ url, score: rankWebsiteResearchUrl(url), source: 'sitemap' }))
    .filter((item) => item.score > 0 && !isDisallowedByRobots(item.url, robots.disallowPaths))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
  const fallbackTargets = fallbackPaths
    .map((path) => sameHostUrl(baseUrl, path)?.toString())
    .filter(Boolean)
    .filter((url) => !isDisallowedByRobots(url, robots.disallowPaths))
    .map((url) => ({ url, score: rankWebsiteResearchUrl(url), source: 'fallback' }));

  const seen = new Set();
  const targets = [];
  for (const target of [...sitemapTargets, ...fallbackTargets]) {
    if (seen.has(target.url)) continue;
    seen.add(target.url);
    targets.push(target);
  }

  return {
    targets,
    robots,
    sitemap,
  };
};

export async function discoverEmailFromWebsite(website) {
  const baseUrl = normalizeWebsiteUrl(website);
  if (!baseUrl) return { email: null, checkedUrls: [], candidates: [] };
  if (isUnsupportedResearchHost(baseUrl)) return { email: null, checkedUrls: [], candidates: [], skippedReason: 'unsupported_social_or_directory_host' };

  const paths = [
    '/',
    '/contact',
    '/contact-us',
    '/about',
    '/about-us',
    '/repair',
    '/services',
  ];
  const checkedUrls = [];
  const candidates = [];

  for (const path of paths) {
    const url = sameHostUrl(baseUrl, path);
    if (!url) continue;
    const href = url.toString();
    if (checkedUrls.includes(href)) continue;
    checkedUrls.push(href);
    try {
      const html = await fetchPageText(href);
      const emails = extractEmailsFromHtml(html);
      for (const email of emails) {
        if (!candidates.includes(email)) candidates.push(email);
      }
      if (candidates.length) break;
    } catch {
      // Keep discovery best-effort; bad websites should not block imports.
    }
  }

  return { email: candidates[0] || null, checkedUrls, candidates };
}

export async function scrapeWholesaleLeadWebsiteResearch(website) {
  const baseUrl = normalizeWebsiteUrl(website);
  if (!baseUrl) return { checkedUrls: [], pages: [], summary: '', signals: {}, checkedAt: new Date() };
  if (isUnsupportedResearchHost(baseUrl)) {
    return {
      checkedUrls: [],
      pages: [],
      summary: '',
      signals: {},
      skippedReason: 'unsupported_social_or_directory_host',
      checkedAt: new Date(),
    };
  }

  const paths = [
    '/services',
    '/repair',
    '/jewelry-repair',
    '/repairs',
    '/jewelry-services',
    '/watch-repair',
    '/about',
    '/about-us',
    '/team',
    '/our-team',
    '/staff',
    '/jewelers',
    '/goldsmith',
    '/',
    '/pawn',
    '/contact',
    '/contact-us',
  ];
  const discovery = await rankedWebsiteResearchUrls(baseUrl, paths);
  const checkedUrls = [];
  const pages = [];

  for (const target of discovery.targets) {
    const href = target.url;
    if (checkedUrls.includes(href)) continue;
    checkedUrls.push(href);
    try {
      const html = await fetchPageText(href);
      const text = extractVisibleWebsiteText(html);
      if (text) {
        pages.push({
          url: href,
          source: target.source,
          title: normalizeString(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]).slice(0, 120),
          text: text.slice(0, 3500),
        });
      }
    } catch {
      // Website research is best-effort; one bad path should not block scoring.
    }
    if (pages.length >= 5) break;
  }

  const combinedText = pages.map((page) => page.text).join(' ');
  const signals = buildWebsiteSignals(combinedText);
  const inHouseDetection = detectInHouseStrength(combinedText);
  return {
    checkedUrls,
    robots: {
      url: discovery.robots.url,
      found: discovery.robots.found,
      sitemapUrls: discovery.robots.sitemapUrls,
      disallowPaths: discovery.robots.disallowPaths.slice(0, 20),
    },
    sitemap: {
      sitemapUrls: discovery.sitemap.sitemapUrls,
      discoveredPageCount: discovery.sitemap.pageUrls.length,
      selectedPageUrls: discovery.targets.filter((target) => target.source === 'sitemap').map((target) => target.url),
    },
    pages: pages.map((page) => ({ url: page.url, source: page.source, title: page.title, textSnippet: page.text.slice(0, 900) })),
    summary: buildWebsiteSummary(pages),
    signals: {
      ...signals,
      inHouseDetection,
    },
    checkedAt: new Date(),
  };
}

async function hydrateLeadWebsiteResearch(collection, lead, actor) {
  if (!lead?.website) return lead;
  if ((lead.websiteResearch?.summary || lead.websiteSummary) && (lead.websiteResearch?.robots || lead.websiteResearch?.sitemap || lead.websiteResearch?.skippedReason)) return lead;

  const research = await scrapeWholesaleLeadWebsiteResearch(lead.website);
  const inHouseStrength = Number(research.signals?.inHouseRepairStrength || research.signals?.inHouseDetection?.inHouseRepairStrength || 0);
  const patch = {
    websiteResearch: research,
    websiteSummary: research.summary,
    websiteSignals: research.signals,
    truthSignals: {
      ...(lead.truthSignals || {}),
      strongInHouse: Boolean(lead.truthSignals?.strongInHouse || research.signals?.strongInHouseRepairMentioned || inHouseStrength >= 0.8),
    },
    signalBreakdown: {
      ...(lead.signalBreakdown || {}),
      inHouseDetected: Boolean(lead.signalBreakdown?.inHouseDetected || research.signals?.strongInHouseRepairMentioned || inHouseStrength >= 0.8),
      inHouseRepairStrength: Math.max(Number(lead.signalBreakdown?.inHouseRepairStrength || 0), inHouseStrength),
      websiteOutsourcingDetected: Boolean(research.signals?.outsourcingEvidence),
      websiteVagueRepairMention: Boolean(research.signals?.vagueRepairMention),
      websiteTimeEstimateMentioned: Boolean(research.signals?.timeEstimateMentioned),
    },
    websiteResearchCheckedAt: research.checkedAt,
    updatedAt: new Date(),
    updatedBy: actor || null,
  };
  await collection.updateOne(
    objectIdFilter(lead._id?.toString() || lead.leadId),
    {
      $set: patch,
      $push: {
        activity: buildActivity({
          type: 'website_research',
          message: research.summary ? 'Website research captured for scoring' : 'Website research found no usable page text',
          actor,
          metadata: { checkedUrls: research.checkedUrls, signals: research.signals },
        }),
      },
    },
  );
  return { ...lead, ...patch };
}

async function hydrateLeadGoogleReviewResearch(collection, lead, actor) {
  if (!lead?.googlePlaceId) return lead;
  if (lead.googleReviewResearch?.summary || lead.googleReviewSummary) return lead;

  if (lead.googleReviews?.length) {
    const googleReviewResearch = summarizeGoogleReviews(lead.googleReviews);
    const patch = {
      googleReviewResearch,
      googleReviewSummary: googleReviewResearch.summary,
      googleReviewSignals: googleReviewResearch.signals,
      truthSignals: {
        ...(lead.truthSignals || {}),
        outsourcingEvidence: Boolean(lead.truthSignals?.outsourcingEvidence || googleReviewResearch.truthSignals.outsourcingEvidence),
        turnaroundComplaints: Boolean(lead.truthSignals?.turnaroundComplaints || googleReviewResearch.truthSignals.turnaroundComplaints),
        repairVolume: Math.max(Number(lead.truthSignals?.repairVolume || 0), Number(googleReviewResearch.truthSignals.repairVolume || 0)),
        repeatIssues: Boolean(lead.truthSignals?.repeatIssues || googleReviewResearch.truthSignals.repeatIssues),
        mentionsSpecificRepairs: Boolean(lead.truthSignals?.mentionsSpecificRepairs || googleReviewResearch.truthSignals.mentionsSpecificRepairs),
      },
      googleReviewCheckedAt: googleReviewResearch.checkedAt,
      updatedAt: new Date(),
      updatedBy: actor || null,
    };
    await collection.updateOne(
      objectIdFilter(lead._id?.toString() || lead.leadId),
      { $set: patch },
    );
    return { ...lead, ...patch };
  }

  const detailsPayload = await googleFetch('details', {
    place_id: lead.googlePlaceId,
    fields: 'reviews,rating,user_ratings_total',
  });
  const googleReviewResearch = summarizeGoogleReviews(detailsPayload.result?.reviews || []);
  const patch = {
    googleReviews: googleReviewResearch.reviews,
    googleReviewResearch,
    googleReviewSummary: googleReviewResearch.summary,
    googleReviewSignals: googleReviewResearch.signals,
    truthSignals: {
      ...(lead.truthSignals || {}),
      outsourcingEvidence: Boolean(lead.truthSignals?.outsourcingEvidence || googleReviewResearch.truthSignals.outsourcingEvidence),
      turnaroundComplaints: Boolean(lead.truthSignals?.turnaroundComplaints || googleReviewResearch.truthSignals.turnaroundComplaints),
      repairVolume: Math.max(Number(lead.truthSignals?.repairVolume || 0), Number(googleReviewResearch.truthSignals.repairVolume || 0)),
      repeatIssues: Boolean(lead.truthSignals?.repeatIssues || googleReviewResearch.truthSignals.repeatIssues),
      mentionsSpecificRepairs: Boolean(lead.truthSignals?.mentionsSpecificRepairs || googleReviewResearch.truthSignals.mentionsSpecificRepairs),
    },
    googleReviewCheckedAt: googleReviewResearch.checkedAt,
    googleRating: detailsPayload.result?.rating ?? lead.googleRating ?? null,
    googleReviewCount: detailsPayload.result?.user_ratings_total ?? lead.googleReviewCount ?? null,
    updatedAt: new Date(),
    updatedBy: actor || null,
  };

  await collection.updateOne(
    objectIdFilter(lead._id?.toString() || lead.leadId),
    {
      $set: patch,
      $push: {
        activity: buildActivity({
          type: 'google_reviews',
          message: googleReviewResearch.summary ? 'Google review snippets captured for scoring' : 'Google reviews found no usable snippets',
          actor,
          metadata: { signals: googleReviewResearch.signals },
        }),
      },
    },
  );
  return { ...lead, ...patch };
}

async function getSearchCenter() {
  const placeId = process.env.NEXT_PUBLIC_GOOGLE_PLACE_ID;
  if (!placeId) throw new Error('NEXT_PUBLIC_GOOGLE_PLACE_ID is not configured');
  const details = await googleFetch('details', {
    place_id: placeId,
    fields: 'geometry,name',
  });
  const location = details.result?.geometry?.location;
  if (!location?.lat || !location?.lng) throw new Error('Could not resolve EFD Google Place ID location');
  return `${location.lat},${location.lng}`;
}

const mapGoogleLead = (place, details = {}, efdCoordinates = null) => {
  const addressComponents = details.address_components || [];
  const getComponent = (type) => addressComponents.find((item) => item.types?.includes(type))?.short_name || '';
  const city = getComponent('locality') || getComponent('postal_town') || getComponent('administrative_area_level_3');
  const state = getComponent('administrative_area_level_1');
  const zip = getComponent('postal_code');
  const coordinates = details.geometry?.location
    ? { latitude: details.geometry.location.lat, longitude: details.geometry.location.lng }
    : null;
  const googleReviewResearch = summarizeGoogleReviews(details.reviews || []);
  return {
    storeName: details.name || place.name,
    phone: details.formatted_phone_number || null,
    website: details.website || null,
    address: details.formatted_address || place.formatted_address || place.vicinity || null,
    city: city || null,
    state: state || null,
    zip: zip || null,
    googlePlaceId: place.place_id,
    googleRating: details.rating ?? place.rating ?? null,
    googleReviewCount: details.user_ratings_total ?? place.user_ratings_total ?? null,
    googleBusinessTypes: details.types || place.types || [],
    googleUrl: details.url || null,
    googleReviews: (details.reviews || []).map((review) => ({
      authorName: review.author_name || '',
      rating: review.rating ?? null,
      relativeTimeDescription: review.relative_time_description || '',
      text: normalizeString(review.text).slice(0, 1000),
      time: review.time ? new Date(review.time * 1000) : null,
    })),
    googleReviewResearch,
    googleReviewSummary: googleReviewResearch.summary,
    googleReviewSignals: googleReviewResearch.signals,
    truthSignals: {
      outsourcingEvidence: googleReviewResearch.truthSignals.outsourcingEvidence,
      turnaroundComplaints: googleReviewResearch.truthSignals.turnaroundComplaints,
      repairVolume: googleReviewResearch.truthSignals.repairVolume,
      repeatIssues: googleReviewResearch.truthSignals.repeatIssues,
      mentionsSpecificRepairs: googleReviewResearch.truthSignals.mentionsSpecificRepairs,
      strongInHouse: false,
    },
    signalBreakdown: {
      inHouseDetected: false,
      inHouseRepairStrength: 0,
      outsourcingDetected: googleReviewResearch.truthSignals.outsourcingEvidence,
      reviewRepairVolume: googleReviewResearch.truthSignals.repairVolume,
      turnaroundIssues: googleReviewResearch.truthSignals.turnaroundComplaints,
      repeatIssues: googleReviewResearch.truthSignals.repeatIssues,
    },
    googleReviewCheckedAt: googleReviewResearch.checkedAt,
    latitude: coordinates?.latitude ?? null,
    longitude: coordinates?.longitude ?? null,
    distanceMiles: distanceMilesBetween(efdCoordinates, coordinates),
            source: 'google_places',
            sourceType: 'prospect',
  };
};

export async function importGoogleWholesaleLeads({
  queries = DEFAULT_SEARCH_QUERIES,
  searchLocations = DEFAULT_SEARCH_LOCATIONS,
  radiusMeters = DEFAULT_RADIUS_METERS,
  autoScore = true,
  minImportScore = DEFAULT_IMPORT_MIN_SCORE,
  maxCandidates = DEFAULT_IMPORT_MAX_CANDIDATES,
  discoverEmails = DEFAULT_DISCOVER_EMAILS,
  onProgress = null,
} = {}, actor) {
  const collection = await getLeadsCollection();
  const normalizedLocations = Array.isArray(searchLocations)
    ? searchLocations.map(normalizeString).filter(Boolean)
    : [];
  const searchLocationList = normalizedLocations.length ? [...new Set(normalizedLocations)] : DEFAULT_SEARCH_LOCATIONS;
  const useLocalCenter = searchLocationList.length === 1 && !searchLocationList[0];
  const location = useLocalCenter ? await getSearchCenter() : null;
  const radiusLimitMiles = useLocalCenter && Number(radiusMeters) > 0
    ? Number(radiusMeters) / METERS_PER_MILE
    : null;
  let efdCoordinates = parseLatLng(location);
  if (!efdCoordinates) {
    try {
      efdCoordinates = parseLatLng(await getSearchCenter());
    } catch {
      efdCoordinates = null;
    }
  }
  const imported = [];
  const duplicates = [];
  const notFit = [];
  const scoringErrors = [];
  const searchErrors = [];
  const detailErrors = [];
  const emailDiscoveries = [];
  const outOfRadius = [];
  const seenPlaceIds = new Set();
  let processedCandidates = 0;
  const updateProgress = async (patch = {}) => {
    if (typeof onProgress === 'function') {
      await onProgress({
        processedCandidates,
        saved: imported.length,
        duplicates: duplicates.length,
        rejected: notFit.length,
        notFit: notFit.length,
        scoringErrors: scoringErrors.length,
        searchErrors: searchErrors.length,
        detailErrors: detailErrors.length,
        emailDiscoveries: emailDiscoveries.length,
        outOfRadius: outOfRadius.length,
        ...patch,
      });
    }
  };

  for (const searchLocation of searchLocationList) {
    if (processedCandidates >= maxCandidates) break;

    for (const query of queries.length ? queries : DEFAULT_SEARCH_QUERIES) {
      if (processedCandidates >= maxCandidates) break;
      const effectiveQuery = searchLocation ? `${query} ${searchLocation}` : query;
      await updateProgress({ phase: 'searching', currentQuery: effectiveQuery });

      let searchPages = [];
      try {
        searchPages = await googlePlacesNewTextSearchPages({
          query: effectiveQuery,
          location,
          radiusMeters: useLocalCenter ? radiusMeters : undefined,
        });
      } catch (error) {
        searchErrors.push({ query: effectiveQuery, error: error.message });
        await updateProgress({ phase: 'search_failed', currentQuery: effectiveQuery, currentCandidate: error.message });
        continue;
      }

      for (const searchPayload of searchPages) {
        for (const place of searchPayload.results || []) {
          if (processedCandidates >= maxCandidates) break;
          if (!place.place_id || seenPlaceIds.has(place.place_id)) continue;
          seenPlaceIds.add(place.place_id);

          const existingByPlace = await collection.findOne({ googlePlaceId: place.place_id });
          if (existingByPlace) {
            duplicates.push(serializeLead(existingByPlace));
            await updateProgress({ phase: 'known_place', currentCandidate: place.name || place.place_id });
            continue;
          }

          processedCandidates += 1;
          await updateProgress({ phase: 'fetching_details', currentCandidate: place.name || place.place_id });

          let detailsPayload = null;
          try {
            detailsPayload = await googleFetch('details', {
              place_id: place.place_id,
              fields: 'name,formatted_address,address_component,formatted_phone_number,website,rating,user_ratings_total,type,url,geometry,reviews',
            });
          } catch (error) {
            detailErrors.push({ placeId: place.place_id, storeName: place.name || '', error: error.message });
            await updateProgress({ phase: 'detail_failed', currentCandidate: place.name || place.place_id });
            continue;
          }

          const leadPayload = mapGoogleLead(place, detailsPayload.result || {}, efdCoordinates);
          if (radiusLimitMiles !== null) {
            const distanceMiles = Number(leadPayload.distanceMiles);
            if (!Number.isFinite(distanceMiles) || distanceMiles > radiusLimitMiles) {
              outOfRadius.push({
                placeId: place.place_id,
                storeName: leadPayload.storeName || place.name || '',
                address: leadPayload.address || '',
                distanceMiles: Number.isFinite(distanceMiles) ? distanceMiles : null,
                radiusMiles: radiusLimitMiles,
              });
              await updateProgress({
                phase: 'outside_radius',
                currentCandidate: `${leadPayload.storeName || place.name || place.place_id}${Number.isFinite(distanceMiles) ? ` (${distanceMiles.toFixed(1)} mi)` : ''}`,
              });
              continue;
            }
          }
          const lead = {
            ...leadPayload,
            leadId: `WLEAD-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            status: 'new',
            contactName: null,
            contactTitle: null,
            email: null,
            fitScore: null,
            scoreSource: null,
            aiScore: null,
            aiConfidence: null,
            aiSummary: '',
            likelyRepairNeed: '',
            aiConcerns: [],
            recommendedOutreachAngle: '',
            outreachDraft: null,
            websiteResearch: null,
            websiteSummary: '',
            websiteSignals: {},
            websiteResearchCheckedAt: null,
            notes: '',
            nextFollowUpAt: null,
            lastContactedAt: null,
            shippingRequired: false,
            preferredCarrier: null,
            shippingNotes: '',
            estimatedMonthlyRepairs: null,
            invitedApplicationEmail: null,
            inviteSentAt: null,
            linkedUserId: null,
            linkedWholesaleApplicationId: null,
            linkedWholesalerUserId: null,
            normalizedName: normalizeLeadKey(leadPayload.storeName),
            normalizedAddress: normalizeLeadKey(leadPayload.address),
            searchLocation: searchLocation || null,
            activity: [buildActivity({ type: 'imported', message: `Imported from Google Places search: ${effectiveQuery}`, actor })],
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: actor || null,
            updatedBy: actor || null,
          };

          const duplicate = await findDuplicateLead(collection, lead);
          if (duplicate) {
            duplicates.push(serializeLead(duplicate));
            await updateProgress({ phase: 'duplicate', currentCandidate: lead.storeName });
            continue;
          }

          if (lead.website) {
            try {
              await updateProgress({ phase: 'website_research', currentCandidate: lead.storeName });
              const research = await scrapeWholesaleLeadWebsiteResearch(lead.website);
              lead.websiteResearch = research;
              lead.websiteSummary = research.summary;
              lead.websiteSignals = research.signals;
              lead.websiteResearchCheckedAt = research.checkedAt;
              lead.activity.push(buildActivity({
                type: 'website_research',
                message: research.summary ? 'Website research captured for scoring' : 'Website research found no usable page text',
                actor,
                metadata: { checkedUrls: research.checkedUrls, signals: research.signals },
              }));
            } catch {
              // Keep import moving if a website blocks scraping.
            }
          }

          if (autoScore) {
            try {
              await updateProgress({ phase: 'scoring', currentCandidate: lead.storeName });
              const scoreUpdate = await evaluateWholesaleLead(lead);
              const isNotFit = Number(scoreUpdate.fitScore) < Number(minImportScore);
              Object.assign(lead, {
                ...scoreUpdate,
                status: isNotFit ? 'not_fit' : scoreUpdate.status,
                sourceType: isNotFit ? 'not_fit' : scoreUpdate.sourceType,
                activity: [
                  ...lead.activity,
                  buildActivity({
                    type: 'ai_score',
                    message: `AI fit score set to ${scoreUpdate.fitScore}`,
                    actor,
                    metadata: { model: GEMINI_MODEL, minImportScore },
                  }),
                ],
              });
              if (isNotFit) notFit.push(serializeLead(lead));
            } catch (error) {
              scoringErrors.push({ storeName: lead.storeName, error: error.message });
              Object.assign(lead, {
                status: 'researching',
                sourceType: 'prospect',
                scoreSource: 'score_error',
                scoreError: error.message,
                activity: [
                  ...lead.activity,
                  buildActivity({
                    type: 'score_failed',
                    message: `Scoring failed: ${error.message}`,
                    actor,
                    metadata: { model: GEMINI_MODEL },
                  }),
                ],
              });
              await updateProgress({ phase: 'score_failed_saved_unscored', currentCandidate: lead.storeName });
            }
          }

          if (discoverEmails && lead.website && lead.status !== 'not_fit') {
            await updateProgress({ phase: 'finding_email', currentCandidate: lead.storeName });
            const discovery = await discoverEmailFromWebsite(lead.website);
            if (discovery.email) {
              lead.email = discovery.email;
              lead.emailSource = 'website_scrape';
              lead.emailDiscovery = discovery;
              lead.activity.push(buildActivity({
                type: 'email_found',
                message: `Found email ${discovery.email} from website`,
                actor,
                metadata: { checkedUrls: discovery.checkedUrls },
              }));
              emailDiscoveries.push({ storeName: lead.storeName, email: discovery.email });
            }
          }

          const result = await collection.insertOne(lead);
          imported.push(serializeLead({ ...lead, _id: result.insertedId }));
          await updateProgress({ phase: lead.status === 'not_fit' ? 'saved_not_fit' : 'saved', currentCandidate: lead.storeName });
        }
      }
    }
  }

  await buildProfiles();

  return {
    imported,
    duplicates,
    rejected: notFit,
    notFit,
    scoringErrors,
    searchErrors,
    detailErrors,
    emailDiscoveries,
    outOfRadius,
    searchedQueries: queries,
    searchLocations: searchLocationList,
    radiusMeters,
    autoScore,
    minImportScore,
    maxCandidates,
    discoverEmails,
    processedCandidates,
  };
}

export async function createWholesaleImportJob(options = {}, actor) {
  const jobs = await getImportJobsCollection();
  const now = new Date();
  const job = {
    type: 'google_places_import',
    status: 'queued',
    phase: 'queued',
    options,
    progress: {
      processedCandidates: 0,
      saved: 0,
      duplicates: 0,
      rejected: 0,
      scoringErrors: 0,
      searchErrors: 0,
      detailErrors: 0,
      emailDiscoveries: 0,
      outOfRadius: 0,
    },
    result: null,
    error: null,
    currentQuery: '',
    currentCandidate: '',
    createdBy: actor || null,
    createdAt: now,
    updatedAt: now,
    startedAt: null,
    finishedAt: null,
  };
  const result = await jobs.insertOne(job);
  return serializeJob({ ...job, _id: result.insertedId });
}

export async function getWholesaleImportJob(jobId) {
  const jobs = await getImportJobsCollection();
  const job = await jobs.findOne(objectIdFilter(jobId));
  return job ? serializeJob(job) : null;
}

export async function getLatestWholesaleImportJob() {
  const jobs = await getImportJobsCollection();
  const job = await jobs.findOne({}, { sort: { createdAt: -1 } });
  return job ? serializeJob(job) : null;
}

export async function claimNextQueuedWholesaleImportJob(workerId = 'wholesale-import-worker') {
  const jobs = await getImportJobsCollection();
  const now = new Date();
  const result = await jobs.findOneAndUpdate(
    { type: 'google_places_import', status: 'queued' },
    {
      $set: {
        status: 'running',
        phase: 'claimed',
        workerId,
        claimedAt: now,
        updatedAt: now,
      },
    },
    {
      sort: { createdAt: 1 },
      returnDocument: 'after',
    },
  );
  return result ? serializeJob(result) : null;
}

export async function cancelWholesaleImportJob(jobId, actor) {
  const jobs = await getImportJobsCollection();
  const now = new Date();
  const result = await jobs.updateOne(
    { ...objectIdFilter(jobId), type: 'google_places_import', status: { $in: ['queued', 'running'] } },
    {
      $set: {
        status: 'cancelled',
        phase: 'cancelled',
        error: null,
        cancelledBy: actor || null,
        cancelledAt: now,
        finishedAt: now,
        updatedAt: now,
      },
    },
  );
  if (!result.matchedCount) return null;
  return getWholesaleImportJob(jobId);
}

export async function runWholesaleImportJob(jobId, actor) {
  const jobs = await getImportJobsCollection();
  const startedAt = new Date();
  await jobs.updateOne(objectIdFilter(jobId), {
    $set: {
      status: 'running',
      phase: 'starting',
      startedAt,
      updatedAt: startedAt,
    },
  });

  try {
    const job = await jobs.findOne(objectIdFilter(jobId));
    const result = await importGoogleWholesaleLeads({
      ...(job?.options || {}),
      onProgress: async (progress) => {
        const currentJob = await jobs.findOne(objectIdFilter(jobId), { projection: { status: 1 } });
        if (currentJob?.status === 'cancelled') {
          throw Object.assign(new Error('Import cancelled'), { cancelled: true });
        }
        await jobs.updateOne(objectIdFilter(jobId), {
          $set: {
            status: 'running',
            phase: progress.phase || 'running',
            currentQuery: progress.currentQuery || '',
            currentCandidate: progress.currentCandidate || '',
            progress: {
              processedCandidates: progress.processedCandidates || 0,
              saved: progress.saved || 0,
              duplicates: progress.duplicates || 0,
              rejected: progress.rejected || 0,
              scoringErrors: progress.scoringErrors || 0,
              searchErrors: progress.searchErrors || 0,
              detailErrors: progress.detailErrors || 0,
              emailDiscoveries: progress.emailDiscoveries || 0,
              outOfRadius: progress.outOfRadius || 0,
            },
            updatedAt: new Date(),
          },
        });
      },
    }, actor);

    const finishedAt = new Date();
    await jobs.updateOne(objectIdFilter(jobId), {
      $set: {
        status: 'completed',
        phase: 'completed',
        result,
        progress: {
          processedCandidates: result.processedCandidates || 0,
          saved: result.imported?.length || 0,
          duplicates: result.duplicates?.length || 0,
          rejected: result.rejected?.length || 0,
          scoringErrors: result.scoringErrors?.length || 0,
          searchErrors: result.searchErrors?.length || 0,
          detailErrors: result.detailErrors?.length || 0,
          emailDiscoveries: result.emailDiscoveries?.length || 0,
          outOfRadius: result.outOfRadius?.length || 0,
        },
        currentQuery: '',
        currentCandidate: '',
        finishedAt,
        updatedAt: finishedAt,
      },
    });
  } catch (error) {
    const finishedAt = new Date();
    if (error.cancelled) {
      await jobs.updateOne(objectIdFilter(jobId), {
        $set: {
          status: 'cancelled',
          phase: 'cancelled',
          error: null,
          finishedAt,
          updatedAt: finishedAt,
        },
      });
      return getWholesaleImportJob(jobId);
    }
    await jobs.updateOne(objectIdFilter(jobId), {
      $set: {
        status: 'failed',
        phase: 'failed',
        error: error.message || 'Import failed',
        finishedAt,
        updatedAt: finishedAt,
      },
    });
  }

  return getWholesaleImportJob(jobId);
}

const GEMINI_FEATURE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    has_jewelry: { type: 'BOOLEAN' },
    business_type: { type: 'STRING', enum: ['pawn_shop', 'jewelry_store', 'watch_business', 'bridal_jewelry', 'gold_buyer', 'luxury_retailer', 'unclear'] },
    pawn_signals: { type: 'BOOLEAN' },
    used_inventory_signals: { type: 'BOOLEAN' },
    refurbishment_opportunity: { type: 'BOOLEAN' },
    offers_repair: { type: 'BOOLEAN' },
    repair_capability: { type: 'NUMBER' },
    in_house_repair: { type: 'BOOLEAN' },
    mature_in_house_repair: { type: 'BOOLEAN' },
    manual_process_likelihood: { type: 'NUMBER' },
    process_maturity: { type: 'STRING', enum: ['manual', 'semi', 'digital', 'unknown'] },
    estimated_scale: { type: 'STRING', enum: ['micro', 'small', 'medium', 'large', 'chain', 'unknown'] },
    repair_volume_signal: { type: 'NUMBER' },
    revenue_opportunity: { type: 'NUMBER' },
    sales_friction: { type: 'NUMBER' },
    luxury_brand: { type: 'BOOLEAN' },
    chain_or_multi_location: { type: 'BOOLEAN' },
    outsourcing_evidence: { type: 'BOOLEAN' },
    turnaround_complaints: { type: 'BOOLEAN' },
    review_repair_evidence: { type: 'BOOLEAN' },
    review_owner_jeweler_evidence: { type: 'BOOLEAN' },
    review_service_mentions: { type: 'ARRAY', items: { type: 'STRING' } },
    contact_quality: { type: 'NUMBER' },
    confidence: { type: 'NUMBER' },
    summary: { type: 'STRING' },
    likely_repair_need: { type: 'STRING' },
    concerns: { type: 'ARRAY', items: { type: 'STRING' } },
    recommended_outreach_angle: { type: 'STRING' },
  },
  required: [
    'has_jewelry',
    'business_type',
    'pawn_signals',
    'used_inventory_signals',
    'refurbishment_opportunity',
    'offers_repair',
    'repair_capability',
    'in_house_repair',
    'mature_in_house_repair',
    'manual_process_likelihood',
    'process_maturity',
    'estimated_scale',
    'repair_volume_signal',
    'revenue_opportunity',
    'sales_friction',
    'luxury_brand',
    'chain_or_multi_location',
    'outsourcing_evidence',
    'turnaround_complaints',
    'review_repair_evidence',
    'review_owner_jeweler_evidence',
    'review_service_mentions',
    'contact_quality',
    'confidence',
    'summary',
    'likely_repair_need',
    'concerns',
    'recommended_outreach_angle',
  ],
  propertyOrdering: [
    'has_jewelry',
    'business_type',
    'pawn_signals',
    'used_inventory_signals',
    'refurbishment_opportunity',
    'offers_repair',
    'repair_capability',
    'in_house_repair',
    'mature_in_house_repair',
    'manual_process_likelihood',
    'process_maturity',
    'estimated_scale',
    'repair_volume_signal',
    'revenue_opportunity',
    'sales_friction',
    'luxury_brand',
    'chain_or_multi_location',
    'outsourcing_evidence',
    'turnaround_complaints',
    'review_repair_evidence',
    'review_owner_jeweler_evidence',
    'review_service_mentions',
    'contact_quality',
    'confidence',
    'summary',
    'likely_repair_need',
    'concerns',
    'recommended_outreach_angle',
  ],
};

const GEMINI_OUTREACH_SCHEMA = {
  type: 'OBJECT',
  properties: {
    subject: { type: 'STRING' },
    emailBody: { type: 'STRING' },
    callOpener: { type: 'STRING' },
    followUpNote: { type: 'STRING' },
    inviteMessage: { type: 'STRING' },
  },
  required: ['subject', 'emailBody', 'callOpener', 'followUpNote', 'inviteMessage'],
  propertyOrdering: ['subject', 'emailBody', 'callOpener', 'followUpNote', 'inviteMessage'],
};

const extractGeminiText = (payload = {}) => {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts.map((part) => String(part?.text || '').trim()).filter(Boolean).join('\n').trim();
};

const parseJsonSafely = (candidate = '') => {
  const text = String(candidate || '').trim();
  if (!text) return null;
  const attempts = [
    text,
    text.replace(/^\uFEFF/, ''),
    text
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2018\u2019]/g, "'"),
  ];

  for (const attempt of attempts) {
    try {
      return JSON.parse(attempt);
    } catch {
      // Try the next normalized candidate.
    }
  }
  return null;
};

const escapeRawLineBreaksInsideStrings = (candidate = '') => {
  let output = '';
  let inString = false;
  let escaped = false;

  for (const char of String(candidate || '')) {
    if (escaped) {
      output += char;
      escaped = false;
      continue;
    }
    if (char === '\\') {
      output += char;
      escaped = true;
      continue;
    }
    if (char === '"') {
      output += char;
      inString = !inString;
      continue;
    }
    if (inString && char === '\n') {
      output += '\\n';
      continue;
    }
    if (inString && char === '\r') {
      output += '\\r';
      continue;
    }
    if (inString && char === '\t') {
      output += '\\t';
      continue;
    }
    output += char;
  }

  return output;
};

const findBalancedJsonObject = (text = '') => {
  const raw = String(text || '');
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === '{') {
      if (depth === 0) start = index;
      depth += 1;
    } else if (char === '}' && depth > 0) {
      depth -= 1;
      if (depth === 0 && start >= 0) return raw.slice(start, index + 1);
    }
  }

  return '';
};

const extractJson = (raw = '') => {
  const text = String(raw || '').trim();
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidates = [
    fencedMatch ? fencedMatch[1] : '',
    text,
    findBalancedJsonObject(fencedMatch ? fencedMatch[1] : text),
  ].filter(Boolean);

  for (const candidate of candidates) {
    const objectCandidate = candidate.trim().startsWith('{') ? candidate : findBalancedJsonObject(candidate);
    const parsed = parseJsonSafely(objectCandidate) || parseJsonSafely(escapeRawLineBreaksInsideStrings(objectCandidate));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
  }
  return null;
};

const callGemini = async (prompt, options = {}) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw Object.assign(new Error('GEMINI_API_KEY is not configured'), { status: 500 });
  const generationConfig = {
    temperature: options.temperature ?? 0,
    topP: options.topP ?? 0.8,
    maxOutputTokens: options.maxOutputTokens || 3000,
    responseMimeType: 'application/json',
    thinkingConfig: { thinkingBudget: 0 },
    ...(options.responseSchema ? { responseSchema: options.responseSchema } : {}),
  };
  const response = await fetch(`${GEMINI_API_BASE}/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig,
    }),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw Object.assign(new Error(payload?.error?.message || 'Gemini request failed'), { status: response.status });
  }
  const finishReason = payload?.candidates?.[0]?.finishReason;
  if (finishReason && !['STOP', 'FINISH_REASON_UNSPECIFIED'].includes(finishReason)) {
    throw Object.assign(new Error(`Gemini response did not complete cleanly: ${finishReason}`), { status: 502, finishReason });
  }
  const text = extractGeminiText(payload);
  const parsed = extractJson(text);
  if (!parsed) {
    throw Object.assign(new Error(`Gemini returned invalid JSON${options.label ? ` for ${options.label}` : ''}`), {
      status: 502,
      finishReason,
      responsePreview: text.slice(0, 500),
    });
  }
  return parsed;
};

const numberFromGemini = (parsed, keys, fallback = null) => {
  for (const key of keys) {
    if (parsed?.[key] === undefined || parsed?.[key] === null || parsed?.[key] === '') continue;
    const value = Number(parsed[key]);
    if (Number.isFinite(value)) return value;
  }
  return fallback;
};

const stringFromGemini = (parsed, keys) => {
  for (const key of keys) {
    const value = normalizeString(parsed?.[key]);
    if (value) return value;
  }
  return '';
};

const inferLeadBusinessHints = (lead = {}) => {
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

const leadPromptContext = (lead) => JSON.stringify({
  storeName: lead.storeName,
  contactName: lead.contactName,
  website: lead.website,
  phone: lead.phone,
  email: lead.email,
  address: lead.address,
  city: lead.city,
  state: lead.state,
  googleRating: lead.googleRating,
  googleReviewCount: lead.googleReviewCount,
  googleBusinessTypes: lead.googleBusinessTypes,
  websiteResearch: {
    summary: lead.websiteSummary || lead.websiteResearch?.summary || '',
    signals: lead.websiteSignals || lead.websiteResearch?.signals || {},
    checkedUrls: lead.websiteResearch?.checkedUrls || [],
  },
  googleReviewResearch: {
    summary: lead.googleReviewSummary || lead.googleReviewResearch?.summary || '',
    signals: lead.googleReviewSignals || lead.googleReviewResearch?.signals || {},
    snippets: lead.googleReviewResearch?.snippets
      || (Array.isArray(lead.googleReviews) ? lead.googleReviews.map((review) => review.text).filter(Boolean).slice(0, 5) : []),
  },
  notes: lead.notes,
  shippingRequired: lead.shippingRequired,
  shippingNotes: lead.shippingNotes,
  businessProfileHints: inferLeadBusinessHints(lead),
}, null, 2);

const getSmtpConfig = () => {
  const host = process.env.SMTP_HOST || process.env.EMAIL_SERVER_HOST;
  const port = Number(process.env.SMTP_PORT || process.env.EMAIL_SERVER_PORT || 587);
  const user = process.env.SMTP_USER || process.env.EMAIL_SERVER_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_SERVER_PASSWORD;
  const from = process.env.WHOLESALE_OUTREACH_FROM || process.env.SMTP_FROM || process.env.EMAIL_FROM || user;
  const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || port === 465;

  if (!host || !user || !pass || !from) {
    throw Object.assign(new Error('SMTP is not configured. Add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM or WHOLESALE_OUTREACH_FROM.'), { status: 500 });
  }

  return { host, port, secure, auth: { user, pass }, from };
};

const createTransporter = () => {
  const { from, ...transportConfig } = getSmtpConfig();
  return { transporter: nodemailer.createTransport(transportConfig), from };
};

const normalizeLeadIds = (leadIds = []) => [...new Set(
  (Array.isArray(leadIds) ? leadIds : [])
    .map((id) => normalizeString(id))
    .filter(Boolean),
)];

const leadIdsQuery = (leadIds = []) => ({
  $or: [
    { leadId: { $in: leadIds } },
    { _id: { $in: leadIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id)) } },
  ],
});

const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));
const clampScore = (value) => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
const boolScore = (value) => (value ? 1 : 0);

const normalizeFeatureExtraction = (parsed = {}) => {
  const processMaturity = ['manual', 'semi', 'digital', 'unknown'].includes(parsed.process_maturity)
    ? parsed.process_maturity
    : 'unknown';
  const estimatedScale = ['micro', 'small', 'medium', 'large', 'chain', 'unknown'].includes(parsed.estimated_scale)
    ? parsed.estimated_scale
    : 'unknown';
  const businessType = ['pawn_shop', 'jewelry_store', 'watch_business', 'bridal_jewelry', 'gold_buyer', 'luxury_retailer', 'unclear'].includes(parsed.business_type)
    ? parsed.business_type
    : 'unclear';

  return {
    has_jewelry: Boolean(parsed.has_jewelry),
    business_type: businessType,
    pawn_signals: Boolean(parsed.pawn_signals),
    used_inventory_signals: Boolean(parsed.used_inventory_signals),
    refurbishment_opportunity: Boolean(parsed.refurbishment_opportunity),
    offers_repair: Boolean(parsed.offers_repair),
    repair_capability: clamp01(parsed.repair_capability),
    in_house_repair: Boolean(parsed.in_house_repair),
    mature_in_house_repair: Boolean(parsed.mature_in_house_repair),
    manual_process_likelihood: clamp01(parsed.manual_process_likelihood),
    process_maturity: processMaturity,
    estimated_scale: estimatedScale,
    repair_volume_signal: clamp01(parsed.repair_volume_signal),
    revenue_opportunity: clamp01(parsed.revenue_opportunity),
    sales_friction: clamp01(parsed.sales_friction),
    luxury_brand: Boolean(parsed.luxury_brand),
    chain_or_multi_location: Boolean(parsed.chain_or_multi_location),
    outsourcing_evidence: Boolean(parsed.outsourcing_evidence),
    turnaround_complaints: Boolean(parsed.turnaround_complaints),
    review_repair_evidence: Boolean(parsed.review_repair_evidence),
    review_owner_jeweler_evidence: Boolean(parsed.review_owner_jeweler_evidence),
    review_service_mentions: Array.isArray(parsed.review_service_mentions)
      ? parsed.review_service_mentions.map(normalizeString).filter(Boolean).slice(0, 8)
      : [],
    contact_quality: clamp01(parsed.contact_quality ?? 0.5),
    confidence: clamp01(parsed.confidence ?? 0.5),
    summary: normalizeString(parsed.summary),
    likely_repair_need: normalizeString(parsed.likely_repair_need),
    concerns: Array.isArray(parsed.concerns) ? parsed.concerns.map(normalizeString).filter(Boolean).slice(0, 8) : [],
    recommended_outreach_angle: normalizeString(parsed.recommended_outreach_angle),
  };
};

const reviewFeaturesFromLead = (lead = {}) => {
  const signals = lead.googleReviewSignals || lead.googleReviewResearch?.signals || summarizeGoogleReviews(lead.googleReviews || []).signals || {};
  const truthSignals = lead.truthSignals || lead.googleReviewResearch?.truthSignals || extractReviewSignals(lead.googleReviews || []);
  const mentions = [];
  if (signals.chainRepairMentioned) mentions.push('chain repair');
  if (signals.ringSizingMentioned) mentions.push('ring sizing');
  if (signals.watchRepairMentioned) mentions.push('watch repair');
  if (signals.stoneSettingMentioned) mentions.push('stone setting');
  if (signals.refurbishmentMentioned) mentions.push('polishing/refurbishment');

  return {
    review_repair_evidence: Boolean(signals.repairMentioned || truthSignals.mentionsSpecificRepairs),
    review_owner_jeweler_evidence: Boolean(signals.ownerJewelerMentioned),
    review_service_mentions: mentions,
    turnaround_complaints: Boolean(signals.turnaroundComplaint || truthSignals.turnaroundComplaints),
    outsourcing_evidence: Boolean(signals.outsourcingEvidence || truthSignals.outsourcingEvidence),
    repair_volume_signal: clamp01(Math.max(Number(signals.repairVolume || 0), Number(truthSignals.repairVolume || 0))),
    repeat_issues: Boolean(signals.repeatIssueMentioned || truthSignals.repeatIssues),
  };
};

const buildLeadTruthSignals = (lead = {}, features = {}) => {
  const websiteSignals = lead.websiteSignals || lead.websiteResearch?.signals || {};
  const reviewTruth = lead.googleReviewResearch?.truthSignals || extractReviewSignals(lead.googleReviews || []);
  const reviewSignals = lead.googleReviewSignals || lead.googleReviewResearch?.signals || {};
  const websiteText = [
    lead.websiteSummary,
    lead.websiteResearch?.summary,
    ...(Array.isArray(lead.websiteResearch?.pages) ? lead.websiteResearch.pages.map((page) => page.textSnippet) : []),
  ].join(' ');
  const inHouseDetection = websiteSignals.inHouseDetection || detectInHouseStrength(websiteText);
  const strongInHouse = Boolean(
    inHouseDetection.hasStrongInHouse
    || websiteSignals.strongInHouseRepairMentioned
    || Number(websiteSignals.inHouseRepairStrength || 0) >= 0.8
    || features.mature_in_house_repair,
  );
  const outsourcingEvidence = Boolean(reviewTruth.outsourcingEvidence || reviewSignals.outsourcingEvidence || websiteSignals.outsourcingEvidence || features.outsourcing_evidence);
  const turnaroundComplaints = Boolean(reviewTruth.turnaroundComplaints || reviewSignals.turnaroundComplaint || features.turnaround_complaints);
  const repairVolume = clamp01(Math.max(Number(reviewTruth.repairVolume || 0), Number(reviewSignals.repairVolume || 0), Number(features.repair_volume_signal || 0)));

  return {
    truthSignals: {
      strongInHouse,
      outsourcingEvidence,
      turnaroundComplaints,
      repairVolume,
      repeatIssues: Boolean(reviewTruth.repeatIssues || reviewSignals.repeatIssueMentioned),
      mentionsSpecificRepairs: Boolean(reviewTruth.mentionsSpecificRepairs || reviewSignals.mentionsSpecificRepairs || features.review_repair_evidence),
    },
    signalBreakdown: {
      inHouseDetected: strongInHouse,
      inHouseRepairStrength: clamp01(Math.max(Number(inHouseDetection.inHouseRepairStrength || 0), Number(websiteSignals.inHouseRepairStrength || 0), features.mature_in_house_repair ? 0.9 : features.in_house_repair ? features.repair_capability : 0)),
      outsourcingDetected: outsourcingEvidence,
      reviewRepairVolume: repairVolume,
      turnaroundIssues: turnaroundComplaints,
      repeatIssues: Boolean(reviewTruth.repeatIssues || reviewSignals.repeatIssueMentioned),
      websiteOutsourcingDetected: Boolean(websiteSignals.outsourcingEvidence),
      websiteVagueRepairMention: Boolean(websiteSignals.vagueRepairMention),
      websiteTimeEstimateMentioned: Boolean(websiteSignals.timeEstimateMentioned),
    },
  };
};

const deterministicFeatureExtraction = (lead = {}, error = null) => {
  const websiteSignals = lead.websiteSignals || lead.websiteResearch?.signals || {};
  const reviewSignals = lead.googleReviewSignals || lead.googleReviewResearch?.signals || summarizeGoogleReviews(lead.googleReviews || []).signals || {};
  const reviewTruth = lead.truthSignals || lead.googleReviewResearch?.truthSignals || extractReviewSignals(lead.googleReviews || []);
  const hints = inferLeadBusinessHints(lead);
  const text = [
    lead.storeName,
    lead.websiteSummary,
    lead.googleReviewSummary,
    lead.notes,
    ...(Array.isArray(lead.googleBusinessTypes) ? lead.googleBusinessTypes : []),
  ].join(' ').toLowerCase();
  const pawnSignals = hints.pawnSignal || websiteSignals.pawnMentioned || /\bpawn|pawnshop|pawn shop/.test(text);
  const jewelrySignal = hints.jewelrySignal || websiteSignals.jewelryMentioned || reviewSignals.jewelryMentioned;
  const repairMentioned = websiteSignals.repairMentioned || reviewSignals.repairMentioned || /\brepair|sizing|resiz|watch battery|stone setting|polish/.test(text);
  const refurbSignal = hints.refurbishmentOpportunity || websiteSignals.refurbishmentMentioned || reviewSignals.refurbishmentMentioned || pawnSignals;
  const usedInventory = pawnSignals || websiteSignals.goldBuyingMentioned || /\bestate|used|pre owned|pre-owned|gold buyer|cash for gold|exchange/.test(text);
  const inHouseStrength = Number(websiteSignals.inHouseRepairStrength || websiteSignals.inHouseDetection?.inHouseRepairStrength || 0);
  const inHouse = websiteSignals.inHouseRepairMentioned || inHouseStrength >= 0.25 || /\bin house|on site|onsite|master jeweler|bench jeweler/.test(text);
  const manualLikelihood = pawnSignals ? 0.75 : repairMentioned ? 0.45 : 0.35;
  const businessType = pawnSignals
    ? 'pawn_shop'
    : hints.watchSignal
      ? 'watch_business'
      : hints.bridalSignal
        ? 'bridal_jewelry'
        : jewelrySignal
          ? 'jewelry_store'
          : 'unclear';

  return normalizeFeatureExtraction({
    has_jewelry: Boolean(jewelrySignal || pawnSignals),
    business_type: businessType,
    pawn_signals: pawnSignals,
    used_inventory_signals: usedInventory,
    refurbishment_opportunity: refurbSignal,
    offers_repair: repairMentioned,
    repair_capability: Math.max(repairMentioned ? (inHouse ? 0.75 : 0.45) : 0, inHouseStrength),
    in_house_repair: inHouse,
    mature_in_house_repair: Boolean((inHouse && /full service|master jeweler|bench jeweler/.test(text)) || websiteSignals.strongInHouseRepairMentioned || inHouseStrength >= 0.8),
    manual_process_likelihood: manualLikelihood,
    process_maturity: websiteSignals.manualSystemOpportunity || pawnSignals ? 'manual' : 'unknown',
    estimated_scale: /locations|since 19|family owned/.test(text) ? 'small' : 'unknown',
    repair_volume_signal: Math.max(Number(reviewTruth.repairVolume || 0), reviewSignals.repairMentioned || repairMentioned ? 0.55 : pawnSignals ? 0.45 : 0.25),
    revenue_opportunity: pawnSignals ? 0.75 : usedInventory ? 0.65 : jewelrySignal ? 0.45 : 0.2,
    sales_friction: Math.max(inHouse ? 0.55 : /fine jewelry|luxury|designer/.test(text) ? 0.55 : 0.25, inHouseStrength >= 0.8 ? 0.9 : 0),
    luxury_brand: /luxury|designer|couture|fine jewelry|rolex|tiffany/.test(text),
    chain_or_multi_location: /locations|national|corporate/.test(text),
    outsourcing_evidence: Boolean(reviewSignals.outsourcingEvidence || reviewTruth.outsourcingEvidence || websiteSignals.outsourcingEvidence),
    turnaround_complaints: Boolean(reviewSignals.turnaroundComplaint || reviewTruth.turnaroundComplaints),
    review_repair_evidence: Boolean(reviewSignals.repairMentioned || reviewTruth.mentionsSpecificRepairs),
    review_owner_jeweler_evidence: reviewSignals.ownerJewelerMentioned,
    review_service_mentions: [
      reviewSignals.chainRepairMentioned ? 'chain repair' : '',
      reviewSignals.ringSizingMentioned ? 'ring sizing' : '',
      reviewSignals.watchRepairMentioned ? 'watch repair' : '',
    ].filter(Boolean),
    contact_quality: lead.email ? 0.9 : lead.phone ? 0.65 : 0.25,
    confidence: 0.45,
    summary: error
      ? `Deterministic fallback score used because Gemini scoring failed: ${error.message}`
      : 'Deterministic fallback score used.',
    likely_repair_need: pawnSignals
      ? 'Pawn/refurbishment repair support and repair intake tracking'
      : repairMentioned
        ? 'Repair overflow or repair process support'
        : 'Potential repair/refurbishment expansion',
    concerns: error ? ['Gemini scoring failed; fallback used'] : [],
    recommended_outreach_angle: pawnSignals
      ? 'Focus on refurbishing jewelry inventory and replacing manual repair tracking.'
      : 'Focus on low-friction repair support and free repair management software.',
  });
};

const scoreWholesaleLeadFeatures = (features) => {
  const reasons = [];
  const penalties = [];
  const truthSignals = features.truthSignals || {};
  const signalBreakdown = features.signalBreakdown || {};

  let opportunity = 0;
  opportunity += boolScore(features.has_jewelry) * 10;
  if (features.has_jewelry) reasons.push('Jewelry relevance found');

  opportunity += boolScore(features.pawn_signals) * 18;
  if (features.pawn_signals) reasons.push('Pawn shop or pawn-style business signal');

  opportunity += boolScore(features.used_inventory_signals) * 12;
  if (features.used_inventory_signals) reasons.push('Used, estate, resale, or pawn inventory signal');

  opportunity += boolScore(features.refurbishment_opportunity) * 16;
  if (features.refurbishment_opportunity) reasons.push('Strong refurbishment opportunity');

  if (!features.offers_repair && features.has_jewelry) {
    opportunity += 14;
    reasons.push('Sells jewelry but does not clearly advertise repair');
  }

  opportunity += features.manual_process_likelihood * 16;
  if (features.manual_process_likelihood >= 0.6) reasons.push('Likely manual or underdeveloped repair intake');

  opportunity += features.repair_volume_signal * 10;
  if (features.repair_volume_signal >= 0.6) reasons.push('Repair/refurbishment volume signal');

  opportunity += features.revenue_opportunity * 14;
  if (features.revenue_opportunity >= 0.65) reasons.push('High revenue opportunity');

  if (['micro', 'small'].includes(features.estimated_scale)) {
    opportunity += 8;
    reasons.push('Smaller operator likely easier to onboard');
  }

  if (features.process_maturity === 'manual') {
    opportunity += 10;
    reasons.push('Manual process can benefit from EFD repair software');
  } else if (features.process_maturity === 'semi') {
    opportunity += 5;
    reasons.push('Semi-manual process may benefit from better tracking');
  }

  if (features.outsourcing_evidence) {
    opportunity += 12;
    reasons.push('Evidence they outsource or send repair work elsewhere');
  }
  if (features.turnaround_complaints) {
    opportunity += 12;
    reasons.push('Turnaround complaint or delay signal');
  }
  if (features.repeat_issues) {
    opportunity += 6;
    reasons.push('Repeat repair issue signal');
  }
  if (features.review_repair_evidence) {
    opportunity += 10;
    reasons.push('Google reviews mention jewelry/watch repair work');
  }
  if (features.review_owner_jeweler_evidence) {
    opportunity += 6;
    reasons.push('Google reviews mention jeweler expertise or owner as jeweler');
  }
  if (features.review_service_mentions?.length) {
    opportunity += Math.min(8, features.review_service_mentions.length * 3);
    reasons.push(`Reviews mention ${features.review_service_mentions.slice(0, 4).join(', ')}`);
  }

  let friction = features.sales_friction * 20;
  if (features.in_house_repair) {
    friction += 8 + features.repair_capability * 12;
    penalties.push('Already advertises repair capability');
  }
  if (features.mature_in_house_repair) {
    friction += 25;
    penalties.push('Mature in-house repair department signal');
  }
  if (truthSignals.strongInHouse && !truthSignals.outsourcingEvidence && !truthSignals.turnaroundComplaints) {
    friction += 40;
    penalties.unshift('Strong in-house jeweler signal without outsourcing or delay evidence');
  }
  if (features.luxury_brand) {
    friction += 18;
    penalties.push('Luxury or polished brand friction');
  }
  if (features.chain_or_multi_location || ['large', 'chain'].includes(features.estimated_scale)) {
    friction += 16;
    penalties.push('Large or multi-location business');
  }
  if (!features.has_jewelry) {
    friction += 28;
    penalties.push('Weak jewelry relevance');
  }

  const hardNotFit = !features.has_jewelry
    || (features.mature_in_house_repair && (features.luxury_brand || features.chain_or_multi_location))
    || (features.luxury_brand && features.repair_capability >= 0.85);

  const forceScoreCap = truthSignals.strongInHouse && !truthSignals.outsourcingEvidence && !truthSignals.turnaroundComplaints ? 40 : null;
  const rawScore = hardNotFit ? Math.min(34, opportunity - friction) : opportunity - friction + 18;
  const cappedRawScore = forceScoreCap === null ? rawScore : Math.min(forceScoreCap, rawScore);
  const fitScore = clampScore(cappedRawScore);

  let tier = 'tier_3_educate';
  if (hardNotFit || fitScore < 40) tier = 'not_fit';
  else if (features.outsourcing_evidence || features.turnaround_complaints) tier = 'tier_1_replace_current_vendor';
  else if (fitScore >= 75 && !features.mature_in_house_repair && features.manual_process_likelihood >= 0.5) tier = 'tier_1_immediate_outreach';
  else if (!features.offers_repair && features.has_jewelry) tier = 'tier_2_add_repair_revenue';
  else if (features.refurbishment_opportunity) tier = 'tier_2_refurbishment';

  return {
    fitScore,
    tier,
    reasons: [...reasons, ...penalties.map((penalty) => `Penalty: ${penalty}`)].slice(0, 10),
    penalties,
    opportunityScore: clampScore(opportunity),
    frictionScore: clampScore(friction),
    hardNotFit,
    forceScoreCap,
    signalBreakdown,
  };
};

async function evaluateWholesaleLead(lead) {
  const prompt = [
    'Extract structured lead qualification features for Engel Fine Design wholesale repair outreach.',
    'Do NOT produce a final score. Be conservative and only mark a signal true when supported by the provided Google/site/notes data.',
    'Treat Google review snippets as evidence. If reviews mention the owner is a jeweler, chain repair, ring sizing, stone setting, polishing, watch battery, or similar work, reflect that in the repair/revenue features even when the website is silent.',
    'EFD is strongest for pawn shops, smaller operators, jewelry sellers without repair infrastructure, businesses with used jewelry/refurbishment opportunity, and stores likely using manual repair intake.',
    'Mature in-house repair, luxury positioning, big chains, and polished full-service repair departments increase sales friction.',
    '',
    'Return ONLY valid JSON with this exact shape:',
    '{ "has_jewelry": false, "business_type": "pawn_shop|jewelry_store|watch_business|bridal_jewelry|gold_buyer|luxury_retailer|unclear", "pawn_signals": false, "used_inventory_signals": false, "refurbishment_opportunity": false, "offers_repair": false, "repair_capability": 0.0, "in_house_repair": false, "mature_in_house_repair": false, "manual_process_likelihood": 0.0, "process_maturity": "manual|semi|digital|unknown", "estimated_scale": "micro|small|medium|large|chain|unknown", "repair_volume_signal": 0.0, "revenue_opportunity": 0.0, "sales_friction": 0.0, "luxury_brand": false, "chain_or_multi_location": false, "outsourcing_evidence": false, "turnaround_complaints": false, "review_repair_evidence": false, "review_owner_jeweler_evidence": false, "review_service_mentions": [], "contact_quality": 0.0, "confidence": 0.0, "summary": "", "likely_repair_need": "", "concerns": [], "recommended_outreach_angle": "" }',
    '',
    `Lead: ${leadPromptContext(lead)}`,
  ].join('\n');

  let parsed = null;
  let geminiError = null;
  try {
    parsed = await callGemini(prompt, {
      label: 'wholesale lead feature extraction',
      responseSchema: GEMINI_FEATURE_SCHEMA,
      maxOutputTokens: 6000,
    });
  } catch (error) {
    geminiError = error;
  }
  const reviewFeatures = reviewFeaturesFromLead(lead);
  const geminiFeatures = parsed ? normalizeFeatureExtraction(parsed) : deterministicFeatureExtraction(lead, geminiError);
  const features = {
    ...geminiFeatures,
    review_repair_evidence: geminiFeatures.review_repair_evidence || reviewFeatures.review_repair_evidence,
    review_owner_jeweler_evidence: geminiFeatures.review_owner_jeweler_evidence || reviewFeatures.review_owner_jeweler_evidence,
    review_service_mentions: [...new Set([
      ...(geminiFeatures.review_service_mentions || []),
      ...(reviewFeatures.review_service_mentions || []),
    ])].slice(0, 8),
    turnaround_complaints: geminiFeatures.turnaround_complaints || reviewFeatures.turnaround_complaints,
    outsourcing_evidence: geminiFeatures.outsourcing_evidence || reviewFeatures.outsourcing_evidence,
    repeat_issues: reviewFeatures.repeat_issues,
    repair_volume_signal: Math.max(Number(geminiFeatures.repair_volume_signal || 0), Number(reviewFeatures.repair_volume_signal || 0)),
  };
  const { truthSignals, signalBreakdown } = buildLeadTruthSignals(lead, features);
  features.truthSignals = truthSignals;
  features.signalBreakdown = signalBreakdown;
  if (truthSignals.strongInHouse) {
    features.in_house_repair = true;
    features.mature_in_house_repair = true;
    features.repair_capability = Math.max(Number(features.repair_capability || 0), Number(signalBreakdown.inHouseRepairStrength || 0), 0.8);
    features.sales_friction = Math.max(Number(features.sales_friction || 0), 0.85);
  }
  if (truthSignals.outsourcingEvidence) features.outsourcing_evidence = true;
  if (truthSignals.turnaroundComplaints) features.turnaround_complaints = true;
  features.repair_volume_signal = Math.max(Number(features.repair_volume_signal || 0), Number(truthSignals.repairVolume || 0));
  const scoring = scoreWholesaleLeadFeatures(features);
  const leadVector = buildFeatureVector({ ...lead, scoreFeatures: features });
  const profiles = await getLookalikeProfiles();
  const lookalike = calculateLookalikeScoreFromProfiles(leadVector, profiles);
  const blendedLookalike = calculateBlendedLookalikeScore(scoring.fitScore, lookalike.lookalikeScore, lookalike.lookalikeConfidence);
  const adjustedFitScore = scoring.forceScoreCap === null || scoring.forceScoreCap === undefined
    ? blendedLookalike.finalScore
    : Math.min(scoring.forceScoreCap, blendedLookalike.finalScore);
  const lookalikeAdjustment = adjustedFitScore - scoring.fitScore;
  const recommendedStatus = scoring.hardNotFit || adjustedFitScore < 40
    ? 'not_fit'
    : adjustedFitScore >= 70
      ? 'qualified'
      : 'researching';
  const knownWholesaler = Boolean(lead.knownCustomerSignal?.isCurrentWholesaler);
  const finalReasons = [
    ...scoring.reasons,
    `Lookalike score ${lookalike.lookalikeScore} (${lookalikeAdjustment >= 0 ? '+' : ''}${lookalikeAdjustment}, ${Math.round(Number(lookalike.lookalikeConfidence || 0) * 100)}% confidence)`,
  ].slice(0, 10);

  return {
    fitScore: adjustedFitScore,
    baseScore: scoring.fitScore,
    scoreSource: 'rules_v1',
    aiScore: adjustedFitScore,
    aiConfidence: features.confidence,
    aiSummary: features.summary,
    likelyRepairNeed: features.likely_repair_need,
    aiConcerns: features.concerns,
    recommendedOutreachAngle: features.recommended_outreach_angle,
    scoreFeatures: features,
    truthSignals,
    signalBreakdown,
    scoreBreakdown: {
      opportunityScore: scoring.opportunityScore,
      frictionScore: scoring.frictionScore,
      hardNotFit: scoring.hardNotFit,
      forceScoreCap: scoring.forceScoreCap,
      signalBreakdown,
      model: 'rules_v1',
      lookalikeAdjustment,
      lookalikeEffectiveWeight: Math.round(blendedLookalike.effectiveWeight * 100) / 100,
      baseScore: scoring.fitScore,
      knownCustomerOverride: false,
      geminiFallback: Boolean(geminiError),
    },
    lookalikeScore: lookalike.lookalikeScore,
    lookalikeConfidence: lookalike.lookalikeConfidence,
    lookalikeReasons: lookalike.lookalikeReasons,
    lookalikeDetails: {
      customerSimilarity: lookalike.customerSimilarity,
      notFitSimilarity: lookalike.notFitSimilarity,
      adjustment: lookalikeAdjustment,
      confidence: lookalike.lookalikeConfidence,
      rawLookalikeScore: lookalike.rawLookalikeScore,
      effectiveWeight: blendedLookalike.effectiveWeight,
      customerFieldScores: lookalike.customerFieldScores,
      notFitFieldScores: lookalike.notFitFieldScores,
      profileUpdatedAt: profiles.updatedAt,
      customerSampleSize: profiles.customerProfile?.sampleSize || 0,
      customerEligibleSampleSize: profiles.customerProfile?.eligibleSampleSize || 0,
      notFitSampleSize: profiles.notFitProfile?.sampleSize || 0,
      notFitEligibleSampleSize: profiles.notFitProfile?.eligibleSampleSize || 0,
      vector: leadVector,
    },
    scoreReasons: finalReasons,
    leadTier: knownWholesaler ? 'current_account_training' : scoring.tier,
    status: knownWholesaler ? 'approved' : (['new', 'researching'].includes(lead.status) ? recommendedStatus : lead.status),
    sourceType: knownWholesaler ? 'customer' : (recommendedStatus === 'not_fit' ? 'not_fit' : (lead.sourceType || 'prospect')),
    scoreError: geminiError ? geminiError.message : null,
    updatedAt: new Date(),
  };
}

export async function scoreWholesaleLead(leadId, actor) {
  const collection = await getLeadsCollection();
  let lead = await collection.findOne(objectIdFilter(leadId));
  if (!lead) return null;
  lead = await hydrateLeadWebsiteResearch(collection, lead, actor);
  lead = await hydrateLeadGoogleReviewResearch(collection, lead, actor);

  const update = {
    ...(await evaluateWholesaleLead(lead)),
    updatedBy: actor || null,
  };

  const result = await collection.findOneAndUpdate(
    objectIdFilter(leadId),
    {
      $set: update,
      $push: { activity: buildActivity({ type: 'ai_score', message: `AI fit score set to ${update.fitScore}`, actor, metadata: { model: GEMINI_MODEL } }) },
    },
    { returnDocument: 'after' },
  );
  return serializeLead(result);
}

export async function bulkRescoreWholesaleLeads({ leadIds = [], scope = 'selected', onProgress = null } = {}, actor) {
  const collection = await getLeadsCollection();
  const ids = normalizeLeadIds(leadIds);
  const query = scope === 'active'
    ? { status: { $ne: 'not_fit' } }
    : leadIdsQuery(ids);

  if (scope !== 'active' && !ids.length) throw Object.assign(new Error('Select at least one lead to rescore'), { status: 400 });

  const leads = await collection.find(query).sort({ fitScore: -1, createdAt: -1 }).toArray();
  const results = [];
  let processed = 0;
  const updateProgress = async (patch = {}) => {
    if (typeof onProgress === 'function') {
      await onProgress({
        total: leads.length,
        processed,
        rescored: results.filter((result) => result.status === 'rescored').length,
        failed: results.filter((result) => result.status === 'failed').length,
        ...patch,
      });
    }
  };
  await updateProgress({ phase: 'starting' });

  for (const lead of leads) {
    try {
      await updateProgress({ phase: 'website_research', currentCandidate: lead.storeName });
      const researchedLead = await hydrateLeadWebsiteResearch(collection, lead, actor);
      const reviewResearchedLead = await hydrateLeadGoogleReviewResearch(collection, researchedLead, actor);
      await updateProgress({ phase: 'scoring', currentCandidate: lead.storeName });
      const update = {
        ...(await evaluateWholesaleLead(reviewResearchedLead)),
        updatedBy: actor || null,
      };
      await collection.updateOne(
        objectIdFilter(lead._id?.toString() || lead.leadId),
        {
          $set: update,
          $push: {
            activity: buildActivity({
              type: 'ai_score',
              message: `AI fit score refreshed to ${update.fitScore}`,
              actor,
              metadata: { model: GEMINI_MODEL, bulk: true, scope },
            }),
          },
        },
      );
      results.push({ leadId: lead._id?.toString(), storeName: lead.storeName, status: 'rescored', fitScore: update.fitScore });
    } catch (error) {
      results.push({ leadId: lead._id?.toString(), storeName: lead.storeName, status: 'failed', error: error.message });
    } finally {
      processed += 1;
      await updateProgress({ phase: 'running', currentCandidate: lead.storeName });
    }
  }

  return {
    scope,
    selected: scope === 'active' ? leads.length : ids.length,
    processed: results.length,
    rescored: results.filter((result) => result.status === 'rescored').length,
    failed: results.filter((result) => result.status === 'failed').length,
    results,
  };
}

export async function createWholesaleRescoreJob(options = {}, actor) {
  const jobs = await getImportJobsCollection();
  const now = new Date();
  const job = {
    type: 'wholesale_rescore',
    status: 'queued',
    phase: 'queued',
    options,
    progress: {
      total: 0,
      processed: 0,
      rescored: 0,
      failed: 0,
    },
    result: null,
    error: null,
    currentCandidate: '',
    createdBy: actor || null,
    createdAt: now,
    updatedAt: now,
    startedAt: null,
    finishedAt: null,
  };
  const result = await jobs.insertOne(job);
  return serializeJob({ ...job, _id: result.insertedId });
}

export async function getWholesaleRescoreJob(jobId) {
  const jobs = await getImportJobsCollection();
  const job = await jobs.findOne({ ...objectIdFilter(jobId), type: 'wholesale_rescore' });
  return job ? serializeJob(job) : null;
}

export async function getLatestWholesaleRescoreJob() {
  const jobs = await getImportJobsCollection();
  const job = await jobs.findOne({ type: 'wholesale_rescore' }, { sort: { createdAt: -1 } });
  return job ? serializeJob(job) : null;
}

export async function runWholesaleRescoreJob(jobId, actor) {
  const jobs = await getImportJobsCollection();
  const startedAt = new Date();
  await jobs.updateOne(objectIdFilter(jobId), {
    $set: {
      status: 'running',
      phase: 'starting',
      startedAt,
      updatedAt: startedAt,
    },
  });

  try {
    const job = await jobs.findOne(objectIdFilter(jobId));
    const result = await bulkRescoreWholesaleLeads({
      ...(job?.options || {}),
      onProgress: async (progress) => {
        await jobs.updateOne(objectIdFilter(jobId), {
          $set: {
            status: 'running',
            phase: progress.phase || 'running',
            currentCandidate: progress.currentCandidate || '',
            progress: {
              total: progress.total || 0,
              processed: progress.processed || 0,
              rescored: progress.rescored || 0,
              failed: progress.failed || 0,
            },
            updatedAt: new Date(),
          },
        });
      },
    }, actor);

    const finishedAt = new Date();
    await jobs.updateOne(objectIdFilter(jobId), {
      $set: {
        status: 'completed',
        phase: 'completed',
        result,
        progress: {
          total: result.processed || 0,
          processed: result.processed || 0,
          rescored: result.rescored || 0,
          failed: result.failed || 0,
        },
        currentCandidate: '',
        finishedAt,
        updatedAt: finishedAt,
      },
    });
  } catch (error) {
    const finishedAt = new Date();
    await jobs.updateOne(objectIdFilter(jobId), {
      $set: {
        status: 'failed',
        phase: 'failed',
        error: error.message || 'Rescore failed',
        finishedAt,
        updatedAt: finishedAt,
      },
    });
  }

  return getWholesaleRescoreJob(jobId);
}

export async function findWholesaleLeadEmail(leadId, actor) {
  const collection = await getLeadsCollection();
  const lead = await collection.findOne(objectIdFilter(leadId));
  if (!lead) return null;
  if (!lead.website) throw Object.assign(new Error('Lead does not have a website to scrape'), { status: 400 });

  const discovery = await discoverEmailFromWebsite(lead.website);
  const research = await scrapeWholesaleLeadWebsiteResearch(lead.website);
  const inHouseStrength = Number(research.signals?.inHouseRepairStrength || research.signals?.inHouseDetection?.inHouseRepairStrength || 0);
  const patch = {
    emailDiscovery: discovery,
    websiteResearch: research,
    websiteSummary: research.summary,
    websiteSignals: research.signals,
    truthSignals: {
      ...(lead.truthSignals || {}),
      strongInHouse: Boolean(lead.truthSignals?.strongInHouse || research.signals?.strongInHouseRepairMentioned || inHouseStrength >= 0.8),
    },
    signalBreakdown: {
      ...(lead.signalBreakdown || {}),
      inHouseDetected: Boolean(lead.signalBreakdown?.inHouseDetected || research.signals?.strongInHouseRepairMentioned || inHouseStrength >= 0.8),
      inHouseRepairStrength: Math.max(Number(lead.signalBreakdown?.inHouseRepairStrength || 0), inHouseStrength),
      websiteOutsourcingDetected: Boolean(research.signals?.outsourcingEvidence),
      websiteVagueRepairMention: Boolean(research.signals?.vagueRepairMention),
      websiteTimeEstimateMentioned: Boolean(research.signals?.timeEstimateMentioned),
    },
    websiteResearchCheckedAt: research.checkedAt,
    updatedAt: new Date(),
    updatedBy: actor || null,
  };
  if (discovery.email) {
    patch.email = discovery.email;
    patch.emailSource = 'website_scrape';
  }

  const result = await collection.findOneAndUpdate(
    objectIdFilter(leadId),
    {
      $set: patch,
      $push: {
        activity: buildActivity({
          type: discovery.email ? 'email_found' : 'email_not_found',
          message: discovery.email ? `Found email ${discovery.email} from website and refreshed website research` : 'No email found on website; refreshed website research',
          actor,
          metadata: { checkedUrls: discovery.checkedUrls, candidates: discovery.candidates, websiteSignals: research.signals },
        }),
      },
    },
    { returnDocument: 'after' },
  );
  return serializeLead(result);
}

export async function generateWholesaleLeadOutreach(leadId, actor) {
  const collection = await getLeadsCollection();
  let lead = await collection.findOne(objectIdFilter(leadId));
  if (!lead) return null;
  lead = await hydrateLeadWebsiteResearch(collection, lead, actor);
  lead = await hydrateLeadGoogleReviewResearch(collection, lead, actor);

  const outreachDraft = await buildWholesaleLeadOutreachDraft(lead);

  const result = await collection.findOneAndUpdate(
    objectIdFilter(leadId),
    {
      $set: { outreachDraft, updatedAt: new Date(), updatedBy: actor || null },
      $push: { activity: buildActivity({ type: 'outreach', message: 'Outreach draft generated', actor, metadata: { model: outreachDraft.model } }) },
    },
    { returnDocument: 'after' },
  );
  return serializeLead(result);
}

async function buildWholesaleLeadOutreachDraft(lead) {
  const applicationUrl = getWholesaleApplicationUrl();

  const prompt = [
    'Write a warm, personal wholesale outreach email from Jake Engel, owner and operator of Engel Fine Design.',
    'It must sound like a real small-business owner wrote it, not like marketing automation or spam.',
    'Use a plain, direct, conversational tone. Keep it concise: 2-4 short paragraphs.',
    'Mention Engel Fine Design is a small business in Fort Smith, Arkansas, looking to build real wholesale repair relationships with other jewelry stores.',
    'Focus on jewelry repair support, repair overflow, bench coverage, clear repair intake, repair tracking, and making the store-side repair process easier.',
    'Do not pitch custom design, bespoke design, CAD/design services, or a national team of jewelers/designers.',
    'Mention free access to EFD repair management software as a practical benefit for tracking client repairs.',
    'Personalize the email based on what the business appears to be. If it is a pawn shop, call it a pawn shop and discuss jewelry customers, adding or expanding repair/refurbishment services, and replacing paper/manual repair tracking. Do not call a pawn shop a jewelry store.',
    'For pawn shops or used/estate jewelry businesses, include refurbishment when relevant: cleaning, polishing, repairing, or restoring jewelry pieces so they are easier to sell or worth more in the case.',
    'If the lead clearly offers repair, do not assume they have a polished in-house department. Frame the value around getting off paper envelopes/manual tracking, cleaner intake, overflow support, and consistent bench coverage.',
    'If the lead appears to sell jewelry but does not clearly offer repair, frame the value around adding repair/refurbishment as an additional service with low operational friction.',
    'If repair availability is unknown, gracefully say you were not sure whether they currently offer jewelry repair, but wanted to share an easy way to add or organize it if useful.',
    'Avoid sounding like EFD is trying to replace a mature in-house repair department. The pitch is best for smaller operators who want repair/refurbishment revenue and a better system without building a full repair operation.',
    'Make the primary call to action a low-friction invitation to apply for a free wholesale repair account and look around. Do not make a phone call or meeting the main ask.',
    'Include the application URL in the email body as the main next step, using simple wording like "You can apply for access here".',
    'A reply or call can be mentioned only as an optional path if they have questions. If mentioning phone contact, use Jake Engel at 479-546-6740.',
    'Do not overpromise, use hype, or use phrases like "revolutionize", "synergy", "game changer", or "just checking in".',
    'Use as much known context as possible: store name, city, business type, Google categories, rating/reviews, repair signals, jewelry sales signals, and notes. Do not invent details.',
    'End with a low-pressure account access invitation and include Jake Engel as the signature.',
    '',
    'Return ONLY valid JSON with this exact shape:',
    '{ "subject": "", "emailBody": "", "callOpener": "", "followUpNote": "", "inviteMessage": "" }',
    '',
    `Application URL: ${applicationUrl}`,
    `Lead: ${leadPromptContext(lead)}`,
  ].join('\n');

  const parsed = await callGemini(prompt, {
    label: 'wholesale outreach draft',
    responseSchema: GEMINI_OUTREACH_SCHEMA,
    maxOutputTokens: 6000,
  });
  return {
    subject: normalizeString(parsed.subject),
    emailBody: normalizeString(parsed.emailBody),
    callOpener: normalizeString(parsed.callOpener),
    followUpNote: normalizeString(parsed.followUpNote),
    inviteMessage: normalizeString(parsed.inviteMessage) || `You can apply for wholesale repair access here: ${applicationUrl}`,
    applicationUrl,
    model: GEMINI_MODEL,
    generatedAt: new Date(),
  };
}

async function ensureWholesaleLeadOutreachDraft(collection, lead, actor, forceDraft = false) {
  if (lead.outreachDraft?.subject && lead.outreachDraft?.emailBody && !forceDraft) return normalizeOutreachDraftLinks(lead.outreachDraft);
  const outreachDraft = await buildWholesaleLeadOutreachDraft(lead);
  await collection.updateOne(
    objectIdFilter(lead._id?.toString() || lead.leadId),
    {
      $set: { outreachDraft, updatedAt: new Date(), updatedBy: actor || null },
      $push: { activity: buildActivity({ type: 'outreach', message: 'Outreach draft generated', actor, metadata: { model: outreachDraft.model, bulk: true } }) },
    },
  );
  return outreachDraft;
}

export async function bulkWholesaleLeadOutreach({ leadIds = [], action = 'draft', forceDraft = false, confirmSend = false } = {}, actor) {
  const ids = normalizeLeadIds(leadIds);
  if (!ids.length) throw Object.assign(new Error('Select at least one lead'), { status: 400 });
  if (!['draft', 'send'].includes(action)) throw Object.assign(new Error('Invalid bulk outreach action'), { status: 400 });
  if (action === 'send' && confirmSend !== true) {
    throw Object.assign(new Error('confirmSend is required before sending outreach emails'), { status: 400 });
  }

  const collection = await getLeadsCollection();
  const leads = await collection.find(leadIdsQuery(ids)).toArray();
  const byId = new Map(leads.flatMap((lead) => [
    [lead._id?.toString(), lead],
    [lead.leadId, lead],
  ]));

  const selected = ids.map((id) => byId.get(id)).filter(Boolean);
  const missing = ids.filter((id) => !byId.has(id));
  const results = [];
  const skipped = missing.map((id) => ({ leadId: id, reason: 'not_found' }));
  let transporter = null;
  let from = null;

  if (action === 'send') {
    const transport = createTransporter();
    transporter = transport.transporter;
    from = transport.from;
  }

  for (const lead of selected) {
    const publicLeadId = lead._id?.toString();
    if (lead.status === 'not_fit') {
      skipped.push({ leadId: publicLeadId, storeName: lead.storeName, reason: 'not_fit' });
      continue;
    }

    if (action === 'send' && !normalizeString(lead.email)) {
      skipped.push({ leadId: publicLeadId, storeName: lead.storeName, reason: 'missing_email' });
      continue;
    }

    try {
      const outreachDraft = await ensureWholesaleLeadOutreachDraft(collection, lead, actor, forceDraft);

      if (action === 'draft') {
        results.push({ leadId: publicLeadId, storeName: lead.storeName, email: lead.email || '', subject: outreachDraft.subject, status: 'drafted' });
        continue;
      }

      const info = await transporter.sendMail({
        from,
        to: lead.email,
        subject: outreachDraft.subject || 'Wholesale jewelry repair support',
        text: outreachDraft.emailBody,
      });

      const sentAt = new Date();
      await collection.updateOne(
        objectIdFilter(publicLeadId),
        {
          $set: {
            status: 'contacted',
            lastContactedAt: sentAt,
            outreachSentAt: sentAt,
            outreachLastSentAt: sentAt,
            updatedAt: sentAt,
            updatedBy: actor || null,
          },
          $inc: { outreachSendCount: 1 },
          $push: {
            activity: buildActivity({
              type: 'outreach_sent',
              message: `Outreach email sent to ${lead.email}`,
              actor,
              metadata: { messageId: info.messageId, bulk: true },
            }),
          },
        },
      );

      results.push({ leadId: publicLeadId, storeName: lead.storeName, email: lead.email, subject: outreachDraft.subject, status: 'sent', messageId: info.messageId });
    } catch (error) {
      results.push({ leadId: publicLeadId, storeName: lead.storeName, email: lead.email || '', status: 'failed', error: error.message });
    }
  }

  return {
    action,
    selected: ids.length,
    matched: selected.length,
    processed: results.length,
    sent: results.filter((result) => result.status === 'sent').length,
    drafted: results.filter((result) => result.status === 'drafted').length,
    failed: results.filter((result) => result.status === 'failed').length,
    skipped,
    results,
  };
}

const wholesalerSearchText = (wholesaler = {}) => {
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

const normalizeWholesalerAccount = (wholesaler = {}) => {
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

const customerLookalikePatch = (account, placeMatch, source = 'active_wholesaler_match') => ({
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

async function enrichCustomerSeedLead(collection, leadId, actor) {
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
