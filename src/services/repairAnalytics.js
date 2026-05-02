import { resolveRepairAnalyticsOrigin, ANALYTICS_ORIGIN } from '@/services/analyticsBaseline';

export const ANALYTICS_DATE_RANGES = {
  today: 'today',
  this_week: 'this_week',
  this_month: 'this_month',
  this_quarter: 'this_quarter',
  this_year: 'this_year',
  yesterday: 'yesterday',
  last_week: 'last_week',
  last_month: 'last_month',
  last_quarter: 'last_quarter',
  last_year: 'last_year',
  all: 'all',
  '7d': '7d',
  '30d': '30d',
  '90d': '90d',
  '1yr': '1yr',
};

export const ANALYTICS_DATE_RANGE_OPTIONS = [
  { label: 'Today', value: ANALYTICS_DATE_RANGES.today },
  { label: 'This Week', value: ANALYTICS_DATE_RANGES.this_week },
  { label: 'This Month', value: ANALYTICS_DATE_RANGES.this_month },
  { label: 'This Quarter', value: ANALYTICS_DATE_RANGES.this_quarter },
  { label: 'This Year', value: ANALYTICS_DATE_RANGES.this_year },
  { label: 'Yesterday', value: ANALYTICS_DATE_RANGES.yesterday },
  { label: 'Last Week', value: ANALYTICS_DATE_RANGES.last_week },
  { label: 'Last Month', value: ANALYTICS_DATE_RANGES.last_month },
  { label: 'Last Quarter', value: ANALYTICS_DATE_RANGES.last_quarter },
  { label: 'Last Year', value: ANALYTICS_DATE_RANGES.last_year },
  { label: 'All Time', value: ANALYTICS_DATE_RANGES.all },
];

const CLOSED_REPAIR_STATUSES = new Set([
  'COMPLETED',
  'READY FOR PICKUP',
  'READY FOR PICK-UP',
  'DELIVERY BATCHED',
  'PAID_CLOSED',
  'cancelled',
  'CANCELLED',
]);

