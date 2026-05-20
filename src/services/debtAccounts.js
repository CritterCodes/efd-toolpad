export const DEBT_ACCOUNT_TYPES = [
  'credit_card',
  'loan',
  'cash_advance',
  'owner_loan',
  'line_of_credit',
  'other',
];

export const DEBT_PAYMENT_METHODS = [
  'cash',
  'zelle',
  'check',
  'credit_card',
  'bank_transfer',
  'cash_app',
  'other',
];

export const DEBT_PAYMENT_SCHEDULES = {
  NONE: 'none',
  ONE_TIME: 'one_time',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  CASH_APP_FLAT_FEE: 'cash_app_flat_fee',
};

export const DEBT_PAYMENT_SCHEDULE_OPTIONS = [
  DEBT_PAYMENT_SCHEDULES.NONE,
  DEBT_PAYMENT_SCHEDULES.ONE_TIME,
  DEBT_PAYMENT_SCHEDULES.WEEKLY,
  DEBT_PAYMENT_SCHEDULES.MONTHLY,
  DEBT_PAYMENT_SCHEDULES.CASH_APP_FLAT_FEE,
];

export function normalizeDebtAccountType(type = '') {
  return DEBT_ACCOUNT_TYPES.includes(type) ? type : 'other';
}

export function normalizeDebtPaymentSchedule(schedule = '') {
  return DEBT_PAYMENT_SCHEDULE_OPTIONS.includes(schedule)
    ? schedule
    : DEBT_PAYMENT_SCHEDULES.NONE;
}

export function normalizeDebtAccountStatus(active) {
  return active !== false;
}

export function normalizeMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

export function parseDebtLocalDateInput(value, fallback = new Date()) {
  if (!value) return fallback;
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const [, year, month, day] = match;
      return new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0, 0);
    }
  }
  return new Date(value);
}

export function normalizeDebtDateOnlyLikeValue(value) {
  if (!value) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  if (
    date.getUTCHours() === 0
    && date.getUTCMinutes() === 0
    && date.getUTCSeconds() === 0
    && date.getUTCMilliseconds() === 0
  ) {
    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0, 0);
  }
  return value;
}

export function splitDebtPaymentAmounts(data = {}, account = null) {
  const amount = normalizeMoney(data.amount);
  let interestAmount = normalizeMoney(data.interestAmount);
  let feeAmount = normalizeMoney(data.feeAmount);

  if (
    account?.paymentSchedule === DEBT_PAYMENT_SCHEDULES.CASH_APP_FLAT_FEE
    && data.principalAmount == null
    && !Number(data.interestAmount || 0)
    && !Number(data.feeAmount || 0)
  ) {
    const totalRepayment = normalizeMoney(Number(account.openingBalance || 0) + Number(account.flatFeeAmount || 0));
    feeAmount = totalRepayment > 0
      ? normalizeMoney(amount * (Number(account.flatFeeAmount || 0) / totalRepayment))
      : 0;
    interestAmount = 0;
  }

  const principalAmount = data.principalAmount == null
    ? normalizeMoney(Math.max(amount - interestAmount - feeAmount, 0))
    : normalizeMoney(data.principalAmount);

  return {
    amount,
    principalAmount,
    interestAmount,
    feeAmount,
  };
}
