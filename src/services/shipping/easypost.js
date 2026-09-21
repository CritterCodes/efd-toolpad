/**
 * EasyPost adapter — the ONE place the shop talks to a carrier (owner, 2026-09-21: EasyPost,
 * FedEx via EasyPost's own "FedEx Default" wallet account, charged through at cost).
 *
 * Two calls, matching EasyPost's model:
 *   quoteShipment  POST /v2/shipments        → a Shipment with `rates[]`  (nothing bought)
 *   buyShipment    POST /v2/shipments/:id/buy → label + tracking for ONE chosen rate
 *
 * Units: parcel weight in OUNCES, dimensions in INCHES (EasyPost docs). Money comes back as
 * strings ("11.01"); `normalizeRate` turns them into numbers once, here, so nothing downstream
 * parses carrier JSON.
 *
 * `fetchImpl` is injectable so the adapter is unit-tested against recorded shapes without a key.
 */

export const EASYPOST_BASE_URL = 'https://api.easypost.com/v2';

/**
 * Why a Saturday quote can come back empty: FedEx offers Saturday delivery only when Saturday IS
 * the scheduled delivery day for that service from today's ship date — Priority Overnight shipped
 * Friday, 2Day shipped Thursday. Quoted on a Monday, nothing is Saturday-eligible. First seen
 * 2026-09-21 (a Monday) on the Marlen rate check.
 */
export const SATURDAY_EMPTY_HINT = 'No Saturday-eligible services for a shipment today. FedEx offers Saturday delivery only when Saturday is the delivery day: quote and ship on Friday for Priority Overnight, Thursday for 2Day. Untick Saturday to see weekday services.';

/** The carrier messages worth showing a human (FedEx + generic), trimmed. */
export function relevantCarrierMessages(messages = [], carriers = ['FedEx']) {
  const wanted = new Set(carriers.map((c) => carrierBrand(c).toLowerCase()));
  return (messages || [])
    .filter((m) => wanted.has(carrierBrand(m.carrier).toLowerCase()))
    .map((m) => `${carrierBrand(m.carrier)}: ${m.message}`);
}

