import {
  DEBT_PAYMENT_SCHEDULES,
  normalizeDebtDateOnlyLikeValue,
  normalizeDebtPaymentSchedule,
  normalizeMoney,
} from './debtAccounts';
import { isDateInWindow } from './repairAnalytics';

function sortByDateDesc(rows, field) {
  return [...(rows || [])].sort((a, b) => (
    new Date(normalizeDebtDateOnlyLikeValue(b[field]) || 0) - new Date(normalizeDebtDateOnlyLikeValue(a[field]) || 0)
  ));
}

function addMonths(date, months) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function resolveSchedule(account = {}) {
  if (account.paymentSchedule) return normalizeDebtPaymentSchedule(account.paymentSchedule);
  if (account.monthlyDueDay || account.dueDay) return DEBT_PAYMENT_SCHEDULES.MONTHLY;
  if (account.nextPaymentDate || account.nextDueDate) return DEBT_PAYMENT_SCHEDULES.ONE_TIME;
  return DEBT_PAYMENT_SCHEDULES.NONE;
}

function getMonthlyDueDate(year, month, dueDay) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(Number(dueDay), lastDay), 12, 0, 0, 0);
}

function buildPaymentOccurrences({
  account = {},
  latestStatement = null,
  payments = [],
  upcomingWindow = {},
  referenceDate = new Date(),
  amount = 0,
}) {
  if (account.active === false || !(amount > 0)) return [];

  const schedule = resolveSchedule(account);
  const start = new Date(upcomingWindow.startDate || referenceDate);
  const end = new Date(upcomingWindow.endDate || addMonths(referenceDate, 1));
  const occurrences = [];

  if (schedule === DEBT_PAYMENT_SCHEDULES.NONE && !latestStatement?.dueDate) return occurrences;

  if (schedule === DEBT_PAYMENT_SCHEDULES.ONE_TIME || (schedule === DEBT_PAYMENT_SCHEDULES.NONE && latestStatement?.dueDate)) {
    const date = normalizeDebtDateOnlyLikeValue(latestStatement?.dueDate || account.nextPaymentDate || account.nextDueDate);
    if (date && isDateInWindow(date, upcomingWindow)) {
      occurrences.push({ dueDate: new Date(date), amount });
    }
    return occurrences;
  }

  if (schedule === DEBT_PAYMENT_SCHEDULES.WEEKLY) {
    let date = new Date(normalizeDebtDateOnlyLikeValue(account.nextPaymentDate || account.nextDueDate || latestStatement?.dueDate) || start);
    while (date < start) date = addDays(date, 7);
    while (date <= end) {
      occurrences.push({ dueDate: new Date(date), amount });
      date = addDays(date, 7);
    }
    return occurrences;
  }

  if (schedule === DEBT_PAYMENT_SCHEDULES.CASH_APP_FLAT_FEE) {
    const installmentCount = Number(account.installmentCount || 6);
    const flatFeeAmount = normalizeMoney(account.flatFeeAmount);
    const principalTotal = normalizeMoney(latestStatement?.balance ?? account.openingBalance ?? 0);
    const scheduledTotal = normalizeMoney(principalTotal + flatFeeAmount);
    const installmentAmount = amount > 0 ? amount : normalizeMoney(scheduledTotal / installmentCount);
    const principalPerPayment = normalizeMoney(principalTotal / installmentCount);
    const feePerPayment = normalizeMoney(flatFeeAmount / installmentCount);
    const firstPaymentDate = normalizeDebtDateOnlyLikeValue(account.nextPaymentDate || account.nextDueDate || latestStatement?.dueDate) || referenceDate;
    const paidCount = (payments || []).filter((payment) => (
      payment.debtAccountID === account.debtAccountID
      && payment.paymentDate
      && new Date(normalizeDebtDateOnlyLikeValue(payment.paymentDate)) < new Date(firstPaymentDate)
    )).length;

    for (let index = paidCount; index < installmentCount; index += 1) {
      const dueDate = addDays(new Date(firstPaymentDate), index * 7);
      if (isDateInWindow(dueDate, upcomingWindow)) {
        occurrences.push({
          dueDate,
          amount: installmentAmount,
          principalAmount: principalPerPayment,
          feeAmount: feePerPayment,
        });
      }
    }
    return occurrences;
  }

  if (schedule === DEBT_PAYMENT_SCHEDULES.MONTHLY) {
    const dueDay = account.monthlyDueDay || account.dueDay || (latestStatement?.dueDate ? new Date(normalizeDebtDateOnlyLikeValue(latestStatement.dueDate)).getDate() : null);
    if (!dueDay) return occurrences;

    let cursor = getMonthlyDueDate(start.getFullYear(), start.getMonth(), dueDay);
    if (cursor < start) cursor = getMonthlyDueDate(addMonths(cursor, 1).getFullYear(), addMonths(cursor, 1).getMonth(), dueDay);
    while (cursor <= end) {
      occurrences.push({ dueDate: new Date(cursor), amount });
      const nextMonth = addMonths(cursor, 1);
      cursor = getMonthlyDueDate(nextMonth.getFullYear(), nextMonth.getMonth(), dueDay);
    }
  }

  return occurrences;
}

