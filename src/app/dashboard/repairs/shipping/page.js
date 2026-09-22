'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Box, Card, CardContent, Typography, Stack, Chip, Button, TextField,
  Checkbox, CircularProgress, Alert, Snackbar, Divider, Grid,
} from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import RateCheck from './RateCheck';
import StorefrontIcon from '@mui/icons-material/Storefront';
import PrintIcon from '@mui/icons-material/Print';
import EventIcon from '@mui/icons-material/Event';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

/**
 * Shipping & Delivery — the outbound desk (owner, 2026-09-04). One page for every wholesale
 * package leaving the shop: pick invoices per store, then either ship (carrier + tracking,
 * entered AFTER the carrier hands it back) or schedule a hand delivery for a store run.
 * The per-wholesaler profile panel still works, but this is the coordination surface.
 */

const money = (v) => `$${(Number(v) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '');

const serviceLabel = (v) => String(v || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

function transferListUrl(group, invoiceIDs) {
  const base = `/dashboard/users/wholesalers/${encodeURIComponent(group.wholesalerUserID || 'account')}/transfer-list`;
  return `${base}?invoices=${encodeURIComponent(invoiceIDs.join(','))}&account=${encodeURIComponent(group.accountID)}`;
}

/** One store with invoices ready to go: pick, then ship or schedule the delivery run. */
function ReadyAccountCard({ group, busy, onShip, onBuyLabel }) {
  const [selected, setSelected] = useState(group.invoices.map((inv) => inv.invoiceID));
  const [carrier, setCarrier] = useState('');
  const [tracking, setTracking] = useState('');
  const [manual, setManual] = useState(false);

  const toggle = (id) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <StorefrontIcon fontSize="small" color="action" />
            <Typography sx={{ fontWeight: 700 }}>{group.customerName || group.accountID}</Typography>
            <Chip size="small" label={`${group.invoices.length} invoice${group.invoices.length !== 1 ? 's' : ''} · ${group.repairCount} repair${group.repairCount !== 1 ? 's' : ''} · ${money(group.total)}`} />
          </Stack>

          <Stack spacing={0.25}>
            {group.invoices.map((inv) => (
              <Box key={inv.invoiceID} sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Checkbox size="small" sx={{ p: 0.5 }} checked={selected.includes(inv.invoiceID)} onChange={() => toggle(inv.invoiceID)} />
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{inv.invoiceID}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {inv.repairCount} repair{inv.repairCount !== 1 ? 's' : ''} · {money(inv.total)}
                </Typography>
                <Chip size="small" label={inv.paymentStatus === 'paid' ? 'Paid' : 'Open'} color={inv.paymentStatus === 'paid' ? 'success' : 'warning'} />
                {inv.fulfillment?.shipping?.rate ? (
                  <>
                    <Chip size="small" variant="outlined" label={`${inv.fulfillment.shipping.rate.carrier} ${serviceLabel(inv.fulfillment.shipping.rate.service)}${inv.fulfillment.shipping.saturdayDelivery ? ' · Saturday' : ''} · ${money(inv.shippingFee)} on invoice`} />
                    <Button size="small" variant="contained" startIcon={<LocalShippingIcon />} disabled={busy}
                      onClick={() => onBuyLabel(inv.invoiceID)} sx={{ ml: 'auto' }}>
                      Buy label &amp; ship
                    </Button>
                  </>
                ) : (
                  <Chip size="small" variant="outlined" color="warning" label="No rate on invoice — ship another way below" />
                )}
              </Box>
            ))}
          </Stack>

          <Divider />

          {/* Labels are bought above, one click per invoice — tracking comes from the purchase. The
              manual path stays for a box that went out some other way (a Pirate Ship label, a counter
              drop-off): type the tracking, it records the shipment and notifies the store the same way. */}
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
            <Button size="small" onClick={() => setManual((m) => !m)}>{manual ? 'Hide' : 'Shipped another way?'}</Button>
            <Button
              size="small"
              startIcon={<PrintIcon />}
              disabled={selected.length === 0}
              onClick={() => window.open(transferListUrl(group, selected), '_blank')}
            >
              Packing list
            </Button>
          </Stack>
          {manual && (
            <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
              <TextField size="small" label="Carrier" placeholder="FedEx, USPS..." value={carrier}
                onChange={(e) => setCarrier(e.target.value)} sx={{ width: { xs: '100%', sm: 150 } }} />
              <TextField size="small" label="Tracking number" value={tracking}
                onChange={(e) => setTracking(e.target.value)} sx={{ width: { xs: '100%', sm: 210 } }} />
              <Button
                variant="outlined"
                startIcon={<LocalShippingIcon />}
                disabled={busy || selected.length === 0 || !tracking.trim()}
                onClick={() => onShip({ invoiceIDs: selected, carrier: carrier.trim(), trackingNumber: tracking.trim() })}
              >
                Record shipment
              </Button>
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

function ScheduledDeliveryCard({ group, busy, onMarkDelivered }) {
  const dates = [...new Set(group.invoices.map((inv) => inv.outboundShipment?.scheduledFor).filter(Boolean))]
    .map((d) => fmtDate(d));
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <EventIcon fontSize="small" color="action" />
            <Typography sx={{ fontWeight: 700 }}>{group.customerName || group.accountID}</Typography>
            <Chip size="small" color="info" label={`Deliver ${dates.join(', ') || 'TBD'}`} />
            <Chip size="small" label={`${group.invoices.length} invoice${group.invoices.length !== 1 ? 's' : ''} · ${money(group.total)}`} />
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
            {group.invoices.map((inv) => inv.invoiceID).join(', ')}
          </Typography>
          <Box>
            <Button
              variant="contained"
              size="small"
              startIcon={<CheckCircleIcon />}
              disabled={busy}
              onClick={() => onMarkDelivered(group.invoices.map((inv) => inv.invoiceID))}
            >
              Mark delivered
            </Button>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function ShippingDeliveryPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [snack, setSnack] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/wholesale/shipping');
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.error || 'Could not load shipping.');
      setData(body);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const act = async (fn, successFallback) => {
    setBusy(true);
    try {
      const message = await fn();
      setSnack({ severity: 'success', message: message || successFallback });
      await load();
    } catch (e) {
      setSnack({ severity: 'error', message: e.message });
    } finally {
      setBusy(false);
    }
  };

  const shipOrDeliver = (payload) => act(async () => {
    const res = await fetch('/api/wholesale/repairs/ship-back', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    if (!res.ok || !body.success) throw new Error(body.error || 'The shipment could not be recorded.');
    return body.message;
  });

  const buyLabel = (invoiceID) => act(async () => {
    const res = await fetch(`/api/repair-invoices/${encodeURIComponent(invoiceID)}/shipping/buy`, { method: 'POST' });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.success) throw new Error(body.error || 'The label could not be bought.');
    if (body.label?.labelUrl) window.open(body.label.labelUrl, '_blank');
    const drift = Number(body.drift) || 0;
    return `Label bought — ${body.label?.carrier || ''} ${body.label?.trackingCode || ''}.${drift ? ` Carrier charged ${drift > 0 ? '+' : ''}$${drift.toFixed(2)} vs the quote (invoice unchanged).` : ''}`;
  });

  const markDelivered = (invoiceIDs) => act(async () => {
    const res = await fetch('/api/wholesale/shipping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark-delivered', invoiceIDs }),
    });
    const body = await res.json();
    if (!res.ok || !body.success) throw new Error(body.error || 'Could not mark the delivery.');
    return body.message;
  });

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, maxWidth: 1100, mx: 'auto' }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>Shipping &amp; Delivery</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Invoices finalized as Ship, until they are in a box. Buy the FedEx label here — the rate is already on the
        invoice — print it, and the store is notified with tracking. Hand deliveries (a store default) wait below until you mark them delivered. Pickups never appear.
      </Typography>

      <RateCheck />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!data && !error && <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>}

      {data && (
        <Stack spacing={4}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1.5 }}>
              Ready to go {data.ready.length > 0 && `(${data.ready.length} store${data.ready.length !== 1 ? 's' : ''})`}
            </Typography>
            {data.ready.length === 0 ? (
              <Typography color="text.secondary">Nothing waiting — invoiced work shows up here on its own.</Typography>
            ) : (
              <Grid container spacing={2}>
                {data.ready.map((group) => (
                  <Grid item xs={12} md={6} key={group.accountID}>
                    <ReadyAccountCard group={group} busy={busy} onShip={shipOrDeliver} onBuyLabel={buyLabel} />
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>

          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1.5 }}>Scheduled deliveries</Typography>
            {data.scheduled.length === 0 ? (
              <Typography color="text.secondary">No delivery runs planned.</Typography>
            ) : (
              <Grid container spacing={2}>
                {data.scheduled.map((group) => (
                  <Grid item xs={12} md={6} key={group.accountID}>
                    <ScheduledDeliveryCard group={group} busy={busy} onMarkDelivered={markDelivered} />
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>

          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1.5 }}>Last 30 days</Typography>
            {data.recent.length === 0 ? (
              <Typography color="text.secondary">No packages shipped or delivered recently.</Typography>
            ) : (
              <Stack spacing={1}>
                {data.recent.map((group) => (
                  <Card variant="outlined" key={`recent-${group.accountID}`}>
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Typography sx={{ fontWeight: 600 }}>{group.customerName || group.accountID}</Typography>
                        {group.invoices.map((inv) => {
                          const ship = inv.outboundShipment || {};
                          const label = ship.method === 'delivery'
                            ? (ship.deliveredAt ? `Delivered ${fmtDate(ship.deliveredAt)}` : `Scheduled ${fmtDate(ship.scheduledFor)}`)
                            : `${ship.carrier ? `${ship.carrier} ` : ''}${ship.trackingNumber || ''} · ${fmtDate(ship.shippedAt)}`;
                          return (
                            <Chip key={inv.invoiceID} size="small" variant="outlined"
                              label={`${inv.invoiceID} — ${label}`} sx={{ fontFamily: 'monospace' }} />
                          );
                        })}
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </Box>
        </Stack>
      )}

      <Snackbar
        open={Boolean(snack)}
        autoHideDuration={6000}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {snack ? <Alert severity={snack.severity} onClose={() => setSnack(null)}>{snack.message}</Alert> : null}
      </Snackbar>
    </Box>
  );
}
