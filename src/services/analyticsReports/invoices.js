import { resolveRepairAnalyticsOrigin } from '@/services/analyticsBaseline';
import { ANALYTICS_ORIGIN } from '@/services/analyticsBaseline';
import { formatMonthKey, formatMonthLabel, getPaymentAccountName, getPaymentMethod, getPaymentTimestamp, roundMoney, sumMoney } from './core';
import { isDateInWindow } from './window';
export function normalizeShareEntries(invoice = {}, repairsById = new Map()) {
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
      origin: invoice.analyticsOrigin || ANALYTICS_ORIGIN.LEGACY,
      businessName: invoice.customerName || invoice.clientName || '',
      share: 1,
      apportionedTotal: roundMoney(invoice.total || 0),
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

export function normalizeSalesInvoiceForAnalytics(invoice = {}) {
  return {
    ...invoice,
    sourceType: 'sales',
    analyticsOrigin: ANALYTICS_ORIGIN.GO_LIVE,
    customerName: invoice.customerName || invoice.clientName || 'Sales client',
    accountType: invoice.accountType || 'retail',
    total: roundMoney(invoice.total || 0),
    amountPaid: roundMoney(invoice.amountPaid || 0),
    remainingBalance: roundMoney(
      invoice.remainingBalance ?? Math.max(Number(invoice.total || 0) - Number(invoice.amountPaid || 0), 0)
    ),
    payments: (invoice.payments || []).map((payment) => ({
      ...payment,
      type: getPaymentMethod(payment),
      method: getPaymentMethod(payment),
      receivedAt: payment.receivedAt || payment.collectedAt || payment.createdAt || invoice.paidAt || null,
      receivedBy: payment.receivedBy || payment.collectedBy || '',
      status: payment.status || 'completed',
    })),
  };
}

/**
 * Custom-order invoices (S7c) carry a flat `amount` and a coarse status
 * (pending_payment | paid | cancelled) with no payments[] array or tax breakdown.
 * Map them into the unified analytics-invoice shape so custom-order revenue flows
 * through the SAME reports as repairs and sales: invoiced revenue, cash collected,
 * A/R, federal-tax-reserve, and safe-to-spend.
 *
 * Notes:
 *  - `amount` is tax-INCLUSIVE; the invoice's `taxRate` (snapshot at billing) backs out
 *    the sales-tax portion: tax = amount × rate / (1 + rate). Matches the repair/sales
 *    convention where `total` is gross and tax is reported separately. Legacy/untaxed
 *    invoices carry rate 0 → all revenue, no tax.
 *  - A paid invoice synthesizes one completed payment (so cash-collected/reserve see
 *    it), timestamped at paidAt. Pending invoices contribute invoiced revenue + A/R.
 */
export function normalizeCustomInvoiceForAnalytics(invoice = {}) {
  const amount = roundMoney(invoice.amount || 0);
  const isPaid = invoice.status === 'paid';
  const amountPaid = isPaid ? amount : 0;
  const taxRate = Number(invoice.taxRate) || 0;
  const taxAmount = taxRate > 0 ? roundMoney(amount * taxRate / (1 + taxRate)) : 0;
  return {
    ...invoice,
    sourceType: 'custom',
    analyticsOrigin: ANALYTICS_ORIGIN.GO_LIVE,
    customerName: invoice.customerName || invoice.customerEmail || `Custom ${invoice.customID || ''}`.trim(),
    accountType: 'retail',
    status: isPaid ? 'paid' : 'open',
    paymentStatus: isPaid ? 'paid' : 'unpaid',
    total: amount,
    amountPaid: roundMoney(amountPaid),
    remainingBalance: roundMoney(amount - amountPaid),
    taxAmount,
    payments: isPaid
      ? [{
        type: invoice.paymentMethod || 'other',
        method: invoice.paymentMethod || 'other',
        amount,
        receivedAt: invoice.paidAt || invoice.updatedAt || invoice.createdAt || null,
        receivedBy: '',
        status: 'completed',
      }]
      : [],
  };
}

export function combineAnalyticsInvoices(repairInvoices = [], salesInvoices = [], customInvoices = []) {
  return [
    ...(repairInvoices || []),
    ...(salesInvoices || [])
      .filter((invoice) => invoice?.status !== 'void')
      .map(normalizeSalesInvoiceForAnalytics),
    ...(customInvoices || [])
      .filter((invoice) => invoice?.status !== 'cancelled')
      .map(normalizeCustomInvoiceForAnalytics),
  ];
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
    const amountPaid = Number(invoice.amountPaid || 0);
    if (amountPaid > 0) {
      collectedRevenue += amountPaid;
    } else if (invoice.paidAt) {
      collectedRevenue += Number(invoice.total || 0);
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

export function getLaborLogAnalyticsTimestamp(log = {}) {
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
      const method = getPaymentMethod(payment);
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

