'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Typography, Button, Grid, Card, CardContent, Paper, TextField, InputAdornment,
  FormControl, InputLabel, Select, MenuItem, Stack, Chip, CircularProgress, Snackbar, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import SearchIcon from '@mui/icons-material/Search';
import InboxIcon from '@mui/icons-material/Inbox';
import PaymentsIcon from '@mui/icons-material/Payments';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';

import { REPAIRS_UI, repairsMenuProps } from '@/app/dashboard/repairs/components/repairsUi';

const STATUS_OPTIONS = ['all', 'planned', 'casting_ordered', 'in_finishing', 'qc', 'completed', 'available', 'reserved', 'sold', 'scrapped', 'returned'];
const STATUS_COLOR = { planned: REPAIRS_UI.textMuted, in_finishing: '#64B5F6', qc: '#FFB74D', completed: '#66BB6A', available: '#66BB6A', sold: REPAIRS_UI.accent };
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

function PieceCard({ piece }) {
  const p = piece;
  const woCount = Array.isArray(p.workOrderIDs) ? p.workOrderIDs.length : 0;
  return (
    <Card sx={{ height: '100%', backgroundColor: REPAIRS_UI.bgCard, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2 }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
          <Chip size="small" label={(p.status || 'planned').replace(/_/g, ' ')} sx={{ backgroundColor: `${STATUS_COLOR[p.status] || REPAIRS_UI.textMuted}22`, color: STATUS_COLOR[p.status] || REPAIRS_UI.textMuted, textTransform: 'capitalize', fontWeight: 700 }} />
          {!p.designID && <Chip size="small" label="Handmade" sx={{ backgroundColor: REPAIRS_UI.bgTertiary, color: REPAIRS_UI.textSecondary, border: `1px solid ${REPAIRS_UI.border}` }} />}
        </Stack>
        <Typography sx={{ fontSize: 16, fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 0.5 }}>{p.sku || p.pieceID?.slice(0, 8) || 'Piece'}</Typography>
        <Typography sx={{ color: REPAIRS_UI.textSecondary, fontSize: '0.85rem', mb: 1 }}>
          {[p.metalType, p.karat].filter(Boolean).join(' ') || '—'}
        </Typography>
        <Stack direction="row" spacing={2} sx={{ mt: 1.5, color: REPAIRS_UI.textMuted, fontSize: '0.8rem' }}>
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}><PaymentsIcon sx={{ fontSize: 16 }} />COGS {money(p.totalCOGS)}</Box>
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}><BuildCircleIcon sx={{ fontSize: 16 }} />{woCount} WO{woCount === 1 ? '' : 's'}</Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

function CreatePieceDialog({ open, onClose, onCreated, onError }) {
  const empty = { source: 'handmade', designID: '', metalType: '', karat: '', sku: '' };
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (form.source === 'design' && !form.designID.trim()) { onError('Design ID is required for a design-based piece.'); return; }
    setSaving(true);
    try {
      // designID present → production path (spawns routed WOs); absent → direct/handmade (M1-T4).
      const body = {
        metalType: form.metalType || null,
        karat: form.karat || null,
        sku: form.sku || null,
        ...(form.source === 'design' ? { designID: form.designID.trim() } : {}),
      };
      const res = await fetch('/api/production/pieces', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to create piece');
      const created = await res.json();
      setForm(empty);
      onCreated(created);
    } catch (e) { onError(e.message); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm"
      PaperProps={{ sx: { backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}` } }}>
      <DialogTitle sx={{ color: REPAIRS_UI.textHeader }}>New Piece</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <ToggleButtonGroup exclusive size="small" value={form.source} onChange={(_, v) => v && setForm((f) => ({ ...f, source: v }))} sx={{ alignSelf: 'flex-start' }}>
            <ToggleButton value="handmade" sx={{ color: REPAIRS_UI.textSecondary, '&.Mui-selected': { color: REPAIRS_UI.accent } }}>Handmade (no design)</ToggleButton>
            <ToggleButton value="design" sx={{ color: REPAIRS_UI.textSecondary, '&.Mui-selected': { color: REPAIRS_UI.accent } }}>From design</ToggleButton>
          </ToggleButtonGroup>
          {form.source === 'design' && (
            <TextField label="Design ID" value={form.designID} onChange={set('designID')} size="small" fullWidth
              helperText="Spawns routed work orders from the design's routing." />
          )}
          <Stack direction="row" spacing={2}>
            <TextField label="Metal" value={form.metalType} onChange={set('metalType')} size="small" fullWidth placeholder="e.g. gold" />
            <TextField label="Karat" value={form.karat} onChange={set('karat')} size="small" fullWidth placeholder="e.g. 14k" />
          </Stack>
          <TextField label="SKU — optional" value={form.sku} onChange={set('sku')} size="small" fullWidth />
          <Typography sx={{ color: REPAIRS_UI.textMuted, fontSize: '0.8rem' }}>
            A bench work order is spawned automatically. COGS rolls up from materials + labor logged on the bench.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ color: REPAIRS_UI.textSecondary }}>Cancel</Button>
        <Button onClick={submit} disabled={saving} variant="contained" sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, '&:hover': { backgroundColor: '#C19B2E' } }}>
          {saving ? 'Creating…' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function ProductionPiecesPage() {
  const [pieces, setPieces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  const showSnack = (message, severity = 'success') => setSnack({ open: true, message, severity });
  const closeSnack = () => setSnack((s) => ({ ...s, open: false }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/production/pieces');
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to load pieces');
      setPieces(await res.json());
    } catch (e) { showSnack(e.message, 'error'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const metrics = useMemo(() => ({
    total: pieces.length,
    inProduction: pieces.filter((p) => ['casting_ordered', 'in_finishing', 'qc'].includes(p.status)).length,
    cogs: pieces.reduce((sum, p) => sum + (Number(p.totalCOGS) || 0), 0),
  }), [pieces]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return pieces.filter((p) => {
      if (status !== 'all' && (p.status || 'planned') !== status) return false;
      if (!q) return true;
      return [p.sku, p.pieceID, p.designID, p.metalType].filter(Boolean).join(' ').toLowerCase().includes(q);
    });
  }, [pieces, search, status]);

  return (
    <Box sx={{ pb: 6 }}>
      <Box sx={{ backgroundColor: { xs: 'transparent', sm: REPAIRS_UI.bgPanel }, border: { xs: 'none', sm: `1px solid ${REPAIRS_UI.border}` }, borderRadius: { xs: 0, sm: 3 }, boxShadow: { xs: 'none', sm: REPAIRS_UI.shadow }, p: { xs: 0.5, sm: 2.5, md: 3 }, mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box sx={{ maxWidth: 920 }}>
            <Typography sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, px: 1.25, py: 0.5, mb: 1.5, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', color: REPAIRS_UI.textPrimary, backgroundColor: REPAIRS_UI.bgCard, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, textTransform: 'uppercase' }}>
              <PrecisionManufacturingIcon sx={{ fontSize: 16, color: REPAIRS_UI.accent }} />
              Production Catalog
            </Typography>
            <Typography sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 1 }}>Pieces</Typography>
            <Typography sx={{ color: REPAIRS_UI.textSecondary, lineHeight: 1.6 }}>
              A physical instance produced from a design (or handmade). Carries actual COGS — materials at cost + labor from its bench work orders.
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)} sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, '&:hover': { backgroundColor: '#C19B2E' } }}>New Piece</Button>
        </Stack>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={4}><MetricCard icon={PrecisionManufacturingIcon} label="Total" value={metrics.total} /></Grid>
        <Grid item xs={4}><MetricCard icon={BuildCircleIcon} label="In production" value={metrics.inProduction} accent="#64B5F6" /></Grid>
        <Grid item xs={4}><MetricCard icon={PaymentsIcon} label="Total COGS" value={money(metrics.cogs)} /></Grid>
      </Grid>

      <Paper sx={{ p: 2, mb: 2, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
          <TextField placeholder="Search by SKU, ID, design, metal…" value={search} onChange={(e) => setSearch(e.target.value)} size="small" fullWidth
            InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ color: REPAIRS_UI.textSecondary }} /></InputAdornment>) }} />
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Status</InputLabel>
            <Select value={status} label="Status" onChange={(e) => setStatus(e.target.value)} MenuProps={repairsMenuProps}>
              {STATUS_OPTIONS.map((s) => <MenuItem key={s} value={s}>{s === 'all' ? 'All statuses' : s.replace(/_/g, ' ')}</MenuItem>)}
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress sx={{ color: REPAIRS_UI.accent }} /></Box>
      ) : filtered.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center', backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px dashed ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
          <InboxIcon sx={{ fontSize: 48, color: REPAIRS_UI.textMuted, mb: 1 }} />
          <Typography sx={{ color: REPAIRS_UI.textSecondary }}>
            {pieces.length === 0 ? 'No pieces yet. Create one (handmade or from a design).' : 'No pieces match your filters.'}
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {filtered.map((p) => (
            <Grid item xs={12} sm={6} md={4} key={p.pieceID}>
              <PieceCard piece={p} />
            </Grid>
          ))}
        </Grid>
      )}

      <CreatePieceDialog
        open={open}
        onClose={() => setOpen(false)}
        onCreated={(created) => { setOpen(false); showSnack(`Created piece ${created.sku || created.pieceID?.slice(0, 8) || ''}.`); load(); }}
        onError={(m) => showSnack(m, 'error')}
      />

      <Snackbar open={snack.open} autoHideDuration={5000} onClose={closeSnack} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={closeSnack} severity={snack.severity} sx={{ backgroundColor: REPAIRS_UI.bgCard, color: REPAIRS_UI.textPrimary, border: `1px solid ${REPAIRS_UI.border}` }}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}
