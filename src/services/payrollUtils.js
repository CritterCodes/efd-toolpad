export const PAYROLL_BATCH_STATUS = {
  DRAFT: 'draft',
  FINALIZED: 'finalized',
  PAID: 'paid',
  VOID: 'void',
};

export const PAYROLL_LOG_STATUS = {
  UNBATCHED: 'unbatched',
  BATCHED: 'batched',
  PAID: 'paid',
};

export const OWNER_DRAW_STATUS = {
  RECORDED: 'recorded',
  VOID: 'void',
};

/**
 * Start of the payroll week containing `value`: SUNDAY 00:00 (owner, 2026-09-22: the work week is
 * Sunday–Saturday; payroll runs Wednesday for the week that ended Saturday, money lands Friday).
 * Labor logs, sale payouts and payroll batches are all keyed on this date.
 */
export function getPayrollWeekStart(value = new Date()) {
  const date = new Date(value);
  date.setDate(date.getDate() - date.getDay());
  date.setHours(0, 0, 0, 0);
  return date;
}

/** @deprecated name from the Monday-week era — same function, kept so call sites keep working. */
export const getMondayOfWeek = getPayrollWeekStart;

export function getWeekEndFromStart(weekStart) {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function normalizePayrollLogStatus(status) {
  if (status === PAYROLL_LOG_STATUS.BATCHED) return PAYROLL_LOG_STATUS.BATCHED;
  if (status === PAYROLL_LOG_STATUS.PAID) return PAYROLL_LOG_STATUS.PAID;
  return PAYROLL_LOG_STATUS.UNBATCHED;
}

export function buildPayrollBatchTotals(logs = []) {
  const repairIDs = new Set();

  const totals = logs.reduce((acc, log) => {
    if (log?.repairID) {
      repairIDs.add(log.repairID);
    }

    acc.laborHours += Number(log?.creditedLaborHours || 0);
    acc.laborPay += Number(log?.creditedValue || 0);
    acc.entryCount += 1;
    return acc;
  }, {
    laborHours: 0,
    laborPay: 0,
    entryCount: 0,
  });

  return {
    laborHours: Math.round(totals.laborHours * 100) / 100,
    laborPay: Math.round(totals.laborPay * 100) / 100,
    entryCount: totals.entryCount,
    repairsWorked: repairIDs.size,
  };
}

/**
 * What a payroll batch pays, split honestly. Since 2026-09-22 a batch stores `laborPay` (labor only),
 * `salePay` (consignment / sale payouts) and `totalPay` (their sum) — that is what Stripe transfers.
 * Batches written before that stored the TOTAL in `laborPay` (and the sale part again in `salePay`),
 * which is why the fallback here reads `laborPay` as the total when `totalPay` is absent. The prod
 * and dev collections were normalized (totalPay stamped, laborPay reduced) the same day, so the
 * fallback only matters for docs written by code older than this helper.
 */
export function splitBatchPay(batch = {}) {
  const round = (n) => Math.round(Number(n || 0) * 100) / 100;
  const salePay = round(batch.salePay);
  if (batch.totalPay !== null && batch.totalPay !== undefined && Number.isFinite(Number(batch.totalPay))) {
    const totalPay = round(batch.totalPay);
    return { laborPay: round(totalPay - salePay), salePay, totalPay };
  }
  if (batch.cadence === 'daily') {
    // daily batches always stored labor-only laborPay
    const laborPay = round(batch.laborPay);
    return { laborPay, salePay, totalPay: round(laborPay + salePay) };
  }
  const totalPay = round(batch.laborPay);
  return { laborPay: Math.max(round(totalPay - salePay), 0), salePay, totalPay };
}

/** The amount a batch pays out (before any daily payout fee). */
export function payrollTotal(batch = {}) {
  return splitBatchPay(batch).totalPay;
}

export function canVoidPayrollBatch(status) {
  return status === PAYROLL_BATCH_STATUS.DRAFT || status === PAYROLL_BATCH_STATUS.FINALIZED;
}

export function buildOwnerDrawTotals(draws = []) {
  return draws.reduce((acc, draw) => {
    if (draw?.status === OWNER_DRAW_STATUS.VOID) {
      return acc;
    }

    acc.amount += Number(draw?.amount || 0);
    acc.count += 1;
    return acc;
  }, {
    amount: 0,
    count: 0,
  });
}
