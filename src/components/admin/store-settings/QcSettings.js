'use client';
/**
 * Store Settings → Quality control. The QC mode switch (services/repairs/qcMode.js): a separate QC
 * pass for a multi-jeweler bench, or one-tap self-certification when the person who did the work
 * is the person who would inspect it.
 */
import React, { useEffect, useState } from 'react';
import { Alert, Box, Card, CardContent, FormControlLabel, Radio, RadioGroup, Stack, Typography } from '@mui/material';
import FactCheckIcon from '@mui/icons-material/FactCheck';

const OPTIONS = [
  {
    value: 'separate',
    label: 'Separate QC pass',
    help: 'Bench work goes to the QC queue; someone with the QC capability passes it there. Labor credit and the invoice happen at that pass. Use this with two or more jewelers.',
  },
  {
    value: 'self-certify',
    label: 'Self-certify at the bench',
    help: 'One tap on My Bench — "Done · passed QC" — signs off the work and passes QC in one step for the jeweler who did it. Labor credit and the invoice fire immediately. The pass is recorded as self-certified. Use this when you are the only jeweler.',
  },
];

export default function QcSettings() {
  const [mode, setMode] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    fetch('/api/admin/settings/qc').then((r) => r.json()).then((body) => setMode(body?.mode || 'separate')).catch(() => setMode('separate'));
  }, []);

  const change = async (next) => {
    const previous = mode;
    setMode(next);
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/settings/qc', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: next }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Could not save');
      setMsg({ severity: 'success', text: next === 'self-certify' ? 'Self-certify is on. My Bench now shows "Done · passed QC".' : 'Separate QC pass is on. Work goes through the QC queue.' });
    } catch (e) {
      setMode(previous);
      setMsg({ severity: 'error', text: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card sx={{ mt: 3 }}>
      <CardContent>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
          <FactCheckIcon />
          <Typography variant="h6">Quality control</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Who passes finished bench work. Switch back to a separate pass the day there is a second jeweler.
        </Typography>
        {mode === null ? (
          <Typography variant="body2" color="text.secondary">Loading…</Typography>
        ) : (
          <RadioGroup value={mode} onChange={(e) => change(e.target.value)}>
            <Stack spacing={1.5}>
              {OPTIONS.map((opt) => (
                <Box key={opt.value} sx={{ p: 1.5, border: '1px solid', borderColor: mode === opt.value ? 'primary.main' : 'divider', borderRadius: 2 }}>
                  <FormControlLabel value={opt.value} control={<Radio disabled={saving} />} label={<Typography sx={{ fontWeight: 600 }}>{opt.label}</Typography>} />
                  <Typography variant="body2" color="text.secondary" sx={{ pl: 4 }}>{opt.help}</Typography>
                </Box>
              ))}
            </Stack>
          </RadioGroup>
        )}
        {msg && <Alert severity={msg.severity} sx={{ mt: 2 }}>{msg.text}</Alert>}
      </CardContent>
    </Card>
  );
}
