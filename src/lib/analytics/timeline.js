import { format, subDays, subWeeks, subMonths, subQuarters, subYears, startOfWeek, startOfMonth, startOfQuarter, startOfYear, endOfWeek, endOfMonth, endOfQuarter, endOfYear } from 'date-fns';

export const TIMELINE_OPTIONS = [
  { value: 'last_7_days', label: 'Last 7 days' },
  { value: 'last_30_days', label: 'Last 30 days' },
  { value: 'last_3_months', label: 'Last 3 months' },
  { value: 'last_12_months', label: 'Last 12 months' },
  { value: 'week_to_date', label: 'Week to date' },
  { value: 'month_to_date', label: 'Month to date' },
  { value: 'quarter_to_date', label: 'Quarter to date' },
  { value: 'year_to_date', label: 'Year to date' },
  { value: 'last_week', label: 'Last week' },
  { value: 'last_month', label: 'Last month' },
  { value: 'last_quarter', label: 'Last quarter' },
  { value: 'last_year', label: 'Last year' }
];

export function getDateRangeForTimeline(timeline) {
  const now = new Date();
  
  switch (timeline) {
    case 'last_7_days':
      return { since: format(subDays(now, 7), 'yyyy-MM-dd'), until: format(now, 'yyyy-MM-dd') };
    case 'last_30_days':
      return { since: format(subDays(now, 30), 'yyyy-MM-dd'), until: format(now, 'yyyy-MM-dd') };
    case 'last_3_months':
      return { since: format(subMonths(now, 3), 'yyyy-MM-dd'), until: format(now, 'yyyy-MM-dd') };
    case 'last_12_months':
      return { since: format(subMonths(now, 12), 'yyyy-MM-dd'), until: format(now, 'yyyy-MM-dd') };
    case 'week_to_date':
      return { since: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'), until: format(now, 'yyyy-MM-dd') };
    case 'month_to_date':
      return { since: format(startOfMonth(now), 'yyyy-MM-dd'), until: format(now, 'yyyy-MM-dd') };
    case 'quarter_to_date':
      return { since: format(startOfQuarter(now), 'yyyy-MM-dd'), until: format(now, 'yyyy-MM-dd') };
    case 'year_to_date':
      return { since: format(startOfYear(now), 'yyyy-MM-dd'), until: format(now, 'yyyy-MM-dd') };
    case 'last_week': {
      const start = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      const end = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      return { since: format(start, 'yyyy-MM-dd'), until: format(end, 'yyyy-MM-dd') };
    }
    case 'last_month': {
      const lm = subMonths(now, 1);
      return { since: format(startOfMonth(lm), 'yyyy-MM-dd'), until: format(endOfMonth(lm), 'yyyy-MM-dd') };
    }
    case 'last_quarter': {
      const lq = subQuarters(now, 1);
      return { since: format(startOfQuarter(lq), 'yyyy-MM-dd'), until: format(endOfQuarter(lq), 'yyyy-MM-dd') };
    }
    case 'last_year': {
      const ly = subYears(now, 1);
      return { since: format(startOfYear(ly), 'yyyy-MM-dd'), until: format(endOfYear(ly), 'yyyy-MM-dd') };
    }
    default:
      return { since: format(subDays(now, 30), 'yyyy-MM-dd'), until: format(now, 'yyyy-MM-dd') };
  }
}
