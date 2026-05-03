"use client";

import Button from '@mui/material/Button';
import ReportDetailPageClient from '@/app/dashboard/analytics/reports/ReportDetailPageClient';

export default function FinanceTaxReservePage() {
  return (
    <ReportDetailPageClient
      reportSlug="federal-tax-reserve"
      backHref="/dashboard/finance"
      backLabel="Back to Finance"
      extraActions={(
        <Button
          variant="contained"
          href="/dashboard/finance/expenses"
          sx={{ textTransform: 'none' }}
        >
          Manage Expenses
        </Button>
      )}
    />
  );
}
