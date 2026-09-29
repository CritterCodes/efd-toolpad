import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/database', () => ({ db: { connect: vi.fn() } }));
vi.mock('@/app/api/repair-invoices/model', () => ({ default: { findByInvoiceID: vi.fn() } }));

import { normalizeFulfillmentPreference, DEFAULT_PARCEL_KEY } from './storeFulfillment';
import { buildFulfillmentUpdate } from './invoiceFulfillment';

/**
 * The store preference is a DEFAULT, not an action (owner, 2026-09-29). It sets the delivery method
 * on the draft — which is also the key that keeps a store's repairs on one invoice — and preselects
 * the Finalize dialog. The auto-finalize it used to perform is gone: finalizing is a person's job,
 * for stores exactly as for walk-ins, because finalizing is what issues the bill and notifies.
 */
describe('store fulfillment preference', () => {
  it('normalizes to the three methods; parcel only matters for ship', () => {
    expect(normalizeFulfillmentPreference({ method: 'pickup', parcelKey: 'x' })).toEqual({ method: 'pickup', parcelKey: null });
    expect(normalizeFulfillmentPreference({ method: 'delivery' })).toEqual({ method: 'delivery', parcelKey: null });
    expect(normalizeFulfillmentPreference({ method: 'ship' })).toEqual({ method: 'ship', parcelKey: DEFAULT_PARCEL_KEY });
    expect(normalizeFulfillmentPreference({ method: 'ship', parcelKey: 'fedex-medium-box' })).toEqual({ method: 'ship', parcelKey: 'fedex-medium-box' });
    expect(normalizeFulfillmentPreference({ method: 'teleport' })).toBeNull();
    expect(normalizeFulfillmentPreference(null)).toBeNull();
  });

  it('hand delivery finalizes with the delivery fee and a scheduled store run; pickup carries no fee', () => {
    const now = new Date('2026-09-22T15:00:00Z');
    const delivery = buildFulfillmentUpdate({ method: 'delivery', deliveryFee: 20, actor: { userID: 'auto-fulfillment', name: 'Store default' }, now });
    expect(delivery).toMatchObject({ deliveryMethod: 'delivery', deliveryFee: 20, shippingFee: 0, outboundShipment: { method: 'delivery', scheduledAt: now } });
    expect(delivery.outboundShipment.deliveredAt).toBeUndefined();
    const pickup = buildFulfillmentUpdate({ method: 'pickup', deliveryFee: 20 });
    expect(pickup).toMatchObject({ deliveryMethod: 'pickup', deliveryFee: 0, shippingFee: 0 });
    expect(pickup.outboundShipment).toBeUndefined();
  });
});
