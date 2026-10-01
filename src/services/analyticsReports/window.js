import { resolveRepairAnalyticsOrigin } from '@/services/analyticsBaseline';
import { ANALYTICS_ORIGIN } from '@/services/analyticsBaseline';
import { ANALYTICS_DATE_RANGES, CLOSED_REPAIR_STATUSES, endOfDay, endOfMonth, endOfQuarter, endOfWeek, endOfYear, startOfDay, startOfMonth, startOfQuarter, startOfWeek, startOfYear } from './core';
export function getAnalyticsDateWindow(dateRange = ANALYTICS_DATE_RANGES.this_month, now = new Date()) {
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  switch (dateRange) {
    case ANALYTICS_DATE_RANGES.today:
      return { key: dateRange, startDate: todayStart, endDate: todayEnd };
    case ANALYTICS_DATE_RANGES.this_week:
      return { key: dateRange, startDate: startOfWeek(todayStart), endDate: todayEnd };
    case ANALYTICS_DATE_RANGES.this_month:
      return { key: dateRange, startDate: startOfMonth(todayStart), endDate: todayEnd };
    case ANALYTICS_DATE_RANGES.this_quarter:
      return { key: dateRange, startDate: startOfQuarter(todayStart), endDate: todayEnd };
    case ANALYTICS_DATE_RANGES.this_year:
      return { key: dateRange, startDate: startOfYear(todayStart), endDate: todayEnd };
    case ANALYTICS_DATE_RANGES.yesterday: {
      const yesterday = new Date(todayStart);
      yesterday.setDate(yesterday.getDate() - 1);
      return { key: dateRange, startDate: startOfDay(yesterday), endDate: endOfDay(yesterday) };
    }
    case ANALYTICS_DATE_RANGES.last_week: {
      const thisWeekStart = startOfWeek(todayStart);
      const lastWeekEnd = new Date(thisWeekStart);
      lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
      const lastWeekStart = startOfWeek(lastWeekEnd);
      return { key: dateRange, startDate: lastWeekStart, endDate: endOfWeek(lastWeekStart) };
    }
    case ANALYTICS_DATE_RANGES.last_month: {
      const thisMonthStart = startOfMonth(todayStart);
      const lastMonthEnd = new Date(thisMonthStart);
      lastMonthEnd.setDate(0);
      return { key: dateRange, startDate: startOfMonth(lastMonthEnd), endDate: endOfMonth(lastMonthEnd) };
    }
    case ANALYTICS_DATE_RANGES.last_quarter: {
      const thisQuarterStart = startOfQuarter(todayStart);
      const lastQuarterEnd = new Date(thisQuarterStart);
      lastQuarterEnd.setDate(0);
      return { key: dateRange, startDate: startOfQuarter(lastQuarterEnd), endDate: endOfQuarter(lastQuarterEnd) };
    }
    case ANALYTICS_DATE_RANGES.last_year: {
      const lastYear = new Date(todayStart);
      lastYear.setFullYear(lastYear.getFullYear() - 1);
      return { key: dateRange, startDate: startOfYear(lastYear), endDate: endOfYear(lastYear) };
    }
    case ANALYTICS_DATE_RANGES['7d']: {
      const startDate = startOfDay(todayStart);
      startDate.setDate(startDate.getDate() - 6);
      return { key: dateRange, startDate, endDate: todayEnd };
    }
    case ANALYTICS_DATE_RANGES['30d']: {
      const startDate = startOfDay(todayStart);
      startDate.setDate(startDate.getDate() - 29);
      return { key: dateRange, startDate, endDate: todayEnd };
    }
    case ANALYTICS_DATE_RANGES['90d']: {
      const startDate = startOfDay(todayStart);
      startDate.setDate(startDate.getDate() - 89);
      return { key: dateRange, startDate, endDate: todayEnd };
    }
    case ANALYTICS_DATE_RANGES['1yr']: {
      const startDate = startOfDay(todayStart);
      startDate.setFullYear(startDate.getFullYear() - 1);
      startDate.setDate(startDate.getDate() + 1);
      return { key: dateRange, startDate, endDate: todayEnd };
    }
    case ANALYTICS_DATE_RANGES.all:
    default:
      return { key: ANALYTICS_DATE_RANGES.all, startDate: null, endDate: todayEnd };
  }
}

export function isDateInWindow(value, window) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  if (window?.startDate && date < new Date(window.startDate)) return false;
  if (window?.endDate && date > new Date(window.endDate)) return false;
  return true;
}

export function filterOperationalRepairs(repairs = [], { includeLegacy = false, window } = {}) {
  return (repairs || []).filter((repair) => {
    const origin = resolveRepairAnalyticsOrigin(repair);
    if (!includeLegacy && origin !== ANALYTICS_ORIGIN.GO_LIVE) {
      return false;
    }
    return isDateInWindow(repair.createdAt, window);
  });
}

export function buildRepairOverview(repairs = []) {
  const totalRepairs = repairs.length;
  const completedRepairs = repairs.filter((repair) => CLOSED_REPAIR_STATUSES.has(repair.status)).length;
  const pendingRepairs = totalRepairs - completedRepairs;
  const completedWithDates = repairs.filter((repair) => (
    CLOSED_REPAIR_STATUSES.has(repair.status) && repair.completedAt && repair.createdAt
  ));

  const averageCompletionDays = completedWithDates.length
    ? Number((
        completedWithDates.reduce((sum, repair) => (
          sum + ((new Date(repair.completedAt) - new Date(repair.createdAt)) / (1000 * 60 * 60 * 24))
        ), 0) / completedWithDates.length
      ).toFixed(1))
    : null;

  return {
    totalRepairs,
    completedRepairs,
    pendingRepairs,
    averageCompletionDays,
  };
}

export function buildCustomerInsights(repairs = []) {
  const clientCounts = repairs.reduce((acc, repair) => {
    const key = repair.clientName || repair.businessName || 'Unknown client';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return {
    totalClients: Object.keys(clientCounts).length,
    topClients: Object.entries(clientCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([clientName, repairCount]) => ({ clientName, repairCount })),
    recentClients: repairs
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 3)
      .map((repair) => repair.clientName || repair.businessName || 'Unknown client'),
  };
}

export function buildStatusBreakdown(repairs = []) {
  const counts = repairs.reduce((acc, repair) => {
    const status = repair.status || 'UNKNOWN';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

