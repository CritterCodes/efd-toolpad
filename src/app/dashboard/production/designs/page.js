'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Typography, Button, Grid, Card, CardContent, Paper, TextField, InputAdornment,
  FormControl, InputLabel, Select, MenuItem, Stack, Chip, CircularProgress, Snackbar, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DesignServicesIcon from '@mui/icons-material/DesignServices';
import SearchIcon from '@mui/icons-material/Search';
import InboxIcon from '@mui/icons-material/Inbox';
import CalculateIcon from '@mui/icons-material/Calculate';
import DiamondIcon from '@mui/icons-material/AutoAwesome';

import { REPAIRS_UI, repairsMenuProps } from '@/app/dashboard/repairs/components/repairsUi';

// Valid estimator metal keys (from src/constants/metalTypes.js).
const METAL_KEYS = [
  { key: 'GOLD_14K_YELLOW', label: '14K Yellow Gold' },
  { key: 'GOLD_14K_WHITE', label: '14K White Gold' },
  { key: 'GOLD_18K_YELLOW', label: '18K Yellow Gold' },
  { key: 'GOLD_10K_YELLOW', label: '10K Yellow Gold' },
  { key: 'SILVER_STERLING', label: 'Sterling Silver' },
  { key: 'PLATINUM_IRIDIUM', label: 'Platinum' },
];
const STATUS_OPTIONS = ['all', 'concept', 'cad', 'approved_for_production', 'retired'];
const STATUS_COLOR = { concept: REPAIRS_UI.textMuted, cad: '#64B5F6', approved_for_production: '#66BB6A', retired: REPAIRS_UI.textMuted };
const money = (n) => `$${(Number(n) || 0).toLocaleString()}`;

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

