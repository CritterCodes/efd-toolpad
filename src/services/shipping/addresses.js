/**
 * Ship-from / ship-to resolution for wholesale return shipments.
 *
 *  - ship-from: `adminSettings.business.shipFrom` (Store Settings → Shipping). Nothing else in
 *    the settings document carries the shop's street address, so rates are impossible until the
 *    owner fills it in once.
 *  - ship-to: the wholesaler's `wholesaleApplication` (businessAddress/City/State/Zip/Country +
 *    contact name/phone) — the same record the admin wholesaler page edits. No new field to
 *    maintain; every approved store already has this, Marlen included.
 *
 * Both return EasyPost Address shapes. `addressProblems` says exactly which pieces are missing so
 * the finalize step can point at the fix instead of failing with a carrier error.
 */
import { db } from '@/lib/database';
import { resolveWholesaleInvoiceRecipients } from '@/services/wholesale/invoiceNotifications';

const s = (v) => String(v ?? '').trim();

const COUNTRY_CODES = { 'united states': 'US', usa: 'US', us: 'US', canada: 'CA', 'united kingdom': 'GB', uk: 'GB' };
export function countryCode(value = 'US') {
  const v = s(value);
  if (!v) return 'US';
  if (v.length === 2) return v.toUpperCase();
  return COUNTRY_CODES[v.toLowerCase()] || v;
}

export function addressProblems(address = {}, label = 'address') {
  const missing = ['street1', 'city', 'state', 'zip'].filter((k) => !s(address?.[k]));
  if (!s(address?.name) && !s(address?.company)) missing.push('name or company');
  return missing.map((k) => `${label}: ${k} is missing`);
}

export function shipFromFromSettings(settings = {}) {
  const f = settings?.business?.shipFrom || {};
  return {
    name: s(f.name),
    company: s(f.company) || s(settings?.business?.name) || 'Engel Fine Design',
    street1: s(f.street1),
    street2: s(f.street2),
    city: s(f.city),
    state: s(f.state),
    zip: s(f.zip),
    country: countryCode(f.country || 'US'),
    phone: s(f.phone),
    email: s(f.email),
  };
}

/** A wholesaler user document → their store's EasyPost address. Pure. */
export function shipToFromWholesaler(user = {}) {
  const app = user?.wholesaleApplication || {};
  const contact = [s(app.contactFirstName), s(app.contactLastName)].filter(Boolean).join(' ')
    || [s(user.firstName), s(user.lastName)].filter(Boolean).join(' ');
  return {
    name: contact,
    company: s(app.businessName) || s(user.business) || '',
    street1: s(app.businessAddress) || s(user.address?.street) || s(user.address?.address1),
    street2: s(app.businessAddress2) || s(user.address?.address2),
    city: s(app.businessCity) || s(user.address?.city),
    state: s(app.businessState) || s(user.address?.state) || s(user.address?.province),
    zip: s(app.businessZip) || s(user.address?.zipCode) || s(user.address?.zip),
    country: countryCode(app.businessCountry || user.address?.country || 'US'),
    phone: s(app.contactPhone) || s(user.phoneNumber) || s(user.address?.phone),
    email: s(app.contactEmail) || s(user.email),
    residential: false,
  };
}

export async function loadShipFrom() {
  const dbi = await db.connect();
  const settings = await dbi.collection('adminSettings').findOne({ _id: 'repair_task_admin_settings' }, { projection: { business: 1 } });
  return { settings: settings || {}, shipFrom: shipFromFromSettings(settings || {}) };
}

/**
 * The store an invoice ships back to. Uses the same identity resolution the notifications use
 * (clientID / storeId / business account key), then the first portal user with a complete
 * street address; falls back to the first match so the problems list can name the store.
 */
export async function resolveInvoiceShipTo(invoice) {
  const recipients = await resolveWholesaleInvoiceRecipients(invoice);
  if (!recipients.length) return { shipTo: null, wholesaler: null, problems: ['No wholesale account matches this invoice — link the store first.'] };
  const dbi = await db.connect();
  const users = await dbi.collection('users')
    .find({ userID: { $in: recipients.map((r) => r.userID) } }, { projection: { _id: 0, userID: 1, firstName: 1, lastName: 1, email: 1, phoneNumber: 1, business: 1, address: 1, wholesaleApplication: 1 } })
    .toArray();
  const candidates = users.map((u) => ({ user: u, shipTo: shipToFromWholesaler(u) }));
  const complete = candidates.find((c) => addressProblems(c.shipTo).length === 0) || candidates[0];
  if (!complete) return { shipTo: null, wholesaler: null, problems: ['Wholesale account record not found.'] };
  return { shipTo: complete.shipTo, wholesaler: complete.user, problems: addressProblems(complete.shipTo, `${complete.shipTo.company || 'store'} address`) };
}
