import { isCustomerCharged } from '@/services/billing/modes';
import { resolveBillingMode } from '@/services/billing/modes';

export function computePaymentStatus(total, amountPaid) {
  const remainingBalance = Math.max(parseFloat(total || 0) - parseFloat(amountPaid || 0), 0);
  if (remainingBalance <= 0) {
    return { paymentStatus: 'paid', remainingBalance: 0 };
  }
  if (parseFloat(amountPaid || 0) > 0) {
    return { paymentStatus: 'partial', remainingBalance };
  }
  return { paymentStatus: 'unpaid', remainingBalance };
}
export const DEFAULT_DELIVERY_FEE = 5;

export function normalizeAccountKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function isUsableStoreId(storeId, repair) {
  const value = String(storeId || '').trim();
  if (!value) return false;

  const lower = value.toLowerCase();
  const submittedBy = String(repair.submittedBy || '').trim().toLowerCase();
  const createdBy = String(repair.createdBy || '').trim().toLowerCase();

  return lower !== submittedBy && lower !== createdBy;
}

export function getRepairAccountContext(repair) {
  if (repair.isWholesale) {
    const businessName = repair.businessName || repair.storeName || '';
    const businessKey = normalizeAccountKey(businessName);
    const validStoreId = isUsableStoreId(repair.storeId, repair) ? String(repair.storeId).trim() : '';
    const accountID = businessKey
      ? `wholesale-business:${businessKey}`
      : validStoreId
        ? `wholesale-store:${validStoreId}`
        : `wholesale-client:${repair.userID || repair.clientName || repair.repairID}`;

    return {
      accountType: 'wholesale',
      accountID,
      storeId: validStoreId,
      clientID: repair.userID || '',
      customerName: businessName || repair.clientName || '',
    };
  }

  return {
    accountType: 'retail',
    accountID: repair.userID || repair.clientName || repair.clientFirstName || repair.repairID,
    storeId: '',
    clientID: repair.userID || '',
    customerName: repair.clientName || [repair.clientFirstName, repair.clientLastName].filter(Boolean).join(' ') || '',
  };
}

export function getRepairChargeSummary(repair) {
  // internal/comped → nothing billed to the customer
  if (!isCustomerCharged(resolveBillingMode(repair))) {
    return {
      subtotal: 0,
      taxAmount: 0,
      totalWithoutDelivery: 0,
      existingDeliveryFee: 0,
    };
  }

  const lineItemSubtotal = [
    ...(repair.tasks || []),
    ...(repair.materials || []),
    ...(repair.customLineItems || []),
  ].reduce((sum, item) => sum + (parseFloat(item.price || 0) * (parseFloat(item.quantity || 1) || 1)), 0);
  const storedSubtotal = parseFloat(repair.subtotal || 0);
  const rushFee = parseFloat(repair.rushFee || 0);
  const taxAmount = parseFloat(repair.taxAmount || 0);
  const repairDeliveryFee = parseFloat(repair.deliveryFee || 0);
  const subtotal = storedSubtotal > 0
    ? storedSubtotal + rushFee
    : lineItemSubtotal + rushFee;
  const calculatedTotal = subtotal + taxAmount + repairDeliveryFee;
  const total = parseFloat(repair.totalCost || 0) > 0
    ? parseFloat(repair.totalCost || 0)
    : calculatedTotal;

  return {
    subtotal,
    taxAmount,
    totalWithoutDelivery: Math.max(total - repairDeliveryFee, 0),
    existingDeliveryFee: repairDeliveryFee,
  };
}

export function buildRepairSnapshot(repair) {
  const summary = getRepairChargeSummary(repair);
  return {
    repairID: repair.repairID,
    customerName: repair.clientName || repair.businessName || '',
    status: repair.status,
    subtotal: Math.max(summary.totalWithoutDelivery - summary.taxAmount, 0),
    taxAmount: summary.taxAmount,
    total: summary.totalWithoutDelivery,
  };
}

// `shippingFee` is the carrier rate chosen at finalize (services/shipping/invoiceFulfillment.js),
// passed through at cost. It sits beside the legacy hand-delivery `deliveryFee`, never inside it.
/**
 * The invoice's gross total (before any stored cash discount / payments): subtotal + tax + the legacy
 * hand-delivery fee + the carrier shipping fee. EVERY payment path must use this rather than re-adding
 * the pieces itself — the cash route once rebuilt the total without shippingFee and overwrote a correct
 * $2,184.48 with $2,103.48 while recording a $2,184.48 payment (rinv-bdac0837, 2026-09-21).
 */
export function invoiceGrossTotal(invoice = {}) {
  return Math.round((parseFloat(invoice.subtotal || 0) + parseFloat(invoice.taxAmount || 0)
    + parseFloat(invoice.deliveryFee || 0) + parseFloat(invoice.shippingFee || 0)) * 100) / 100;
}

export function calculateInvoiceTotals(repairSnapshots = [], deliveryFee = 0, cashDiscountAmount = 0, amountPaid = 0, shippingFee = 0) {
  const subtotal = repairSnapshots.reduce((sum, item) => sum + parseFloat(item.subtotal || 0), 0);
  const taxAmount = repairSnapshots.reduce((sum, item) => sum + parseFloat(item.taxAmount || 0), 0);
  const grossTotal = subtotal + taxAmount + parseFloat(deliveryFee || 0) + parseFloat(shippingFee || 0);
  const normalizedDiscount = Math.max(0, Math.min(parseFloat(cashDiscountAmount || 0), grossTotal));
  const total = Math.max(grossTotal - normalizedDiscount, 0);
  const normalizedAmountPaid = parseFloat(amountPaid || 0);

  return {
    subtotal,
    taxAmount,
    cashDiscountAmount: normalizedDiscount,
    total,
    amountPaid: normalizedAmountPaid,
    ...computePaymentStatus(total, normalizedAmountPaid),
  };
}

// CASH DISCOUNT REMOVED (owner, 2026-09-04): invoices no longer round down to the
// nearest $5 for cash. calculateInvoiceTotals keeps its discount parameter so the
// stored cashDiscountAmount on HISTORICAL invoices still normalizes correctly, but
// every recalculation path now passes 0 — editing an old discounted invoice
// deliberately drops its discount.

