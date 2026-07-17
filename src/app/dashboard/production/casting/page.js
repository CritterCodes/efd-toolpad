'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Button, Grid, Card, CardContent, Paper, Stack, Chip,
  CircularProgress, Snackbar, Alert, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, InputAdornment,
} from '@mui/material';
import FireplaceIcon from '@mui/icons-material/Fireplace';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import BuildIcon from '@mui/icons-material/Build';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InboxIcon from '@mui/icons-material/Inbox';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';

import { REPAIRS_UI, repairsMenuProps } from '@/app/dashboard/repairs/components/repairsUi';

const money = (n) => `$${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function SourceChip({ source }) {
  const isCustom = source === 'custom';
  return (
    <Chip
      size="small"
      label={isCustom ? 'Custom' : 'Production'}
      sx={{
        backgroundColor: isCustom ? '#7C3AED22' : '#0891B222',
        color: isCustom ? '#A78BFA' : '#38BDF8',
        fontWeight: 700,
        fontSize: '0.72rem',
      }}
    />
  );
}

function CarreraDialog({ open, piece, onClose, onDone, onError }) {
  const empty = { vendor: 'Carrera', vendorPO: '', invoiceNumber: '', amount: '', paymentMethod: 'other' };
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    const amt = Number(form.amount);
    if (!(amt >= 0)) { onError('Amount must be a number >= 0'); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/pieces/${piece.pieceID}/casting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'order_carrera', ...form, amount: amt }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed');
      setForm(empty);
      onDone();
    } catch (e) { onError(e.message); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm"
      PaperProps={{ sx: { backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}` } }}>
      <DialogTitle sx={{ color: REPAIRS_UI.textHeader }}>Order from Carrera</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Vendor" value={form.vendor} onChange={set('vendor')} size="small" fullWidth />
          <TextField label="Vendor PO #" value={form.vendorPO} onChange={set('vendorPO')} size="small" fullWidth />
          <TextField label="Invoice #" value={form.invoiceNumber} onChange={set('invoiceNumber')} size="small" fullWidth />
          <TextField
            label="Amount"
            value={form.amount}
            onChange={set('amount')}
            size="small"
            fullWidth
            type="number"
            InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ color: REPAIRS_UI.textSecondary }}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={saving}
          sx={{ backgroundColor: REPAIRS_UI.accent, color: '#000', '&:hover': { backgroundColor: '#C9A227' } }}>
          {saving ? <CircularProgress size={16} /> : 'Book Order'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function InHouseDialog({ open, piece, onClose, onDone, onError }) {
  const empty = { estLaborHours: '' };
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/pieces/${piece.pieceID}/casting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cast_inhouse', estLaborHours: Number(form.estLaborHours) || 0 }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed');
      setForm(empty);
      onDone();
    } catch (e) { onError(e.message); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs"
      PaperProps={{ sx: { backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}` } }}>
      <DialogTitle sx={{ color: REPAIRS_UI.textHeader }}>Cast In-House</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Estimated labor hours"
            value={form.estLaborHours}
            onChange={set('estLaborHours')}
            size="small"
            fullWidth
            type="number"
            helperText="Caster claims the WO and earns hours × rate."
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ color: REPAIRS_UI.textSecondary }}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={saving}
          sx={{ backgroundColor: REPAIRS_UI.accent, color: '#000', '&:hover': { backgroundColor: '#C9A227' } }}>
          {saving ? <CircularProgress size={16} /> : 'Create Casting WO'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ReceivedDialog({ open, piece, onClose, onDone, onError }) {
  const empty = { amount: '', vendor: '', invoiceNumber: '', notes: '', paymentMethod: 'other' };
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    const amt = Number(form.amount);
    if (!(amt > 0)) { onError('Amount must be > 0'); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/pieces/${piece.pieceID}/casting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_received', ...form, amount: amt }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed');
      setForm(empty);
      onDone();
    } catch (e) { onError(e.message); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm"
      PaperProps={{ sx: { backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}` } }}>
      <DialogTitle sx={{ color: REPAIRS_UI.textHeader }}>Mark Casting Received</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Casting cost"
            value={form.amount}
            onChange={set('amount')}
            size="small"
            fullWidth
            type="number"
            required
            InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
            helperText="Added to piece COGS. Bench WOs generated after this."
          />
          <TextField label="Vendor" value={form.vendor} onChange={set('vendor')} size="small" fullWidth />
          <TextField label="Invoice #" value={form.invoiceNumber} onChange={set('invoiceNumber')} size="small" fullWidth />
          <TextField label="Notes" value={form.notes} onChange={set('notes')} size="small" fullWidth multiline rows={2} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ color: REPAIRS_UI.textSecondary }}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={saving}
          sx={{ backgroundColor: '#22C55E', color: '#000', '&:hover': { backgroundColor: '#16A34A' } }}>
          {saving ? <CircularProgress size={16} /> : 'Mark Received & Generate Bench WOs'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function PieceQueueCard({ piece, onAction }) {
  return (
    <Card sx={{ height: '100%', backgroundColor: REPAIRS_UI.bgCard, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2 }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
          <SourceChip source={piece._source} />
          <Typography sx={{ fontSize: '0.73rem', color: REPAIRS_UI.textMuted }}>
            {piece.pieceID?.slice(0, 12)}
          </Typography>
        </Stack>
        <Typography sx={{ fontSize: 15, fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 0.5 }}>
          {piece._designName || piece.sku || piece.pieceID?.slice(0, 8) || 'Piece'}
        </Typography>
        <Typography sx={{ color: REPAIRS_UI.textSecondary, fontSize: '0.82rem', mb: 0.5 }}>
          {[piece.metalType, piece.karat].filter(Boolean).join(' ') || '—'}
        </Typography>
        {piece.customOrderID && (
          <Typography sx={{ color: REPAIRS_UI.textMuted, fontSize: '0.78rem', mb: 1 }}>
            Custom: {piece.customOrderID}
          </Typography>
        )}
        <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
          <Button
            size="small"
            variant="outlined"
            startIcon={<ShoppingCartIcon />}
            onClick={() => onAction(piece, 'order_carrera')}
            sx={{ color: REPAIRS_UI.accent, borderColor: REPAIRS_UI.accent, fontSize: '0.75rem', '&:hover': { borderColor: REPAIRS_UI.accent, backgroundColor: `${REPAIRS_UI.accent}11` } }}
          >
            Order Carrera
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<BuildIcon />}
            onClick={() => onAction(piece, 'cast_inhouse')}
            sx={{ color: '#38BDF8', borderColor: '#38BDF8', fontSize: '0.75rem', '&:hover': { borderColor: '#38BDF8', backgroundColor: '#38BDF811' } }}
          >
            Cast In-House
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<CheckCircleIcon />}
            onClick={() => onAction(piece, 'mark_received')}
            sx={{ color: '#22C55E', borderColor: '#22C55E', fontSize: '0.75rem', '&:hover': { borderColor: '#22C55E', backgroundColor: '#22C55E11' } }}
          >
            Mark Received
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function CastingBoardPage() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState({ type: null, piece: null });
  const [toast, setToast] = useState({ open: false, msg: '', severity: 'success' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/production/casting');
      if (!res.ok) throw new Error('Failed to load casting queue');
      setQueue(await res.json());
    } catch { setToast({ open: true, msg: 'Failed to load casting queue', severity: 'error' }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAction = (piece, type) => setDialog({ type, piece });
  const handleClose = () => setDialog({ type: null, piece: null });
  const handleDone = () => { setToast({ open: true, msg: 'Done — piece updated.', severity: 'success' }); handleClose(); load(); };
  const handleError = (msg) => setToast({ open: true, msg, severity: 'error' });

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: REPAIRS_UI.bgPrimary, p: { xs: 2, md: 4 } }}>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
        <FireplaceIcon sx={{ color: REPAIRS_UI.accent, fontSize: 28 }} />
        <Box>
          <Typography variant="h5" sx={{ color: REPAIRS_UI.textHeader, fontWeight: 700, lineHeight: 1.1 }}>
            Casting Board
          </Typography>
          <Typography sx={{ color: REPAIRS_UI.textSecondary, fontSize: '0.85rem' }}>
            Open pieces needing casting — custom & production
          </Typography>
        </Box>
        <Box sx={{ flex: 1 }} />
        <Chip
          label={`${queue.length} awaiting`}
          sx={{ backgroundColor: `${REPAIRS_UI.accent}22`, color: REPAIRS_UI.accent, fontWeight: 700 }}
        />
      </Stack>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: REPAIRS_UI.accent }} />
        </Box>
      ) : queue.length === 0 ? (
        <Paper sx={{ backgroundColor: REPAIRS_UI.bgPanel, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, p: 6, textAlign: 'center' }}>
          <InboxIcon sx={{ fontSize: 48, color: REPAIRS_UI.textMuted, mb: 1 }} />
          <Typography sx={{ color: REPAIRS_UI.textSecondary }}>No pieces awaiting casting.</Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {queue.map((piece) => (
            <Grid item xs={12} sm={6} md={4} key={piece.pieceID}>
              <PieceQueueCard piece={piece} onAction={handleAction} />
            </Grid>
          ))}
        </Grid>
      )}

      {dialog.piece && dialog.type === 'order_carrera' && (
        <CarreraDialog open piece={dialog.piece} onClose={handleClose} onDone={handleDone} onError={handleError} />
      )}
      {dialog.piece && dialog.type === 'cast_inhouse' && (
        <InHouseDialog open piece={dialog.piece} onClose={handleClose} onDone={handleDone} onError={handleError} />
      )}
      {dialog.piece && dialog.type === 'mark_received' && (
        <ReceivedDialog open piece={dialog.piece} onClose={handleClose} onDone={handleDone} onError={handleError} />
      )}

      <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={toast.severity} onClose={() => setToast((t) => ({ ...t, open: false }))} sx={{ width: '100%' }}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
