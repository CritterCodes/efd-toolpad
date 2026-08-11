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
import CustomInvoicesModel, { CUSTOM_INVOICE_STATUS } from '@/app/api/custom-orders/invoices/model';
import { computePaymentProgress } from '@/services/customs/paymentProgress';
import { NotificationService, NOTIFICATION_TYPES } from '@/lib/notificationService';
import { calculateCustomInvoice, isBillableEmail } from '@/services/customs/customInvoicePolicy';
import { shopBase } from '@/lib/appUrls';

// Where a customer pays a balance by card. Admin never handles the card; the shop portal owns checkout.
// The Stripe hosted-invoice helpers this file used to import are gone — see sendInvoiceToCustomer.
const PORTAL_URL = `${shopBase()}/custom-work/portal`;

const STATUS_RANK = {
  pending: 0, consultation: 1, design: 2, quote: 3, deposit: 4,
  in_production: 5, qc: 6, completed: 7, delivered: 8, cancelled: 99,
};

async function progressFor(order) {
  const invoices = await CustomInvoicesModel.listByCustom(order.customID);
  // Bill against the tax-inclusive total (what the customer owes); fall back to the
  // pre-tax quoteTotal for legacy orders quoted before sales tax was applied.
  const projectTotal = order.quote?.total ?? order.quote?.quoteTotal ?? 0;
  return { invoices, progress: computePaymentProgress(projectTotal, invoices) };
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
  if (!invoice || invoice.customID !== customID) throw new Error('Invoice not found.');
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
    data: { customID, invoiceNumber: invoice.invoiceNumber, amount: (Number(invoice.amount) || 0).toFixed(2), type: invoice.type, actionUrl: PORTAL_URL },
  }).catch((e) => console.error('⚠️ invoice notification failed:', e.message));

  // The caller surfaces this: a failed send must be VISIBLE, not swallowed behind a success toast.
  return { invoice: await CustomInvoicesModel.findById(invoiceID), delivery, balanceDue: doc.balanceDue };
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
  if (!existingInvoice || existingInvoice.customID !== customID) throw new Error('Invoice not found.');
  if (existingInvoice.status === status) {
    const { progress } = await progressFor(order);
    return { invoice: existingInvoice, progress };
  }
  const invoice = await CustomInvoicesModel.updateStatus(invoiceID, status, paymentMethod);
  if (!invoice) throw new Error('Invoice not found.');

  const { progress } = await progressFor(order);
  let receiptDelivery = null;

  if (status === CUSTOM_INVOICE_STATUS.PAID) {
    // Critical path: advance the order forward-only (first paid → deposit; 50% → in_production).
    const target = progress.hasReached50 ? CUSTOM_ORDER_STATUS.IN_PRODUCTION : CUSTOM_ORDER_STATUS.DEPOSIT;
    if ((STATUS_RANK[order.status] ?? 0) < (STATUS_RANK[target] ?? 0)) {
      await CustomOrdersModel.updateById(customID, { status: target }, { changedBy: 'system', reason: `payment ${progress.paymentProgress}%` });
      // Note: bench work orders are generated at CASTING RECEIVED (not deposit) — you
      // can't do in-house bench work until the cast metal is in hand. See customProduction.recordCastingReceived.
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
