export const RECURRING_EXPENSE_FREQUENCIES = [
  'weekly',
  'monthly',
  'quarterly',
  'yearly',
];

export const RECURRING_EXPENSE_SOURCE_TYPE = {
  MANUAL: 'manual',
  RECURRING: 'recurring',
};

export const RECURRING_EXPENSE_DEFAULT_STATUS = 'scheduled';

function atStartOfDay(value) {
  const date = new Date(value);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function clampDayOfMonth(day) {
  const numeric = Number(day);
  if (!Number.isFinite(numeric)) return 1;
  return Math.min(Math.max(Math.trunc(numeric), 1), 31);
}

function daysInMonth(year, monthIndex) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function withClampedDay(year, monthIndex, requestedDay) {
  return new Date(Date.UTC(year, monthIndex, Math.min(requestedDay, daysInMonth(year, monthIndex))));
}

export function normalizeRecurringExpenseFrequency(frequency = '') {
  return RECURRING_EXPENSE_FREQUENCIES.includes(frequency) ? frequency : 'monthly';
}

export function normalizeRecurringExpenseTemplate(template = {}) {
  const startDate = template.startDate ? atStartOfDay(template.startDate) : atStartOfDay(new Date());
  const frequency = normalizeRecurringExpenseFrequency(template.frequency);
  const dayOfWeek = Math.min(Math.max(Number(template.dayOfWeek ?? startDate.getDay()) || 0, 0), 6);
  const dayOfMonth = clampDayOfMonth(template.dayOfMonth ?? startDate.getDate());

  return {
    ...template,
    frequency,
    dayOfWeek,
    dayOfMonth,
    active: template.active !== false,
    startDate,
    endDate: template.endDate ? atStartOfDay(template.endDate) : null,
    nextOccurrenceDate: template.nextOccurrenceDate ? atStartOfDay(template.nextOccurrenceDate) : null,
    lastGeneratedAt: template.lastGeneratedAt ? new Date(template.lastGeneratedAt) : null,
  };
}

export function getNextRecurringOccurrence(templateLike = {}, afterDate = null) {
  const template = normalizeRecurringExpenseTemplate(templateLike);
  const baseline = atStartOfDay(afterDate || template.nextOccurrenceDate || template.startDate || new Date());
  const startDate = template.startDate;
  const reference = baseline < startDate ? startDate : baseline;

  switch (template.frequency) {
    case 'weekly': {
      const candidate = new Date(reference);
      const currentDay = candidate.getUTCDay();
      const offset = (template.dayOfWeek - currentDay + 7) % 7;
      candidate.setUTCDate(candidate.getUTCDate() + offset);
      if (candidate < startDate) {
        candidate.setUTCDate(candidate.getUTCDate() + 7);
      }
      return atStartOfDay(candidate);
    }
    case 'quarterly': {
      let year = reference.getUTCFullYear();
      let monthIndex = reference.getUTCMonth();
      const quarterStart = monthIndex - (monthIndex % 3);
      let candidate = withClampedDay(year, quarterStart, template.dayOfMonth);
      if (candidate < reference || candidate < startDate) {
        monthIndex = quarterStart + 3;
        year += Math.floor(monthIndex / 12);
        monthIndex %= 12;
        candidate = withClampedDay(year, monthIndex, template.dayOfMonth);
      }
      return atStartOfDay(candidate);
    }
    case 'yearly': {
      const startMonth = startDate.getUTCMonth();
      let year = reference.getUTCFullYear();
      let candidate = withClampedDay(year, startMonth, template.dayOfMonth);
      if (candidate < reference || candidate < startDate) {
        candidate = withClampedDay(year + 1, startMonth, template.dayOfMonth);
      }
      return atStartOfDay(candidate);
    }
    case 'monthly':
    default: {
      let year = reference.getUTCFullYear();
      let monthIndex = reference.getUTCMonth();
      let candidate = withClampedDay(year, monthIndex, template.dayOfMonth);
      if (candidate < reference || candidate < startDate) {
        monthIndex += 1;
        year += Math.floor(monthIndex / 12);
        monthIndex %= 12;
        candidate = withClampedDay(year, monthIndex, template.dayOfMonth);
      }
      return atStartOfDay(candidate);
    }
  }
}

export function getOccurrenceDueDates(templateLike = {}, throughDate = new Date()) {
  const template = normalizeRecurringExpenseTemplate(templateLike);
  if (!template.active) return [];

  const dueDates = [];
  const boundary = atStartOfDay(throughDate);
  let cursor = template.nextOccurrenceDate || getNextRecurringOccurrence(template, template.startDate);
  const endDate = template.endDate ? atStartOfDay(template.endDate) : null;

  while (cursor && cursor <= boundary) {
    if (!endDate || cursor <= endDate) {
      dueDates.push(atStartOfDay(cursor));
    }

    const nextSeed = new Date(cursor);
    nextSeed.setUTCDate(nextSeed.getUTCDate() + 1);
    cursor = getNextRecurringOccurrence(template, nextSeed);

    if (endDate && cursor > endDate) {
      break;
    }

    if (dueDates.length > 120) {
      break;
    }
  }

  return dueDates;
}

export function buildRecurringExpenseRow(templateLike = {}, occurrenceDate, overrides = {}) {
  const template = normalizeRecurringExpenseTemplate(templateLike);
  const expenseDate = atStartOfDay(occurrenceDate);

  return {
    expenseDate,
    vendor: template.vendor || '',
    category: template.category,
    amount: Number(template.amount || 0),
    paymentMethod: template.paymentMethod || 'other',
    status: overrides.status || template.statusDefault || RECURRING_EXPENSE_DEFAULT_STATUS,
    paidAt: overrides.paidAt || null,
    notes: template.notes || '',
    isDeductible: template.isDeductible !== false,
    sourceType: RECURRING_EXPENSE_SOURCE_TYPE.RECURRING,
    sourceRecurringExpenseID: template.recurringExpenseID,
    generatedAt: overrides.generatedAt || new Date(),
  };
}
