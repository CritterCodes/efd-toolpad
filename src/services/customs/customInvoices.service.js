/**
 * Custom-order billing (S7c) — deposit / payment-progress / 50% production threshold
 * / final, with notifications. Preserves legacy behavior on the new single-source
 * `customInvoices`. Paying past 50% advances the order to in_production (forward-only).
 *
 * Notifications are **fire-and-forget**: the email layer retries with delays, so we
 * never block the payment path (or hang for ~30s) when email is down — an improvement
 * over the legacy flow, which awaited it.
 */
import CustomOrdersModel, { CUSTOM_ORDER_STATUS } from '@/app/api/custom-orders/model';
import CustomInvoicesModel, { CUSTOM_INVOICE_STATUS, CUSTOM_INVOICE_TYPE, invoiceCovers } from '@/app/api/custom-orders/invoices/model';
import { computePaymentProgress, invoicesForOrder } from '@/services/customs/paymentProgress';
import { NotificationService, NOTIFICATION_TYPES } from '@/lib/notificationService';
import { calculateCustomInvoice, isBillableEmail } from '@/services/customs/customInvoicePolicy';
import { portalLink } from '@/lib/appUrls';

// Where a customer pays a balance by card. Admin never handles the card; the shop portal owns checkout.
// Deep-linked per order via portalLink() — a bare portal root dropped the customer on a list and made
// them find the request and tab themselves. The Stripe hosted-invoice helpers this file used to import
// are gone; see sendInvoiceToCustomer.

import { advanceCustomOrderStatus } from '@/services/customs/customStatus';

async function progressFor(order) {
  const invoices = await CustomInvoicesModel.listByCustom(order.customID);
  // Bill against the tax-inclusive total (what the customer owes); fall back to the
  // pre-tax quoteTotal for legacy orders quoted before sales tax was applied.
  const projectTotal = order.quote?.total ?? order.quote?.quoteTotal ?? 0;
  // THIS ORDER'S SHARE of each invoice. A combined invoice covering two orders must not credit its
  // whole amount to either one — that would trip the 50%-to-production trigger on money belonging to
  // the other piece and start bench work on the wrong ring.
  return {
    invoices,
    progress: computePaymentProgress(projectTotal, invoicesForOrder(invoices, order.customID)),
  };
}

// Fire-and-forget: never block the caller on (slow, retrying) email.
function notifyInvoiceCreated(order, invoice) {
  NotificationService.createNotification({
    userId: order.clientID,
    type: NOTIFICATION_TYPES.INVOICE_CREATED,
    title: 'New Invoice Created',
    message: `Invoice ${invoice.invoiceNumber} for $${invoice.amount.toFixed(2)} has been created.`,
    // This is only an internal draft. Stripe sends the customer email after the
    // explicit Send Invoice action creates the hosted invoice.
    channels: ['inApp'],
    templateName: 'invoice-created',
    recipientEmail: invoice.customerEmail,
    data: { customID: order.customID, invoiceNumber: invoice.invoiceNumber, amount: invoice.amount.toFixed(2), type: invoice.type },
  }).catch((e) => console.error('⚠️ invoice-created notification failed:', e.message));
}

function notifyPayment(order, invoice, progress) {
  NotificationService.createNotification({
    userId: order.clientID,
    type: NOTIFICATION_TYPES.PAYMENT_RECEIVED,
    title: 'Payment Received',
    message: `Payment of $${invoice.amount.toFixed(2)} received for ${order.customID}.`,
    channels: ['inApp', 'email'],
    templateName: 'payment-received',
    recipientEmail: invoice.customerEmail,
    data: {
      customID: order.customID, invoiceNumber: invoice.invoiceNumber,
      progressPercentage: progress.paymentProgress, remainingAmount: progress.remainingAmount,
      productionReady: progress.hasReached50,
    },
  }).catch((e) => console.error('⚠️ payment-received notification failed:', e.message));

  if (progress.hasReached50) {
    NotificationService.createNotification({
      type: NOTIFICATION_TYPES.PAYMENT_THRESHOLD_REACHED,
      title: 'Payment Threshold Reached',
      message: `Custom ${order.customID} reached 50% — production ready.`,
      channels: ['inApp', 'email'],
      templateName: 'payment-threshold-reached',
      recipientEmail: process.env.EMAIL_USER,
      data: { customID: order.customID, totalPaid: progress.totalPaid, projectTotal: progress.projectTotal, progressPercentage: progress.paymentProgress },
    }).catch((e) => console.error('⚠️ threshold notification failed:', e.message));
  }
}

