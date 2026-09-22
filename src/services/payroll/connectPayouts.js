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
 *   link)  →  an admin turns on auto-pay for them  →  every finalized batch is transferred from
 *   EFD's Stripe balance, marked PAID with the transfer id, and the payee is told.
 *
 * Stored on the user:
 *   stripeConnect  = { accountId, detailsSubmitted, payoutsEnabled, requirementsDue, lastCheckedAt }
 *   payoutSettings = { autoPay: boolean, updatedAt, updatedBy }     (admin-only)
 *
 * Both are privileged fields — the generic user PUT strips them (app/api/users/model.js).
 * Transfers use `payroll-<batchID>` as the idempotency key, so a retry can never double-pay.
 * If EFD's available balance is short the batch simply stays FINALIZED and is retried on the next
 * run; admins are told once per run.
 */
import { db } from '@/lib/database';
import RepairPayrollBatchesModel from '@/app/api/repairPayrollBatches/model';
import { markPayrollBatchPaid } from '@/app/api/repairs/payroll/service';
import { PAYROLL_BATCH_STATUS } from '@/services/payrollUtils';
import {
  isStripeConfigured, stripeMode, createExpressAccount, createAccountLink, createLoginLink,
  retrieveAccount, retrieveBalance, createTransfer, summarizeAccount, availableUsdCents,
} from '@/lib/stripeConnect';
import { notifyAllAdmins } from '@/lib/notificationService';
import { adminBase } from '@/lib/appUrls';

export const CONNECT_PAYMENT_METHOD = 'stripe-connect';

const money = (n) => Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const USER_PROJECTION = { _id: 0, userID: 1, email: 1, firstName: 1, lastName: 1, role: 1, stripeConnect: 1, payoutSettings: 1, compensationProfile: 1 };

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

/** Is this payee set up to be paid by Connect (account live + auto-pay on)? */
export async function isAutoPayReady(userID) {
  if (!isStripeConfigured()) return false;
  const user = await loadUser(userID);
  return Boolean(user?.stripeConnect?.accountId && user.stripeConnect.payoutsEnabled && user.payoutSettings?.autoPay === true);
}

/** Pure: what a batch needs to be paid by Connect. */
export function payoutEligibility({ batch, user }) {
  if (!batch) return { eligible: false, reason: 'no batch' };
  if (batch.status !== PAYROLL_BATCH_STATUS.FINALIZED) return { eligible: false, reason: `batch is ${batch.status}` };
  const amount = batchAmount(batch);
  if (amount <= 0) return { eligible: false, reason: 'nothing to pay' };
  if (!user?.stripeConnect?.accountId) return { eligible: false, reason: 'no Stripe account connected' };
  if (!user.stripeConnect.payoutsEnabled) return { eligible: false, reason: 'Stripe onboarding not finished' };
  if (user.payoutSettings?.autoPay !== true) return { eligible: false, reason: 'auto-pay is off for this payee' };
  return { eligible: true, amount };
}

export function batchAmount(batch = {}) {
  return Math.round((Number(batch.laborPay || 0) + Number(batch.salePay || 0)) * 100) / 100;
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
  return { connected: true, ...summary, autoPay: user.payoutSettings?.autoPay === true };
}

export async function connectDashboardLink({ userID }) {
  const user = await loadUser(userID);
  const accountId = user?.stripeConnect?.accountId;
  if (!accountId) throw Object.assign(new Error('No Stripe account connected.'), { code: 'NOT_FOUND' });
  const link = await createLoginLink({ accountId });
  return link.url;
}

/** Admin switch: pay this person's finalized batches automatically. */
export async function setAutoPay({ userID, autoPay, actor = '' }) {
  const dbi = await db.connect();
  const now = new Date();
  await dbi.collection('users').updateOne({ userID }, { $set: { payoutSettings: { autoPay: autoPay === true, updatedAt: now, updatedBy: actor }, updatedAt: now } });
  return { userID, autoPay: autoPay === true };
}

