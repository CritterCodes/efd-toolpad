import {
  BOOLEAN_VECTOR_FIELDS,
  CATEGORICAL_VECTOR_FIELDS,
  NUMERIC_VECTOR_FIELDS,
} from './lookalike.vector.util.js';
import {
  LOOKALIKE_SCORE_WEIGHT,
  LOOKALIKE_WEIGHTS,
  MIN_CUSTOMER_PROFILE_SIZE,
} from './lookalike.weights.js';

const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));
const clampScore = (value) => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));

const numericSimilarity = (value, mean) => 1 - Math.abs(clamp01(value) - clamp01(mean));

const categoricalSimilarity = (value, distribution = {}) => {
  if (!value) return 0;
  return clamp01(distribution[value] || 0);
};

const booleanSimilarity = (value, distribution = {}) => {
  const key = value ? 'true' : 'false';
  return clamp01(distribution[key] || 0);
};

const hasVectorValue = (leadVector = {}, field) => {
  const value = leadVector[field];
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value !== '' && value !== 'unknown' && value !== 'unclear';
  return true;
};

const fieldSimilarity = (leadVector = {}, profile = {}, field) => {
  if (NUMERIC_VECTOR_FIELDS.includes(field)) {
    return numericSimilarity(leadVector[field], profile.averages?.[field] ?? 0);
  }
  if (CATEGORICAL_VECTOR_FIELDS.includes(field)) {
    return categoricalSimilarity(leadVector[field], profile.distributions?.[field] || {});
  }
  if (BOOLEAN_VECTOR_FIELDS.includes(field)) {
    return booleanSimilarity(Boolean(leadVector[field]), profile.distributions?.[field] || {});
  }
  return 0;
};

export function calculateSimilarity(leadVector = {}, profile = {}) {
  const totalWeight = Object.values(LOOKALIKE_WEIGHTS).reduce((sum, weight) => sum + weight, 0);
  if (!profile?.stable || !profile?.eligibleSampleSize) {
    return {
      similarity: 0.5,
      fieldScores: {},
      usedWeight: 0,
      totalWeight,
    };
  }

  const fieldScores = {};
  let weightedSum = 0;
  let usedWeight = 0;

  for (const [field, weight] of Object.entries(LOOKALIKE_WEIGHTS)) {
    if (!hasVectorValue(leadVector, field)) continue;
    const score = clamp01(fieldSimilarity(leadVector, profile, field));
    fieldScores[field] = score;
    weightedSum += score * weight;
    usedWeight += weight;
  }

  return {
    similarity: usedWeight ? clamp01(weightedSum / usedWeight) : 0.5,
    fieldScores,
    usedWeight,
    totalWeight,
  };
}

const calculateProfileStability = (profile = {}) => {
  if (!profile?.stable || !profile?.eligibleSampleSize) return 0;
  const sampleConfidence = clamp01(profile.eligibleSampleSize / MIN_CUSTOMER_PROFILE_SIZE);
  const variances = Object.values(profile.variances || {}).map(Number).filter(Number.isFinite);
  if (!variances.length) return sampleConfidence;
  const averageVariance = variances.reduce((sum, value) => sum + value, 0) / variances.length;
  return clamp01(sampleConfidence * clamp01(1 - averageVariance));
};

const calculateLookalikeConfidence = (leadVector = {}, customerProfile = {}, notFitProfile = {}) => {
  const totalWeight = Object.values(LOOKALIKE_WEIGHTS).reduce((sum, weight) => sum + weight, 0);
  const presentWeight = Object.entries(LOOKALIKE_WEIGHTS)
    .filter(([field]) => hasVectorValue(leadVector, field))
    .reduce((sum, [, weight]) => sum + weight, 0);
  const completeness = totalWeight ? clamp01(presentWeight / totalWeight) : 0;
  const customerStability = calculateProfileStability(customerProfile);
  const notFitStability = notFitProfile?.eligibleSampleSize ? calculateProfileStability(notFitProfile) : 0.5;
  return Math.round(clamp01(completeness * customerStability * (0.75 + notFitStability * 0.25)) * 100) / 100;
};

