import { db } from '../../lib/database.js';
import {
  BOOLEAN_VECTOR_FIELDS,
  CATEGORICAL_VECTOR_FIELDS,
  NUMERIC_VECTOR_FIELDS,
  buildFeatureVector,
} from './lookalike.vector.util.js';
import { MIN_CUSTOMER_PROFILE_SIZE } from './lookalike.weights.js';

const PROFILES_COLLECTION = 'lookalikeProfiles';
const LEADS_COLLECTION = 'wholesaleLeads';

const emptyProfile = () => ({
  sampleSize: 0,
  eligibleSampleSize: 0,
  ignoredSampleSize: 0,
  stable: false,
  averages: Object.fromEntries(NUMERIC_VECTOR_FIELDS.map((field) => [field, 0])),
  variances: Object.fromEntries(NUMERIC_VECTOR_FIELDS.map((field) => [field, 0])),
  distributions: {},
});

const buildDistribution = (values = []) => {
  const total = values.length;
  if (!total) return {};
  const counts = values.reduce((acc, value) => {
    const key = String(value ?? 'unknown');
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  return Object.fromEntries(Object.entries(counts).map(([key, count]) => [key, Math.round((count / total) * 100) / 100]));
};

const vectorCompleteness = (vector = {}) => {
  const fields = [...NUMERIC_VECTOR_FIELDS, ...CATEGORICAL_VECTOR_FIELDS, ...BOOLEAN_VECTOR_FIELDS];
  const present = fields.filter((field) => {
    const value = vector[field];
    if (value === undefined || value === null) return false;
    if (typeof value === 'string') return value && value !== 'unknown' && value !== 'unclear';
    return true;
  }).length;
  return fields.length ? present / fields.length : 0;
};

const isExtremeLuxuryOutlier = (lead = {}, vector = {}) => {
  const features = lead.scoreFeatures || {};
  return Boolean(
    features.luxury_brand
    && (Number(features.sales_friction || vector.salesFriction || 0) >= 0.8)
    && (Number(vector.inHouseRepairStrength || 0) >= 0.8 || features.mature_in_house_repair),
  );
};

const buildProfileFromLeads = (leads = [], { requireMinimumCustomers = false } = {}) => {
  if (!leads.length) return emptyProfile();
  const vectorRows = leads.map((lead) => ({ lead, vector: buildFeatureVector(lead) }));
  const eligibleRows = vectorRows.filter(({ lead, vector }) => (
    vectorCompleteness(vector) >= 0.45 && !isExtremeLuxuryOutlier(lead, vector)
  ));
  const vectors = eligibleRows.map((row) => row.vector);
  if (!vectors.length || (requireMinimumCustomers && vectors.length < MIN_CUSTOMER_PROFILE_SIZE)) {
    return {
      ...emptyProfile(),
      sampleSize: leads.length,
      eligibleSampleSize: vectors.length,
      ignoredSampleSize: leads.length - vectors.length,
      stable: false,
      minimumSampleSize: requireMinimumCustomers ? MIN_CUSTOMER_PROFILE_SIZE : 0,
    };
  }

  const averages = {};
  const variances = {};
  for (const field of NUMERIC_VECTOR_FIELDS) {
    const values = vectors.map((vector) => Number(vector[field] || 0));
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    averages[field] = Math.round(mean * 100) / 100;
    variances[field] = Math.round((values.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / values.length) * 1000) / 1000;
  }

  const distributions = {};
  for (const field of CATEGORICAL_VECTOR_FIELDS) {
    distributions[field] = buildDistribution(vectors.map((vector) => vector[field] || 'unknown'));
  }
  for (const field of BOOLEAN_VECTOR_FIELDS) {
    distributions[field] = buildDistribution(vectors.map((vector) => Boolean(vector[field])));
  }

  return {
    sampleSize: leads.length,
    eligibleSampleSize: vectors.length,
    ignoredSampleSize: leads.length - vectors.length,
    stable: true,
    minimumSampleSize: requireMinimumCustomers ? MIN_CUSTOMER_PROFILE_SIZE : 0,
    averages,
    variances,
    distributions,
  };
};

const getCollections = async () => {
  const dbInstance = await db.connect();
  return {
    leads: dbInstance.collection(LEADS_COLLECTION),
    profiles: dbInstance.collection(PROFILES_COLLECTION),
  };
};

export async function buildProfiles() {
  const { leads, profiles } = await getCollections();
  const [customerLeads, notFitLeads] = await Promise.all([
    leads.find({ sourceType: 'customer' }).toArray(),
    leads.find({ $or: [{ sourceType: 'not_fit' }, { status: 'not_fit' }] }).toArray(),
  ]);

  const document = {
    type: 'wholesale_lead_lookalike',
    customerProfile: buildProfileFromLeads(customerLeads, { requireMinimumCustomers: true }),
    notFitProfile: buildProfileFromLeads(notFitLeads),
    updatedAt: new Date(),
  };

  await profiles.updateOne(
    { type: document.type },
    { $set: document },
    { upsert: true },
  );

  return document;
}

export async function getLookalikeProfiles({ maxAgeHours = 24 } = {}) {
  const { profiles } = await getCollections();
  const existing = await profiles.findOne({ type: 'wholesale_lead_lookalike' });
  const stale = !existing?.updatedAt || (Date.now() - new Date(existing.updatedAt).getTime()) > maxAgeHours * 60 * 60 * 1000;
  if (!existing || stale) return buildProfiles();
  return existing;
}
