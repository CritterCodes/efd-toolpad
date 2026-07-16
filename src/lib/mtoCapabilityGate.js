/**
 * MTO checkout capability gate.
 *
 * Revised made-to-order Products (Design-backed, with at least one active variant
 * offering madeToOrder) may not be published until the durable mtoCheckoutCapacity
 * capability from efd-shop is active. The capability record is written to the shared
 * platformCapabilities collection by efd-shop's checkout and webhook handlers.
 *
 * Handmade designs and products with no MTO offer bypass this gate unchanged.
 * Fail closed: missing, inactive, stale (>72 h without re-registration), or
 * version-incompatible records all block publication with a clear admin-facing reason.
 */

const MTO_CAPABILITY_KEY = 'mtoCheckoutCapacity';
export const MTO_CAPABILITY_VERSION = 1;

const PLATFORM_CAPABILITIES_COLLECTION = 'platformCapabilities';
const CAPABILITY_STALENESS_MS = 72 * 60 * 60 * 1000; // 72 hours

/**
 * A product is a "revised MTO product" if it is Design-backed (has designId) and at
 * least one active variant exposes a made-to-order offer.
 */
export function isRevisedMtoProduct(product) {
  if (!product?.designId) return false;
  const active = (product.variants || []).filter((v) => v.active);
  return active.some((v) => v.offers?.madeToOrder?.enabled === true);
}

/**
 * Handmade designs skip the CAD/Refrakt/checkout gates and are exempt from the
 * mtoCheckoutCapacity requirement.
 */
export function isHandmadeDesign(design) {
  return design?.productionMethod === 'handmade';
}

/**
 * Combined gate predicate: true when a product requires the MTO capability check
 * (i.e., it is a revised MTO product AND the backing design is not handmade).
 * Pass `design = null` when the design could not be loaded — the gate still fires
 * (fail closed: unknown production method is not exempt).
 */
export function productNeedsMtoGate(product, design) {
  return isRevisedMtoProduct(product) && !isHandmadeDesign(design);
}

/**
 * Read the current mtoCheckoutCapacity capability record from the shared
 * platformCapabilities collection. Returns null when no record exists.
 */
export async function loadMtoCapabilityRecord(db) {
  return db
    .collection(PLATFORM_CAPABILITIES_COLLECTION)
    .findOne({ key: MTO_CAPABILITY_KEY, version: MTO_CAPABILITY_VERSION });
}

/**
 * Validate a capability record for the publish gate.
 * Fail closed for every failure mode:
 *   - missing  → no record
 *   - inactive → active flag is false (not all handlers installed)
 *   - stale    → updatedAt > 72 h ago (efd-shop is not running / not re-registering)
 *   - incompatible → record's version does not match MTO_CAPABILITY_VERSION
 *
 * @param {object|null} record — from loadMtoCapabilityRecord
 * @param {Date} [now] — injectable for testing
 * @returns {{ allowed: boolean, reason?: string }}
 */
export function checkMtoCapabilityRecord(record, now = new Date()) {
  if (!record) {
    return {
      allowed: false,
      reason:
        'MTO checkout capability is not registered — deploy efd-shop with both the checkout and webhook handlers, then retry.',
    };
  }
  if (record.version !== MTO_CAPABILITY_VERSION) {
    return {
      allowed: false,
      reason: `MTO checkout capability version ${record.version} is incompatible; expected version ${MTO_CAPABILITY_VERSION}. Upgrade efd-shop to the matching version.`,
    };
  }
  if (!record.active) {
    return {
      allowed: false,
      reason:
        'MTO checkout capability is not active — both efd-shop checkout and webhook handlers must be installed and registered before publishing a made-to-order product.',
    };
  }
  const updatedAt = record.updatedAt ? new Date(record.updatedAt) : null;
  if (!updatedAt || now - updatedAt > CAPABILITY_STALENESS_MS) {
    return {
      allowed: false,
      reason:
        'MTO checkout capability record is stale (not updated within 72 hours) — verify that efd-shop is deployed and its handlers are registering correctly.',
    };
  }
  return { allowed: true };
}
