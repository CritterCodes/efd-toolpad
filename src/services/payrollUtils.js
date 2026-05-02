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

export function getMondayOfWeek(value = new Date()) {
  const date = new Date(value);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

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
