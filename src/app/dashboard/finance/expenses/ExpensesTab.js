import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import { BUSINESS_EXPENSE_CATEGORIES, BUSINESS_EXPENSE_STATUS, BUSINESS_EXPENSE_PAYMENT_METHODS } from '@/services/businessExpenses';
import MenuItem from '@mui/material/MenuItem';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Button from '@mui/material/Button';
import { FinanceDataTable, formatDateInput, formatDate, formatMoney } from './expensesParts';
import IconButton from '@mui/material/IconButton';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

export function ExpensesTab({ editingExpenseID, expenseError, expenseForm, expenseReport, handleDeleteExpense, handleSubmitExpense, resetExpense, setEditingExpenseID, setExpenseForm, submitting, tab }) {
  return (
    <>
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
              <FinanceDataTable
                rows={expenseReport?.rows || []}
                getKey={(row) => row.expenseID}
                emptyMessage="No expenses in this period."
                columns={[
                  {
                    label: 'Actions',
                    render: (row) => (
                      <Stack direction="row" justifyContent={{ xs: 'flex-end', md: 'flex-start' }}>
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
                      </Stack>
                    ),
                  },
                  { label: 'Expense Date', render: (row) => formatDate(row.expenseDate, true) },
                  { label: 'Vendor', render: (row) => row.vendor },
                  { label: 'Category', render: (row) => row.category },
                  { label: 'Source', render: (row) => row.sourceType },
                  { label: 'Status', render: (row) => row.status },
                  { label: 'Deductible', render: (row) => (row.isDeductible ? 'Yes' : 'No') },
                  { label: 'Amount', render: (row) => formatMoney(row.amount), align: 'right' },
                ]}
              />
            </CardContent>
          </Card>
        </Stack>
      )}
    </>
  );
}
