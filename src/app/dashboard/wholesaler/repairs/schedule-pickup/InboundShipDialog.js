'use client';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert, Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, FormControlLabel, InputLabel, MenuItem, Radio, RadioGroup, Select, Stack, Tab, Tabs, TextField, Typography,
} from '@mui/material';

const money = (v) => `$${(Number(v) || 0).toFixed(2)}`;
const serviceLabel = (v) => String(v || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

// Stripe.js loaded on demand (same pattern as the Billing page): no npm dependency, one script tag.
let stripeJsPromise = null;
const loadStripeJs = () => {
  if (typeof window !== 'undefined' && window.Stripe) return Promise.resolve(window.Stripe);
  if (!stripeJsPromise) {
    stripeJsPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3';
      script.onload = () => resolve(window.Stripe);
      script.onerror = () => { stripeJsPromise = null; reject(new Error('Could not load the payment library.')); };
      document.head.appendChild(script);
    });
  }
  return stripeJsPromise;
};

/**
 * Store → EFD shipping, paid up front.
 *   "Get a FedEx label"   quote at EFD's rate → pay by card here (embedded Stripe Checkout) → the
 *                         label is bought the moment payment lands and appears on this page to print.
 *   "I have my own tracking"  the store shipped some other way; record the tracking.
 */