function startOfDay(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(value) {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

function startOfWeek(value) {
  const date = startOfDay(value);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
}

function endOfWeek(value) {
  const date = startOfWeek(value);
  date.setDate(date.getDate() + 6);
  return endOfDay(date);
}

function startOfMonth(value) {
  const date = startOfDay(value);
  date.setDate(1);
  return date;
}

function endOfMonth(value) {
  const date = startOfMonth(value);
  date.setMonth(date.getMonth() + 1);
  date.setDate(0);
  return endOfDay(date);
}

function startOfQuarter(value) {
  const date = startOfDay(value);
  const quarterMonth = Math.floor(date.getMonth() / 3) * 3;
  date.setMonth(quarterMonth, 1);
  return date;
}

function endOfQuarter(value) {
  const date = startOfQuarter(value);
  date.setMonth(date.getMonth() + 3, 0);
  return endOfDay(date);
}

function startOfYear(value) {
  const date = startOfDay(value);
  date.setMonth(0, 1);
  return date;
}

function endOfYear(value) {
  const date = startOfYear(value);
  date.setMonth(11, 31);
  return endOfDay(date);
}

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function getInvoiceOutstanding(invoice = {}) {
  return roundMoney(Number(invoice.remainingBalance ?? Math.max(Number(invoice.total || 0) - Number(invoice.amountPaid || 0), 0)));
}

function getPaymentTimestamp(payment = {}) {
  return payment.receivedAt || payment.createdAt || payment.syncedAt || null;
}

function getPaymentAccountName(invoice = {}) {
  return invoice.customerName || invoice.accountID || invoice.invoiceID;
}

function getAgingBucket(daysOpen) {
  if (daysOpen <= 7) return '0-7 days';
  if (daysOpen <= 30) return '8-30 days';
  if (daysOpen <= 60) return '31-60 days';
  return '61+ days';
}

function formatMonthKey(value) {
  const date = new Date(value);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${month}`;
}

function formatMonthLabel(value) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit' }).format(new Date(value));
}

export function getAnalyticsDateWindow(dateRange = ANALYTICS_DATE_RANGES.this_month, now = new Date()) {
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  switch (dateRange) {
    case ANALYTICS_DATE_RANGES.today:
      return { key: dateRange, startDate: todayStart, endDate: todayEnd };
    case ANALYTICS_DATE_RANGES.this_week:
      return { key: dateRange, startDate: startOfWeek(todayStart), endDate: todayEnd };
    case ANALYTICS_DATE_RANGES.this_month:
      return { key: dateRange, startDate: startOfMonth(todayStart), endDate: todayEnd };
    case ANALYTICS_DATE_RANGES.this_quarter:
      return { key: dateRange, startDate: startOfQuarter(todayStart), endDate: todayEnd };
    case ANALYTICS_DATE_RANGES.this_year:
      return { key: dateRange, startDate: startOfYear(todayStart), endDate: todayEnd };
    case ANALYTICS_DATE_RANGES.yesterday: {
      const yesterday = new Date(todayStart);
      yesterday.setDate(yesterday.getDate() - 1);
      return { key: dateRange, startDate: startOfDay(yesterday), endDate: endOfDay(yesterday) };
    }
    case ANALYTICS_DATE_RANGES.last_week: {
      const thisWeekStart = startOfWeek(todayStart);
      const lastWeekEnd = new Date(thisWeekStart);
      lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
      const lastWeekStart = startOfWeek(lastWeekEnd);
      return { key: dateRange, startDate: lastWeekStart, endDate: endOfWeek(lastWeekStart) };
    }
    case ANALYTICS_DATE_RANGES.last_month: {
      const thisMonthStart = startOfMonth(todayStart);
      const lastMonthEnd = new Date(thisMonthStart);
      lastMonthEnd.setDate(0);
      return { key: dateRange, startDate: startOfMonth(lastMonthEnd), endDate: endOfMonth(lastMonthEnd) };
    }
    case ANALYTICS_DATE_RANGES.last_quarter: {
      const thisQuarterStart = startOfQuarter(todayStart);
      const lastQuarterEnd = new Date(thisQuarterStart);
      lastQuarterEnd.setDate(0);
      return { key: dateRange, startDate: startOfQuarter(lastQuarterEnd), endDate: endOfQuarter(lastQuarterEnd) };
    }
    case ANALYTICS_DATE_RANGES.last_year: {
      const lastYear = new Date(todayStart);
      lastYear.setFullYear(lastYear.getFullYear() - 1);
      return { key: dateRange, startDate: startOfYear(lastYear), endDate: endOfYear(lastYear) };
    }
    case ANALYTICS_DATE_RANGES['7d']: {
      const startDate = startOfDay(todayStart);
      startDate.setDate(startDate.getDate() - 6);
      return { key: dateRange, startDate, endDate: todayEnd };
    }
    case ANALYTICS_DATE_RANGES['30d']: {
      const startDate = startOfDay(todayStart);
      startDate.setDate(startDate.getDate() - 29);
      return { key: dateRange, startDate, endDate: todayEnd };
    }
    case ANALYTICS_DATE_RANGES['90d']: {
      const startDate = startOfDay(todayStart);
      startDate.setDate(startDate.getDate() - 89);
      return { key: dateRange, startDate, endDate: todayEnd };
    }
    case ANALYTICS_DATE_RANGES['1yr']: {
      const startDate = startOfDay(todayStart);
      startDate.setFullYear(startDate.getFullYear() - 1);
      startDate.setDate(startDate.getDate() + 1);
      return { key: dateRange, startDate, endDate: todayEnd };
    }
    case ANALYTICS_DATE_RANGES.all:
    default:
      return { key: ANALYTICS_DATE_RANGES.all, startDate: null, endDate: todayEnd };
  }
}

export function isDateInWindow(value, window) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  if (window?.startDate && date < new Date(window.startDate)) return false;
  if (window?.endDate && date > new Date(window.endDate)) return false;
  return true;
}

export function filterOperationalRepairs(repairs = [], { includeLegacy = false, window } = {}) {
  return (repairs || []).filter((repair) => {
    const origin = resolveRepairAnalyticsOrigin(repair);
    if (!includeLegacy && origin !== ANALYTICS_ORIGIN.GO_LIVE) {
      return false;
    }
    return isDateInWindow(repair.createdAt, window);
  });
}

export function buildRepairOverview(repairs = []) {
  const totalRepairs = repairs.length;
  const completedRepairs = repairs.filter((repair) => CLOSED_REPAIR_STATUSES.has(repair.status)).length;
  const pendingRepairs = totalRepairs - completedRepairs;
  const completedWithDates = repairs.filter((repair) => (
    CLOSED_REPAIR_STATUSES.has(repair.status) && repair.completedAt && repair.createdAt
  ));

  const averageCompletionDays = completedWithDates.length
    ? Number((
        completedWithDates.reduce((sum, repair) => (
          sum + ((new Date(repair.completedAt) - new Date(repair.createdAt)) / (1000 * 60 * 60 * 24))
        ), 0) / completedWithDates.length
      ).toFixed(1))
    : null;

  return {
    totalRepairs,
    completedRepairs,
    pendingRepairs,
    averageCompletionDays,
  };
}

export function buildCustomerInsights(repairs = []) {
  const clientCounts = repairs.reduce((acc, repair) => {
    const key = repair.clientName || repair.businessName || 'Unknown client';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return {
    totalClients: Object.keys(clientCounts).length,
    topClients: Object.entries(clientCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([clientName, repairCount]) => ({ clientName, repairCount })),
    recentClients: repairs
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 3)
      .map((repair) => repair.clientName || repair.businessName || 'Unknown client'),
  };
}

export function buildStatusBreakdown(repairs = []) {
  const counts = repairs.reduce((acc, repair) => {
    const status = repair.status || 'UNKNOWN';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

function normalizeShareEntries(invoice = {}, repairsById = new Map()) {
  const snapshots = Array.isArray(invoice.repairSnapshots) ? invoice.repairSnapshots : [];
  const repairIDs = Array.isArray(invoice.repairIDs) ? invoice.repairIDs : [];

  const entries = (snapshots.length > 0 ? snapshots : repairIDs.map((repairID) => ({ repairID }))).map((snapshot) => {
    const repair = repairsById.get(snapshot.repairID) || {};
    const baseTotal = Number(snapshot.total ?? repair.totalCost ?? 0) || 0;
    return {
      repairID: snapshot.repairID,
      baseTotal,
      taxAmount: Number(snapshot.taxAmount ?? 0) || 0,
      isWholesale: repair.isWholesale ?? invoice.accountType === 'wholesale',
      origin: resolveRepairAnalyticsOrigin(repair),
      businessName: repair.businessName || repair.storeName || invoice.customerName || '',
    };
  });

  if (entries.length === 0) {
    return [{
      repairID: '',
      baseTotal: Number(invoice.total || 0),
      taxAmount: Number(invoice.taxAmount || 0),
      isWholesale: invoice.accountType === 'wholesale',
      origin: ANALYTICS_ORIGIN.LEGACY,
      businessName: invoice.customerName || '',
    }];
  }

  const totalBase = entries.reduce((sum, entry) => sum + entry.baseTotal, 0);
  const count = entries.length;

  return entries.map((entry) => {
    const share = totalBase > 0 ? entry.baseTotal / totalBase : 1 / count;
    const deliveryShare = Number(invoice.deliveryFee || 0) * share;
    const discountShare = Number(invoice.cashDiscountAmount || 0) * share;
    return {
      ...entry,
      share,
      apportionedTotal: roundMoney(entry.baseTotal + deliveryShare - discountShare),
    };
  });
}

export function buildInvoiceRevenueSummary(invoices = [], repairsById = new Map()) {
  const revenueTrendMap = new Map();
  const monthlyTaxMap = new Map();

  let totalRevenue = 0;
  let legacyCarryoverRevenue = 0;
  let goLiveRevenue = 0;
  let collectedRevenue = 0;

  for (const invoice of invoices) {
    const monthKey = formatMonthKey(invoice.createdAt);
    const monthLabel = formatMonthLabel(invoice.createdAt);
    const trendBucket = revenueTrendMap.get(monthKey) || {
      month: monthLabel,
      retail: 0,
      wholesale: 0,
      goLive: 0,
      legacy: 0,
      _ts: new Date(invoice.createdAt).getTime(),
    };

    const taxBucket = monthlyTaxMap.get(monthKey) || {
      month: new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(new Date(invoice.createdAt)),
      taxable: 0,
      taxCollected: 0,
      nonTaxable: 0,
      revenue: 0,
      _ts: new Date(invoice.createdAt).getTime(),
    };

    const allocatedEntries = normalizeShareEntries(invoice, repairsById);
    for (const entry of allocatedEntries) {
      totalRevenue += entry.apportionedTotal;
      if (entry.origin === ANALYTICS_ORIGIN.GO_LIVE) {
        goLiveRevenue += entry.apportionedTotal;
        trendBucket.goLive += entry.apportionedTotal;
      } else {
        legacyCarryoverRevenue += entry.apportionedTotal;
        trendBucket.legacy += entry.apportionedTotal;
      }

      if (entry.isWholesale) {
        trendBucket.wholesale += entry.apportionedTotal;
      } else {
        trendBucket.retail += entry.apportionedTotal;
      }

      if (entry.taxAmount > 0) {
        taxBucket.taxable += 1;
      } else {
        taxBucket.nonTaxable += 1;
      }
    }

    taxBucket.taxCollected += Number(invoice.taxAmount || 0);
    taxBucket.revenue += Number(invoice.total || 0);
    if (invoice.paidAt) {
      collectedRevenue += Number(invoice.amountPaid || invoice.total || 0);
    }

    revenueTrendMap.set(monthKey, trendBucket);
    monthlyTaxMap.set(monthKey, taxBucket);
  }

  return {
    revenue: {
      totalRevenue: roundMoney(totalRevenue),
      legacyCarryoverRevenue: roundMoney(legacyCarryoverRevenue),
      goLiveRevenue: roundMoney(goLiveRevenue),
      collectedRevenue: roundMoney(collectedRevenue),
      invoiceCount: invoices.length,
      averageInvoiceTotal: invoices.length ? roundMoney(totalRevenue / invoices.length) : 0,
      highestInvoiceTotal: invoices.length
        ? roundMoney(Math.max(...invoices.map((invoice) => Number(invoice.total || 0))))
        : 0,
      lowestInvoiceTotal: invoices.length
        ? roundMoney(Math.min(...invoices.map((invoice) => Number(invoice.total || 0))))
        : 0,
    },
    revenueTrend: Array.from(revenueTrendMap.values())
      .sort((a, b) => a._ts - b._ts)
      .map(({ _ts, ...rest }) => ({
        ...rest,
        retail: roundMoney(rest.retail),
        wholesale: roundMoney(rest.wholesale),
        goLive: roundMoney(rest.goLive),
        legacy: roundMoney(rest.legacy),
      })),
    salesTax: {
      rows: Array.from(monthlyTaxMap.values())
        .sort((a, b) => a._ts - b._ts)
        .map(({ _ts, ...rest }) => ({
          ...rest,
          taxCollected: roundMoney(rest.taxCollected),
          revenue: roundMoney(rest.revenue),
        })),
    },
  };
}

export function buildSalesTaxTotals(rows = []) {
  return rows.reduce((totals, row) => ({
    taxable: totals.taxable + Number(row.taxable || 0),
    taxCollected: roundMoney(totals.taxCollected + Number(row.taxCollected || 0)),
    nonTaxable: totals.nonTaxable + Number(row.nonTaxable || 0),
    revenue: roundMoney(totals.revenue + Number(row.revenue || 0)),
  }), {
    taxable: 0,
    taxCollected: 0,
    nonTaxable: 0,
    revenue: 0,
  });
}

export function buildLaborSummary(logs = []) {
  return {
    totalHours: Number(logs.reduce((sum, log) => sum + Number(log.creditedLaborHours || 0), 0).toFixed(2)),
    totalPay: roundMoney(logs.reduce((sum, log) => sum + Number(log.creditedValue || 0), 0)),
    entryCount: logs.length,
    reviewedCount: logs.filter((log) => log.requiresAdminReview !== true).length,
  };
}

export function buildCashCollectedReport(invoices = [], window, repairsById = new Map()) {
  const payments = [];
  const byMethod = new Map();

  for (const invoice of invoices) {
    for (const payment of invoice.payments || []) {
      const timestamp = getPaymentTimestamp(payment);
      if (!timestamp || !isDateInWindow(timestamp, window)) continue;
      if (payment.status && payment.status !== 'completed') continue;

      const amount = Number(payment.amount || 0);
      const method = payment.type || 'other';
      const allocatedEntries = normalizeShareEntries(invoice, repairsById);
      const hasLegacy = allocatedEntries.some((entry) => entry.origin === ANALYTICS_ORIGIN.LEGACY);

      payments.push({
        invoiceID: invoice.invoiceID,
        accountName: getPaymentAccountName(invoice),
        accountType: invoice.accountType || 'retail',
        method,
        amount: roundMoney(amount),
        receivedAt: timestamp,
        receivedBy: payment.receivedBy || payment.createdBy || '',
        legacyCarryover: hasLegacy,
      });

      byMethod.set(method, roundMoney((byMethod.get(method) || 0) + amount));
    }
  }

  const totalCollected = roundMoney(payments.reduce((sum, payment) => sum + payment.amount, 0));
  const legacyCarryoverCollected = roundMoney(
    payments.filter((payment) => payment.legacyCarryover).reduce((sum, payment) => sum + payment.amount, 0)
  );

  return {
    summary: {
      totalCollected,
      paymentCount: payments.length,
      legacyCarryoverCollected,
      averagePayment: payments.length ? roundMoney(totalCollected / payments.length) : 0,
      byMethod: Array.from(byMethod.entries()).map(([method, amount]) => ({ method, amount })),
    },
    rows: payments.sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt)),
  };
}

export function buildAccountsReceivableReport(invoices = [], referenceDate = new Date()) {
  const rows = invoices
    .filter((invoice) => getInvoiceOutstanding(invoice) > 0)
    .map((invoice) => {
      const outstanding = getInvoiceOutstanding(invoice);
      const createdAt = invoice.createdAt ? new Date(invoice.createdAt) : new Date();
      const daysOpen = Math.max(Math.floor((endOfDay(referenceDate) - createdAt) / (1000 * 60 * 60 * 24)), 0);
      return {
        invoiceID: invoice.invoiceID,
        accountName: getPaymentAccountName(invoice),
        accountType: invoice.accountType || 'retail',
        status: invoice.status || 'draft',
        paymentStatus: invoice.paymentStatus || 'unpaid',
        total: roundMoney(invoice.total || 0),
        amountPaid: roundMoney(invoice.amountPaid || 0),
        remainingBalance: outstanding,
        createdAt,
        paidAt: invoice.paidAt || null,
        daysOpen,
        agingBucket: getAgingBucket(daysOpen),
      };
    })
    .sort((a, b) => b.remainingBalance - a.remainingBalance);

  const summary = rows.reduce((acc, row) => {
    acc.outstandingBalance = roundMoney(acc.outstandingBalance + row.remainingBalance);
    acc.invoiceCount += 1;
    if (row.daysOpen > 30) acc.overdueCount += 1;
    if (row.accountType === 'wholesale') acc.wholesaleOutstanding = roundMoney(acc.wholesaleOutstanding + row.remainingBalance);
    else acc.retailOutstanding = roundMoney(acc.retailOutstanding + row.remainingBalance);
    acc.buckets[row.agingBucket] = roundMoney((acc.buckets[row.agingBucket] || 0) + row.remainingBalance);
    return acc;
  }, {
    outstandingBalance: 0,
    wholesaleOutstanding: 0,
    retailOutstanding: 0,
    invoiceCount: 0,
    overdueCount: 0,
    buckets: {},
  });

  return { summary, rows };
}

export function buildCloseoutBottlenecksReport(repairs = [], invoicesById = new Map(), pendingReviewLogs = []) {
  const completedUninvoiced = repairs
    .filter((repair) => repair.status === 'COMPLETED' && !repair.invoiceID)
    .map((repair) => ({
      repairID: repair.repairID,
      clientName: repair.clientName || repair.businessName || 'Unknown client',
      status: repair.status,
      completedAt: repair.completedAt || repair.updatedAt || repair.createdAt,
      totalCost: roundMoney(repair.totalCost || 0),
    }))
    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

  const readyForPickupUnpaid = repairs
    .filter((repair) => ['READY FOR PICKUP', 'READY FOR PICK-UP', 'DELIVERY BATCHED'].includes(repair.status))
    .map((repair) => {
      const invoice = repair.invoiceID ? invoicesById.get(repair.invoiceID) : null;
      return {
        repairID: repair.repairID,
        clientName: repair.clientName || repair.businessName || 'Unknown client',
        status: repair.status,
        invoiceID: repair.invoiceID || '',
        remainingBalance: roundMoney(invoice ? getInvoiceOutstanding(invoice) : 0),
      };
    })
    .filter((repair) => repair.remainingBalance > 0)
    .sort((a, b) => b.remainingBalance - a.remainingBalance);

  const laborReviewBlocked = (pendingReviewLogs || []).map((log) => ({
    logID: log.logID,
    repairID: log.repairID,
    jeweler: log.primaryJewelerName || 'Unknown jeweler',
    clientName: log.repair?.clientName || log.repair?.businessName || 'Unknown client',
    creditedValue: roundMoney(log.creditedValue || 0),
    createdAt: log.createdAt,
    notes: log.notes || '',
  }));

  return {
    summary: {
      completedUninvoicedCount: completedUninvoiced.length,
      readyForPickupUnpaidCount: readyForPickupUnpaid.length,
      laborReviewBlockedCount: laborReviewBlocked.length,
    },
    completedUninvoiced,
    readyForPickupUnpaid,
    laborReviewBlocked,
  };
}

export function buildJewelerPerformanceReport({ logs = [], payrollBatches = [], usersById = new Map(), window }) {
  const filteredLogs = logs.filter((log) => isDateInWindow(log.weekStart || log.createdAt, window));
  const paidBatches = payrollBatches.filter((batch) => batch.paidAt && isDateInWindow(batch.paidAt, window));
  const byJeweler = new Map();

  for (const log of filteredLogs) {
    const userID = log.primaryJewelerUserID || 'unassigned';
    if (!byJeweler.has(userID)) {
      const user = usersById.get(userID) || {};
      byJeweler.set(userID, {
        userID,
        userName: log.primaryJewelerName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || userID,
        isOwnerOperator: user.compensationProfile?.isOwnerOperator === true,
        laborHours: 0,
        laborPay: 0,
        entryCount: 0,
        reviewedCount: 0,
        pendingReviewCount: 0,
        repairIDs: new Set(),
        paidThroughPayroll: 0,
      });
    }

    const row = byJeweler.get(userID);
    row.laborHours += Number(log.creditedLaborHours || 0);
    row.laborPay += Number(log.creditedValue || 0);
    row.entryCount += 1;
    row.repairIDs.add(log.repairID);
    if (log.requiresAdminReview === true && !log.adminReviewedAt) row.pendingReviewCount += 1;
    else row.reviewedCount += 1;
  }

  for (const batch of paidBatches) {
    const userID = batch.userID || 'unassigned';
    if (!byJeweler.has(userID)) {
      const user = usersById.get(userID) || {};
      byJeweler.set(userID, {
        userID,
        userName: batch.userName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || userID,
        isOwnerOperator: user.compensationProfile?.isOwnerOperator === true,
        laborHours: 0,
        laborPay: 0,
        entryCount: 0,
        reviewedCount: 0,
        pendingReviewCount: 0,
        repairIDs: new Set(),
        paidThroughPayroll: 0,
      });
    }
    byJeweler.get(userID).paidThroughPayroll += Number(batch.laborPay || 0);
  }

  const rows = Array.from(byJeweler.values())
    .map((row) => ({
      ...row,
      laborHours: Number(row.laborHours.toFixed(2)),
      laborPay: roundMoney(row.laborPay),
      repairsWorked: row.repairIDs.size,
      avgPayPerRepair: row.repairIDs.size ? roundMoney(row.laborPay / row.repairIDs.size) : 0,
      avgHoursPerRepair: row.repairIDs.size ? Number((row.laborHours / row.repairIDs.size).toFixed(2)) : 0,
      paidThroughPayroll: roundMoney(row.paidThroughPayroll),
    }))
    .sort((a, b) => b.laborPay - a.laborPay);

  const summary = rows.reduce((acc, row) => ({
    totalHours: Number((acc.totalHours + row.laborHours).toFixed(2)),
    totalPay: roundMoney(acc.totalPay + row.laborPay),
    payrollPaid: roundMoney(acc.payrollPaid + row.paidThroughPayroll),
    jewelers: acc.jewelers + 1,
    pendingReviewCount: acc.pendingReviewCount + row.pendingReviewCount,
  }), {
    totalHours: 0,
    totalPay: 0,
    payrollPaid: 0,
    jewelers: 0,
    pendingReviewCount: 0,
  });

  return { summary, rows };
}

export function buildWholesalePerformanceReport({ repairs = [], invoices = [], window }) {
  const rowsByStore = new Map();

  for (const repair of repairs.filter((repair) => repair.isWholesale)) {
    const key = repair.storeId || repair.businessName || repair.userID || repair.repairID;
    if (!rowsByStore.has(key)) {
      rowsByStore.set(key, {
        storeKey: key,
        storeName: repair.businessName || repair.storeName || 'Unnamed wholesale account',
        activeRepairs: 0,
        pendingPickup: 0,
        revenue: 0,
        unpaidBalance: 0,
        invoiceCount: 0,
      });
    }

    const row = rowsByStore.get(key);
    if (!CLOSED_REPAIR_STATUSES.has(repair.status)) row.activeRepairs += 1;
    if (repair.status === 'PENDING PICKUP' || repair.status === 'PICKUP_REQUESTED') row.pendingPickup += 1;
  }

  for (const invoice of invoices.filter((invoice) => invoice.accountType === 'wholesale' && isDateInWindow(invoice.createdAt, window))) {
    const key = invoice.storeId || invoice.accountID || invoice.customerName || invoice.invoiceID;
    if (!rowsByStore.has(key)) {
      rowsByStore.set(key, {
        storeKey: key,
        storeName: invoice.customerName || 'Unnamed wholesale account',
        activeRepairs: 0,
        pendingPickup: 0,
        revenue: 0,
        unpaidBalance: 0,
        invoiceCount: 0,
      });
    }
    const row = rowsByStore.get(key);
    row.revenue = roundMoney(row.revenue + Number(invoice.total || 0));
    row.unpaidBalance = roundMoney(row.unpaidBalance + getInvoiceOutstanding(invoice));
    row.invoiceCount += 1;
  }

  const rows = Array.from(rowsByStore.values()).sort((a, b) => b.revenue - a.revenue);
  const summary = rows.reduce((acc, row) => ({
    stores: acc.stores + 1,
    revenue: roundMoney(acc.revenue + row.revenue),
    unpaidBalance: roundMoney(acc.unpaidBalance + row.unpaidBalance),
    pendingPickup: acc.pendingPickup + row.pendingPickup,
    activeRepairs: acc.activeRepairs + row.activeRepairs,
  }), {
    stores: 0,
    revenue: 0,
    unpaidBalance: 0,
    pendingPickup: 0,
    activeRepairs: 0,
  });

  return { summary, rows };
}
