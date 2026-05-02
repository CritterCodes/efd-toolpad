import { describe, expect, it } from 'vitest';
import {
  buildAccountsReceivableReport,
  buildCashCollectedReport,
  buildCloseoutBottlenecksPeriodReport,
  buildInvoiceRevenueSummary,
  buildJewelerPerformanceReport,
  buildLaborSettlementReport,
  buildLaborSummary,
  buildWholesalePerformanceReport,
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
    expect(summary.revenue.taxableRevenue).toBe(0);
    expect(summary.revenue.nonTaxableRevenue).toBe(60);
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
      {
        invoiceID: 'rinv-3',
        customerName: 'Mixed Invoice',
        accountType: 'wholesale',
        total: 100,
        amountPaid: 100,
        remainingBalance: 0,
        createdAt: '2026-05-14T12:00:00.000Z',
        repairIDs: ['repair-legacy', 'repair-go-live'],
        repairSnapshots: [
          { repairID: 'repair-legacy', total: 25, taxAmount: 0 },
          { repairID: 'repair-go-live', total: 75, taxAmount: 0 },
        ],
        payments: [{ type: 'cash', amount: 100, receivedAt: '2026-05-14T12:00:00.000Z', status: 'completed' }],
      },
    ];

    const cash = buildCashCollectedReport(
      invoices,
      getAnalyticsDateWindow('last_week', new Date('2026-05-20T12:00:00.000Z')),
      repairsById
    );
    const ar = buildAccountsReceivableReport(
      invoices,
      new Date('2026-05-20T12:00:00.000Z'),
      getAnalyticsDateWindow('last_week', new Date('2026-05-20T12:00:00.000Z'))
    );

    expect(cash.summary.totalCollected).toBe(170);
    expect(cash.summary.legacyCarryoverCollected).toBe(75);
    expect(cash.summary.goLiveCollected).toBe(95);
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

  it('scopes closeout, payroll settlement, and wholesale reports to the selected period', () => {
    const window = getAnalyticsDateWindow('today', new Date('2026-05-02T12:00:00.000Z'));

    const closeout = buildCloseoutBottlenecksPeriodReport({
      repairs: [
        { repairID: 'repair-today', status: 'COMPLETED', completedAt: '2026-05-02T13:00:00.000Z', totalCost: 40 },
        { repairID: 'repair-old', status: 'COMPLETED', completedAt: '2026-04-20T13:00:00.000Z', totalCost: 60 },
        { repairID: 'pickup-today', status: 'READY FOR PICKUP', updatedAt: '2026-05-02T13:00:00.000Z', invoiceID: 'rinv-p1' },
        { repairID: 'pickup-old', status: 'READY FOR PICKUP', updatedAt: '2026-04-20T13:00:00.000Z', invoiceID: 'rinv-p2' },
      ],
      invoicesById: new Map([
        ['rinv-p1', { invoiceID: 'rinv-p1', total: 40, amountPaid: 0, remainingBalance: 40, createdAt: '2026-05-02T13:00:00.000Z' }],
        ['rinv-p2', { invoiceID: 'rinv-p2', total: 50, amountPaid: 0, remainingBalance: 50, createdAt: '2026-04-20T13:00:00.000Z' }],
      ]),
      pendingReviewLogs: [
        { logID: 'log-today', repairID: 'repair-today', primaryJewelerName: 'Jacob', creditedValue: 25, createdAt: '2026-05-02T13:00:00.000Z', repair: {} },
        { logID: 'log-old', repairID: 'repair-old', primaryJewelerName: 'Jacob', creditedValue: 30, createdAt: '2026-04-20T13:00:00.000Z', repair: {} },
      ],
      window,
    });

    expect(closeout.summary).toMatchObject({
      completedUninvoicedCount: 1,
      readyForPickupUnpaidCount: 1,
      laborReviewBlockedCount: 1,
    });

    const laborSettlement = buildLaborSettlementReport({
      payrollBatches: [
        { userID: 'user-1', userName: 'Jacob', laborHours: 1.5, laborPay: 75, paidAt: '2026-05-02T13:00:00.000Z', paymentMethod: 'cash' },
        { userID: 'user-1', userName: 'Jacob', laborHours: 2, laborPay: 100, paidAt: '2026-04-20T13:00:00.000Z', paymentMethod: 'zelle' },
      ],
      usersById: new Map(),
      window,
    });

    expect(laborSettlement.summary).toMatchObject({
      totalPaidHours: 1.5,
      totalPaidAmount: 75,
      paidBatchCount: 1,
    });

    const wholesale = buildWholesalePerformanceReport({
      repairs: [
        { repairID: 'w-today', isWholesale: true, businessName: 'Store A', createdAt: '2026-05-02T13:00:00.000Z', status: 'PENDING PICKUP' },
        { repairID: 'w-old', isWholesale: true, businessName: 'Store A', createdAt: '2026-04-20T13:00:00.000Z', status: 'PENDING PICKUP' },
      ],
      invoices: [
        { invoiceID: 'w-inv-today', accountType: 'wholesale', customerName: 'Store A', total: 100, remainingBalance: 20, createdAt: '2026-05-02T13:00:00.000Z' },
        { invoiceID: 'w-inv-old', accountType: 'wholesale', customerName: 'Store A', total: 200, remainingBalance: 30, createdAt: '2026-04-20T13:00:00.000Z' },
      ],
      window,
    });

    expect(wholesale.summary).toMatchObject({
      revenue: 100,
      unpaidBalance: 20,
      pendingPickup: 1,
      activeRepairs: 1,
    });
  });
});
