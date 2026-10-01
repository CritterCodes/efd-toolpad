import { splitBatchPay } from '@/services/payrollUtils';
import { BUSINESS_EXPENSE_STATUS } from '@/services/businessExpenses';
import { RECURRING_EXPENSE_SOURCE_TYPE } from '@/services/recurringBusinessExpenses';
import { getExpenseCashTimestamp, getPaymentAccountName, getPaymentMethod, getPaymentTimestamp, isOwnerOperatorUser, normalizeDateOnlyLikeValue, roundMoney, sumMoney } from './core';
import { isDateInWindow } from './window';
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
        method: getPaymentMethod(payment),
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
      laborPay: roundMoney(splitBatchPay(batch).laborPay),
      salePay: roundMoney(splitBatchPay(batch).salePay),
      totalPay: roundMoney(splitBatchPay(batch).totalPay),
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
    const expenseDate = normalizeDateOnlyLikeValue(expense?.expenseDate);
    const paidAt = normalizeDateOnlyLikeValue(expense?.paidAt);
    const status = expense.status || BUSINESS_EXPENSE_STATUS.PAID;
    const cashDate = status === BUSINESS_EXPENSE_STATUS.PAID
      ? paidAt || expenseDate
      : expenseDate;
    if (!cashDate || !isDateInWindow(cashDate, window)) continue;

    expenseRows.push({
      id: expense.expenseID,
      expenseID: expense.expenseID,
      expenseDate,
      paidAt: paidAt || null,
      vendor: expense.vendor || '',
      category: expense.category || 'Miscellaneous',
      amount: roundMoney(expense.amount || 0),
      paymentMethod: expense.paymentMethod || '',
      status,
      isDeductible: expense.isDeductible !== false,
      sourceType: expense.sourceType || RECURRING_EXPENSE_SOURCE_TYPE.MANUAL,
      sourceRecurringExpenseID: expense.sourceRecurringExpenseID || '',
      notes: expense.notes || '',
    });
  }

  const cashCollected = sumMoney(payments.map((payment) => payment.amount));
  const salesTaxHeld = sumMoney(payments.map((payment) => payment.taxHeld));
  const contractorLaborPayrollPaid = sumMoney(
    payrollRows.filter((row) => !row.isOwnerOperator).map((row) => row.laborPay)
  );
  const contractorSalesPayoutPaid = sumMoney(
    payrollRows.filter((row) => !row.isOwnerOperator).map((row) => row.salePay)
  );
  const contractorPayrollPaid = sumMoney(
    payrollRows.filter((row) => !row.isOwnerOperator).map((row) => row.totalPay)
  );
  const ownerOperatorLaborPayrollPaid = sumMoney(
    payrollRows.filter((row) => row.isOwnerOperator).map((row) => row.laborPay)
  );
  const ownerOperatorSalesPayoutPaid = sumMoney(
    payrollRows.filter((row) => row.isOwnerOperator).map((row) => row.salePay)
  );
  const ownerOperatorPayrollPaid = sumMoney(
    payrollRows.filter((row) => row.isOwnerOperator).map((row) => row.totalPay)
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
      contractorLaborPayrollPaid,
      contractorSalesPayoutPaid,
      ownerOperatorPayrollPaid,
      ownerOperatorLaborPayrollPaid,
      ownerOperatorSalesPayoutPaid,
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

