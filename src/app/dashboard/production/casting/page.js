'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Typography, Button, Grid, Card, CardContent, Paper, Stack, Chip,
  CircularProgress, Snackbar, Alert, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, InputAdornment,
} from '@mui/material';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import BuildIcon from '@mui/icons-material/Build';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InboxIcon from '@mui/icons-material/Inbox';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CategoryIcon from '@mui/icons-material/Category';
import DiamondIcon from '@mui/icons-material/AutoAwesome';

import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

const money = (n) => `$${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function MetricCard({ icon: Icon, label, value, accent }) {
  return (
    <Card sx={{ height: '100%', backgroundColor: REPAIRS_UI.bgCard, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2 }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 2, backgroundColor: REPAIRS_UI.bgTertiary, border: `1px solid ${REPAIRS_UI.border}` }}>
          <Icon sx={{ color: accent || REPAIRS_UI.accent, fontSize: 22 }} />
        </Box>
        <Box>
          <Typography sx={{ fontSize: 24, fontWeight: 700, color: REPAIRS_UI.textHeader, lineHeight: 1.1 }}>{value}</Typography>
          <Typography sx={{ fontSize: '0.74rem', color: REPAIRS_UI.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

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
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/pieces/${piece.pieceID}/casting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'order_carrera', vendor: 'Carrera' }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed');
      onDone();
    } catch (e) { onError(e.message); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs"
      PaperProps={{ sx: { backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}` } }}>
      <DialogTitle sx={{ color: REPAIRS_UI.textHeader }}>Order from Carrera</DialogTitle>
      <DialogContent>
        <Typography sx={{ color: REPAIRS_UI.textSecondary, fontSize: '0.9rem' }}>
          Mark <strong style={{ color: REPAIRS_UI.textHeader }}>{piece?._designName || piece?.sku || 'this piece'}</strong> as ordered from Carrera Casting. The cost will be calculated automatically from the STL volume and casting settings.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ color: REPAIRS_UI.textSecondary }}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={saving}
          sx={{ backgroundColor: REPAIRS_UI.accent, color: '#000', '&:hover': { backgroundColor: '#C9A227' } }}>
          {saving ? <CircularProgress size={16} /> : 'Mark Ordered'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function InHouseDialog({ open, piece, onClose, onDone, onError }) {
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/pieces/${piece.pieceID}/casting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cast_inhouse', estLaborHours: 0 }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed');
      onDone();
    } catch (e) { onError(e.message); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs"
      PaperProps={{ sx: { backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}` } }}>
      <DialogTitle sx={{ color: REPAIRS_UI.textHeader }}>Cast In-House</DialogTitle>
      <DialogContent>
        <Typography sx={{ color: REPAIRS_UI.textSecondary, fontSize: '0.9rem' }}>
          Mark <strong style={{ color: REPAIRS_UI.textHeader }}>{piece?._designName || piece?.sku || 'this piece'}</strong> for in-house casting. A casting work order will be created and cost is calculated from the STL volume and casting settings.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ color: REPAIRS_UI.textSecondary }}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={saving}
          sx={{ backgroundColor: '#38BDF8', color: '#000', '&:hover': { backgroundColor: '#0EA5E9' } }}>
          {saving ? <CircularProgress size={16} /> : 'Create Casting WO'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ReceivedDialog({ open, piece, onClose, onDone, onError }) {
  const empty = { amount: '', notes: '', paymentMethod: 'other' };
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

  const metrics = useMemo(() => ({
    total: queue.length,
    custom: queue.filter((p) => p._source === 'custom').length,
    production: queue.filter((p) => p._source !== 'custom').length,
  }), [queue]);

  const handleAction = (piece, type) => setDialog({ type, piece });
  const handleClose = () => setDialog({ type: null, piece: null });
  const handleDone = () => { setToast({ open: true, msg: 'Done — piece updated.', severity: 'success' }); handleClose(); load(); };
  const handleError = (msg) => setToast({ open: true, msg, severity: 'error' });

  return (
    <Box sx={{ pb: 6 }}>
      <Box sx={{ backgroundColor: { xs: 'transparent', sm: REPAIRS_UI.bgPanel }, border: { xs: 'none', sm: `1px solid ${REPAIRS_UI.border}` }, borderRadius: { xs: 0, sm: 3 }, boxShadow: { xs: 'none', sm: REPAIRS_UI.shadow }, p: { xs: 0.5, sm: 2.5, md: 3 }, mb: 3 }}>
        <Box sx={{ maxWidth: 920 }}>
          <Typography sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, px: 1.25, py: 0.5, mb: 1.5, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', color: REPAIRS_UI.textPrimary, backgroundColor: REPAIRS_UI.bgCard, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, textTransform: 'uppercase' }}>
            <LocalFireDepartmentIcon sx={{ fontSize: 16, color: REPAIRS_UI.accent }} />
            Production Pipeline
          </Typography>
          <Typography sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 1 }}>Casting Board</Typography>
          <Typography sx={{ color: REPAIRS_UI.textSecondary, lineHeight: 1.6 }}>
            Open pieces needing casting — custom &amp; production. Order via Carrera or route to in-house casting.
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={4}><MetricCard icon={LocalFireDepartmentIcon} label="Awaiting" value={metrics.total} /></Grid>
        <Grid item xs={4}><MetricCard icon={DiamondIcon} label="Custom" value={metrics.custom} accent="#A78BFA" /></Grid>
        <Grid item xs={4}><MetricCard icon={CategoryIcon} label="Production" value={metrics.production} accent="#38BDF8" /></Grid>
      </Grid>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: REPAIRS_UI.accent }} />
        </Box>
      ) : queue.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center', backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px dashed ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
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
