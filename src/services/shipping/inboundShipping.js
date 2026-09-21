/**
 * INBOUND shipping — a wholesale store sends repairs TO the shop on EFD's EasyPost account, at
 * EFD's FedEx rate, and PAYS FOR IT UP FRONT (owner, 2026-09-21).
 *
 *   quote    store's address → EFD's receiving address, FedEx rates at platform pricing. Not stored.
 *   order    the chosen rate becomes a small "inbound-shipping" invoice on the store's account
 *            (no repairs on it, total = the rate). The store pays it by card in the portal, through
 *            the same embedded Stripe Checkout the Billing page uses. Card only: ACH takes days and
 *            the box needs to leave today.
 *   fulfill  the Stripe webhook marks the invoice paid → we buy the label on EFD's wallet, flip the
 *            repairs to SHIPPED TO SHOP with the `inboundShipment` receiving reconciles against, put
 *            the label on the invoice, and tell the store (label link) + the shop (tracking).
 *            Idempotent: a webhook replay never buys a second label.
 *
 * At cost: the invoice total IS the carrier rate. EFD fronts nothing.
 */
import { db } from '@/lib/database';
import RepairInvoicesModel from '@/app/api/repair-invoices/model';
import { NotificationService, CHANNELS } from '@/lib/notificationService';
import { REPAIR_STATUS } from '@/services/repairWorkflow';
import { normalizeAccountKey } from '@/app/api/repair-invoices/service';
import { adminLink } from '@/lib/appUrls';
import { quoteShipment, buyShipment, isEasyPostConfigured, easyPostMode, SATURDAY_EMPTY_HINT, relevantCarrierMessages } from './easypost';
import { loadShipFrom, shipToFromWholesaler, addressProblems } from './addresses';
import { findParcelPreset, parcelForEasyPost, resolveParcelPresets } from './parcels';
import { wholesalerBusinessName } from '@/services/wholesale/businessName';

