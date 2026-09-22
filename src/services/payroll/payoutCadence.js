/**
 * Payout cadence + fees (owner, 2026-09-22).
 *
 *   weekly (default) — one batch per Sun–Sat week, transferred Wednesday, in the bank Friday. FREE
 *                      to the payee: EFD absorbs Stripe's payout fee.
 *   daily            — each day's credited earnings become their own batch the next morning and are
 *                      transferred immediately (bank in ~2 business days; Instant Payout from their
 *                      Stripe dashboard if they want it faster). The payee pays for the speed:
 *                      Stripe's payout fee ($0.25 + 0.25%) PLUS a flat EFD fee ($1), netted out of
 *                      the transfer and shown on the batch as gross / fee / net.
 *
 * Cadence is granted per payee by an admin (`users.payoutSettings.cadence`, a privileged field).
 * Fee rates live in adminSettings.business.payroll.fees so a Stripe price change is a field edit.
 * Owner-operators are never charged the EFD fee — paying yourself to pay yourself is a circle.
 */
import { db } from '@/lib/database';
import RepairLaborLogsModel from '@/app/api/repairLaborLogs/model';
import SalePayoutsModel from '@/app/api/salePayouts/model';
import RepairPayrollBatchesModel from '@/app/api/repairPayrollBatches/model';
import { getOwnerOperatorUserIDs, finalizePayrollBatch } from '@/app/api/repairs/payroll/service';
import { PAYROLL_BATCH_STATUS, buildPayrollBatchTotals } from '@/services/payrollUtils';

export const SETTINGS_ID = 'repair_task_admin_settings';
export const CADENCES = Object.freeze(['weekly', 'daily']);
export const FEE_DEFAULTS = Object.freeze({ stripeFlat: 0.25, stripePct: 0.25, stripePctMinimum: 0.25, dailyFlat: 1.0 });

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const DAY = 24 * 60 * 60 * 1000;

export function normalizeCadence(value) {
  return value === 'daily' ? 'daily' : 'weekly';
}

export function normalizeFeeSettings(input = {}) {
  const num = (v, d, max) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : d; };
  return {
    stripeFlat: num(input?.stripeFlat, FEE_DEFAULTS.stripeFlat, 10),
    stripePct: num(input?.stripePct, FEE_DEFAULTS.stripePct, 10),
    stripePctMinimum: num(input?.stripePctMinimum, FEE_DEFAULTS.stripePctMinimum, 10),
    dailyFlat: num(input?.dailyFlat, FEE_DEFAULTS.dailyFlat, 50),
  };
}

/**
 * Pure: what a daily payout costs the payee and what they net. `ownerOperator` skips the EFD fee.
 * Stripe's percentage is computed on the amount that actually pays out (the net) and floored at
 * `stripePctMinimum` (owner, 2026-09-22: "25 cent minimum on the 0.25%"). Solved exactly:
 *   pct part ≥ minimum  →  net = gross − stripeFlat − efdFee − minimum
 *   otherwise           →  net = (gross − stripeFlat − efdFee) / (1 + stripePct)
 */
export function computeDailyPayout({ gross = 0, fees = FEE_DEFAULTS, ownerOperator = false } = {}) {
  const f = normalizeFeeSettings(fees);
  const efdFee = ownerOperator ? 0 : f.dailyFlat;
  const pct = f.stripePct / 100;
  const fixed = f.stripeFlat + efdFee;
  const proportional = (gross - fixed) / (1 + pct);          // net if the % part is above the minimum
  const pctPart = proportional * pct;
  const net = round2(Math.max(0, pctPart >= f.stripePctMinimum ? proportional : gross - fixed - f.stripePctMinimum));
  const stripeFee = net > 0 ? round2(f.stripeFlat + Math.max(f.stripePctMinimum, net * pct)) : 0;
  const fee = round2(gross - net);
  return { gross: round2(gross), net, fee, stripeFee, efdFee: net > 0 ? efdFee : 0, cadence: 'daily' };
}

/** Pure: the fee line a payee reads before opting in. */
export function dailyFeeLabel(fees = FEE_DEFAULTS) {
  const f = normalizeFeeSettings(fees);
  const flat = round2(f.stripeFlat + f.dailyFlat);
  return `$${flat.toFixed(2)} + ${f.stripePct}% (min $${f.stripePctMinimum.toFixed(2)}) per payout`;
}

export async function readFeeSettings() {
  const dbi = await db.connect();
  const doc = await dbi.collection('adminSettings').findOne({ _id: SETTINGS_ID }, { projection: { 'business.payroll.fees': 1 } });
  return normalizeFeeSettings(doc?.business?.payroll?.fees);
}

export async function writeFeeSettings(input, { actor = '' } = {}) {
  const next = normalizeFeeSettings(input);
  const dbi = await db.connect();
  const now = new Date();
  await dbi.collection('adminSettings').updateOne({ _id: SETTINGS_ID }, { $set: { 'business.payroll.fees': { ...next, updatedAt: now, updatedBy: actor }, updatedAt: now } });
  return next;
}

