/**
 * Payroll funding (owner, 2026-09-22: "what do we do to guarantee EFD always has money to pay our
 * contractors?").
 *
 * A Connect transfer can only spend balance that is already in EFD's Stripe account; Stripe never
 * debits the bank to cover one. Most stores pay cash, which never reaches Stripe, and Stripe's
 * default payout schedule sweeps the balance to the bank daily. So before Wednesday's payroll run:
 *
 *   projected payroll  = finalized-but-unpaid batches + labor / sale payouts credited so far this week
 *   target             = projected × (1 + buffer) + floor
 *   spendable          = available + pending on a MANUAL payout schedule; available ALONE on an
 *                        automatic one, where Stripe sweeps each receipt to the bank as it settles
 *   shortfall          = target − spendable
 *   if shortfall > minimum → one Stripe TOP-UP (ACH debit from the verified business bank account)
 *
 * Runs Monday morning so a standard 1–2 business-day top-up lands before Wednesday's payroll run;
 * the daily payout cron retries anything that arrives late. One top-up per calendar day is guaranteed by the
 * idempotency key, so a re-run never double-pulls. Settings: adminSettings.business.payroll.funding.
 */
import { db } from '@/lib/database';
import RepairPayrollBatchesModel from '@/app/api/repairPayrollBatches/model';
import { listPayrollCandidates } from '@/app/api/repairs/payroll/service';
import { PAYROLL_BATCH_STATUS, payrollTotal } from '@/services/payrollUtils';
import { batchAmount } from '@/services/payroll/connectPayouts';
import { isStripeConfigured, stripeMode, retrieveBalance, availableUsdCents, pendingUsdCents, createTopup, retrievePlatformAccount, payoutScheduleOf } from '@/lib/stripeConnect';
import { notifyAllAdmins } from '@/lib/notificationService';
import { adminBase } from '@/lib/appUrls';

export const SETTINGS_ID = 'repair_task_admin_settings';
// Defaults sized for the SMALLEST version of EFD (owner, 2026-09-22: $1,800 in the bank, rent due):
// a modest floor and a hard cap on any single pull, both editable in Store Settings.
export const FUNDING_DEFAULTS = Object.freeze({ enabled: false, floor: 300, bufferPct: 10, minimumTopup: 25, maxTopup: 500 });

const money = (n) => Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/** Pure: settings block with defaults and sane clamps. */
export function normalizeFundingSettings(input = {}) {
  const num = (v, d, min, max) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : d;
  };
  return {
    enabled: input?.enabled === true,
    floor: num(input?.floor, FUNDING_DEFAULTS.floor, 0, 100000),
    bufferPct: num(input?.bufferPct, FUNDING_DEFAULTS.bufferPct, 0, 100),
    minimumTopup: num(input?.minimumTopup, FUNDING_DEFAULTS.minimumTopup, 1, 10000),
    // Never pull more than this from the bank in one run — the check has no view of the bank balance.
    maxTopup: num(input?.maxTopup, FUNDING_DEFAULTS.maxTopup, 25, 100000),
  };
}

export function fundingFromSettings(doc) {
  return normalizeFundingSettings(doc?.business?.payroll?.funding);
}

/**
 * Pure: how much to pull. `balance` = what Stripe will have by Wednesday (available + pending).
 * Returns { projected, target, balance, shortfall, topup } in dollars; topup is 0 when nothing is due.
 */
export function computeFundingNeed({ projected = 0, balance = 0, settings = FUNDING_DEFAULTS } = {}) {
  const s = normalizeFundingSettings(settings);
  const target = round2(projected * (1 + s.bufferPct / 100) + s.floor);
  const shortfall = round2(Math.max(0, target - balance));
  const topup = shortfall >= s.minimumTopup ? Math.min(shortfall, s.maxTopup) : 0;
  return { projected: round2(projected), target, balance: round2(balance), shortfall, topup, capped: topup > 0 && topup < shortfall };
}

