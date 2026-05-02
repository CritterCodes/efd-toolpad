import { resolveRepairAnalyticsOrigin, ANALYTICS_ORIGIN } from '@/services/analyticsBaseline';

export const ANALYTICS_DATE_RANGES = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '1yr': 365,
  all: Infinity,
};

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

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

export function getAnalyticsDateWindow(dateRange = '30d', now = new Date()) {
  const days = ANALYTICS_DATE_RANGES[dateRange] ?? ANALYTICS_DATE_RANGES['30d'];
  if (days === Infinity) {
    return {
      key: dateRange,
      startDate: null,
      endDate: endOfDay(now),
    };
  }

  const endDate = endOfDay(now);
  const startDate = startOfDay(now);
  startDate.setDate(startDate.getDate() - (days - 1));

  return {
    key: dateRange,
    startDate,
    endDate,
  };
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
  const completedRepairs = repairs.filter((repair) => repair.status === 'COMPLETED').length;
  const pendingRepairs = totalRepairs - completedRepairs;
  const completedWithDates = repairs.filter((repair) => (
    repair.status === 'COMPLETED' && repair.completedAt && repair.createdAt
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

function formatMonthKey(value) {
  const date = new Date(value);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${month}`;
}

function formatMonthLabel(value) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit' }).format(new Date(value));
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
    };
  });

  if (entries.length === 0) {
    return [{
      repairID: '',
      baseTotal: Number(invoice.total || 0),
      taxAmount: Number(invoice.taxAmount || 0),
      isWholesale: invoice.accountType === 'wholesale',
      origin: ANALYTICS_ORIGIN.LEGACY,
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
