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
import { buildLaborPipelineReport } from '@/services/labor/laborPipeline';
import { calculateRepairChargeTotal } from '@/app/api/repairLaborLogs/utils';
import { ladderFromSettings, resolvePayRate } from '@/services/pay/payLadder';
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
import { getOwnerOperatorUserIDs } from '@/app/api/repairs/payroll/service';

async function getPendingReviewLogs() {
  try {
    return await RepairLaborLogsModel.findPendingReview();
  } catch {
    return [];
  }
}

/**
 * Everything the labor PIPELINE needs that nothing else in this report loads: the open work orders
 * themselves, the labor held pending QC, and this week's credited-but-unbatched earnings.
 *
 * The payroll candidates come from the labor-log model directly rather than the payroll service,
 * because that service also syncs sale-payout deductions — a write, which has no business running
 * because somebody opened a report.
 */
async function getLaborPipelineInputs(dbInstance, settings) {
  const shopRate = Number(settings?.pricing?.wage) || 0;
  const ladder = ladderFromSettings(settings);

  const [workOrders, pendingQcLogs, ownerUserIDs] = await Promise.all([
    dbInstance.collection('workOrders').find({}).project({
      _id: 0, workOrderID: 1, sourceType: 1, sourceID: 1, discipline: 1, status: 1, title: 1,
      assignedToUserID: 1, assignedJeweler: 1, tasks: 1, flatFee: 1, isRush: 1, promiseDate: 1, benchStatus: 1,
    }).toArray(),
    dbInstance.collection('laborLogs').find({ pendingQc: true })
      .project({ _id: 0, logID: 1, workOrderID: 1, creditedValue: 1, creditedLaborHours: 1, primaryJewelerUserID: 1 })
      .toArray(),
    getOwnerOperatorUserIDs(),
  ]);

  const candidates = await RepairLaborLogsModel.listPayrollCandidates({ ownerUserIDs }).catch(() => []);

  // Rate per jeweler off the published ladder — the rate they are CREDITED at, which since 2026-09-22
  // is not the shop rate the customer is priced from.
  const userIDs = [...new Set([
    ...workOrders.map((wo) => wo.assignedToUserID),
    ...candidates.map((c) => c.userID),
  ].filter(Boolean))];
  const rateByUserID = new Map();
  if (userIDs.length) {
    const users = await dbInstance.collection('users')
      .find({ userID: { $in: userIDs } })
      .project({ _id: 0, userID: 1, employment: 1, hourlyRate: 1 })
      .toArray();
    for (const user of users) {
      const resolved = resolvePayRate(user, ladder, shopRate);
      rateByUserID.set(user.userID, resolved.rate > 0 ? resolved.rate : (Number(user.hourlyRate) || 0));
    }
  }

  return { workOrders, pendingQcLogs, candidates, rateByUserID, shopRate };
}

/**
 * What each open job will BILL, keyed the way the pipeline looks it up.
 *
 * `calculateRepairChargeTotal` is the shop's own answer to "what does this ticket cost the customer"
 * — the same function QC uses to sanity-check labor against the ticket — so the revenue forecast and
 * the ticket agree by construction, including the part where a comped or internal repair bills zero.
 *
 * Only repairs. A production piece or a custom's price lives on the design or the custom quote, not
 * on the work order, and quietly reporting those as $0 would understate the number; they are counted
 * as "no ticket value yet" instead.
 */
function buildTicketValueMap(repairs = []) {
  const map = new Map();
  for (const repair of repairs) {
    if (!repair?.repairID) continue;
    map.set(`repair:${repair.repairID}`, calculateRepairChargeTotal(repair));
  }
  return map;
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
    dbInstance.collection('laborLogs').find({
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

  const pipelineInputs = await getLaborPipelineInputs(dbInstance, settings);

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
    // A NOW snapshot, deliberately outside the report's date range: work still on the floor has no
    // period, and filtering it to "last month" would quietly hide this week's load.
    laborPipeline: buildLaborPipelineReport({
      ...pipelineInputs,
      batches: payrollBatches,
      ticketValueBySource: buildTicketValueMap(repairs),
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