function DesignCard({ design, onOpen }) {
  const d = design;
  return (
    <Card sx={{ height: '100%', backgroundColor: REPAIRS_UI.bgCard, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2 }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
          <Chip size="small" label={(d.status || 'concept').replace(/_/g, ' ')} sx={{ backgroundColor: `${STATUS_COLOR[d.status] || REPAIRS_UI.textMuted}22`, color: STATUS_COLOR[d.status] || REPAIRS_UI.textMuted, textTransform: 'capitalize', fontWeight: 700 }} />
          {d.gemstoneId && <Chip size="small" icon={<DiamondIcon sx={{ fontSize: 14 }} />} label="Gem-linked" sx={{ backgroundColor: REPAIRS_UI.bgTertiary, color: REPAIRS_UI.accent, border: `1px solid ${REPAIRS_UI.border}` }} />}
        </Stack>
        <Typography sx={{ fontSize: 18, fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 0.5 }}>{d.name || 'Untitled design'}</Typography>
        {d.description && <Typography sx={{ color: REPAIRS_UI.textSecondary, fontSize: '0.85rem', mb: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{d.description}</Typography>}
        <Stack direction="row" spacing={2} sx={{ mt: 1.5, color: REPAIRS_UI.textMuted, fontSize: '0.8rem' }}>
          <Box>{d.estCost != null ? `est ${money(d.estCost)}` : 'no estimate'}</Box>
          {d.cadFiles?.length ? <Box>CAD ✓</Box> : <Box>no CAD</Box>}
        </Stack>
      </CardContent>
    </Card>
  );
}

function CreateDesignDialog({ open, onClose, onCreated, onError }) {
  const empty = { name: '', description: '', metalKey: 'GOLD_14K_YELLOW', stlVolumeCm3: '', gemstoneId: '' };
  const [form, setForm] = useState(empty);
  const [estimate, setEstimate] = useState(null);
  const [estimating, setEstimating] = useState(false);
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setEstimate(null); };

  const previewEstimate = async () => {
    if (!form.stlVolumeCm3) { onError('Enter a CAD volume (cm³) to estimate.'); return; }
    setEstimating(true);
    try {
      const res = await fetch('/api/production/designs/estimate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stlVolumeCm3: Number(form.stlVolumeCm3), metalKey: form.metalKey }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Estimate failed');
      const data = await res.json();
      setEstimate(data.estimate);
    } catch (e) { onError(e.message); } finally { setEstimating(false); }
  };

  const submit = async () => {
    if (!form.name.trim()) { onError('Name is required.'); return; }
    setSaving(true);
    try {
      const body = {
        name: form.name, description: form.description,
        metalOptions: [form.metalKey],
        stlVolumeCm3: form.stlVolumeCm3 ? Number(form.stlVolumeCm3) : null,
        gemstoneId: form.gemstoneId || null,
        estCost: estimate?.estCost ?? null,
      };
      const res = await fetch('/api/production/designs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to create design');
      const created = await res.json();
      setForm(empty); setEstimate(null);
      onCreated(created);
    } catch (e) { onError(e.message); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm"
      PaperProps={{ sx: { backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}` } }}>
      <DialogTitle sx={{ color: REPAIRS_UI.textHeader }}>New Design</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Name" value={form.name} onChange={set('name')} size="small" fullWidth autoFocus required />
          <TextField label="Description" value={form.description} onChange={set('description')} size="small" fullWidth multiline minRows={2} />
          <FormControl size="small" fullWidth>
            <InputLabel>Metal</InputLabel>
            <Select value={form.metalKey} label="Metal" onChange={set('metalKey')} MenuProps={repairsMenuProps}>
              {METAL_KEYS.map((m) => <MenuItem key={m.key} value={m.key}>{m.label}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField label="CAD volume (cm³) — optional" type="number" value={form.stlVolumeCm3} onChange={set('stlVolumeCm3')} size="small" fullWidth
            helperText="From the STL. Leave blank for a handmade / no-CAD design." />
          <TextField label="Gemstone link (productId) — optional" value={form.gemstoneId} onChange={set('gemstoneId')} size="small" fullWidth />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button onClick={previewEstimate} disabled={estimating || !form.stlVolumeCm3} startIcon={<CalculateIcon />} variant="outlined"
              sx={{ color: REPAIRS_UI.accent, borderColor: REPAIRS_UI.border }}>
              {estimating ? 'Estimating…' : 'Preview estimate'}
            </Button>
            {estimate && (
              <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 600 }}>
                est {money(estimate.estCost)} <Typography component="span" sx={{ color: REPAIRS_UI.textMuted, fontSize: '0.8rem' }}>(metal {money(estimate.metal?.metalCost)})</Typography>
              </Typography>
            )}
          </Box>
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

export default function ProductionDesignsPage() {
  const [designs, setDesigns] = useState([]);
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
      const res = await fetch('/api/production/designs');
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to load designs');
      setDesigns(await res.json());
    } catch (e) { showSnack(e.message, 'error'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const metrics = useMemo(() => ({
    total: designs.length,
    withCad: designs.filter((d) => d.cadFiles?.length || d.stlVolumeCm3).length,
    gemLinked: designs.filter((d) => d.gemstoneId).length,
  }), [designs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return designs.filter((d) => {
      if (status !== 'all' && (d.status || 'concept') !== status) return false;
      if (!q) return true;
      return [d.name, d.description].filter(Boolean).join(' ').toLowerCase().includes(q);
    });
  }, [designs, search, status]);

  return (
    <Box sx={{ pb: 6 }}>
      <Box sx={{ backgroundColor: { xs: 'transparent', sm: REPAIRS_UI.bgPanel }, border: { xs: 'none', sm: `1px solid ${REPAIRS_UI.border}` }, borderRadius: { xs: 0, sm: 3 }, boxShadow: { xs: 'none', sm: REPAIRS_UI.shadow }, p: { xs: 0.5, sm: 2.5, md: 3 }, mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box sx={{ maxWidth: 920 }}>
            <Typography sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, px: 1.25, py: 0.5, mb: 1.5, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', color: REPAIRS_UI.textPrimary, backgroundColor: REPAIRS_UI.bgCard, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, textTransform: 'uppercase' }}>
              <DesignServicesIcon sx={{ fontSize: 16, color: REPAIRS_UI.accent }} />
              Production Catalog
            </Typography>
            <Typography sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 1 }}>Designs</Typography>
            <Typography sx={{ color: REPAIRS_UI.textSecondary, lineHeight: 1.6 }}>
              A reusable manufacturing spec — CAD/BOM/routing + a live-metal cost estimate. CAD is optional (handmade designs skip it).
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)} sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, '&:hover': { backgroundColor: '#C19B2E' } }}>New Design</Button>
        </Stack>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={4}><MetricCard icon={DesignServicesIcon} label="Total" value={metrics.total} /></Grid>
        <Grid item xs={4}><MetricCard icon={CalculateIcon} label="With CAD" value={metrics.withCad} accent="#64B5F6" /></Grid>
        <Grid item xs={4}><MetricCard icon={DiamondIcon} label="Gem-linked" value={metrics.gemLinked} /></Grid>
      </Grid>

      <Paper sx={{ p: 2, mb: 2, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
          <TextField placeholder="Search by name or description…" value={search} onChange={(e) => setSearch(e.target.value)} size="small" fullWidth
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
            {designs.length === 0 ? 'No designs yet. Create one to start the catalog.' : 'No designs match your filters.'}
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {filtered.map((d) => (
            <Grid item xs={12} sm={6} md={4} key={d.designID}>
              <DesignCard design={d} />
            </Grid>
          ))}
        </Grid>
      )}

      <CreateDesignDialog
        open={open}
        onClose={() => setOpen(false)}
        onCreated={(created) => { setOpen(false); showSnack(`Created "${created.name}".`); load(); }}
        onError={(m) => showSnack(m, 'error')}
      />

      <Snackbar open={snack.open} autoHideDuration={5000} onClose={closeSnack} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={closeSnack} severity={snack.severity} sx={{ backgroundColor: REPAIRS_UI.bgCard, color: REPAIRS_UI.textPrimary, border: `1px solid ${REPAIRS_UI.border}` }}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}