export async function createCustomInvoice(customID, data) {
  const order = await CustomOrdersModel.findById(customID);
  if (!order) throw new Error('Custom order not found.');

  if (!order.quote?.quotePublished) {
    throw new Error('Publish the quote before creating an invoice.');
  }
  const customerEmail = String(data.customerEmail || order.customerEmail || '').trim();
  if (!isBillableEmail(customerEmail)) {
    throw new Error('Add a valid customer email before creating an invoice.');
  }
  const current = await progressFor(order);
  const resolved = calculateCustomInvoice({
    type: data.type,
    amount: data.amount,
    depositPct: data.depositPct,
    dueDays: data.dueDays,
    progress: current.progress,
  });

  const invoice = await CustomInvoicesModel.create({
    customID,
    ...data,
    amount: resolved.amount,
    dueDays: resolved.dueDays,
    customerEmail,
    // Snapshot the order's effective tax rate so the recorded amount (tax-inclusive)
    // can be decomposed into revenue + sales tax in reporting.
    taxRate: data.taxRate ?? order.quote?.taxRate ?? 0,
  });
  const { progress } = await progressFor(order);

  notifyInvoiceCreated(order, invoice); // fire-and-forget
  return { invoice, progress };
}

/**
 * ONE INVOICE ACROSS SEVERAL ORDERS — a client with two pieces in pays once.
 *
 * Each order contributes an explicit amount, recorded in `orderSnapshots`, and that is what gets
 * credited to it. Never pro-rata: each order advances to production at 50% paid and spawns its own
 * work orders, so an inferred split starts bench work on the wrong ring.
 *
 * The invoice is paid as a SINGLE payment (owner, 2026-08-11) — there is no per-order part-payment. If
 * a client wants to settle one piece only, issue that order its own invoice instead.
 *
 * @param {string[]} customIDs  orders to bill together (>= 2)
 * @param {object}   data       { amounts?: {customID: amount}, depositPct?, type?, dueDays? }
 */
export async function createCombinedInvoice(customIDs = [], data = {}) {
  const ids = [...new Set((customIDs || []).filter(Boolean))];
  if (ids.length < 2) throw new Error('A combined invoice needs at least two orders.');

  const orders = await Promise.all(ids.map((id) => CustomOrdersModel.findById(id)));
  const missing = ids.filter((id, i) => !orders[i]);
  if (missing.length) throw new Error(`Custom order not found: ${missing.join(', ')}.`);

  const unpublished = orders.filter((o) => !o.quote?.quotePublished);
  if (unpublished.length) {
    throw new Error(`Publish the quote first for: ${unpublished.map((o) => o.customID).join(', ')}.`);
  }

  // One invoice is emailed to one person and paid by one person. Billing across clients would charge
  // somebody for a stranger's ring.
  const clients = [...new Set(orders.map((o) => o.clientID || ''))];
  if (clients.length > 1) throw new Error('Those orders belong to different clients and cannot be billed together.');

  const customerEmail = String(data.customerEmail || orders[0].customerEmail || '').trim();
  if (!isBillableEmail(customerEmail)) throw new Error('Add a valid customer email before creating an invoice.');

  // Per-order amount: an explicit override if given, else that order's own share computed exactly the
  // way a single-order invoice would compute it — so a combined deposit is each order's deposit, not a
  // lump split after the fact.
  // Resolve the TYPE once and use the same one for every order's amount AND for the stored invoice.
  // Passing an unresolved type per order while defaulting the invoice to something else is how the
  // deposit percentage silently stops applying and every line computes as zero.
  const invoiceType = data.type
    || (data.depositPct != null ? CUSTOM_INVOICE_TYPE.DEPOSIT : CUSTOM_INVOICE_TYPE.PARTIAL);

  const snapshots = [];
  for (const order of orders) {
    const { progress } = await progressFor(order); // eslint-disable-line no-await-in-loop
    const override = data.amounts?.[order.customID];
    const resolved = calculateCustomInvoice({
      // An explicit per-order amount overrides the type-driven calculation for that line.
      type: override != null ? CUSTOM_INVOICE_TYPE.PARTIAL : invoiceType,
      amount: override != null ? override : undefined,
      depositPct: data.depositPct,
      dueDays: data.dueDays,
      progress,
    });
    if (resolved.amount > 0) {
      snapshots.push({
        customID: order.customID,
        description: order.title || order.quote?.mounting?.item || 'Custom piece',
        amount: resolved.amount,
        taxRate: order.quote?.taxRate ?? 0,
      });
    }
  }
  if (!snapshots.length) throw new Error('Nothing is owed on those orders.');

  const total = Math.round(snapshots.reduce((s, x) => s + x.amount, 0) * 100) / 100;
  const primary = orders[0];

  const invoice = await CustomInvoicesModel.create({
    // Primary order: every existing query, notification and document path keys off `customID`.
    customID: primary.customID,
    customIDs: ids,
    orderSnapshots: snapshots,
    type: invoiceType,
    amount: total,
    dueDays: data.dueDays,
    customerEmail,
    taxRate: primary.quote?.taxRate ?? 0,
    createdBy: data.createdBy || null,
  });

  notifyInvoiceCreated(primary, invoice); // fire-and-forget
  const { progress } = await progressFor(primary);
  return { invoice, progress };
}

