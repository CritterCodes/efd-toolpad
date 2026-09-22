"use client";
import React, { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Checkbox, Chip, CircularProgress, FormControl, FormControlLabel, InputLabel, MenuItem,
  Radio, RadioGroup, Select, Stack, Typography,
} from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

const money = (v) => `$${(Number(v) || 0).toFixed(2)}`;
const serviceLabel = (s) => String(s || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Finalize = the fulfillment decision (owner, 2026-09-21). Pickup, or Ship with a live FedEx rate
 * that lands on the invoice as the shipping line BEFORE the store is notified or anything prints.
 * Hand delivery is not offered.
 */
export default function FinalizeFulfillment({ invoice, onFinalize }) {
  const isWholesale = invoice?.accountType === 'wholesale';
  // Preselect what the store default (or a previous decision) already stamped on the invoice.
  const [method, setMethod] = useState(['pickup', 'ship', 'delivery'].includes(invoice?.deliveryMethod) ? invoice.deliveryMethod : 'pickup');
  const [readiness, setReadiness] = useState(null);
  const [parcelKey, setParcelKey] = useState('');
  const [saturday, setSaturday] = useState(!!invoice?.shippingQuote?.saturdayDelivery);
  const [quote, setQuote] = useState(invoice?.shippingQuote || null);
  const [rateId, setRateId] = useState(invoice?.shippingQuote?.rates?.[0]?.rateId || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (method !== 'ship' || readiness || !invoice?.invoiceID) return;
    fetch(`/api/repair-invoices/${invoice.invoiceID}/shipping/rates`)
      .then((r) => r.json())
      .then((body) => {
        setReadiness(body?.error ? { problems: [body.error], canShip: false, parcels: [] } : body);
        if (!parcelKey && body?.parcels?.[0]) setParcelKey(body.quote?.parcelKey || body.parcels[0].key);
        if (body?.quote) { setQuote(body.quote); if (!rateId) setRateId(body.quote.rates?.[0]?.rateId || ''); }
      })
      .catch((e) => setReadiness({ problems: [e.message], canShip: false, parcels: [] }));
  }, [method, readiness, invoice?.invoiceID, parcelKey, rateId]);

  const getRates = async () => {
    setBusy(true); setError('');
    try {
      const res = await fetch(`/api/repair-invoices/${invoice.invoiceID}/shipping/rates`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ parcelKey, saturdayDelivery: saturday }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `Could not get rates (${res.status}).`);
      setQuote(body);
      setRateId(body.rates?.[0]?.rateId || '');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const finalize = async () => {
    setBusy(true); setError('');
    try {
      await onFinalize(invoice.invoiceID, method === 'ship' ? { method, rateId } : { method });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const selected = quote?.rates?.find((r) => r.rateId === rateId) || null;
  const canFinalize = method === 'pickup' || method === 'delivery' || (method === 'ship' && selected);

  return (
    <Box sx={{ border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, p: 1.5, bgcolor: REPAIRS_UI.bgCard }}>
      <Typography variant="subtitle2" sx={{ color: REPAIRS_UI.textHeader, mb: 0.5 }}>Finalize — how does this go back?</Typography>
      <RadioGroup row value={method} onChange={(e) => setMethod(e.target.value)}>
        <FormControlLabel value="pickup" control={<Radio size="small" />} label={<Stack direction="row" spacing={0.5} alignItems="center"><StorefrontIcon fontSize="small" /><span>Pickup</span></Stack>} />
        <FormControlLabel value="ship" disabled={!isWholesale} control={<Radio size="small" />}
          label={<Stack direction="row" spacing={0.5} alignItems="center"><LocalShippingIcon fontSize="small" /><span>Ship (FedEx)</span></Stack>} />
        <FormControlLabel value="delivery" disabled={!isWholesale} control={<Radio size="small" />}
          label={<Stack direction="row" spacing={0.5} alignItems="center"><StorefrontIcon fontSize="small" /><span>Hand delivery</span></Stack>} />
      </RadioGroup>
      {method === 'delivery' && (
        <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>
          Goes on the store run; shows on Shipping &amp; Delivery until you mark it delivered. Bills the delivery fee from Store Settings.
        </Typography>
      )}
      {!isWholesale && <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>Retail invoices are pickup only.</Typography>}

      {method === 'ship' && (
        <Stack spacing={1.25} sx={{ mt: 1 }}>
          {!readiness && <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>Checking addresses and carrier…</Typography>}
          {readiness && readiness.problems?.length > 0 && (
            <Alert severity="warning" sx={{ bgcolor: REPAIRS_UI.bgPanel }}>
              {readiness.problems.map((p) => <div key={p}>{p}</div>)}
            </Alert>
          )}
          {readiness?.canShip && (
            <>
              {readiness.mode === 'test' && <Chip size="small" color="warning" label="EasyPost TEST mode — rates are real, labels are not" sx={{ alignSelf: 'flex-start' }} />}
              <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>
                To {readiness.shipTo?.company || readiness.shipTo?.name}, {readiness.shipTo?.street1}, {readiness.shipTo?.city}, {readiness.shipTo?.state} {readiness.shipTo?.zip}
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                <FormControl size="small" sx={{ minWidth: 260 }}>
                  <InputLabel>Package</InputLabel>
                  <Select label="Package" value={parcelKey} onChange={(e) => setParcelKey(e.target.value)} disabled={busy}>
                    {(readiness.parcels || []).map((p) => <MenuItem key={p.key} value={p.key}>{p.label}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControlLabel
                  control={<Checkbox size="small" checked={saturday} disabled={busy}
                    onChange={(e) => { setSaturday(e.target.checked); setQuote(null); setRateId(''); }} />}
                  label="Saturday delivery"
                  sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.85rem' } }}
                />
                <Button variant="outlined" size="small" onClick={getRates} disabled={busy || !parcelKey}
                  startIcon={busy ? <CircularProgress size={14} /> : null}
                  sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border }}>
                  {quote ? 'Re-quote' : 'Get FedEx rates'}
                </Button>
              </Stack>
              {saturday && !quote && (
                <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>
                  Saturday delivery: only Saturday-eligible services are quoted and the surcharge is inside the rate.
                </Typography>
              )}
              {quote?.rates?.length > 0 && (
                <RadioGroup value={rateId} onChange={(e) => setRateId(e.target.value)}>
                  {quote.rates.map((r) => (
                    <FormControlLabel key={r.rateId} value={r.rateId} control={<Radio size="small" />}
                      label={`${r.carrier} ${serviceLabel(r.service)}${quote.saturdayDelivery ? ' · Saturday' : ''} — ${money(r.rate)}${r.deliveryDays ? ` · ${r.deliveryDays} day${r.deliveryDays === 1 ? '' : 's'}` : ''}${r.guaranteed ? ' · guaranteed' : ''}`}
                      sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.85rem' } }} />
                  ))}
                </RadioGroup>
              )}
              {quote && !quote.filteredToCarriers && (
                <Alert severity="info" sx={{ bgcolor: REPAIRS_UI.bgPanel }}>FedEx returned no rates, so every carrier is shown. Check that FedEx Default is enabled on the EasyPost account.</Alert>
              )}
            </>
          )}
        </Stack>
      )}

      {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}

      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5 }}>
        <Button variant="contained" size="small" disabled={busy || !canFinalize} onClick={finalize}
          sx={{ bgcolor: REPAIRS_UI.accent, color: '#000', '&:hover': { bgcolor: '#c9a227' } }}>
          {method === 'ship' && selected ? `Finalize & add ${money(selected.rate)} shipping${quote?.saturdayDelivery ? ' (Saturday)' : ''}` : 'Finalize for pickup'}
        </Button>
        {method === 'ship' && selected && (
          <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>
            Charged at cost. The label is bought from Shipping &amp; Delivery when the box is packed.
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
