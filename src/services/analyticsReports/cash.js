import { BUSINESS_EXPENSE_STATUS } from '@/services/businessExpenses';
import { RECURRING_EXPENSE_SOURCE_TYPE } from '@/services/recurringBusinessExpenses';
import { getDebtCashInflowTimestamp, getPaymentMethod, getPaymentTimestamp, isDebtCashInflowAccount, isMerchantCardPayment, nextBusinessDay, normalizeDateOnlyLikeValue, normalizeFinancialOpeningBalance, roundMoney, sumMoney } from './core';
import { buildFederalTaxReserveReport } from './taxReserve';
import { isDateInWindow } from './window';
export function buildBankSafeToSpendReport({
  openingBalance = null,
  invoices = [],
  payrollBatches = [],
  ownerDraws = [],
  expenses = [],
  recurringExpenses = [],
  debtAccounts = [],
  debtPayments = [],
  usersById = new Map(),
  federalTaxReserveRate = 0.30,
  now = new Date(),
} = {}) {
  const normalizedOpeningBalance = normalizeFinancialOpeningBalance(openingBalance);

  if (!normalizedOpeningBalance) {
    return {
      configured: false,
      openingBalance: null,
      summary: null,
      activity: null,
    };
  }

  const window = {
    key: 'opening_balance_to_now',
    startDate: normalizedOpeningBalance.asOfDate,
    endDate: now,
  };
  const activity = buildFederalTaxReserveReport({
    invoices,
    payrollBatches,
    ownerDraws,
    expenses,
    recurringExpenses,
    usersById,
    window,
    federalTaxReserveRate,
  });
  const summary = activity.summary || {};
  const ownerCashBurden = roundMoney(
    Number(summary.ownerOperatorPayrollPaid || 0) + Number(summary.ownerDraws || 0)
  );
  const paymentCashMovementRows = [];
  for (const invoice of invoices || []) {
    for (const payment of invoice.payments || []) {
      const timestamp = getPaymentTimestamp(payment);
      if (!timestamp || !isDateInWindow(timestamp, window)) continue;
      if (payment.status && payment.status !== 'completed') continue;

      const collectedAt = new Date(timestamp);
      const expectedDepositDate = isMerchantCardPayment(payment) ? nextBusinessDay(collectedAt) : collectedAt;
      const amount = roundMoney(payment.amount);
      paymentCashMovementRows.push({
        invoiceID: invoice.invoiceID,
        method: getPaymentMethod(payment),
        amount,
        collectedAt,
        expectedDepositDate,
        deposited: expectedDepositDate <= new Date(now),
      });
    }
  }
  const merchantPayoutPending = sumMoney(paymentCashMovementRows
    .filter((payment) => !payment.deposited)
    .map((payment) => payment.amount));
  const debtPaymentsMade = sumMoney((debtPayments || [])
    .filter((payment) => payment?.paymentDate && isDateInWindow(payment.paymentDate, window))
    .map((payment) => payment.amount));
  const debtCashInflowRows = (debtAccounts || [])
    .filter((account) => isDebtCashInflowAccount(account))
    .map((account) => ({
      debtAccountID: account.debtAccountID,
      name: account.name || account.lender || 'Debt account',
      type: account.type || '',
      lender: account.lender || '',
      date: normalizeDateOnlyLikeValue(getDebtCashInflowTimestamp(account)),
      amount: roundMoney(account.openingBalance),
    }))
    .filter((row) => row.amount > 0 && row.date && isDateInWindow(row.date, window));
  const debtCashInflows = sumMoney(debtCashInflowRows.map((row) => row.amount));
  const estimatedCashOnHand = roundMoney(
    normalizedOpeningBalance.totalOpeningCash
      + Number(summary.cashCollected || 0)
      - merchantPayoutPending
      + debtCashInflows
      - Number(summary.contractorPayrollPaid || 0)
      - ownerCashBurden
      - Number(summary.trackedExpenses || 0)
      - debtPaymentsMade
  );
  const bankSafeToSpend = roundMoney(
    normalizedOpeningBalance.totalOpeningCash
      + Number(summary.cashCollected || 0)
      - Number(summary.salesTaxHeld || 0)
      - Number(summary.contractorPayrollPaid || 0)
      - ownerCashBurden
      - Number(summary.trackedExpenses || 0)
      - Number(summary.scheduledCommittedExpenses || 0)
      - debtPaymentsMade
      - Number(summary.recommendedFederalReserve || 0)
  );

  return {
    configured: true,
    openingBalance: normalizedOpeningBalance,
    summary: {
      ...summary,
      openingCash: normalizedOpeningBalance.totalOpeningCash,
      ownerCashBurden,
      debtPaymentsMade,
      debtCashInflows,
      merchantPayoutPending,
      estimatedCashOnHand,
      bankSafeToSpend,
      calculationStartDate: normalizedOpeningBalance.asOfDate,
      calculationEndDate: now,
    },
    activity: {
      ...activity,
      debtCashInflowRows,
      paymentCashMovementRows,
    },
  };
}

export function buildExpenseReport(expenses = [], window, recurringExpenses = []) {
  const rows = expenses
    .map((expense) => ({
      ...expense,
      expenseDate: normalizeDateOnlyLikeValue(expense?.expenseDate),
      paidAt: normalizeDateOnlyLikeValue(expense?.paidAt),
    }))
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

