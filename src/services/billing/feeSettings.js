/**
 * Settings screens for the money defaults that were code-only (owner, 2026-09-22):
 *
 *   SALE FEES   — pricing.feeSchedule { consignment, marketplace, pillars{storefront,custody,fulfillment} }
 *                 read by services/billing/feeSchedule.loadFeeSchedule (sales-invoices → payouts, the guide).
 *                 `pricing.consignmentFeeRate` is the legacy flat rate the Pricing card also edits and
 *                 loadFeeSchedule prefers when set — so writing here keeps BOTH in step (one truth).
 *   CUSTOM FEES — financial.clientMgmtBonusPct (customs/customProduction: CAD designer who handled the
 *                 client earns this share of the order margin) and financial.qcReviewFee (the flat labor
 *                 line the QC reviewer of a CAD / piece work order is credited; passes through at cost).
 *
 * Dot-path $set only — the rest of `pricing` / `financial` is never rewritten.
 */
import { db } from '@/lib/database';
import { DEFAULT_FEE_SCHEDULE, loadFeeSchedule } from '@/services/billing/feeSchedule';

export const SETTINGS_ID = 'repair_task_admin_settings';
export const CUSTOM_FEE_DEFAULTS = Object.freeze({ clientMgmtBonusPct: 0.05, qcReviewFee: 25 });

const round4 = (n) => Math.round((Number(n) || 0) * 10000) / 10000;
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

function rate(v, fallback, label) {
  if (v === undefined || v === null || v === '') return fallback;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 1) throw new Error(`${label} must be between 0% and 100%.`);
  return round4(n);
}

/** Pure: a full fee schedule from any input (rates as fractions, 0–1). */
export function normalizeFeeSchedule(input = {}) {
  const base = DEFAULT_FEE_SCHEDULE;
  const schedule = {
    consignment: rate(input?.consignment, base.consignment, 'Consignment rate'),
    marketplace: rate(input?.marketplace, base.marketplace, 'Marketplace rate'),
    pillars: {
      storefront: rate(input?.pillars?.storefront, base.pillars.storefront, 'Storefront pillar'),
      custody: rate(input?.pillars?.custody, base.pillars.custody, 'Custody pillar'),
      fulfillment: rate(input?.pillars?.fulfillment, base.pillars.fulfillment, 'Fulfillment pillar'),
    },
  };
  const hybridMax = round4(schedule.pillars.storefront + schedule.pillars.custody + schedule.pillars.fulfillment);
  if (hybridMax > 1) throw new Error('The three pillars add up to more than 100%.');
  return schedule;
}

/** Pure: custom-order fee block. */
export function normalizeCustomFees(input = {}) {
  const pct = rate(input?.clientMgmtBonusPct, CUSTOM_FEE_DEFAULTS.clientMgmtBonusPct, 'Client-management bonus');
  const feeRaw = input?.qcReviewFee === undefined || input?.qcReviewFee === null || input?.qcReviewFee === '' ? CUSTOM_FEE_DEFAULTS.qcReviewFee : Number(input.qcReviewFee);
  if (!Number.isFinite(feeRaw) || feeRaw < 0 || feeRaw > 1000) throw new Error('QC review fee must be between $0 and $1,000.');
  return { clientMgmtBonusPct: pct, qcReviewFee: round2(feeRaw) };
}

/** Pure: the custom-fee block a settings document declares (defaults when absent). */
export function customFeesFromSettings(settings) {
  const f = settings?.financial || {};
  const pct = Number(f.clientMgmtBonusPct);
  const fee = Number(f.qcReviewFee);
  return {
    clientMgmtBonusPct: Number.isFinite(pct) && f.clientMgmtBonusPct !== undefined && f.clientMgmtBonusPct !== null && pct >= 0 && pct <= 1 ? pct : CUSTOM_FEE_DEFAULTS.clientMgmtBonusPct,
    qcReviewFee: fee > 0 ? fee : CUSTOM_FEE_DEFAULTS.qcReviewFee,
  };
}

export async function readSaleFees() {
  const dbi = await db.connect();
  const doc = await dbi.collection('adminSettings').findOne({ _id: SETTINGS_ID }, { projection: { 'pricing.feeSchedule': 1, 'pricing.consignmentFeeRate': 1 } });
  return loadFeeSchedule(doc || {});
}

export async function writeSaleFees(input, { actor = '' } = {}) {
  const next = normalizeFeeSchedule(input);
  const dbi = await db.connect();
  const now = new Date();
  await dbi.collection('adminSettings').updateOne(
    { _id: SETTINGS_ID },
    { $set: {
      'pricing.feeSchedule': { ...next, updatedAt: now, updatedBy: actor },
      // the legacy flat rate the Pricing card edits; loadFeeSchedule prefers it, so keep it identical
      'pricing.consignmentFeeRate': next.consignment,
      updatedAt: now,
    } },
  );
  return next;
}

export async function readCustomFees() {
  const dbi = await db.connect();
  const doc = await dbi.collection('adminSettings').findOne({ _id: SETTINGS_ID }, { projection: { 'financial.clientMgmtBonusPct': 1, 'financial.qcReviewFee': 1 } });
  return customFeesFromSettings(doc);
}

export async function writeCustomFees(input, { actor = '' } = {}) {
  const next = normalizeCustomFees(input);
  const dbi = await db.connect();
  const now = new Date();
  await dbi.collection('adminSettings').updateOne(
    { _id: SETTINGS_ID },
    { $set: { 'financial.clientMgmtBonusPct': next.clientMgmtBonusPct, 'financial.qcReviewFee': next.qcReviewFee, 'financial.customFeesUpdatedAt': now, 'financial.customFeesUpdatedBy': actor, updatedAt: now } },
  );
  return next;
}
