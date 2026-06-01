'use client';

import { useEffect, useState } from 'react';
import {
  Box, Card, CardContent, CardHeader, Grid, TextField, Button, Alert,
  InputAdornment, CircularProgress, Typography
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';

const DEFAULTS = {
  cogMarkup: 2.5,
  designFeeMarkup: 1.5,
  defaultDesignerFee: 0,
  commissionPercentage: 0.10,
  targetMarginFloor: 0.45,
};

/**
 * Custom Design Pricing settings (settings.financial) for the quote formula v2.
 * Self-contained: loads GET /api/admin/settings, saves POST /api/admin/settings
 * (financial; no security code). See docs/custom-design-flow-redesign.md §9.
 */
export default function CustomDesignPricingTab() {
  const [form, setForm] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/settings');
        const json = await res.json();
        const f = json?.financial || {};
        setForm({
          cogMarkup: f.cogMarkup ?? DEFAULTS.cogMarkup,
          designFeeMarkup: f.designFeeMarkup ?? DEFAULTS.designFeeMarkup,
          defaultDesignerFee: f.defaultDesignerFee ?? DEFAULTS.defaultDesignerFee,
          commissionPercentage: f.commissionPercentage ?? DEFAULTS.commissionPercentage,
          targetMarginFloor: f.targetMarginFloor ?? DEFAULTS.targetMarginFloor,
        });
      } catch {
        setError('Failed to load settings');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const setField = (key, value) => setForm((p) => ({ ...p, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          financial: {
            cogMarkup: parseFloat(form.cogMarkup) || DEFAULTS.cogMarkup,
            designFeeMarkup: parseFloat(form.designFeeMarkup) || DEFAULTS.designFeeMarkup,
            defaultDesignerFee: parseFloat(form.defaultDesignerFee) || 0,
            commissionPercentage: (parseFloat(form.commissionPercentage) || 0),
            targetMarginFloor: (parseFloat(form.targetMarginFloor) || 0),
          },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Save failed');
      setSuccess('Custom design pricing saved.');
    } catch (e) {
      setError(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>;
  }

  // commission & margin floor are stored as decimals (0.10) but edited as percents (10)
  const pctValue = (v) => (v == null ? '' : Math.round(v * 1000) / 10);
  const setPct = (key, percent) => setField(key, (parseFloat(percent) || 0) / 100);

  return (
    <Box sx={{ maxWidth: 720 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Card>
        <CardHeader
          title="Custom Design Pricing"
          subheader="Drives the custom quote builder. COG markup can be overridden per-quote in the builder."
        />
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth label="COG Markup (×)" type="number"
                value={form.cogMarkup}
                onChange={(e) => setField('cogMarkup', e.target.value)}
                helperText="Applied to materials + labor. Default 2.5×."
                inputProps={{ min: 1, max: 10, step: 0.1 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth label="Design Fee Markup (×)" type="number"
                value={form.designFeeMarkup}
                onChange={(e) => setField('designFeeMarkup', e.target.value)}
                helperText="Charge = designer's fee × this. Shop keeps the spread."
                inputProps={{ min: 1, max: 5, step: 0.1 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth label="Default Designer Fee" type="number"
                value={form.defaultDesignerFee}
                onChange={(e) => setField('defaultDesignerFee', e.target.value)}
                helperText="Used when no designer fee is set on the assigned artisan."
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                inputProps={{ min: 0, step: 5 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth label="Commission (% of profit)" type="number"
                value={pctValue(form.commissionPercentage)}
                onChange={(e) => setPct('commissionPercentage', e.target.value)}
                helperText="Analytics payout. Set 0 to disable."
                InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                inputProps={{ min: 0, max: 100, step: 1 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth label="Target Margin Floor" type="number"
                value={pctValue(form.targetMarginFloor)}
                onChange={(e) => setPct('targetMarginFloor', e.target.value)}
                helperText="Quote warns below this gross margin."
                InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                inputProps={{ min: 0, max: 100, step: 1 }}
              />
            </Grid>
          </Grid>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
            Tax is handled at checkout by Stripe Tax — quotes are pre-tax.
          </Typography>

          <Box sx={{ mt: 3 }}>
            <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Custom Design Pricing'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
