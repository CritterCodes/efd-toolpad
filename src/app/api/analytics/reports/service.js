import { db } from '@/lib/database';
import RepairPayrollBatchesModel from '@/app/api/repairPayrollBatches/model';
import RepairLaborLogsModel from '@/app/api/repairLaborLogs/model';
import OwnerDrawsModel from '@/app/api/ownerDraws/model';
import BusinessExpensesModel from '@/app/api/businessExpenses/model';
import RecurringBusinessExpensesModel from '@/app/api/recurringBusinessExpenses/model';
import DebtAccountsModel from '@/app/api/debtAccounts/model';
import DebtStatementsModel from '@/app/api/debtStatements/model';
import DebtPaymentsModel from '@/app/api/debtPayments/model';
import { getAnalyticsBaselineSettings } from '@/services/analyticsBaseline';
import { buildDebtFoundationReport } from '@/services/debtAnalytics';
import {
  buildAccountsReceivableReport,
  buildCashCollectedReport,
  buildCloseoutBottlenecksPeriodReport,
  combineAnalyticsInvoices,
  buildExpenseReport,
  buildBankSafeToSpendReport,
  buildFederalTaxReserveReport,
  buildJewelerPerformanceReport,
  buildLaborSettlementReport,
  buildPayrollReport,
  buildRepairsReport,
  buildSalesPayoutReport,
  buildWholesalePerformanceReport,
  getAnalyticsDateWindow,
  normalizeFinancialOpeningBalance,
} from '@/services/repairAnalytics';
import { getAdminSettingsDocument } from '../summary/service';

async function getPendingReviewLogs() {
  try {
    return await RepairLaborLogsModel.findPendingReview();
  } catch {
    return [];
  }
}

async function getUsersMapFromLogsAndBatches(logs = [], batches = []) {
  const userIDs = [...new Set([
    ...logs.map((log) => log.primaryJewelerUserID).filter(Boolean),
    ...batches.map((batch) => batch.userID).filter(Boolean),
  ])];

  if (userIDs.length === 0) return new Map();

  const dbInstance = db._instance || await db.connect();
  const users = await dbInstance.collection('users').find({
    userID: { $in: userIDs },
  }).project({
    _id: 0,
    userID: 1,
    firstName: 1,
    lastName: 1,
    email: 1,
    compensationProfile: 1,
  }).toArray();

  return new Map(users.map((user) => [user.userID, user]));
}

export async function getAnalyticsReports({ dateRange = 'last_month' } = {}) {
  const dbInstance = db._instance || await db.connect();
  const settings = await getAdminSettingsDocument();
  const baseline = getAnalyticsBaselineSettings(settings);
  const openingBalance = normalizeFinancialOpeningBalance(settings?.financial?.openingBalance);
  const window = getAnalyticsDateWindow(dateRange);

  const [repairs, invoices, salesInvoices, customInvoices, laborLogs, payrollBatches, salePayouts, ownerDraws, expenses, recurringExpenses, debtAccounts, debtStatements, debtPayments, pendingReviewLogs] = await Promise.all([
    dbInstance.collection('repairs').find({}).project({ _id: 0 }).toArray(),
    dbInstance.collection('repairInvoices').find({}).project({ _id: 0 }).toArray(),
    dbInstance.collection('salesInvoices').find({}).project({ _id: 0 }).toArray(),
    dbInstance.collection('customInvoices').find({}).project({ _id: 0 }).toArray(),
    dbInstance.collection('repairLaborLogs').find({
      weekStart: { $gte: baseline.laborAnalyticsStartDate },
    }).project({ _id: 0 }).toArray(),
    RepairPayrollBatchesModel.list({}),
    dbInstance.collection('salePayouts').find({}).project({ _id: 0 }).toArray(),
    OwnerDrawsModel.list({}),
    BusinessExpensesModel.list({}),
    RecurringBusinessExpensesModel.list({}),
    DebtAccountsModel.list({}),
    DebtStatementsModel.list({}),
    DebtPaymentsModel.list({}),
    getPendingReviewLogs(),
  ]);

  const repairsById = new Map(repairs.map((repair) => [repair.repairID, repair]));
  const analyticsInvoices = combineAnalyticsInvoices(invoices, salesInvoices, customInvoices);
  const invoicesById = new Map(invoices.map((invoice) => [invoice.invoiceID, invoice]));
  const usersById = await getUsersMapFromLogsAndBatches(laborLogs, payrollBatches);
  const laborAnalyticsPayrollBatches = payrollBatches.filter((batch) => (
    batch?.weekStart && new Date(batch.weekStart) >= new Date(baseline.laborAnalyticsStartDate)
  ));

  return {
    baseline: {
      repairAnalyticsStartDate: baseline.repairAnalyticsStartDate,
      laborAnalyticsStartDate: baseline.laborAnalyticsStartDate,
      federalTaxReserveRate: baseline.federalTaxReserveRate,
      note: baseline.note,
      taxReserveNote: baseline.taxReserveNote,
    },
    filters: {
      dateRange,
      startDate: window.startDate,
      endDate: window.endDate,
    },
    cashCollected: buildCashCollectedReport(analyticsInvoices, window, repairsById),
    accountsReceivable: buildAccountsReceivableReport(analyticsInvoices, window.endDate || new Date(), window),
    closeoutBottlenecks: buildCloseoutBottlenecksPeriodReport({
      repairs,
      invoicesById,
      pendingReviewLogs,
      window,
    }),
    jewelerPerformance: buildJewelerPerformanceReport({
      logs: laborLogs,
      payrollBatches: laborAnalyticsPayrollBatches,
      usersById,
      window,
    }),
    laborSettlement: buildLaborSettlementReport({
      payrollBatches: laborAnalyticsPayrollBatches,
      usersById,
      window,
    }),
    federalTaxReserve: buildFederalTaxReserveReport({
      invoices: analyticsInvoices,
      payrollBatches,
      ownerDraws,
      expenses,
      recurringExpenses,
      usersById,
      window,
      federalTaxReserveRate: baseline.federalTaxReserveRate,
    }),
    bankSafeToSpend: buildBankSafeToSpendReport({
      openingBalance,
      invoices: analyticsInvoices,
      payrollBatches,
      ownerDraws,
      expenses,
      recurringExpenses,
      debtAccounts,
      debtPayments,
      usersById,
      federalTaxReserveRate: baseline.federalTaxReserveRate,
    }),
    debtFoundation: buildDebtFoundationReport({
      accounts: debtAccounts,
      statements: debtStatements,
      payments: debtPayments,
      window,
    }),
    expenses: buildExpenseReport(expenses, window, recurringExpenses),
    payroll: buildPayrollReport({
      payrollBatches,
      usersById,
      window,
    }),
    salesPayouts: buildSalesPayoutReport({
      salePayouts,
      window,
    }),
    wholesalePerformance: buildWholesalePerformanceReport({ repairs, invoices, window }),
    repairsReport: buildRepairsReport(repairs, window),
  };
}