function resolveUpcomingWindow(window = {}, referenceDate = new Date()) {
  if (window?.startDate || window?.endDate) {
    return {
      startDate: window.startDate || referenceDate,
      endDate: window.endDate || addMonths(referenceDate, 1),
    };
  }

  return {
    startDate: referenceDate,
    endDate: addMonths(referenceDate, 1),
  };
}

export function buildDebtFoundationReport({
  accounts = [],
  statements = [],
  payments = [],
  window = {},
  referenceDate = new Date(),
} = {}) {
  const statementsByAccount = new Map();
  const paymentsByAccount = new Map();

  for (const statement of statements || []) {
    const list = statementsByAccount.get(statement.debtAccountID) || [];
    list.push(statement);
    statementsByAccount.set(statement.debtAccountID, list);
  }

  for (const payment of payments || []) {
    const list = paymentsByAccount.get(payment.debtAccountID) || [];
    list.push(payment);
    paymentsByAccount.set(payment.debtAccountID, list);
  }

  const upcomingWindow = resolveUpcomingWindow(window, referenceDate);
  const accountRows = (accounts || []).map((account) => {
    const accountStatements = sortByDateDesc(statementsByAccount.get(account.debtAccountID) || [], 'statementDate');
    const latestStatement = accountStatements[0] || null;
    const accountPayments = paymentsByAccount.get(account.debtAccountID) || [];
    const balanceDate = normalizeDebtDateOnlyLikeValue(latestStatement?.statementDate || account.openingBalanceDate || account.createdAt);
    const principalPaymentsAfterBalance = accountPayments
      .filter((payment) => balanceDate && new Date(normalizeDebtDateOnlyLikeValue(payment.paymentDate)) > new Date(balanceDate))
      .reduce((sum, payment) => sum + Number(payment.principalAmount || 0), 0);
    const feePaymentsAfterBalance = accountPayments
      .filter((payment) => balanceDate && new Date(normalizeDebtDateOnlyLikeValue(payment.paymentDate)) > new Date(balanceDate))
      .reduce((sum, payment) => sum + Number(payment.feeAmount || 0), 0);
    const totalPaymentsAfterBalance = accountPayments
      .filter((payment) => balanceDate && new Date(normalizeDebtDateOnlyLikeValue(payment.paymentDate)) > new Date(balanceDate))
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const currentBalance = normalizeMoney(
      Number(latestStatement?.balance ?? account.openingBalance ?? 0) - principalPaymentsAfterBalance
    );
    const schedule = resolveSchedule(account);
    const scheduledPrincipal = normalizeMoney(latestStatement?.balance ?? account.openingBalance ?? 0);
    const scheduledFlatFee = normalizeMoney(account.flatFeeAmount);
    const principalRemaining = Math.max(currentBalance, 0);
    const feeRemaining = schedule === DEBT_PAYMENT_SCHEDULES.CASH_APP_FLAT_FEE
      ? Math.max(normalizeMoney(scheduledFlatFee - feePaymentsAfterBalance), 0)
      : 0;
    const payoffBalance = schedule === DEBT_PAYMENT_SCHEDULES.CASH_APP_FLAT_FEE
      ? Math.max(normalizeMoney(scheduledPrincipal + scheduledFlatFee - totalPaymentsAfterBalance), 0)
      : principalRemaining;
    const scheduleInstallmentCount = Number(account.installmentCount || 6);
    const minimumPaymentDue = schedule === DEBT_PAYMENT_SCHEDULES.CASH_APP_FLAT_FEE
      ? normalizeMoney((scheduledPrincipal + scheduledFlatFee) / scheduleInstallmentCount)
      : normalizeMoney(latestStatement?.minimumPaymentDue ?? account.minimumPayment ?? 0);
    const upcomingOccurrences = buildPaymentOccurrences({
      account,
      latestStatement,
      payments: accountPayments,
      upcomingWindow,
      referenceDate,
      amount: minimumPaymentDue,
    });
    const upcomingPaymentAmount = normalizeMoney(upcomingOccurrences.reduce((sum, row) => sum + Number(row.amount || 0), 0));
    const upcomingPrincipalAmount = normalizeMoney(upcomingOccurrences.reduce((sum, row) => sum + Number(row.principalAmount || row.amount || 0), 0));
    const upcomingFeeAmount = normalizeMoney(upcomingOccurrences.reduce((sum, row) => sum + Number(row.feeAmount || 0), 0));
    const nextDueDate = upcomingOccurrences[0]?.dueDate || normalizeDebtDateOnlyLikeValue(latestStatement?.dueDate || account.nextPaymentDate || account.nextDueDate) || null;

    return {
      debtAccountID: account.debtAccountID,
      name: account.name,
      type: account.type,
      lender: account.lender,
      active: account.active !== false,
      paymentSchedule: schedule,
      interestRateAPR: account.interestRateAPR ?? null,
      currentBalance: Math.max(currentBalance, 0),
      principalRemaining,
      feeRemaining,
      payoffBalance,
      balanceDate,
      minimumPaymentDue,
      nextDueDate,
      upcomingPaymentCount: upcomingOccurrences.length,
      upcomingOccurrences,
      upcomingPaymentAmount,
      upcomingPrincipalAmount,
      upcomingFeeAmount,
      latestStatementID: latestStatement?.debtStatementID || '',
      notes: account.notes || '',
    };
  }).sort((a, b) => b.payoffBalance - a.payoffBalance);

  const statementRows = sortByDateDesc(statements, 'statementDate').map((statement) => {
    const account = accounts.find((row) => row.debtAccountID === statement.debtAccountID) || {};
    return {
      ...statement,
      statementDate: normalizeDebtDateOnlyLikeValue(statement.statementDate),
      dueDate: normalizeDebtDateOnlyLikeValue(statement.dueDate),
      accountName: account.name || statement.debtAccountID,
      debtCost: normalizeMoney(Number(statement.interestCharged || 0) + Number(statement.feesCharged || 0)),
    };
  });

  const paymentRows = sortByDateDesc(payments, 'paymentDate').map((payment) => {
    const account = accounts.find((row) => row.debtAccountID === payment.debtAccountID) || {};
    return {
      ...payment,
      paymentDate: normalizeDebtDateOnlyLikeValue(payment.paymentDate),
      accountName: account.name || payment.debtAccountID,
      debtCostPaid: normalizeMoney(Number(payment.interestAmount || 0) + Number(payment.feeAmount || 0)),
    };
  });

  const periodPaymentRows = paymentRows.filter((payment) => isDateInWindow(payment.paymentDate, window));
  const periodStatementRows = statementRows.filter((statement) => isDateInWindow(statement.statementDate, window));
  const totalDebtBalance = normalizeMoney(accountRows.reduce((sum, account) => sum + account.payoffBalance, 0));
  const totalPrincipalRemaining = normalizeMoney(accountRows.reduce((sum, account) => sum + account.principalRemaining, 0));
  const totalFeeRemaining = normalizeMoney(accountRows.reduce((sum, account) => sum + account.feeRemaining, 0));
  const upcomingDebtPayments = normalizeMoney(accountRows.reduce((sum, account) => sum + account.upcomingPaymentAmount, 0));
  const upcomingDebtPrincipal = normalizeMoney(accountRows.reduce((sum, account) => sum + Number(account.upcomingPrincipalAmount || 0), 0));
  const upcomingDebtFees = normalizeMoney(accountRows.reduce((sum, account) => sum + Number(account.upcomingFeeAmount || 0), 0));
  const debtPaymentsMade = normalizeMoney(periodPaymentRows.reduce((sum, payment) => sum + Number(payment.amount || 0), 0));
  const debtPrincipalPaid = normalizeMoney(periodPaymentRows.reduce((sum, payment) => sum + Number(payment.principalAmount || 0), 0));
  const debtInterestFeesPaid = normalizeMoney(periodPaymentRows.reduce((sum, payment) => sum + Number(payment.debtCostPaid || 0), 0));
  const statementInterestFees = normalizeMoney(periodStatementRows.reduce((sum, statement) => sum + Number(statement.debtCost || 0), 0));

  return {
    summary: {
      accountCount: accountRows.length,
      activeAccountCount: accountRows.filter((account) => account.active).length,
      totalDebtBalance,
      totalPrincipalRemaining,
      totalFeeRemaining,
      upcomingDebtPayments,
      upcomingDebtPrincipal,
      upcomingDebtFees,
      debtPaymentsMade,
      debtPrincipalPaid,
      debtInterestFeesPaid,
      statementInterestFees,
      upcomingWindowStart: upcomingWindow.startDate,
      upcomingWindowEnd: upcomingWindow.endDate,
    },
    accountRows,
    statementRows,
    paymentRows,
    periodPaymentRows,
  };
}