export default function InboundShipDialog({ open, onClose, selectedRepairIDs = [], onOwnTracking, busy = false }) {
  const [tab, setTab] = useState(0);
  const [meta, setMeta] = useState(null);
  const [parcelKey, setParcelKey] = useState('');
  const [saturday, setSaturday] = useState(false);
  const [quote, setQuote] = useState(null);
  const [rateId, setRateId] = useState('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [carrier, setCarrier] = useState('');
  const [tracking, setTracking] = useState('');
  const [checkoutMounted, setCheckoutMounted] = useState(false);
  const checkoutRef = useRef(null);

  const destroyCheckout = () => {
    try { checkoutRef.current?.destroy(); } catch { /* already gone */ }
    checkoutRef.current = null;
    setCheckoutMounted(false);
  };

  useEffect(() => {
    if (!open) { destroyCheckout(); return; }
    setError(''); setQuote(null); setRateId('');
    fetch('/api/wholesale/repairs/inbound-shipping').then((r) => r.json()).then((body) => {
      setMeta(body);
      if (body?.parcels?.[0]) setParcelKey((k) => k || body.parcels[0].key);
    }).catch((e) => setMeta({ problems: [e.message], canShip: false, parcels: [] }));
  }, [open]);

  const post = async (url, payload) => {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `Request failed (${res.status}).`);
    return body;
  };

  const getRates = async () => {
    setWorking(true); setError(''); setQuote(null); setRateId('');
    try {
      const q = await post('/api/wholesale/repairs/inbound-shipping', { action: 'rates', parcelKey, saturdayDelivery: saturday });
      setQuote(q); setRateId(q.rates?.[0]?.rateId || '');
    } catch (e) { setError(e.message); } finally { setWorking(false); }
  };

  const selected = quote?.rates?.find((r) => r.rateId === rateId) || null;

  // Order → pay. The label is bought by the webhook once the card clears; the page shows it.
  const payAndShip = async () => {
    setWorking(true); setError('');
    try {
      const order = await post('/api/wholesale/repairs/inbound-shipping', { action: 'order', repairIDs: selectedRepairIDs, quote, rateId });
      const pay = await post(`/api/wholesale/invoices/${encodeURIComponent(order.invoiceID)}/pay`, { method: 'card' });
      if (!pay.clientSecret || !pay.publishableKey) throw new Error(pay.error || 'Could not start the payment.');
      const Stripe = await loadStripeJs();
      const stripe = Stripe(pay.publishableKey);
      const checkout = await stripe.initEmbeddedCheckout({ clientSecret: pay.clientSecret });
      checkoutRef.current = checkout;
      setCheckoutMounted(true);
      checkout.mount('#inbound-embedded-checkout');
    } catch (e) { setError(e.message); } finally { setWorking(false); }
  };

  const disabled = busy || working;

  return (
    <Dialog open={open} onClose={() => !disabled && onClose?.()} maxWidth="sm" fullWidth>
      <DialogTitle>Ship {selectedRepairIDs.length} repair{selectedRepairIDs.length === 1 ? '' : 's'} to EFD</DialogTitle>
      <DialogContent sx={{ pt: '8px !important' }}>
        {!checkoutMounted && (
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
            <Tab label="Get a FedEx label" />
            <Tab label="I have my own tracking" />
          </Tabs>
        )}

        {tab === 0 && !checkoutMounted && (
          <Stack spacing={1.5}>
            <Typography variant="body2" color="text.secondary">
              Ship at EFD&apos;s FedEx rate. Pick a service, pay by card, and your label is ready to print right here.
            </Typography>
            {!meta && <Typography variant="caption">Checking addresses…</Typography>}
            {meta?.problems?.length > 0 && <Alert severity="warning">{meta.problems.map((p) => <div key={p}>{p}</div>)}</Alert>}
            {meta?.canShip && (
              <>
                {meta.mode === 'test' && <Chip size="small" color="warning" label="Test mode — labels are not real" sx={{ alignSelf: 'flex-start' }} />}
                <Typography variant="caption" color="text.secondary">
                  From {meta.storeName}, {meta.storeAddress?.street1}, {meta.storeAddress?.city} {meta.storeAddress?.state} → EFD, {meta.efdAddress?.city} {meta.efdAddress?.state}
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} flexWrap="wrap" useFlexGap>
                  <FormControl size="small" sx={{ minWidth: 260 }}>
                    <InputLabel>Package</InputLabel>
                    <Select label="Package" value={parcelKey} onChange={(e) => { setParcelKey(e.target.value); setQuote(null); }} disabled={disabled}>
                      {(meta.parcels || []).map((p) => <MenuItem key={p.key} value={p.key}>{p.label}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <FormControlLabel control={<Checkbox size="small" checked={saturday} disabled={disabled} onChange={(e) => { setSaturday(e.target.checked); setQuote(null); }} />} label="Saturday delivery" />
                  <Button variant="outlined" size="small" onClick={getRates} disabled={disabled || !parcelKey} startIcon={working && !quote ? <CircularProgress size={14} /> : null}>
                    {quote ? 'Re-quote' : 'Get FedEx rates'}
                  </Button>
                </Stack>
                {quote?.rates?.length > 0 && (
                  <RadioGroup value={rateId} onChange={(e) => setRateId(e.target.value)}>
                    {quote.rates.map((r) => (
                      <FormControlLabel key={r.rateId} value={r.rateId} control={<Radio size="small" />}
                        label={`${r.carrier} ${serviceLabel(r.service)}${quote.saturdayDelivery ? ' · Saturday' : ''} — ${money(r.rate)}${r.deliveryDays ? ` · ${r.deliveryDays} day${r.deliveryDays === 1 ? '' : 's'}` : ''}`}
                        sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.9rem' } }} />
                    ))}
                  </RadioGroup>
                )}
                {selected && (
                  <Typography variant="caption" color="text.secondary">
                    Card payment adds Stripe&apos;s convenience fee (2.9% + 30¢), shown on the payment screen. The label prints as soon as the card clears.
                  </Typography>
                )}
              </>
            )}
          </Stack>
        )}

        {tab === 1 && !checkoutMounted && (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">Shipped some other way? Record the tracking so we can watch for the box.</Typography>
            <TextField label="Carrier (optional)" placeholder="UPS, FedEx, USPS..." value={carrier} onChange={(e) => setCarrier(e.target.value)} size="small" />
            <TextField label="Tracking number" required value={tracking} onChange={(e) => setTracking(e.target.value)} size="small" helperText="Required - we receive the box against it." />
          </Stack>
        )}

        {/* Stripe owns everything inside this box — white because its form renders light. */}
        <Box id="inbound-embedded-checkout" sx={checkoutMounted ? { backgroundColor: '#fff', borderRadius: 1, py: 2, minHeight: 320 } : { display: 'none' }} />

        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions>
        {checkoutMounted ? (
          <Button onClick={() => destroyCheckout()} disabled={disabled}>← Back</Button>
        ) : (
          <Button onClick={onClose} disabled={disabled}>Cancel</Button>
        )}
        {tab === 0 && !checkoutMounted && (
          <Button variant="contained" disabled={disabled || !selected} onClick={payAndShip} startIcon={working && quote ? <CircularProgress size={14} /> : null}>
            {selected ? `Pay ${money(selected.rate)} & get label` : 'Pay & get label'}
          </Button>
        )}
        {tab === 1 && !checkoutMounted && (
          <Button variant="contained" disabled={disabled || !tracking.trim()} onClick={async () => { await onOwnTracking?.({ carrier: carrier.trim(), trackingNumber: tracking.trim() }); setCarrier(''); setTracking(''); onClose?.(); }}>
            Mark Shipped
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
