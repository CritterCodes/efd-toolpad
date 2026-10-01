import nodemailer from 'nodemailer';
import { ObjectId } from 'mongodb';
import { extractReviewSignals } from '@/services/reviews/review-signals.service.js';
import { detectInHouseStrength } from '@/services/signals/inhouse-detection.service.js';
import { inferLeadBusinessHints, normalizeString } from './shared';
import { summarizeGoogleReviews } from './websiteResearch';
export const getSmtpConfig = () => {
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

export const createTransporter = () => {
  const { from, ...transportConfig } = getSmtpConfig();
  return { transporter: nodemailer.createTransport(transportConfig), from };
};

export const normalizeLeadIds = (leadIds = []) => [...new Set(
  (Array.isArray(leadIds) ? leadIds : [])
    .map((id) => normalizeString(id))
    .filter(Boolean),
)];

export const leadIdsQuery = (leadIds = []) => ({
  $or: [
    { leadId: { $in: leadIds } },
    { _id: { $in: leadIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id)) } },
  ],
});

export const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));
export const clampScore = (value) => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
export const boolScore = (value) => (value ? 1 : 0);

export const normalizeFeatureExtraction = (parsed = {}) => {
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

export const reviewFeaturesFromLead = (lead = {}) => {
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

export const buildLeadTruthSignals = (lead = {}, features = {}) => {
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

export const deterministicFeatureExtraction = (lead = {}, error = null) => {
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

export const scoreWholesaleLeadFeatures = (features) => {
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

