'use client';
import React, { useEffect, useState } from 'react';
import {
  Alert, Button, Card, CardContent, Chip, CircularProgress, FormControl, InputLabel, MenuItem, Select, Stack,
  Table, TableBody, TableCell, TableHead, TableRow, Typography,
} from '@mui/material';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';

const money = (v) => `$${(Number(v) || 0).toFixed(2)}`;
const serviceLabel = (v) => String(v || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Ad-hoc FedEx rate check: pick a store and a package, see the live rates. Nothing is bought or
 * stored — a quote that should bill a customer happens at Finalize on the invoice.
 */
export default function RateCheck() {
  const [meta, setMeta] = useState(null);
  const [wholesalerId, setWholesalerId] = useState('');
  const [parcelKey, setParcelKey] = useState('');
  const [quote, setQuote] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/wholesale/shipping/rate-check').then((r) => r.json()).then((body) => {
      setMeta(body);
      if (body?.parcels?.[0]) setParcelKey(body.parcels[0].key);
    }).catch((e) => setError(e.message));
  }, []);

  const check = async () => {
    setBusy(true); setError(''); setQuote(null);
    try {
      const res = await fetch('/api/wholesale/shipping/rate-check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ wholesalerId, parcelKey }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `Rate check failed (${res.status}).`);
      setQuote(body);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!meta) return null;
  const store = meta.stores?.find((s) => s.userID === wholesalerId);

  return (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <RequestQuoteIcon fontSize="small" color="action" />
          <Typography sx={{ fontWeight: 700 }}>Rate check</Typography>
          {meta.mode === 'test' && <Chip size="small" color="warning" label="EasyPost test mode" />}
          <Typography variant="caption" color="text.secondary">Live FedEx rates for any store and package. Nothing is bought or billed here.</Typography>
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }} flexWrap="wrap" useFlexGap>
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>Store</InputLabel>
            <Select label="Store" value={wholesalerId} onChange={(e) => setWholesalerId(e.target.value)} disabled={busy}>
              {(meta.stores || []).map((s) => (
                <MenuItem key={s.userID} value={s.userID} disabled={s.addressProblems.length > 0}>
                  {s.name}{s.city ? ` — ${s.city}, ${s.state}` : ''}{s.addressProblems.length ? ' (no address on file)' : ''}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 280 }}>
            <InputLabel>Package</InputLabel>
            <Select label="Package" value={parcelKey} onChange={(e) => setParcelKey(e.target.value)} disabled={busy}>
              {(meta.parcels || []).map((p) => <MenuItem key={p.key} value={p.key}>{p.label}</MenuItem>)}
            </Select>
          </FormControl>
          <Button variant="outlined" onClick={check} disabled={busy || !wholesalerId || !parcelKey} startIcon={busy ? <CircularProgress size={14} /> : null}>
            Get rates
          </Button>
        </Stack>
        {meta.shipFromProblems?.length > 0 && <Alert severity="warning" sx={{ mt: 1.5 }}>{meta.shipFromProblems.join(' ')}</Alert>}
        {error && <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert>}
        {quote && (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
              {quote.parcelLabel} to {store?.name}, {quote.shipTo?.city}, {quote.shipTo?.state} {quote.shipTo?.zip}
            </Typography>
            <Table size="small" sx={{ mt: 0.5, maxWidth: 560 }}>
              <TableHead><TableRow><TableCell>Service</TableCell><TableCell align="right">Rate</TableCell><TableCell>Transit</TableCell></TableRow></TableHead>
              <TableBody>
                {quote.rates.map((r) => (
                  <TableRow key={r.rateId}>
                    <TableCell>{r.carrier} {serviceLabel(r.service)}</TableCell>
                    <TableCell align="right">{money(r.rate)}</TableCell>
                    <TableCell>{r.deliveryDays ? `${r.deliveryDays} day${r.deliveryDays === 1 ? '' : 's'}` : '—'}{r.guaranteed ? ' · guaranteed' : ''}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </CardContent>
    </Card>
  );
}
