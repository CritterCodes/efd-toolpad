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
import StatusTimeline from '../components/StatusTimeline';
import OverviewTab from '../components/tabs/OverviewTab';
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
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [quoteForm, setQuoteForm] = useState({ laborCost: 0, castingCost: 0, shippingCost: 0, designFee: 0, rushMultiplier: 1 });
  const [invoiceForm, setInvoiceForm] = useState({ type: 'deposit', amount: 0 });
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
      setQuoteForm({
        laborCost: o.quote?.laborCost || 0, castingCost: o.quote?.castingCost || 0,
        shippingCost: o.quote?.shippingCost || 0, designFee: o.quote?.designFee || 0, rushMultiplier: o.quote?.rushMultiplier || 1,
      });
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
  const saveQuote = () => call(async () => {
    const res = await fetch(`/api/custom-orders/${customID}/quote`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...quoteForm, laborCost: Number(quoteForm.laborCost), castingCost: Number(quoteForm.castingCost), shippingCost: Number(quoteForm.shippingCost), designFee: Number(quoteForm.designFee), rushMultiplier: Number(quoteForm.rushMultiplier) }) });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Quote save failed');
    setQuoteOpen(false);
  }, 'Quote saved');
  const createInvoice = () => call(async () => {
    const res = await fetch(`/api/custom-orders/${customID}/invoices`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: invoiceForm.type, amount: Number(invoiceForm.amount) }) });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Invoice create failed');
    setInvoiceOpen(false); setInvoiceForm({ type: 'deposit', amount: 0 });
  }, 'Invoice created');
  const markPaid = (invoiceID) => call(async () => {
    const res = await fetch(`/api/custom-orders/${customID}/invoices/${invoiceID}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'paid' }) });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Mark-paid failed');
  }, 'Invoice marked paid');
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
            <Typography sx={{ fontSize: { xs: 26, md: 32 }, fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 0.5 }}>{order.title || 'Custom Order'}</Typography>
            <Typography sx={{ color: REPAIRS_UI.textSecondary }}>{order.customerName || order.clientID || '—'}</Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
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
      {tab === 0 && <OverviewTab order={order} busy={busy} onSave={saveDetails} />}

      {/* Quote */}
      {tab === 1 && (
        <Paper sx={panelSx}>
          <PanelHeader icon={RequestQuoteIcon} title="Quote" action={<Button size="small" onClick={() => setQuoteOpen(true)} sx={{ color: REPAIRS_UI.accent }}>Edit</Button>} />
          <Stack spacing={1}>
            {[
              ['Materials & gemstones', (q.materialCosts || []).reduce((s, m) => s + (m.cost != null ? Number(m.cost) || 0 : (Number(m.quantity) || 1) * (Number(m.unitPrice) || 0)), 0)],
              ['Labor', q.laborCost],
              ['Casting', q.castingCost],
              ['Shipping', q.shippingCost],
              ['Designer fee', q.designFee],
              ['GLB fee', q.glbFee],
              ['QC review fee', q.qcReviewFee],
            ].filter(([, v]) => Number(v) > 0).map(([label, v]) => (
              <Stack key={label} direction="row" justifyContent="space-between">
                <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>{label}</Typography>
                <Typography variant="body2">{money(v)}</Typography>
              </Stack>
            ))}
          </Stack>
          <Divider sx={{ my: 1.5, borderColor: REPAIRS_UI.border }} />
          <Stack direction="row" justifyContent="space-between"><Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>COG (cost)</Typography><Typography variant="body2">{money(q.cog)}</Typography></Stack>
          <Stack direction="row" justifyContent="space-between"><Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>Markup</Typography><Typography variant="body2">× {q.cogMarkup || 2.5}{q.rushMultiplier > 1 ? ` · rush × ${q.rushMultiplier}` : ''}</Typography></Stack>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
            <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader }}>Quote total</Typography>
            <Typography sx={{ fontWeight: 700, fontSize: '1.25rem', color: REPAIRS_UI.accent }}>{money(q.quoteTotal)}</Typography>
          </Stack>
          {margin && (
            <Stack direction="row" spacing={3} sx={{ mt: 2 }}>
              <Stat label="Margin (vs piece COGS)" value={`${money(margin.margin)} (${margin.marginPct}%)`} color={margin.margin >= 0 ? '#66BB6A' : '#EF5350'} />
              <Stat label="Piece COGS" value={money(margin.cogs)} />
            </Stack>
          )}
        </Paper>
      )}

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
                  <TableCell sx={{ borderColor: REPAIRS_UI.border }}><Chip size="small" label={inv.status} color={inv.status === 'paid' ? 'success' : inv.status === 'cancelled' ? 'default' : 'warning'} /></TableCell>
                  <TableCell align="right" sx={{ borderColor: REPAIRS_UI.border }}>{inv.status !== 'paid' && inv.status !== 'cancelled' && <Button size="small" disabled={busy} onClick={() => markPaid(inv.invoiceID)} sx={{ color: REPAIRS_UI.accent }}>Mark paid</Button>}</TableCell>
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

      {/* Quote dialog */}
      <Dialog open={quoteOpen} onClose={() => setQuoteOpen(false)} fullWidth maxWidth="sm" PaperProps={dialogPaperProps}>
        <DialogTitle>Edit Quote</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {[['laborCost', 'Labor cost'], ['castingCost', 'Casting cost'], ['shippingCost', 'Shipping cost'], ['designFee', 'Design fee'], ['rushMultiplier', 'Rush multiplier']].map(([f, label]) => (
              <TextField key={f} label={label} type="number" value={quoteForm[f]} onChange={(e) => setQuoteForm({ ...quoteForm, [f]: e.target.value })} fullWidth />
            ))}
            <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>These fold into one COG bucket (with gemstones, designer/GLB/QC fees) and are marked up by cogMarkup from admin settings. GLB &amp; QC fees populate from the production spine.</Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQuoteOpen(false)} sx={{ color: REPAIRS_UI.textSecondary }}>Cancel</Button>
          <Button variant="contained" disabled={busy} onClick={saveQuote} sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, '&:hover': { backgroundColor: '#C19B2E' } }}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Invoice dialog */}
      <Dialog open={invoiceOpen} onClose={() => setInvoiceOpen(false)} fullWidth maxWidth="sm" PaperProps={dialogPaperProps}>
        <DialogTitle>New Invoice</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField select SelectProps={{ native: true }} label="Type" value={invoiceForm.type} onChange={(e) => setInvoiceForm({ ...invoiceForm, type: e.target.value })} fullWidth>
              {['deposit', 'progress', 'final', 'partial'].map((t) => <option key={t} value={t}>{t}</option>)}
            </TextField>
            <TextField label="Amount" type="number" value={invoiceForm.amount} onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInvoiceOpen(false)} sx={{ color: REPAIRS_UI.textSecondary }}>Cancel</Button>
          <Button variant="contained" disabled={busy || Number(invoiceForm.amount) <= 0} onClick={createInvoice} sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, '&:hover': { backgroundColor: '#C19B2E' } }}>Create</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={5000} onClose={closeSnack} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={closeSnack} severity={snack.severity} sx={{ backgroundColor: REPAIRS_UI.bgCard, color: REPAIRS_UI.textPrimary, border: `1px solid ${REPAIRS_UI.border}` }}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}
