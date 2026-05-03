"use client";

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
import Link from 'next/link';
import { ANALYTICS_DATE_RANGE_OPTIONS } from '@/services/repairAnalytics';
import {
  BUSINESS_EXPENSE_CATEGORIES,
  BUSINESS_EXPENSE_PAYMENT_METHODS,
  BUSINESS_EXPENSE_STATUS,
} from '@/services/businessExpenses';
import {
  RECURRING_EXPENSE_DEFAULT_STATUS,
  RECURRING_EXPENSE_FREQUENCIES,
} from '@/services/recurringBusinessExpenses';

const WEEKDAY_OPTIONS = [
  { label: 'Sunday', value: 0 },
  { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 },
  { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 },
];

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

function defaultExpenseForm() {
  return {
    expenseDate: formatDateInput(new Date()),
    vendor: '',
    category: BUSINESS_EXPENSE_CATEGORIES[0],
    amount: '',
    paymentMethod: BUSINESS_EXPENSE_PAYMENT_METHODS[0],
    status: BUSINESS_EXPENSE_STATUS.PAID,
    paidAt: formatDateInput(new Date()),
    isDeductible: true,
    notes: '',
  };
}

function defaultRecurringForm() {
  const today = new Date();
  return {
    vendor: '',
    category: BUSINESS_EXPENSE_CATEGORIES[0],
    amount: '',
    paymentMethod: BUSINESS_EXPENSE_PAYMENT_METHODS[0],
    isDeductible: true,
    frequency: 'monthly',
    dayOfWeek: today.getDay(),
    dayOfMonth: today.getDate(),
    startDate: formatDateInput(today),
    endDate: '',
    statusDefault: RECURRING_EXPENSE_DEFAULT_STATUS,
    active: true,
    notes: '',
  };
}

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

  return (
    <Box sx={{ p: 4 }}>
      <Stack spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">Finance Expenses</Typography>
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

      {tab === 'expenses' && (
        <Stack spacing={3}>
          <Card variant="outlined">
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6" fontWeight={700}>
                  {editingExpenseID ? 'Edit Expense' : 'Add Expense'}
                </Typography>
                {expenseError && <Alert severity="error">{expenseError}</Alert>}
                <Grid container spacing={2}>
                  <Grid item xs={12} md={3}>
                    <TextField fullWidth label="Expense Date" type="date" value={expenseForm.expenseDate} onChange={(e) => setExpenseForm((prev) => ({ ...prev, expenseDate: e.target.value }))} InputLabelProps={{ shrink: true }} />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField fullWidth label="Vendor" value={expenseForm.vendor} onChange={(e) => setExpenseForm((prev) => ({ ...prev, vendor: e.target.value }))} />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <TextField fullWidth select label="Category" value={expenseForm.category} onChange={(e) => setExpenseForm((prev) => ({ ...prev, category: e.target.value }))}>
                      {BUSINESS_EXPENSE_CATEGORIES.map((category) => <MenuItem key={category} value={category}>{category}</MenuItem>)}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <TextField fullWidth label="Amount" type="number" value={expenseForm.amount} onChange={(e) => setExpenseForm((prev) => ({ ...prev, amount: e.target.value }))} inputProps={{ min: 0, step: 0.01 }} />
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
                      <MenuItem value={BUSINESS_EXPENSE_STATUS.SCHEDULED}>Scheduled</MenuItem>
                      <MenuItem value={BUSINESS_EXPENSE_STATUS.PLANNED}>Planned</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <TextField fullWidth label="Paid At" type="date" value={expenseForm.paidAt} disabled={expenseForm.status !== BUSINESS_EXPENSE_STATUS.PAID} onChange={(e) => setExpenseForm((prev) => ({ ...prev, paidAt: e.target.value }))} InputLabelProps={{ shrink: true }} />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <TextField fullWidth select label="Payment Method" value={expenseForm.paymentMethod} onChange={(e) => setExpenseForm((prev) => ({ ...prev, paymentMethod: e.target.value }))}>
                      {BUSINESS_EXPENSE_PAYMENT_METHODS.map((method) => <MenuItem key={method} value={method}>{method}</MenuItem>)}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={9}>
                    <TextField fullWidth label="Notes" value={expenseForm.notes} onChange={(e) => setExpenseForm((prev) => ({ ...prev, notes: e.target.value }))} />
                  </Grid>
                  <Grid item xs={12} md={3} sx={{ display: 'flex', alignItems: 'center' }}>
                    <FormControlLabel
                      control={<Checkbox checked={expenseForm.isDeductible} onChange={(e) => setExpenseForm((prev) => ({ ...prev, isDeductible: e.target.checked }))} />}
                      label="Deductible expense"
                    />
                  </Grid>
                </Grid>
                <Stack direction="row" spacing={1}>
                  <Button variant="contained" onClick={handleSubmitExpense} disabled={submitting}>
                    {editingExpenseID ? 'Update Expense' : 'Add Expense'}
                  </Button>
                  <Button variant="outlined" onClick={resetExpense} disabled={submitting}>Clear</Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Expense Detail</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Actions</TableCell>
                    <TableCell>Expense Date</TableCell>
                    <TableCell>Vendor</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Source</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Deductible</TableCell>
                    <TableCell align="right">Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(expenseReport?.rows || []).map((row) => (
                    <TableRow key={row.expenseID}>
                      <TableCell>
                        <IconButton size="small" onClick={() => {
                          setEditingExpenseID(row.expenseID);
                          setExpenseForm({
                            expenseDate: formatDateInput(row.expenseDate),
                            vendor: row.vendor || '',
                            category: row.category || BUSINESS_EXPENSE_CATEGORIES[0],
                            amount: String(row.amount || ''),
                            paymentMethod: row.paymentMethod || BUSINESS_EXPENSE_PAYMENT_METHODS[0],
                            status: row.status || BUSINESS_EXPENSE_STATUS.PAID,
                            paidAt: formatDateInput(row.paidAt || row.expenseDate),
                            isDeductible: row.isDeductible !== false,
                            notes: row.notes || '',
                          });
                        }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDeleteExpense(row.expenseID)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                      <TableCell>{formatDate(row.expenseDate, true)}</TableCell>
                      <TableCell>{row.vendor}</TableCell>
                      <TableCell>{row.category}</TableCell>
                      <TableCell>{row.sourceType}</TableCell>
                      <TableCell>{row.status}</TableCell>
                      <TableCell>{row.isDeductible ? 'Yes' : 'No'}</TableCell>
                      <TableCell align="right">{formatMoney(row.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Stack>
      )}

      {tab === 'recurring' && (
        <Stack spacing={3}>
          <Card variant="outlined">
            <CardContent>
              <Stack spacing={2}>
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                  <Typography variant="h6" fontWeight={700}>
                    {editingRecurringID ? 'Edit Recurring Expense' : 'Add Recurring Expense'}
                  </Typography>
                  <Button variant="outlined" startIcon={<RefreshIcon />} onClick={handleGenerateNow} disabled={submitting}>
                    Generate Due Now
                  </Button>
                </Stack>
                {recurringError && <Alert severity="error">{recurringError}</Alert>}
                <Alert severity="info">
                  Recurring templates default to <strong>scheduled</strong>. They represent committed autodrafts or expected overhead, not just soft reminders.
                </Alert>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={3}>
                    <TextField fullWidth label="Vendor" value={recurringForm.vendor} onChange={(e) => setRecurringForm((prev) => ({ ...prev, vendor: e.target.value }))} />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <TextField fullWidth select label="Category" value={recurringForm.category} onChange={(e) => setRecurringForm((prev) => ({ ...prev, category: e.target.value }))}>
                      {BUSINESS_EXPENSE_CATEGORIES.map((category) => <MenuItem key={category} value={category}>{category}</MenuItem>)}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <TextField fullWidth label="Amount" type="number" value={recurringForm.amount} onChange={(e) => setRecurringForm((prev) => ({ ...prev, amount: e.target.value }))} inputProps={{ min: 0, step: 0.01 }} />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <TextField fullWidth select label="Frequency" value={recurringForm.frequency} onChange={(e) => setRecurringForm((prev) => ({ ...prev, frequency: e.target.value }))}>
                      {RECURRING_EXPENSE_FREQUENCIES.map((frequency) => <MenuItem key={frequency} value={frequency}>{frequency}</MenuItem>)}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField fullWidth select label="Payment Method" value={recurringForm.paymentMethod} onChange={(e) => setRecurringForm((prev) => ({ ...prev, paymentMethod: e.target.value }))}>
                      {BUSINESS_EXPENSE_PAYMENT_METHODS.map((method) => <MenuItem key={method} value={method}>{method}</MenuItem>)}
                    </TextField>
                  </Grid>
                  {recurringForm.frequency === 'weekly' ? (
                    <Grid item xs={12} md={2}>
                      <TextField fullWidth select label="Day of Week" value={recurringForm.dayOfWeek} onChange={(e) => setRecurringForm((prev) => ({ ...prev, dayOfWeek: e.target.value }))}>
                        {WEEKDAY_OPTIONS.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
                      </TextField>
                    </Grid>
                  ) : (
                    <Grid item xs={12} md={2}>
                      <TextField fullWidth label="Day of Month" type="number" value={recurringForm.dayOfMonth} onChange={(e) => setRecurringForm((prev) => ({ ...prev, dayOfMonth: e.target.value }))} inputProps={{ min: 1, max: 31 }} />
                    </Grid>
                  )}
                  <Grid item xs={12} md={2}>
                    <TextField fullWidth label="Start Date" type="date" value={recurringForm.startDate} onChange={(e) => setRecurringForm((prev) => ({ ...prev, startDate: e.target.value }))} InputLabelProps={{ shrink: true }} />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <TextField fullWidth label="End Date" type="date" value={recurringForm.endDate} onChange={(e) => setRecurringForm((prev) => ({ ...prev, endDate: e.target.value }))} InputLabelProps={{ shrink: true }} />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <TextField fullWidth select label="Generated Status" value={recurringForm.statusDefault} onChange={(e) => setRecurringForm((prev) => ({ ...prev, statusDefault: e.target.value }))}>
                      <MenuItem value={BUSINESS_EXPENSE_STATUS.SCHEDULED}>Scheduled</MenuItem>
                      <MenuItem value={BUSINESS_EXPENSE_STATUS.PLANNED}>Planned</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField fullWidth label="Notes" value={recurringForm.notes} onChange={(e) => setRecurringForm((prev) => ({ ...prev, notes: e.target.value }))} />
                  </Grid>
                  <Grid item xs={12} md={2} sx={{ display: 'flex', alignItems: 'center' }}>
                    <FormControlLabel control={<Checkbox checked={recurringForm.isDeductible} onChange={(e) => setRecurringForm((prev) => ({ ...prev, isDeductible: e.target.checked }))} />} label="Deductible" />
                  </Grid>
                  <Grid item xs={12} md={2} sx={{ display: 'flex', alignItems: 'center' }}>
                    <FormControlLabel control={<Checkbox checked={recurringForm.active} onChange={(e) => setRecurringForm((prev) => ({ ...prev, active: e.target.checked }))} />} label="Active" />
                  </Grid>
                </Grid>
                <Stack direction="row" spacing={1}>
                  <Button variant="contained" onClick={handleSubmitRecurring} disabled={submitting}>
                    {editingRecurringID ? 'Update Recurring' : 'Add Recurring'}
                  </Button>
                  <Button variant="outlined" onClick={resetRecurring} disabled={submitting}>Clear</Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Recurring Templates</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Actions</TableCell>
                    <TableCell>Vendor</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Frequency</TableCell>
                    <TableCell>Next Occurrence</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Active</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recurringExpenses.map((row) => (
                    <TableRow key={row.recurringExpenseID}>
                      <TableCell>
                        <IconButton size="small" onClick={() => {
                          setEditingRecurringID(row.recurringExpenseID);
                          setRecurringForm({
                            vendor: row.vendor || '',
                            category: row.category || BUSINESS_EXPENSE_CATEGORIES[0],
                            amount: String(row.amount || ''),
                            paymentMethod: row.paymentMethod || BUSINESS_EXPENSE_PAYMENT_METHODS[0],
                            isDeductible: row.isDeductible !== false,
                            frequency: row.frequency || 'monthly',
                            dayOfWeek: String(row.dayOfWeek ?? new Date().getDay()),
                            dayOfMonth: String(row.dayOfMonth ?? new Date().getDate()),
                            startDate: formatDateInput(row.startDate),
                            endDate: formatDateInput(row.endDate),
                            statusDefault: row.statusDefault || RECURRING_EXPENSE_DEFAULT_STATUS,
                            active: row.active !== false,
                            notes: row.notes || '',
                          });
                        }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDeleteRecurring(row.recurringExpenseID)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                      <TableCell>{row.vendor}</TableCell>
                      <TableCell>{formatMoney(row.amount)}</TableCell>
                      <TableCell>{row.frequency}</TableCell>
                      <TableCell>{formatDate(row.nextOccurrenceDate)}</TableCell>
                      <TableCell>{row.statusDefault}</TableCell>
                      <TableCell>{row.active === false ? 'No' : 'Yes'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Stack>
      )}
    </Box>
  );
}