export async function readCadence(userID) {
  const dbi = await db.connect();
  const u = await dbi.collection('users').findOne({ userID }, { projection: { _id: 0, 'payoutSettings.cadence': 1 } });
  return normalizeCadence(u?.payoutSettings?.cadence);
}

export async function setCadence({ userID, cadence, actor = '' }) {
  const next = normalizeCadence(cadence);
  const dbi = await db.connect();
  const now = new Date();
  await dbi.collection('users').updateOne({ userID }, { $set: { 'payoutSettings.cadence': next, 'payoutSettings.updatedAt': now, 'payoutSettings.updatedBy': actor, updatedAt: now } });
  return { userID, cadence: next };
}

export async function listDailyPayees() {
  const dbi = await db.connect();
  return dbi.collection('users').find({ 'payoutSettings.cadence': 'daily' }, { projection: { _id: 0, userID: 1, firstName: 1, lastName: 1, email: 1 } }).toArray();
}

/** Start of the calendar day for a date (server clock, matching how weekStart is stamped). */
export function startOfDay(value = new Date()) {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Cut a daily payee's unbatched earnings from every day BEFORE today into one finalized batch per
 * day (keyed by that day, `cadence: 'daily'`). Returns the batches created. Idempotent: earnings
 * already on a batch are not candidates, and an open batch for that user-day is skipped.
 */
export async function createDailyBatches({ userID, now = new Date(), createdBy = 'payroll-cron' }) {
  const today = startOfDay(now);
  const ownerUserIDs = await getOwnerOperatorUserIDs();
  const dbi = await db.connect();

  const logs = await dbi.collection('laborLogs')
    .find({ ...RepairLaborLogsModel.buildUnbatchedMatch({ userID, ownerUserIDs }), createdAt: { $lt: today } })
    .project({ _id: 0 }).toArray();
  const payouts = await dbi.collection('salePayouts')
    .find({ $or: [{ payeeUserID: userID }, { sellerUserID: userID }], payrollStatus: { $in: ['unbatched', '', null] }, payrollBatchID: { $in: ['', null] }, createdAt: { $lt: today } })
    .project({ _id: 0 }).toArray();

  const byDay = new Map();
  const bucket = (date) => { const k = startOfDay(date).getTime(); if (!byDay.has(k)) byDay.set(k, { logs: [], payouts: [] }); return byDay.get(k); };
  logs.forEach((l) => bucket(l.createdAt || l.weekStart).logs.push(l));
  payouts.forEach((p) => bucket(p.createdAt || p.weekStart).payouts.push(p));

  const created = [];
  for (const [dayMs, group] of [...byDay.entries()].sort((a, b) => a[0] - b[0])) {
    const day = new Date(dayMs);
    const existing = await RepairPayrollBatchesModel.findOpenByUserWeek({ userID, weekStart: day });
    if (existing) continue;
    const totals = buildPayrollBatchTotals(group.logs);
    const salePay = round2(group.payouts.reduce((s, p) => s + Number(p.payoutAmount || 0), 0));
    if (totals.laborPay + salePay <= 0) continue;
    const userName = group.logs[0]?.primaryJewelerName || group.payouts[0]?.sellerName || userID;
    const batch = await RepairPayrollBatchesModel.create({
      userID, userName, weekStart: day, weekEnd: new Date(dayMs + DAY - 1), cadence: 'daily',
      laborHours: totals.laborHours, laborPay: totals.laborPay, repairsWorked: totals.repairsWorked, entryCount: totals.entryCount + group.payouts.length,
      logIDs: group.logs.map((l) => l.logID), salePayoutIDs: group.payouts.map((p) => p.payoutID), salePay, totalPay: round2(totals.laborPay + salePay),
      status: PAYROLL_BATCH_STATUS.DRAFT, notes: `Daily payout batch for ${day.toLocaleDateString('en-US')}.`, createdBy,
    });
    await RepairLaborLogsModel.assignToPayrollBatch(batch.logIDs, batch.batchID);
    await SalePayoutsModel.assignToPayrollBatch(batch.salePayoutIDs, batch.batchID);
    await finalizePayrollBatch(batch.batchID);
    created.push({ batchID: batch.batchID, userID, userName, day, amount: round2(totals.laborPay + salePay) });
  }
  return created;
}

/** Every daily-cadence payee, every closed day. Never throws; per-payee errors are collected. */
export async function createDailyBatchesForAllDailyPayees({ now = new Date(), createdBy = 'payroll-cron' } = {}) {
  const payees = await listDailyPayees();
  const out = { created: [], errors: [] };
  for (const p of payees) {
    try { out.created.push(...await createDailyBatches({ userID: p.userID, now, createdBy })); }
    catch (error) { out.errors.push({ userID: p.userID, error: error?.message || String(error) }); }
  }
  return out;
}
