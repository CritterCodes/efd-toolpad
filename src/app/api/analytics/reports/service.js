import { db } from '@/lib/database';
import RepairPayrollBatchesModel from '@/app/api/repairPayrollBatches/model';
import RepairLaborLogsModel from '@/app/api/repairLaborLogs/model';
import OwnerDrawsModel from '@/app/api/ownerDraws/model';
import BusinessExpensesModel from '@/app/api/businessExpenses/model';
import RecurringBusinessExpensesModel from '@/app/api/recurringBusinessExpenses/model';
import { getAnalyticsBaselineSettings } from '@/services/analyticsBaseline';
import {
  buildAccountsReceivableReport,
  buildCashCollectedReport,
  buildCloseoutBottlenecksPeriodReport,
  buildExpenseReport,
  buildFederalTaxReserveReport,
  buildJewelerPerformanceReport,
  buildLaborSettlementReport,
  buildPayrollReport,
  buildWholesalePerformanceReport,
  getAnalyticsDateWindow,
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
  const window = getAnalyticsDateWindow(dateRange);

  const [repairs, invoices, laborLogs, payrollBatches, ownerDraws, expenses, recurringExpenses, pendingReviewLogs] = await Promise.all([
    dbInstance.collection('repairs').find({}).project({ _id: 0 }).toArray(),
    dbInstance.collection('repairInvoices').find({}).project({ _id: 0 }).toArray(),
    dbInstance.collection('repairLaborLogs').find({
      weekStart: { $gte: baseline.laborAnalyticsStartDate },
    }).project({ _id: 0 }).toArray(),
    RepairPayrollBatchesModel.list({}),
    OwnerDrawsModel.list({}),
    BusinessExpensesModel.list({}),
    RecurringBusinessExpensesModel.list({}),
    getPendingReviewLogs(),
  ]);

  const repairsById = new Map(repairs.map((repair) => [repair.repairID, repair]));
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
    cashCollected: buildCashCollectedReport(invoices, window, repairsById),
    accountsReceivable: buildAccountsReceivableReport(invoices, window.endDate || new Date(), window),
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
      invoices,
      payrollBatches,
      ownerDraws,
      expenses,
      recurringExpenses,
      usersById,
      window,
      federalTaxReserveRate: baseline.federalTaxReserveRate,
    }),
    expenses: buildExpenseReport(expenses, window, recurringExpenses),
    payroll: buildPayrollReport({
      payrollBatches,
      usersById,
      window,
    }),
    wholesalePerformance: buildWholesalePerformanceReport({ repairs, invoices, window }),
  };
}
