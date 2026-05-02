import { describe, expect, it } from 'vitest';
import {
  buildInvoiceRevenueSummary,
  buildLaborSummary,
  filterOperationalRepairs,
  getAnalyticsDateWindow,
} from './repairAnalytics';

describe('repairAnalytics', () => {
  it('filters operational repairs to go-live by default', () => {
    const window = getAnalyticsDateWindow('30d', new Date('2026-05-30T12:00:00.000Z'));
    const repairs = [
      { repairID: 'repair-legacy', createdAt: '2026-05-15T12:00:00.000Z', analyticsOrigin: 'legacy' },
      { repairID: 'repair-go-live', createdAt: '2026-05-20T12:00:00.000Z', analyticsOrigin: 'go_live' },
    ];

    const filtered = filterOperationalRepairs(repairs, { includeLegacy: false, window });

    expect(filtered.map((repair) => repair.repairID)).toEqual(['repair-go-live']);
  });

  it('counts legacy carryover revenue when a legacy repair is invoiced after go-live', () => {
    const repairsById = new Map([
      ['repair-legacy', { repairID: 'repair-legacy', analyticsOrigin: 'legacy', isWholesale: true, createdAt: '2026-04-20T12:00:00.000Z' }],
      ['repair-go-live', { repairID: 'repair-go-live', analyticsOrigin: 'go_live', isWholesale: false, createdAt: '2026-05-10T12:00:00.000Z' }],
    ]);
    const invoices = [
      {
        invoiceID: 'rinv-1',
        createdAt: '2026-05-12T12:00:00.000Z',
        total: 60,
        taxAmount: 0,
        deliveryFee: 0,
        cashDiscountAmount: 0,
        repairIDs: ['repair-legacy', 'repair-go-live'],
        repairSnapshots: [
          { repairID: 'repair-legacy', total: 20, taxAmount: 0 },
          { repairID: 'repair-go-live', total: 40, taxAmount: 0 },
        ],
      },
    ];

    const summary = buildInvoiceRevenueSummary(invoices, repairsById);

    expect(summary.revenue.totalRevenue).toBe(60);
    expect(summary.revenue.legacyCarryoverRevenue).toBe(20);
    expect(summary.revenue.goLiveRevenue).toBe(40);
    expect(summary.revenueTrend[0]).toMatchObject({
      retail: 40,
      wholesale: 20,
      goLive: 40,
      legacy: 20,
    });
  });

  it('builds post-baseline labor totals from filtered logs', () => {
    const summary = buildLaborSummary([
      { creditedLaborHours: 1.25, creditedValue: 62.5 },
      { creditedLaborHours: 0.5, creditedValue: 25, requiresAdminReview: true },
    ]);

    expect(summary).toEqual({
      totalHours: 1.75,
      totalPay: 87.5,
      entryCount: 2,
      reviewedCount: 1,
    });
  });
});
