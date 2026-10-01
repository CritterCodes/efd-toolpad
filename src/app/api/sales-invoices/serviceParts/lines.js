import { db } from '@/lib/database';
import { loadFeeSchedule } from '@/services/billing/feeSchedule';
import { ObjectId } from 'mongodb';
import { resolveFee } from '@/services/billing/feeResolver';
import { deriveRepairItemMetadata } from '@/lib/productRepairMetadata';
export const DEFAULT_CONSIGNMENT_RATE = 0.20;

export function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function roundMoney(value) {
  return Math.round(toNumber(value) * 100) / 100;
}

export function computePaymentStatus(total, amountPaid) {
  const remainingBalance = roundMoney(Math.max(toNumber(total) - toNumber(amountPaid), 0));
  if (remainingBalance <= 0) return { paymentStatus: 'paid', remainingBalance: 0 };
  if (toNumber(amountPaid) > 0) return { paymentStatus: 'partial', remainingBalance };
  return { paymentStatus: 'unpaid', remainingBalance };
}

export async function getSalesSettings() {
  const dbInstance = await db.connect();
  const settings = await dbInstance.collection('adminSettings').findOne({ _id: 'repair_task_admin_settings' });
  return {
    taxRate: toNumber(settings?.pricing?.taxRate, 0),
    consignmentRate: toNumber(settings?.pricing?.consignmentFeeRate, DEFAULT_CONSIGNMENT_RATE),
    feeSchedule: loadFeeSchedule(settings || {}),
  };
}

export function getLineSeller(line, product = null) {
  const seller = product?.seller || {};
  return {
    userID: line.sellerUserID || seller.userId || product?.userId || '',
    name: line.sellerName || seller.displayName || product?.vendor || '',
  };
}

export function getProductPrice(product, line) {
  return toNumber(line.unitPrice ?? product?.pricing?.retailPrice ?? product?.price, 0);
}

export function getProductImageUrl(product) {
  const image = product?.images?.[0]
    || product?.image
    || product?.featuredImage
    || product?.media?.[0]
    || product?.thumbnail
    || product?.imageUrl
    || product?.primaryImage
    || product?.photos?.[0];

  if (!image) return '';
  if (typeof image === 'string') return image;
  return image.url
    || image.thumbnail
    || image.secureUrl
    || image.src
    || image.previewUrl
    || image.imageUrl
    || image.originalUrl
    || '';
}

export async function resolveProduct(line) {
  if (!line.productID) return null;
  const dbInstance = await db.connect();
  const id = String(line.productID);
  const query = ObjectId.isValid(id)
    ? { $or: [{ productId: id }, { _id: new ObjectId(id) }], productType: 'jewelry' }
    : { productId: id, productType: 'jewelry' };
  return await dbInstance.collection('products').findOne(query);
}

// CASH DISCOUNT REMOVED (owner, 2026-09-04): sales invoices no longer round the total
// down to the nearest $5 for cash. The stored cashDiscount* fields remain on historical
// invoices for display and reporting; nothing writes a non-zero one anymore.
export function calculateInvoiceTotals(lineItems, taxRate, amountPaid = 0) {
  const subtotal = roundMoney(lineItems.reduce((sum, line) => sum + toNumber(line.lineTotal), 0));
  const taxableSubtotal = roundMoney(lineItems.filter((line) => line.taxable !== false).reduce((sum, line) => sum + toNumber(line.lineTotal), 0));
  const taxAmount = roundMoney(taxableSubtotal * toNumber(taxRate));
  const grossTotal = roundMoney(subtotal + taxAmount);
  return {
    subtotal,
    taxableSubtotal,
    taxAmount,
    grossTotal,
    cashDiscountApplied: false,
    cashDiscountAmount: 0,
    total: grossTotal,
    amountPaid: roundMoney(amountPaid),
    ...computePaymentStatus(grossTotal, amountPaid),
  };
}

export async function normalizeLineItems(rawLineItems = [], settings) {
  const normalized = [];

  for (const raw of rawLineItems) {
    const product = raw.type === 'product' ? await resolveProduct(raw) : null;
    if (raw.type === 'product' && !product) throw new Error('Selected product was not found.');

    const seller = getLineSeller(raw, product);
    if (!seller.userID) throw new Error('Every sales line must have an artisan/seller owner.');

    const quantity = Math.max(1, toNumber(raw.quantity, 1));
    const unitPrice = raw.type === 'product' ? getProductPrice(product, raw) : toNumber(raw.unitPrice, 0);
    if (unitPrice <= 0) throw new Error('Every sales line must have a positive price.');

    const lineTotal = roundMoney(unitPrice * quantity);
    // Fee via the services-continuum resolver (S6b). Defaults (EFD holds + ships)
    // resolve to the consignment bundle = the legacy flat rate, so existing sales
    // are unchanged until a line supplies channel/custody/fulfilledBy.
    const custodyAtSale = raw.custodyAtSale || product?.custody || 'consignment';
    const fulfilledBy = raw.fulfilledBy || 'efd';
    const channel = raw.channel || 'in_store';
    const fee = resolveFee({
      lineTotal,
      context: { custody: custodyAtSale, fulfilledBy, channel },
      schedule: settings.feeSchedule,
    });
    const consignmentAmount = fee.efdFee;
    const repairItem = raw.repairItem || product?.repairItem || deriveRepairItemMetadata(product || raw);

    normalized.push({
      lineID: raw.lineID || `line-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: raw.type === 'product' ? 'product' : 'custom',
      productID: product?.productId || raw.productID || '',
      productObjectID: product?._id ? String(product._id) : '',
      title: raw.title || product?.title || 'Custom jewelry item',
      description: raw.description || product?.description || '',
      imageUrl: raw.imageUrl || raw.productImageUrl || getProductImageUrl(product),
      repairItem,
      sellerUserID: seller.userID,
      sellerName: seller.name,
      quantity,
      unitPrice: roundMoney(unitPrice),
      lineTotal,
      taxable: raw.taxable !== false,
      consignmentRate: fee.efdFeeRate,
      consignmentAmount,
      feeMode: fee.mode,
      channel,
      custodyAtSale,
      fulfilledBy,
      estimatedLaborHoldback: 0,
      actualLaborDeduction: 0,
      sellerPayoutEstimate: fee.artisanPayout,
      includedTasks: [],
      repairDraft: null,
      linkedRepairIDs: [],
      payoutEntryID: '',
      payoutStatus: 'pending_payment',
    });
  }

  if (normalized.length === 0) throw new Error('At least one sales line is required.');
  return normalized;
}

