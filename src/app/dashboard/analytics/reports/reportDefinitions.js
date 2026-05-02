export const REPORT_DEFINITIONS = [
  {
    slug: 'sales-tax',
    title: 'Sales Tax Report',
    description: 'Taxable sales, non-taxable sales, tax collected, and period totals.',
    source: 'summary',
  },
  {
    slug: 'revenue',
    title: 'Revenue Report',
    description: 'Invoice-timed revenue with go-live and legacy carryover breakdowns.',
    source: 'summary',
  },
  {
    slug: 'labor',
    title: 'Labor Report',
    description: 'Jeweler labor hours, labor pay, pending review counts, and payroll-paid totals.',
    source: 'reports',
  },
  {
    slug: 'payroll',
    title: 'Payroll Report',
    description: 'Weekly payroll batch history, paid/unpaid status, and payment metadata.',
    source: 'reports',
  },
  {
    slug: 'accounts-receivable',
    title: 'Accounts Receivable Report',
    description: 'Open invoices, aging buckets, and outstanding wholesale versus retail balances.',
    source: 'reports',
  },
  {
    slug: 'cash-collected',
    title: 'Cash Collected Report',
    description: 'Completed payments by method with collected totals and legacy carryover visibility.',
    source: 'reports',
  },
  {
    slug: 'federal-tax-reserve',
    title: 'Federal Tax Reserve Report',
    description: 'Estimated tax reserve and spendable cash using tracked collections, payroll, and owner draws.',
    source: 'reports',
  },
  {
    slug: 'expenses',
    title: 'Expense Report',
    description: 'Tracked business expenses by category, vendor, deductibility, and payment method.',
    source: 'reports',
  },
  {
    slug: 'wholesale-performance',
    title: 'Wholesale Performance Report',
    description: 'Store-level revenue, unpaid balances, active repairs, and pickup workload.',
    source: 'reports',
  },
  {
    slug: 'closeout-bottlenecks',
    title: 'Closeout Bottlenecks Report',
    description: 'Completed jobs not invoiced, pickup jobs unpaid, and labor-review blockers.',
    source: 'reports',
  },
];

export function getReportDefinition(reportSlug) {
  return REPORT_DEFINITIONS.find((report) => report.slug === reportSlug) || null;
}
