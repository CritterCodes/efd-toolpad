/**
 * The views check's database: one account per role, signed in exactly as a person would be, plus the settings
 * every page needs to render (docs/GUARDRAILS_PLAN.md, Phase 2).
 *
 * This runs against a throwaway in-memory MongoDB only — scripts/views.mjs creates it and passes it in. Nothing
 * here may ever point at a real database.
 *
 * What a login needs (src/app/api/auth/[...nextauth]/service.js): a bcrypt `password`, `status: 'verified'`, a
 * `role`. An artisan also needs the current artisan terms accepted (services/policies/termsGate.js) or most
 * work is refused; an on-site artisan needs `employment.isOnsite` + `staffCapabilities` for the repair floor.
 * Every account creation path stores `permissions: ROLE_PERMISSIONS[role]` (lib/user/*.service.js), and some
 * routes read that, not the role — so the seed stores it too. An affiliate is a user AND an `affiliates` record.
 */
import bcrypt from 'bcryptjs';
import { ROLE_PERMISSIONS } from '../../src/lib/user/user.constants.js';

export const PASSWORD = 'views-check-only';

// The artisan terms version an artisan must have accepted (services/policies/policyRegistry.js).
const TERMS = { docId: 'artisan-terms', version: '0.2' };

// Production's pricing settings on 2026-09-30 (the same values as services/pricing/engine.test.js).
const PRICING = {
  wage: 50, administrativeFee: 0.25, businessFee: 0.5, consumablesFee: 0.25,
  wholesaleMarkup: 1.2, rushMultiplier: 1.5, deliveryFee: 5, taxRate: 0.095,
  minimumTaskRetailPrice: 0, minimumTaskWholesalePrice: 0,
  quantityTiers: [
    { minQty: 1, toolPct: 100, marginPct: 100 }, { minQty: 5, toolPct: 70, marginPct: 100 },
    { minQty: 10, toolPct: 50, marginPct: 100 }, { minQty: 20, toolPct: 30, marginPct: 100 },
  ],
};

/** The accounts the crawl signs in as. `key` names the role in the report and the baseline. */
export const ACCOUNTS = [
  { key: 'admin', role: 'admin', firstName: 'Ada', lastName: 'Admin' },
  {
    key: 'artisan-onsite', role: 'artisan', firstName: 'Bea', lastName: 'Bench',
    artisanApplication: { artisanType: 'Jeweler', status: 'approved' },
    employment: { isOnsite: true },
    staffCapabilities: { repairOps: true, benchWork: true, receiving: true },
    agreements: [{ ...TERMS, acceptedAt: new Date('2026-09-01') }],
  },
  {
    key: 'artisan-offsite', role: 'artisan', firstName: 'Cal', lastName: 'Cutter',
    artisanApplication: { artisanType: 'Gem Cutter, CAD Designer', status: 'approved' },
    employment: { isOnsite: false },
    agreements: [{ ...TERMS, acceptedAt: new Date('2026-09-01') }],
  },
  {
    key: 'wholesaler', role: 'wholesaler', firstName: 'Wes', lastName: 'Wholesale',
    business: 'Views Check Jewelers',
    wholesaleApplication: { businessName: 'Views Check Jewelers', status: 'approved' },
    fulfillmentPreference: 'pickup',
  },
  { key: 'applicant', role: 'artisan-applicant', firstName: 'Abe', lastName: 'Applicant' },
  { key: 'affiliate', role: 'affiliate', firstName: 'Aff', lastName: 'Iliate' },
].map((a) => ({ ...a, email: `${a.key}@views.check`, userID: `views-${a.key}` }));

/** One account's user document (the views check and scripts/seed-preview-e2e.mjs both store exactly this). */
export const userDoc = ({ key: _key, ...a }, passwordHash, now = new Date()) => ({
  ...a, password: passwordHash, status: 'verified', permissions: ROLE_PERMISSIONS[a.role], createdAt: now, updatedAt: now,
});

/** The affiliate account's `affiliates` record. */
export function affiliateDoc(now = new Date()) {
  const affiliate = ACCOUNTS.find((a) => a.role === 'affiliate');
  return {
    affiliateId: 'aff_views', code: 'VIEWS', codeSetByAffiliate: false, userId: affiliate.userID,
    name: `${affiliate.firstName} ${affiliate.lastName}`, email: affiliate.email, status: 'active',
    commissionType: 'percentage', commissionRate: 0.1, attributionWindowDays: 90, createdAt: now, updatedAt: now,
  };
}

/** Fill an empty database. Returns the accounts with their password. */
export async function seed(dbi) {
  const now = new Date();
  const password = await bcrypt.hash(PASSWORD, 10);
  await dbi.collection('users').insertMany(ACCOUNTS.map((a) => userDoc(a, password, now)));
  await dbi.collection('affiliates').insertOne(affiliateDoc(now));
  await dbi.collection('adminSettings').insertOne({ _id: 'repair_task_admin_settings', pricing: PRICING, updatedAt: now });
  return ACCOUNTS.map((a) => ({ key: a.key, email: a.email, password: PASSWORD }));
}