/** Pure: one top-up per calendar day, however often the check re-runs. */
export function fundingIdempotencyKey(now = new Date()) {
  return `payroll-funding-${now.toISOString().slice(0, 10)}`;
}

export async function readFundingSettings() {
  const dbi = await db.connect();
  const doc = await dbi.collection('adminSettings').findOne({ _id: SETTINGS_ID }, { projection: { 'business.payroll.funding': 1 } });
  return fundingFromSettings(doc);
}

export async function writeFundingSettings(input, { actor = '' } = {}) {
  const next = normalizeFundingSettings(input);
  const dbi = await db.connect();
  const now = new Date();
  await dbi.collection('adminSettings').updateOne(
    { _id: SETTINGS_ID },
    { $set: { 'business.payroll.funding': { ...next, updatedAt: now, updatedBy: actor }, updatedAt: now } },
  );
  return next;
}

/** Everything payroll will want to pay on Wednesday: finalized-unpaid batches + this week's unbatched earnings. */
export async function projectPayrollDue() {
  const [finalized, candidates] = await Promise.all([
    RepairPayrollBatchesModel.list({ status: PAYROLL_BATCH_STATUS.FINALIZED }),
    listPayrollCandidates({}),
  ]);
  const finalizedTotal = finalized.reduce((s, b) => s + batchAmount(b), 0);
  const unbatchedTotal = candidates.reduce((s, c) => s + payrollTotal(c), 0);
  return {
    projected: round2(finalizedTotal + unbatchedTotal),
    finalizedTotal: round2(finalizedTotal),
    unbatchedTotal: round2(unbatchedTotal),
    finalizedCount: finalized.length,
    payees: [...new Set([...finalized.map((b) => b.userName || b.userID), ...candidates.map((c) => c.userName || c.userID)])],
  };
}

/**
 * The Monday check. Never throws; returns what it saw and what it did, and tells admins when money
 * moved or when it could not.
 */
