"use client";

import ReportDetailPageClient from '@/app/dashboard/analytics/reports/ReportDetailPageClient';

export default function FinanceExpensesPage() {
  return (
    <ReportDetailPageClient
      reportSlug="expenses"
      backHref="/dashboard/finance"
      backLabel="Back to Finance"
      managementMode
    />
  );
}
