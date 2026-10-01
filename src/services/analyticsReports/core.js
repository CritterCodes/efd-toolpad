export const ANALYTICS_DATE_RANGES = {
  today: 'today',
  this_week: 'this_week',
  this_month: 'this_month',
  this_quarter: 'this_quarter',
  this_year: 'this_year',
  yesterday: 'yesterday',
  last_week: 'last_week',
  last_month: 'last_month',
  last_quarter: 'last_quarter',
  last_year: 'last_year',
  all: 'all',
  '7d': '7d',
  '30d': '30d',
  '90d': '90d',
  '1yr': '1yr',
};

export const ANALYTICS_DATE_RANGE_OPTIONS = [
  { label: 'Today', value: ANALYTICS_DATE_RANGES.today },
  { label: 'This Week', value: ANALYTICS_DATE_RANGES.this_week },
  { label: 'This Month', value: ANALYTICS_DATE_RANGES.this_month },
  { label: 'This Quarter', value: ANALYTICS_DATE_RANGES.this_quarter },
  { label: 'This Year', value: ANALYTICS_DATE_RANGES.this_year },
  { label: 'Yesterday', value: ANALYTICS_DATE_RANGES.yesterday },
  { label: 'Last Week', value: ANALYTICS_DATE_RANGES.last_week },
  { label: 'Last Month', value: ANALYTICS_DATE_RANGES.last_month },
  { label: 'Last Quarter', value: ANALYTICS_DATE_RANGES.last_quarter },
  { label: 'Last Year', value: ANALYTICS_DATE_RANGES.last_year },
  { label: 'All Time', value: ANALYTICS_DATE_RANGES.all },
];

export const CLOSED_REPAIR_STATUSES = new Set([
  'COMPLETED',
  'READY FOR PICKUP',
  'READY FOR PICK-UP',
  'DELIVERY BATCHED',
  'PAID_CLOSED',
  'cancelled',
  'CANCELLED',
]);

export function startOfDay(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function parseLocalDateOnly(value) {
  if (typeof value !== 'string') return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day), 0, 0, 0, 0);
}

export function normalizeDateOnlyLikeValue(value) {
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

export function endOfDay(value) {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

export function startOfWeek(value) {
  const date = startOfDay(value);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
}

export function endOfWeek(value) {
  const date = startOfWeek(value);
  date.setDate(date.getDate() + 6);
  return endOfDay(date);
}

export function startOfMonth(value) {
  const date = startOfDay(value);
  date.setDate(1);
  return date;
}

export function endOfMonth(value) {
  const date = startOfMonth(value);
  date.setMonth(date.getMonth() + 1);
  date.setDate(0);
  return endOfDay(date);
}

export function startOfQuarter(value) {
  const date = startOfDay(value);
  const quarterMonth = Math.floor(date.getMonth() / 3) * 3;
  date.setMonth(quarterMonth, 1);
  return date;
}

export function endOfQuarter(value) {
  const date = startOfQuarter(value);
  date.setMonth(date.getMonth() + 3, 0);
  return endOfDay(date);
}

export function startOfYear(value) {
  const date = startOfDay(value);
  date.setMonth(0, 1);
  return date;
}

export function endOfYear(value) {
  const date = startOfYear(value);
  date.setMonth(11, 31);
  return endOfDay(date);
}

export function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

export function sumMoney(values = []) {
  return roundMoney(values.reduce((sum, value) => sum + Number(value || 0), 0));
}

export function addDays(value, days) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

export function nextBusinessDay(value) {
  let date = startOfDay(addDays(value, 1));
  while (date.getDay() === 0 || date.getDay() === 6) {
    date = startOfDay(addDays(date, 1));
  }
  return date;
}

export function getInvoiceOutstanding(invoice = {}) {
  return roundMoney(Number(invoice.remainingBalance ?? Math.max(Number(invoice.total || 0) - Number(invoice.amountPaid || 0), 0)));
}

export function getPaymentTimestamp(payment = {}) {
  return payment.receivedAt || payment.collectedAt || payment.createdAt || payment.syncedAt || null;
}

export function normalizePaymentMethod(method = '') {
  const value = String(method || 'other').trim().toLowerCase();
  if (['card', 'credit', 'credit_card', 'card_collected', 'stripe', 'shopify_payments'].includes(value) || value.includes('card')) {
    return 'credit_card';
  }
  return value || 'other';
}

export function getPaymentMethod(payment = {}) {
  return normalizePaymentMethod(payment.type || payment.method || 'other');
}

export function isMerchantCardPayment(payment = {}) {
  return getPaymentMethod(payment) === 'credit_card';
}

export function isOwnerOperatorUser(user = {}) {
  return user?.compensationProfile?.isOwnerOperator === true;
}

export function getExpenseCashTimestamp(expense = {}) {
  return expense.paidAt || expense.expenseDate || null;
}

export function getDebtCashInflowTimestamp(account = {}) {
  return account.openingBalanceDate || account.balanceAsOfDate || account.asOfDate || account.createdAt || null;
}

export function isDebtCashInflowAccount(account = {}) {
  if (account.active === false) return false;
  if (account.type === 'credit_card') return false;

  return [
    'cash_advance',
    'owner_loan',
    'loan',
    'line_of_credit',
  ].includes(account.type) || account.paymentSchedule === 'cash_app_flat_fee';
}

export function getPaymentAccountName(invoice = {}) {
  return invoice.customerName || invoice.clientName || invoice.accountID || invoice.invoiceID;
}

export const DEFAULT_FINANCIAL_OPENING_BALANCE = {
  asOfDate: '2026-05-09',
  bankBalance: 298.50,
  cashDrawerBalance: 0,
  notes: 'First clean cash start line. Older expenses retained as history.',
};

export function normalizeFinancialOpeningBalance(openingBalance = null) {
  if (!openingBalance || !openingBalance.asOfDate) return null;

  const asOfDate = parseLocalDateOnly(openingBalance.asOfDate) || startOfDay(openingBalance.asOfDate);
  if (Number.isNaN(asOfDate.getTime())) return null;

  const bankBalance = roundMoney(openingBalance.bankBalance);
  const cashDrawerBalance = roundMoney(openingBalance.cashDrawerBalance);

  return {
    asOfDate,
    bankBalance,
    cashDrawerBalance,
    totalOpeningCash: roundMoney(bankBalance + cashDrawerBalance),
    notes: String(openingBalance.notes || '').trim(),
    updatedAt: openingBalance.updatedAt || null,
  };
}

export function getAgingBucket(daysOpen) {
  if (daysOpen <= 7) return '0-7 days';
  if (daysOpen <= 30) return '8-30 days';
  if (daysOpen <= 60) return '31-60 days';
  return '61+ days';
}

export function formatMonthKey(value) {
  const date = new Date(value);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${month}`;
}

export function formatMonthLabel(value) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit' }).format(new Date(value));
}

