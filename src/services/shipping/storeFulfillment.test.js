import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/database', () => ({ db: { connect: vi.fn() } }));
vi.mock('@/app/api/repair-invoices/model', () => ({ default: { findByInvoiceID: vi.fn() } }));
vi.mock('@/services/shipping/invoiceShipping', () => ({ quoteInvoiceShipping: vi.fn(), finalizeInvoiceFulfillment: vi.fn() }));
vi.mock('@/lib/notificationService', () => ({ notifyAllAdmins: vi.fn(async () => ({})) }));
vi.mock('@/lib/appUrls', () => ({ adminBase: () => 'http://test' }));

import RepairInvoicesModel from '@/app/api/repair-invoices/model';
import { quoteInvoiceShipping, finalizeInvoiceFulfillment } from '@/services/shipping/invoiceShipping';
import { normalizeFulfillmentPreference, applyStoreFulfillmentDefault, DEFAULT_PARCEL_KEY, AUTO_FULFILLMENT_ACTOR } from './storeFulfillment';
import { buildFulfillmentUpdate } from './invoiceFulfillment';

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

  it('applies pickup / delivery immediately and only to wholesale drafts', async () => {
    RepairInvoicesModel.findByInvoiceID.mockResolvedValueOnce({ invoiceID: 'i1', accountType: 'wholesale', status: 'draft' });
    const r = await applyStoreFulfillmentDefault({ invoiceID: 'i1', preference: { method: 'delivery', parcelKey: null } });
    expect(r).toEqual({ applied: true, method: 'delivery' });
    expect(finalizeInvoiceFulfillment).toHaveBeenCalledWith({ invoiceID: 'i1', method: 'delivery', actor: AUTO_FULFILLMENT_ACTOR });

    RepairInvoicesModel.findByInvoiceID.mockResolvedValueOnce({ invoiceID: 'i2', accountType: 'wholesale', status: 'open' });
    expect((await applyStoreFulfillmentDefault({ invoiceID: 'i2', preference: { method: 'pickup' } })).applied).toBe(false);

    RepairInvoicesModel.findByInvoiceID.mockResolvedValueOnce({ invoiceID: 'i3', accountType: 'retail', status: 'draft' });
    expect((await applyStoreFulfillmentDefault({ invoiceID: 'i3', preference: { method: 'pickup' } })).applied).toBe(false);
  });

  it('ship quotes the store parcel and takes the cheapest rate; no rates leaves the draft alone', async () => {
    RepairInvoicesModel.findByInvoiceID.mockResolvedValue({ invoiceID: 'i4', accountType: 'wholesale', status: 'draft', customerName: 'Marlen Jewelers' });
    quoteInvoiceShipping.mockResolvedValueOnce({ rates: [{ rateId: 'r-cheap', carrier: 'FedEx', service: 'FEDEX_GROUND', rate: 9.87 }, { rateId: 'r-fast', rate: 41 }] });
    const ok = await applyStoreFulfillmentDefault({ invoiceID: 'i4', preference: { method: 'ship', parcelKey: 'fedex-small-box' } });
    expect(quoteInvoiceShipping).toHaveBeenCalledWith({ invoiceID: 'i4', parcelKey: 'fedex-small-box', saturdayDelivery: false, actor: AUTO_FULFILLMENT_ACTOR });
    expect(finalizeInvoiceFulfillment).toHaveBeenCalledWith({ invoiceID: 'i4', method: 'ship', rateId: 'r-cheap', actor: AUTO_FULFILLMENT_ACTOR });
    expect(ok).toMatchObject({ applied: true, method: 'ship', rate: { rate: 9.87 } });

    quoteInvoiceShipping.mockResolvedValueOnce({ rates: [] });
    const none = await applyStoreFulfillmentDefault({ invoiceID: 'i4', preference: { method: 'ship', parcelKey: 'fedex-small-box' } });
    expect(none).toMatchObject({ applied: false, method: 'ship', reason: 'no rates' });
  });

  it('never throws — a quoting failure is reported, not raised', async () => {
    RepairInvoicesModel.findByInvoiceID.mockResolvedValue({ invoiceID: 'i5', accountType: 'wholesale', status: 'draft' });
    quoteInvoiceShipping.mockRejectedValueOnce(new Error('ship-to: street1 is missing'));
    const r = await applyStoreFulfillmentDefault({ invoiceID: 'i5', preference: { method: 'ship', parcelKey: 'fedex-small-box' } });
    expect(r).toEqual({ applied: false, reason: 'ship-to: street1 is missing' });
  });
});
