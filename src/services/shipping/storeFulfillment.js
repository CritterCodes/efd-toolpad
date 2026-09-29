/**
 * Per-store fulfillment defaults (owner, 2026-09-21; narrowed 2026-09-29).
 *
 * Stores are predictable: Marlen ships, Greers / Rocky's / The Smith / Pawn Stars get a hand delivery
 * on the store run, Cooper's and Diamonds Plus pick up. So the store carries a preference
 * (`users.fulfillmentPreference = { method: 'pickup' | 'delivery' | 'ship', parcelKey }`) and a
 * repair's auto-invoice at QC pass is CREATED with that deliveryMethod — which is also the append
 * key, so the store's repairs keep landing on one draft invoice.
 *
 * IT NO LONGER FINALIZES ANYTHING. This used to finalize a store's invoice the instant its first
 * repair passed QC, which made Finalize mean one thing for stores and another for walk-ins, and left
 * a bill growing after it had been issued. Owner, 2026-09-29: "when I click Finalize, that's whenever
 * it's finalized, and it goes to Open, and they get notified that they need to pay." The preference
 * survives as the DEFAULT the Finalize dialog opens on, not as an action taken on your behalf.
 */
import { db } from '@/lib/database';
import RepairInvoicesModel from '@/app/api/repair-invoices/model';
import { normalizeAccountKey } from '@/app/api/repair-invoices/service';
import { wholesalerBusinessName } from '@/services/wholesale/businessName';

export const FULFILLMENT_PREFERENCES = Object.freeze(['pickup', 'delivery', 'ship']);
export const DEFAULT_PARCEL_KEY = 'fedex-small-box';

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
