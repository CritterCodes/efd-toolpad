"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import {
  DEBT_ACCOUNT_TYPES,
  DEBT_PAYMENT_METHODS,
  DEBT_PAYMENT_SCHEDULE_OPTIONS,
  DEBT_PAYMENT_SCHEDULES,
} from '@/services/debtAccounts';

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

function dateInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString('en-US');
}

function formatMoney(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(value || 0));
}

const EMPTY_ACCOUNT = {
  name: '',
  type: 'credit_card',
  lender: '',
  active: true,
  openingBalance: '',
  openingBalanceDate: todayInput(),
  minimumPayment: '',
  interestRateAPR: '',
  paymentSchedule: DEBT_PAYMENT_SCHEDULES.NONE,
  monthlyDueDay: '',
  nextPaymentDate: '',
  flatFeeAmount: '',
  installmentCount: '6',
  notes: '',
};

const EMPTY_STATEMENT = {
  debtAccountID: '',
  statementDate: todayInput(),
  balance: '',
  minimumPaymentDue: '',
  dueDate: '',
  interestCharged: '',
  feesCharged: '',
  notes: '',
};

const EMPTY_PAYMENT = {
  debtAccountID: '',
  paymentDate: todayInput(),
  amount: '',
  principalAmount: '',
  interestAmount: '',
  feeAmount: '',
  paymentMethod: 'bank_transfer',
  paymentReference: '',
  notes: '',
};

