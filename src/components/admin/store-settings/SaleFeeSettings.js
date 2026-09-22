'use client';
/**
 * Store Settings → Sale fees. EFD's cut when a piece sells through the shop (services/billing/feeSettings.js):
 * consignment = EFD holds + ships, marketplace = the artisan holds + ships, hybrid = storefront + whichever
 * physical pillars EFD adds. Published live on "How EFD works" and used by the sale-payout math.
 */
import React, { useEffect, useState } from 'react';
import { Alert, Button, Card, CardContent, Grid, Stack, TextField, Typography } from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';

const toPct = (frac) => (Number(frac || 0) * 100).toFixed(2).replace(/\.?0+$/, '');
const fromPct = (pct) => (pct === '' ? '' : Number(pct) / 100);

export default function SaleFeeSettings() {
  const [form, setForm] = useState(null); // percents as strings for editing
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = (schedule) => setForm({
    consignment: toPct(schedule.consignment), marketplace: toPct(schedule.marketplace),
    storefront: toPct(schedule.pillars.storefront), custody: toPct(schedule.pillars.custody), fulfillment: toPct(schedule.pillars.fulfillment),
  });
  useEffect(() => {
    fetch('/api/admin/settings/sale-fees').then((r) => r.json()).then((b) => load(b.schedule)).catch(() => setMsg({ severity: 'error', text: 'Could not load sale fees.' }));
  }, []);

  const edit = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setDirty(true); };
  const save = async () => {
    setSaving(true); setMsg(null);
    try {
      const schedule = { consignment: fromPct(form.consignment), marketplace: fromPct(form.marketplace), pillars: { storefront: fromPct(form.storefront), custody: fromPct(form.custody), fulfillment: fromPct(form.fulfillment) } };
      const res = await fetch('/api/admin/settings/sale-fees', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ schedule }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Could not save');
      load(body.schedule); setDirty(false);
      setMsg({ severity: 'success', text: 'Saved. New sales use these rates; payouts already computed keep theirs.' });
    } catch (e) { setMsg({ severity: 'error', text: e.message }); } finally { setSaving(false); }
  };

  if (!form) return null;
  const field = (k, label, help) => (
    <TextField label={label} type="number" size="small" fullWidth value={form[k]} onChange={(e) => edit(k, e.target.value)} helperText={help}
      InputProps={{ endAdornment: <Typography variant="body2" color="text.secondary">%</Typography> }} inputProps={{ min: 0, max: 100, step: 0.5 }} />
  );
  const hybrid = ['storefront', 'custody', 'fulfillment'].reduce((s, k) => s + (Number(form[k]) || 0), 0);

  return (
    <Card sx={{ mt: 3 }}>
      <CardContent>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
          <StorefrontIcon />
          <Typography variant="h6" sx={{ flex: 1 }}>Sale fees</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          EFD&rsquo;s cut when an artisan&rsquo;s piece sells through the shop. The artisan&rsquo;s payout is the sale price minus this fee minus any labor EFD already paid them. Selling in person owes nothing.
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>{field('consignment', 'Consignment', 'EFD holds the piece and ships it')}</Grid>
          <Grid item xs={12} sm={6}>{field('marketplace', 'Marketplace', 'Artisan holds and ships; storefront only')}</Grid>
          <Grid item xs={12}><Typography variant="subtitle2" sx={{ mt: 1 }}>Hybrid pillars (added together when EFD does part of the chain)</Typography></Grid>
          <Grid item xs={12} sm={4}>{field('storefront', 'Storefront', 'Listing + traffic (the base)')}</Grid>
          <Grid item xs={12} sm={4}>{field('custody', 'Custody', 'EFD physically holds it')}</Grid>
          <Grid item xs={12} sm={4}>{field('fulfillment', 'Fulfillment', 'EFD picks, packs, ships')}</Grid>
        </Grid>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
          <Typography variant="caption" color="text.secondary">All three pillars together: {hybrid.toFixed(1)}%</Typography>
          <Button variant="contained" onClick={save} disabled={!dirty || saving} sx={{ textTransform: 'none' }}>{saving ? 'Saving…' : 'Save sale fees'}</Button>
        </Stack>
        {msg && <Alert severity={msg.severity} sx={{ mt: 2 }}>{msg.text}</Alert>}
      </CardContent>
    </Card>
  );
}
