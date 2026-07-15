'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box, Typography, Button, Chip, Stack, Paper, Grid, Divider, CircularProgress,
  Table, TableHead, TableRow, TableCell, TableBody, Tabs, Tab, LinearProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Snackbar, Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import DiamondIcon from '@mui/icons-material/AutoAwesome';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';

import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';
import { customOrderLabel } from '@/constants/customRequest.constants';
import StatusTimeline from '../components/StatusTimeline';
import OverviewTab from '../components/tabs/OverviewTab';
import QuoteTab from '../components/tabs/QuoteTab';
import AssignmentTab from '../components/tabs/AssignmentTab';
import ProductionTab from '../components/tabs/ProductionTab';
import NotesTab from '../components/tabs/NotesTab';
import CommunicationsTab from '../components/tabs/CommunicationsTab';
import ImagesTab from '../components/tabs/ImagesTab';
import ShareTab from '../components/tabs/ShareTab';

const money = (n) => `$${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const STATUS_COLOR = {
  pending: 'default', consultation: 'info', design: 'info', quote: 'warning', deposit: 'warning',
  in_production: 'primary', qc: 'secondary', completed: 'success', delivered: 'success', cancelled: 'error',
};
const dialogPaperProps = { sx: { backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', color: REPAIRS_UI.textPrimary, border: `1px solid ${REPAIRS_UI.border}` } };
const panelSx = { p: 2.5, height: '100%', backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' };

function PanelHeader({ icon: Icon, title, action }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Icon sx={{ color: REPAIRS_UI.accent, fontSize: 20 }} />
        <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader }}>{title}</Typography>
      </Stack>
      {action}
    </Stack>
  );
}
function Stat({ label, value, color }) {
  return (
    <Box>
      <Typography sx={{ fontSize: '0.72rem', color: REPAIRS_UI.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</Typography>
      <Typography sx={{ fontWeight: 700, color: color || REPAIRS_UI.textPrimary }}>{value}</Typography>
    </Box>
  );
}

export default function CustomDetailPage() {
  const { customID } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState(null);
  const [margin, setMargin] = useState(null);
  const [billing, setBilling] = useState({ invoices: [], progress: null });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [busy, setBusy] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  // mode: 'deposit' (depositPct of quote total) | 'full' (remaining balance) | 'custom' (typed amount)
  const [invoiceForm, setInvoiceForm] = useState({ mode: 'deposit', depositPct: 50, amount: '', dueDays: 7 });
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  const notify = (message, severity = 'success') => setSnack({ open: true, message, severity });
  const closeSnack = () => setSnack((s) => ({ ...s, open: false }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [oRes, bRes] = await Promise.all([
        fetch(`/api/custom-orders/${customID}`),
        fetch(`/api/custom-orders/${customID}/invoices`),
      ]);
      if (!oRes.ok) throw new Error((await oRes.json().catch(() => ({}))).error || 'Failed to load order');
      const { order: o, margin: m } = await oRes.json();
      setOrder(o);
      setMargin(m);
      if (bRes.ok) setBilling(await bRes.json());
    } catch (e) {
      notify(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [customID]);

  useEffect(() => { load(); }, [load]);

  const call = async (fn, okMsg) => {
    setBusy(true);
    try { await fn(); if (okMsg) notify(okMsg, 'success'); await load(); }
    catch (e) { notify(e.message, 'error'); } finally { setBusy(false); }
  };
  const changeStatus = (status) => call(async () => {
    const res = await fetch(`/api/custom-orders/${customID}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, statusReason: 'manual update' }) });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Status update failed');
  }, 'Status updated');
  const saveDetails = (fields) => call(async () => {
    const res = await fetch(`/api/custom-orders/${customID}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields) });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Save failed');
  }, 'Details saved');
  // Customer billing uses the tax-INCLUSIVE total (quote.total); fall back to the
  // pre-tax quoteTotal for legacy orders quoted before sales tax was applied.
  const quoteTotal = Number(order?.quote?.total ?? order?.quote?.quoteTotal) || 0;
  const remaining = billing.progress ? Number(billing.progress.remainingAmount) || 0 : quoteTotal;
  const uninvoiced = Math.max(0, remaining - (Number(billing.progress?.totalPending) || 0));
  const customerEmail = String(order?.customerEmail || '').trim();
  const emailDomain = customerEmail.split('@')[1]?.toLowerCase() || '';
  const hasBillableEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)
    && !['test.com', 'example.com', 'example.test'].includes(emailDomain)
    && !emailDomain.endsWith('.test');
  const quotePublished = Boolean(order?.quote?.quotePublished);
  const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
  const invoiceAmount = () => {
    if (invoiceForm.mode === 'full') return round2(uninvoiced);
    if (invoiceForm.mode === 'deposit') return round2(quoteTotal * (Number(invoiceForm.depositPct) || 0) / 100);
    return round2(invoiceForm.amount);
  };
  const invoiceType = () => {
    if (invoiceForm.mode === 'full') return 'final';
    if (invoiceForm.mode === 'deposit') return 'deposit';
    return 'partial';
  };
  const createInvoice = () => call(async () => {
    const res = await fetch(`/api/custom-orders/${customID}/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: invoiceType(),
        amount: invoiceForm.mode === 'custom' ? invoiceAmount() : undefined,
        depositPct: invoiceForm.mode === 'deposit' ? Number(invoiceForm.depositPct) : undefined,
        dueDays: Number(invoiceForm.dueDays),
      }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Invoice create failed');
    setInvoiceOpen(false); setInvoiceForm({ mode: 'deposit', depositPct: 50, amount: '', dueDays: 7 });
  }, 'Invoice created');
  const markPaid = (invoiceID, paymentMethod) => call(async () => {
    const res = await fetch(`/api/custom-orders/${customID}/invoices/${invoiceID}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'paid', paymentMethod }) });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Mark-paid failed');
  }, `Invoice marked paid (${paymentMethod})`);
  const sendInvoice = (invoiceID) => call(async () => {
    const res = await fetch(`/api/custom-orders/${customID}/invoices/${invoiceID}/checkout`, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Could not send invoice');
    if (data.url) { try { await navigator.clipboard.writeText(data.url); } catch { /* clipboard optional */ } }
    notify(
      data.delivery === 'sandbox_no_email'
        ? 'Sandbox invoice created; Stripe does not email test invoices. Link copied.'
        : 'Stripe invoice emailed to client. Link copied.',
      data.delivery === 'sandbox_no_email' ? 'warning' : 'success',
    );
  });
  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress sx={{ color: REPAIRS_UI.accent }} /></Box>;
  if (!order) {
    return (
      <Box sx={{ p: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/dashboard/customs')} sx={{ color: REPAIRS_UI.textSecondary, mb: 2 }}>Back</Button>
        <Typography color="error">Custom order not found.</Typography>
      </Box>
    );
  }

  const q = order.quote || {};
  const progress = billing.progress;
  const notes = order.notes || [];
  const comms = order.communications || [];
  const images = order.images || [];

  const assignments = order.assignments || [];
  const TABS = [
    'Overview', 'Quote', 'Invoices', 'Production', `Assignment (${assignments.length})`,
    `Notes (${notes.length})`, `Communications (${comms.length})`, `Images (${images.length})`, '3D & Share',
  ];

  return (
    <Box sx={{ pb: 6 }}>
      {/* Header */}
      <Box sx={{ backgroundColor: { xs: 'transparent', sm: REPAIRS_UI.bgPanel }, border: { xs: 'none', sm: `1px solid ${REPAIRS_UI.border}` }, borderRadius: { xs: 0, sm: 3 }, boxShadow: { xs: 'none', sm: REPAIRS_UI.shadow }, p: { xs: 0.5, sm: 2.5, md: 3 }, mb: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/dashboard/customs')} sx={{ color: REPAIRS_UI.textSecondary, mb: 1.5, pl: 0 }}>All customs</Button>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box sx={{ maxWidth: 920 }}>
            <Typography sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, px: 1.25, py: 0.5, mb: 1.5, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', color: REPAIRS_UI.textPrimary, backgroundColor: REPAIRS_UI.bgCard, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, textTransform: 'uppercase' }}>
              <DiamondIcon sx={{ fontSize: 16, color: REPAIRS_UI.accent }} />{order.customID}
            </Typography>
            <Typography sx={{ fontSize: { xs: 26, md: 32 }, fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 0.5 }}>{customOrderLabel(order)}</Typography>
            <Typography sx={{ color: REPAIRS_UI.textSecondary }}>{order.customerName || order.clientID || '—'}</Typography>
            <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, display: 'block', mt: 0.5 }}>
              Created {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '—'}
              {order.updatedAt ? ` · Updated ${new Date(order.updatedAt).toLocaleDateString()}` : ''}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            {order.priority === 'high' && <Chip size="small" label="High priority" color="error" variant="outlined" />}
            {order.isRush && <Chip size="small" icon={<PriorityHighIcon />} label="RUSH" sx={{ bgcolor: '#FF4444', color: '#fff' }} />}
            <Chip label={(order.status || '').replace('_', ' ')} color={STATUS_COLOR[order.status] || 'default'} />
          </Stack>
        </Stack>
      </Box>

      <StatusTimeline order={order} busy={busy} onChange={changeStatus} />

      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile
        sx={{ mb: 2, '& .MuiTab-root': { color: REPAIRS_UI.textSecondary, textTransform: 'none' }, '& .Mui-selected': { color: REPAIRS_UI.accent }, '& .MuiTabs-indicator': { bgcolor: REPAIRS_UI.accent } }}>
        {TABS.map((t) => <Tab key={t} label={t} />)}
      </Tabs>

      {/* Overview */}
      {tab === 0 && <OverviewTab order={order} billing={billing} busy={busy} onSave={saveDetails} />}

      {/* Quote */}
      {tab === 1 && <QuoteTab customID={customID} order={order} margin={margin} notify={notify} onChanged={load} />}

      {/* Invoices */}
      {tab === 2 && (
        <Paper sx={{ ...panelSx, height: 'auto' }}>
          <PanelHeader icon={ReceiptLongIcon} title="Invoices & Payment" action={<Button size="small" variant="contained" onClick={() => setInvoiceOpen(true)} sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, '&:hover': { backgroundColor: '#C19B2E' } }}>New Invoice</Button>} />
          {progress && (
            <Box sx={{ mb: 2 }}>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>Paid {money(progress.totalPaid)} of {money(progress.projectTotal)} ({progress.paymentProgress}%)</Typography>
                <Stack direction="row" spacing={1}>
                  {progress.canStartProduction && <Chip size="small" label="Production-ready" color="info" />}
                  {progress.isFullyPaid && <Chip size="small" label="Fully paid" color="success" />}
                </Stack>
              </Stack>
              <LinearProgress variant="determinate" value={Math.min(100, progress.paymentProgress)} sx={{ height: 8, borderRadius: 4, backgroundColor: REPAIRS_UI.bgTertiary, '& .MuiLinearProgress-bar': { backgroundColor: REPAIRS_UI.accent } }} />
            </Box>
          )}
          {progress?.hasReached50 && (() => {
            const q = order.quote || {};
            const parts = [
              q.mounting?.item && { label: 'Mounting', name: q.mounting.item },
              q.centerstone?.item && { label: 'Center stone', name: q.centerstone.item },
              ...((q.accentStones || []).filter((s) => s.description).map((s) => ({ label: 'Accent', name: `${s.quantity || 1}× ${s.description}` }))),
            ].filter(Boolean);
            return (
              <Box sx={{ mb: 2, p: 1.5, borderRadius: 1, border: '1px solid rgba(102,187,106,0.4)', backgroundColor: 'rgba(102,187,106,0.08)' }}>
                <Typography variant="body2" sx={{ color: '#66BB6A', fontWeight: 700, mb: 0.5 }}>50% reached — order the parts</Typography>
                {parts.length === 0 ? (
                  <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>No gemstones or mounting on the quote yet.</Typography>
                ) : (
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {parts.map((p, i) => <Chip key={i} size="small" label={`${p.label}: ${p.name}`} variant="outlined" sx={{ borderColor: REPAIRS_UI.border, color: REPAIRS_UI.textPrimary }} />)}
                  </Stack>
                )}
              </Box>
            );
          })()}
          <Table size="small">
            <TableHead><TableRow>
              {['Invoice', 'Type', 'Amount', 'Status', ''].map((h, i) => <TableCell key={i} align={h === 'Amount' ? 'right' : 'left'} sx={{ color: REPAIRS_UI.textSecondary, borderColor: REPAIRS_UI.border }}>{h}</TableCell>)}
            </TableRow></TableHead>
            <TableBody>
              {(billing.invoices || []).length === 0 ? (
                <TableRow><TableCell colSpan={5} sx={{ borderColor: REPAIRS_UI.border }}><Typography variant="body2" sx={{ color: REPAIRS_UI.textMuted }}>No invoices yet.</Typography></TableCell></TableRow>
              ) : billing.invoices.map((inv) => (
                <TableRow key={inv.invoiceID}>
                  <TableCell sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border }}>{inv.invoiceNumber}</TableCell>
                  <TableCell sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border }}>{inv.type}</TableCell>
                  <TableCell align="right" sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border }}>{money(inv.amount)}</TableCell>
                  <TableCell sx={{ borderColor: REPAIRS_UI.border }}><Chip size="small" label={inv.status === 'paid' && inv.paymentMethod ? `paid · ${inv.paymentMethod}` : inv.status} color={inv.status === 'paid' ? 'success' : inv.status === 'cancelled' ? 'default' : 'warning'} /></TableCell>
                  <TableCell align="right" sx={{ borderColor: REPAIRS_UI.border }}>
                    {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center" flexWrap="wrap" useFlexGap>
                        <Button size="small" disabled={busy} onClick={() => sendInvoice(inv.invoiceID)} sx={{ color: '#64B5F6' }}>{inv.stripeInvoiceID ? 'Resend invoice' : 'Send invoice'}</Button>
                        {inv.checkoutUrl && <Button size="small" component="a" href={inv.checkoutUrl} target="_blank" rel="noreferrer" sx={{ color: REPAIRS_UI.textSecondary, minWidth: 0 }}>Open</Button>}
                        {inv.invoicePdf && <Button size="small" component="a" href={inv.invoicePdf} target="_blank" rel="noreferrer" sx={{ color: REPAIRS_UI.textSecondary, minWidth: 0 }}>PDF</Button>}
                        <Button size="small" disabled={busy} onClick={() => markPaid(inv.invoiceID, 'cash')} sx={{ color: '#66BB6A' }}>Cash</Button>
                        <Button size="small" disabled={busy} onClick={() => markPaid(inv.invoiceID, 'card')} sx={{ color: REPAIRS_UI.accent }}>Card</Button>
                      </Stack>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Production */}
      {tab === 3 && <ProductionTab customID={customID} order={order} margin={margin} notify={notify} onChanged={load} />}

      {tab === 4 && <AssignmentTab customID={customID} assignments={assignments} onChanged={load} notify={notify} />}
      {tab === 5 && <NotesTab customID={customID} notes={notes} onChanged={load} notify={notify} />}
      {tab === 6 && <CommunicationsTab customID={customID} communications={comms} onChanged={load} notify={notify} />}
      {tab === 7 && <ImagesTab customID={customID} images={images} onChanged={load} notify={notify} />}
      {tab === 8 && <ShareTab customID={customID} order={order} onChanged={load} notify={notify} />}

      {/* Invoice dialog */}
      <Dialog open={invoiceOpen} onClose={() => setInvoiceOpen(false)} fullWidth maxWidth="sm" PaperProps={dialogPaperProps}>
        <DialogTitle>New Invoice</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {!quotePublished || quoteTotal <= 0 ? (
              <Alert severity="warning" sx={{ backgroundColor: REPAIRS_UI.bgCard, color: REPAIRS_UI.textPrimary, border: `1px solid ${REPAIRS_UI.border}` }}>Build and publish the quote before creating an invoice.</Alert>
            ) : !hasBillableEmail ? (
              <Alert severity="warning" sx={{ backgroundColor: REPAIRS_UI.bgCard, color: REPAIRS_UI.textPrimary, border: `1px solid ${REPAIRS_UI.border}` }}>Add the customer&rsquo;s real email in Overview before creating an invoice.</Alert>
            ) : (
              <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>
                Quote total <strong style={{ color: REPAIRS_UI.textPrimary }}>{money(quoteTotal)}</strong> · Uninvoiced <strong style={{ color: REPAIRS_UI.textPrimary }}>{money(uninvoiced)}</strong> · {customerEmail}
              </Typography>
            )}
            <TextField select SelectProps={{ native: true }} label="Invoice for" value={invoiceForm.mode} onChange={(e) => setInvoiceForm({ ...invoiceForm, mode: e.target.value })} fullWidth>
              <option value="deposit">Deposit (% of quote)</option>
              <option value="full">Pay in full (remaining balance)</option>
              <option value="custom">Custom amount</option>
            </TextField>
            {invoiceForm.mode === 'deposit' && (
              <TextField label="Deposit %" type="number" value={invoiceForm.depositPct} onChange={(e) => setInvoiceForm({ ...invoiceForm, depositPct: e.target.value })} helperText="Default 50%. Lower it for smaller staged payments." fullWidth InputProps={{ endAdornment: <Typography sx={{ color: REPAIRS_UI.textMuted }}>%</Typography> }} />
            )}
            {invoiceForm.mode === 'custom' && (
              <TextField label="Amount" type="number" value={invoiceForm.amount} onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })} fullWidth />
            )}
            <TextField select SelectProps={{ native: true }} label="Payment due" value={invoiceForm.dueDays} onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDays: Number(e.target.value) })} fullWidth>
              <option value={1}>Due tomorrow</option>
              <option value={7}>Due in 7 days</option>
              <option value={14}>Due in 14 days</option>
              <option value={30}>Due in 30 days</option>
            </TextField>
            <Box sx={{ p: 1.5, borderRadius: 1, border: `1px solid ${REPAIRS_UI.border}`, backgroundColor: REPAIRS_UI.bgTertiary }}>
              <Typography variant="caption" sx={{ color: REPAIRS_UI.textSecondary }}>This invoice</Typography>
              <Typography sx={{ fontWeight: 700, color: REPAIRS_UI.accent, fontSize: '1.2rem' }}>{money(invoiceAmount())}</Typography>
              {invoiceForm.mode === 'deposit' && Number(invoiceForm.depositPct) >= 50 && (
                <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>At 50%+, parts (gemstones &amp; mounting) can be ordered.</Typography>
              )}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInvoiceOpen(false)} sx={{ color: REPAIRS_UI.textSecondary }}>Cancel</Button>
          <Button variant="contained" disabled={busy || !quotePublished || !hasBillableEmail || invoiceAmount() <= 0 || invoiceAmount() > uninvoiced} onClick={createInvoice} sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, '&:hover': { backgroundColor: '#C19B2E' } }}>Create</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={5000} onClose={closeSnack} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={closeSnack} severity={snack.severity} sx={{ backgroundColor: REPAIRS_UI.bgCard, color: REPAIRS_UI.textPrimary, border: `1px solid ${REPAIRS_UI.border}` }}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}
