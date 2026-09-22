/**
 * Paying people through Stripe Connect (owner, 2026-09-21: "I want to be able to pay out my
 * artisans too, whether they are in-house jewelers or any other role — they get paid for whatever
 * they do").
 *
 * The ledger is the payroll batch: one payee, one week, everything they earned — bench labor,
 * consignment sale payouts, affiliate commissions (those are written as flat-fee labor entries),
 * the owner's own labor. This module turns a FINALIZED batch into money:
 *
 *   payee connects an Express account (self-service on their Payroll page, or an admin sends the
 *   link)  →  every finalized batch is transferred from EFD's Stripe balance, marked PAID with the
 *   transfer id, and the payee is told.
 *
 * THIS IS THE ONLY WAY ANYONE IS PAID (owner, 2026-09-22: "autopay is a requirement to get paid,
 * it's the only path"). No manual Mark Paid, no ledger settlement for the owner, no per-payee
 * switch: a finalized batch waits, unpaid, until its payee has a live Stripe account, and the payee
 * is reminded each week that money is waiting.
 *
 * Stored on the user:
 *   stripeConnect = { accountId, detailsSubmitted, payoutsEnabled, requirementsDue, lastCheckedAt }
 * — a privileged field: the generic user PUT strips it (app/api/users/model.js).
 * Transfers use `payroll-<batchID>` as the idempotency key, so a retry can never double-pay.
 * If EFD's available balance is short the batch simply stays FINALIZED and is retried on the next
 * run; admins are told once per run.
 */
import { db } from '@/lib/database';
import RepairPayrollBatchesModel from '@/app/api/repairPayrollBatches/model';
import { markPayrollBatchPaid } from '@/app/api/repairs/payroll/service';
import { PAYROLL_BATCH_STATUS, payrollTotal } from '@/services/payrollUtils';
import {
  isStripeConfigured, stripeMode, createExpressAccount, createAccountLink, createLoginLink,
  retrieveAccount, retrieveBalance, createTransfer, summarizeAccount, availableUsdCents,
} from '@/lib/stripeConnect';
import { notifyAllAdmins } from '@/lib/notificationService';
import { adminBase } from '@/lib/appUrls';
import { computeDailyPayout, readFeeSettings, createDailyBatchesForAllDailyPayees } from '@/services/payroll/payoutCadence';

export const CONNECT_PAYMENT_METHOD = 'stripe-connect';

/** Where a payee connects Stripe and sees their payouts, by role. Pure. */
export function payoutPagePath(role) {
  if (role === 'affiliate') return '/dashboard/affiliate/payouts';
  if (role === 'admin' || role === 'dev' || role === 'superadmin') return '/dashboard/repairs/payroll';
  return '/dashboard/artisan/payroll';
}

const money = (n) => Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const USER_PROJECTION = { _id: 0, userID: 1, email: 1, firstName: 1, lastName: 1, role: 1, stripeConnect: 1, compensationProfile: 1, payoutSettings: 1 };

async function loadUser(userID) {
  const dbi = await db.connect();
  return dbi.collection('users').findOne({ userID }, { projection: USER_PROJECTION });
}

async function saveConnect(userID, patch) {
  const dbi = await db.connect();
  const $set = { updatedAt: new Date() };
  for (const [k, v] of Object.entries(patch)) $set[`stripeConnect.${k}`] = v;
  await dbi.collection('users').updateOne({ userID }, { $set });
}

/** Pure: can this user receive a transfer right now? */
export function isConnectLive(user) {
  return Boolean(user?.stripeConnect?.accountId && user.stripeConnect.payoutsEnabled);
}

/** Pure: what a batch needs to be paid by Connect. */
export function payoutEligibility({ batch, user }) {
  if (!batch) return { eligible: false, reason: 'no batch' };
  if (batch.status !== PAYROLL_BATCH_STATUS.FINALIZED) return { eligible: false, reason: `batch is ${batch.status}` };
  const amount = batchAmount(batch);
  if (amount <= 0) return { eligible: false, reason: 'nothing to pay' };
  if (!user?.stripeConnect?.accountId) return { eligible: false, reason: 'no Stripe account connected' };
  if (!user.stripeConnect.payoutsEnabled) return { eligible: false, reason: 'Stripe onboarding not finished' };
  return { eligible: true, amount };
}

