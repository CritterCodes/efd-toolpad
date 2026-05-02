"use client";

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DownloadIcon from '@mui/icons-material/Download';
import PrintIcon from '@mui/icons-material/Print';
import { ANALYTICS_DATE_RANGE_OPTIONS } from '@/services/repairAnalytics';
import { getReportDefinition } from './reportDefinitions';

function formatMoney(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(value || 0));
}

function formatDate(value, withTime = false) {
  if (!value) return 'N/A';
  return new Date(value).toLocaleString('en-US', withTime ? {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  } : {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatPeriod(filters = {}) {
  if (!filters.startDate && !filters.endDate) return 'All time';
  const start = formatDate(filters.startDate);
  const end = formatDate(filters.endDate);
  return `${start} - ${end}`;
}

function downloadCsv(filename, rows, columns) {
  const escapeCell = (value) => {
    const text = String(value ?? '');
    if (/[",\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  const header = columns.map((column) => escapeCell(column.label)).join(',');
  const lines = rows.map((row) => columns.map((column) => escapeCell(
    typeof column.value === 'function' ? column.value(row) : row[column.value]
  )).join(','));
  const csv = [header, ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function SummaryCard({ label, value, note }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
        <Typography variant="h5" fontWeight={700} sx={{ mt: 1 }}>{value}</Typography>
        {note && <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{note}</Typography>}
      </CardContent>
    </Card>
  );
}

function ReportTable({ columns, rows }) {
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          {columns.map((column) => (
            <TableCell key={column.label} align={column.align || 'left'}>
              {column.label}
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row, index) => (
          <TableRow key={row.id || row.invoiceID || row.repairID || row.batchID || row.userID || row.storeKey || index}>
            {columns.map((column) => (
              <TableCell key={column.label} align={column.align || 'left'}>
                {typeof column.render === 'function'
                  ? column.render(row)
                  : (typeof column.value === 'function' ? column.value(row) : row[column.value])}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function buildReportConfig(reportSlug, summary, reports) {
  switch (reportSlug) {
    case 'sales-tax':
      return {
        summaryCards: [
          { label: 'Taxable Sales', value: String(summary?.salesTax?.totals?.taxable || 0) },
          { label: 'Non-Taxable Sales', value: String(summary?.salesTax?.totals?.nonTaxable || 0) },
          { label: 'Tax Collected', value: formatMoney(summary?.salesTax?.totals?.taxCollected) },
          { label: 'Revenue', value: formatMoney(summary?.salesTax?.totals?.revenue) },
        ],
        sections: [
          {
            title: 'Sales Tax Detail',
            rows: summary?.salesTax?.rows || [],
            columns: [
              { label: 'Month', value: 'month' },
              { label: 'Taxable', value: 'taxable', align: 'right' },
              { label: 'Non-Taxable', value: 'nonTaxable', align: 'right' },
              { label: 'Tax Collected', render: (row) => formatMoney(row.taxCollected), align: 'right' },
              { label: 'Revenue', render: (row) => formatMoney(row.revenue), align: 'right' },
            ],
            exportColumns: [
              { label: 'Month', value: 'month' },
              { label: 'Taxable', value: 'taxable' },
              { label: 'Non-Taxable', value: 'nonTaxable' },
              { label: 'Tax Collected', value: (row) => row.taxCollected },
              { label: 'Revenue', value: (row) => row.revenue },
            ],
          },
        ],
      };
    case 'revenue':
      return {
        summaryCards: [
          { label: 'Revenue This Period', value: formatMoney(summary?.revenue?.totalRevenue) },
          { label: 'Go-Live Revenue', value: formatMoney(summary?.revenue?.goLiveRevenue) },
          { label: 'Legacy Carryover', value: formatMoney(summary?.revenue?.legacyCarryoverRevenue) },
          { label: 'Collected Revenue', value: formatMoney(summary?.revenue?.collectedRevenue) },
        ],
        sections: [
          {
            title: 'Revenue Trend',
            rows: summary?.revenueTrend || [],
            columns: [
              { label: 'Month', value: 'month' },
              { label: 'Retail', render: (row) => formatMoney(row.retail), align: 'right' },
              { label: 'Wholesale', render: (row) => formatMoney(row.wholesale), align: 'right' },
              { label: 'Go-Live', render: (row) => formatMoney(row.goLive), align: 'right' },
              { label: 'Legacy', render: (row) => formatMoney(row.legacy), align: 'right' },
            ],
            exportColumns: [
              { label: 'Month', value: 'month' },
              { label: 'Retail', value: (row) => row.retail },
              { label: 'Wholesale', value: (row) => row.wholesale },
              { label: 'Go-Live', value: (row) => row.goLive },
              { label: 'Legacy', value: (row) => row.legacy },
            ],
          },
        ],
      };
    case 'labor':
      return {
        summaryCards: [
          { label: 'Labor Hours', value: Number(reports?.jewelerPerformance?.summary?.totalHours || 0).toFixed(2) },
          { label: 'Labor Pay', value: formatMoney(reports?.jewelerPerformance?.summary?.totalPay) },
          { label: 'Payroll Paid', value: formatMoney(reports?.jewelerPerformance?.summary?.payrollPaid) },
          { label: 'Pending Review', value: String(reports?.jewelerPerformance?.summary?.pendingReviewCount || 0) },
        ],
        sections: [
          {
            title: 'Jeweler Labor Detail',
            rows: reports?.jewelerPerformance?.rows || [],
            columns: [
              { label: 'Jeweler', render: (row) => row.isOwnerOperator ? `${row.userName} (Owner/Operator)` : row.userName },
              { label: 'Hours', render: (row) => row.laborHours.toFixed(2), align: 'right' },
              { label: 'Labor Pay', render: (row) => formatMoney(row.laborPay), align: 'right' },
              { label: 'Repairs', value: 'repairsWorked', align: 'right' },
              { label: 'Pending Review', value: 'pendingReviewCount', align: 'right' },
              { label: 'Paid Through Payroll', render: (row) => formatMoney(row.paidThroughPayroll), align: 'right' },
            ],
            exportColumns: [
              { label: 'Jeweler', value: (row) => row.userName },
              { label: 'Owner Operator', value: (row) => row.isOwnerOperator ? 'Yes' : 'No' },
              { label: 'Hours', value: (row) => row.laborHours },
              { label: 'Labor Pay', value: (row) => row.laborPay },
              { label: 'Repairs Worked', value: 'repairsWorked' },
              { label: 'Pending Review Count', value: 'pendingReviewCount' },
              { label: 'Paid Through Payroll', value: (row) => row.paidThroughPayroll },
            ],
          },
        ],
      };
    case 'payroll':
      return {
        summaryCards: [
          { label: 'Payroll Batches', value: String(reports?.payroll?.summary?.batchCount || 0) },
          { label: 'Total Payroll', value: formatMoney(reports?.payroll?.summary?.totalPay) },
          { label: 'Paid Total', value: formatMoney(reports?.payroll?.summary?.paidTotal) },
          { label: 'Unpaid Total', value: formatMoney(reports?.payroll?.summary?.unpaidTotal) },
        ],
        sections: [
          {
            title: 'Payroll Batch Detail',
            rows: reports?.payroll?.rows || [],
            columns: [
              { label: 'Week', render: (row) => `${formatDate(row.weekStart)} - ${formatDate(row.weekEnd)}` },
              { label: 'Jeweler', render: (row) => row.isOwnerOperator ? `${row.userName} (Owner/Operator)` : row.userName },
              { label: 'Status', value: 'status' },
              { label: 'Hours', render: (row) => row.laborHours.toFixed(2), align: 'right' },
              { label: 'Pay', render: (row) => formatMoney(row.laborPay), align: 'right' },
              { label: 'Method', value: 'paymentMethod' },
              { label: 'Paid At', render: (row) => formatDate(row.paidAt), align: 'right' },
            ],
            exportColumns: [
              { label: 'Batch ID', value: 'batchID' },
              { label: 'Week Start', value: (row) => formatDate(row.weekStart) },
              { label: 'Week End', value: (row) => formatDate(row.weekEnd) },
              { label: 'Jeweler', value: 'userName' },
              { label: 'Owner Operator', value: (row) => row.isOwnerOperator ? 'Yes' : 'No' },
              { label: 'Status', value: 'status' },
              { label: 'Hours', value: (row) => row.laborHours },
              { label: 'Pay', value: (row) => row.laborPay },
              { label: 'Repairs Worked', value: 'repairsWorked' },
              { label: 'Entry Count', value: 'entryCount' },
              { label: 'Payment Method', value: 'paymentMethod' },
              { label: 'Payment Reference', value: 'paymentReference' },
              { label: 'Paid At', value: (row) => formatDate(row.paidAt) },
            ],
          },
        ],
      };
    case 'accounts-receivable':
      return {
        summaryCards: [
          { label: 'Outstanding Balance', value: formatMoney(reports?.accountsReceivable?.summary?.outstandingBalance) },
          { label: 'Open Invoices', value: String(reports?.accountsReceivable?.summary?.invoiceCount || 0) },
          { label: 'Overdue Invoices', value: String(reports?.accountsReceivable?.summary?.overdueCount || 0) },
          { label: 'Wholesale Outstanding', value: formatMoney(reports?.accountsReceivable?.summary?.wholesaleOutstanding) },
        ],
        sections: [
          {
            title: 'Receivables Detail',
            rows: reports?.accountsReceivable?.rows || [],
            columns: [
              { label: 'Invoice', value: 'invoiceID' },
              { label: 'Account', value: 'accountName' },
              { label: 'Type', value: 'accountType' },
              { label: 'Aging', value: 'agingBucket' },
              { label: 'Days Open', value: 'daysOpen', align: 'right' },
              { label: 'Remaining', render: (row) => formatMoney(row.remainingBalance), align: 'right' },
            ],
            exportColumns: [
              { label: 'Invoice', value: 'invoiceID' },
              { label: 'Account', value: 'accountName' },
              { label: 'Account Type', value: 'accountType' },
              { label: 'Status', value: 'status' },
              { label: 'Payment Status', value: 'paymentStatus' },
              { label: 'Aging Bucket', value: 'agingBucket' },
              { label: 'Days Open', value: 'daysOpen' },
              { label: 'Remaining Balance', value: (row) => row.remainingBalance },
            ],
          },
        ],
      };
    case 'cash-collected':
      return {
        summaryCards: [
          { label: 'Cash Collected', value: formatMoney(reports?.cashCollected?.summary?.totalCollected) },
          { label: 'Payments', value: String(reports?.cashCollected?.summary?.paymentCount || 0) },
          { label: 'Legacy Carryover', value: formatMoney(reports?.cashCollected?.summary?.legacyCarryoverCollected) },
          { label: 'Average Payment', value: formatMoney(reports?.cashCollected?.summary?.averagePayment) },
        ],
        sections: [
          {
            title: 'Payment Detail',
            rows: reports?.cashCollected?.rows || [],
            columns: [
              { label: 'Received At', render: (row) => formatDate(row.receivedAt, true) },
              { label: 'Invoice', value: 'invoiceID' },
              { label: 'Account', value: 'accountName' },
              { label: 'Method', value: 'method' },
              { label: 'Amount', render: (row) => formatMoney(row.amount), align: 'right' },
            ],
            exportColumns: [
              { label: 'Received At', value: (row) => formatDate(row.receivedAt, true) },
              { label: 'Invoice', value: 'invoiceID' },
              { label: 'Account', value: 'accountName' },
              { label: 'Account Type', value: 'accountType' },
              { label: 'Method', value: 'method' },
              { label: 'Amount', value: (row) => row.amount },
              { label: 'Legacy Carryover', value: (row) => row.legacyCarryover ? 'Yes' : 'No' },
            ],
          },
        ],
      };
    case 'wholesale-performance':
      return {
        summaryCards: [
          { label: 'Stores', value: String(reports?.wholesalePerformance?.summary?.stores || 0) },
          { label: 'Revenue', value: formatMoney(reports?.wholesalePerformance?.summary?.revenue) },
          { label: 'Unpaid Balance', value: formatMoney(reports?.wholesalePerformance?.summary?.unpaidBalance) },
          { label: 'Pending Pickup', value: String(reports?.wholesalePerformance?.summary?.pendingPickup || 0) },
        ],
        sections: [
          {
            title: 'Wholesale Store Detail',
            rows: reports?.wholesalePerformance?.rows || [],
            columns: [
              { label: 'Store', value: 'storeName' },
              { label: 'Revenue', render: (row) => formatMoney(row.revenue), align: 'right' },
              { label: 'Unpaid', render: (row) => formatMoney(row.unpaidBalance), align: 'right' },
              { label: 'Active Repairs', value: 'activeRepairs', align: 'right' },
              { label: 'Pending Pickup', value: 'pendingPickup', align: 'right' },
            ],
            exportColumns: [
              { label: 'Store', value: 'storeName' },
              { label: 'Revenue', value: (row) => row.revenue },
              { label: 'Unpaid Balance', value: (row) => row.unpaidBalance },
              { label: 'Invoice Count', value: 'invoiceCount' },
              { label: 'Active Repairs', value: 'activeRepairs' },
              { label: 'Pending Pickup', value: 'pendingPickup' },
            ],
          },
        ],
      };
    case 'closeout-bottlenecks': {
      const completedRows = (reports?.closeoutBottlenecks?.completedUninvoiced || []).map((row) => ({
        section: 'Completed not invoiced',
        identifier: row.repairID,
        clientName: row.clientName,
        status: row.status,
        amount: row.totalCost,
        date: row.completedAt,
      }));
      const pickupRows = (reports?.closeoutBottlenecks?.readyForPickupUnpaid || []).map((row) => ({
        section: 'Pickup unpaid',
        identifier: row.repairID,
        clientName: row.clientName,
        status: row.status,
        amount: row.remainingBalance,
        date: null,
      }));
      const reviewRows = (reports?.closeoutBottlenecks?.laborReviewBlocked || []).map((row) => ({
        section: 'Labor review blocked',
        identifier: row.repairID,
        clientName: row.clientName,
        status: row.jeweler,
        amount: row.creditedValue,
        date: row.createdAt,
      }));
      const allRows = [...completedRows, ...pickupRows, ...reviewRows];
      return {
        summaryCards: [
          { label: 'Completed Uninvoiced', value: String(reports?.closeoutBottlenecks?.summary?.completedUninvoicedCount || 0) },
          { label: 'Pickup Unpaid', value: String(reports?.closeoutBottlenecks?.summary?.readyForPickupUnpaidCount || 0) },
          { label: 'Labor Review Blocked', value: String(reports?.closeoutBottlenecks?.summary?.laborReviewBlockedCount || 0) },
          { label: 'Total Exceptions', value: String(allRows.length) },
        ],
        sections: [
          {
            title: 'Closeout Exception Detail',
            rows: allRows,
            columns: [
              { label: 'Section', value: 'section' },
              { label: 'Repair', value: 'identifier' },
              { label: 'Client', value: 'clientName' },
              { label: 'Status / Jeweler', value: 'status' },
              { label: 'Amount', render: (row) => formatMoney(row.amount), align: 'right' },
            ],
            exportColumns: [
              { label: 'Section', value: 'section' },
              { label: 'Repair', value: 'identifier' },
              { label: 'Client', value: 'clientName' },
              { label: 'Status or Jeweler', value: 'status' },
              { label: 'Amount', value: (row) => row.amount },
              { label: 'Date', value: (row) => formatDate(row.date, true) },
            ],
          },
        ],
      };
    }
    default:
      return null;
  }
}

export default function ReportDetailPageClient({ reportSlug }) {
  const router = useRouter();
  const reportDefinition = getReportDefinition(reportSlug);
  const [dateRange, setDateRange] = React.useState('this_month');
  const [summary, setSummary] = React.useState(null);
  const [reports, setReports] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [summaryResponse, reportsResponse] = await Promise.all([
          fetch(`/api/analytics/summary?dateRange=${encodeURIComponent(dateRange)}&includeLegacy=true`),
          fetch(`/api/analytics/reports?dateRange=${encodeURIComponent(dateRange)}`),
        ]);
        const [summaryData, reportsData] = await Promise.all([
          summaryResponse.json(),
          reportsResponse.json(),
        ]);
        if (!summaryResponse.ok) throw new Error(summaryData.error || 'Failed to load analytics summary.');
        if (!reportsResponse.ok) throw new Error(reportsData.error || 'Failed to load analytics reports.');
        if (active) {
          setSummary(summaryData);
          setReports(reportsData);
        }
      } catch (err) {
        if (active) setError(err.message || 'Failed to load report.');
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => { active = false; };
  }, [dateRange]);

  const reportConfig = React.useMemo(
    () => buildReportConfig(reportSlug, summary, reports),
    [reportSlug, summary, reports]
  );

  if (!reportDefinition) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">Unknown report.</Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  const exportSection = reportConfig?.sections?.[0];

  return (
    <Box sx={{ p: 4 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push('/dashboard/analytics/reports')}
            sx={{ mb: 1.5 }}
          >
            Back to Reports
          </Button>
          <Typography variant="h4" fontWeight="bold">{reportDefinition.title}</Typography>
          <Typography variant="body2" color="text.secondary">
            {reportDefinition.description}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="flex-start">
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={() => window.print()}
          >
            Print
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={() => {
              if (!exportSection) return;
              downloadCsv(
                `${reportSlug}-${dateRange}.csv`,
                exportSection.rows,
                exportSection.exportColumns || exportSection.columns
              );
            }}
          >
            Export CSV
          </Button>
        </Stack>
      </Stack>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
        {ANALYTICS_DATE_RANGE_OPTIONS.map((range) => (
          <Chip
            key={range.value}
            label={range.label}
            onClick={() => setDateRange(range.value)}
            color={dateRange === range.value ? 'primary' : 'default'}
            variant={dateRange === range.value ? 'filled' : 'outlined'}
            sx={{ cursor: 'pointer' }}
          />
        ))}
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {summary?.baseline?.note && <Alert severity="info" sx={{ mb: 2 }}>{summary.baseline.note}</Alert>}

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={0.75}>
            <Typography variant="overline" color="text.secondary">Reporting period</Typography>
            <Typography variant="h6">{formatPeriod(reports?.filters || summary?.filters || {})}</Typography>
            <Typography variant="body2" color="text.secondary">
              Generated {formatDate(new Date(), true)}
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(4, minmax(0, 1fr))' },
          gap: 2,
          mb: 3,
        }}
      >
        {(reportConfig?.summaryCards || []).map((card) => (
          <SummaryCard key={card.label} {...card} />
        ))}
      </Box>

      <Stack spacing={3}>
        {(reportConfig?.sections || []).map((section) => (
          <Card variant="outlined" key={section.title}>
            <CardContent>
              <Typography variant="h6" fontWeight={700}>{section.title}</Typography>
              <Divider sx={{ my: 2 }} />
              <ReportTable columns={section.columns} rows={section.rows || []} />
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Box>
  );
}
