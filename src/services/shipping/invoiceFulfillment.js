/**
 * Fulfillment is decided when an invoice is FINALIZED (owner, 2026-09-21): Pickup, or Ship
 * with a live carrier rate. The chosen rate becomes `shippingFee` on the invoice BEFORE anything
 * prints or notifies, so the paper in the box, the portal, and the email all carry the right
 * total. Hand delivery is no longer offered ("I'm alone in the shop"); legacy `delivery`
 * invoices keep displaying and finishing as they were.
 *
 * Shape on the invoice:
 *   deliveryMethod: 'pickup' | 'ship' | 'delivery'(legacy)     ← existing consumers read this
 *   shippingFee: number                                         ← at cost, the quoted rate
 *   fulfillment: {
 *     method, decidedAt, decidedBy,
 *     shipping?: { provider:'easypost', shipmentId, quotedAt, parcel, shipTo, shipFrom,
 *                  rate:{ rateId, carrier, service, rate, deliveryDays, deliveryDate },
 *                  label?: { trackingCode, labelUrl, cost, purchasedAt, purchasedBy } }
 *   }
 * Pure helpers here; the service layer wires them to EasyPost and the database.
 */

export const FULFILLMENT_METHODS = Object.freeze(['pickup', 'ship']);

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export function isValidFulfillmentMethod(method) {
  return FULFILLMENT_METHODS.includes(method);
}

/** The $set for finalizing with a fulfillment decision. Pure. Throws on an incoherent request. */
export function buildFulfillmentUpdate({ method, quote = null, rateId = '', actor = {}, now = new Date() } = {}) {
  if (!isValidFulfillmentMethod(method)) {
    throw Object.assign(new Error(`Unsupported fulfillment method "${method}". Choose pickup or ship.`), { code: 'BAD_REQUEST' });
  }
  const base = {
    deliveryMethod: method,
    deliveryFee: 0, // hand delivery is gone; never carry a stale $5 into a pickup or shipment
    fulfillment: { method, decidedAt: now, decidedBy: actor.userID || '', decidedByName: actor.name || '' },
  };
  if (method === 'pickup') return { ...base, shippingFee: 0 };

  if (!quote?.shipmentId || !Array.isArray(quote.rates) || !quote.rates.length) {
    throw Object.assign(new Error('Get shipping rates before finalizing as Ship.'), { code: 'BAD_REQUEST' });
  }
  const rate = quote.rates.find((r) => r.rateId === rateId);
  if (!rate) {
    throw Object.assign(new Error('Pick one of the quoted rates — the selection does not match the quote.'), { code: 'BAD_REQUEST' });
  }
  return {
    ...base,
    shippingFee: round2(rate.rate),
    fulfillment: {
      ...base.fulfillment,
      shipping: {
        provider: 'easypost',
        mode: quote.mode || null,
        shipmentId: quote.shipmentId,
        quotedAt: quote.quotedAt || now,
        parcel: quote.parcel || null,
        saturdayDelivery: quote.saturdayDelivery === true,
        shipTo: quote.shipTo || null,
        shipFrom: quote.shipFrom || null,
        rate: { ...rate },
        label: null,
      },
    },
  };
}

/** After a label purchase: the label block + the outboundShipment consumers already read. Pure. */
export function buildLabelUpdate({ purchase, actor = {}, now = new Date() } = {}) {
  if (!purchase?.trackingCode) throw Object.assign(new Error('The label purchase returned no tracking code.'), { code: 'BAD_GATEWAY' });
  const label = {
    trackingCode: purchase.trackingCode,
    carrier: purchase.carrier || '',
    service: purchase.service || '',
    cost: round2(purchase.cost),
    insuranceCost: round2(purchase.insuranceCost),
    labelUrl: purchase.labelUrl || '',
    labelPdfUrl: purchase.labelPdfUrl || '',
    publicTrackingUrl: purchase.publicTrackingUrl || '',
    trackerId: purchase.trackerId || '',
    mode: purchase.mode || null,
    purchasedAt: now,
    purchasedBy: actor.userID || '',
  };
  const outboundShipment = {
    method: 'ship',
    carrier: purchase.carrier || null,
    trackingNumber: purchase.trackingCode,
    labelUrl: label.labelUrl || null,
    provider: 'easypost',
    shippedAt: now,
    shippedBy: actor.userID || '',
  };
  return { label, outboundShipment };
}

/** Quoted vs. bought — the invoice keeps the quote (that's what the store was billed); flag drift. */
export function labelCostDrift(fulfillment = {}) {
  const quoted = Number(fulfillment?.shipping?.rate?.rate);
  const actual = Number(fulfillment?.shipping?.label?.cost);
  if (!Number.isFinite(quoted) || !Number.isFinite(actual)) return 0;
  return round2(actual - quoted);
}