export function batchAmount(batch = {}) {
  return payrollTotal(batch);
}

/** Create (once) the payee's Express account and hand back the onboarding URL. */
export async function startConnectOnboarding({ userID, returnUrl, refreshUrl }) {
  if (!isStripeConfigured()) throw Object.assign(new Error('Stripe is not configured.'), { code: 'STRIPE_UNCONFIGURED' });
  const user = await loadUser(userID);
  if (!user) throw Object.assign(new Error('User not found.'), { code: 'NOT_FOUND' });

  let accountId = user.stripeConnect?.accountId || '';
  if (!accountId) {
    const account = await createExpressAccount({
      email: user.email, userID: user.userID, name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
    });
    accountId = account.id;
    await saveConnect(userID, { ...summarizeAccount(account), createdAt: new Date(), mode: stripeMode(), lastCheckedAt: new Date() });
  }
  const link = await createAccountLink({ accountId, returnUrl, refreshUrl });
  return { accountId, url: link.url, expiresAt: link.expires_at ? new Date(link.expires_at * 1000) : null };
}

/** Pull the live account state from Stripe and store it. */
export async function refreshConnectStatus({ userID }) {
  const user = await loadUser(userID);
  const accountId = user?.stripeConnect?.accountId;
  if (!accountId) return { connected: false };
  const account = await retrieveAccount(accountId);
  const summary = summarizeAccount(account);
  await saveConnect(userID, { ...summary, lastCheckedAt: new Date() });
  return { connected: true, ...summary, cadence: user.payoutSettings?.cadence === 'daily' ? 'daily' : 'weekly' };
}

export async function connectDashboardLink({ userID }) {
  const user = await loadUser(userID);
  const accountId = user?.stripeConnect?.accountId;
  if (!accountId) throw Object.assign(new Error('No Stripe account connected.'), { code: 'NOT_FOUND' });
  const link = await createLoginLink({ accountId });
  return link.url;
}

/**
 * Pay one finalized batch through Connect. Refreshes the account first (payouts may have been
 * disabled since), checks EFD's available balance, transfers with an idempotency key, then marks
 * the batch PAID (the payee's "you have been paid" notification fires from there).
 */
/** Pure: pay the oldest weeks first, so a short balance never leapfrogs someone who has waited longer. */
export function orderBatchesForPayout(batches = []) {
  return [...(batches || [])].sort((a, b) => {
    const wa = new Date(a?.weekStart || 0).getTime(); const wb = new Date(b?.weekStart || 0).getTime();
    if (wa !== wb) return wa - wb;
    return new Date(a?.createdAt || 0).getTime() - new Date(b?.createdAt || 0).getTime();
  });
}

/**
 * `availableCents`: when the caller already fetched EFD's balance (runConnectPayouts pays several
 * batches from one snapshot), pass it and this will not fetch again.
 */
