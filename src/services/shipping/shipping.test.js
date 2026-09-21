import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/database', () => ({ db: { connect: vi.fn() } }));
vi.mock('@/services/wholesale/invoiceNotifications', () => ({ resolveWholesaleInvoiceRecipients: vi.fn() }));

import { selectRates, normalizeRate, quoteShipment, buyShipment, EasyPostError, easyPostMode } from './easypost';
import { DEFAULT_PARCEL_PRESETS, resolveParcelPresets, findParcelPreset, parcelForEasyPost } from './parcels';
import { shipFromFromSettings, shipToFromWholesaler, addressProblems, countryCode } from './addresses';
import { buildFulfillmentUpdate, buildLabelUpdate, labelCostDrift } from './invoiceFulfillment';

// Recorded EasyPost shapes (docs.easypost.com/docs/shipments), trimmed.
const RATES = [
  { id: 'rate_usps', carrier: 'USPS', service: 'Priority', rate: '11.01', currency: 'USD', delivery_days: 2, carrier_account_id: 'ca_usps' },
  { id: 'rate_fx_on', carrier: 'FedEx', service: 'PRIORITY_OVERNIGHT', rate: '81.00', currency: 'USD', delivery_days: 1, delivery_date_guaranteed: true, carrier_account_id: 'ca_fx' },
  { id: 'rate_fx_gr', carrier: 'FedEx', service: 'FEDEX_GROUND', rate: '14.20', currency: 'USD', delivery_days: 3, carrier_account_id: 'ca_fx' },
];
// What the FedEx Default WALLET account actually returns (prod, 2026-09-21): carrier is the account name.
const WALLET_RATES = [
  { id: 'rate_w1', carrier: 'FedExDefault', service: 'FEDEX_EXPRESS_SAVER', rate: '15.66', currency: 'USD', delivery_days: 3 },
  { id: 'rate_w2', carrier: 'FedExDefault', service: 'PRIORITY_OVERNIGHT', rate: '21.30', currency: 'USD', delivery_days: 1 },
  { id: 'rate_w3', carrier: 'UPSDAP', service: 'Ground', rate: '9.10', currency: 'USD', delivery_days: 4 },
];

