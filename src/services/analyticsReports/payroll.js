import { isDateInWindow } from './window';
import { roundMoney } from './core';
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
        laborPay: roundMoney(Math.max(Number(batch.laborPay || 0) - Number(batch.salePay || 0), 0)),
        salePay: roundMoney(batch.salePay || 0),
        totalPay: roundMoney(batch.laborPay || 0),
        repairsWorked: Number(batch.repairsWorked || 0),
        salePayoutCount: Array.isArray(batch.salePayoutIDs) ? batch.salePayoutIDs.length : 0,
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
    acc.totalSalesPay = roundMoney(acc.totalSalesPay + row.salePay);
    acc.totalCombinedPay = roundMoney(acc.totalCombinedPay + row.totalPay);
    if (row.status === 'paid') {
      acc.paidCount += 1;
      acc.paidTotal = roundMoney(acc.paidTotal + row.totalPay);
      acc.paidSalesTotal = roundMoney(acc.paidSalesTotal + row.salePay);
    } else {
      acc.unpaidCount += 1;
      acc.unpaidTotal = roundMoney(acc.unpaidTotal + row.totalPay);
      acc.unpaidSalesTotal = roundMoney(acc.unpaidSalesTotal + row.salePay);
    }
    return acc;
  }, {
    batchCount: 0,
    totalHours: 0,
    totalPay: 0,
    totalSalesPay: 0,
    totalCombinedPay: 0,
    paidCount: 0,
    unpaidCount: 0,
    paidTotal: 0,
    unpaidTotal: 0,
    paidSalesTotal: 0,
    unpaidSalesTotal: 0,
  });

  return { summary, rows };
}

export function buildRepairsReport(repairs = [], window) {
  const periodRepairs = (repairs || []).filter((repair) => isDateInWindow(repair.createdAt, window));

  let totalBilled = 0;
  let zeroTotalCount = 0;
  let compRepairCount = 0;
  let includedWithSaleCount = 0;
  const statusCounts = {};
  const zeroTotalRows = [];
  const allRows = [];

  for (const repair of periodRepairs) {
    const isComp = Boolean(repair.compRepair);
    const isIncluded = Boolean(repair.includedWithSale);
    const status = repair.status || 'UNKNOWN';

    // Compute subtotal by summing the repair's line items directly.
    const tasksCost = (repair.tasks || []).reduce(
      (sum, t) => sum + Number(t.price || 0) * (Number(t.quantity) || 1), 0,
    );
    const materialsCost = (repair.materials || []).reduce(
      (sum, m) => sum + Number(m.price || 0) * (Number(m.quantity) || 1), 0,
    );
    const customCost = (repair.customLineItems || []).reduce(
      (sum, c) => sum + Number(c.price || 0) * (Number(c.quantity) || 1), 0,
    );
    const subtotal = roundMoney(tasksCost + materialsCost + customCost);
    const rushFee = Number(repair.rushFee || 0);
    const deliveryFee = Number(repair.deliveryFee || 0);
    const taxAmount = Number(repair.taxAmount || 0);
    const total = (isComp || isIncluded) ? 0 : roundMoney(subtotal + rushFee + deliveryFee + taxAmount);

    totalBilled += total;
    statusCounts[status] = (statusCounts[status] || 0) + 1;

    if (isComp) compRepairCount += 1;
    else if (isIncluded) includedWithSaleCount += 1;
    else if (total === 0) zeroTotalCount += 1;

    const row = {
      repairID: repair.repairID,
      clientName: repair.clientName || repair.businessName || '',
      status,
      createdAt: repair.createdAt,
      completedAt: repair.completedAt || null,
      totalCost: total,
      subtotal,
      rushFee,
      deliveryFee,
      taxAmount,
      compRepair: isComp,
      includedWithSale: isIncluded,
      invoiceID: repair.invoiceID || '',
      isWholesale: Boolean(repair.isWholesale),
    };

    allRows.push(row);
    if (!isComp && !isIncluded && total === 0) zeroTotalRows.push(row);
  }

  const billedRepairs = periodRepairs.filter((r) => !r.compRepair && !r.includedWithSale);
  const avgTotal = billedRepairs.length > 0 ? roundMoney(totalBilled / billedRepairs.length) : 0;

  const statusRows = Object.entries(statusCounts)
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);

  allRows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  zeroTotalRows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return {
    summary: {
      totalCount: periodRepairs.length,
      totalBilled: roundMoney(totalBilled),
      avgTotal,
      zeroTotalCount,
      compRepairCount,
      includedWithSaleCount,
    },
    statusRows,
    zeroTotalRows,
    allRows,
  };
}