export async function payBatchViaConnect({ batchID, actor = 'payroll-cron', availableCents = null }) {
  const batch = await RepairPayrollBatchesModel.findByBatchID(batchID);
  const user = await loadUser(batch?.userID);
  if (user?.stripeConnect?.accountId) {
    try { Object.assign(user.stripeConnect, summarizeAccount(await retrieveAccount(user.stripeConnect.accountId))); } catch { /* use stored state */ }
  }
  const check = payoutEligibility({ batch, user });
  if (!check.eligible) return { paid: false, batchID, userID: batch?.userID, userName: batch?.userName, amount: batchAmount(batch || {}), reason: check.reason };

  // Daily cadence: the payee pays for the speed — Stripe's payout fee + EFD's flat fee come out of
  // the transfer (payoutCadence.computeDailyPayout). Weekly batches transfer the full amount.
  let payout = null;
  let transferAmount = check.amount;
  if (batch.cadence === 'daily') {
    const ownerOperator = user.compensationProfile?.isOwnerOperator === true;
    payout = computeDailyPayout({ gross: check.amount, fees: await readFeeSettings(), ownerOperator });
    if (payout.net <= 0) return { paid: false, batchID, userID: user.userID, userName: batch.userName, amount: check.amount, reason: 'day too small to cover the payout fee' };
    transferAmount = payout.net;
  }

  const amountCents = Math.round(transferAmount * 100);
  const available = Number.isFinite(Number(availableCents)) && availableCents !== null
    ? Number(availableCents)
    : availableUsdCents(await retrieveBalance());
  if (available < amountCents) {
    return { paid: false, batchID, reason: 'insufficient balance', amount: check.amount, transferAmount, available: available / 100 };
  }

  const transfer = await createTransfer({
    amountCents,
    destination: user.stripeConnect.accountId,
    description: `Payroll ${batch.cadence === 'daily' ? 'day' : 'week'} of ${new Date(batch.weekStart).toLocaleDateString('en-US')} — ${batch.userName || user.userID}`,
    metadata: { batchID, userID: user.userID, weekStart: new Date(batch.weekStart).toISOString(), cadence: batch.cadence || 'weekly', ...(payout ? { gross: String(payout.gross), fee: String(payout.fee), net: String(payout.net) } : {}) },
    transferGroup: batchID,
    idempotencyKey: `payroll-${batchID}`,
  });

  await markPayrollBatchPaid(batchID, {
    paidAt: new Date(),
    paymentMethod: CONNECT_PAYMENT_METHOD,
    paymentReference: transfer.id,
    notes: `${batch.notes ? `${batch.notes} · ` : ''}Paid by Stripe Connect transfer ${transfer.id} (${actor})${payout ? ` — ${payout.net.toFixed(2)} net of ${payout.fee.toFixed(2)} daily payout fee` : ''}.`,
    notify: true,
    payout,
  });
  return { paid: true, batchID, amount: transferAmount, amountCents, gross: check.amount, fee: payout?.fee || 0, transferId: transfer.id, userID: user.userID, userName: batch.userName, cadence: batch.cadence || 'weekly' };
}

/**
 * Pay every finalized batch whose payee has a live Stripe account. Never throws; returns a summary
 * (paid / waiting on Stripe setup / short balance / errors) and tells admins about anything that
 * needs a hand.
 */
