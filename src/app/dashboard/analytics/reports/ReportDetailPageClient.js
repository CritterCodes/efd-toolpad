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

function buildReportConfig(reportSlug, summary, reports, actions = {}) {
  switch (reportSlug) {
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
              { label: 'Paid Amount', render: (row) => formatMoney(row.paidAmount), align: 'right' },
              { label: 'Paid Batches', value: 'paidBatchCount', align: 'right' },
              { label: 'Methods', render: (row) => row.paymentMethods.join(', ') || 'N/A' },
            ],
            exportColumns: [
              { label: 'Jeweler', value: (row) => row.userName },
              { label: 'Owner Operator', value: (row) => row.isOwnerOperator ? 'Yes' : 'No' },
              { label: 'Paid Hours', value: (row) => row.paidHours },
              { label: 'Paid Amount', value: (row) => row.paidAmount },
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
          { label: 'Contractor Payroll Paid', value: formatMoney(reports?.federalTaxReserve?.summary?.contractorPayrollPaid), note: 'Excludes owner/operator payroll.' },
          { label: 'Paid Expenses', value: formatMoney(reports?.federalTaxReserve?.summary?.trackedExpenses), note: `Planned: ${formatMoney(reports?.federalTaxReserve?.summary?.unpaidTrackedExpenses)}` },
          {
            label: 'Estimated Taxable Profit',
            value: formatMoney(reports?.federalTaxReserve?.summary?.estimatedTaxableProfit),
            note: `Reserve rate ${(Number(reports?.federalTaxReserve?.summary?.reserveRate || 0) * 100).toFixed(1)}%`,
          },
          { label: 'Recommended Federal Reserve', value: formatMoney(reports?.federalTaxReserve?.summary?.recommendedFederalReserve) },
          { label: 'Spendable Cash After Reserve', value: formatMoney(reports?.federalTaxReserve?.summary?.spendableCash) },
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
              { label: 'Pay', render: (row) => formatMoney(row.laborPay), align: 'right' },
            ],
            exportColumns: [
              { label: 'Paid At', value: (row) => formatDate(row.paidAt, true) },
              { label: 'Batch ID', value: 'batchID' },
              { label: 'Jeweler', value: 'userName' },
              { label: 'Owner Operator', value: (row) => row.isOwnerOperator ? 'Yes' : 'No' },
              { label: 'Method', value: 'paymentMethod' },
              { label: 'Payment Reference', value: 'paymentReference' },
              { label: 'Hours', value: (row) => row.laborHours },
              { label: 'Pay', value: (row) => row.laborPay },
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
        summaryCards: [
          { label: 'Tracked Expenses', value: formatMoney(reports?.expenses?.summary?.total) },
          { label: 'Paid Expenses', value: formatMoney(reports?.expenses?.summary?.paid) },
          { label: 'Planned Expenses', value: formatMoney(reports?.expenses?.summary?.planned) },
          { label: 'Deductible Expenses', value: formatMoney(reports?.expenses?.summary?.deductible) },
          { label: 'Non-Deductible Expenses', value: formatMoney(reports?.expenses?.summary?.nonDeductible) },
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
              { label: 'Planned', render: (row) => formatMoney(row.planned), align: 'right' },
              { label: 'Deductible', render: (row) => formatMoney(row.deductible), align: 'right' },
              { label: 'Non-Deductible', render: (row) => formatMoney(row.nonDeductible), align: 'right' },
              { label: 'Total', render: (row) => formatMoney(row.total), align: 'right' },
            ],
            exportColumns: [
              { label: 'Category', value: 'category' },
              { label: 'Entries', value: 'count' },
              { label: 'Paid', value: (row) => row.paid },
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
              {
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
              },
              { label: 'Expense Date', render: (row) => formatDate(row.expenseDate, true) },
              { label: 'Paid At', render: (row) => formatDate(row.paidAt, true) },
              { label: 'Vendor', value: 'vendor' },
              { label: 'Category', value: 'category' },
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
    () => buildReportConfig(reportSlug, summary, reports, {
      handleEditExpense,
      handleDeleteExpense,
    }),
    [reportSlug, summary, reports, handleEditExpense, handleDeleteExpense]
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
      {summary?.baseline?.note && <Alert severity="info" sx={{ mb: 2 }}>{summary.baseline.note}</Alert>}
      {(reportConfig?.infoAlerts || []).map((message) => (
        <Alert severity="warning" sx={{ mb: 2 }} key={message}>{message}</Alert>
      ))}

      {reportSlug === 'expenses' && (
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
              {reportSlug === 'expenses' && section.title === 'Expense Detail' && (
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
