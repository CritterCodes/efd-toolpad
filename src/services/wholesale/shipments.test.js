import { describe, it, expect } from 'vitest';
import { buildShipments } from './shipments';

/**
 * Packages as packages: a box carrying three invoices is ONE card, and an
 * inbound box stays "in transit" until every repair in it is checked in.
 */
const inRepair = (id, tracking, over = {}) => ({
  repairID: id, description: 'ring', status: 'SHIPPED TO SHOP',
  inboundShipment: { trackingNumber: tracking, carrier: 'UPS', shippedAt: '2026-09-01T10:00:00Z' },
  ...over,
});
const outInvoice = (id, tracking, over = {}) => ({
  invoiceID: id, total: 100, paymentStatus: 'paid', repairIDs: ['r1'],
  repairSnapshots: [{ repairID: 'r1', description: 'chain' }],
  outboundShipment: { trackingNumber: tracking, carrier: 'FedEx', shippedAt: '2026-09-02T10:00:00Z' },
  ...over,
});

describe('buildShipments', () => {
  it('groups multiple invoices under ONE outbound package', () => {
    const out = buildShipments({ invoices: [outInvoice('a', 'FX1'), outInvoice('b', 'FX1'), outInvoice('c', 'FX2')] });
    expect(out).toHaveLength(2);
    const fx1 = out.find((p) => p.trackingNumber === 'FX1');
    expect(fx1.invoices.map((i) => i.invoiceID)).toEqual(['a', 'b']);
    expect(fx1.state).toBe('shipped');
  });

  it('an inbound box is in transit until EVERY repair is received', () => {
    const partial = buildShipments({ repairs: [
      inRepair('r1', '1Z', { receivedAt: '2026-09-02T00:00:00Z', status: 'READY FOR WORK' }),
      inRepair('r2', '1Z'),
    ] })[0];
    expect(partial.state).toBe('in_transit');

    const done = buildShipments({ repairs: [
      inRepair('r1', '1Z', { receivedAt: '2026-09-02T00:00:00Z', status: 'READY FOR WORK' }),
      inRepair('r2', '1Z', { receivedAt: '2026-09-02T00:00:00Z', status: 'IN PROGRESS' }),
    ] })[0];
    expect(done.state).toBe('received');
  });

  it('sorts newest shipment first and keeps directions separate on tracking collision', () => {
    const out = buildShipments({
      repairs: [inRepair('r1', 'SAME')],
      invoices: [outInvoice('a', 'SAME')],
    });
    expect(out).toHaveLength(2); // in:SAME and out:SAME never merge
    expect(new Date(out[0].shippedAt) >= new Date(out[1].shippedAt)).toBe(true);
  });

  it('ignores records without a tracking number', () => {
    expect(buildShipments({ repairs: [{ repairID: 'r', inboundShipment: {} }], invoices: [{ invoiceID: 'i' }] })).toEqual([]);
  });
});