/**
 * Pay one finalized batch through Connect. Refreshes the account first (payouts may have been
 * disabled since), checks EFD's available balance, transfers with an idempotency key, then marks
 * the batch PAID (the payee's "you have been paid" notification fires from there).
 */
export async function payBatchViaConnect({ batchID, actor = 'payroll-cron', force = false }) {
  const batch = await RepairPayrollBatchesModel.findByBatchID(batchID);
  const user = await loadUser(batch?.userID);
  if (user?.stripeConnect?.accountId) {
    try { Object.assign(user.stripeConnect, summarizeAccount(await retrieveAccount(user.stripeConnect.accountId))); } catch { /* use stored state */ }
  }
  // `force` (an admin pressing Pay via Stripe) waives the auto-pay switch only — the batch must still
  // be finalized with money in it, and the account must be live.
  const check = force && batch?.status === PAYROLL_BATCH_STATUS.FINALIZED && batchAmount(batch) > 0 && user?.stripeConnect?.payoutsEnabled
    ? { eligible: true, amount: batchAmount(batch) }
    : payoutEligibility({ batch, user });
  if (!check.eligible) return { paid: false, batchID, reason: check.reason };

  const amountCents = Math.round(check.amount * 100);
  const balance = await retrieveBalance();
  const available = availableUsdCents(balance);
  if (available < amountCents) {
    return { paid: false, batchID, reason: 'insufficient balance', amount: check.amount, available: available / 100 };
  }

  const transfer = await createTransfer({
    amountCents,
    destination: user.stripeConnect.accountId,
    description: `Payroll week of ${new Date(batch.weekStart).toLocaleDateString('en-US')} — ${batch.userName || user.userID}`,
    metadata: { batchID, userID: user.userID, weekStart: new Date(batch.weekStart).toISOString() },
    transferGroup: batchID,
    idempotencyKey: `payroll-${batchID}`,
  });

  await markPayrollBatchPaid(batchID, {
    paidAt: new Date(),
    paymentMethod: CONNECT_PAYMENT_METHOD,
    paymentReference: transfer.id,
    notes: `${batch.notes ? `${batch.notes} · ` : ''}Paid by Stripe Connect transfer ${transfer.id} (${actor}).`,
    notify: true,
  });
  return { paid: true, batchID, amount: check.amount, transferId: transfer.id, userID: user.userID, userName: batch.userName };
}

/**
 * Pay every finalized batch whose payee is connected and on auto-pay. Never throws; returns a
 * summary and tells admins about anything that needs a hand.
 */
export async function runConnectPayouts({ actor = 'payroll-cron', notify = true } = {}) {
  const result = { paid: [], skipped: [], shortfall: [], errors: [], stripe: isStripeConfigured() ? stripeMode() : 'unconfigured' };
  if (!isStripeConfigured()) return result;

  const finalized = await RepairPayrollBatchesModel.list({ status: PAYROLL_BATCH_STATUS.FINALIZED });
  for (const batch of finalized) {
    try {
      const r = await payBatchViaConnect({ batchID: batch.batchID, actor });
      if (r.paid) result.paid.push(r);
      else if (r.reason === 'insufficient balance') result.shortfall.push(r);
      else result.skipped.push(r);
    } catch (error) {
      result.errors.push({ batchID: batch.batchID, userID: batch.userID, userName: batch.userName, error: error?.message || String(error) });
    }
  }

  if (notify && (result.paid.length || result.shortfall.length || result.errors.length)) {
    const parts = [];
    if (result.paid.length) parts.push(`Paid ${result.paid.length}: ${result.paid.map((p) => `${p.userName || p.userID} ${money(p.amount)}`).join(', ')}.`);
    if (result.shortfall.length) parts.push(`Balance short for ${result.shortfall.map((s) => `${money(s.amount)}`).join(', ')} (available ${money(result.shortfall[0].available)}) — will retry.`);
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
