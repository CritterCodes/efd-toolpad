import { describe, expect, it } from 'vitest';
import { workOrderCharge, hasOverdueInvoices, WORK_ORDER_MARKUP_RATE } from '@/services/production/artisanBilling';
import RepairLaborLogsModel from '@/app/api/repairLaborLogs/model';

describe('workOrderCharge (pure money rule)', () => {
  it('marks up labor + materials by 20%, passes shipping + gems at cost', () => {
    expect(WORK_ORDER_MARKUP_RATE).toBe(0.20);
    // (100 labor + 50 materials) × 1.2 = 180; + 15 shipping + 200 gems at cost = 395
    const c = workOrderCharge({ labor: 100, materials: 50, shipping: 15, gems: 200 });
    expect(c.markedUp).toBe(180);
    expect(c.passthrough).toBe(215);
    expect(c.total).toBe(395);
  });
  it('self-fulfilled work bills NOTHING', () => {
    const c = workOrderCharge({ labor: 100, materials: 50, shipping: 15, gems: 200, selfFulfilled: true });
    expect(c.total).toBe(0);
    expect(c.markedUp).toBe(0);
    expect(c.passthrough).toBe(0);
  });
  it('gems are never double-marked (passthrough only)', () => {
    // A 1000 gem alone: charge is exactly 1000, not 1200.
    expect(workOrderCharge({ gems: 1000 }).total).toBe(1000);
  });
  it('no shipping markup', () => {
    expect(workOrderCharge({ shipping: 100 }).total).toBe(100);
  });
  it('labor-only marks up', () => {
    expect(workOrderCharge({ labor: 100 }).total).toBe(120);
  });
});

describe('hasOverdueInvoices (pure freeze signal)', () => {
  const now = new Date('2026-07-24T00:00:00Z');
  it('true when an unpaid invoice is past due', () => {
    expect(hasOverdueInvoices([{ status: 'pending_payment', dueAt: '2026-07-20T00:00:00Z' }], now)).toBe(true);
  });
  it('false when the unpaid invoice is not yet due', () => {
    expect(hasOverdueInvoices([{ status: 'pending_payment', dueAt: '2026-07-28T00:00:00Z' }], now)).toBe(false);
  });
  it('false when the overdue invoice is already paid', () => {
    expect(hasOverdueInvoices([{ status: 'paid', dueAt: '2026-07-20T00:00:00Z' }], now)).toBe(false);
  });
  it('false on empty', () => {
    expect(hasOverdueInvoices([], now)).toBe(false);
  });
});

describe('buildUnbatchedMatch — owner-aware self-labor exclusion', () => {
  it('without ownerUserIDs: no payer filter (legacy behavior, backward-compatible)', () => {
    const match = RepairLaborLogsModel.buildUnbatchedMatch({});
    expect(match.$and).toBeUndefined();
  });
  it('with ownerUserIDs: excludes payer:self EXCEPT for owners', () => {
    const match = RepairLaborLogsModel.buildUnbatchedMatch({ ownerUserIDs: ['owner-1'] });
    expect(match.$and).toEqual([
      { $or: [{ payer: { $ne: 'self' } }, { primaryJewelerUserID: { $in: ['owner-1'] } }] },
    ]);
  });
  it('the payer clause uses $ne so pre-S2 logs (no payer field) are still included', () => {
    // $ne 'self' matches documents where the field is absent — proving backfill safety.
    const match = RepairLaborLogsModel.buildUnbatchedMatch({ ownerUserIDs: [] });
    expect(match.$and[0].$or[0]).toEqual({ payer: { $ne: 'self' } });
  });
});