export const INBOUND_SHIPPING_KIND = 'inbound-shipping';

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const serviceLabel = (v) => String(v || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

function err(message, code) {
  const e = new Error(message);
  if (code) e.code = code;
  return e;
}

const STORE_PROJECTION = { _id: 0, userID: 1, firstName: 1, lastName: 1, email: 1, phoneNumber: 1, business: 1, address: 1, wholesaleApplication: 1 };

/** The invoice document for a paid-up-front label. PURE (given the resolved inputs). */
export function buildInboundOrderInvoice({ store, repairIDs, quote, rate, now = new Date(), createdBy = '' }) {
  const storeName = wholesalerBusinessName(store);
  const description = `FedEx label to EFD — ${rate.carrier} ${serviceLabel(rate.service)}${quote.saturdayDelivery ? ' (Saturday delivery)' : ''}, ${quote.parcelLabel || 'package'}, ${repairIDs.length} repair${repairIDs.length === 1 ? '' : 's'}`;
  return {
    accountType: 'wholesale',
    accountID: `wholesale-business:${normalizeAccountKey(storeName)}`,
    storeId: store.userID,
    clientID: store.userID,
    customerName: storeName,
    kind: INBOUND_SHIPPING_KIND,
    description,
    repairIDs: [],
    repairSnapshots: [],
    status: 'open',
    deliveryMethod: 'pickup',
    deliveryFee: 0,
    shippingFee: round2(rate.rate),
    subtotal: 0,
    taxAmount: 0,
    total: round2(rate.rate),
    amountPaid: 0,
    remainingBalance: round2(rate.rate),
    paymentStatus: 'unpaid',
    inboundLabelRequest: {
      wholesalerUserID: store.userID,
      repairIDs: [...repairIDs],
      shipmentId: quote.shipmentId,
      rateId: rate.rateId,
      carrier: rate.carrier,
      service: rate.service,
      quotedRate: round2(rate.rate),
      parcelKey: quote.parcelKey || null,
      parcelLabel: quote.parcelLabel || null,
      saturdayDelivery: quote.saturdayDelivery === true,
      mode: quote.mode || null,
      requestedAt: now,
    },
    inboundLabel: null,
    closeoutNotes: '',
    createdBy,
  };
}

export async function inboundReadiness({ wholesalerUserID }) {
  const dbi = await db.connect();
  const [store, { settings, shipFrom: efd }] = await Promise.all([
    dbi.collection('users').findOne({ userID: wholesalerUserID, role: 'wholesaler' }, { projection: STORE_PROJECTION }),
    loadShipFrom(),
  ]);
  if (!store) throw err('Wholesale account not found.', 'NOT_FOUND');
  const storeAddress = shipToFromWholesaler(store);
  const problems = [
    ...(isEasyPostConfigured() ? [] : ['Shipping labels are not enabled yet — ask EFD.']),
    ...addressProblems(storeAddress, 'Your store address (Account Settings)'),
    ...addressProblems(efd, "EFD's receiving address"),
  ];
  return {
    configured: isEasyPostConfigured(), mode: easyPostMode(),
    storeName: wholesalerBusinessName(store), storeAddress, efdAddress: efd,
    parcels: resolveParcelPresets(settings), problems, canShip: problems.length === 0,
  };
}

export async function quoteInboundShipping({ wholesalerUserID, parcelKey = '', saturdayDelivery = false }) {
  const readiness = await inboundReadiness({ wholesalerUserID });
  if (!readiness.canShip) throw err(readiness.problems.join(' '), 'BAD_REQUEST');
  const preset = findParcelPreset({ business: { shipping: { parcels: readiness.parcels } } }, parcelKey);
  const quote = await quoteShipment({
    shipFrom: readiness.storeAddress,
    shipTo: readiness.efdAddress,
    parcel: parcelForEasyPost(preset),
    carriers: ['FedEx'],
    reference: `inbound:${wholesalerUserID}`,
    options: saturdayDelivery ? { saturday_delivery: true } : null,
  });
  if (!quote.rates.length) {
    const detail = relevantCarrierMessages(quote.messages).join(' ');
    throw err(saturdayDelivery ? `${SATURDAY_EMPTY_HINT}${detail ? ` (${detail})` : ''}` : `FedEx returned no rates for this address and package.${detail ? ` ${detail}` : ''}`, 'BAD_REQUEST');
  }
  return { ...quote, parcelKey: preset.key, parcelLabel: preset.label, storeName: readiness.storeName, storeAddress: readiness.storeAddress };
}

/**
 * Turn a chosen rate into a payable invoice. The repairs must be the store's own PENDING PICKUP
 * repairs (admins may act for any store). Nothing is bought yet — that happens when it's paid.
 */
export async function createInboundLabelOrder({ session, wholesalerUserID, repairIDs = [], quote, rateId }) {
  if (!Array.isArray(repairIDs) || !repairIDs.length) throw err('Select the repairs going in the box.', 'BAD_REQUEST');
  if (!quote?.shipmentId || !Array.isArray(quote.rates)) throw err('Get rates first.', 'BAD_REQUEST');
  const rate = quote.rates.find((r) => r.rateId === rateId);
  if (!rate) throw err('Choose one of the quoted services.', 'BAD_REQUEST');

  const dbi = await db.connect();
  const isStaff = ['admin', 'dev'].includes(session?.user?.role);
  const filter = { repairID: { $in: repairIDs }, isWholesale: true, status: REPAIR_STATUS.PENDING_PICKUP };
  if (!isStaff) filter.$or = [{ userID: session.user.userID }, { createdBy: session.user.userID }];
  const owned = await dbi.collection('repairs').find(filter, { projection: { _id: 0, repairID: 1 } }).toArray();
  if (owned.length !== repairIDs.length) throw err('Some selected repairs are not yours or are no longer pending pickup. Refresh and try again.', 'BAD_REQUEST');

  const store = await dbi.collection('users').findOne({ userID: wholesalerUserID, role: 'wholesaler' }, { projection: STORE_PROJECTION });
  if (!store) throw err('Wholesale account not found.', 'NOT_FOUND');

  // One unpaid label order per box: a second click must not create a second bill.
  const existing = await dbi.collection('repairInvoices').findOne(
    { kind: INBOUND_SHIPPING_KIND, status: 'open', paymentStatus: { $ne: 'paid' }, 'inboundLabelRequest.repairIDs': { $all: repairIDs, $size: repairIDs.length } },
    { projection: { _id: 0, invoiceID: 1 } },
  );
  if (existing) return { invoiceID: existing.invoiceID, reused: true };

  const invoice = await RepairInvoicesModel.create(buildInboundOrderInvoice({ store, repairIDs, quote, rate, createdBy: session.user.userID }));
  return { invoiceID: invoice.invoiceID, total: invoice.total, reused: false };
}

/**
 * Called from the Stripe webhook once the inbound-shipping invoice is PAID. Buys the label,
 * ships the repairs, notifies. Safe to call twice.
 */
export async function fulfillPaidInboundLabel(invoiceID) {
  const invoice = await RepairInvoicesModel.findByInvoiceID(invoiceID);
  if (!invoice || invoice.kind !== INBOUND_SHIPPING_KIND) return { fulfilled: false, reason: 'not an inbound-shipping invoice' };
  if (invoice.paymentStatus !== 'paid') return { fulfilled: false, reason: 'not paid' };
  if (invoice.inboundLabel?.trackingNumber) return { fulfilled: false, reason: 'already fulfilled' };
  const req = invoice.inboundLabelRequest;
  if (!req?.shipmentId || !req?.rateId) return { fulfilled: false, reason: 'no label request on invoice' };

  const purchase = await buyShipment({ shipmentId: req.shipmentId, rateId: req.rateId });
  const now = new Date();
  const label = {
    carrier: purchase.carrier || req.carrier || 'FedEx',
    service: purchase.service || req.service || '',
    trackingNumber: purchase.trackingCode,
    labelUrl: purchase.labelUrl || '',
    publicTrackingUrl: purchase.publicTrackingUrl || '',
    cost: round2(purchase.cost),
    quotedRate: round2(req.quotedRate),
    saturdayDelivery: req.saturdayDelivery === true,
    mode: purchase.mode || null,
    purchasedAt: now,
  };
  const inboundShipment = {
    carrier: label.carrier,
    service: label.service,
    trackingNumber: label.trackingNumber,
    shippedAt: now,
    shippedBy: req.wholesalerUserID,
    provider: 'easypost',
    shipmentId: req.shipmentId,
    labelUrl: label.labelUrl,
    publicTrackingUrl: label.publicTrackingUrl,
    cost: label.cost,
    paidUpFront: true,
    billedOnInvoiceID: invoice.invoiceID,
  };

  const dbi = await db.connect();
  await dbi.collection('repairs').updateMany(
    { repairID: { $in: req.repairIDs }, status: REPAIR_STATUS.PENDING_PICKUP },
    { $set: { status: REPAIR_STATUS.SHIPPED_TO_SHOP, deliveryMethod: 'ship', inboundShipment, updatedAt: now } },
  );
  await RepairInvoicesModel.updateByInvoiceID(invoice.invoiceID, { inboundLabel: label, repairIDsShipped: req.repairIDs });

  const store = await dbi.collection('users').findOne({ userID: req.wholesalerUserID }, { projection: STORE_PROJECTION });
  const storeName = wholesalerBusinessName(store || {}, invoice.customerName);
  const labelPage = adminLink('/dashboard/wholesaler/repairs/schedule-pickup');

  // Store: the label is ready to print.
  if (store?.userID) {
    NotificationService.createNotification({
      userId: store.userID,
      recipientEmail: store.email || '',
      type: 'wholesale-inbound-label',
      title: 'Your FedEx label is ready',
      message: `Payment received. Print your ${label.carrier} ${serviceLabel(label.service)} label for ${req.repairIDs.length} repair${req.repairIDs.length === 1 ? '' : 's'} and hand the box to FedEx. Tracking: ${label.trackingNumber}`,
      channels: [CHANNELS.IN_APP, CHANNELS.EMAIL],
      priority: 'high',
      tags: ['wholesale', 'shipping'],
      data: {
        invoiceID: invoice.invoiceID, trackingNumber: label.trackingNumber, labelUrl: label.labelUrl,
        ...(store.firstName || storeName ? { recipientName: store.firstName || storeName } : {}),
        actionUrl: label.labelUrl || labelPage, actionLabel: 'Print label',
      },
    }).catch((e) => console.error('inbound label store notification failed:', e?.message));
  }
  // Shop: a box is coming.
  try {
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAILS;
    if (adminEmail) {
      await NotificationService.createNotification({
        userId: 'admin',
        type: 'wholesale-inbound-shipment',
        title: 'Wholesale Shipment Inbound',
        message: `${storeName} bought a ${label.carrier} ${serviceLabel(label.service)} label ($${label.cost.toFixed(2)}, paid) for ${req.repairIDs.length} repair(s). Tracking: ${label.trackingNumber}`,
        channels: [CHANNELS.IN_APP, CHANNELS.EMAIL],
        recipientEmail: adminEmail,
        priority: 'high',
        tags: ['wholesale', 'shipping'],
        data: { userRole: 'admin', relatedType: 'wholesale-repairs', wholesalerName: storeName, repairCount: req.repairIDs.length, carrier: label.carrier, trackingNumber: label.trackingNumber, actionUrl: '/dashboard/repairs/pending-wholesale', actionLabel: 'View Pending Repairs' },
      });
    }
  } catch (e) {
    console.error('inbound label admin notification failed (non-fatal):', e?.message);
  }

  return { fulfilled: true, invoiceID: invoice.invoiceID, label };
}

/** What the portal polls after paying: paid? label ready? */
export async function inboundOrderStatus({ invoiceID, session }) {
  const invoice = await RepairInvoicesModel.findByInvoiceID(invoiceID);
  if (!invoice || invoice.kind !== INBOUND_SHIPPING_KIND) throw err('Order not found.', 'NOT_FOUND');
  const isStaff = ['admin', 'dev'].includes(session?.user?.role);
  if (!isStaff && invoice.inboundLabelRequest?.wholesalerUserID !== session?.user?.userID) throw err('Order not found.', 'NOT_FOUND');
  return {
    invoiceID: invoice.invoiceID,
    paymentStatus: invoice.paymentStatus,
    total: invoice.total,
    label: invoice.inboundLabel || null,
    repairIDs: invoice.inboundLabelRequest?.repairIDs || [],
    description: invoice.description || '',
  };
}
