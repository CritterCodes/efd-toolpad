import { resolveRepairAnalyticsOrigin, ANALYTICS_ORIGIN } from '@/services/analyticsBaseline';
import { BUSINESS_EXPENSE_STATUS } from '@/services/businessExpenses';
import { RECURRING_EXPENSE_SOURCE_TYPE } from '@/services/recurringBusinessExpenses';

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

function sumMoney(values = []) {
  return roundMoney(values.reduce((sum, value) => sum + Number(value || 0), 0));
}

function getInvoiceOutstanding(invoice = {}) {
  return roundMoney(Number(invoice.remainingBalance ?? Math.max(Number(invoice.total || 0) - Number(invoice.amountPaid || 0), 0)));
}

function getPaymentTimestamp(payment = {}) {
  return payment.receivedAt || payment.createdAt || payment.syncedAt || null;
}

function isOwnerOperatorUser(user = {}) {
  return user?.compensationProfile?.isOwnerOperator === true;
}

function getExpenseCashTimestamp(expense = {}) {
  return expense.paidAt || expense.expenseDate || null;
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
  let taxableRevenue = 0;
  let nonTaxableRevenue = 0;
  let taxableEntryCount = 0;
  let nonTaxableEntryCount = 0;

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
        taxBucket.taxable += entry.apportionedTotal;
        taxableRevenue += entry.apportionedTotal;
        taxableEntryCount += 1;
      } else {
        taxBucket.nonTaxable += entry.apportionedTotal;
        nonTaxableRevenue += entry.apportionedTotal;
        nonTaxableEntryCount += 1;
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
      taxableRevenue: roundMoney(taxableRevenue),
      nonTaxableRevenue: roundMoney(nonTaxableRevenue),
      taxableEntryCount,
      nonTaxableEntryCount,
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
    taxable: roundMoney(totals.taxable + Number(row.taxable || 0)),
    taxCollected: roundMoney(totals.taxCollected + Number(row.taxCollected || 0)),
    nonTaxable: roundMoney(totals.nonTaxable + Number(row.nonTaxable || 0)),
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

function getLaborLogAnalyticsTimestamp(log = {}) {
  return log.createdAt || log.adminReviewedAt || log.updatedAt || log.weekStart || null;
}

export function buildCashCollectedReport(invoices = [], window, repairsById = new Map()) {
  const payments = [];
  const byMethod = new Map();

  for (const invoice of invoices) {
    const allocatedEntries = normalizeShareEntries(invoice, repairsById);
    const legacyShare = allocatedEntries
      .filter((entry) => entry.origin === ANALYTICS_ORIGIN.LEGACY)
      .reduce((sum, entry) => sum + Number(entry.share || 0), 0);
    const goLiveShare = allocatedEntries
      .filter((entry) => entry.origin === ANALYTICS_ORIGIN.GO_LIVE)
      .reduce((sum, entry) => sum + Number(entry.share || 0), 0);

    for (const payment of invoice.payments || []) {
      const timestamp = getPaymentTimestamp(payment);
      if (!timestamp || !isDateInWindow(timestamp, window)) continue;
      if (payment.status && payment.status !== 'completed') continue;

      const amount = Number(payment.amount || 0);
      const method = payment.type || 'other';
      const legacyAmount = roundMoney(amount * legacyShare);
      const goLiveAmount = roundMoney(amount * goLiveShare);

      payments.push({
        invoiceID: invoice.invoiceID,
        accountName: getPaymentAccountName(invoice),
        accountType: invoice.accountType || 'retail',
        method,
        amount: roundMoney(amount),
        receivedAt: timestamp,
        receivedBy: payment.receivedBy || payment.createdBy || '',
        legacyCarryoverAmount: legacyAmount,
        goLiveAmount,
      });

      byMethod.set(method, roundMoney((byMethod.get(method) || 0) + amount));
    }
  }

  const totalCollected = roundMoney(payments.reduce((sum, payment) => sum + payment.amount, 0));
  const legacyCarryoverCollected = sumMoney(payments.map((payment) => payment.legacyCarryoverAmount));
  const goLiveCollected = sumMoney(payments.map((payment) => payment.goLiveAmount));

  return {
    summary: {
      totalCollected,
      paymentCount: payments.length,
      legacyCarryoverCollected,
      goLiveCollected,
      averagePayment: payments.length ? roundMoney(totalCollected / payments.length) : 0,
      byMethod: Array.from(byMethod.entries()).map(([method, amount]) => ({ method, amount })),
    },
    rows: payments.sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt)),
  };
}

