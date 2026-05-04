const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));

const normalizedText = (value) => String(value || '').toLowerCase();

const firstPresent = (...values) => values.find((value) => value !== undefined && value !== null && value !== '') ?? null;

const normalizeBusinessType = (lead = {}, features = {}) => {
  const type = features.business_type;
  if (type === 'pawn_shop') return 'pawn_shop';
  if (type === 'watch_business') return 'watch_repair';
  if (['jewelry_store', 'bridal_jewelry', 'luxury_retailer'].includes(type)) return 'jewelry_store';

  const text = normalizedText([
    lead.storeName,
    lead.websiteSummary,
    lead.googleReviewSummary,
    ...(Array.isArray(lead.googleBusinessTypes) ? lead.googleBusinessTypes : []),
  ].join(' '));
  if (/\bpawn|pawnshop|pawn shop/.test(text)) return 'pawn_shop';
  if (/\bwatch|clock/.test(text)) return 'watch_repair';
  if (/\bjewel|diamond|gold|bridal|engagement|ring/.test(text)) return 'jewelry_store';
  return 'unclear';
};

const normalizeScale = (value) => {
  if (['micro', 'solo'].includes(value)) return 'solo';
  if (['small'].includes(value)) return 'small';
  if (['medium'].includes(value)) return 'medium';
  if (['large', 'chain'].includes(value)) return 'large';
  return 'unknown';
};

const normalizeProcessMaturity = (value) => {
  if (value === 'semi') return 'semi_digital';
  if (['manual', 'digital'].includes(value)) return value;
  return 'unknown';
};

export function buildFeatureVector(lead = {}) {
  const features = lead.scoreFeatures || {};
  const reviewSignals = lead.googleReviewSignals || lead.googleReviewResearch?.signals || {};
  const websiteSignals = lead.websiteSignals || lead.websiteResearch?.signals || {};
  const jobSignals = lead.jobSignals || {};

  const hasJewelry = Boolean(features.has_jewelry || websiteSignals.jewelryMentioned || /jewel|diamond|gold|ring/i.test(String(lead.storeName || '')));
  const repairOffering = firstPresent(features.repair_capability, features.offers_repair ? 0.55 : null, websiteSignals.repairMentioned ? 0.45 : null, reviewSignals.repairMentioned ? 0.45 : null, 0);

  return {
    businessType: normalizeBusinessType(lead, features),
    jewelryRelevance: hasJewelry ? 1 : 0,
    repairOffering: clamp01(repairOffering),
    inHouseRepairStrength: clamp01(features.mature_in_house_repair ? 1 : features.in_house_repair ? Math.max(0.35, features.repair_capability || 0.35) : 0),
    outsourcingLikelihood: clamp01(features.outsourcing_evidence ? 1 : features.manual_process_likelihood || 0),
    repairDemandSignal: clamp01(features.repair_volume_signal || (reviewSignals.repairMentioned ? 0.55 : 0) || (jobSignals.hasRepairHiring ? 0.75 : 0)),
    refurbishmentOpportunity: clamp01(features.refurbishment_opportunity ? 1 : websiteSignals.refurbishmentMentioned ? 0.7 : reviewSignals.refurbishmentMentioned ? 0.7 : 0),
    inventorySignal: clamp01(features.used_inventory_signals ? 1 : websiteSignals.pawnMentioned || websiteSignals.goldBuyingMentioned ? 0.75 : 0),
    businessScale: normalizeScale(features.estimated_scale),
    processMaturity: normalizeProcessMaturity(features.process_maturity),
    revenueOpportunity: clamp01(features.revenue_opportunity),
    salesFriction: clamp01(features.sales_friction),
    hasRepairHiring: Boolean(jobSignals.hasRepairHiring),
    reviewMentionsRepair: Boolean(reviewSignals.repairMentioned || features.review_repair_evidence),
    turnaroundIssues: Boolean(reviewSignals.turnaroundComplaint || features.turnaround_complaints),
  };
}

export const NUMERIC_VECTOR_FIELDS = [
  'jewelryRelevance',
  'repairOffering',
  'inHouseRepairStrength',
  'outsourcingLikelihood',
  'repairDemandSignal',
  'refurbishmentOpportunity',
  'inventorySignal',
  'revenueOpportunity',
  'salesFriction',
];

export const CATEGORICAL_VECTOR_FIELDS = ['businessType', 'businessScale', 'processMaturity'];
export const BOOLEAN_VECTOR_FIELDS = ['hasRepairHiring', 'reviewMentionsRepair', 'turnaroundIssues'];
