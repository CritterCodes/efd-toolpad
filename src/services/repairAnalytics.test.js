import { describe, expect, it } from 'vitest';
import {
  buildAccountsReceivableReport,
  buildCashCollectedReport,
  buildInvoiceRevenueSummary,
  buildJewelerPerformanceReport,
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

  it('builds current and previous period date windows correctly', () => {
    const thisMonth = getAnalyticsDateWindow('this_month', new Date('2026-05-20T12:00:00.000Z'));
    expect(thisMonth.startDate.getFullYear()).toBe(2026);
    expect(thisMonth.startDate.getMonth()).toBe(4);
    expect(thisMonth.startDate.getDate()).toBe(1);
    expect(thisMonth.endDate.getFullYear()).toBe(2026);
    expect(thisMonth.endDate.getMonth()).toBe(4);
    expect(thisMonth.endDate.getDate()).toBe(20);

    const thisWeek = getAnalyticsDateWindow('this_week', new Date('2026-05-20T12:00:00.000Z'));
    expect(thisWeek.startDate.getFullYear()).toBe(2026);
    expect(thisWeek.startDate.getMonth()).toBe(4);
    expect(thisWeek.startDate.getDate()).toBe(18);
    expect(thisWeek.endDate.getFullYear()).toBe(2026);
    expect(thisWeek.endDate.getMonth()).toBe(4);
    expect(thisWeek.endDate.getDate()).toBe(20);

    const lastMonth = getAnalyticsDateWindow('last_month', new Date('2026-05-20T12:00:00.000Z'));
    expect(lastMonth.startDate.getFullYear()).toBe(2026);
    expect(lastMonth.startDate.getMonth()).toBe(3);
    expect(lastMonth.startDate.getDate()).toBe(1);
    expect(lastMonth.endDate.getFullYear()).toBe(2026);
    expect(lastMonth.endDate.getMonth()).toBe(3);
    expect(lastMonth.endDate.getDate()).toBe(30);

    const lastWeek = getAnalyticsDateWindow('last_week', new Date('2026-05-20T12:00:00.000Z'));
    expect(lastWeek.startDate.getFullYear()).toBe(2026);
    expect(lastWeek.startDate.getMonth()).toBe(4);
    expect(lastWeek.startDate.getDate()).toBe(11);
    expect(lastWeek.endDate.getFullYear()).toBe(2026);
    expect(lastWeek.endDate.getMonth()).toBe(4);
    expect(lastWeek.endDate.getDate()).toBe(17);
  });

  it('builds cash collected and receivables reports from invoices', () => {
    const repairsById = new Map([
      ['repair-legacy', { repairID: 'repair-legacy', analyticsOrigin: 'legacy', createdAt: '2026-04-20T12:00:00.000Z' }],
      ['repair-go-live', { repairID: 'repair-go-live', analyticsOrigin: 'go_live', createdAt: '2026-05-10T12:00:00.000Z' }],
    ]);
    const invoices = [
      {
        invoiceID: 'rinv-1',
        customerName: 'Legacy Store',
        accountType: 'wholesale',
        total: 50,
        amountPaid: 50,
        remainingBalance: 0,
        createdAt: '2026-05-15T12:00:00.000Z',
        repairIDs: ['repair-legacy'],
        repairSnapshots: [{ repairID: 'repair-legacy', total: 50, taxAmount: 0 }],
        payments: [{ type: 'cash', amount: 50, receivedAt: '2026-05-16T12:00:00.000Z', status: 'completed' }],
      },
      {
        invoiceID: 'rinv-2',
        customerName: 'Go Live Client',
        accountType: 'retail',
        total: 80,
        amountPaid: 20,
        remainingBalance: 60,
        createdAt: '2026-05-12T12:00:00.000Z',
        repairIDs: ['repair-go-live'],
        repairSnapshots: [{ repairID: 'repair-go-live', total: 80, taxAmount: 0 }],
        payments: [{ type: 'cash', amount: 20, receivedAt: '2026-05-13T12:00:00.000Z', status: 'completed' }],
        paymentStatus: 'partial',
      },
    ];

    const cash = buildCashCollectedReport(
      invoices,
      getAnalyticsDateWindow('last_week', new Date('2026-05-20T12:00:00.000Z')),
      repairsById
    );
    const ar = buildAccountsReceivableReport(invoices, new Date('2026-05-20T12:00:00.000Z'));

    expect(cash.summary.totalCollected).toBe(70);
    expect(cash.summary.legacyCarryoverCollected).toBe(50);
    expect(ar.summary.outstandingBalance).toBe(60);
    expect(ar.rows[0]).toMatchObject({
      invoiceID: 'rinv-2',
      remainingBalance: 60,
    });
  });

  it('anchors jeweler performance to labor log creation time, not week start', () => {
    const window = getAnalyticsDateWindow('today', new Date('2026-05-02T12:00:00.000Z'));
    const report = buildJewelerPerformanceReport({
      logs: [
        {
          primaryJewelerUserID: 'user-1',
          primaryJewelerName: 'Vernon',
          repairID: 'repair-1',
          creditedLaborHours: 1.5,
          creditedValue: 75,
          createdAt: '2026-05-02T15:00:00.000Z',
          weekStart: '2026-04-27T00:00:00.000Z',
          requiresAdminReview: false,
        },
      ],
      payrollBatches: [],
      usersById: new Map(),
      window,
    });

    expect(report.summary.totalHours).toBe(1.5);
    expect(report.summary.totalPay).toBe(75);
    expect(report.rows[0]).toMatchObject({
      userName: 'Vernon',
      laborHours: 1.5,
      laborPay: 75,
      repairsWorked: 1,
    });
  });
});