export default function DebtAccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [statements, setStatements] = useState([]);
  const [payments, setPayments] = useState([]);
  const [accountForm, setAccountForm] = useState(EMPTY_ACCOUNT);
  const [statementForm, setStatementForm] = useState(EMPTY_STATEMENT);
  const [paymentForm, setPaymentForm] = useState(EMPTY_PAYMENT);
  const [editingAccountID, setEditingAccountID] = useState(null);
  const [splitPayment, setSplitPayment] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  async function loadDebtData() {
    setLoading(true);
    try {
      const response = await fetch('/api/debtAccounts');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load debt accounts.');
      setAccounts(data.accounts || []);
      setStatements(data.statements || []);
      setPayments(data.payments || []);
      const firstAccountID = data.accounts?.[0]?.debtAccountID || '';
      setStatementForm((current) => ({ ...current, debtAccountID: current.debtAccountID || firstAccountID }));
      setPaymentForm((current) => ({ ...current, debtAccountID: current.debtAccountID || firstAccountID }));
    } catch (error) {
      setStatus({ severity: 'error', message: error.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDebtData();
  }, []);

  const latestStatementByAccount = useMemo(() => {
    const map = new Map();
    for (const statement of statements) {
      const current = map.get(statement.debtAccountID);
      if (!current || new Date(statement.statementDate) > new Date(current.statementDate)) {
        map.set(statement.debtAccountID, statement);
      }
    }
    return map;
  }, [statements]);
  const selectedPaymentAccount = accounts.find((account) => account.debtAccountID === paymentForm.debtAccountID);
  const shouldAutoSplitPayment = selectedPaymentAccount?.paymentSchedule === DEBT_PAYMENT_SCHEDULES.CASH_APP_FLAT_FEE;

  function getAccountPayoff(account, latest) {
    const balanceDate = latest?.statementDate || account.openingBalanceDate || account.createdAt;
    const accountPayments = payments.filter((payment) => payment.debtAccountID === account.debtAccountID);
    const paymentsAfterBalance = accountPayments.filter((payment) => (
      balanceDate && new Date(payment.paymentDate) > new Date(balanceDate)
    ));
    const principalPaid = paymentsAfterBalance.reduce((sum, payment) => sum + Number(payment.principalAmount || 0), 0);
    const feePaid = paymentsAfterBalance.reduce((sum, payment) => sum + Number(payment.feeAmount || 0), 0);
    const totalPaid = paymentsAfterBalance.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const principalStart = Number(latest?.balance ?? account.openingBalance ?? 0);
    const principalRemaining = Math.max(principalStart - principalPaid, 0);
    const feeRemaining = account.paymentSchedule === DEBT_PAYMENT_SCHEDULES.CASH_APP_FLAT_FEE
      ? Math.max(Number(account.flatFeeAmount || 0) - feePaid, 0)
      : 0;
    const payoffBalance = account.paymentSchedule === DEBT_PAYMENT_SCHEDULES.CASH_APP_FLAT_FEE
      ? Math.max(principalStart + Number(account.flatFeeAmount || 0) - totalPaid, 0)
      : principalRemaining;

    return { principalRemaining, feeRemaining, payoffBalance };
  }

  function updateAccount(field, value) {
    setAccountForm((current) => ({ ...current, [field]: value }));
  }

  function updateStatement(field, value) {
    setStatementForm((current) => ({ ...current, [field]: value }));
  }

  function updatePayment(field, value) {
    setPaymentForm((current) => ({ ...current, [field]: value }));
  }

  function editAccount(account) {
    setEditingAccountID(account.debtAccountID);
    setAccountForm({
      name: account.name || '',
      type: account.type || 'other',
      lender: account.lender || '',
      active: account.active !== false,
      openingBalance: String(account.openingBalance || ''),
      openingBalanceDate: dateInput(account.openingBalanceDate),
      minimumPayment: String(account.minimumPayment || ''),
      interestRateAPR: account.interestRateAPR == null ? '' : String(account.interestRateAPR),
      paymentSchedule: account.paymentSchedule || (account.dueDay ? DEBT_PAYMENT_SCHEDULES.MONTHLY : DEBT_PAYMENT_SCHEDULES.NONE),
      monthlyDueDay: account.monthlyDueDay || account.dueDay ? String(account.monthlyDueDay || account.dueDay) : '',
      nextPaymentDate: dateInput(account.nextPaymentDate || account.nextDueDate),
      flatFeeAmount: String(account.flatFeeAmount || ''),
      installmentCount: String(account.installmentCount || 6),
      notes: account.notes || '',
    });
  }

  function resetAccountForm() {
    setEditingAccountID(null);
    setAccountForm(EMPTY_ACCOUNT);
  }

  async function submitAccount(event) {
    event.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const url = editingAccountID ? `/api/debtAccounts/${editingAccountID}` : '/api/debtAccounts';
      const response = await fetch(url, {
        method: editingAccountID ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...accountForm,
          openingBalance: Number(accountForm.openingBalance || 0),
          minimumPayment: Number(accountForm.minimumPayment || 0),
          interestRateAPR: accountForm.interestRateAPR === '' ? null : Number(accountForm.interestRateAPR),
          monthlyDueDay: accountForm.monthlyDueDay ? Number(accountForm.monthlyDueDay) : null,
          nextPaymentDate: accountForm.nextPaymentDate || null,
          flatFeeAmount: Number(accountForm.flatFeeAmount || 0),
          installmentCount: accountForm.installmentCount ? Number(accountForm.installmentCount) : null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save debt account.');
      setStatus({ severity: 'success', message: 'Debt account saved.' });
      resetAccountForm();
      await loadDebtData();
    } catch (error) {
      setStatus({ severity: 'error', message: error.message });
    } finally {
      setSaving(false);
    }
  }

  async function submitStatement(event) {
    event.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const response = await fetch('/api/debtStatements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...statementForm,
          balance: Number(statementForm.balance || 0),
          minimumPaymentDue: Number(statementForm.minimumPaymentDue || 0),
          interestCharged: Number(statementForm.interestCharged || 0),
          feesCharged: Number(statementForm.feesCharged || 0),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save statement.');
      setStatus({ severity: 'success', message: 'Statement saved.' });
      setStatementForm({ ...EMPTY_STATEMENT, debtAccountID: statementForm.debtAccountID });
      await loadDebtData();
    } catch (error) {
      setStatus({ severity: 'error', message: error.message });
    } finally {
      setSaving(false);
    }
  }

  async function submitPayment(event) {
    event.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const response = await fetch('/api/debtPayments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...paymentForm,
          amount: Number(paymentForm.amount || 0),
          principalAmount: shouldAutoSplitPayment || !splitPayment || paymentForm.principalAmount === '' ? null : Number(paymentForm.principalAmount || 0),
          interestAmount: shouldAutoSplitPayment || !splitPayment ? 0 : Number(paymentForm.interestAmount || 0),
          feeAmount: shouldAutoSplitPayment || !splitPayment ? 0 : Number(paymentForm.feeAmount || 0),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save payment.');
      setStatus({ severity: 'success', message: 'Debt payment saved.' });
      setPaymentForm({ ...EMPTY_PAYMENT, debtAccountID: paymentForm.debtAccountID });
      setSplitPayment(false);
      await loadDebtData();
    } catch (error) {
      setStatus({ severity: 'error', message: error.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box sx={{ p: 4 }}>
      <Stack spacing={3}>
        <Button component={Link} href="/dashboard/finance" sx={{ alignSelf: 'flex-start' }}>
          Back to Finance
        </Button>

        <Stack spacing={1}>
          <Typography variant="h4" fontWeight="bold">Debt Accounts</Typography>
          <Typography variant="body2" color="text.secondary">
            Track credit cards, loans, cash advances, statement balances, and repayment cash flow.
          </Typography>
        </Stack>

        {status && <Alert severity={status.severity}>{status.message}</Alert>}

        <Card>
          <CardContent>
            <Stack component="form" spacing={2} onSubmit={submitAccount}>
              <Typography variant="h6" fontWeight={700}>{editingAccountID ? 'Edit Debt Account' : 'Add Debt Account'}</Typography>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField label="Name" value={accountForm.name} onChange={(event) => updateAccount('name', event.target.value)} required fullWidth />
                <TextField label="Type" value={accountForm.type} onChange={(event) => updateAccount('type', event.target.value)} select fullWidth>
                  {DEBT_ACCOUNT_TYPES.map((type) => <MenuItem key={type} value={type}>{type}</MenuItem>)}
                </TextField>
                <TextField label="Lender / source" value={accountForm.lender} onChange={(event) => updateAccount('lender', event.target.value)} fullWidth />
              </Stack>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField label="Opening/as-of balance" type="number" inputProps={{ min: 0, step: '0.01' }} value={accountForm.openingBalance} onChange={(event) => updateAccount('openingBalance', event.target.value)} required fullWidth />
                <TextField label="Balance as-of date" type="date" value={accountForm.openingBalanceDate} onChange={(event) => updateAccount('openingBalanceDate', event.target.value)} InputLabelProps={{ shrink: true }} required fullWidth />
                <TextField label="Minimum payment" type="number" inputProps={{ min: 0, step: '0.01' }} value={accountForm.minimumPayment} onChange={(event) => updateAccount('minimumPayment', event.target.value)} fullWidth />
                <TextField label="APR (%) optional" type="number" inputProps={{ min: 0, step: '0.01' }} value={accountForm.interestRateAPR} onChange={(event) => updateAccount('interestRateAPR', event.target.value)} fullWidth />
              </Stack>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField label="Payment schedule" value={accountForm.paymentSchedule} onChange={(event) => updateAccount('paymentSchedule', event.target.value)} select fullWidth>
                  {DEBT_PAYMENT_SCHEDULE_OPTIONS.map((schedule) => <MenuItem key={schedule} value={schedule}>{schedule}</MenuItem>)}
                </TextField>
                {accountForm.paymentSchedule === DEBT_PAYMENT_SCHEDULES.MONTHLY && (
                  <TextField label="Monthly due day" type="number" inputProps={{ min: 1, max: 31, step: 1 }} value={accountForm.monthlyDueDay} onChange={(event) => updateAccount('monthlyDueDay', event.target.value)} fullWidth />
                )}
                {[DEBT_PAYMENT_SCHEDULES.WEEKLY, DEBT_PAYMENT_SCHEDULES.ONE_TIME, DEBT_PAYMENT_SCHEDULES.CASH_APP_FLAT_FEE].includes(accountForm.paymentSchedule) && (
                  <TextField label={accountForm.paymentSchedule === DEBT_PAYMENT_SCHEDULES.CASH_APP_FLAT_FEE ? 'First weekly payment date' : 'Next payment date'} type="date" value={accountForm.nextPaymentDate} onChange={(event) => updateAccount('nextPaymentDate', event.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
                )}
                <FormControlLabel control={<Checkbox checked={accountForm.active} onChange={(event) => updateAccount('active', event.target.checked)} />} label="Active" />
              </Stack>
              {accountForm.paymentSchedule === DEBT_PAYMENT_SCHEDULES.CASH_APP_FLAT_FEE && (
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <TextField label="Flat fee" type="number" inputProps={{ min: 0, step: '0.01' }} value={accountForm.flatFeeAmount} onChange={(event) => updateAccount('flatFeeAmount', event.target.value)} fullWidth />
                  <TextField label="Weekly payments" type="number" inputProps={{ min: 1, step: 1 }} value={accountForm.installmentCount} onChange={(event) => updateAccount('installmentCount', event.target.value)} fullWidth />
                </Stack>
              )}
              <TextField label="Notes" value={accountForm.notes} onChange={(event) => updateAccount('notes', event.target.value)} multiline minRows={2} />
              <Stack direction="row" spacing={1}>
                <Button type="submit" variant="contained" disabled={loading || saving}>{editingAccountID ? 'Save Account' : 'Add Account'}</Button>
                {editingAccountID && <Button variant="outlined" onClick={resetAccountForm} disabled={saving}>Cancel</Button>}
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3} alignItems="stretch">
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Stack component="form" spacing={2} onSubmit={submitStatement}>
                <Typography variant="h6" fontWeight={700}>Add Statement Snapshot</Typography>
                <TextField label="Debt account" value={statementForm.debtAccountID} onChange={(event) => updateStatement('debtAccountID', event.target.value)} select required>
                  {accounts.map((account) => <MenuItem key={account.debtAccountID} value={account.debtAccountID}>{account.name}</MenuItem>)}
                </TextField>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <TextField label="Statement date" type="date" value={statementForm.statementDate} onChange={(event) => updateStatement('statementDate', event.target.value)} InputLabelProps={{ shrink: true }} required fullWidth />
                  <TextField label="Statement balance" type="number" inputProps={{ min: 0, step: '0.01' }} value={statementForm.balance} onChange={(event) => updateStatement('balance', event.target.value)} required fullWidth />
                </Stack>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <TextField label="Minimum payment due" type="number" inputProps={{ min: 0, step: '0.01' }} value={statementForm.minimumPaymentDue} onChange={(event) => updateStatement('minimumPaymentDue', event.target.value)} fullWidth />
                  <TextField label="Payment due date" type="date" value={statementForm.dueDate} onChange={(event) => updateStatement('dueDate', event.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
                </Stack>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <TextField label="Interest charged on statement (optional)" type="number" inputProps={{ min: 0, step: '0.01' }} value={statementForm.interestCharged} onChange={(event) => updateStatement('interestCharged', event.target.value)} fullWidth />
                  <TextField label="Fees charged on statement (optional)" type="number" inputProps={{ min: 0, step: '0.01' }} value={statementForm.feesCharged} onChange={(event) => updateStatement('feesCharged', event.target.value)} fullWidth />
                </Stack>
                <TextField label="Notes" value={statementForm.notes} onChange={(event) => updateStatement('notes', event.target.value)} multiline minRows={2} />
                <Button type="submit" variant="contained" disabled={loading || saving || accounts.length === 0}>Add Statement</Button>
              </Stack>
            </CardContent>
          </Card>

          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Stack component="form" spacing={2} onSubmit={submitPayment}>
                <Typography variant="h6" fontWeight={700}>Add Debt Payment</Typography>
                <TextField label="Debt account" value={paymentForm.debtAccountID} onChange={(event) => updatePayment('debtAccountID', event.target.value)} select required>
                  {accounts.map((account) => <MenuItem key={account.debtAccountID} value={account.debtAccountID}>{account.name}</MenuItem>)}
                </TextField>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <TextField label="Payment date" type="date" value={paymentForm.paymentDate} onChange={(event) => updatePayment('paymentDate', event.target.value)} InputLabelProps={{ shrink: true }} required fullWidth />
                  <TextField label="Amount" type="number" inputProps={{ min: 0, step: '0.01' }} value={paymentForm.amount} onChange={(event) => updatePayment('amount', event.target.value)} required fullWidth />
                </Stack>
                {shouldAutoSplitPayment ? (
                  <Alert severity="info">
                    This Cash App payment will auto-split principal and flat fee from the account terms.
                  </Alert>
                ) : (
                  <>
                    <Alert severity="info">
                      Leave split off when you only know the payment amount. The full payment will reduce the balance.
                    </Alert>
                    <FormControlLabel control={<Checkbox checked={splitPayment} onChange={(event) => setSplitPayment(event.target.checked)} />} label="Advanced: split this payment" />
                    {splitPayment && (
                      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                        <TextField label="Principal" type="number" inputProps={{ min: 0, step: '0.01' }} value={paymentForm.principalAmount} onChange={(event) => updatePayment('principalAmount', event.target.value)} fullWidth />
                        <TextField label="Interest" type="number" inputProps={{ min: 0, step: '0.01' }} value={paymentForm.interestAmount} onChange={(event) => updatePayment('interestAmount', event.target.value)} fullWidth />
                        <TextField label="Fees" type="number" inputProps={{ min: 0, step: '0.01' }} value={paymentForm.feeAmount} onChange={(event) => updatePayment('feeAmount', event.target.value)} fullWidth />
                      </Stack>
                    )}
                  </>
                )}
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <TextField label="Payment method" value={paymentForm.paymentMethod} onChange={(event) => updatePayment('paymentMethod', event.target.value)} select fullWidth>
                    {DEBT_PAYMENT_METHODS.map((method) => <MenuItem key={method} value={method}>{method}</MenuItem>)}
                  </TextField>
                  <TextField label="Reference" value={paymentForm.paymentReference} onChange={(event) => updatePayment('paymentReference', event.target.value)} fullWidth />
                </Stack>
                <TextField label="Notes" value={paymentForm.notes} onChange={(event) => updatePayment('notes', event.target.value)} multiline minRows={2} />
                <Button type="submit" variant="contained" disabled={loading || saving || accounts.length === 0}>Add Payment</Button>
              </Stack>
            </CardContent>
          </Card>
        </Stack>

        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Debt Accounts</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Account</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Lender</TableCell>
                  <TableCell align="right">Payoff Balance</TableCell>
                  <TableCell align="right">Principal Left</TableCell>
                  <TableCell align="right">Fees Left</TableCell>
                  <TableCell align="right">Minimum Due</TableCell>
                  <TableCell>Schedule</TableCell>
                  <TableCell>Next Payment</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {accounts.map((account) => {
                  const latest = latestStatementByAccount.get(account.debtAccountID);
                  const payoff = getAccountPayoff(account, latest);
                  return (
                    <TableRow key={account.debtAccountID}>
                      <TableCell>{account.name}</TableCell>
                      <TableCell>{account.type}</TableCell>
                      <TableCell>{account.lender || 'N/A'}</TableCell>
                      <TableCell align="right">{formatMoney(payoff.payoffBalance)}</TableCell>
                      <TableCell align="right">{formatMoney(payoff.principalRemaining)}</TableCell>
                      <TableCell align="right">{formatMoney(payoff.feeRemaining)}</TableCell>
                      <TableCell align="right">{formatMoney(latest?.minimumPaymentDue ?? account.minimumPayment)}</TableCell>
                      <TableCell>{account.paymentSchedule || (account.dueDay ? 'monthly' : 'none')}</TableCell>
                      <TableCell>{formatDate(latest?.dueDate || account.nextPaymentDate || account.nextDueDate)}</TableCell>
                      <TableCell>{account.active === false ? 'Inactive' : 'Active'}</TableCell>
                      <TableCell><Button size="small" onClick={() => editAccount(account)}>Edit</Button></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Recent Debt Payments</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Account</TableCell>
                  <TableCell>Method</TableCell>
                  <TableCell align="right">Principal</TableCell>
                  <TableCell align="right">Interest/Fees</TableCell>
                  <TableCell align="right">Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {payments.slice(0, 10).map((payment) => {
                  const account = accounts.find((row) => row.debtAccountID === payment.debtAccountID);
                  return (
                    <TableRow key={payment.debtPaymentID}>
                      <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                      <TableCell>{account?.name || payment.debtAccountID}</TableCell>
                      <TableCell>{payment.paymentMethod}</TableCell>
                      <TableCell align="right">{formatMoney(payment.principalAmount)}</TableCell>
                      <TableCell align="right">{formatMoney(Number(payment.interestAmount || 0) + Number(payment.feeAmount || 0))}</TableCell>
                      <TableCell align="right">{formatMoney(payment.amount)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
