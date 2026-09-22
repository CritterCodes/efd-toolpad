/**
 * Per-store fulfillment defaults (owner, 2026-09-21).
 *
 * Every wholesale invoice used to wait for a human to pick Pickup or Ship at Finalize. Stores are
 * predictable: Marlen ships, Greers / Rocky's / The Smith / Pawn Stars get a hand delivery on the
 * store run, Cooper's and Diamonds Plus pick up. So the store carries a preference
 * (`users.fulfillmentPreference = { method: 'pickup' | 'delivery' | 'ship', parcelKey }`) and:
 *
 *   1. a repair's auto-invoice at QC pass is CREATED with that deliveryMethod (the append key), so
 *      the day's repairs for one store keep landing on one invoice;
 *   2. the invoice is finalized right away — pickup and hand delivery need no decision; ship gets a
 *      quote for the store's parcel (small FedEx box by default) and takes the cheapest FedEx rate,
 *      with the shipping line on the invoice like a manual Finalize;
 *   3. a hand delivery is stamped as a scheduled delivery run, so it shows up on Shipping & Delivery
 *      with "Mark delivered" exactly like the old store-run flow.
 *
 * Anything that can't be decided automatically (no preference, no ship-to address, EasyPost down)
 * leaves the invoice as a draft on Payment & Pickup — the manual Finalize is unchanged.
 */
import { db } from '@/lib/database';
import RepairInvoicesModel from '@/app/api/repair-invoices/model';
import { normalizeAccountKey } from '@/app/api/repair-invoices/service';
import { wholesalerBusinessName } from '@/services/wholesale/businessName';
import { quoteInvoiceShipping, finalizeInvoiceFulfillment } from '@/services/shipping/invoiceShipping';
import { notifyAllAdmins } from '@/lib/notificationService';
import { adminBase } from '@/lib/appUrls';

export const FULFILLMENT_PREFERENCES = Object.freeze(['pickup', 'delivery', 'ship']);
export const DEFAULT_PARCEL_KEY = 'fedex-small-box';
export const AUTO_FULFILLMENT_ACTOR = Object.freeze({ userID: 'auto-fulfillment', name: 'Store default' });

export function normalizeFulfillmentPreference(input) {
  if (!input || typeof input !== 'object') return null;
  const method = FULFILLMENT_PREFERENCES.includes(input.method) ? input.method : null;
  if (!method) return null;
  return {
    method,
    parcelKey: method === 'ship' ? String(input.parcelKey || DEFAULT_PARCEL_KEY) : null,
  };
}

export function fulfillmentPreferenceLabel(method) {
  return { pickup: 'Store picks up', delivery: 'Hand delivery (store run)', ship: 'Ship (FedEx)' }[method] || 'Not set';
}

const USER_PROJECTION = { _id: 0, userID: 1, business: 1, 'wholesaleApplication.businessName': 1, fulfillmentPreference: 1 };

/**
 * The store user behind a repair or invoice: by storeId / clientID first, then by the business key
 * (the same identity rules the invoice notifications use). Returns the user or null.
 */
export async function resolveStoreUser({ storeId = '', clientID = '', accountID = '', businessName = '' } = {}) {
  const dbi = await db.connect();
  const ids = [storeId, clientID].map((v) => String(v || '').trim()).filter(Boolean);
  if (ids.length) {
    const byId = await dbi.collection('users').find({ userID: { $in: ids }, role: 'wholesaler' }, { projection: USER_PROJECTION }).toArray();
    if (byId.length) return byId[0];
  }
  const key = String(accountID || '').startsWith('wholesale-business:')
    ? String(accountID).slice('wholesale-business:'.length)
    : normalizeAccountKey(businessName || '');
  if (!key) return null;
  const stores = await dbi.collection('users').find({ role: 'wholesaler' }, { projection: USER_PROJECTION }).toArray();
  return stores.find((u) => normalizeAccountKey(wholesalerBusinessName(u, '')) === key) || null;
}

/** The store's preference for a repair about to be invoiced, or null when none is set. */
export async function fulfillmentPreferenceForRepair(repair) {
  if (!repair?.isWholesale) return null;
  const user = await resolveStoreUser({
    storeId: repair.storeId, clientID: repair.userID || repair.createdBy, businessName: repair.businessName || repair.storeName,
  });
  return normalizeFulfillmentPreference(user?.fulfillmentPreference);
}

/** The store's preference for an existing invoice, or null. */
export async function fulfillmentPreferenceForInvoice(invoice) {
  if (invoice?.accountType !== 'wholesale') return null;
  const user = await resolveStoreUser({ storeId: invoice.storeId, clientID: invoice.clientID, accountID: invoice.accountID });
  return normalizeFulfillmentPreference(user?.fulfillmentPreference);
}

/**
 * Finalize a freshly created wholesale draft the way the store always wants it. Best-effort:
 * returns { applied, method, reason } and never throws.
 */
export async function applyStoreFulfillmentDefault({ invoiceID, preference = null } = {}) {
  try {
    const invoice = await RepairInvoicesModel.findByInvoiceID(invoiceID);
    if (!invoice) return { applied: false, reason: 'invoice not found' };
    if (invoice.accountType !== 'wholesale') return { applied: false, reason: 'retail invoices are finalized at pickup' };
    if (invoice.status !== 'draft') return { applied: false, reason: `already ${invoice.status}` };

    const pref = preference || await fulfillmentPreferenceForInvoice(invoice);
    if (!pref) return { applied: false, reason: 'store has no fulfillment preference' };

    if (pref.method === 'pickup' || pref.method === 'delivery') {
      await finalizeInvoiceFulfillment({ invoiceID, method: pref.method, actor: AUTO_FULFILLMENT_ACTOR });
      return { applied: true, method: pref.method };
    }

    // ship: quote the store's parcel and take the cheapest FedEx rate (rates come back sorted by price)
    const quote = await quoteInvoiceShipping({ invoiceID, parcelKey: pref.parcelKey || DEFAULT_PARCEL_KEY, saturdayDelivery: false, actor: AUTO_FULFILLMENT_ACTOR });
    const rate = quote?.rates?.[0];
    if (!rate?.rateId) {
      await warnAdmins(invoice, 'no FedEx rates came back for the store’s default box');
      return { applied: false, method: 'ship', reason: 'no rates' };
    }
    await finalizeInvoiceFulfillment({ invoiceID, method: 'ship', rateId: rate.rateId, actor: AUTO_FULFILLMENT_ACTOR });
    return { applied: true, method: 'ship', rate: { carrier: rate.carrier, service: rate.service, rate: rate.rate } };
  } catch (error) {
    const reason = error?.message || String(error);
    try {
      const invoice = await RepairInvoicesModel.findByInvoiceID(invoiceID);
      if (invoice) await warnAdmins(invoice, reason);
    } catch { /* best-effort */ }
    return { applied: false, reason };
  }
}

async function warnAdmins(invoice, reason) {
  await notifyAllAdmins({
    type: 'invoice-auto-fulfillment-failed',
    title: `Invoice ${invoice.invoiceID} needs a fulfillment decision`,
    message: `${invoice.customerName || invoice.accountID}: the store default could not be applied (${reason}). It is waiting as a draft on Payment & Pickup.`,
    actionUrl: `${adminBase()}/dashboard/repairs/pick-up`,
    actionLabel: 'Open Payment & Pickup',
    priority: 'normal',
    channels: ['inApp'],
    relatedType: 'repair-invoice',
    relatedId: invoice.invoiceID,
  }).catch(() => {});
}
