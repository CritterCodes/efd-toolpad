import { payrollTotal } from '@/services/payrollUtils';
import { isDateInWindow } from './window';
import { getLaborLogAnalyticsTimestamp } from './invoices';
import { CLOSED_REPAIR_STATUSES, getInvoiceOutstanding, roundMoney } from './core';
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
    byJeweler.get(userID).paidThroughPayroll += payrollTotal(batch);
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
        paidLaborAmount: 0,
        paidSalesAmount: 0,
        paidAmount: 0,
        paidBatchCount: 0,
        paymentMethods: new Set(),
      });
    }

    const row = byJeweler.get(userID);
    const salePay = Number(batch.salePay || 0);
    const laborPay = Math.max(Number(batch.laborPay || 0) - salePay, 0);
    row.paidHours += Number(batch.laborHours || 0);
    row.paidLaborAmount += laborPay;
    row.paidSalesAmount += salePay;
    row.paidAmount += Number(batch.laborPay || 0);
    row.paidBatchCount += 1;
    if (batch.paymentMethod) row.paymentMethods.add(batch.paymentMethod);
  }

  const rows = Array.from(byJeweler.values())
    .map((row) => ({
      ...row,
      paidHours: Number(row.paidHours.toFixed(2)),
      paidLaborAmount: roundMoney(row.paidLaborAmount),
      paidSalesAmount: roundMoney(row.paidSalesAmount),
      paidAmount: roundMoney(row.paidAmount),
      paymentMethods: Array.from(row.paymentMethods),
    }))
    .sort((a, b) => b.paidAmount - a.paidAmount);

  const summary = rows.reduce((acc, row) => ({
    totalPaidHours: Number((acc.totalPaidHours + row.paidHours).toFixed(2)),
    totalPaidLaborAmount: roundMoney(acc.totalPaidLaborAmount + row.paidLaborAmount),
    totalPaidSalesAmount: roundMoney(acc.totalPaidSalesAmount + row.paidSalesAmount),
    totalPaidAmount: roundMoney(acc.totalPaidAmount + row.paidAmount),
    paidBatchCount: acc.paidBatchCount + row.paidBatchCount,
    jewelers: acc.jewelers + 1,
  }), {
    totalPaidHours: 0,
    totalPaidLaborAmount: 0,
    totalPaidSalesAmount: 0,
    totalPaidAmount: 0,
    paidBatchCount: 0,
    jewelers: 0,
  });

  return { summary, rows };
}

export function buildSalesPayoutReport({ salePayouts = [], window }) {
  const rows = (salePayouts || [])
    .filter((payout) => {
      const anchorDate = payout.payrolledAt || payout.weekStart || payout.createdAt;
      return isDateInWindow(anchorDate, window);
    })
    .map((payout) => ({
      payoutID: payout.payoutID,
      invoiceID: payout.invoiceID,
      lineID: payout.lineID,
      productID: payout.productID || '',
      sellerUserID: payout.sellerUserID || '',
      sellerName: payout.sellerName || payout.sellerUserID || 'Unknown artisan',
      saleDescription: payout.saleDescription || '',
      grossSale: roundMoney(payout.grossSale || 0),
      consignmentAmount: roundMoney(payout.consignmentAmount || 0),
      actualLaborDeduction: roundMoney(payout.actualLaborDeduction || 0),
      payoutAmount: roundMoney(payout.payoutAmount || 0),
      status: payout.status || 'payable',
      payrollStatus: payout.payrollStatus || 'unbatched',
      payrollBatchID: payout.payrollBatchID || '',
      weekStart: payout.weekStart || null,
      payrolledAt: payout.payrolledAt || null,
      createdAt: payout.createdAt || null,
    }))
    .sort((a, b) => new Date(b.payrolledAt || b.weekStart || b.createdAt || 0) - new Date(a.payrolledAt || a.weekStart || a.createdAt || 0));

  const bySellerMap = new Map();
  rows.forEach((row) => {
    const key = row.sellerUserID || row.sellerName;
    const seller = bySellerMap.get(key) || {
      sellerUserID: row.sellerUserID,
      sellerName: row.sellerName,
      grossSale: 0,
      consignmentAmount: 0,
      actualLaborDeduction: 0,
      payoutAmount: 0,
      paidAmount: 0,
      unpaidAmount: 0,
      payoutCount: 0,
    };
    seller.grossSale = roundMoney(seller.grossSale + row.grossSale);
    seller.consignmentAmount = roundMoney(seller.consignmentAmount + row.consignmentAmount);
    seller.actualLaborDeduction = roundMoney(seller.actualLaborDeduction + row.actualLaborDeduction);
    seller.payoutAmount = roundMoney(seller.payoutAmount + row.payoutAmount);
    if (row.payrollStatus === 'paid') {
      seller.paidAmount = roundMoney(seller.paidAmount + row.payoutAmount);
    } else {
      seller.unpaidAmount = roundMoney(seller.unpaidAmount + row.payoutAmount);
    }
    seller.payoutCount += 1;
    bySellerMap.set(key, seller);
  });

  const summary = rows.reduce((acc, row) => {
    acc.grossSale = roundMoney(acc.grossSale + row.grossSale);
    acc.consignmentAmount = roundMoney(acc.consignmentAmount + row.consignmentAmount);
    acc.actualLaborDeduction = roundMoney(acc.actualLaborDeduction + row.actualLaborDeduction);
    acc.totalPayout = roundMoney(acc.totalPayout + row.payoutAmount);
    if (row.payrollStatus === 'paid') {
      acc.paidPayout = roundMoney(acc.paidPayout + row.payoutAmount);
      acc.paidCount += 1;
    } else {
      acc.unpaidPayout = roundMoney(acc.unpaidPayout + row.payoutAmount);
      acc.unpaidCount += 1;
    }
    acc.payoutCount += 1;
    return acc;
  }, {
    grossSale: 0,
    consignmentAmount: 0,
    actualLaborDeduction: 0,
    totalPayout: 0,
    paidPayout: 0,
    unpaidPayout: 0,
    payoutCount: 0,
    paidCount: 0,
    unpaidCount: 0,
  });

  return {
    summary,
    rows,
    bySeller: Array.from(bySellerMap.values()).sort((a, b) => b.payoutAmount - a.payoutAmount),
  };
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