/**
 * SEND THE INVOICE TO THE CUSTOMER as an EFD document. No Stripe hosted invoice.
 *
 * Stripe hosted invoices are retired for custom orders (owner, 2026-08-11). They made Stripe the
 * owner of the customer relationship: the invoice email was a Stripe side effect, which is why
 * `invoice-created` was `channels: ['inApp']` and EFD never sent an invoice of its own. The customer
 * got Stripe's template, EFD had no printable copy, and a cash payment produced no document at all.
 *
 * Now EFD sends its own printable invoice, and a card payer follows a link to the shop portal to check
 * out there. The invoice.paid webhook stays wired so the two already-paid Stripe invoices on
 * CO-mrcaads7-e5e581 still reconcile; nothing creates a NEW hosted invoice.
 */
export async function sendInvoiceToCustomer(customID, invoiceID) {
  const order = await CustomOrdersModel.findById(customID);
  if (!order) throw new Error('Custom order not found.');
  const invoice = await CustomInvoicesModel.findById(invoiceID);
  if (!invoiceCovers(invoice, customID)) throw new Error('Invoice not found.');
  if (invoice.status === CUSTOM_INVOICE_STATUS.PAID) {
    const e = new Error('Invoice is already paid — send a receipt instead.'); e.code = 'BAD_REQUEST'; throw e;
  }

  const customerEmail = String(invoice.customerEmail || order.customerEmail || '').trim();
  if (!isBillableEmail(customerEmail)) {
    const error = new Error('Add a valid customer email before sending the invoice.');
    error.code = 'BAD_REQUEST';
    throw error;
  }

  const { sendCustomInvoiceEmail } = await import('@/services/customs/customInvoiceDelivery');
  const { doc, delivery } = await sendCustomInvoiceEmail(customID, invoiceID);

  // In-app/push notice alongside the emailed document, pointing at the portal where they can pay.
  NotificationService.createNotification({
    userId: order.clientID,
    type: NOTIFICATION_TYPES.INVOICE_CREATED,
    title: 'Invoice ready',
    message: `Your ${invoice.type} invoice for $${(Number(invoice.amount) || 0).toFixed(2)} is ready.`,
    channels: ['inApp'],
    templateName: 'invoice-created',
    recipientEmail: customerEmail,
    data: { customID, invoiceNumber: invoice.invoiceNumber, amount: (Number(invoice.amount) || 0).toFixed(2), type: invoice.type, actionUrl: portalLink(customID, 'invoices') },
  }).catch((e) => console.error('⚠️ invoice notification failed:', e.message));

  // The caller surfaces this: a failed send must be VISIBLE, not swallowed behind a success toast.
  return { invoice: await CustomInvoicesModel.findById(invoiceID), delivery, balanceDue: doc.balanceDue };
}

/**
 * Attach a compact `payment` summary to each order — ONE invoice query for the whole
 * list, allocated per order (combined invoices credit each order its own share).
 * Per-order failures (e.g. a corrupt combined invoice with no snapshots) null that
 * order's summary rather than 500ing the list: a missing progress bar is recoverable,
 * a dead customs page is not.
 */
