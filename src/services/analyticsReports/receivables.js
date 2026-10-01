import { isDateInWindow } from './window';
import { endOfDay, getAgingBucket, getInvoiceOutstanding, getPaymentAccountName, roundMoney } from './core';
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