export function buildFederalTaxReserveReport({
  invoices = [],
  payrollBatches = [],
  ownerDraws = [],
  expenses = [],
  recurringExpenses = [],
  usersById = new Map(),
  window,
  federalTaxReserveRate = 0.30,
} = {}) {
  const payments = [];
  const payrollRows = [];
  const ownerDrawRows = [];
  const expenseRows = [];

  for (const invoice of invoices) {
    const invoiceTotal = Number(invoice.total || 0);
    const invoiceTaxAmount = Number(invoice.taxAmount || 0);

    for (const payment of invoice.payments || []) {
      const timestamp = getPaymentTimestamp(payment);
      if (!timestamp || !isDateInWindow(timestamp, window)) continue;
      if (payment.status && payment.status !== 'completed') continue;

      const amount = roundMoney(payment.amount || 0);
      const taxHeld = invoiceTotal > 0
        ? roundMoney(Math.min(amount / invoiceTotal, 1) * invoiceTaxAmount)
        : 0;

      payments.push({
        id: `${invoice.invoiceID}-${timestamp}-${amount}`,
        receivedAt: timestamp,
        invoiceID: invoice.invoiceID,
        accountName: getPaymentAccountName(invoice),
        accountType: invoice.accountType || 'retail',
        method: payment.type || 'other',
        amount,
        taxHeld,
        receivedBy: payment.receivedBy || payment.createdBy || '',
      });
    }
  }

  for (const batch of payrollBatches) {
    if (!batch?.paidAt || !isDateInWindow(batch.paidAt, window)) continue;

    const user = usersById.get(batch.userID) || {};
    payrollRows.push({
      id: batch.batchID,
      batchID: batch.batchID,
      paidAt: batch.paidAt,
      userID: batch.userID,
      userName: batch.userName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || batch.userID || 'Unknown user',
      isOwnerOperator: isOwnerOperatorUser(user),
      laborHours: Number(Number(batch.laborHours || 0).toFixed(2)),
      laborPay: roundMoney(batch.laborPay || 0),
      paymentMethod: batch.paymentMethod || '',
      paymentReference: batch.paymentReference || '',
      status: batch.status || '',
    });
  }

  for (const draw of ownerDraws) {
    if (draw?.status === 'void') continue;
    if (!draw?.drawDate || !isDateInWindow(draw.drawDate, window)) continue;

    ownerDrawRows.push({
      id: draw.drawID,
      drawID: draw.drawID,
      drawDate: draw.drawDate,
      userID: draw.userID || '',
      userName: draw.userName || draw.userID || 'Unknown owner',
      amount: roundMoney(draw.amount || 0),
      paymentMethod: draw.paymentMethod || '',
      paymentReference: draw.paymentReference || '',
      notes: draw.notes || '',
      status: draw.status || '',
    });
  }

  for (const expense of expenses) {
    if (!expense?.expenseDate || !isDateInWindow(expense.expenseDate, window)) continue;

    expenseRows.push({
      id: expense.expenseID,
      expenseID: expense.expenseID,
      expenseDate: expense.expenseDate,
      paidAt: expense.paidAt || null,
      vendor: expense.vendor || '',
      category: expense.category || 'Miscellaneous',
      amount: roundMoney(expense.amount || 0),
      paymentMethod: expense.paymentMethod || '',
      status: expense.status || BUSINESS_EXPENSE_STATUS.PAID,
      isDeductible: expense.isDeductible !== false,
      sourceType: expense.sourceType || RECURRING_EXPENSE_SOURCE_TYPE.MANUAL,
      sourceRecurringExpenseID: expense.sourceRecurringExpenseID || '',
      notes: expense.notes || '',
    });
  }

  const cashCollected = sumMoney(payments.map((payment) => payment.amount));
  const salesTaxHeld = sumMoney(payments.map((payment) => payment.taxHeld));
  const contractorPayrollPaid = sumMoney(
    payrollRows.filter((row) => !row.isOwnerOperator).map((row) => row.laborPay)
  );
  const ownerOperatorPayrollPaid = sumMoney(
    payrollRows.filter((row) => row.isOwnerOperator).map((row) => row.laborPay)
  );
  const paidExpenseRows = expenseRows.filter((row) => (
    row.status === BUSINESS_EXPENSE_STATUS.PAID && isDateInWindow(getExpenseCashTimestamp(row), window)
  ));
  const scheduledExpenseRows = expenseRows.filter((row) => row.status === BUSINESS_EXPENSE_STATUS.SCHEDULED);
  const plannedExpenseRows = expenseRows.filter((row) => row.status === BUSINESS_EXPENSE_STATUS.PLANNED);
  const trackedExpenses = sumMoney(paidExpenseRows.map((row) => row.amount));
  const deductibleExpenses = sumMoney(paidExpenseRows.filter((row) => row.isDeductible).map((row) => row.amount));
  const nonDeductibleExpenses = sumMoney(paidExpenseRows.filter((row) => !row.isDeductible).map((row) => row.amount));
  const scheduledCommittedExpenses = sumMoney(scheduledExpenseRows.map((row) => row.amount));
  const plannedExpenses = sumMoney(plannedExpenseRows.map((row) => row.amount));
  const ownerDrawsTotal = sumMoney(ownerDrawRows.map((row) => row.amount));
  const estimatedTaxableProfit = roundMoney(cashCollected - contractorPayrollPaid - deductibleExpenses);
  const recommendedFederalReserve = estimatedTaxableProfit > 0
    ? roundMoney(estimatedTaxableProfit * Number(federalTaxReserveRate || 0))
    : 0;
  const spendableCash = roundMoney(
    cashCollected - salesTaxHeld - contractorPayrollPaid - trackedExpenses - recommendedFederalReserve
  );
  const cashAfterOwnerDraws = roundMoney(spendableCash - ownerDrawsTotal);
  const safeToSpendAfterScheduled = roundMoney(spendableCash - scheduledCommittedExpenses);
  const recurringScheduledDueSoon = recurringExpenses.filter((expense) => (
    expense.active !== false
    && expense.nextOccurrenceDate
    && isDateInWindow(expense.nextOccurrenceDate, {
      startDate: window?.startDate,
      endDate: window?.endDate,
    })
  )).length;

  return {
    summary: {
      cashCollected,
      salesTaxHeld,
      contractorPayrollPaid,
      ownerOperatorPayrollPaid,
      trackedExpenses,
      deductibleExpenses,
      nonDeductibleExpenses,
      scheduledCommittedExpenses,
      plannedExpenses,
      ownerDraws: ownerDrawsTotal,
      estimatedTaxableProfit,
      reserveRate: Number(federalTaxReserveRate || 0),
      recommendedFederalReserve,
      spendableCash,
      safeToSpendAfterScheduled,
      cashAfterOwnerDraws,
      paymentCount: payments.length,
      contractorBatchCount: payrollRows.filter((row) => !row.isOwnerOperator).length,
      ownerOperatorBatchCount: payrollRows.filter((row) => row.isOwnerOperator).length,
      ownerDrawCount: ownerDrawRows.length,
      expenseCount: expenseRows.length,
      recurringTemplateCount: recurringExpenses.length,
      recurringScheduledDueSoon,
    },
    payments: payments.sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt)),
    payrollRows: payrollRows.sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt)),
    expenseRows: expenseRows.sort((a, b) => new Date(b.expenseDate) - new Date(a.expenseDate)),
    ownerDrawRows: ownerDrawRows.sort((a, b) => new Date(b.drawDate) - new Date(a.drawDate)),
  };
}

