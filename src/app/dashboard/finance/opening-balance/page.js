"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

function toDateInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function moneyInput(value) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount.toFixed(2) : '0.00';
}

function formatMoney(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(value || 0));
}

export default function OpeningBalancePage() {
  const [form, setForm] = useState({
    asOfDate: '2026-05-09',
    bankBalance: '298.50',
    cashDrawerBalance: '0.00',
    notes: 'First clean cash start line. Older expenses retained as history.',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadOpeningBalance() {
      try {
        const response = await fetch('/api/finance/opening-balance');
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to load opening balance.');
        if (!active) return;

        const source = data.openingBalance || data.defaults || form;
        setForm({
          asOfDate: toDateInput(source.asOfDate),
          bankBalance: moneyInput(source.bankBalance),
          cashDrawerBalance: moneyInput(source.cashDrawerBalance),
          notes: source.notes || '',
        });
      } catch (error) {
        if (active) setStatus({ severity: 'error', message: error.message });
      } finally {
        if (active) setLoading(false);
      }
    }

    loadOpeningBalance();
    return () => {
      active = false;
    };
  }, []);

  const totalOpeningCash = useMemo(() => (
    Number(form.bankBalance || 0) + Number(form.cashDrawerBalance || 0)
  ), [form.bankBalance, form.cashDrawerBalance]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function saveOpeningBalance(event) {
    event.preventDefault();
    setSaving(true);
    setStatus(null);

    try {
      const response = await fetch('/api/finance/opening-balance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asOfDate: form.asOfDate,
          bankBalance: Number(form.bankBalance || 0),
          cashDrawerBalance: Number(form.cashDrawerBalance || 0),
          notes: form.notes,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save opening balance.');

      setStatus({ severity: 'success', message: 'Opening balance saved.' });
      if (data.openingBalance) {
        setForm({
          asOfDate: toDateInput(data.openingBalance.asOfDate),
          bankBalance: moneyInput(data.openingBalance.bankBalance),
          cashDrawerBalance: moneyInput(data.openingBalance.cashDrawerBalance),
          notes: data.openingBalance.notes || '',
        });
      }
    } catch (error) {
      setStatus({ severity: 'error', message: error.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box sx={{ p: 4 }}>
      <Stack spacing={2} sx={{ maxWidth: 900 }}>
        <Button component={Link} href="/dashboard/finance" sx={{ alignSelf: 'flex-start' }}>
          Back to Finance
        </Button>

        <Stack spacing={1}>
          <Typography variant="h4" fontWeight="bold">Opening Balance</Typography>
          <Typography variant="body2" color="text.secondary">
            Set the first reliable bank and cash drawer start line for Bank Safe-To-Spend reporting.
          </Typography>
        </Stack>

        {status && (
          <Alert severity={status.severity}>{status.message}</Alert>
        )}

        <Alert severity="info">
          Older expenses stay in history. Bank Safe-To-Spend starts from this opening balance and activity after this date.
        </Alert>

        <Card>
          <CardContent>
            <Stack component="form" spacing={2.5} onSubmit={saveOpeningBalance}>
              <TextField
                label="Opening date"
                type="date"
                value={form.asOfDate}
                onChange={(event) => updateField('asOfDate', event.target.value)}
                InputLabelProps={{ shrink: true }}
                required
                disabled={loading || saving}
              />

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField
                  label="Bank balance"
                  type="number"
                  inputProps={{ min: 0, step: '0.01' }}
                  value={form.bankBalance}
                  onChange={(event) => updateField('bankBalance', event.target.value)}
                  required
                  fullWidth
                  disabled={loading || saving}
                />
                <TextField
                  label="Cash drawer balance"
                  type="number"
                  inputProps={{ min: 0, step: '0.01' }}
                  value={form.cashDrawerBalance}
                  onChange={(event) => updateField('cashDrawerBalance', event.target.value)}
                  required
                  fullWidth
                  disabled={loading || saving}
                />
              </Stack>

              <TextField
                label="Notes"
                multiline
                minRows={3}
                value={form.notes}
                onChange={(event) => updateField('notes', event.target.value)}
                disabled={loading || saving}
              />

              <Card variant="outlined">
                <CardContent>
                  <Typography variant="overline" color="text.secondary">Total opening cash</Typography>
                  <Typography variant="h5" fontWeight={700}>{formatMoney(totalOpeningCash)}</Typography>
                </CardContent>
              </Card>

              <Button type="submit" variant="contained" disabled={loading || saving} sx={{ alignSelf: 'flex-start' }}>
                {saving ? 'Saving...' : 'Save Opening Balance'}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