export async function runFundingCheck({ now = new Date(), dryRun = false, notify = true, preview = false } = {}) {
  const settings = await readFundingSettings();
  const result = { ranAt: now, settings, dryRun, stripe: isStripeConfigured() ? stripeMode() : 'unconfigured', topup: null, error: null };

  // A PREVIEW may look past the switch, and only a preview. The settings card has to be able to
  // answer "what does Wednesday need, and does Stripe have it?" BEFORE funding is turned on —
  // that is the number the decision is made on, and it was unavailable at exactly the moment it
  // mattered (owner, 2026-09-28: waiting on a Friday payment with the switch still off and no way
  // to see whether it mattered). `preview` is honoured only together with `dryRun`, and a dry run
  // returns before `createTopup`, so this can never move money while funding is off.
  const previewingWhileOff = preview === true && dryRun === true && !settings.enabled;
  if (!settings.enabled && !previewingWhileOff) return { ...result, skipped: 'funding check is off in Store Settings' };
  if (previewingWhileOff) result.previewedWhileOff = true;
  if (!isStripeConfigured()) return { ...result, skipped: 'Stripe not configured' };

  try {
    const [due, balance, account] = await Promise.all([
      projectPayrollDue(),
      retrieveBalance(),
      // Never let a schedule lookup fail the whole check; `null` means "we could not tell".
      retrievePlatformAccount().then(payoutScheduleOf).catch(() => null),
    ]);
    const available = availableUsdCents(balance) / 100;
    const pending = pendingUsdCents(balance) / 100;

    // WHETHER PENDING COUNTS DEPENDS ENTIRELY ON THE PAYOUT SCHEDULE (owner, 2026-09-28).
    //
    // This used to count `available + pending` unconditionally, on the reasoning that card receipts
    // settle before payroll runs. That is true only on a MANUAL schedule. On Stripe's default
    // automatic schedule the money settles and is swept to the bank the same day, so pending is
    // never spendable by a Connect transfer — and the check cheerfully reported "funded" against a
    // balance that would be $0 when payroll actually ran. That is exactly the state EFD was in:
    // $0.00 available, $1,039.13 pending, already scheduled to leave on Oct 1.
    //
    // When the schedule cannot be read we keep the old, generous reading rather than pulling money
    // from the business account on a guess — but we say so, so nobody trusts it blindly.
    const scheduleKnown = account !== null;
    const automaticPayouts = scheduleKnown && account.interval !== 'manual';
    const spendable = automaticPayouts ? available : available + pending;
    const need = computeFundingNeed({ projected: due.projected, balance: spendable, settings });
    Object.assign(result, {
      due,
      available: round2(available),
      pending: round2(pending),
      spendable: round2(spendable),
      schedule: account,
      scheduleKnown,
      automaticPayouts,
      need,
    });

    if (need.topup <= 0) {
      return {
        ...result,
        // Say plainly that nothing moved. "funded: $1,039.13 covers $624.50" under a button labelled
        // Fund Stripe now read as though $1,039.13 had just been pulled (owner, 2026-09-28).
        skipped: `No top-up needed — ${money(spendable)} spendable covers the ${money(need.target)} target.`,
      };
    }
    // Belt and braces: a dry run never reaches createTopup, which is also what keeps a
    // preview-while-off from pulling anything.
    if (dryRun) return { ...result, wouldTopup: need.topup };

    const topup = await createTopup({
      amountCents: Math.round(need.topup * 100),
      description: `Payroll funding — projected ${money(due.projected)} + ${settings.bufferPct}% buffer + ${money(settings.floor)} floor`,
      metadata: { projected: String(due.projected), target: String(need.target), balance: String(need.balance), runAt: now.toISOString() },
      idempotencyKey: fundingIdempotencyKey(now),
    });
    result.topup = { id: topup.id, amount: need.topup, status: topup.status, expectedAvailability: topup.expected_availability_date ? new Date(topup.expected_availability_date * 1000) : null };
    if (notify) {
      await notifyAllAdmins({
        type: 'payroll-funding',
        title: `Pulled ${money(need.topup)} into Stripe for payroll`,
        message: `Wednesday needs about ${money(due.projected)} (${due.payees.join(', ') || 'no payees yet'}); Stripe had ${money(available)} available + ${money(pending)} pending, ${money(spendable)} of it spendable. A ${money(need.topup)} top-up${need.capped ? ` (capped — ${money(need.shortfall)} short)` : ''} from the business bank account is on its way${result.topup.expectedAvailability ? `, expected ${result.topup.expectedAvailability.toLocaleDateString('en-US')}` : ''}.${automaticPayouts ? ' NOTE: payouts are on an automatic schedule, so this top-up can be swept back to the bank before payroll spends it — switch Stripe payouts to Manual.' : ''}`,
        actionUrl: `${adminBase()}/dashboard/repairs/payroll`, actionLabel: 'Open payroll',
        priority: 'normal', channels: ['inApp', 'email'], relatedType: 'payroll-funding', relatedData: result,
      }).catch(() => {});
    }
    return result;
  } catch (error) {
    result.error = error?.message || String(error);
    if (notify) {
      await notifyAllAdmins({
        type: 'payroll-funding-failed',
        title: 'Payroll funding could not top up Stripe',
        message: `${result.error}${/bank|verified|source/i.test(result.error) ? ' — verify the business bank account for top-ups in the Stripe dashboard.' : ''} Contractors will wait until the balance covers payroll.`,
        actionUrl: `${adminBase()}/dashboard/admin/settings`, actionLabel: 'Open settings',
        priority: 'high', channels: ['inApp', 'email', 'push'], relatedType: 'payroll-funding', relatedData: result,
      }).catch(() => {});
    }
    return result;
  }
}