export async function runConnectPayouts({ actor = 'payroll-cron', notify = true, now = new Date() } = {}) {
  const result = { paid: [], skipped: [], shortfall: [], errors: [], dailyBatches: [], funding: null, available: null, stripe: isStripeConfigured() ? stripeMode() : 'unconfigured' };
  if (!isStripeConfigured()) return result;

  // Funding FIRST (owner, 2026-09-22): if the balance will not cover what is due, start the top-up now
  // rather than discovering it batch by batch. Lazy import — payrollFunding imports batchAmount from here.
  try {
    const { runFundingCheck } = await import('@/services/payroll/payrollFunding');
    const f = await runFundingCheck({ now, notify: false });
    result.funding = { skipped: f.skipped || null, topup: f.topup ? { amount: f.topup.amount, expectedAvailability: f.topup.expectedAvailability } : null, wouldTopup: f.wouldTopup || null, error: f.error || null, need: f.need || null };
  } catch (error) {
    result.funding = { error: error?.message || String(error) };
  }

  // Daily-cadence payees: yesterday's (and any older unbatched) earnings become today's batches first.
  try {
    const daily = await createDailyBatchesForAllDailyPayees({ createdBy: actor });
    result.dailyBatches = daily.created;
    result.errors.push(...daily.errors.map((e) => ({ ...e, error: `daily batching: ${e.error}` })));
  } catch (error) {
    result.errors.push({ error: `daily batching: ${error?.message || error}` });
  }

  // One balance snapshot, then oldest week first, decrementing as transfers go out. A batch that does
  // not fit is left FINALIZED (never partially paid) and the loop keeps going so smaller ones behind it
  // can still be paid; the shortfall goes in the digest.
  let availableCents = 0;
  try {
    availableCents = availableUsdCents(await retrieveBalance());
    result.available = availableCents / 100;
  } catch (error) {
    result.errors.push({ error: `balance: ${error?.message || error}` });
    return result;
  }
  const finalized = orderBatchesForPayout(await RepairPayrollBatchesModel.list({ status: PAYROLL_BATCH_STATUS.FINALIZED }));
  for (const batch of finalized) {
    try {
      const r = await payBatchViaConnect({ batchID: batch.batchID, actor, availableCents });
      if (r.paid) { result.paid.push(r); availableCents -= Number(r.amountCents) || Math.round(r.amount * 100); }
      else if (r.reason === 'insufficient balance') result.shortfall.push(r);
      else result.skipped.push(r);
    } catch (error) {
      result.errors.push({ batchID: batch.batchID, userID: batch.userID, userName: batch.userName, error: error?.message || String(error) });
    }
  }
  result.shortfallTotal = Math.round(result.shortfall.reduce((s, b) => s + (Number(b.transferAmount ?? b.amount) || 0), 0) * 100) / 100;

  if (notify && (result.paid.length || result.shortfall.length || result.errors.length)) {
    const parts = [];
    if (result.paid.length) parts.push(`Paid ${result.paid.length}: ${result.paid.map((p) => `${p.userName || p.userID} ${money(p.amount)}`).join(', ')}.`);
    if (result.shortfall.length) {
      const f = result.funding || {};
      const fundingNote = f.topup ? `a ${money(f.topup.amount)} top-up is on its way${f.topup.expectedAvailability ? ` (expected ${new Date(f.topup.expectedAvailability).toLocaleDateString('en-US')})` : ''}`
        : f.error ? `funding failed: ${f.error}`
          : f.skipped ? `funding: ${f.skipped}` : 'funding check did not run';
      parts.push(`Balance short: ${money(result.shortfallTotal)} across ${result.shortfall.length} batch${result.shortfall.length === 1 ? '' : 'es'} (${result.shortfall.map((s) => `${s.userName || s.userID ? `${s.userName || s.userID} ` : ''}${money(s.amount)}`).join(', ')}) left finalized — ${fundingNote}; retried daily.`);
    }
    const waiting = result.skipped.filter((b) => /no Stripe account|onboarding not finished/.test(b.reason));
    if (waiting.length) parts.push(`Waiting on Stripe setup: ${[...new Set(waiting.map((b) => b.userName || b.userID))].join(', ')} (${money(waiting.reduce((s, b) => s + (b.amount || 0), 0))}).`);
    if (result.errors.length) parts.push(`${result.errors.length} transfer${result.errors.length === 1 ? '' : 's'} failed: ${result.errors.map((e) => e.error).join('; ')}.`);
    await notifyAllAdmins({
      type: 'payroll-payouts',
      title: result.errors.length || result.shortfall.length ? 'Stripe payouts need a look' : 'Stripe payouts sent',
      message: parts.join(' '),
      actionUrl: `${adminBase()}/dashboard/repairs/payroll`,
      actionLabel: 'Open payroll',
      priority: result.errors.length ? 'high' : 'normal',
      channels: result.errors.length || result.shortfall.length ? ['inApp', 'email'] : ['inApp'],
      relatedType: 'payroll-payouts',
      relatedData: result,
    }).catch(() => {});
  }
  return result;
}

/**
 * Weekly nudge: every payee with a finalized, unpaid batch and no live Stripe account is told how
 * much is waiting and where to connect. Called from the Monday run, not the daily payout cron.
 */
export async function nudgeUnpaidPayees() {
  const finalized = await RepairPayrollBatchesModel.list({ status: PAYROLL_BATCH_STATUS.FINALIZED });
  const byUser = new Map();
  for (const b of finalized) {
    const cur = byUser.get(b.userID) || { userID: b.userID, userName: b.userName, amount: 0, weeks: 0 };
    cur.amount += batchAmount(b); cur.weeks += 1; byUser.set(b.userID, cur);
  }
  const nudged = [];
  for (const entry of byUser.values()) {
    const user = await loadUser(entry.userID);
    if (!user || isConnectLive(user)) continue;
    const { NotificationService } = await import('@/lib/notificationService');
    await NotificationService.createNotification({
      userId: user.userID,
      recipientEmail: user.email || '',
      type: 'payout-waiting',
      title: `${money(entry.amount)} is waiting for you`,
      message: `${entry.weeks} payroll batch${entry.weeks === 1 ? '' : 'es'} totaling ${money(entry.amount)} ${entry.weeks === 1 ? 'is' : 'are'} finalized and unpaid. Payouts go only through Stripe — connect your account and it is transferred automatically.`,
      channels: ['inApp', 'email'],
      priority: 'high',
      tags: ['payroll', 'stripe-connect'],
      data: { actionUrl: `${adminBase()}${payoutPagePath(user.role)}`, actionLabel: 'Connect with Stripe', relatedType: 'payroll', amount: entry.amount },
    }).catch(() => {});
    nudged.push({ userID: entry.userID, userName: entry.userName, amount: entry.amount });
  }
  return nudged;
}
