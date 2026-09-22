'use client';
/**
 * Store Settings → Daily payout fee. Weekly payouts are free to the payee (EFD absorbs Stripe's fee);
 * a DAILY payout nets Stripe's fee plus EFD's flat fee out of each transfer
 * (services/payroll/payoutCadence.js). Rates are settings so a Stripe price change is a field edit.
 */
import React, { useEffect, useState } from 'react';
import { Alert, Box, Card, CardContent, Grid, Stack, TextField, Typography } from '@mui/material';
import PaidIcon from '@mui/icons-material/Paid';

const money = (n) => Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export default function PayoutFeeSettings() {
  const [fees, setFees] = useState(null);
  const [label, setLabel] = useState('');
  const [example, setExample] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const apply = (body) => { setFees(body.fees); setLabel(body.label || ''); setExample(body.example || null); };
  useEffect(() => {
    fetch('/api/admin/settings/payout-fees').then((r) => r.json()).then(apply).catch(() => setMsg({ severity: 'error', text: 'Could not load payout fees.' }));
  }, []);

  const save = async () => {
    setSaving(true); setMsg(null);
    try {
      const res = await fetch('/api/admin/settings/payout-fees', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fees) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Could not save');
      apply(body);
      setMsg({ severity: 'success', text: 'Saved.' });
    } catch (e) {
      setMsg({ severity: 'error', text: e.message });
    } finally {
      setSaving(false);
    }
  };

  if (!fees) return null;
  const field = (key, labelText, help, step) => (
    <TextField
      label={labelText} type="number" size="small" fullWidth value={fees[key]}
      onChange={(e) => setFees((f) => ({ ...f, [key]: e.target.value }))}
      onBlur={save} helperText={help} inputProps={{ min: 0, step }}
    />
  );

  return (
    <Card sx={{ mt: 3 }}>
      <CardContent>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
          <PaidIcon />
          <Typography variant="h6" sx={{ flex: 1 }}>Daily payout fee</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Weekly payouts are free to the payee &mdash; EFD covers Stripe&rsquo;s fee. A payee you grant <strong>daily</strong> payouts pays for the
          speed: Stripe&rsquo;s payout fee plus EFD&rsquo;s flat fee, taken out of each transfer and shown on the batch as gross / fee / net.
          Owner-operators are never charged the EFD fee.
        </Typography>
        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={4}>{field('stripeFlat', 'Stripe flat ($)', 'Stripe’s per-payout flat fee, passed through.', 0.05)}</Grid>
          <Grid item xs={12} sm={4}>{field('stripePct', 'Stripe percent (%)', 'Stripe’s per-payout percentage, passed through.', 0.05)}</Grid>
          <Grid item xs={12} sm={4}>{field('dailyFlat', 'EFD flat fee ($)', 'What EFD adds per daily payout.', 0.25)}</Grid>
        </Grid>
        {example && (
          <Box sx={{ mt: 2, p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Typography variant="subtitle2">What a payee reads: daily payouts cost {label}</Typography>
            <Typography variant="body2" color="text.secondary">
              On a {money(example.gross)} day they receive <strong>{money(example.net)}</strong> ({money(example.stripeFee)} Stripe + {money(example.efdFee)} EFD).
            </Typography>
          </Box>
        )}
        {msg && <Alert severity={msg.severity} sx={{ mt: 2 }}>{msg.text}</Alert>}
        {saving && <Typography variant="caption" color="text.secondary">Saving…</Typography>}
      </CardContent>
    </Card>
  );
}