export async function withPaymentSummaries(orders = []) {
  if (!orders.length) return orders;
  const invoices = await CustomInvoicesModel.listByCustomMany(orders.map((o) => o.customID));
  return orders.map((order) => {
    try {
      const projectTotal = order.quote?.total ?? order.quote?.quoteTotal ?? 0;
      const p = computePaymentProgress(projectTotal, invoicesForOrder(invoices, order.customID));
      return {
        ...order,
        payment: {
          totalPaid: p.totalPaid,
          remainingAmount: p.remainingAmount,
          paymentProgress: p.paymentProgress,
          hasReached50: p.hasReached50,
          isFullyPaid: p.isFullyPaid,
        },
      };
    } catch (e) {
      console.error(`⚠️ payment summary for ${order.customID} failed:`, e.message);
      return { ...order, payment: null };
    }
  });
}

export async function getCustomPaymentProgress(customID) {
  const order = await CustomOrdersModel.findById(customID);
  if (!order) throw new Error('Custom order not found.');
  return progressFor(order);
}

export async function setCustomInvoiceStatus(customID, invoiceID, status, paymentMethod = null) {
  const order = await CustomOrdersModel.findById(customID);
  if (!order) throw new Error('Custom order not found.');
  const existingInvoice = await CustomInvoicesModel.findById(invoiceID);
  if (!invoiceCovers(existingInvoice, customID)) throw new Error('Invoice not found.');
  if (existingInvoice.status === status) {
    const { progress } = await progressFor(order);
    return { invoice: existingInvoice, progress };
  }
  const invoice = await CustomInvoicesModel.updateStatus(invoiceID, status, paymentMethod);
  if (!invoice) throw new Error('Invoice not found.');

  const { progress } = await progressFor(order);
  let receiptDelivery = null;

  if (status === CUSTOM_INVOICE_STATUS.PAID) {
    // ADVANCE EVERY ORDER THE INVOICE COVERS, each on its own share.
    //
    // A combined invoice pays down two projects at once. Advancing only `customID` would leave the
    // other order sitting at `quote` with its money already collected — no deposit status, no
    // progression to production — while the customer believes both rings are underway. Each order is
    // evaluated against ITS OWN progress, so one may reach production while the other does not.
    const covered = Array.isArray(invoice.customIDs) && invoice.customIDs.length
      ? invoice.customIDs
      : [customID];
    for (const id of covered) {
      const o = id === customID ? order : await CustomOrdersModel.findById(id); // eslint-disable-line no-await-in-loop
      if (!o) continue;
      const { progress: p } = await progressFor(o); // eslint-disable-line no-await-in-loop
      // Forward-only (first paid → deposit; 50% → in_production) via the shared advance
      // path, which also sends the in_production milestone notification on crossing 50%.
      // Note: bench work orders are generated at CASTING RECEIVED (not deposit) — you
      // can't do in-house bench work until the cast metal is in hand. See customProduction.addCastingCost.
      const target = p.hasReached50 ? CUSTOM_ORDER_STATUS.IN_PRODUCTION : CUSTOM_ORDER_STATUS.DEPOSIT;
      // eslint-disable-next-line no-await-in-loop
      await advanceCustomOrderStatus(o.customID, target, { reason: `payment ${p.paymentProgress}%`, order: o });
      // PAID IN FULL is the affiliate commission trigger. Lazy import (the engine reads
      // progress from this module); best-effort — a commission failure must never undo
      // a payment that already happened. The cron sweep is the backstop.
      if (p.isFullyPaid && o.affiliate?.affiliateId && !o.affiliate?.commissionId) {
        try {
          // eslint-disable-next-line no-await-in-loop
          const { earnCustomOrderCommission } = await import('@/services/affiliates/commissionEngine');
          // eslint-disable-next-line no-await-in-loop
          await earnCustomOrderCommission(o.customID);
        } catch (e) {
          console.error(`⚠️ affiliate commission for ${o.customID} failed (cron will retry):`, e.message);
        }
      }
    }
    notifyPayment(order, invoice, progress); // fire-and-forget

    // EMAIL THE RECEIPT, whatever the payment method. Cash and Zelle used to produce no customer
    // document at all: only Stripe-paid invoices got anything, because only Stripe sent email. The
    // receipt states the remaining balance, since a custom job is paid in instalments.
    //
    // Awaited, unlike the notification, so the mark-paid response can tell staff whether it actually
    // reached the customer — they are standing at the counter and can print it instead. It cannot throw.
    const { sendCustomReceiptEmail } = await import('@/services/customs/customInvoiceDelivery');
    receiptDelivery = await sendCustomReceiptEmail(customID, invoiceID)
      .then((r) => r.delivery)
      .catch((e) => ({ sent: false, error: e?.message || String(e) }));
  }

  return { invoice, progress, receiptDelivery };
}
