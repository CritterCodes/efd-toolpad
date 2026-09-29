/**
 * Retail "ready for pickup" notice with a pay-ahead link (owner, 2026-09-22).
 *
 * Until this existed a retail (walk-in) customer heard nothing actionable when their repair passed
 * QC: one route sent an email whose button pointed at the ADMIN dashboard, the bench self-certify
 * path sent nothing, and there was no way to pay before coming in. Wholesale stores already had an
 * online payment path (services/wholesale/invoicePayments.js); this reuses that Stripe Checkout sink.
 *
 * Flow: QC pass → repair auto-invoiced (services/repairs/autoInvoice.js) → the invoice is FINALIZED →
 * this stamps an unguessable `payToken` on the invoice, sends the customer an email + push + in-app
 * notice whose button opens the SHOP at /repair/pay/<token>, and records `repair.pickupNotice`.
 *
 * IT FIRES AT FINALIZE, NOT AT QC PASS (owner, 2026-09-29: "I only want to notify when their invoice
 * is finalized"). A retail invoice is a DRAFT when QC passes — `applyStoreFulfillmentDefault` only
 * auto-finalizes wholesale accounts — so the old QC-pass notice quoted a balance that could still
 * change, and told the customer to come and collect work that had not been billed yet.
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
import { shopLink } from '@/lib/appUrls';
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
 * into the caller; returns { sent, reason }. Idempotent per repair unless forced.
 *
 * Callers that are finalizing an INVOICE should use notifyInvoiceReadyForPickup below — an invoice can
 * carry several of one customer's repairs, and this would send them one notice each.
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
        // A retail customer belongs in the SHOP, always — with a balance that is the pay page, and
        // with nothing owed it is their account, where their repairs are listed. This used to fall
        // back to the ADMIN sign-in, which is the very thing this notice was written to stop doing.
        actionUrl: payUrl || shopLink('/account'),
        actionLabel: payUrl ? 'See it & pay' : 'View your repairs',
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

/**
 * Tell the customer their work is ready, ONCE for a whole finalized invoice.
 *
 * This is the trigger (owner, 2026-09-29): a finalized invoice is the first moment the balance is
 * settled, so it is the first moment worth telling anyone about. An invoice groups one billing
 * account's repairs, so a customer who left three rings gets ONE message saying three are ready with
 * one balance — not three messages quoting the same total, which is what per-repair notices at QC
 * pass produced. The other repairs are stamped as covered by that notice so nothing re-notifies later.
 *
 * Best-effort and never throws: finalizing an invoice must not fail because an email did.
 */
export async function notifyInvoiceReadyForPickup({ invoiceID, actor = '', force = false } = {}) {
  try {
    const invoice = await RepairInvoicesModel.findByInvoiceID(invoiceID).catch(() => null);
    if (!invoice) return { sent: false, reason: 'invoice not found' };

    const repairs = (await Promise.all(
      (invoice.repairIDs || []).map((id) => RepairsModel.findById(id).catch(() => null)),
    )).filter(Boolean);
    const retail = repairs.filter(isRetailCustomerRepair);
    if (!retail.length) return { sent: false, reason: 'no retail customer repairs on this invoice' };

    const pending = force ? retail : retail.filter((r) => !r.pickupNotice?.sentAt);
    if (!pending.length) return { sent: false, reason: 'already notified' };

    const [first, ...rest] = pending;
    const result = await notifyReadyForPickup({ repairID: first.repairID, invoiceID, actor, force });
    if (!result.sent) return result;

    const now = new Date();
    await Promise.all(rest.map((r) => RepairsModel.updateById(r.repairID, {
      pickupNotice: {
        sentAt: now,
        invoiceID,
        payUrl: result.payUrl,
        amountDue: result.amountDue,
        channels: result.channels,
        sentBy: actor || 'invoice-finalized',
        // Which repair's notice covered this one — so "already notified" is auditable rather than
        // looking like a message nobody can find.
        coveredBy: first.repairID,
        count: Number(r.pickupNotice?.count || 0) + 1,
      },
      updatedAt: now,
    }).catch((error) => {
      console.error(`[ready-for-pickup] could not stamp ${r.repairID}:`, error?.message || error);
    })));

    return { ...result, repairIDs: pending.map((r) => r.repairID), repairCount: retail.length };
  } catch (error) {
    console.error(`[ready-for-pickup] invoice notice failed for ${invoiceID}:`, error?.message || error);
    return { sent: false, reason: error?.message || String(error) };
  }
}