export function buildExpenseReport(expenses = [], window, recurringExpenses = []) {
  const rows = expenses
    .filter((expense) => expense?.expenseDate && isDateInWindow(expense.expenseDate, window))
    .map((expense) => ({
      expenseID: expense.expenseID,
      expenseDate: expense.expenseDate,
      paidAt: expense.paidAt || null,
      vendor: expense.vendor || '',
      category: expense.category || 'Miscellaneous',
      amount: roundMoney(expense.amount || 0),
      paymentMethod: expense.paymentMethod || '',
      notes: expense.notes || '',
      status: expense.status || BUSINESS_EXPENSE_STATUS.PAID,
      isDeductible: expense.isDeductible !== false,
      sourceType: expense.sourceType || RECURRING_EXPENSE_SOURCE_TYPE.MANUAL,
      sourceRecurringExpenseID: expense.sourceRecurringExpenseID || '',
    }))
    .sort((a, b) => new Date(b.expenseDate) - new Date(a.expenseDate));

  const byCategory = new Map();
  rows.forEach((row) => {
    const bucket = byCategory.get(row.category) || {
      category: row.category,
      total: 0,
      paid: 0,
      scheduled: 0,
      planned: 0,
      deductible: 0,
      nonDeductible: 0,
      recurring: 0,
      manual: 0,
      count: 0,
    };
    bucket.total = roundMoney(bucket.total + row.amount);
    if (row.status === BUSINESS_EXPENSE_STATUS.PAID) bucket.paid = roundMoney(bucket.paid + row.amount);
    else if (row.status === BUSINESS_EXPENSE_STATUS.SCHEDULED) bucket.scheduled = roundMoney(bucket.scheduled + row.amount);
    else bucket.planned = roundMoney(bucket.planned + row.amount);
    if (row.isDeductible) bucket.deductible = roundMoney(bucket.deductible + row.amount);
    else bucket.nonDeductible = roundMoney(bucket.nonDeductible + row.amount);
    if (row.sourceType === RECURRING_EXPENSE_SOURCE_TYPE.RECURRING) bucket.recurring += 1;
    else bucket.manual += 1;
    bucket.count += 1;
    byCategory.set(row.category, bucket);
  });

  const summary = rows.reduce((acc, row) => {
    acc.total = roundMoney(acc.total + row.amount);
    if (row.status === BUSINESS_EXPENSE_STATUS.PAID) acc.paid = roundMoney(acc.paid + row.amount);
    else if (row.status === BUSINESS_EXPENSE_STATUS.SCHEDULED) acc.scheduled = roundMoney(acc.scheduled + row.amount);
    else acc.planned = roundMoney(acc.planned + row.amount);
    if (row.isDeductible) acc.deductible = roundMoney(acc.deductible + row.amount);
    else acc.nonDeductible = roundMoney(acc.nonDeductible + row.amount);
    if (row.sourceType === RECURRING_EXPENSE_SOURCE_TYPE.RECURRING) acc.recurring += 1;
    else acc.manual += 1;
    acc.count += 1;
    return acc;
  }, {
    total: 0,
    paid: 0,
    scheduled: 0,
    planned: 0,
    deductible: 0,
    nonDeductible: 0,
    recurring: 0,
    manual: 0,
    count: 0,
  });

  return {
    summary: {
      ...summary,
      recurringTemplateCount: recurringExpenses.length,
      activeRecurringTemplateCount: recurringExpenses.filter((expense) => expense.active !== false).length,
    },
    rows,
    categories: Array.from(byCategory.values()).sort((a, b) => b.total - a.total),
  };
}

