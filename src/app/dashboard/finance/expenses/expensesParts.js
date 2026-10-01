import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import { BUSINESS_EXPENSE_CATEGORIES, BUSINESS_EXPENSE_PAYMENT_METHODS, BUSINESS_EXPENSE_STATUS } from '@/services/businessExpenses';
import { RECURRING_EXPENSE_DEFAULT_STATUS } from '@/services/recurringBusinessExpenses';
export const WEEKDAY_OPTIONS = [
  { label: 'Sunday', value: 0 },
  { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 },
  { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 },
];

export function formatMoney(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(value || 0));
}

export function formatDate(value, withTime = false) {
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

export function formatDateInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

export function SummaryCard({ label, value, note }) {
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

export function renderDataValue(value) {
  return value === null || value === undefined || value === '' ? 'N/A' : value;
}

export function FinanceDataTable({ columns, rows, getKey, emptyMessage = 'No rows yet.' }) {
  const actionColumns = columns.filter((column) => column.label === 'Actions');
  const dataColumns = columns.filter((column) => column.label !== 'Actions');

  return (
    <>
      <Stack spacing={1.25} sx={{ display: { xs: 'flex', md: 'none' } }}>
        {rows.length === 0 ? (
          <Typography variant="body2" color="text.secondary">{emptyMessage}</Typography>
        ) : rows.map((row, index) => (
          <Box
            key={getKey?.(row, index) || index}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              p: 1.5,
              bgcolor: 'background.default',
            }}
          >
            <Stack spacing={1}>
              {actionColumns.length > 0 ? (
                <Stack direction="row" justifyContent="flex-end" spacing={1}>
                  {actionColumns.map((column) => (
                    <Box key={column.label}>
                      {renderDataValue(column.render(row, index))}
                    </Box>
                  ))}
                </Stack>
              ) : null}
              {dataColumns.map((column) => (
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
                    sx={{ textTransform: 'uppercase', letterSpacing: 0, flex: '0 0 40%' }}
                  >
                    {column.label}
                  </Typography>
                  <Box sx={{ flex: 1, minWidth: 0, textAlign: 'right', overflowWrap: 'anywhere' }}>
                    {renderDataValue(column.render(row, index))}
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
                <TableCell key={column.label} align={column.align || 'left'}>{column.label}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={getKey?.(row, index) || index}>
                {columns.map((column) => (
                  <TableCell key={column.label} align={column.align || 'left'}>
                    {renderDataValue(column.render(row, index))}
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

export function defaultExpenseForm() {
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

export function defaultRecurringForm() {
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

