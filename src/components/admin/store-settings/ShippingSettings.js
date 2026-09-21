'use client';

import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Chip, Grid, Stack, TextField, Typography } from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';

const FIELDS = [
  ['company', 'Company', 6], ['name', 'Contact name', 6],
  ['street1', 'Street', 8], ['street2', 'Suite / unit', 4],
  ['city', 'City', 5], ['state', 'State', 3], ['zip', 'ZIP', 4],
  ['phone', 'Phone', 6], ['email', 'Email', 6],
];

/**
 * Store Settings → Shipping: the shop's ship-from address (rates are impossible without it) and
 * the EasyPost connection status. Saves through /api/admin/settings/shipping — no PIN, it's an
 * address, not a price. Parcel presets use the built-in defaults until the owner wants to edit them.
 */
export default function ShippingSettings() {
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    fetch('/api/admin/settings/shipping').then((r) => r.json()).then((body) => {
      setData(body); setForm(body.shipFrom || {});
    }).catch((e) => setMsg({ severity: 'error', text: e.message }));
  }, []);

  const save = async () => {
    setSaving(true); setMsg(null);
    try {
      const res = await fetch('/api/admin/settings/shipping', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shipFrom: form }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Save failed.');
      setData((d) => ({ ...d, ...body }));
      setMsg({ severity: 'success', text: body.shipFromProblems?.length ? `Saved. Still missing: ${body.shipFromProblems.join(', ')}` : 'Saved. Rates can be quoted.' });
    } catch (e) {
      setMsg({ severity: 'error', text: e.message });
    } finally {
      setSaving(false);
    }
  };

  if (!form) return null;
  const ep = data?.easypost || {};

  return (
    <Card>
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <LocalShippingIcon fontSize="small" />
          <Typography variant="h6">Shipping</Typography>
          <Chip size="small" label={ep.configured ? `EasyPost ${ep.mode}` : 'EasyPost not configured'} color={ep.configured ? (ep.mode === 'production' ? 'success' : 'warning') : 'default'} />
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Ship-from address for return shipments. FedEx rates at finalize and labels from Shipping &amp; Delivery both need it.
          {!ep.configured && ' Set EASYPOST_API_KEY in the deployment to enable rates.'}
        </Typography>
        <Grid container spacing={1.5}>
          {FIELDS.map(([key, label, md]) => (
            <Grid item xs={12} md={md} key={key}>
              <TextField fullWidth size="small" label={label} value={form[key] || ''} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />
            </Grid>
          ))}
        </Grid>
        {data?.shipFromProblems?.length > 0 && !msg && (
          <Alert severity="warning" sx={{ mt: 2 }}>Incomplete: {data.shipFromProblems.join(', ')}</Alert>
        )}
        {msg && <Alert severity={msg.severity} sx={{ mt: 2 }}>{msg.text}</Alert>}
        <Box sx={{ mt: 2 }}>
          <Button variant="contained" onClick={save} disabled={saving}>Save shipping address</Button>
        </Box>
      </CardContent>
    </Card>
  );
}
