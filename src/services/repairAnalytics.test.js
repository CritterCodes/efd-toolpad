import { describe, expect, it } from 'vitest';
import {
  buildAccountsReceivableReport,
  buildBankSafeToSpendReport,
  buildCashCollectedReport,
  buildCloseoutBottlenecksPeriodReport,
  buildExpenseReport,
  buildFederalTaxReserveReport,
  buildInvoiceRevenueSummary,
  buildJewelerPerformanceReport,
  buildLaborSettlementReport,
  buildLaborSummary,
  buildSalesPayoutReport,
  buildWholesalePerformanceReport,
  combineAnalyticsInvoices,
  filterOperationalRepairs,
  getAnalyticsDateWindow,
  normalizeFinancialOpeningBalance,
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

  it('includes normalized sales invoices in revenue, cash, receivables, and tax reserve analytics', () => {
    const window = getAnalyticsDateWindow('this_month', new Date('2026-05-20T12:00:00.000Z'));
    const invoices = combineAnalyticsInvoices([], [
      {
        invoiceID: 'sinv-paid',
        clientName: 'Walk-in Client',
        status: 'open',
        paymentStatus: 'paid',
        subtotal: 100,
        taxAmount: 8.25,
        total: 108.25,
        amountPaid: 108.25,
        remainingBalance: 0,
        createdAt: '2026-05-05T12:00:00.000Z',
        paidAt: '2026-05-05T12:10:00.000Z',
        payments: [
          { method: 'card_collected', amount: 108.25, collectedAt: '2026-05-05T12:10:00.000Z', collectedBy: 'user-1' },
        ],
      },
      {
        invoiceID: 'sinv-partial',
        clientName: 'Partial Client',
        status: 'draft',
        paymentStatus: 'partial',
        subtotal: 50,
        taxAmount: 0,
        total: 50,
        amountPaid: 20,
        remainingBalance: 30,
        createdAt: '2026-05-06T12:00:00.000Z',
        payments: [
          { method: 'cash', amount: 20, collectedAt: '2026-05-06T12:10:00.000Z' },
        ],
      },
      {
        invoiceID: 'sinv-void',
        clientName: 'Void Client',
        status: 'void',
        total: 999,
        amountPaid: 999,
        createdAt: '2026-05-07T12:00:00.000Z',
        payments: [
          { method: 'cash', amount: 999, collectedAt: '2026-05-07T12:10:00.000Z' },
        ],
      },
    ]);

    const revenue = buildInvoiceRevenueSummary(invoices, new Map());
    const cash = buildCashCollectedReport(invoices, window, new Map());
    const ar = buildAccountsReceivableReport(invoices, new Date('2026-05-20T12:00:00.000Z'), window);
    const taxReserve = buildFederalTaxReserveReport({ invoices, window });

    expect(revenue.revenue).toMatchObject({
      totalRevenue: 158.25,
      goLiveRevenue: 158.25,
      legacyCarryoverRevenue: 0,
      collectedRevenue: 128.25,
      invoiceCount: 2,
    });
    expect(cash.summary.totalCollected).toBe(128.25);
    expect(cash.summary.byMethod).toEqual([
      { method: 'credit_card', amount: 108.25 },
      { method: 'cash', amount: 20 },
    ]);
    expect(ar.summary.outstandingBalance).toBe(30);
    expect(ar.rows[0]).toMatchObject({
      invoiceID: 'sinv-partial',
      accountName: 'Partial Client',
      remainingBalance: 30,
    });
    expect(taxReserve.summary.cashCollected).toBe(128.25);
    expect(taxReserve.summary.salesTaxHeld).toBe(8.25);
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
        { userID: 'user-1', userName: 'Jacob', laborHours: 1.5, laborPay: 95, salePay: 20, paidAt: '2026-05-02T13:00:00.000Z', paymentMethod: 'cash' },
        { userID: 'user-1', userName: 'Jacob', laborHours: 2, laborPay: 100, paidAt: '2026-04-20T13:00:00.000Z', paymentMethod: 'zelle' },
      ],
      usersById: new Map(),
      window,
    });

    expect(laborSettlement.summary).toMatchObject({
      totalPaidHours: 1.5,
      totalPaidLaborAmount: 75,
      totalPaidSalesAmount: 20,
      totalPaidAmount: 95,
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

  it('builds federal tax reserve totals from payments, contractor payroll, and owner draws', () => {
    const window = getAnalyticsDateWindow('this_month', new Date('2026-05-20T12:00:00.000Z'));
    const report = buildFederalTaxReserveReport({
      invoices: [
        {
          invoiceID: 'rinv-1',
          customerName: 'Client A',
          accountType: 'retail',
          total: 110,
          taxAmount: 10,
          payments: [
            { type: 'cash', amount: 55, receivedAt: '2026-05-10T12:00:00.000Z', status: 'completed' },
          ],
        },
        {
          invoiceID: 'rinv-2',
          customerName: 'Store B',
          accountType: 'wholesale',
          total: 200,
          taxAmount: 0,
          payments: [
            { type: 'zelle', amount: 100, receivedAt: '2026-05-11T12:00:00.000Z', status: 'completed' },
          ],
        },
      ],
      payrollBatches: [
        { batchID: 'pay-1', userID: 'user-1', userName: 'Contractor One', laborPay: 55, salePay: 15, laborHours: 1, paidAt: '2026-05-12T12:00:00.000Z', paymentMethod: 'zelle' },
        { batchID: 'pay-2', userID: 'user-owner', userName: 'Owner', laborPay: 30, laborHours: 0.5, paidAt: '2026-05-13T12:00:00.000Z', paymentMethod: 'cash' },
      ],
      ownerDraws: [
        { drawID: 'od-1', userID: 'user-owner', userName: 'Owner', amount: 25, drawDate: '2026-05-14T12:00:00.000Z', paymentMethod: 'cash', status: 'recorded' },
      ],
      expenses: [
        { expenseID: 'exp-1', vendor: 'Rent', category: 'Rent', amount: 20, expenseDate: '2026-05-15T12:00:00.000Z', paidAt: '2026-05-15T12:00:00.000Z', paymentMethod: 'bank_transfer', status: 'paid', isDeductible: true },
        { expenseID: 'exp-2', vendor: 'Shopify', category: 'Software', amount: 12, expenseDate: '2026-05-16T12:00:00.000Z', paymentMethod: 'bank_transfer', status: 'scheduled', isDeductible: true, sourceType: 'recurring' },
        { expenseID: 'exp-3', vendor: 'Parking', category: 'Travel / Vehicle', amount: 5, expenseDate: '2026-05-17T12:00:00.000Z', paymentMethod: 'cash', status: 'planned', isDeductible: false },
      ],
      recurringExpenses: [
        { recurringExpenseID: 'rexp-1', nextOccurrenceDate: '2026-05-16T12:00:00.000Z', active: true },
      ],
      usersById: new Map([
        ['user-1', { userID: 'user-1', compensationProfile: { isOwnerOperator: false } }],
        ['user-owner', { userID: 'user-owner', compensationProfile: { isOwnerOperator: true } }],
      ]),
      window,
      federalTaxReserveRate: 0.30,
    });

    expect(report.summary).toMatchObject({
      cashCollected: 155,
      salesTaxHeld: 5,
      contractorPayrollPaid: 55,
      contractorLaborPayrollPaid: 40,
      contractorSalesPayoutPaid: 15,
      ownerOperatorPayrollPaid: 30,
      trackedExpenses: 20,
      deductibleExpenses: 20,
      nonDeductibleExpenses: 0,
      scheduledCommittedExpenses: 12,
      plannedExpenses: 5,
      ownerDraws: 25,
      estimatedTaxableProfit: 80,
      recommendedFederalReserve: 24,
      spendableCash: 51,
      safeToSpendAfterScheduled: 39,
      cashAfterOwnerDraws: 26,
      recurringTemplateCount: 1,
      recurringScheduledDueSoon: 1,
    });
  });

  it('normalizes the financial opening balance from admin settings', () => {
    const openingBalance = normalizeFinancialOpeningBalance({
      asOfDate: '2026-05-09',
      bankBalance: '298.50',
      cashDrawerBalance: '0',
      notes: 'First clean cash start line. Older expenses retained as history.',
      updatedAt: '2026-05-09T15:00:00.000Z',
    });

    expect(openingBalance).toMatchObject({
      bankBalance: 298.50,
      cashDrawerBalance: 0,
      totalOpeningCash: 298.50,
      notes: 'First clean cash start line. Older expenses retained as history.',
      updatedAt: '2026-05-09T15:00:00.000Z',
    });
    expect(openingBalance.asOfDate).toBeInstanceOf(Date);
  });

  it('calculates bank safe-to-spend from opening cash and ignores pre-opening expenses', () => {
    const report = buildBankSafeToSpendReport({
      openingBalance: {
        asOfDate: '2026-05-09',
        bankBalance: 298.50,
        cashDrawerBalance: 0,
        notes: 'First clean cash start line. Older expenses retained as history.',
      },
      invoices: [
        {
          invoiceID: 'pre-opening-invoice',
          customerName: 'Old Client',
          total: 1000,
          taxAmount: 0,
          payments: [
            { type: 'cash', amount: 1000, receivedAt: '2026-05-08T12:00:00.000Z', status: 'completed' },
          ],
        },
        {
          invoiceID: 'post-opening-invoice',
          customerName: 'Client',
          total: 110,
          taxAmount: 10,
          payments: [
            { type: 'card', amount: 110, receivedAt: '2026-05-10T12:00:00.000Z', status: 'completed' },
          ],
        },
        {
          invoiceID: 'pending-card-invoice',
          customerName: 'Client',
          total: 45,
          taxAmount: 0,
          payments: [
            { type: 'card', amount: 45, receivedAt: '2026-05-15T12:00:00.000Z', status: 'completed' },
          ],
        },
      ],
      payrollBatches: [
        { batchID: 'pre-payroll', userID: 'contractor', userName: 'Contractor', laborPay: 999, paidAt: '2026-05-08T12:00:00.000Z' },
        { batchID: 'contractor-payroll', userID: 'contractor', userName: 'Contractor', laborPay: 25, salePay: 5, paidAt: '2026-05-10T12:00:00.000Z' },
        { batchID: 'owner-payroll', userID: 'owner', userName: 'Owner', laborPay: 30, paidAt: '2026-05-10T12:00:00.000Z' },
      ],
      ownerDraws: [
        { drawID: 'owner-draw', userID: 'owner', userName: 'Owner', amount: 40, drawDate: '2026-05-10T12:00:00.000Z', status: 'recorded' },
      ],
      expenses: [
        { expenseID: 'pre-opening-expense', vendor: 'Rent', amount: 500, expenseDate: '2026-05-08T12:00:00.000Z', paidAt: '2026-05-08T12:00:00.000Z', status: 'paid', isDeductible: true },
        { expenseID: 'post-opening-expense', vendor: 'Shipping', amount: 20, expenseDate: '2026-05-10T12:00:00.000Z', paidAt: '2026-05-10T12:00:00.000Z', status: 'paid', isDeductible: true },
        { expenseID: 'scheduled-expense', vendor: 'Software', amount: 12, expenseDate: '2026-05-11T12:00:00.000Z', status: 'scheduled', isDeductible: true },
      ],
      debtAccounts: [
        {
          debtAccountID: 'cash-app',
          name: 'Cash App borrow',
          type: 'loan',
          paymentSchedule: 'cash_app_flat_fee',
          openingBalance: 400,
          openingBalanceDate: '2026-05-10',
          active: true,
        },
        {
          debtAccountID: 'credit-card',
          name: 'Credit card',
          type: 'credit_card',
          openingBalance: 7000,
          openingBalanceDate: '2026-05-10',
          active: true,
        },
      ],
      debtPayments: [
        { debtPaymentID: 'pre-opening-debt-payment', amount: 999, paymentDate: '2026-05-08T12:00:00.000Z' },
        { debtPaymentID: 'post-opening-debt-payment', amount: 50, paymentDate: '2026-05-10T12:00:00.000Z' },
      ],
      usersById: new Map([
        ['contractor', { userID: 'contractor', compensationProfile: { isOwnerOperator: false } }],
        ['owner', { userID: 'owner', compensationProfile: { isOwnerOperator: true } }],
      ]),
      federalTaxReserveRate: 0.30,
      now: new Date('2026-05-16T12:00:00.000Z'),
    });

    expect(report.configured).toBe(true);
    expect(report.summary).toMatchObject({
      openingCash: 298.50,
      cashCollected: 155,
      salesTaxHeld: 10,
      contractorPayrollPaid: 25,
      ownerCashBurden: 70,
      trackedExpenses: 20,
      scheduledCommittedExpenses: 12,
      debtPaymentsMade: 50,
      debtCashInflows: 400,
      merchantPayoutPending: 45,
      estimatedCashOnHand: 643.50,
      recommendedFederalReserve: 33,
      bankSafeToSpend: 233.50,
    });
    expect(report.activity.debtCashInflowRows).toHaveLength(1);
    expect(report.activity.debtCashInflowRows[0]).toMatchObject({
      debtAccountID: 'cash-app',
      amount: 400,
    });
    expect(report.activity.expenseRows.map((row) => row.expenseID)).not.toContain('pre-opening-expense');
  });

  it('returns an unconfigured bank safe-to-spend result when opening balance is missing', () => {
    const report = buildBankSafeToSpendReport();

    expect(report).toMatchObject({
      configured: false,
      openingBalance: null,
      summary: null,
    });
  });

  it('tracks sales payouts by artisan and payroll status', () => {
    const window = getAnalyticsDateWindow('this_month', new Date('2026-05-20T12:00:00.000Z'));
    const report = buildSalesPayoutReport({
      salePayouts: [
        {
          payoutID: 'spay-1',
          invoiceID: 'sinv-1',
          sellerUserID: 'artisan-1',
          sellerName: 'Artisan One',
          saleDescription: 'Ring',
          grossSale: 100,
          consignmentAmount: 20,
          actualLaborDeduction: 5,
          payoutAmount: 75,
          status: 'payable',
          payrollStatus: 'paid',
          weekStart: '2026-05-04T00:00:00.000Z',
          payrolledAt: '2026-05-10T12:00:00.000Z',
        },
        {
          payoutID: 'spay-2',
          invoiceID: 'sinv-2',
          sellerUserID: 'artisan-1',
          sellerName: 'Artisan One',
          saleDescription: 'Pendant',
          grossSale: 50,
          consignmentAmount: 10,
          actualLaborDeduction: 0,
          payoutAmount: 40,
          status: 'payable',
          payrollStatus: 'unbatched',
          weekStart: '2026-05-11T00:00:00.000Z',
        },
        {
          payoutID: 'spay-old',
          invoiceID: 'sinv-old',
          sellerUserID: 'artisan-2',
          sellerName: 'Old Artisan',
          grossSale: 999,
          payoutAmount: 999,
          payrollStatus: 'paid',
          payrolledAt: '2026-04-10T12:00:00.000Z',
        },
      ],
      window,
    });

    expect(report.summary).toMatchObject({
      grossSale: 150,
      consignmentAmount: 30,
      actualLaborDeduction: 5,
      totalPayout: 115,
      paidPayout: 75,
      unpaidPayout: 40,
      payoutCount: 2,
    });
    expect(report.bySeller[0]).toMatchObject({
      sellerName: 'Artisan One',
      paidAmount: 75,
      unpaidAmount: 40,
      payoutAmount: 115,
    });
  });

  it('builds expense report totals and category breakdowns', () => {
    const window = getAnalyticsDateWindow('this_month', new Date('2026-05-20T12:00:00.000Z'));
    const report = buildExpenseReport([
      { expenseID: 'exp-1', expenseDate: '2026-05-02T12:00:00.000Z', paidAt: '2026-05-02T12:00:00.000Z', vendor: 'Adobe', category: 'Software', amount: 50, paymentMethod: 'credit_card', status: 'paid', isDeductible: true },
      { expenseID: 'exp-2', expenseDate: '2026-05-03T12:00:00.000Z', vendor: 'Insurance', category: 'Insurance', amount: 20, paymentMethod: 'bank_transfer', status: 'scheduled', isDeductible: true, sourceType: 'recurring' },
      { expenseID: 'exp-3', expenseDate: '2026-05-04T12:00:00.000Z', vendor: 'Post Office', category: 'Shipping', amount: 15, paymentMethod: 'cash', status: 'planned', isDeductible: true },
      { expenseID: 'exp-4', expenseDate: '2026-05-05T12:00:00.000Z', paidAt: '2026-05-05T12:00:00.000Z', vendor: 'Parking', category: 'Travel / Vehicle', amount: 8, paymentMethod: 'cash', status: 'paid', isDeductible: false },
      { expenseID: 'exp-old', expenseDate: '2026-04-03T12:00:00.000Z', vendor: 'Old', category: 'Software', amount: 999, paymentMethod: 'cash', isDeductible: true },
    ], window, [
      { recurringExpenseID: 'rexp-1', active: true },
      { recurringExpenseID: 'rexp-2', active: false },
    ]);

    expect(report.summary).toMatchObject({
      total: 93,
      paid: 58,
      scheduled: 20,
      planned: 15,
      deductible: 85,
      nonDeductible: 8,
      count: 4,
      recurring: 1,
      manual: 3,
      recurringTemplateCount: 2,
      activeRecurringTemplateCount: 1,
    });
    expect(report.categories[0]).toMatchObject({
      category: 'Software',
      total: 50,
    });
  });

  it('keeps date-only expenses inside the intended local month window', () => {
    const window = getAnalyticsDateWindow('this_month', new Date('2026-05-10T12:00:00.000Z'));
    const report = buildExpenseReport([
      {
        expenseID: 'may-first-expense',
        expenseDate: '2026-05-01T00:00:00.000Z',
        paidAt: '2026-05-01T00:00:00.000Z',
        vendor: 'Google Workspace',
        category: 'Software',
        amount: 26.4,
        status: 'paid',
      },
    ], window);

    expect(report.rows.map((row) => row.expenseID)).toEqual(['may-first-expense']);
    expect(report.summary.paid).toBe(26.4);
  });

  it('counts paid expenses by paid date in financial foundation math', () => {
    const window = {
      key: 'custom',
      startDate: new Date('2026-05-01T00:00:00.000Z'),
      endDate: new Date('2026-05-09T23:59:59.999Z'),
    };
    const report = buildFederalTaxReserveReport({
      invoices: [],
      expenses: [
        {
          expenseID: 'bank-withdrawal',
          vendor: 'Cash withdrawal',
          amount: 100,
          expenseDate: '2026-05-10T12:00:00.000Z',
          paidAt: '2026-05-05T12:00:00.000Z',
          status: 'paid',
          isDeductible: true,
        },
      ],
      window,
    });

    expect(report.summary.trackedExpenses).toBe(100);
    expect(report.expenseRows.map((row) => row.expenseID)).toEqual(['bank-withdrawal']);
  });
});
