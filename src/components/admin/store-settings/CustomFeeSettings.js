'use client';
/**
 * Store Settings → Custom order fees (services/billing/feeSettings.js): the client-management bonus a
 * CAD designer earns for handling the customer thread (share of the order margin), and the flat QC review
 * fee credited to whoever reviews a CAD / piece work order (passes through to the client at cost).
 */
import React, { useEffect, useState } from 'react';
import { Alert, Button, Card, CardContent, Grid, Stack, TextField, Typography } from '@mui/material';
import DesignServicesIcon from '@mui/icons-material/DesignServices';

export default function CustomFeeSettings() {
  const [form, setForm] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = (fees) => setForm({ bonusPct: (Number(fees.clientMgmtBonusPct) * 100).toFixed(2).replace(/\.?0+$/, ''), qcReviewFee: String(fees.qcReviewFee) });
  useEffect(() => {
    fetch('/api/admin/settings/custom-fees').then((r) => r.json()).then((b) => load(b.fees)).catch(() => setMsg({ severity: 'error', text: 'Could not load custom fees.' }));
  }, []);

  const save = async () => {
    setSaving(true); setMsg(null);
    try {
      const fees = { clientMgmtBonusPct: form.bonusPct === '' ? '' : Number(form.bonusPct) / 100, qcReviewFee: form.qcReviewFee };
      const res = await fetch('/api/admin/settings/custom-fees', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fees }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Could not save');
      load(body.fees); setDirty(false);
      setMsg({ severity: 'success', text: 'Saved. Applies to orders completed and work orders reviewed from now on.' });
    } catch (e) { setMsg({ severity: 'error', text: e.message }); } finally { setSaving(false); }
  };

  if (!form) return null;
  return (
    <Card sx={{ mt: 3 }}>
      <CardContent>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
          <DesignServicesIcon />
          <Typography variant="h6" sx={{ flex: 1 }}>Custom order fees</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Two labor lines the customs pipeline writes automatically. Both are paid through payroll like any other credit.
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField label="Client-management bonus" type="number" size="small" fullWidth value={form.bonusPct}
              onChange={(e) => { setForm((f) => ({ ...f, bonusPct: e.target.value })); setDirty(true); }}
              helperText="Share of the custom order's margin to the CAD designer who handled the client thread themselves"
              InputProps={{ endAdornment: <Typography variant="body2" color="text.secondary">%</Typography> }} inputProps={{ min: 0, max: 100, step: 0.5 }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="QC review fee" type="number" size="small" fullWidth value={form.qcReviewFee}
              onChange={(e) => { setForm((f) => ({ ...f, qcReviewFee: e.target.value })); setDirty(true); }}
              helperText="Flat credit to the reviewer of a CAD or piece work order; billed to the client at cost"
              InputProps={{ startAdornment: <Typography variant="body2" color="text.secondary" sx={{ mr: 0.5 }}>$</Typography> }} inputProps={{ min: 0, max: 1000, step: 1 }} />
          </Grid>
        </Grid>
        <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
          <Button variant="contained" onClick={save} disabled={!dirty || saving} sx={{ textTransform: 'none' }}>{saving ? 'Saving…' : 'Save custom fees'}</Button>
        </Stack>
        {msg && <Alert severity={msg.severity} sx={{ mt: 2 }}>{msg.text}</Alert>}
      </CardContent>
    </Card>
  );
}