describe('EasyPost adapter', () => {
  it('normalizes money strings once and keeps FedEx only, cheapest first', () => {
    const { rates, filteredToCarriers } = selectRates(RATES, { carriers: ['FedEx'] });
    expect(filteredToCarriers).toBe(true);
    expect(rates.map((r) => r.service)).toEqual(['FEDEX_GROUND', 'PRIORITY_OVERNIGHT']);
    expect(rates[1]).toMatchObject({ rateId: 'rate_fx_on', rate: 81, guaranteed: true, deliveryDays: 1 });
    expect(typeof rates[0].rate).toBe('number');
  });

  it('recognises the FedEx Default WALLET account as FedEx (the "no FedEx rates" false alarm)', () => {
    const { rates, filteredToCarriers } = selectRates(WALLET_RATES, { carriers: ['FedEx'] });
    expect(filteredToCarriers).toBe(true);
    expect(rates.map((r) => r.service)).toEqual(['FEDEX_EXPRESS_SAVER', 'PRIORITY_OVERNIGHT']);
    expect(rates[0]).toMatchObject({ carrier: 'FedEx', carrierAccount: 'FedExDefault', rate: 15.66 });
  });

  it('falls back to every carrier, flagged, when FedEx returned nothing (account not enabled yet)', () => {
    const { rates, filteredToCarriers } = selectRates([RATES[0]], { carriers: ['FedEx'] });
    expect(filteredToCarriers).toBe(false);
    expect(rates).toHaveLength(1);
    expect(rates[0].carrier).toBe('USPS');
  });

  it('quoteShipment posts the shipment body with basic auth and returns the shipment id + rates', async () => {
    const calls = [];
    const fetchImpl = vi.fn(async (url, init) => {
      calls.push({ url, init });
      return { ok: true, status: 201, json: async () => ({ id: 'shp_1', mode: 'test', rates: RATES, messages: [] }) };
    });
    const parcel = { length: 6, width: 4, height: 4, weight: 8 };
    const q = await quoteShipment({ shipFrom: { street1: 'a' }, shipTo: { street1: 'b' }, parcel, apiKey: 'EZTK_x', fetchImpl });
    expect(q.shipmentId).toBe('shp_1');
    expect(q.mode).toBe('test');
    expect(q.rates.map((r) => r.rateId)).toEqual(['rate_fx_gr', 'rate_fx_on']);
    expect(calls[0].url).toBe('https://api.easypost.com/v2/shipments');
    expect(calls[0].init.headers.Authorization).toBe(`Basic ${Buffer.from('EZTK_x:').toString('base64')}`);
    const body = JSON.parse(calls[0].init.body);
    expect(body.shipment.parcel).toEqual(parcel);
    expect(body.shipment.to_address).toEqual({ street1: 'b' });
  });

  it('buyShipment sends the chosen rate (+ insurance as a string) and returns label + tracking', async () => {
    const fetchImpl = vi.fn(async (url, init) => ({
      ok: true, status: 200,
      json: async () => ({
        id: 'shp_1', mode: 'test', tracking_code: '7489', insurance: '2.50',
        selected_rate: RATES[1], postage_label: { label_url: 'https://x/label.png', label_pdf_url: '' }, tracker: { id: 'trk_1', public_url: 'https://track/1' },
      }),
    }));
    const bought = await buyShipment({ shipmentId: 'shp_1', rateId: 'rate_fx_on', insuranceValue: 2500, apiKey: 'EZTK_x', fetchImpl });
    expect(fetchImpl.mock.calls[0][0]).toBe('https://api.easypost.com/v2/shipments/shp_1/buy');
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({ rate: { id: 'rate_fx_on' }, insurance: '2500' });
    expect(bought).toMatchObject({ trackingCode: '7489', carrier: 'FedEx', service: 'PRIORITY_OVERNIGHT', cost: 81, insuranceCost: 2.5, labelUrl: 'https://x/label.png', publicTrackingUrl: 'https://track/1' });
  });

  it('surfaces EasyPost error messages and refuses to run without a key', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 422, json: async () => ({ error: { code: 'ADDRESS.VERIFY.FAILURE', message: 'Unable to verify address.', errors: [] } }) }));
    await expect(quoteShipment({ shipFrom: {}, shipTo: {}, parcel: {}, apiKey: 'EZTK_x', fetchImpl })).rejects.toMatchObject({ name: 'EasyPostError', status: 422, code: 'ADDRESS.VERIFY.FAILURE', message: 'Unable to verify address.' });
    await expect(quoteShipment({ shipFrom: {}, shipTo: {}, parcel: {}, apiKey: '', fetchImpl })).rejects.toBeInstanceOf(EasyPostError);
    expect(easyPostMode({ EASYPOST_API_KEY: 'EZTKabc' })).toBe('test');
    expect(easyPostMode({ EASYPOST_API_KEY: 'EZAKabc' })).toBe('production');
    expect(easyPostMode({})).toBe('unconfigured');
  });
});

describe('parcel presets', () => {
  it('defaults exist, override from settings, and convert to EasyPost units (oz / in)', () => {
    expect(resolveParcelPresets({})).toHaveLength(DEFAULT_PARCEL_PRESETS.length);
    const custom = resolveParcelPresets({ business: { shipping: { parcels: [{ key: 'ring-box', label: 'Ring box', length: 3, width: 3, height: 2, weightOz: 4 }, { key: 'bad' }] } } });
    expect(custom.map((p) => p.key)).toEqual(['ring-box']);
    expect(parcelForEasyPost(findParcelPreset({}, 'fedex-small-box'))).toEqual({ predefined_package: 'FedExSmallBox', weight: 12 });
    expect(findParcelPreset({}, 'nope').key).toBe('fedex-small-box'); // unknown key → the standard box
  });
});

describe('addresses', () => {
  it("maps a wholesaler's application record to the store's EasyPost address (Marlen's real shape)", () => {
    const marlen = {
      userID: 'user-c9f82772', firstName: 'Andrew', lastName: 'Eilberg', email: 'andrew@marlen.test', phoneNumber: '4403319004', business: 'Marlen Jewelers', address: {},
      wholesaleApplication: { businessName: 'Marlen Jewelers', businessAddress: '19525 Detroit Rd', businessCity: 'Rocky River', businessState: 'OH', businessZip: '44116', businessCountry: 'United States', contactFirstName: 'Andrew', contactLastName: 'Eilberg', contactPhone: '(440) 331-9004' },
    };
    const to = shipToFromWholesaler(marlen);
    expect(to).toMatchObject({ name: 'Andrew Eilberg', company: 'Marlen Jewelers', street1: '19525 Detroit Rd', city: 'Rocky River', state: 'OH', zip: '44116', country: 'US', phone: '(440) 331-9004', residential: false });
    expect(addressProblems(to)).toEqual([]);
  });

  it('names exactly what is missing so the finalize step can point at the fix', () => {
    expect(addressProblems(shipToFromWholesaler({ business: 'Cooper\'s Coin and Pawn', wholesaleApplication: {} }), 'store')).toEqual([
      'store: street1 is missing', 'store: city is missing', 'store: state is missing', 'store: zip is missing',
    ]);
    const from = shipFromFromSettings({ business: { name: 'Engel Fine Design' } });
    expect(from.company).toBe('Engel Fine Design');
    expect(addressProblems(from, 'ship-from')).toHaveLength(4);
    expect(countryCode('United States')).toBe('US');
    expect(countryCode('ca')).toBe('CA');
  });
});

