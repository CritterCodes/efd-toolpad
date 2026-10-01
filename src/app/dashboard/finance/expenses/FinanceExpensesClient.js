"use client";

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import RefreshIcon from '@mui/icons-material/Refresh';
import Link from 'next/link';
import { ANALYTICS_DATE_RANGE_OPTIONS } from '@/services/repairAnalytics';
import { SummaryCard, defaultExpenseForm, defaultRecurringForm, formatMoney } from './expensesParts';
import { RecurringExpensesTab } from './RecurringExpensesTab';
import { ExpensesTab } from './ExpensesTab';
import {
  BUSINESS_EXPENSE_STATUS,
} from '@/services/businessExpenses';

export default function FinanceExpensesClient() {
  const [tab, setTab] = React.useState('expenses');
  const [dateRange, setDateRange] = React.useState('this_month');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [reports, setReports] = React.useState(null);
  const [recurringExpenses, setRecurringExpenses] = React.useState([]);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [expenseForm, setExpenseForm] = React.useState(defaultExpenseForm);
  const [editingExpenseID, setEditingExpenseID] = React.useState('');
  const [recurringForm, setRecurringForm] = React.useState(defaultRecurringForm);
  const [editingRecurringID, setEditingRecurringID] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [expenseError, setExpenseError] = React.useState('');
  const [recurringError, setRecurringError] = React.useState('');

  const refreshAll = React.useCallback(async ({ generate = true } = {}) => {
    setLoading(true);
    setError('');
    try {
      if (generate) {
        await fetch('/api/recurringBusinessExpenses', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ throughDate: new Date().toISOString() }),
        });
      }

      const [reportsResponse, recurringResponse] = await Promise.all([
        fetch(`/api/analytics/reports?dateRange=${encodeURIComponent(dateRange)}`),
        fetch('/api/recurringBusinessExpenses'),
      ]);
      const [reportsData, recurringData] = await Promise.all([
        reportsResponse.json(),
        recurringResponse.json(),
      ]);

      if (!reportsResponse.ok) throw new Error(reportsData.error || 'Failed to load expense report.');
      if (!recurringResponse.ok) throw new Error(recurringData.error || 'Failed to load recurring expenses.');

      setReports(reportsData);
      setRecurringExpenses(recurringData.recurringExpenses || []);
    } catch (err) {
      setError(err.message || 'Failed to load finance expenses.');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  React.useEffect(() => {
    refreshAll();
  }, [refreshAll, refreshKey]);

  const resetExpense = React.useCallback(() => {
    setExpenseForm(defaultExpenseForm());
    setEditingExpenseID('');
    setExpenseError('');
  }, []);

  const resetRecurring = React.useCallback(() => {
    setRecurringForm(defaultRecurringForm());
    setEditingRecurringID('');
    setRecurringError('');
  }, []);

  const handleSubmitExpense = React.useCallback(async () => {
    if (!(Number(expenseForm.amount) > 0)) {
      setExpenseError('Expense amount must be greater than zero.');
      return;
    }

    setSubmitting(true);
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
          paidAt: expenseForm.status === BUSINESS_EXPENSE_STATUS.PAID
            ? (expenseForm.paidAt || expenseForm.expenseDate)
            : null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save expense.');
      resetExpense();
      setRefreshKey((value) => value + 1);
    } catch (err) {
      setExpenseError(err.message || 'Failed to save expense.');
    } finally {
      setSubmitting(false);
    }
  }, [editingExpenseID, expenseForm, resetExpense]);

  const handleDeleteExpense = React.useCallback(async (expenseID) => {
    setSubmitting(true);
    setExpenseError('');
    try {
      const response = await fetch(`/api/businessExpenses/${expenseID}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete expense.');
      if (editingExpenseID === expenseID) resetExpense();
      setRefreshKey((value) => value + 1);
    } catch (err) {
      setExpenseError(err.message || 'Failed to delete expense.');
    } finally {
      setSubmitting(false);
    }
  }, [editingExpenseID, resetExpense]);

  const handleSubmitRecurring = React.useCallback(async () => {
    if (!(Number(recurringForm.amount) > 0)) {
      setRecurringError('Recurring expense amount must be greater than zero.');
      return;
    }

    setSubmitting(true);
    setRecurringError('');
    try {
      const url = editingRecurringID
        ? `/api/recurringBusinessExpenses/${editingRecurringID}`
        : '/api/recurringBusinessExpenses';
      const method = editingRecurringID ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...recurringForm,
          amount: Number(recurringForm.amount),
          dayOfWeek: Number(recurringForm.dayOfWeek),
          dayOfMonth: Number(recurringForm.dayOfMonth),
          endDate: recurringForm.endDate || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save recurring expense.');
      resetRecurring();
      setRefreshKey((value) => value + 1);
    } catch (err) {
      setRecurringError(err.message || 'Failed to save recurring expense.');
    } finally {
      setSubmitting(false);
    }
  }, [editingRecurringID, recurringForm, resetRecurring]);

  const handleDeleteRecurring = React.useCallback(async (recurringExpenseID) => {
    setSubmitting(true);
    setRecurringError('');
    try {
      const response = await fetch(`/api/recurringBusinessExpenses/${recurringExpenseID}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete recurring expense.');
      if (editingRecurringID === recurringExpenseID) resetRecurring();
      setRefreshKey((value) => value + 1);
    } catch (err) {
      setRecurringError(err.message || 'Failed to delete recurring expense.');
    } finally {
      setSubmitting(false);
    }
  }, [editingRecurringID, resetRecurring]);

  const handleGenerateNow = React.useCallback(async () => {
    setSubmitting(true);
    setRecurringError('');
    try {
      const response = await fetch('/api/recurringBusinessExpenses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ throughDate: new Date().toISOString() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate recurring expenses.');
      setRefreshKey((value) => value + 1);
    } catch (err) {
      setRecurringError(err.message || 'Failed to generate recurring expenses.');
    } finally {
      setSubmitting(false);
    }
  }, []);

  const expenseReport = reports?.expenses;
  const taxReserve = reports?.federalTaxReserve;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Everything the tab panels read, passed whole to each (each takes only the names it uses).
  const expenses = {
    editingExpenseID, editingRecurringID, expenseError, expenseForm, expenseReport, handleDeleteExpense,
    handleDeleteRecurring, handleGenerateNow, handleSubmitExpense, handleSubmitRecurring, recurringError,
    recurringExpenses, recurringForm, resetExpense, resetRecurring, setEditingExpenseID, setEditingRecurringID,
    setExpenseForm, setRecurringForm, submitting, tab,
  };

  return (
    <Box sx={{ p: 4 }}>
      <Stack spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography component="h1" variant="h4" fontWeight="bold">Finance Expenses</Typography>
          <Typography variant="body2" color="text.secondary">
            Record actual expenses, manage recurring autodrafts, and keep tax reserve math current.
          </Typography>
        </Box>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
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
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => setRefreshKey((value) => value + 1)}>
            Refresh
          </Button>
          <Button component={Link} href="/dashboard/finance/tax-reserve" variant="text">
            Open Tax Reserve
          </Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {reports?.baseline?.taxReserveNote && (
        <Alert severity="info" sx={{ mb: 2 }}>{reports.baseline.taxReserveNote}</Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(4, minmax(0, 1fr))' },
          gap: 2,
          mb: 3,
        }}
      >
        <SummaryCard label="Paid Expenses" value={formatMoney(expenseReport?.summary?.paid)} />
        <SummaryCard label="Scheduled Obligations" value={formatMoney(expenseReport?.summary?.scheduled)} note="Autodrafts and committed recurring outflows." />
        <SummaryCard label="Planned Expenses" value={formatMoney(expenseReport?.summary?.planned)} note="Tentative items not yet committed." />
        <SummaryCard label="Safe After Scheduled" value={formatMoney(taxReserve?.summary?.safeToSpendAfterScheduled)} note="After reserve and scheduled obligations." />
      </Box>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent sx={{ pb: 0 }}>
          <Tabs value={tab} onChange={(_event, next) => setTab(next)} sx={{ mb: 2 }}>
            <Tab label="Expenses" value="expenses" />
            <Tab label="Recurring" value="recurring" />
          </Tabs>
        </CardContent>
      </Card>

      <ExpensesTab {...expenses} />

      <RecurringExpensesTab {...expenses} />
    </Box>
  );
}
