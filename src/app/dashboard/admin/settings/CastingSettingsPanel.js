'use client';

import { useEffect, useState } from 'react';
import {
  Box, Card, CardContent, Grid, TextField, Button, Alert,
  InputAdornment, CircularProgress, Typography,
} from '@mui/material';
import { Save as SaveIcon, Whatshot as WhatshotIcon } from '@mui/icons-material';

const DEFAULTS = { castingMarkup: 1.3, castingLaborFee: 15 };

export default function CastingSettingsPanel() {
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
        const c = json?.casting || {};
        setForm({
          castingMarkup: c.castingMarkup ?? DEFAULTS.castingMarkup,
          castingLaborFee: c.castingLaborFee ?? DEFAULTS.castingLaborFee,
        });
      } catch {
        setError('Failed to load casting settings');
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
          casting: {
            castingMarkup: parseFloat(form.castingMarkup) || DEFAULTS.castingMarkup,
            castingLaborFee: parseFloat(form.castingLaborFee) ?? DEFAULTS.castingLaborFee,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Save failed');
      setSuccess('Casting settings saved.');
    } catch (e) {
      setError(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <WhatshotIcon sx={{ color: '#D4AF37' }} />
        <Typography variant="h6" sx={{ color: '#D1D5DB', fontWeight: 600 }}>Casting Pricing</Typography>
      </Box>
      <Typography variant="body2" sx={{ color: '#9CA3AF', mb: 3 }}>
        Configure the casting markup and flat labor fee used in product cost estimates and custom quote calculations.
        Formula: material cost × markup + labor fee.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Card sx={{ backgroundColor: '#15181D', border: '1px solid #2A2F38', backgroundImage: 'none' }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Casting Markup"
                value={form.castingMarkup}
                onChange={(e) => setField('castingMarkup', e.target.value)}
                type="number"
                size="small"
                fullWidth
                inputProps={{ min: 1, max: 5, step: 0.05 }}
                helperText="Multiplier applied to material cost (e.g. 1.3 = 30% markup). Min 1.0, max 5.0."
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Casting Labor Fee"
                value={form.castingLaborFee}
                onChange={(e) => setField('castingLaborFee', e.target.value)}
                type="number"
                size="small"
                fullWidth
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                inputProps={{ min: 0, max: 500, step: 1 }}
                helperText="Flat per-casting labor charge added to material cost."
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
              onClick={handleSave}
              disabled={saving}
              sx={{ backgroundColor: '#D4AF37', color: '#1A1A1A', fontWeight: 600, '&:hover': { backgroundColor: '#C19B2E' } }}
            >
              {saving ? 'Saving…' : 'Save Casting Settings'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
