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
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DownloadIcon from '@mui/icons-material/Download';
import Checkbox from '@mui/material/Checkbox';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PrintIcon from '@mui/icons-material/Print';
import { ANALYTICS_DATE_RANGE_OPTIONS } from '@/services/repairAnalytics';
import {
  BUSINESS_EXPENSE_CATEGORIES,
  BUSINESS_EXPENSE_PAYMENT_METHODS,
  BUSINESS_EXPENSE_STATUS,
} from '@/services/businessExpenses';
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

function formatDateInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function formatDateBoundary(value) {
  if (!value) return 'N/A';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value));
}

function formatPeriod(filters = {}) {
  if (!filters.startDate && !filters.endDate) return 'All time';
  const start = formatDateBoundary(filters.startDate);
  const end = formatDateBoundary(filters.endDate);
  return `${start} - ${end}`;
}

function downloadCsvSections(filename, sections) {
  const lines = [];
  const escapeCell = (value) => {
    const text = String(value ?? '');
    if (/[",\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  sections.forEach((section, index) => {
    if (index > 0) lines.push('');
    lines.push(escapeCell(section.title));
    const columns = section.exportColumns || section.columns || [];
    lines.push(columns.map((column) => escapeCell(column.label)).join(','));
    (section.rows || []).forEach((row) => {
      lines.push(columns.map((column) => escapeCell(
        typeof column.value === 'function' ? column.value(row) : row[column.value]
      )).join(','));
    });
  });

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function SummaryCard({ label, value, note, breakdown }) {
  const [expanded, setExpanded] = React.useState(false);
  const hasBreakdown = Array.isArray(breakdown) && breakdown.length > 0;

  return (
    <Card
      variant="outlined"
      onClick={hasBreakdown ? () => setExpanded((current) => !current) : undefined}
      onKeyDown={hasBreakdown ? (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setExpanded((current) => !current);
        }
      } : undefined}
      role={hasBreakdown ? 'button' : undefined}
      tabIndex={hasBreakdown ? 0 : undefined}
      sx={{
        cursor: hasBreakdown ? 'pointer' : 'default',
        '&:hover': hasBreakdown ? { borderColor: 'primary.main' } : undefined,
      }}
    >
      <CardContent>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
        <Typography variant="h5" fontWeight={700} sx={{ mt: 1 }}>{value}</Typography>
        {note && <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{note}</Typography>}
        {hasBreakdown && (
          <>
            <Typography variant="caption" color="primary" sx={{ display: 'block', mt: 1.25 }}>
              {expanded ? 'Hide math' : 'Click to see math'}
            </Typography>
            {expanded && (
              <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                <Stack spacing={0.75}>
                  {breakdown.map((row) => (
                    <Box
                      key={row.label}
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: '24px minmax(0, 1fr) auto',
                        gap: 1,
                        alignItems: 'baseline',
                      }}
                    >
                      <Typography variant="body2" color={row.operator === '=' ? 'primary' : 'text.secondary'}>
                        {row.operator}
                      </Typography>
                      <Typography variant="body2" color={row.operator === '=' ? 'primary' : 'text.secondary'}>
                        {row.label}
                      </Typography>
                      <Typography variant="body2" fontWeight={row.operator === '=' ? 700 : 500}>
                        {row.value}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function getReportCellValue(column, row) {
  if (typeof column.render === 'function') return column.render(row);
  if (typeof column.value === 'function') return column.value(row);
  return row[column.value];
}

function renderReportCellValue(value) {
  return value === null || value === undefined || value === '' ? 'N/A' : value;
}

function ReportTable({ columns, rows }) {
  return (
    <>
      <Stack spacing={1.25} sx={{ display: { xs: 'flex', md: 'none' } }}>
        {rows.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No rows for this period.</Typography>
        ) : rows.map((row, index) => (
          <Box
            key={row.id || row.invoiceID || row.repairID || row.batchID || row.userID || row.storeKey || index}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              p: 1.5,
              bgcolor: 'background.default',
            }}
          >
            <Stack spacing={1}>
              {columns.map((column) => (
                <Stack
                  key={column.label}
                  direction="row"
                  justifyContent="space-between"
                  alignItems="flex-start"
                  spacing={2}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ textTransform: 'uppercase', letterSpacing: 0, flex: '0 0 42%' }}
                  >
                    {column.label}
                  </Typography>
                  <Box sx={{ flex: 1, minWidth: 0, textAlign: 'right', overflowWrap: 'anywhere' }}>
                    {renderReportCellValue(getReportCellValue(column, row))}
                  </Box>
                </Stack>
              ))}
            </Stack>
          </Box>
        ))}
      </Stack>

      <Box sx={{ display: { xs: 'none', md: 'block' }, overflowX: 'auto' }}>
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
                    {getReportCellValue(column, row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </>
  );
}

function buildReportConfig(reportSlug, summary, reports, actions = {}) {
  switch (reportSlug) {
    case 'financial-foundation': {
      const foundationSummary = reports?.federalTaxReserve?.summary || {};
      const bankSafeToSpend = reports?.bankSafeToSpend || {};
      const bankSafeSummary = bankSafeToSpend.summary || {};
      const debtSummary = reports?.debtFoundation?.summary || {};
      const debtCashInflows = Number(bankSafeSummary.debtCashInflows || 0);
      const merchantPayoutPending = Number(bankSafeSummary.merchantPayoutPending || 0);
      const estimatedCashOnHand = bankSafeToSpend.configured
        ? Number(bankSafeSummary.estimatedCashOnHand ?? (
          Number(bankSafeSummary.openingCash || 0)
          + Number(bankSafeSummary.cashCollected || 0)
          - merchantPayoutPending
          + debtCashInflows
          - Number(bankSafeSummary.contractorPayrollPaid || 0)
          - Number(bankSafeSummary.ownerCashBurden || 0)
          - Number(bankSafeSummary.trackedExpenses || 0)
          - Number(bankSafeSummary.debtPaymentsMade || 0)
        ))
        : null;
      const debtAdjustedSafeToSpend = bankSafeToSpend.configured
        ? Number(bankSafeSummary.bankSafeToSpend || 0) - Number(debtSummary.upcomingDebtPayments || 0)
        : null;
      const ownerBurden = Number(foundationSummary.ownerOperatorPayrollPaid || 0)
        + Number(foundationSummary.ownerDraws || 0);
      const ownerInclusiveSafeToSpend = Number(foundationSummary.safeToSpendAfterScheduled || 0) - ownerBurden;
      const payrollAndOwnerRows = [
        ...(reports?.federalTaxReserve?.payrollRows || []).map((row) => ({
          ...row,
          rowType: row.isOwnerOperator ? 'Owner/operator payroll' : 'Contractor payroll',
          date: row.paidAt,
          name: row.userName,
          method: row.paymentMethod,
          amount: row.totalPay,
          reference: row.paymentReference,
        })),
        ...(reports?.federalTaxReserve?.ownerDrawRows || []).map((row) => ({
          ...row,
          rowType: 'Owner draw',
          date: row.drawDate,
          name: row.userName,
          method: row.paymentMethod,
          amount: row.amount,
          reference: row.paymentReference,
        })),
      ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      const foundationNotes = [
        {
          id: 'unpaid-labor',
          area: 'Unpaid labor owed',
          status: 'Current estimate pending',
          note: 'Step 1 does not finalize unpaid labor liability. Step 2 will define the canonical calculation from approved labor logs and unpaid payroll batches.',
        },
        {
          id: 'materials-cogs',
          area: 'Material cost basis / COGS',
          status: 'Coming foundation check',
          note: 'This report does not treat repair material charges as actual material cost. Inventory, recycled stock, and cost-basis checks come in a later step.',
        },
        {
          id: 'safe-to-spend',
          area: 'Period safe-to-spend',
          status: 'Current estimate',
          note: 'Uses the selected report period only. Bank Safe-To-Spend uses the opening balance floor instead.',
        },
      ];
      if (!bankSafeToSpend.configured) {
        foundationNotes.unshift({
          id: 'opening-balance',
          area: 'Opening balance',
          status: 'Not configured',
          note: 'Add the opening balance in Finance > Opening Balance to estimate spendable business cash from the clean start line.',
        });
      }
      const periodSafeToSpendBreakdown = [
        { operator: '+', label: 'Collected revenue in selected period', value: formatMoney(foundationSummary.cashCollected) },
        { operator: '-', label: 'Sales tax held', value: formatMoney(foundationSummary.salesTaxHeld) },
        { operator: '-', label: 'Paid contractor labor', value: formatMoney(foundationSummary.contractorPayrollPaid) },
        { operator: '-', label: 'Paid expenses', value: formatMoney(foundationSummary.trackedExpenses) },
        { operator: '-', label: 'Recommended federal reserve', value: formatMoney(foundationSummary.recommendedFederalReserve) },
        { operator: '-', label: 'Scheduled expenses', value: formatMoney(foundationSummary.scheduledCommittedExpenses) },
        { operator: '-', label: 'Owner cash burden', value: formatMoney(ownerBurden) },
        { operator: '=', label: 'Period Safe-To-Spend', value: formatMoney(ownerInclusiveSafeToSpend) },
      ];
      const bankSafeToSpendBreakdown = bankSafeToSpend.configured ? [
        { operator: '+', label: 'Opening bank + cash drawer', value: formatMoney(bankSafeSummary.openingCash) },
        { operator: '+', label: 'Collected payments after opening date', value: formatMoney(bankSafeSummary.cashCollected) },
        { operator: '-', label: 'Sales tax held after opening date', value: formatMoney(bankSafeSummary.salesTaxHeld) },
        { operator: '-', label: 'Paid contractor labor after opening date', value: formatMoney(bankSafeSummary.contractorPayrollPaid) },
        { operator: '-', label: 'Owner payroll + draws after opening date', value: formatMoney(bankSafeSummary.ownerCashBurden) },
        { operator: '-', label: 'Paid expenses after opening date', value: formatMoney(bankSafeSummary.trackedExpenses) },
        { operator: '-', label: 'Scheduled expenses after opening date', value: formatMoney(bankSafeSummary.scheduledCommittedExpenses) },
        { operator: '-', label: 'Debt payments made after opening date', value: formatMoney(bankSafeSummary.debtPaymentsMade) },
        { operator: '-', label: 'Recommended federal reserve after opening date', value: formatMoney(bankSafeSummary.recommendedFederalReserve) },
        { operator: '=', label: 'Bank Safe-To-Spend', value: formatMoney(bankSafeSummary.bankSafeToSpend) },
      ] : [
        { operator: '=', label: 'Bank Safe-To-Spend', value: 'Not configured' },
      ];
      const estimatedCashOnHandBreakdown = bankSafeToSpend.configured ? [
        { operator: '+', label: 'Opening bank + cash drawer', value: formatMoney(bankSafeSummary.openingCash) },
        { operator: '+', label: 'Collected payments after opening date', value: formatMoney(bankSafeSummary.cashCollected) },
        { operator: '-', label: 'Card payments not expected to land yet', value: formatMoney(merchantPayoutPending) },
        { operator: '+', label: 'Borrowed cash / loan inflows after opening date', value: formatMoney(debtCashInflows) },
        { operator: '-', label: 'Paid contractor labor after opening date', value: formatMoney(bankSafeSummary.contractorPayrollPaid) },
        { operator: '-', label: 'Owner payroll + draws after opening date', value: formatMoney(bankSafeSummary.ownerCashBurden) },
        { operator: '-', label: 'Paid expenses after opening date', value: formatMoney(bankSafeSummary.trackedExpenses) },
        { operator: '-', label: 'Debt payments made after opening date', value: formatMoney(bankSafeSummary.debtPaymentsMade) },
        { operator: '=', label: 'Estimated Cash On Hand', value: formatMoney(estimatedCashOnHand) },
      ] : [
        { operator: '=', label: 'Estimated Cash On Hand', value: 'Not configured' },
      ];
      const totalDebtBreakdown = (reports?.debtFoundation?.accountRows || []).length
        ? [
            ...(reports.debtFoundation.accountRows || []).map((row) => ({
              operator: '+',
              label: row.name,
              value: formatMoney(row.payoffBalance),
            })),
            { operator: '=', label: 'Total Debt Balance', value: formatMoney(debtSummary.totalDebtBalance) },
          ]
        : [{ operator: '=', label: 'Total Debt Balance', value: formatMoney(0) }];
      const debtAdjustedBreakdown = [
        { operator: '+', label: 'Bank Safe-To-Spend', value: bankSafeToSpend.configured ? formatMoney(bankSafeSummary.bankSafeToSpend) : 'Not configured' },
        { operator: '-', label: 'Upcoming debt payments', value: formatMoney(debtSummary.upcomingDebtPayments) },
        { operator: '=', label: 'Debt-Adjusted Safe-To-Spend', value: bankSafeToSpend.configured ? formatMoney(debtAdjustedSafeToSpend) : 'Not configured' },
      ];

      return {
        infoAlerts: [
          'This shell report composes existing analytics data only. It does not change invoice, payroll, expense, repair, or inventory workflows.',
          bankSafeToSpend.configured
            ? `Bank Safe-To-Spend starts from ${formatMoney(bankSafeSummary.openingCash)} opening cash on ${formatDate(bankSafeSummary.calculationStartDate)} and activity after that date.`
            : 'Bank Safe-To-Spend is not configured yet. Add the opening balance in Finance > Opening Balance.',
        ],
        summaryCards: [
          { label: 'Collected Revenue', value: formatMoney(reports?.cashCollected?.summary?.totalCollected), note: 'Completed payment rows on repair and sales invoices.' },
          { label: 'Sales Tax Held', value: formatMoney(foundationSummary.salesTaxHeld), note: 'Current estimate from collected invoice payments.' },
          { label: 'Unpaid Receivables', value: formatMoney(reports?.accountsReceivable?.summary?.outstandingBalance), note: `${reports?.accountsReceivable?.summary?.invoiceCount || 0} open invoice(s).` },
          { label: 'Paid Contractor Labor', value: formatMoney(foundationSummary.contractorPayrollPaid), note: 'Excludes owner/operator payroll.' },
          { label: 'Unpaid Labor Owed', value: 'Not finalized', note: 'Current estimate pending Step 2 canonical calculation.' },
          { label: 'Owner Cash Burden', value: formatMoney(ownerBurden), note: `Owner payroll: ${formatMoney(foundationSummary.ownerOperatorPayrollPaid)} | Draws: ${formatMoney(foundationSummary.ownerDraws)}` },
          { label: 'Paid Expenses', value: formatMoney(foundationSummary.trackedExpenses), note: 'Recorded paid business expenses.' },
          { label: 'Scheduled Expenses', value: formatMoney(foundationSummary.scheduledCommittedExpenses), note: 'Committed scheduled obligations in this period.' },
          {
            label: 'Period Safe-To-Spend',
            value: formatMoney(ownerInclusiveSafeToSpend),
            note: 'Selected period activity after reserve, scheduled obligations, and owner cash burden.',
            breakdown: periodSafeToSpendBreakdown,
          },
          {
            label: 'Estimated Cash On Hand',
            value: bankSafeToSpend.configured ? formatMoney(estimatedCashOnHand) : 'Not configured',
            note: bankSafeToSpend.configured
              ? 'Estimated actual bank/cash balance from recorded cash movement. Card payouts land next business day.'
              : 'Add opening balance in Finance > Opening Balance.',
            breakdown: estimatedCashOnHandBreakdown,
          },
          {
            label: 'Bank Safe-To-Spend',
            value: bankSafeToSpend.configured ? formatMoney(bankSafeSummary.bankSafeToSpend) : 'Not configured',
            note: bankSafeToSpend.configured
              ? `Opening balance floor: ${formatDate(bankSafeSummary.calculationStartDate)}. Bank imports are not included.`
              : 'Add opening balance in Finance > Opening Balance.',
            breakdown: bankSafeToSpendBreakdown,
          },
          {
            label: 'Total Debt Balance',
            value: formatMoney(debtSummary.totalDebtBalance),
            note: `Principal: ${formatMoney(debtSummary.totalPrincipalRemaining)} | Fees: ${formatMoney(debtSummary.totalFeeRemaining)}`,
            breakdown: totalDebtBreakdown,
          },
          {
            label: 'Upcoming Debt Payments',
            value: formatMoney(debtSummary.upcomingDebtPayments),
            note: `Principal: ${formatMoney(debtSummary.upcomingDebtPrincipal)} | Fees: ${formatMoney(debtSummary.upcomingDebtFees)}`,
          },
          {
            label: 'Debt Payments Made',
            value: formatMoney(debtSummary.debtPaymentsMade),
            note: `Principal: ${formatMoney(debtSummary.debtPrincipalPaid)} | Interest/fees: ${formatMoney(debtSummary.debtInterestFeesPaid)}`,
          },
          {
            label: 'Debt-Adjusted Safe-To-Spend',
            value: bankSafeToSpend.configured ? formatMoney(debtAdjustedSafeToSpend) : 'Not configured',
            note: 'Bank Safe-To-Spend minus upcoming required debt payments.',
            breakdown: debtAdjustedBreakdown,
          },
        ],
        sections: [
          {
            title: 'Cash Collection Detail',
            rows: reports?.federalTaxReserve?.payments || [],
            columns: [
              { label: 'Received At', render: (row) => formatDate(row.receivedAt, true) },
              { label: 'Invoice', value: 'invoiceID' },
              { label: 'Account', value: 'accountName' },
              { label: 'Method', value: 'method' },
              { label: 'Tax Held', render: (row) => formatMoney(row.taxHeld), align: 'right' },
              { label: 'Collected', render: (row) => formatMoney(row.amount), align: 'right' },
            ],
            exportColumns: [
              { label: 'Received At', value: (row) => formatDate(row.receivedAt, true) },
              { label: 'Invoice', value: 'invoiceID' },
              { label: 'Account', value: 'accountName' },
              { label: 'Account Type', value: 'accountType' },
              { label: 'Method', value: 'method' },
              { label: 'Tax Held', value: (row) => row.taxHeld },
              { label: 'Collected', value: (row) => row.amount },
            ],
          },
          {
            title: 'Receivables Detail',
            rows: reports?.accountsReceivable?.rows || [],
            columns: [
              { label: 'Invoice', value: 'invoiceID' },
              { label: 'Account', value: 'accountName' },
              { label: 'Type', value: 'accountType' },
              { label: 'Payment Status', value: 'paymentStatus' },
              { label: 'Aging', value: 'agingBucket' },
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
          {
            title: 'Payroll / Owner Burden Detail',
            rows: payrollAndOwnerRows,
            columns: [
              { label: 'Date', render: (row) => formatDate(row.date, true) },
              { label: 'Type', value: 'rowType' },
              { label: 'Name', value: 'name' },
              { label: 'Method', value: 'method' },
              { label: 'Reference', value: 'reference' },
              { label: 'Amount', render: (row) => formatMoney(row.amount), align: 'right' },
            ],
            exportColumns: [
              { label: 'Date', value: (row) => formatDate(row.date, true) },
              { label: 'Type', value: 'rowType' },
              { label: 'Name', value: 'name' },
              { label: 'Method', value: 'method' },
              { label: 'Reference', value: 'reference' },
              { label: 'Amount', value: (row) => row.amount },
            ],
          },
          {
            title: 'Expense Detail',
            rows: reports?.federalTaxReserve?.expenseRows || [],
            columns: [
              { label: 'Expense Date', render: (row) => formatDate(row.expenseDate, true) },
              { label: 'Paid At', render: (row) => formatDate(row.paidAt, true) },
              { label: 'Vendor', value: 'vendor' },
              { label: 'Category', value: 'category' },
              { label: 'Status', value: 'status' },
              { label: 'Deductible', render: (row) => row.isDeductible ? 'Yes' : 'No' },
              { label: 'Amount', render: (row) => formatMoney(row.amount), align: 'right' },
            ],
            exportColumns: [
              { label: 'Expense Date', value: (row) => formatDate(row.expenseDate, true) },
              { label: 'Paid At', value: (row) => formatDate(row.paidAt, true) },
              { label: 'Expense ID', value: 'expenseID' },
              { label: 'Vendor', value: 'vendor' },
              { label: 'Category', value: 'category' },
              { label: 'Source', value: 'sourceType' },
              { label: 'Payment Method', value: 'paymentMethod' },
              { label: 'Status', value: 'status' },
              { label: 'Deductible', value: (row) => row.isDeductible ? 'Yes' : 'No' },
              { label: 'Amount', value: (row) => row.amount },
              { label: 'Notes', value: 'notes' },
            ],
          },
          {
            title: 'Foundation Data Notes',
            rows: foundationNotes,
            columns: [
              { label: 'Area', value: 'area' },
              { label: 'Status', value: 'status' },
              { label: 'Note', value: 'note' },
            ],
            exportColumns: [
              { label: 'Area', value: 'area' },
              { label: 'Status', value: 'status' },
              { label: 'Note', value: 'note' },
            ],
          },
          {
            title: 'Debt Account Detail',
            rows: reports?.debtFoundation?.accountRows || [],
            columns: [
              { label: 'Account', value: 'name' },
              { label: 'Type', value: 'type' },
              { label: 'Lender', value: 'lender' },
              { label: 'Schedule', value: 'paymentSchedule' },
              { label: 'APR', render: (row) => row.interestRateAPR == null ? 'N/A' : `${Number(row.interestRateAPR).toFixed(2)}%` },
              { label: 'Payoff Balance', render: (row) => formatMoney(row.payoffBalance), align: 'right' },
              { label: 'Principal Left', render: (row) => formatMoney(row.principalRemaining), align: 'right' },
              { label: 'Fees Left', render: (row) => formatMoney(row.feeRemaining), align: 'right' },
              { label: 'Minimum Due', render: (row) => formatMoney(row.minimumPaymentDue), align: 'right' },
              { label: 'Next Payment', render: (row) => formatDate(row.nextDueDate) },
              { label: 'Upcoming Count', value: 'upcomingPaymentCount', align: 'right' },
              { label: 'Upcoming Total', render: (row) => formatMoney(row.upcomingPaymentAmount), align: 'right' },
              { label: 'Upcoming Fees', render: (row) => formatMoney(row.upcomingFeeAmount), align: 'right' },
            ],
            exportColumns: [
              { label: 'Account', value: 'name' },
              { label: 'Type', value: 'type' },
              { label: 'Lender', value: 'lender' },
              { label: 'Active', value: (row) => row.active ? 'Yes' : 'No' },
              { label: 'Schedule', value: 'paymentSchedule' },
              { label: 'APR', value: (row) => row.interestRateAPR ?? '' },
              { label: 'Payoff Balance', value: (row) => row.payoffBalance },
              { label: 'Principal Remaining', value: (row) => row.principalRemaining },
              { label: 'Fees Remaining', value: (row) => row.feeRemaining },
              { label: 'Minimum Due', value: (row) => row.minimumPaymentDue },
              { label: 'Next Payment', value: (row) => formatDate(row.nextDueDate) },
              { label: 'Upcoming Payment Count', value: 'upcomingPaymentCount' },
              { label: 'Upcoming Payment', value: (row) => row.upcomingPaymentAmount },
              { label: 'Upcoming Principal', value: (row) => row.upcomingPrincipalAmount },
              { label: 'Upcoming Fees', value: (row) => row.upcomingFeeAmount },
            ],
          },
          {
            title: 'Debt Payments Detail',
            rows: reports?.debtFoundation?.periodPaymentRows || [],
            columns: [
              { label: 'Paid At', render: (row) => formatDate(row.paymentDate, true) },
              { label: 'Account', value: 'accountName' },
              { label: 'Method', value: 'paymentMethod' },
              { label: 'Principal', render: (row) => formatMoney(row.principalAmount), align: 'right' },
              { label: 'Interest/Fees', render: (row) => formatMoney(row.debtCostPaid), align: 'right' },
              { label: 'Amount', render: (row) => formatMoney(row.amount), align: 'right' },
            ],
            exportColumns: [
              { label: 'Paid At', value: (row) => formatDate(row.paymentDate, true) },
              { label: 'Account', value: 'accountName' },
              { label: 'Payment Method', value: 'paymentMethod' },
              { label: 'Reference', value: 'paymentReference' },
              { label: 'Principal', value: (row) => row.principalAmount },
              { label: 'Interest', value: (row) => row.interestAmount },
              { label: 'Fees', value: (row) => row.feeAmount },
              { label: 'Amount', value: (row) => row.amount },
              { label: 'Notes', value: 'notes' },
            ],
          },
          {
            title: 'Debt Statement Detail',
            rows: reports?.debtFoundation?.statementRows || [],
            columns: [
              { label: 'Statement Date', render: (row) => formatDate(row.statementDate) },
              { label: 'Account', value: 'accountName' },
              { label: 'Balance', render: (row) => formatMoney(row.balance), align: 'right' },
              { label: 'Minimum Due', render: (row) => formatMoney(row.minimumPaymentDue), align: 'right' },
              { label: 'Due Date', render: (row) => formatDate(row.dueDate) },
              { label: 'Interest/Fees', render: (row) => formatMoney(row.debtCost), align: 'right' },
            ],
            exportColumns: [
              { label: 'Statement Date', value: (row) => formatDate(row.statementDate) },
              { label: 'Account', value: 'accountName' },
              { label: 'Balance', value: (row) => row.balance },
              { label: 'Minimum Due', value: (row) => row.minimumPaymentDue },
              { label: 'Due Date', value: (row) => formatDate(row.dueDate) },
              { label: 'Interest', value: (row) => row.interestCharged },
              { label: 'Fees', value: (row) => row.feesCharged },
              { label: 'Notes', value: 'notes' },
            ],
          },
        ],
      };
    }
    case 'sales-tax':
      return {
        summaryCards: [
          { label: 'Taxable Revenue', value: formatMoney(summary?.salesTax?.totals?.taxable) },
          { label: 'Non-Taxable Revenue', value: formatMoney(summary?.salesTax?.totals?.nonTaxable) },
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
          { label: 'Earned Hours', value: Number(reports?.jewelerPerformance?.summary?.totalHours || 0).toFixed(2) },
          { label: 'Earned Labor Pay', value: formatMoney(reports?.jewelerPerformance?.summary?.totalPay) },
          { label: 'Repairs Worked', value: String(reports?.jewelerPerformance?.rows?.reduce((sum, row) => sum + Number(row.repairsWorked || 0), 0) || 0) },
          { label: 'Pending Review', value: String(reports?.jewelerPerformance?.summary?.pendingReviewCount || 0) },
        ],
        sections: [
          {
            title: 'Earned Labor Detail',
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
            ],
          },
          {
            title: 'Payroll Settled in Period',
            rows: reports?.laborSettlement?.rows || [],
            columns: [
              { label: 'Jeweler', render: (row) => row.isOwnerOperator ? `${row.userName} (Owner/Operator)` : row.userName },
              { label: 'Paid Hours', render: (row) => row.paidHours.toFixed(2), align: 'right' },
              { label: 'Labor Paid', render: (row) => formatMoney(row.paidLaborAmount), align: 'right' },
              { label: 'Sales Paid', render: (row) => formatMoney(row.paidSalesAmount), align: 'right' },
              { label: 'Total Paid', render: (row) => formatMoney(row.paidAmount), align: 'right' },
              { label: 'Paid Batches', value: 'paidBatchCount', align: 'right' },
              { label: 'Methods', render: (row) => row.paymentMethods.join(', ') || 'N/A' },
            ],
            exportColumns: [
              { label: 'Jeweler', value: (row) => row.userName },
              { label: 'Owner Operator', value: (row) => row.isOwnerOperator ? 'Yes' : 'No' },
              { label: 'Paid Hours', value: (row) => row.paidHours },
              { label: 'Labor Paid', value: (row) => row.paidLaborAmount },
              { label: 'Sales Paid', value: (row) => row.paidSalesAmount },
              { label: 'Total Paid', value: (row) => row.paidAmount },
              { label: 'Paid Batches', value: 'paidBatchCount' },
              { label: 'Payment Methods', value: (row) => row.paymentMethods.join(', ') },
            ],
          },
        ],
      };
    case 'payroll':
      return {
        summaryCards: [
          { label: 'Payroll Batches', value: String(reports?.payroll?.summary?.batchCount || 0) },
          { label: 'Total Payroll', value: formatMoney(reports?.payroll?.summary?.totalCombinedPay) },
          { label: 'Labor Pay', value: formatMoney(reports?.payroll?.summary?.totalPay) },
          { label: 'Sales Payouts', value: formatMoney(reports?.payroll?.summary?.totalSalesPay) },
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
              { label: 'Labor Pay', render: (row) => formatMoney(row.laborPay), align: 'right' },
              { label: 'Sales Pay', render: (row) => formatMoney(row.salePay), align: 'right' },
              { label: 'Total Pay', render: (row) => formatMoney(row.totalPay), align: 'right' },
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
              { label: 'Labor Pay', value: (row) => row.laborPay },
              { label: 'Sales Pay', value: (row) => row.salePay },
              { label: 'Total Pay', value: (row) => row.totalPay },
              { label: 'Repairs Worked', value: 'repairsWorked' },
              { label: 'Sale Payout Count', value: 'salePayoutCount' },
              { label: 'Entry Count', value: 'entryCount' },
              { label: 'Payment Method', value: 'paymentMethod' },
              { label: 'Payment Reference', value: 'paymentReference' },
              { label: 'Paid At', value: (row) => formatDate(row.paidAt) },
            ],
          },
        ],
      };
    case 'sales-payouts':
      return {
        summaryCards: [
          { label: 'Total Sales Payouts', value: formatMoney(reports?.salesPayouts?.summary?.totalPayout) },
          { label: 'Paid Payouts', value: formatMoney(reports?.salesPayouts?.summary?.paidPayout) },
          { label: 'Unpaid Payouts', value: formatMoney(reports?.salesPayouts?.summary?.unpaidPayout) },
          { label: 'Gross Sales', value: formatMoney(reports?.salesPayouts?.summary?.grossSale) },
          { label: 'Consignment Fees', value: formatMoney(reports?.salesPayouts?.summary?.consignmentAmount) },
          { label: 'Labor Deductions', value: formatMoney(reports?.salesPayouts?.summary?.actualLaborDeduction) },
        ],
        sections: [
          {
            title: 'Payouts by Artisan',
            rows: reports?.salesPayouts?.bySeller || [],
            columns: [
              { label: 'Artisan', value: 'sellerName' },
              { label: 'Gross Sales', render: (row) => formatMoney(row.grossSale), align: 'right' },
              { label: 'Consignment', render: (row) => formatMoney(row.consignmentAmount), align: 'right' },
              { label: 'Labor Deduction', render: (row) => formatMoney(row.actualLaborDeduction), align: 'right' },
              { label: 'Paid', render: (row) => formatMoney(row.paidAmount), align: 'right' },
              { label: 'Unpaid', render: (row) => formatMoney(row.unpaidAmount), align: 'right' },
              { label: 'Total Payout', render: (row) => formatMoney(row.payoutAmount), align: 'right' },
            ],
            exportColumns: [
              { label: 'Artisan', value: 'sellerName' },
              { label: 'Seller User ID', value: 'sellerUserID' },
              { label: 'Gross Sales', value: (row) => row.grossSale },
              { label: 'Consignment', value: (row) => row.consignmentAmount },
              { label: 'Labor Deduction', value: (row) => row.actualLaborDeduction },
              { label: 'Paid', value: (row) => row.paidAmount },
              { label: 'Unpaid', value: (row) => row.unpaidAmount },
              { label: 'Total Payout', value: (row) => row.payoutAmount },
              { label: 'Payout Count', value: 'payoutCount' },
            ],
          },
          {
            title: 'Sales Payout Detail',
            rows: reports?.salesPayouts?.rows || [],
            columns: [
              { label: 'Week', render: (row) => formatDate(row.weekStart) },
              { label: 'Artisan', value: 'sellerName' },
              { label: 'Invoice', value: 'invoiceID' },
              { label: 'Description', value: 'saleDescription' },
              { label: 'Payroll', value: 'payrollStatus' },
              { label: 'Payout', render: (row) => formatMoney(row.payoutAmount), align: 'right' },
            ],
            exportColumns: [
              { label: 'Payout ID', value: 'payoutID' },
              { label: 'Invoice', value: 'invoiceID' },
              { label: 'Artisan', value: 'sellerName' },
              { label: 'Seller User ID', value: 'sellerUserID' },
              { label: 'Description', value: 'saleDescription' },
              { label: 'Gross Sale', value: (row) => row.grossSale },
              { label: 'Consignment', value: (row) => row.consignmentAmount },
              { label: 'Labor Deduction', value: (row) => row.actualLaborDeduction },
              { label: 'Payout Amount', value: (row) => row.payoutAmount },
              { label: 'Status', value: 'status' },
              { label: 'Payroll Status', value: 'payrollStatus' },
              { label: 'Payroll Batch', value: 'payrollBatchID' },
              { label: 'Week Start', value: (row) => formatDate(row.weekStart) },
              { label: 'Payrolled At', value: (row) => formatDate(row.payrolledAt, true) },
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
          { label: 'Go-Live Collected', value: formatMoney(reports?.cashCollected?.summary?.goLiveCollected) },
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
              { label: 'Legacy Share', render: (row) => formatMoney(row.legacyCarryoverAmount), align: 'right' },
              { label: 'Amount', render: (row) => formatMoney(row.amount), align: 'right' },
            ],
            exportColumns: [
              { label: 'Received At', value: (row) => formatDate(row.receivedAt, true) },
              { label: 'Invoice', value: 'invoiceID' },
              { label: 'Account', value: 'accountName' },
              { label: 'Account Type', value: 'accountType' },
              { label: 'Method', value: 'method' },
              { label: 'Amount', value: (row) => row.amount },
              { label: 'Legacy Carryover Amount', value: (row) => row.legacyCarryoverAmount },
              { label: 'Go-Live Amount', value: (row) => row.goLiveAmount },
            ],
          },
        ],
      };
    case 'federal-tax-reserve':
      return {
        infoAlerts: [
          reports?.baseline?.taxReserveNote,
          'This report estimates reserve and spendable cash from tracked collections, payroll, owner draws, and recorded business expenses. Any expenses not entered here are still missing from the estimate.',
        ].filter(Boolean),
        summaryCards: [
          { label: 'Cash Collected', value: formatMoney(reports?.federalTaxReserve?.summary?.cashCollected) },
          { label: 'Sales Tax Held', value: formatMoney(reports?.federalTaxReserve?.summary?.salesTaxHeld) },
          {
            label: 'Contractor Payroll Paid',
            value: formatMoney(reports?.federalTaxReserve?.summary?.contractorPayrollPaid),
            note: `Excludes owner/operator. Labor: ${formatMoney(reports?.federalTaxReserve?.summary?.contractorLaborPayrollPaid)} | Sales: ${formatMoney(reports?.federalTaxReserve?.summary?.contractorSalesPayoutPaid)}`,
          },
          {
            label: 'Paid Expenses',
            value: formatMoney(reports?.federalTaxReserve?.summary?.trackedExpenses),
            note: `Scheduled: ${formatMoney(reports?.federalTaxReserve?.summary?.scheduledCommittedExpenses)} | Planned: ${formatMoney(reports?.federalTaxReserve?.summary?.plannedExpenses)}`,
          },
          {
            label: 'Estimated Taxable Profit',
            value: formatMoney(reports?.federalTaxReserve?.summary?.estimatedTaxableProfit),
            note: `Reserve rate ${(Number(reports?.federalTaxReserve?.summary?.reserveRate || 0) * 100).toFixed(1)}%`,
          },
          { label: 'Recommended Federal Reserve', value: formatMoney(reports?.federalTaxReserve?.summary?.recommendedFederalReserve) },
          { label: 'Spendable Cash After Reserve', value: formatMoney(reports?.federalTaxReserve?.summary?.spendableCash) },
          { label: 'Safe After Scheduled', value: formatMoney(reports?.federalTaxReserve?.summary?.safeToSpendAfterScheduled) },
          { label: 'Owner Draws', value: formatMoney(reports?.federalTaxReserve?.summary?.ownerDraws) },
          { label: 'Cash After Owner Draws', value: formatMoney(reports?.federalTaxReserve?.summary?.cashAfterOwnerDraws) },
        ],
        sections: [
          {
            title: 'Cash Collection Detail',
            rows: reports?.federalTaxReserve?.payments || [],
            columns: [
              { label: 'Received At', render: (row) => formatDate(row.receivedAt, true) },
              { label: 'Invoice', value: 'invoiceID' },
              { label: 'Account', value: 'accountName' },
              { label: 'Method', value: 'method' },
              { label: 'Tax Held', render: (row) => formatMoney(row.taxHeld), align: 'right' },
              { label: 'Amount', render: (row) => formatMoney(row.amount), align: 'right' },
            ],
            exportColumns: [
              { label: 'Received At', value: (row) => formatDate(row.receivedAt, true) },
              { label: 'Invoice', value: 'invoiceID' },
              { label: 'Account', value: 'accountName' },
              { label: 'Account Type', value: 'accountType' },
              { label: 'Method', value: 'method' },
              { label: 'Tax Held', value: (row) => row.taxHeld },
              { label: 'Amount', value: (row) => row.amount },
            ],
          },
          {
            title: 'Payroll Paid Detail',
            rows: reports?.federalTaxReserve?.payrollRows || [],
            columns: [
              { label: 'Paid At', render: (row) => formatDate(row.paidAt, true) },
              { label: 'Jeweler', render: (row) => row.isOwnerOperator ? `${row.userName} (Owner/Operator)` : row.userName },
              { label: 'Method', value: 'paymentMethod' },
              { label: 'Hours', render: (row) => row.laborHours.toFixed(2), align: 'right' },
              { label: 'Labor Pay', render: (row) => formatMoney(row.laborPay), align: 'right' },
              { label: 'Sales Pay', render: (row) => formatMoney(row.salePay), align: 'right' },
              { label: 'Total Pay', render: (row) => formatMoney(row.totalPay), align: 'right' },
            ],
            exportColumns: [
              { label: 'Paid At', value: (row) => formatDate(row.paidAt, true) },
              { label: 'Batch ID', value: 'batchID' },
              { label: 'Jeweler', value: 'userName' },
              { label: 'Owner Operator', value: (row) => row.isOwnerOperator ? 'Yes' : 'No' },
              { label: 'Method', value: 'paymentMethod' },
              { label: 'Payment Reference', value: 'paymentReference' },
              { label: 'Hours', value: (row) => row.laborHours },
              { label: 'Labor Pay', value: (row) => row.laborPay },
              { label: 'Sales Pay', value: (row) => row.salePay },
              { label: 'Total Pay', value: (row) => row.totalPay },
            ],
          },
          {
            title: 'Business Expense Detail',
            rows: reports?.federalTaxReserve?.expenseRows || [],
            columns: [
              { label: 'Expense Date', render: (row) => formatDate(row.expenseDate, true) },
              { label: 'Paid At', render: (row) => formatDate(row.paidAt, true) },
              { label: 'Vendor', value: 'vendor' },
              { label: 'Category', value: 'category' },
              { label: 'Source', value: 'sourceType' },
              { label: 'Status', value: 'status' },
              { label: 'Deductible', render: (row) => row.isDeductible ? 'Yes' : 'No' },
              { label: 'Amount', render: (row) => formatMoney(row.amount), align: 'right' },
            ],
            exportColumns: [
              { label: 'Expense Date', value: (row) => formatDate(row.expenseDate, true) },
              { label: 'Paid At', value: (row) => formatDate(row.paidAt, true) },
              { label: 'Expense ID', value: 'expenseID' },
              { label: 'Vendor', value: 'vendor' },
              { label: 'Category', value: 'category' },
              { label: 'Source', value: 'sourceType' },
              { label: 'Payment Method', value: 'paymentMethod' },
              { label: 'Status', value: 'status' },
              { label: 'Deductible', value: (row) => row.isDeductible ? 'Yes' : 'No' },
              { label: 'Amount', value: (row) => row.amount },
              { label: 'Notes', value: 'notes' },
            ],
          },
          {
            title: 'Owner Draw Detail',
            rows: reports?.federalTaxReserve?.ownerDrawRows || [],
            columns: [
              { label: 'Draw Date', render: (row) => formatDate(row.drawDate, true) },
              { label: 'Owner', value: 'userName' },
              { label: 'Method', value: 'paymentMethod' },
              { label: 'Reference', value: 'paymentReference' },
              { label: 'Amount', render: (row) => formatMoney(row.amount), align: 'right' },
            ],
            exportColumns: [
              { label: 'Draw Date', value: (row) => formatDate(row.drawDate, true) },
              { label: 'Draw ID', value: 'drawID' },
              { label: 'Owner', value: 'userName' },
              { label: 'Method', value: 'paymentMethod' },
              { label: 'Reference', value: 'paymentReference' },
              { label: 'Amount', value: (row) => row.amount },
              { label: 'Notes', value: 'notes' },
            ],
          },
        ],
      };
    case 'expenses':
      return {
        infoAlerts: actions.managementMode ? [] : [
          'Expense entry lives in Finance > Expenses. This report is read-only inside Analytics.',
        ],
        summaryCards: [
          { label: 'Tracked Expenses', value: formatMoney(reports?.expenses?.summary?.total) },
          { label: 'Paid Expenses', value: formatMoney(reports?.expenses?.summary?.paid) },
          { label: 'Scheduled Expenses', value: formatMoney(reports?.expenses?.summary?.scheduled) },
          { label: 'Planned Expenses', value: formatMoney(reports?.expenses?.summary?.planned) },
          { label: 'Active Recurring', value: String(reports?.expenses?.summary?.activeRecurringTemplateCount || 0) },
          { label: 'Deductible Expenses', value: formatMoney(reports?.expenses?.summary?.deductible) },
          { label: 'Entries', value: String(reports?.expenses?.summary?.count || 0) },
        ],
        sections: [
          {
            title: 'Expense Category Summary',
            rows: reports?.expenses?.categories || [],
            columns: [
              { label: 'Category', value: 'category' },
              { label: 'Entries', value: 'count', align: 'right' },
              { label: 'Paid', render: (row) => formatMoney(row.paid), align: 'right' },
              { label: 'Scheduled', render: (row) => formatMoney(row.scheduled), align: 'right' },
              { label: 'Planned', render: (row) => formatMoney(row.planned), align: 'right' },
              { label: 'Deductible', render: (row) => formatMoney(row.deductible), align: 'right' },
              { label: 'Non-Deductible', render: (row) => formatMoney(row.nonDeductible), align: 'right' },
              { label: 'Total', render: (row) => formatMoney(row.total), align: 'right' },
            ],
            exportColumns: [
              { label: 'Category', value: 'category' },
              { label: 'Entries', value: 'count' },
              { label: 'Paid', value: (row) => row.paid },
              { label: 'Scheduled', value: (row) => row.scheduled },
              { label: 'Planned', value: (row) => row.planned },
              { label: 'Deductible', value: (row) => row.deductible },
              { label: 'Non-Deductible', value: (row) => row.nonDeductible },
              { label: 'Total', value: (row) => row.total },
            ],
          },
          {
            title: 'Expense Detail',
            rows: reports?.expenses?.rows || [],
            columns: [
              ...(actions.handleEditExpense && actions.handleDeleteExpense ? [{
                label: 'Actions',
                render: (row) => (
                  <>
                    <IconButton size="small" onClick={() => actions.handleEditExpense?.(row)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => actions.handleDeleteExpense?.(row.expenseID)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </>
                ),
              }] : []),
              { label: 'Expense Date', render: (row) => formatDate(row.expenseDate, true) },
              { label: 'Paid At', render: (row) => formatDate(row.paidAt, true) },
              { label: 'Vendor', value: 'vendor' },
              { label: 'Category', value: 'category' },
              { label: 'Source', value: 'sourceType' },
              { label: 'Status', value: 'status' },
              { label: 'Method', value: 'paymentMethod' },
              { label: 'Deductible', render: (row) => row.isDeductible ? 'Yes' : 'No' },
              { label: 'Amount', render: (row) => formatMoney(row.amount), align: 'right' },
            ],
            exportColumns: [
              { label: 'Expense Date', value: (row) => formatDate(row.expenseDate, true) },
              { label: 'Paid At', value: (row) => formatDate(row.paidAt, true) },
              { label: 'Expense ID', value: 'expenseID' },
              { label: 'Vendor', value: 'vendor' },
              { label: 'Category', value: 'category' },
              { label: 'Source', value: 'sourceType' },
              { label: 'Status', value: 'status' },
              { label: 'Method', value: 'paymentMethod' },
              { label: 'Deductible', value: (row) => row.isDeductible ? 'Yes' : 'No' },
              { label: 'Amount', value: (row) => row.amount },
              { label: 'Notes', value: 'notes' },
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
    case 'repairs': {
      const repairsSummary = reports?.repairsReport?.summary || {};
      return {
        summaryCards: [
          { label: 'Total Repairs', value: String(repairsSummary.totalCount || 0) },
          { label: 'Total Billed', value: formatMoney(repairsSummary.totalBilled) },
          { label: 'Avg Repair Total', value: formatMoney(repairsSummary.avgTotal) },
          {
            label: '$0 Total (Needs Review)',
            value: String(repairsSummary.zeroTotalCount || 0),
            note: 'Non-comp, non-included repairs billed at $0.',
          },
          { label: 'Comp Repairs', value: String(repairsSummary.compRepairCount || 0) },
          { label: 'Included With Sale', value: String(repairsSummary.includedWithSaleCount || 0) },
        ],
        sections: [
          ...(repairsSummary.zeroTotalCount > 0 ? [{
            title: '$0 Total Repairs — Needs Review',
            rows: reports?.repairsReport?.zeroTotalRows || [],
            columns: [
              { label: 'Created', render: (row) => formatDate(row.createdAt) },
              { label: 'Repair ID', render: (row) => <a href={`/dashboard/repairs/${row.repairID}`} target="_blank" rel="noreferrer" style={{ fontFamily: 'monospace' }}>{row.repairID}</a> },
              { label: 'Client', value: 'clientName' },
              { label: 'Status', value: 'status' },
              { label: 'Invoice', value: 'invoiceID' },
              { label: 'Total', render: (row) => formatMoney(row.totalCost), align: 'right' },
            ],
            exportColumns: [
              { label: 'Created', value: (row) => formatDate(row.createdAt) },
              { label: 'Repair ID', value: 'repairID' },
              { label: 'Client', value: 'clientName' },
              { label: 'Status', value: 'status' },
              { label: 'Invoice', value: 'invoiceID' },
              { label: 'Total', value: (row) => row.totalCost },
            ],
          }] : []),
          {
            title: 'Status Breakdown',
            rows: reports?.repairsReport?.statusRows || [],
            columns: [
              { label: 'Status', value: 'status' },
              { label: 'Count', value: 'count', align: 'right' },
            ],
            exportColumns: [
              { label: 'Status', value: 'status' },
              { label: 'Count', value: 'count' },
            ],
          },
          {
            title: 'All Repairs',
            rows: reports?.repairsReport?.allRows || [],
            columns: [
              { label: 'Created', render: (row) => formatDate(row.createdAt) },
              { label: 'Repair ID', render: (row) => <a href={`/dashboard/repairs/${row.repairID}`} target="_blank" rel="noreferrer" style={{ fontFamily: 'monospace' }}>{row.repairID}</a> },
              { label: 'Client', value: 'clientName' },
              { label: 'Status', value: 'status' },
              { label: 'Invoice', value: 'invoiceID' },
              { label: 'Wholesale', render: (row) => (row.isWholesale ? 'Yes' : 'No') },
              { label: 'Comp', render: (row) => (row.compRepair ? 'Yes' : '') },
              { label: 'Subtotal', render: (row) => formatMoney(row.subtotal), align: 'right' },
              { label: 'Rush', render: (row) => (row.rushFee > 0 ? formatMoney(row.rushFee) : ''), align: 'right' },
              { label: 'Tax', render: (row) => (row.taxAmount > 0 ? formatMoney(row.taxAmount) : ''), align: 'right' },
              { label: 'Total', render: (row) => formatMoney(row.totalCost), align: 'right' },
            ],
            exportColumns: [
              { label: 'Created', value: (row) => formatDate(row.createdAt) },
              { label: 'Completed', value: (row) => formatDate(row.completedAt) },
              { label: 'Repair ID', value: 'repairID' },
              { label: 'Client', value: 'clientName' },
              { label: 'Status', value: 'status' },
              { label: 'Invoice', value: 'invoiceID' },
              { label: 'Wholesale', value: (row) => (row.isWholesale ? 'Yes' : 'No') },
              { label: 'Comp', value: (row) => (row.compRepair ? 'Yes' : 'No') },
              { label: 'Included With Sale', value: (row) => (row.includedWithSale ? 'Yes' : 'No') },
              { label: 'Subtotal', value: (row) => row.subtotal },
              { label: 'Rush Fee', value: (row) => row.rushFee },
              { label: 'Delivery Fee', value: (row) => row.deliveryFee },
              { label: 'Tax', value: (row) => row.taxAmount },
              { label: 'Total', value: (row) => row.totalCost },
            ],
          },
        ],
      };
    }
    default:
      return null;
  }
}

export default function ReportDetailPageClient({
  reportSlug,
  backHref = '/dashboard/analytics/reports',
  backLabel = 'Back to Reports',
  managementMode = false,
  extraActions = null,
}) {
  const router = useRouter();
  const reportDefinition = getReportDefinition(reportSlug);
  const [dateRange, setDateRange] = React.useState('this_month');
  const [summary, setSummary] = React.useState(null);
  const [reports, setReports] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [expenseForm, setExpenseForm] = React.useState({
    expenseDate: formatDateInput(new Date()),
    vendor: '',
    category: BUSINESS_EXPENSE_CATEGORIES[0],
    amount: '',
    paymentMethod: BUSINESS_EXPENSE_PAYMENT_METHODS[0],
    status: BUSINESS_EXPENSE_STATUS.PAID,
    paidAt: formatDateInput(new Date()),
    isDeductible: true,
    notes: '',
  });
  const [editingExpenseID, setEditingExpenseID] = React.useState('');
  const [expenseSubmitting, setExpenseSubmitting] = React.useState(false);
  const [expenseError, setExpenseError] = React.useState('');

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
  }, [dateRange, refreshKey]);

  const resetExpenseForm = React.useCallback(() => {
    setExpenseForm({
      expenseDate: formatDateInput(new Date()),
      vendor: '',
      category: BUSINESS_EXPENSE_CATEGORIES[0],
      amount: '',
      paymentMethod: BUSINESS_EXPENSE_PAYMENT_METHODS[0],
      status: BUSINESS_EXPENSE_STATUS.PAID,
      paidAt: formatDateInput(new Date()),
      isDeductible: true,
      notes: '',
    });
    setEditingExpenseID('');
    setExpenseError('');
  }, []);

  const handleEditExpense = React.useCallback((expense) => {
    setEditingExpenseID(expense.expenseID);
    setExpenseForm({
      expenseDate: formatDateInput(expense.expenseDate),
      vendor: expense.vendor || '',
      category: expense.category || BUSINESS_EXPENSE_CATEGORIES[0],
      amount: String(expense.amount || ''),
      paymentMethod: expense.paymentMethod || BUSINESS_EXPENSE_PAYMENT_METHODS[0],
      status: expense.status || BUSINESS_EXPENSE_STATUS.PAID,
      paidAt: formatDateInput(expense.paidAt || expense.expenseDate),
      isDeductible: expense.isDeductible !== false,
      notes: expense.notes || '',
    });
    setExpenseError('');
  }, []);

  const handleSubmitExpense = React.useCallback(async () => {
    if (!(Number(expenseForm.amount) > 0)) {
      setExpenseError('Expense amount must be greater than zero.');
      return;
    }

    setExpenseSubmitting(true);
    setExpenseError('');
    try {
      const url = editingExpenseID ? `/api/businessExpenses/${editingExpenseID}` : '/api/businessExpenses';
      const method = editingExpenseID ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...expenseForm,
          amount: Number(expenseForm.amount),
          paidAt: expenseForm.status === BUSINESS_EXPENSE_STATUS.PAID ? expenseForm.paidAt || expenseForm.expenseDate : null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save expense.');
      resetExpenseForm();
      setRefreshKey((value) => value + 1);
    } catch (err) {
      setExpenseError(err.message || 'Failed to save expense.');
    } finally {
      setExpenseSubmitting(false);
    }
  }, [editingExpenseID, expenseForm, resetExpenseForm]);

  const handleDeleteExpense = React.useCallback(async (expenseID) => {
    setExpenseSubmitting(true);
    setExpenseError('');
    try {
      const response = await fetch(`/api/businessExpenses/${expenseID}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete expense.');
      if (editingExpenseID === expenseID) resetExpenseForm();
      setRefreshKey((value) => value + 1);
    } catch (err) {
      setExpenseError(err.message || 'Failed to delete expense.');
    } finally {
      setExpenseSubmitting(false);
    }
  }, [editingExpenseID, resetExpenseForm]);

  const reportConfig = React.useMemo(
    () => {
      if (error) return null;
      return buildReportConfig(reportSlug, summary, reports, {
        managementMode,
        ...(managementMode ? {
          handleEditExpense,
          handleDeleteExpense,
        } : {}),
      });
    },
    [reportSlug, summary, reports, error, managementMode, handleEditExpense, handleDeleteExpense]
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

  return (
    <Box sx={{ p: 4 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push(backHref)}
            sx={{ mb: 1.5 }}
          >
            {backLabel}
          </Button>
          <Typography variant="h4" fontWeight="bold">{reportDefinition.title}</Typography>
          <Typography variant="body2" color="text.secondary">
            {reportDefinition.description}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="flex-start">
          {extraActions}
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
            disabled={Boolean(error) || !reportConfig?.sections?.length}
            onClick={() => {
              if (!reportConfig?.sections?.length) return;
              downloadCsvSections(`${reportSlug}-${dateRange}.csv`, reportConfig.sections);
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
      {error && (
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={700}>Report data unavailable</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Financial values are hidden because the report data request failed. This usually means the current account does not have access to admin analytics data.
            </Typography>
          </CardContent>
        </Card>
      )}
      {summary?.baseline?.note && <Alert severity="info" sx={{ mb: 2 }}>{summary.baseline.note}</Alert>}
      {(reportConfig?.infoAlerts || []).map((message) => (
        <Alert severity="warning" sx={{ mb: 2 }} key={message}>{message}</Alert>
      ))}

      {reportSlug === 'expenses' && managementMode && (
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6" fontWeight={700}>
                {editingExpenseID ? 'Edit Expense' : 'Add Expense'}
              </Typography>
              {expenseError && <Alert severity="error">{expenseError}</Alert>}
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Expense Date"
                    type="date"
                    value={expenseForm.expenseDate}
                    onChange={(e) => setExpenseForm((prev) => ({ ...prev, expenseDate: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Vendor"
                    value={expenseForm.vendor}
                    onChange={(e) => setExpenseForm((prev) => ({ ...prev, vendor: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth
                    select
                    label="Category"
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm((prev) => ({ ...prev, category: e.target.value }))}
                  >
                    {BUSINESS_EXPENSE_CATEGORIES.map((category) => (
                      <MenuItem key={category} value={category}>{category}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth
                    label="Amount"
                    type="number"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm((prev) => ({ ...prev, amount: e.target.value }))}
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth
                    select
                    label="Status"
                    value={expenseForm.status}
                    onChange={(e) => setExpenseForm((prev) => ({
                      ...prev,
                      status: e.target.value,
                      paidAt: e.target.value === BUSINESS_EXPENSE_STATUS.PAID ? (prev.paidAt || prev.expenseDate) : '',
                    }))}
                  >
                    <MenuItem value={BUSINESS_EXPENSE_STATUS.PAID}>Paid</MenuItem>
                    <MenuItem value={BUSINESS_EXPENSE_STATUS.PLANNED}>Planned</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth
                    label="Paid At"
                    type="date"
                    value={expenseForm.paidAt}
                    disabled={expenseForm.status !== BUSINESS_EXPENSE_STATUS.PAID}
                    onChange={(e) => setExpenseForm((prev) => ({ ...prev, paidAt: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth
                    select
                    label="Payment Method"
                    value={expenseForm.paymentMethod}
                    onChange={(e) => setExpenseForm((prev) => ({ ...prev, paymentMethod: e.target.value }))}
                  >
                    {BUSINESS_EXPENSE_PAYMENT_METHODS.map((method) => (
                      <MenuItem key={method} value={method}>{method}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={9}>
                  <TextField
                    fullWidth
                    label="Notes"
                    value={expenseForm.notes}
                    onChange={(e) => setExpenseForm((prev) => ({ ...prev, notes: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} md={3} sx={{ display: 'flex', alignItems: 'center' }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={expenseForm.isDeductible}
                        onChange={(e) => setExpenseForm((prev) => ({ ...prev, isDeductible: e.target.checked }))}
                      />
                    }
                    label="Deductible expense"
                  />
                </Grid>
              </Grid>
              <Stack direction="row" spacing={1}>
                <Button variant="contained" onClick={handleSubmitExpense} disabled={expenseSubmitting}>
                  {editingExpenseID ? 'Update Expense' : 'Add Expense'}
                </Button>
                <Button variant="outlined" onClick={resetExpenseForm} disabled={expenseSubmitting}>
                  Clear
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      )}

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
              {reportSlug === 'expenses' && managementMode && section.title === 'Expense Detail' && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Click an entry to edit or remove it.
                </Typography>
              )}
              <ReportTable columns={section.columns} rows={section.rows || []} />
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Box>
  );
}
