/**
 * What the generic repair edit (PUT /api/repairs?repairID=) may write (EFD-DEFECTS S5, 2026-09-30).
 *
 * That route used to hand its whole body to the database. Its one caller — the intake form in edit
 * mode — loads the entire repair into the form and sends it all back, so nothing was ever filtered,
 * and anything a client sent landed: `status`, `invoiceID`, `assignedTo`, closeout, QC and quote
 * fields, and the billing mode. A store can edit its own repairs through this route, so a store could
 * mark its own ticket `compRepair: true` (free), or move it past QC.
 *
 * ALLOW-LIST, NOT DENY-LIST. A deny-list is only as good as the last field someone remembered. The
 * form edits a known, finite set of fields; everything else on a repair belongs to a workflow route
 * (claim, move, QC, receiving, invoicing, closeout, the quote flow), each with its own checks.
 *
 * DROPPED, NOT REJECTED. Because the form resends the whole repair, a request carrying `status` or
 * `invoiceID` is normal — those values are just the unchanged ones it loaded. Refusing them would
 * break every edit. Dropping them means they are simply not rewritten, which is what should happen.
 *
 * NOT FIXED HERE: prices are still computed in the browser and trusted (tasks[].price, totalCost). A
 * store that prices its own repair can still send any number for its own ticket. The fix for that is
 * server-side re-pricing through one engine (EFD-DEFECTS P12), not a field list.
 */

/** Fields staff (admin, and on-site artisans with repair ops) may change through the edit form. */
export const STAFF_EDITABLE_FIELDS = Object.freeze([
  // Who it's for
  'userID', 'clientName', 'clientEmail', 'clientPhone', 'clientNotProvided',
  'storeId', 'storeName', 'businessName', 'isWholesale',
  // The piece
  'description', 'notes', 'internalNotes', 'picture', 'beforePhotos', 'afterPhotos', 'smartIntakeInput',
  'metalType', 'karat', 'goldColor', 'isRing', 'currentRingSize', 'desiredRingSize', 'category', 'priority',
  // The work and its price
  'tasks', 'materials', 'customLineItems',
  'isRush', 'promiseDate', 'includeDelivery', 'includeTax', 'deliveryMethod',
  'totalCost', 'subtotal', 'rushFee', 'deliveryFee', 'taxAmount', 'taxRate',
  // How it's billed — staff only
  'compRepair', 'includedWithSale', 'billing',
]);

/**
 * What a STORE may change on its own repair: the piece, the work and its price. Not who it's keyed
 * to or which store it belongs to (the server resolves those), not whether it's wholesale or free,
 * and not the shop's internal notes or after-photos.
 */
const STORE_EXCLUDED = new Set([
  'userID', 'clientNotProvided', 'storeId', 'storeName', 'businessName', 'isWholesale',
  'internalNotes', 'afterPhotos',
  'compRepair', 'includedWithSale', 'billing',
]);
export const STORE_EDITABLE_FIELDS = Object.freeze(STAFF_EDITABLE_FIELDS.filter((f) => !STORE_EXCLUDED.has(f)));

/**
 * Pure: split an edit body into what may be written and what was dropped.
 *
 * `isStaff` picks the list. Dotted keys (`tasks.0.price`) are judged by their first segment, so a
 * targeted `$set` into a protected subdocument (`billing.mode`) is dropped the same as the whole
 * field would be. Prototype keys are never written.
 */
export function pickEditableRepairFields(body = {}, { isStaff = false } = {}) {
  const allowed = new Set(isStaff ? STAFF_EDITABLE_FIELDS : STORE_EDITABLE_FIELDS);
  const update = {};
  const dropped = [];
  for (const [key, value] of Object.entries(body || {})) {
    const head = String(key).split('.')[0];
    if (head === '__proto__' || head === 'constructor' || head === 'prototype' || !allowed.has(head)) {
      dropped.push(key);
      continue;
    }
    update[key] = value;
  }
  return { update, dropped };
}
