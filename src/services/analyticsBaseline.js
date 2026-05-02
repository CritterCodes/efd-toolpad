export const ANALYTICS_ORIGIN = {
  LEGACY: 'legacy',
  GO_LIVE: 'go_live',
};

export const DEFAULT_REPAIR_ANALYTICS_START_DATE = '2026-05-01T00:00:00.000Z';
export const DEFAULT_LABOR_ANALYTICS_START_DATE = '2026-05-04T00:00:00.000Z';
export const DEFAULT_FEDERAL_TAX_RESERVE_RATE = 0.30;

export const ANALYTICS_BASELINE_NOTE =
  'Revenue counts invoices from May 1, 2026 forward, including legacy carryover. Labor analytics default to the first full payroll week after go-live.';
export const FEDERAL_TAX_RESERVE_NOTE =
  'Federal tax reserve is an estimate for cash discipline and reserve planning. Only recorded business expenses are included.';

function atStartOfDay(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function getDefaultRepairAnalyticsStartDate() {
  return atStartOfDay(DEFAULT_REPAIR_ANALYTICS_START_DATE);
}

export function getDefaultLaborAnalyticsStartDate() {
  return atStartOfDay(DEFAULT_LABOR_ANALYTICS_START_DATE);
}

export function normalizeAnalyticsOrigin(value) {
  if (value === ANALYTICS_ORIGIN.LEGACY || value === ANALYTICS_ORIGIN.GO_LIVE) {
    return value;
  }

  return '';
}

export function resolveAnalyticsOriginByCreatedAt(createdAt) {
  const createdDate = createdAt ? new Date(createdAt) : new Date();
  return createdDate < getDefaultRepairAnalyticsStartDate()
    ? ANALYTICS_ORIGIN.LEGACY
    : ANALYTICS_ORIGIN.GO_LIVE;
}

export function resolveRepairAnalyticsOrigin(repair = {}) {
  return normalizeAnalyticsOrigin(repair.analyticsOrigin) || resolveAnalyticsOriginByCreatedAt(repair.createdAt);
}

export function buildRepairAnalyticsFields(repairLike = {}, assignedAt = new Date()) {
  return {
    analyticsOrigin: resolveRepairAnalyticsOrigin(repairLike),
    analyticsOriginAssignedAt: repairLike.analyticsOriginAssignedAt || assignedAt,
  };
}

export function getAnalyticsBaselineSettings(settings = {}) {
  const analytics = settings.analytics || {};
  const repairAnalyticsStartDate = analytics.repairAnalyticsStartDate
    ? atStartOfDay(analytics.repairAnalyticsStartDate)
    : getDefaultRepairAnalyticsStartDate();
  const laborAnalyticsStartDate = analytics.laborAnalyticsStartDate
    ? atStartOfDay(analytics.laborAnalyticsStartDate)
    : getDefaultLaborAnalyticsStartDate();

  return {
    repairAnalyticsStartDate,
    laborAnalyticsStartDate,
    federalTaxReserveRate: Number(analytics.federalTaxReserveRate ?? DEFAULT_FEDERAL_TAX_RESERVE_RATE),
    note: analytics.note || ANALYTICS_BASELINE_NOTE,
    taxReserveNote: analytics.taxReserveNote || FEDERAL_TAX_RESERVE_NOTE,
  };
}

export function buildAnalyticsBaselineSettingsUpdate(existingSettings = {}) {
  const current = getAnalyticsBaselineSettings(existingSettings);
  return {
    ...existingSettings.analytics,
    repairAnalyticsStartDate: current.repairAnalyticsStartDate,
    laborAnalyticsStartDate: current.laborAnalyticsStartDate,
    federalTaxReserveRate: current.federalTaxReserveRate,
    note: current.note,
    taxReserveNote: current.taxReserveNote,
  };
}
