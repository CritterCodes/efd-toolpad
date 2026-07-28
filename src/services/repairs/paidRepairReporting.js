/**
 * Report paid retail repairs to Meta as Purchase conversions.
 *
 * This closes the loop opened in efd-shop: the repair form stores the ad click
 * identifiers (_fbc/_fbp) and UTMs on the repair document, and this reports the
 * revenue back so the ad campaign can optimise for people who actually pay
 * rather than for people who merely submit a form.
 *
 * Business rules live here; the HTTP transport is metaConversions.service.js.
 */

import { createHash } from 'node:crypto';
import RepairsModel from '@/app/api/repairs/model';
import RepairInvoicesModel from '@/app/api/repair-invoices/model';
import { BILLING_MODE, isCustomerCharged, resolveBillingMode } from '@/services/billing/modes';
import { isMetaCapiConfigured, sendConversionEvents } from '@/services/metaConversions.service';

// Only leads that originated from the shop's repair form carry ad attribution.
const REPORTABLE_LEAD_SOURCES = ['retail-chat'];

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ''));

/** Meta expects normalized values, hashed. Lowercase/trim email. */
const hashEmail = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized ? sha256(normalized) : null;
};

/** Digits only, with a country code. US/CA numbers are stored as 10 digits. */
const hashPhone = (value) => {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 10) digits = `1${digits}`;
  return digits.length >= 8 ? sha256(digits) : null;
};

/**
 * Build Meta user_data for one repair.
 *
 * Retail-chat leads created before efd-shop added canonical fields have neither
 * clientEmail nor clientPhone, so fall back to leadContact — which may hold
 * either an email or a phone — and finally to the `Contact: ` notes prefix.
 */
export function buildUserData(repair = {}) {
  const attribution = repair.attribution || {};

  let email = repair.clientEmail || '';
  let phone = repair.clientPhone || '';

  if (!email && !phone) {
    const fallback = repair.leadContact || String(repair.notes || '').replace(/^Contact:\s*/, '');
    if (isEmail(fallback)) email = fallback;
    else phone = fallback;
  }

  const userData = {};
  const em = hashEmail(email);
  const ph = hashPhone(phone);
  if (em) userData.em = [em];
  if (ph) userData.ph = [ph];

  // The strongest match signal available — present only when the customer
  // arrived from an ad click and efd-shop captured it.
  if (attribution.fbc) userData.fbc = attribution.fbc;
  if (attribution.fbp) userData.fbp = attribution.fbp;

  return userData;
}

/**
 * Whether this repair should produce a Purchase event.
 *
 * Excludes wholesale, comped and internal work (the jeweler is still paid, but
 * the customer was not charged), and anything that did not come from the shop
 * form — those have no ad attribution and would pollute the campaign signal.
 */
export function isReportableRepair(repair = {}) {
  if (!repair) return false;
  if (!REPORTABLE_LEAD_SOURCES.includes(repair.leadSource)) return false;

  const mode = resolveBillingMode(repair);

  // Wholesale must be excluded explicitly. isCustomerCharged() is NOT enough —
  // trade customers *are* charged, so it returns true for wholesale and only
  // filters internal/comped. resolveBillingMode() already folds the legacy
  // isWholesale flag into this mode.
  if (mode === BILLING_MODE.WHOLESALE) return false;

  return isCustomerCharged(mode);
}

/**
 * Report an invoice's repairs as Purchase conversions. Safe to call on every
 * payment; it decides for itself whether anything should be sent.
 *
 * Never throws — callers invoke it fire-and-forget so a Meta outage can never
 * fail a payment.
 *
 * @returns {Promise<{sent: number, reason?: string}>}
 */
export async function reportPaidInvoiceToMeta(invoice) {
  try {
    if (!invoice || invoice.paymentStatus !== 'paid') return { sent: 0, reason: 'not paid' };
    if (!isMetaCapiConfigured()) return { sent: 0, reason: 'not configured' };

    // Idempotency: reopenPaidInvoice can un-pay an invoice and let it be paid
    // again, so without this a single repair could be reported repeatedly.
    if (invoice.metaPurchaseSentAt) return { sent: 0, reason: 'already reported' };

    const total = parseFloat(invoice.total || 0);
    if (!(total > 0)) return { sent: 0, reason: 'zero total' };

    const repairIDs = invoice.repairIDs || [];
    if (repairIDs.length === 0) return { sent: 0, reason: 'no repairs' };

    const repairs = [];
    for (const repairID of repairIDs) {
      try {
        repairs.push(await RepairsModel.findById(repairID));
      } catch {
        // A missing repair must not stop the rest of the invoice reporting.
      }
    }

    const reportable = repairs.filter(isReportableRepair);
    if (reportable.length === 0) return { sent: 0, reason: 'no reportable repairs' };

    // Attribute the invoice's revenue once, to the repair that actually carries
    // the ad click, so a mixed invoice cannot multiply the reported value.
    const withClick = reportable.find((r) => r.attribution?.fbc) || reportable[0];
    const userData = buildUserData(withClick);
    if (Object.keys(userData).length === 0) return { sent: 0, reason: 'no usable identifiers' };

    const eventId = `repair-invoice-${invoice.invoiceID}`;
    const paidAt = invoice.paidAt ? new Date(invoice.paidAt) : new Date();

    const event = {
      event_name: 'Purchase',
      // Seconds, not milliseconds — Meta rejects millisecond timestamps.
      event_time: Math.floor(paidAt.getTime() / 1000),
      // Deduplicates against a retry and against the browser pixel.
      event_id: eventId,
      // Payment is taken at the bench, not on the website.
      action_source: 'physical_store',
      user_data: userData,
      custom_data: {
        currency: 'USD',
        value: Number(total.toFixed(2)),
        order_id: invoice.invoiceID,
        content_category: 'jewelry-repair',
        num_items: reportable.length,
      },
    };

    const result = await sendConversionEvents([event]);

    // Persist the marker only after Meta accepted it, so a failure can be retried.
    await RepairInvoicesModel.updateByInvoiceID(invoice.invoiceID, {
      metaPurchaseSentAt: new Date(),
      metaPurchaseEventID: eventId,
    });

    console.log('[meta-capi] Purchase reported:', invoice.invoiceID, 'value:', total, 'received:', result?.events_received);
    return { sent: 1 };
  } catch (error) {
    console.error('[meta-capi] Purchase report failed (non-fatal):', error.message);
    return { sent: 0, reason: error.message };
  }
}