const topMatchingFields = (fieldScores = {}, fields = [], minimum = 0.65) => fields
  .filter((field) => Number(fieldScores[field]) >= minimum)
  .sort((a, b) => (LOOKALIKE_WEIGHTS[b] || 0) - (LOOKALIKE_WEIGHTS[a] || 0));

const buildLookalikeReasons = ({
  leadVector = {},
  customerResult = {},
  notFitResult = {},
  customerProfile = {},
  notFitProfile = {},
  lookalikeScore = 0,
  confidence = 0,
}) => {
  const reasons = [];
  if (!customerProfile?.stable) {
    reasons.push(`Customer profile needs ${MIN_CUSTOMER_PROFILE_SIZE} eligible customer seeds before lookalike scoring has full influence`);
  }
  if (confidence < 0.35) reasons.push('Low lookalike confidence reduced scoring impact');

  const customerMatches = topMatchingFields(customerResult.fieldScores, [
    'businessType',
    'refurbishmentOpportunity',
    'inventorySignal',
    'processMaturity',
    'outsourcingLikelihood',
    'repairDemandSignal',
    'inHouseRepairStrength',
  ]);
  const notFitMatches = topMatchingFields(notFitResult.fieldScores, [
    'businessType',
    'salesFriction',
    'inHouseRepairStrength',
    'businessScale',
    'processMaturity',
  ]);

  if (leadVector.businessType === 'pawn_shop' && customerMatches.includes('businessType')) {
    reasons.push('Similar to pawn shop customer profile');
  }
  if (customerMatches.includes('refurbishmentOpportunity') || customerMatches.includes('inventorySignal')) {
    reasons.push('Matches customer inventory/refurbishment opportunity signals');
  }
  if (customerMatches.includes('processMaturity') || customerMatches.includes('outsourcingLikelihood')) {
    reasons.push('Matches manual-process or outsourcing-likelihood customer signals');
  }
  if (Number(leadVector.inHouseRepairStrength || 0) <= 0.35 && customerMatches.includes('inHouseRepairStrength')) {
    reasons.push('Low in-house repair strength matches current account profile');
  }
  if (notFitMatches.includes('salesFriction') || notFitMatches.includes('inHouseRepairStrength')) {
    reasons.push('Shares friction or in-house repair traits with archived not-fit leads');
  } else if (notFitProfile?.stable && lookalikeScore >= 60) {
    reasons.push('Dissimilar to archived not-fit profile');
  }

  return [...new Set(reasons)].slice(0, 6);
};

export function calculateBlendedLookalikeScore(baseScore, lookalikeScore, confidence) {
  const effectiveWeight = LOOKALIKE_SCORE_WEIGHT * clamp01(confidence);
  return {
    finalScore: clampScore((Number(baseScore) || 0) * (1 - effectiveWeight) + (Number(lookalikeScore) || 0) * effectiveWeight),
    effectiveWeight,
  };
}

export function calculateLookalikeScoreFromProfiles(leadVector, profiles = {}) {
  const customerResult = calculateSimilarity(leadVector, profiles.customerProfile);
  const notFitResult = calculateSimilarity(leadVector, profiles.notFitProfile);
  const customerSimilarity = customerResult.similarity;
  const notFitSimilarity = notFitResult.similarity;
  const rawLookalikeScore = (customerSimilarity * 100) - (notFitSimilarity * 70);
  const lookalikeScore = clampScore(rawLookalikeScore);
  const lookalikeConfidence = calculateLookalikeConfidence(leadVector, profiles.customerProfile, profiles.notFitProfile);
  const lookalikeReasons = buildLookalikeReasons({
    leadVector,
    customerResult,
    notFitResult,
    customerProfile: profiles.customerProfile,
    notFitProfile: profiles.notFitProfile,
    lookalikeScore,
    confidence: lookalikeConfidence,
  });

  return {
    lookalikeScore,
    lookalikeConfidence,
    customerSimilarity: Math.round(customerSimilarity * 100) / 100,
    notFitSimilarity: Math.round(notFitSimilarity * 100) / 100,
    rawLookalikeScore: Math.round(rawLookalikeScore * 100) / 100,
    customerFieldScores: customerResult.fieldScores,
    notFitFieldScores: notFitResult.fieldScores,
    lookalikeReasons,
  };
}
