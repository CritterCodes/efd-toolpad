'use client';
/**
 * Store Settings → Payroll funding. The Monday check that tops up EFD's Stripe balance from the
 * business bank account so Wednesday's Connect payouts never wait (services/payroll/payrollFunding.js).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Chip, FormControlLabel, Grid, Stack, Switch, TextField, Typography } from '@mui/material';
import SavingsIcon from '@mui/icons-material/Savings';

const money = (n) => Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export default function PayrollFundingSettings() {
  const [settings, setSettings] = useState(null);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = useCallback(() => {
    fetch('/api/admin/settings/payroll-funding').then((r) => r.json()).then((body) => {
      setSettings(body?.settings || null);
      setPreview(body?.preview || null);
    }).catch(() => setMsg({ severity: 'error', text: 'Could not load payroll funding settings.' }));
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async (next) => {
    setSaving(true); setMsg(null);
    try {
      const res = await fetch('/api/admin/settings/payroll-funding', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Could not save');
      setSettings(body.settings);
      setMsg({ severity: 'success', text: body.settings.enabled ? 'Funding check is on. It runs every morning.' : 'Funding check is off.' });
      load();
    } catch (e) {
      setMsg({ severity: 'error', text: e.message });
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return null;
  const field = (key, label, help) => (
    <TextField
      label={label} type="number" size="small" fullWidth value={settings[key]}
      onChange={(e) => setSettings((s) => ({ ...s, [key]: e.target.value }))}
      onBlur={() => save(settings)}
      helperText={help}
      inputProps={{ min: 0, step: key === 'bufferPct' ? 1 : 25 }}
    />
  );

  return (
    <Card sx={{ mt: 3 }}>
      <CardContent>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
          <SavingsIcon />
          <Typography variant="h6" sx={{ flex: 1 }}>Payroll funding</Typography>
          <Chip label={settings.enabled ? 'On — daily' : 'Off'} color={settings.enabled ? 'success' : 'default'} size="small" />
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Contractors are paid from EFD&rsquo;s Stripe balance, and Stripe never pulls from the bank to cover a payout. Every morning this
          projects Wednesday&rsquo;s payroll, and if the balance is short it tops Stripe up from the business bank account (an ACH debit, 1&ndash;2
          business days) for the shortfall plus the floor. Requires a bank account verified for top-ups in the Stripe dashboard.
        </Typography>
        <FormControlLabel
          control={<Switch checked={settings.enabled} onChange={(e) => save({ ...settings, enabled: e.target.checked })} disabled={saving} />}
          label="Top up Stripe automatically before payroll"
        />
        <Grid container spacing={1.5} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={4}>{field('floor', 'Floor to keep in Stripe ($)', 'Always aim to have this much available on top of payroll.')}</Grid>
          <Grid item xs={12} sm={4}>{field('bufferPct', 'Buffer (%)', 'Extra over the projection for work credited after Monday.')}</Grid>
          <Grid item xs={12} sm={4}>{field('minimumTopup', 'Smallest top-up ($)', 'Shortfalls below this are ignored.')}</Grid>
          <Grid item xs={12} sm={4}>{field('maxTopup', 'Largest single top-up ($)', 'Hard cap per run — the check cannot see your bank balance, so this protects rent.')}</Grid>
        </Grid>
        {preview && !preview.error && preview.need && (
          <Box sx={{ mt: 2, p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Typography variant="subtitle2">Right now</Typography>
            <Typography variant="body2" color="text.secondary">
              Wednesday needs about <strong>{money(preview.need.projected)}</strong>
              {preview.due?.payees?.length ? ` (${preview.due.payees.join(', ')})` : ''}; target with buffer and floor is <strong>{money(preview.need.target)}</strong>.
              Stripe has {money(preview.available)} available + {money(preview.pending)} pending.{' '}
              {preview.need.topup > 0 ? <>The next run would pull <strong>{money(preview.need.topup)}</strong>.</> : <>Nothing to pull.</>}
            </Typography>
          </Box>
        )}
        {preview?.error && <Alert severity="warning" sx={{ mt: 2 }}>Preview failed: {preview.error}</Alert>}
        <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
          <Button size="small" variant="text" onClick={load} disabled={saving}>Refresh preview</Button>
        </Stack>
        {msg && <Alert severity={msg.severity} sx={{ mt: 2 }}>{msg.text}</Alert>}
      </CardContent>
    </Card>
  );
}
