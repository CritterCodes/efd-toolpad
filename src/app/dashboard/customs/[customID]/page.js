'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  Box, Typography, Button, Chip, Stack, Paper, Grid, Divider, CircularProgress,
  Table, TableHead, TableRow, TableCell, TableBody,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, LinearProgress,
} from '@mui/material';

const money = (n) => `$${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function CustomDetailPage() {
  const { customID } = useParams();
  const [order, setOrder] = useState(null);
  const [margin, setMargin] = useState(null);
  const [billing, setBilling] = useState({ invoices: [], progress: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [quoteForm, setQuoteForm] = useState({ laborCost: 0, castingCost: 0, shippingCost: 0, designFee: 0, rushMultiplier: 1 });
  const [invoiceForm, setInvoiceForm] = useState({ type: 'deposit', amount: 0 });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [oRes, bRes] = await Promise.all([
        fetch(`/api/custom-orders/${customID}`),
        fetch(`/api/custom-orders/${customID}/invoices`),
      ]);
      if (!oRes.ok) throw new Error((await oRes.json().catch(() => ({}))).error || 'Failed to load order');
      const { order: o, margin: m } = await oRes.json();
      setOrder(o);
      setMargin(m);
      setQuoteForm({
        laborCost: o.quote?.laborCost || 0, castingCost: o.quote?.castingCost || 0,
        shippingCost: o.quote?.shippingCost || 0, designFee: o.quote?.designFee || 0,
        rushMultiplier: o.quote?.rushMultiplier || 1,
      });
      if (bRes.ok) setBilling(await bRes.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [customID]);

  useEffect(() => { load(); }, [load]);

  const call = async (fn) => { setBusy(true); setError(''); try { await fn(); await load(); } catch (e) { setError(e.message); } finally { setBusy(false); } };

  const saveQuote = () => call(async () => {
    const res = await fetch(`/api/custom-orders/${customID}/quote`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...quoteForm, laborCost: Number(quoteForm.laborCost), castingCost: Number(quoteForm.castingCost), shippingCost: Number(quoteForm.shippingCost), designFee: Number(quoteForm.designFee), rushMultiplier: Number(quoteForm.rushMultiplier) }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Quote save failed');
    setQuoteOpen(false);
  });

  const createInvoice = () => call(async () => {
    const res = await fetch(`/api/custom-orders/${customID}/invoices`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: invoiceForm.type, amount: Number(invoiceForm.amount) }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Invoice create failed');
    setInvoiceOpen(false);
    setInvoiceForm({ type: 'deposit', amount: 0 });
  });

  const markPaid = (invoiceID) => call(async () => {
    const res = await fetch(`/api/custom-orders/${customID}/invoices/${invoiceID}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'paid' }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Mark-paid failed');
  });

  const startProduction = () => call(async () => {
    const res = await fetch(`/api/custom-orders/${customID}/production`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Start production failed');
  });

  if (loading) return <Box sx={{ p: 3 }}><CircularProgress /></Box>;
  if (!order) return <Box sx={{ p: 3 }}><Typography color="error">{error || 'Not found'}</Typography></Box>;

  const q = order.quote || {};
  const progress = billing.progress;

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h4">{order.title || 'Custom Order'}</Typography>
          <Typography variant="body2" color="text.secondary">{order.customID} · {order.customerName || order.clientID || '—'}</Typography>
        </Box>
        <Chip label={order.status} color="primary" />
      </Stack>
      {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}

      <Grid container spacing={2}>
        {/* Quote + margin */}
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">Quote</Typography>
              <Button size="small" onClick={() => setQuoteOpen(true)}>Edit</Button>
            </Stack>
            <Divider sx={{ my: 1 }} />
            <Typography variant="body2">Labor: {money(q.laborCost)} × {q.rushMultiplier || 1}</Typography>
            <Typography variant="body2">Casting: {money(q.castingCost)} · Shipping: {money(q.shippingCost)} · Design fee: {money(q.designFee)}</Typography>
            <Typography variant="h6" sx={{ mt: 1 }}>Quote total: {money(q.quoteTotal)}</Typography>
            {margin && (
              <Typography variant="body2" color={margin.margin >= 0 ? 'success.main' : 'error.main'} sx={{ mt: 1 }}>
                Margin: {money(margin.margin)} ({margin.marginPct}%) · COGS {money(margin.cogs)}
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Production / bench */}
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6">Production</Typography>
            <Divider sx={{ my: 1 }} />
            <Typography variant="body2" color="text.secondary">
              Pieces: {(order.pieceIDs || []).length} · Designs: {(order.designIDs || []).length}
            </Typography>
            <Button sx={{ mt: 1 }} variant="outlined" disabled={busy} onClick={startProduction}>
              Start production (→ bench)
            </Button>
            <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
              Spawns a design + piece + routed work orders on the bench; labor pays through payroll and accrues into COGS.
            </Typography>
          </Paper>
        </Grid>

        {/* Invoices / payment progress */}
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">Invoices &amp; Payment</Typography>
              <Button size="small" variant="contained" onClick={() => setInvoiceOpen(true)}>New Invoice</Button>
            </Stack>
            <Divider sx={{ my: 1 }} />
            {progress && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2">
                  Paid {money(progress.totalPaid)} of {money(progress.projectTotal)} ({progress.paymentProgress}%)
                  {progress.canStartProduction && ' · production-ready'}
                  {progress.isFullyPaid && ' · fully paid'}
                </Typography>
                <LinearProgress variant="determinate" value={Math.min(100, progress.paymentProgress)} sx={{ mt: 0.5 }} />
              </Box>
            )}
            <Table size="small">
              <TableHead><TableRow><TableCell>Invoice</TableCell><TableCell>Type</TableCell><TableCell align="right">Amount</TableCell><TableCell>Status</TableCell><TableCell /></TableRow></TableHead>
              <TableBody>
                {(billing.invoices || []).length === 0 ? (
                  <TableRow><TableCell colSpan={5}><Typography variant="body2" color="text.secondary">No invoices yet.</Typography></TableCell></TableRow>
                ) : billing.invoices.map((inv) => (
                  <TableRow key={inv.invoiceID}>
                    <TableCell>{inv.invoiceNumber}</TableCell>
                    <TableCell>{inv.type}</TableCell>
                    <TableCell align="right">{money(inv.amount)}</TableCell>
                    <TableCell><Chip size="small" label={inv.status} color={inv.status === 'paid' ? 'success' : inv.status === 'cancelled' ? 'default' : 'warning'} /></TableCell>
                    <TableCell align="right">{inv.status !== 'paid' && inv.status !== 'cancelled' && <Button size="small" disabled={busy} onClick={() => markPaid(inv.invoiceID)}>Mark paid</Button>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Grid>
      </Grid>

      {/* Quote dialog */}
      <Dialog open={quoteOpen} onClose={() => setQuoteOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Edit Quote</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {['laborCost', 'castingCost', 'shippingCost', 'designFee', 'rushMultiplier'].map((f) => (
              <TextField key={f} label={f} type="number" value={quoteForm[f]} onChange={(e) => setQuoteForm({ ...quoteForm, [f]: e.target.value })} fullWidth />
            ))}
            <Typography variant="caption" color="text.secondary">A 40% markup is applied to the subtotal.</Typography>
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setQuoteOpen(false)}>Cancel</Button><Button variant="contained" disabled={busy} onClick={saveQuote}>Save</Button></DialogActions>
      </Dialog>

      {/* Invoice dialog */}
      <Dialog open={invoiceOpen} onClose={() => setInvoiceOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New Invoice</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField select SelectProps={{ native: true }} label="Type" value={invoiceForm.type} onChange={(e) => setInvoiceForm({ ...invoiceForm, type: e.target.value })} fullWidth>
              {['deposit', 'progress', 'final', 'partial'].map((t) => <option key={t} value={t}>{t}</option>)}
            </TextField>
            <TextField label="Amount" type="number" value={invoiceForm.amount} onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setInvoiceOpen(false)}>Cancel</Button><Button variant="contained" disabled={busy || Number(invoiceForm.amount) <= 0} onClick={createInvoice}>Create</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
