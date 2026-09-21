/**
 * Invoice shipping — the database layer behind the finalize decision and the label purchase.
 *
 *   quoteInvoiceShipping   draft invoice + parcel preset → live FedEx rates (EasyPost shipment created,
 *                          nothing bought). The quote is stored on the invoice so finalize can pick from
 *                          exactly what was shown.
 *   finalizeInvoiceFulfillment  Pickup, or Ship with one of the quoted rates → deliveryMethod /
 *                          shippingFee / fulfillment set, totals recomputed, status → open (or paid).
 *   buyInvoiceLabel        Shipping & Delivery → buys the label for the stored quote, stamps
 *                          outboundShipment on the invoice + repairs (same shape the manual ship-back
 *                          writes), notifies the store with the tracking number.
 *
 * At cost throughout: the fee on the invoice IS the carrier's rate. If the label ends up a few cents
 * off the quote the difference is recorded (labelCostDrift), not rebilled.
 */
import { db } from '@/lib/database';
import RepairInvoicesModel from '@/app/api/repair-invoices/model';
import { calculateInvoiceTotals } from '@/app/api/repair-invoices/service';
import { NotificationService, CHANNELS } from '@/lib/notificationService';
import { resolveWholesaleInvoiceRecipients } from '@/services/wholesale/invoiceNotifications';
import { REPAIR_STATUS } from '@/services/repairWorkflow';
import { adminLink } from '@/lib/appUrls';
import { quoteShipment, buyShipment, isEasyPostConfigured, easyPostMode } from './easypost';
import { findParcelPreset, parcelForEasyPost, resolveParcelPresets } from './parcels';
import { loadShipFrom, resolveInvoiceShipTo, addressProblems } from './addresses';
import { buildFulfillmentUpdate, buildLabelUpdate, labelCostDrift } from './invoiceFulfillment';

function err(message, code) {
  const e = new Error(message);
  if (code) e.code = code;
  return e;
}

/** Everything the finalize dialog needs to offer Ship: configured?, parcels, address readiness. */
export async function shippingReadinessForInvoice(invoice) {
  const { settings, shipFrom } = await loadShipFrom();
  const to = invoice?.accountType === 'wholesale'
    ? await resolveInvoiceShipTo(invoice)
    : { shipTo: null, problems: ['Only wholesale invoices ship back — retail is pickup.'] };
  const problems = [
    ...(isEasyPostConfigured() ? [] : ['EasyPost is not configured (EASYPOST_API_KEY).']),
    ...addressProblems(shipFrom, 'Shop ship-from address (Store Settings → Shipping)'),
    ...(to.problems || []),
  ];
  return {
    configured: isEasyPostConfigured(),
    mode: easyPostMode(),
    parcels: resolveParcelPresets(settings),
    shipFrom,
    shipTo: to.shipTo,
    problems,
    canShip: problems.length === 0,
  };
}

export async function quoteInvoiceShipping({ invoiceID, parcelKey = '', saturdayDelivery = false, actor = {} }) {
  const invoice = await RepairInvoicesModel.findByInvoiceID(invoiceID);
  if (!invoice) throw err('Invoice not found.', 'NOT_FOUND');
  if (invoice.status !== 'draft') throw err('Only a draft invoice can be quoted — shipping is decided at finalize.', 'BAD_REQUEST');

  const readiness = await shippingReadinessForInvoice(invoice);
  if (!readiness.canShip) throw err(`Cannot get rates yet: ${readiness.problems.join(' ')}`, 'BAD_REQUEST');

  const preset = findParcelPreset({ business: { shipping: { parcels: readiness.parcels } } }, parcelKey);
  const quote = await quoteShipment({
    shipFrom: readiness.shipFrom,
    shipTo: readiness.shipTo,
    parcel: parcelForEasyPost(preset),
    carriers: ['FedEx'],
    reference: invoice.invoiceID,
    options: saturdayDelivery ? { saturday_delivery: true } : null,
  });
  if (!quote.rates.length) throw err('The carrier returned no rates for this address and parcel.', 'BAD_GATEWAY');

  const stored = { ...quote, parcelKey: preset.key, parcelLabel: preset.label, shipTo: readiness.shipTo, shipFrom: readiness.shipFrom, quotedBy: actor.userID || '' };
  await RepairInvoicesModel.updateByInvoiceID(invoice.invoiceID, { shippingQuote: stored });
  return stored;
}

