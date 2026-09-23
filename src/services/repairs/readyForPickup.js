/**
 * Retail "ready for pickup" notice with a pay-ahead link (owner, 2026-09-22).
 *
 * Until this existed a retail (walk-in) customer heard nothing actionable when their repair passed
 * QC: one route sent an email whose button pointed at the ADMIN dashboard, the bench self-certify
 * path sent nothing, and there was no way to pay before coming in. Wholesale stores already had an
 * online payment path (services/wholesale/invoicePayments.js); this reuses that Stripe Checkout sink.
 *
 * Flow: QC pass → repair auto-invoiced (services/repairs/autoInvoice.js) → this stamps an unguessable
 * `payToken` on the invoice, sends the customer an email + push + in-app notice whose button opens the
 * SHOP at /repair/pay/<token>, and records `repair.pickupNotice`.
 *
 * The shop owns the paying (owner, 2026-09-22: "they need to be paying through shop"). It shows what we
 * did and adds the bill to the CART, so a customer with two repairs ready pays once — which a
 * one-invoice payment page here could never do. Both apps read the same `repairInvoices` document from
 * the same database, so the token is all that has to travel. The invoice is marked paid ONLY by
 * Stripe's webhook, on the shop side (efd-shop lib/repairPayments.js).
 *
 * Retail only: wholesale repairs go to the store's billing account and hand-delivery/ship flow.
 * Internal and comped repairs owe nothing, so they get no payment link (and no notice from here).
 */
import crypto from 'node:crypto';
import RepairsModel from '@/app/api/repairs/model';
import RepairInvoicesModel from '@/app/api/repair-invoices/model';
import { db } from '@/lib/database';
import { userIdentityQuery } from '@/app/api/users/model';
import { NotificationService } from '@/lib/notificationService';
import { adminLink, shopLink } from '@/lib/appUrls';
import { resolveBillingMode, isCustomerCharged, BILLING_MODE } from '@/services/billing/modes';

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const money = (n) => round2(n).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

/** Pure: a retail repair the customer pays for (not a store job, not internal, not comped). */
export function isRetailCustomerRepair(repair = {}) {
  if (!repair || repair.isWholesale === true) return false;
  const mode = resolveBillingMode(repair);
  return mode === BILLING_MODE.RETAIL && isCustomerCharged(mode);
}

/** 24 URL-safe bytes: unguessable, fine in an email link. */
export function newPayToken() {
  return crypto.randomBytes(24).toString('base64url');
}

export function payLinkFor(token) {
  return shopLink(`/repair/pay/${encodeURIComponent(String(token || ''))}`);
}

/** Pure: the customer-facing message. */
export function buildReadyMessage({ clientName = '', amountDue = 0, repairCount = 1 } = {}) {
  const hello = clientName ? `Good news, ${String(clientName).trim().split(/\s+/)[0]}!` : 'Good news!';
  const what = repairCount > 1 ? `Your ${repairCount} repairs have` : 'Your repair has';
  const pay = round2(amountDue) > 0
    ? ` The balance is ${money(amountDue)}. Have a look at what we did and pay online whenever suits you — or pay when you collect it.`
    : ' There is no balance due.';
  return `${hello} ${what} passed final inspection and ${repairCount > 1 ? 'are' : 'is'} ready for pickup at Engel Fine Design.${pay}`;
}

/** Stamp a pay token on an invoice once; return it. */
export async function ensureInvoicePayToken(invoice) {
  if (!invoice) return null;
  if (invoice.payToken) return invoice.payToken;
  const payToken = newPayToken();
  await RepairInvoicesModel.updateByInvoiceID(invoice.invoiceID, { payToken, payTokenCreatedAt: new Date() });
  return payToken;
}

/** The customer behind a repair: `repair.userID` is the client's user record (Mongo _id or userID). */
export async function resolveCustomer(repair) {
  if (!repair?.userID) return null;
  const dbi = await db.connect();
  return dbi.collection('users').findOne(
    userIdentityQuery(repair.userID),
    { projection: { _id: 1, userID: 1, email: 1, firstName: 1, lastName: 1, phoneNumber: 1, role: 1 } },
  );
}

/**
 * Send (or re-send with `force`) the ready-for-pickup notice for one repair. Best-effort: never throws
 * into a QC pass; returns { sent, reason }. Idempotent per repair unless forced, so the two QC-pass
 * surfaces (complete-from-qc route, bench self-certify) cannot double-notify.
 */
export async function notifyReadyForPickup({ repairID, invoiceID = null, actor = '', force = false } = {}) {
  try {
    const repair = await RepairsModel.findById(repairID);
    if (!repair) return { sent: false, reason: 'repair not found' };
    if (!isRetailCustomerRepair(repair)) return { sent: false, reason: 'not a retail customer repair' };
    if (repair.pickupNotice?.sentAt && !force) return { sent: false, reason: 'already notified' };

    const invoice = (invoiceID || repair.invoiceID)
      ? await RepairInvoicesModel.findByInvoiceID(invoiceID || repair.invoiceID).catch(() => null)
      : null;
    const customer = await resolveCustomer(repair);
    const recipientEmail = String(customer?.email || '').trim();
    const notifyUserId = customer?.userID || (customer?._id ? String(customer._id) : '') || repair.userID || '';
    if (!recipientEmail && !notifyUserId) return { sent: false, reason: 'no customer contact on file' };

    const amountDue = invoice && invoice.paymentStatus !== 'paid' ? round2(invoice.remainingBalance) : 0;
    const token = invoice && amountDue > 0 ? await ensureInvoicePayToken(invoice) : null;
    const payUrl = token ? payLinkFor(token) : '';
    const repairCount = Array.isArray(invoice?.repairIDs) && invoice.repairIDs.length > 0 ? invoice.repairIDs.length : 1;
    const message = buildReadyMessage({ clientName: repair.clientName, amountDue, repairCount });
    const channels = ['inApp', 'email', 'push'];

    await NotificationService.createNotification({
      userId: notifyUserId,
      type: 'repair-ready-pickup',
      title: amountDue > 0 ? `Your repair is ready — ${money(amountDue)} due` : 'Your repair is ready for pickup',
      message,
      channels,
      recipientEmail: recipientEmail || undefined,
      priority: 'high',
      data: {
        actionUrl: payUrl || adminLink('/auth/signin'),
        actionLabel: payUrl ? 'See it & pay' : 'View details',
        repairID,
        invoiceID: invoice?.invoiceID || '',
        amountDue,
        clientName: repair.clientName || '',
        relatedType: 'repair',
      },
    });

    const now = new Date();
    await RepairsModel.updateById(repairID, {
      pickupNotice: {
        sentAt: now,
        invoiceID: invoice?.invoiceID || null,
        payUrl,
        amountDue,
        channels,
        sentBy: actor || 'qc-pass',
        count: Number(repair.pickupNotice?.count || 0) + 1,
      },
      updatedAt: now,
    });
    return { sent: true, payUrl, amountDue, channels, recipientEmail };
  } catch (error) {
    console.error(`[ready-for-pickup] notice failed for ${repairID}:`, error?.message || error);
    return { sent: false, reason: error?.message || String(error) };
  }
}