export function buildAccountsReceivableReport(invoices = [], referenceDate = new Date(), window = null) {
  const rows = invoices
    .filter((invoice) => isDateInWindow(invoice.createdAt, window))
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

export function buildCloseoutBottlenecksPeriodReport({
  repairs = [],
  invoicesById = new Map(),
  pendingReviewLogs = [],
  window,
}) {
  const completedUninvoiced = repairs
    .filter((repair) => repair.status === 'COMPLETED' && !repair.invoiceID)
    .map((repair) => ({
      repairID: repair.repairID,
      clientName: repair.clientName || repair.businessName || 'Unknown client',
      status: repair.status,
      completedAt: repair.completedAt || repair.updatedAt || repair.createdAt,
      totalCost: roundMoney(repair.totalCost || 0),
    }))
    .filter((repair) => isDateInWindow(repair.completedAt, window))
    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

  const readyForPickupUnpaid = repairs
    .filter((repair) => ['READY FOR PICKUP', 'READY FOR PICK-UP', 'DELIVERY BATCHED'].includes(repair.status))
    .map((repair) => {
      const invoice = repair.invoiceID ? invoicesById.get(repair.invoiceID) : null;
      const anchorDate = invoice?.createdAt || invoice?.updatedAt || repair.updatedAt || repair.completedAt || repair.createdAt;
      return {
        repairID: repair.repairID,
        clientName: repair.clientName || repair.businessName || 'Unknown client',
        status: repair.status,
        invoiceID: repair.invoiceID || '',
        remainingBalance: roundMoney(invoice ? getInvoiceOutstanding(invoice) : 0),
        anchorDate,
      };
    })
    .filter((repair) => repair.remainingBalance > 0 && isDateInWindow(repair.anchorDate, window))
    .sort((a, b) => b.remainingBalance - a.remainingBalance);

  const laborReviewBlocked = (pendingReviewLogs || [])
    .map((log) => ({
      logID: log.logID,
      repairID: log.repairID,
      jeweler: log.primaryJewelerName || 'Unknown jeweler',
      clientName: log.repair?.clientName || log.repair?.businessName || 'Unknown client',
      creditedValue: roundMoney(log.creditedValue || 0),
      createdAt: log.createdAt || log.updatedAt || log.weekStart,
      notes: log.notes || '',
    }))
    .filter((log) => isDateInWindow(log.createdAt, window));

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
  const filteredLogs = logs.filter((log) => isDateInWindow(getLaborLogAnalyticsTimestamp(log), window));
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

export function buildLaborSettlementReport({ payrollBatches = [], usersById = new Map(), window }) {
  const paidBatches = payrollBatches.filter((batch) => batch.paidAt && isDateInWindow(batch.paidAt, window));
  const byJeweler = new Map();

  for (const batch of paidBatches) {
    const userID = batch.userID || 'unassigned';
    const user = usersById.get(userID) || {};
    if (!byJeweler.has(userID)) {
      byJeweler.set(userID, {
        userID,
        userName: batch.userName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || userID,
        isOwnerOperator: user.compensationProfile?.isOwnerOperator === true,
        paidHours: 0,
        paidAmount: 0,
        paidBatchCount: 0,
        paymentMethods: new Set(),
      });
    }

    const row = byJeweler.get(userID);
    row.paidHours += Number(batch.laborHours || 0);
    row.paidAmount += Number(batch.laborPay || 0);
    row.paidBatchCount += 1;
    if (batch.paymentMethod) row.paymentMethods.add(batch.paymentMethod);
  }

  const rows = Array.from(byJeweler.values())
    .map((row) => ({
      ...row,
      paidHours: Number(row.paidHours.toFixed(2)),
      paidAmount: roundMoney(row.paidAmount),
      paymentMethods: Array.from(row.paymentMethods),
    }))
    .sort((a, b) => b.paidAmount - a.paidAmount);

  const summary = rows.reduce((acc, row) => ({
    totalPaidHours: Number((acc.totalPaidHours + row.paidHours).toFixed(2)),
    totalPaidAmount: roundMoney(acc.totalPaidAmount + row.paidAmount),
    paidBatchCount: acc.paidBatchCount + row.paidBatchCount,
    jewelers: acc.jewelers + 1,
  }), {
    totalPaidHours: 0,
    totalPaidAmount: 0,
    paidBatchCount: 0,
    jewelers: 0,
  });

  return { summary, rows };
}

export function buildWholesalePerformanceReport({ repairs = [], invoices = [], window }) {
  const rowsByStore = new Map();

  for (const repair of repairs.filter((repair) => repair.isWholesale && isDateInWindow(repair.createdAt || repair.updatedAt, window))) {
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

export function buildPayrollReport({ payrollBatches = [], usersById = new Map(), window }) {
  const rows = payrollBatches
    .filter((batch) => {
      const anchorDate = batch.paidAt || batch.weekEnd || batch.weekStart || batch.createdAt;
      return isDateInWindow(anchorDate, window);
    })
    .map((batch) => {
      const user = usersById.get(batch.userID) || {};
      return {
        batchID: batch.batchID,
        userID: batch.userID,
        userName: batch.userName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || batch.userID || 'Unknown user',
        isOwnerOperator: user.compensationProfile?.isOwnerOperator === true,
        weekStart: batch.weekStart,
        weekEnd: batch.weekEnd,
        status: batch.status || 'draft',
        laborHours: Number(Number(batch.laborHours || 0).toFixed(2)),
        laborPay: roundMoney(batch.laborPay || 0),
        repairsWorked: Number(batch.repairsWorked || 0),
        entryCount: Number(batch.entryCount || 0),
        paidAt: batch.paidAt || null,
        paymentMethod: batch.paymentMethod || '',
        paymentReference: batch.paymentReference || '',
        notes: batch.notes || '',
      };
    })
    .sort((a, b) => {
      const aDate = new Date(a.weekStart || 0).getTime();
      const bDate = new Date(b.weekStart || 0).getTime();
      return bDate - aDate;
    });

  const summary = rows.reduce((acc, row) => {
    acc.batchCount += 1;
    acc.totalHours = Number((acc.totalHours + row.laborHours).toFixed(2));
    acc.totalPay = roundMoney(acc.totalPay + row.laborPay);
    if (row.status === 'paid') {
      acc.paidCount += 1;
      acc.paidTotal = roundMoney(acc.paidTotal + row.laborPay);
    } else {
      acc.unpaidCount += 1;
      acc.unpaidTotal = roundMoney(acc.unpaidTotal + row.laborPay);
    }
    return acc;
  }, {
    batchCount: 0,
    totalHours: 0,
    totalPay: 0,
    paidCount: 0,
    unpaidCount: 0,
    paidTotal: 0,
    unpaidTotal: 0,
  });

  return { summary, rows };
}
