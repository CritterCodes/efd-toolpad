'use client';
/**
 * Store Settings → Pay ladder. The published tiers (services/pay/payLadder.js): label, hourly pay
 * rate, one-line summary, and the bench-test requirements that place someone on the tier. The shop
 * rate (Pricing → wage) is separate and does not move when this does. Artisans see this ladder and
 * their own tier on "How EFD works" and on Payroll.
 */
import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, IconButton, Stack, TextField, Typography } from '@mui/material';
import StairsIcon from '@mui/icons-material/Stairs';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';

const money = (n) => Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export default function PayLadderSettings() {
  const [tiers, setTiers] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    fetch('/api/admin/settings/pay-ladder').then((r) => r.json())
      .then((b) => setTiers((b?.ladder?.tiers || []).map((t) => ({ ...t, requirementsText: (t.requirements || []).join('\n') }))))
      .catch(() => setTiers([]));
  }, []);

  const edit = (i, field, value) => {
    setTiers((prev) => prev.map((t, idx) => (idx === i ? { ...t, [field]: value } : t)));
    setDirty(true);
  };
  const remove = (i) => { setTiers((prev) => prev.filter((_, idx) => idx !== i)); setDirty(true); };
  const add = () => { setTiers((prev) => [...prev, { key: '', label: '', rate: '', summary: '', requirementsText: '' }]); setDirty(true); };

  const save = async () => {
    setSaving(true); setMsg(null);
    try {
      const payload = { tiers: tiers.map((t) => ({ key: t.key, label: t.label, rate: Number(t.rate), summary: t.summary, requirements: t.requirementsText })) };
      const res = await fetch('/api/admin/settings/pay-ladder', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ladder: payload }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Could not save');
      setTiers(body.ladder.tiers.map((t) => ({ ...t, requirementsText: (t.requirements || []).join('\n') })));
      setDirty(false);
      setMsg({ severity: 'success', text: 'Pay ladder saved. It is published on “How EFD works”; existing rates are unchanged until you re-place someone.' });
    } catch (e) {
      setMsg({ severity: 'error', text: e.message });
    } finally { setSaving(false); }
  };

  return (
    <Card sx={{ mt: 3 }}>
      <CardContent>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
          <StairsIcon />
          <Typography variant="h6">Pay ladder</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          What a jeweler is credited per catalog hour at each tier, and the bench test that places them there. The shop rate customers are priced from lives under Pricing and is separate. Place a person on a tier from their artisan profile (Staff &amp; Repair Operations).
        </Typography>
        {tiers === null ? (
          <Typography variant="body2" color="text.secondary">Loading…</Typography>
        ) : (
          <Stack spacing={2}>
            {tiers.map((t, i) => (
              <Box key={t.key || `new-${i}`} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }}>
                  <TextField size="small" label="Tier" value={t.label} onChange={(e) => edit(i, 'label', e.target.value)} sx={{ flex: 1 }} />
                  <TextField size="small" label="Pay rate ($/hr)" type="number" value={t.rate} onChange={(e) => edit(i, 'rate', e.target.value)} inputProps={{ min: 0, step: 0.5 }} sx={{ width: { xs: '100%', sm: 150 } }} />
                  <IconButton aria-label="Remove tier" onClick={() => remove(i)} disabled={tiers.length <= 1}><DeleteOutlineIcon /></IconButton>
                </Stack>
                <TextField size="small" fullWidth label="One-line summary" value={t.summary} onChange={(e) => edit(i, 'summary', e.target.value)} sx={{ mt: 1.5 }} />
                <TextField
                  size="small" fullWidth multiline minRows={3}
                  label="Bench test requirements (one per line)"
                  value={t.requirementsText}
                  onChange={(e) => edit(i, 'requirementsText', e.target.value)}
                  sx={{ mt: 1.5 }}
                />
                {t.key && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>key {t.key} · {money(t.rate)}/hr</Typography>}
              </Box>
            ))}
            <Stack direction="row" spacing={1} justifyContent="space-between" flexWrap="wrap" useFlexGap>
              <Button startIcon={<AddIcon />} onClick={add} sx={{ textTransform: 'none' }}>Add tier</Button>
              <Button variant="contained" onClick={save} disabled={!dirty || saving} sx={{ textTransform: 'none' }}>{saving ? 'Saving…' : 'Save ladder'}</Button>
            </Stack>
          </Stack>
        )}
        {msg && <Alert severity={msg.severity} sx={{ mt: 2 }}>{msg.text}</Alert>}
      </CardContent>
    </Card>
  );
}