export class EasyPostError extends Error {
  constructor(message, { status = 0, code = '', details = null } = {}) {
    super(message);
    this.name = 'EasyPostError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function getEasyPostApiKey(env = process.env) {
  return String(env.EASYPOST_API_KEY || '').trim();
}

export function isEasyPostConfigured(env = process.env) {
  return getEasyPostApiKey(env).length > 0;
}

/** Test keys start with EZTK, production with EZAK. Surfaced in the UI so a test label is never mistaken for a real one. */
export function easyPostMode(env = process.env) {
  const key = getEasyPostApiKey(env);
  if (!key) return 'unconfigured';
  return key.startsWith('EZTK') ? 'test' : 'production';
}

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * EasyPost names a wallet account's carrier by ACCOUNT, not brand: the FedEx Default wallet
 * account comes back as `FedExDefault` (likewise `UPSDAP` for UPS-by-EasyPost). The invoice, the
 * label, and the store's notification want the brand. First real quote (2026-09-21) returned five
 * `FedExDefault` rates that the exact-match filter threw away, so the UI wrongly said "no FedEx".
 */
export function carrierBrand(carrier = '') {
  const c = String(carrier || '');
  if (/^fedex/i.test(c)) return 'FedEx';
  if (/^ups/i.test(c)) return 'UPS';
  if (/^usps/i.test(c)) return 'USPS';
  return c;
}

/** EasyPost rate → the shape the invoice stores. `carrier` is the brand; `carrierAccount` the raw name. */
export function normalizeRate(rate = {}) {
  return {
    rateId: rate.id || '',
    carrier: carrierBrand(rate.carrier),
    carrierAccount: rate.carrier || '',
    service: rate.service || '',
    rate: round2(rate.rate),
    currency: rate.currency || 'USD',
    deliveryDays: rate.delivery_days ?? null,
    deliveryDate: rate.delivery_date ?? null,
    guaranteed: rate.delivery_date_guaranteed === true,
    carrierAccountId: rate.carrier_account_id || '',
  };
}

/**
 * Keep the carriers the shop actually ships with, cheapest first. When the filter would leave
 * nothing (e.g. FedEx not enabled yet on the EasyPost account) fall back to everything, flagged,
 * rather than showing an empty list with no explanation.
 */
export function selectRates(rates = [], { carriers = ['FedEx'] } = {}) {
  const normalized = (rates || []).map(normalizeRate).filter((r) => r.rateId && r.rate > 0);
  const wanted = new Set((carriers || []).map((c) => carrierBrand(c).toLowerCase()));
  const matched = wanted.size ? normalized.filter((r) => wanted.has(r.carrier.toLowerCase())) : normalized;
  const list = matched.length ? matched : normalized;
  list.sort((a, b) => a.rate - b.rate);
  return { rates: list, filteredToCarriers: matched.length > 0, carriersRequested: [...carriers] };
}

async function request(path, { method = 'GET', body = null, apiKey, fetchImpl = fetch } = {}) {
  if (!apiKey) throw new EasyPostError('EasyPost is not configured (EASYPOST_API_KEY is missing).', { code: 'NOT_CONFIGURED' });
  const res = await fetchImpl(`${EASYPOST_BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { json = null; }
  if (!res.ok) {
    const err = json?.error || {};
    throw new EasyPostError(err.message || `EasyPost request failed (${res.status}).`, {
      status: res.status, code: err.code || '', details: err.errors || null,
    });
  }
  return json;
}

/**
 * Create an EasyPost Shipment to get rates. Nothing is purchased. Returns the shipment id
 * (needed to buy later — a Shipment is immutable, so the quote and the label share it) plus
 * the selected, normalized rates.
 */
/**
 * `options` are EasyPost shipment options. The one the shop uses is `saturday_delivery: true` —
 * FedEx then returns only Saturday-eligible services with the Saturday surcharge INSIDE the rate,
 * so what the store is billed is what the label costs.
 */
export async function quoteShipment({ shipFrom, shipTo, parcel, carriers = ['FedEx'], reference = '', options = null, apiKey = getEasyPostApiKey(), fetchImpl } = {}) {
  const shipment = await request('/shipments', {
    method: 'POST', apiKey, fetchImpl,
    body: { shipment: { to_address: shipTo, from_address: shipFrom, parcel, reference: reference || undefined, ...(options && Object.keys(options).length ? { options } : {}) } },
  });
  const selection = selectRates(shipment.rates, { carriers });
  return {
    shipmentId: shipment.id,
    mode: shipment.mode || null,
    quotedAt: new Date(),
    parcel,
    options: options || null,
    saturdayDelivery: options?.saturday_delivery === true,
    ...selection,
    messages: (shipment.messages || []).map((m) => ({ carrier: m.carrier, type: m.type, message: m.message })),
  };
}

/**
 * Buy the label for a previously quoted shipment with the chosen rate. `insuranceValue` (USD)
 * adds EasyPost insurance at their published cost — passed through at cost like everything else.
 */
export async function buyShipment({ shipmentId, rateId, insuranceValue = null, apiKey = getEasyPostApiKey(), fetchImpl } = {}) {
  if (!shipmentId || !rateId) throw new EasyPostError('shipmentId and rateId are required to buy a label.', { code: 'BAD_REQUEST' });
  const body = { rate: { id: rateId } };
  if (insuranceValue != null && Number(insuranceValue) > 0) body.insurance = String(round2(insuranceValue));
  const bought = await request(`/shipments/${encodeURIComponent(shipmentId)}/buy`, { method: 'POST', apiKey, fetchImpl, body });
  const selected = normalizeRate(bought.selected_rate || {});
  return {
    shipmentId: bought.id,
    trackingCode: bought.tracking_code || '',
    carrier: selected.carrier,
    service: selected.service,
    cost: selected.rate,
    insuranceCost: round2(bought.insurance) || 0,
    labelUrl: bought.postage_label?.label_url || '',
    labelPdfUrl: bought.postage_label?.label_pdf_url || '',
    trackerId: bought.tracker?.id || '',
    publicTrackingUrl: bought.tracker?.public_url || '',
    purchasedAt: new Date(),
    mode: bought.mode || null,
  };
}
