'use client';
/**
 * How a wholesale store gets finished work back (services/shipping/storeFulfillment.js). Shown on
 * the store's pickup page; the choice drives the automatic Finalize at QC pass.
 */
import React, { useEffect, useState } from 'react';
import { Alert, FormControl, InputLabel, MenuItem, Select, Stack, Typography } from '@mui/material';

const OPTIONS = [
  { value: 'pickup', label: 'Store picks up' },
  { value: 'delivery', label: 'Hand delivery (store run)' },
  { value: 'ship', label: 'Ship — FedEx small box' },
];

export default function StoreFulfillmentSelect({ storeUserID, compact = false }) {
  const [method, setMethod] = useState(null); // null = loading, '' = not set
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!storeUserID) return;
    fetch(`/api/users/${encodeURIComponent(storeUserID)}/fulfillment-preference`)
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => setMethod(body?.preference?.method || ''))
      .catch(() => setMethod(''));
  }, [storeUserID]);

  const change = async (next) => {
    const previous = method;
    setMethod(next);
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(storeUserID)}/fulfillment-preference`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next ? { method: next, parcelKey: 'fedex-small-box' } : { method: null }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Could not save');
    } catch (e) {
      setMethod(previous);
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!storeUserID || method === null) return null;
  return (
    <Stack spacing={0.5} sx={{ mt: 1, maxWidth: 360 }}>
      <FormControl size="small" fullWidth>
        {/* shrink + notched: with displayEmpty the label would otherwise sit on top of the placeholder */}
        <InputLabel id={`fulfillment-${storeUserID}`} shrink>Finished work goes back by</InputLabel>
        <Select
          labelId={`fulfillment-${storeUserID}`}
          label="Finished work goes back by"
          notched
          value={method}
          onChange={(e) => change(e.target.value)}
          disabled={saving}
          displayEmpty
        >
          <MenuItem value=""><em>Decide at Finalize (no default)</em></MenuItem>
          {OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </Select>
      </FormControl>
      {!compact && (
        <Typography variant="caption" color="text.secondary">
          With a default, each invoice is finalized automatically at QC pass — shipping quoted and on the invoice for Ship, on the store run for hand delivery.
        </Typography>
      )}
      {error && <Alert severity="error">{error}</Alert>}
    </Stack>
  );
}
