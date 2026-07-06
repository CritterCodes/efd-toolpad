import { db } from '@/lib/database';
import {
  buildAnalyticsBaselineSettingsUpdate,
  getAnalyticsBaselineSettings,
  ANALYTICS_ORIGIN,
  resolveRepairAnalyticsOrigin,
} from '@/services/analyticsBaseline';
import {
  buildCustomerInsights,
  combineAnalyticsInvoices,
  buildInvoiceRevenueSummary,
  buildLaborSummary,
  buildRepairOverview,
  buildSalesTaxTotals,
  buildStatusBreakdown,
  filterOperationalRepairs,
  getAnalyticsDateWindow,
  isDateInWindow,
} from '@/services/repairAnalytics';

export async function getAdminSettingsDocument() {
  const dbInstance = db._instance || await db.connect();
  const settings = await dbInstance.collection('adminSettings').findOne({
    _id: 'repair_task_admin_settings',
  });

  if (!settings) {
    return {
      analytics: buildAnalyticsBaselineSettingsUpdate({}),
    };
  }

  return {
    ...settings,
    analytics: buildAnalyticsBaselineSettingsUpdate(settings),
  };
}

export async function getAnalyticsSummary({ dateRange = 'last_month', includeLegacy = false } = {}) {
  const dbInstance = db._instance || await db.connect();
  const settings = await getAdminSettingsDocument();
  const baseline = getAnalyticsBaselineSettings(settings);
  const window = getAnalyticsDateWindow(dateRange);

  const [repairs, invoices, salesInvoices, customInvoices, laborLogs] = await Promise.all([
    dbInstance.collection('repairs').find({}).project({ _id: 0 }).toArray(),
    dbInstance.collection('repairInvoices').find({}).project({ _id: 0 }).toArray(),
    dbInstance.collection('salesInvoices').find({}).project({ _id: 0 }).toArray(),
    dbInstance.collection('customInvoices').find({}).project({ _id: 0 }).toArray(),
    dbInstance.collection('laborLogs').find({
      weekStart: { $gte: baseline.laborAnalyticsStartDate },
    }).project({ _id: 0 }).toArray(),
  ]);

  const repairsById = new Map(repairs.map((repair) => [repair.repairID, repair]));
  const analyticsInvoices = combineAnalyticsInvoices(invoices, salesInvoices, customInvoices);
  const operationalRepairs = filterOperationalRepairs(repairs, { includeLegacy, window });
  const filteredInvoices = analyticsInvoices.filter((invoice) => isDateInWindow(invoice.createdAt, window));
  const filteredLaborLogs = laborLogs.filter((log) => (
    isDateInWindow(log.createdAt || log.adminReviewedAt || log.updatedAt || log.weekStart, window)
  ));

  const repairOverview = buildRepairOverview(operationalRepairs);
  const customerInsights = buildCustomerInsights(operationalRepairs);
  const statusBreakdown = buildStatusBreakdown(operationalRepairs);
  const labor = buildLaborSummary(filteredLaborLogs);
  const invoiceSummary = buildInvoiceRevenueSummary(filteredInvoices, repairsById);

  return {
    baseline: {
      repairAnalyticsStartDate: baseline.repairAnalyticsStartDate,
      laborAnalyticsStartDate: baseline.laborAnalyticsStartDate,
      note: baseline.note,
    },
    filters: {
      dateRange,
      includeLegacy,
      startDate: window.startDate,
      endDate: window.endDate,
    },
    repairOverview: {
      ...repairOverview,
      goLiveRepairCount: operationalRepairs.filter((repair) => resolveRepairAnalyticsOrigin(repair) === ANALYTICS_ORIGIN.GO_LIVE).length,
    },
    customerInsights,
    statusBreakdown,
    revenue: invoiceSummary.revenue,
    revenueTrend: invoiceSummary.revenueTrend,
    salesTax: {
      rows: invoiceSummary.salesTax.rows,
      totals: buildSalesTaxTotals(invoiceSummary.salesTax.rows),
    },
    labor: {
      ...labor,
      label: 'Post-baseline only',
    },
  };
}