describe('invoice fulfillment (pure)', () => {
  const quote = { shipmentId: 'shp_1', mode: 'test', quotedAt: new Date('2026-09-21T15:00:00Z'), parcel: { weight: 8 }, rates: selectRates(RATES).rates, shipTo: { city: 'Rocky River' } };
  const actor = { userID: 'u-o', name: 'Jacob' };

  it('pickup: no fees, hand-delivery fee zeroed, decision recorded', () => {
    const set = buildFulfillmentUpdate({ method: 'pickup', actor });
    expect(set).toMatchObject({ deliveryMethod: 'pickup', deliveryFee: 0, shippingFee: 0 });
    expect(set.fulfillment).toMatchObject({ method: 'pickup', decidedBy: 'u-o' });
  });

  it('ship: the chosen rate becomes shippingFee at cost and the quote is kept for the label purchase', () => {
    const set = buildFulfillmentUpdate({ method: 'ship', quote, rateId: 'rate_fx_on', actor });
    expect(set.deliveryMethod).toBe('ship');
    expect(set.shippingFee).toBe(81);
    expect(set.fulfillment.shipping).toMatchObject({ provider: 'easypost', shipmentId: 'shp_1', rate: { rateId: 'rate_fx_on', carrier: 'FedEx', rate: 81 }, label: null });
  });

  it('refuses ship without a quote, with a rate that is not in the quote, and unknown methods (hand delivery included)', () => {
    expect(() => buildFulfillmentUpdate({ method: 'ship', actor })).toThrow(/Get shipping rates/);
    expect(() => buildFulfillmentUpdate({ method: 'ship', quote, rateId: 'rate_usps_not_here', actor })).toThrow(/does not match/);
    expect(() => buildFulfillmentUpdate({ method: 'delivery', actor })).toThrow(/pickup or ship/);
  });

  it('label purchase → label block + the outboundShipment every existing consumer reads', () => {
    const purchase = { trackingCode: '7489', carrier: 'FedEx', service: 'PRIORITY_OVERNIGHT', cost: 81, insuranceCost: 0, labelUrl: 'https://x/l.png', mode: 'production' };
    const { label, outboundShipment } = buildLabelUpdate({ purchase, actor, now: new Date('2026-09-22T10:00:00Z') });
    expect(label).toMatchObject({ trackingCode: '7489', cost: 81, purchasedBy: 'u-o' });
    expect(outboundShipment).toMatchObject({ method: 'ship', carrier: 'FedEx', trackingNumber: '7489', provider: 'easypost', shippedBy: 'u-o' });
    expect(() => buildLabelUpdate({ purchase: { trackingCode: '' } })).toThrow(/no tracking code/);
  });

  it('reports quote-vs-label drift without touching the billed fee', () => {
    expect(labelCostDrift({ shipping: { rate: { rate: 81 }, label: { cost: 81.35 } } })).toBe(0.35);
    expect(labelCostDrift({ shipping: { rate: { rate: 81 } } })).toBe(0);
  });
});

describe('invoiceGrossTotal (every payment path must use it)', () => {
  it('includes the carrier shipping fee beside the legacy delivery fee', async () => {
    const { invoiceGrossTotal } = await import('@/app/api/repair-invoices/service');
    expect(invoiceGrossTotal({ subtotal: 2103.48, taxAmount: 0, deliveryFee: 0, shippingFee: 81 })).toBe(2184.48);
    expect(invoiceGrossTotal({ subtotal: 48, deliveryFee: 5 })).toBe(53);
    expect(invoiceGrossTotal({})).toBe(0);
  });
});