export async function finalizeInvoiceFulfillment({ invoiceID, method = 'pickup', rateId = '', actor = {} }) {
  const invoice = await RepairInvoicesModel.findByInvoiceID(invoiceID);
  if (!invoice) throw err('Invoice not found.', 'NOT_FOUND');

  const set = buildFulfillmentUpdate({ method, quote: invoice.shippingQuote || null, rateId, actor });
  const totals = calculateInvoiceTotals(invoice.repairSnapshots || [], set.deliveryFee, 0, invoice.amountPaid, set.shippingFee);
  const updated = await RepairInvoicesModel.updateByInvoiceID(invoice.invoiceID, {
    ...set,
    ...totals,
    cashDiscountApplied: false,
    status: invoice.paymentStatus === 'paid' ? 'paid' : 'open',
  });
  return updated;
}

/**
 * Buy the label for an invoice finalized as Ship. Stamps the same `outboundShipment` the manual
 * ship-back writes, moves pre-payment repairs to DELIVERY BATCHED (never regresses a paid one),
 * and tells the store — with the tracking number — exactly like the manual path.
 */
export async function buyInvoiceLabel({ invoiceID, actor = {} }) {
  const invoice = await RepairInvoicesModel.findByInvoiceID(invoiceID);
  if (!invoice) throw err('Invoice not found.', 'NOT_FOUND');
  if (invoice.outboundShipment) throw err('This invoice is already in a box.', 'BAD_REQUEST');
  const shipping = invoice.fulfillment?.shipping;
  if (invoice.deliveryMethod !== 'ship' || !shipping?.shipmentId || !shipping?.rate?.rateId) {
    throw err('This invoice was not finalized as Ship with a quoted rate.', 'BAD_REQUEST');
  }
  if (!['open', 'paid'].includes(invoice.status)) throw err(`Invoice status is ${invoice.status}; finalize it first.`, 'BAD_REQUEST');

  const purchase = await buyShipment({ shipmentId: shipping.shipmentId, rateId: shipping.rate.rateId });
  const now = new Date();
  const { label, outboundShipment } = buildLabelUpdate({ purchase, actor, now });

  const dbi = await db.connect();
  const repairIDs = invoice.repairIDs || [];
  await dbi.collection('repairs').updateMany(
    { repairID: { $in: repairIDs }, status: { $in: [REPAIR_STATUS.COMPLETED, REPAIR_STATUS.READY_FOR_PICKUP] } },
    { $set: { status: REPAIR_STATUS.DELIVERY_BATCHED, updatedAt: now } },
  );
  await dbi.collection('repairs').updateMany(
    { repairID: { $in: repairIDs } },
    { $set: { deliveryMethod: 'ship', outboundShipment, updatedAt: now } },
  );
  const updated = await RepairInvoicesModel.updateByInvoiceID(invoice.invoiceID, {
    outboundShipment,
    'fulfillment.shipping.label': label,
  });

  // Best-effort store notification with tracking (same recipients + shape as ship-back).
  try {
    const recipients = await resolveWholesaleInvoiceRecipients(invoice);
    for (const user of recipients) {
      NotificationService.createNotification({
        userId: user.userID,
        recipientEmail: user.email || '',
        type: 'wholesale-shipped-back',
        title: 'Your repairs are on the way back',
        message: `Invoice ${invoice.invoiceID} shipped via ${label.carrier || 'carrier'}${label.service ? ` ${label.service.replace(/_/g, ' ').toLowerCase()}` : ''}. Tracking: ${label.trackingCode}`,
        channels: [CHANNELS.IN_APP, CHANNELS.EMAIL],
        priority: 'normal',
        tags: ['wholesale', 'shipping'],
        data: {
          invoiceIDs: [invoice.invoiceID],
          trackingNumber: label.trackingCode,
          carrier: label.carrier,
          ...(user.firstName || user.business ? { recipientName: user.firstName || user.business } : {}),
          actionUrl: adminLink('/dashboard/wholesaler/shipments'),
          actionLabel: 'View Shipments',
        },
      }).catch((e) => console.error('label-purchase notification failed:', e?.message));
    }
  } catch (e) {
    console.error('label-purchase recipient resolution failed:', e?.message);
  }

  return { invoice: updated, label, drift: labelCostDrift(updated.fulfillment) };
}
