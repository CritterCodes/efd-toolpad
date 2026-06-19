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

const STATUS_RANK = {
  pending: 0, consultation: 1, design: 2, quote: 3, deposit: 4,
  in_production: 5, qc: 6, completed: 7, delivered: 8, cancelled: 99,
};

async function progressFor(order) {
  const invoices = await CustomInvoicesModel.listByCustom(order.customID);
  return { invoices, progress: computePaymentProgress(order.quote?.quoteTotal || 0, invoices) };
}

// Fire-and-forget: never block the caller on (slow, retrying) email.
function notifyInvoiceCreated(order, invoice) {
  NotificationService.createNotification({
    userId: order.clientID,
    type: NOTIFICATION_TYPES.INVOICE_CREATED,
    title: 'New Invoice Created',
    message: `Invoice ${invoice.invoiceNumber} for $${invoice.amount.toFixed(2)} has been created.`,
    channels: ['inApp', 'email'],
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

  const invoice = await CustomInvoicesModel.create({
    customID,
    customerEmail: data.customerEmail || order.customerEmail,
    ...data,
  });
  const { progress } = await progressFor(order);

  notifyInvoiceCreated(order, invoice); // fire-and-forget
  return { invoice, progress };
}

export async function getCustomPaymentProgress(customID) {
  const order = await CustomOrdersModel.findById(customID);
  if (!order) throw new Error('Custom order not found.');
  return progressFor(order);
}

export async function setCustomInvoiceStatus(customID, invoiceID, status) {
  const order = await CustomOrdersModel.findById(customID);
  if (!order) throw new Error('Custom order not found.');
  const invoice = await CustomInvoicesModel.updateStatus(invoiceID, status);
  if (!invoice) throw new Error('Invoice not found.');

  const { progress } = await progressFor(order);

  if (status === CUSTOM_INVOICE_STATUS.PAID) {
    // Critical path: advance the order forward-only (first paid → deposit; 50% → in_production).
    const target = progress.hasReached50 ? CUSTOM_ORDER_STATUS.IN_PRODUCTION : CUSTOM_ORDER_STATUS.DEPOSIT;
    if ((STATUS_RANK[order.status] ?? 0) < (STATUS_RANK[target] ?? 0)) {
      await CustomOrdersModel.updateById(customID, { status: target }, { changedBy: 'system', reason: `payment ${progress.paymentProgress}%` });
      // Note: bench work orders are generated at CASTING RECEIVED (not deposit) — you
      // can't do in-house bench work until the cast metal is in hand. See customProduction.recordCastingReceived.
    }
    notifyPayment(order, invoice, progress); // fire-and-forget
  }

  return { invoice, progress };
}
