import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import RefreshIcon from '@mui/icons-material/Refresh';
import Alert from '@mui/material/Alert';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import { BUSINESS_EXPENSE_CATEGORIES, BUSINESS_EXPENSE_PAYMENT_METHODS, BUSINESS_EXPENSE_STATUS } from '@/services/businessExpenses';
import MenuItem from '@mui/material/MenuItem';
import { RECURRING_EXPENSE_FREQUENCIES, RECURRING_EXPENSE_DEFAULT_STATUS } from '@/services/recurringBusinessExpenses';
import { WEEKDAY_OPTIONS, FinanceDataTable, formatDateInput, formatMoney, formatDate } from './expensesParts';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

export function RecurringExpensesTab({ editingRecurringID, handleDeleteRecurring, handleGenerateNow, handleSubmitRecurring, recurringError, recurringExpenses, recurringForm, resetRecurring, setEditingRecurringID, setRecurringForm, submitting, tab }) {
  return (
    <>
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
              <FinanceDataTable
                rows={recurringExpenses}
                getKey={(row) => row.recurringExpenseID}
                emptyMessage="No recurring templates yet."
                columns={[
                  {
                    label: 'Actions',
                    render: (row) => (
                      <Stack direction="row" justifyContent={{ xs: 'flex-end', md: 'flex-start' }}>
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
                      </Stack>
                    ),
                  },
                  { label: 'Vendor', render: (row) => row.vendor },
                  { label: 'Amount', render: (row) => formatMoney(row.amount), align: 'right' },
                  { label: 'Frequency', render: (row) => row.frequency },
                  { label: 'Next Occurrence', render: (row) => formatDate(row.nextOccurrenceDate) },
                  { label: 'Status', render: (row) => row.statusDefault },
                  { label: 'Active', render: (row) => (row.active === false ? 'No' : 'Yes') },
                ]}
              />
            </CardContent>
          </Card>
        </Stack>
      )}
    </>
  );
}
