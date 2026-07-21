'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, Button, Stack, Paper, CircularProgress, IconButton, Chip,
  TextField, MenuItem, InputAdornment, Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DiamondIcon from '@mui/icons-material/Diamond';
import DeleteIcon from '@mui/icons-material/Delete';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

const money = (x) => `$${(Number(x) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const EDITIONS = [{ value: 'one_of_one', label: 'One of one' }, { value: 'limited', label: 'Limited' }, { value: 'unlimited', label: 'Unlimited' }];
const CREATIONS = [{ value: 'natural', label: 'Natural' }, { value: 'lab', label: 'Lab-grown' }];
const STATUSES = ['draft', 'ready', 'retired'];
// Mirror of estimateGemstoneCost (carat × rate + cut labor) for a live form preview.
const previewCost = (f) => Math.round(((Number(f.carat) || 0) * (Number(f.ratePerCarat) || 0) + (Number(f.cutLaborHours) || 0) * (Number(f.laborRate) || 0) + (Number(f.extraCost) || 0)) * 100) / 100;

const EMPTY = {
  name: '', species: '', carat: '', length: '', width: '', height: '',
  cut: '', color: '', clarity: '', treatment: '', naturalSynthetic: 'natural',
  editionType: 'one_of_one', editionLimit: '', ratePerCarat: '', cutLaborHours: '', laborRate: '', retailPrice: '', status: 'draft',
};

const panelSx = { p: 2, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' };
const csv = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean);

export default function GemstoneDesignsPage() {
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [f, setF] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const set = (patch) => setF((x) => ({ ...x, ...patch }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/products/gemstone-designs');
      const d = await r.json().catch(() => ({}));
      setDesigns(r.ok ? (d.designs || []) : []);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditingId(null); setF(EMPTY); setOpen(true); };
  const openEdit = (design) => {
    const g = design.gemstone || {};
    const gp = design.metadata?.gemPricing || {};
    setEditingId(design.designID);
    setF({
      name: design.name || '', species: g.species || '', carat: g.carat ?? '',
      length: g.dimensions?.length ?? '', width: g.dimensions?.width ?? '', height: g.dimensions?.height ?? '',
      cut: (g.cut || []).join(', '), color: (g.color || []).join(', '), clarity: g.clarity || '', treatment: (g.treatment || []).join(', '),
      naturalSynthetic: g.naturalSynthetic || 'natural',
      editionType: design.edition?.type || 'one_of_one', editionLimit: design.edition?.limit ?? '',
      ratePerCarat: gp.ratePerCarat ?? '', cutLaborHours: gp.cutLaborHours ?? '', laborRate: gp.laborRate ?? '', extraCost: gp.extraCost ?? '',
      retailPrice: design.suggestedRetail ?? '', status: design.status || 'draft',
    });
    setOpen(true);
  };

  const save = async () => {
    if (!f.species.trim()) { setToast({ sev: 'error', msg: 'Species is required.' }); return; }
    setSaving(true);
    const payload = {
      name: f.name, species: f.species, carat: f.carat,
      dimensions: { length: f.length, width: f.width, height: f.height },
      cut: csv(f.cut), color: csv(f.color), clarity: f.clarity, treatment: csv(f.treatment), naturalSynthetic: f.naturalSynthetic,
      editionType: f.editionType, editionLimit: f.editionLimit,
      ratePerCarat: f.ratePerCarat, cutLaborHours: f.cutLaborHours, laborRate: f.laborRate, extraCost: f.extraCost,
      retailPrice: f.retailPrice, status: f.status,
    };
    try {
      const url = editingId ? `/api/products/gemstone-designs/${editingId}` : '/api/products/gemstone-designs';
      const r = await fetch(url, { method: editingId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Save failed');
      setToast({ sev: 'success', msg: editingId ? 'Gemstone design updated' : 'Gemstone design created' });
      setOpen(false);
      await load();
    } catch (e) { setToast({ sev: 'error', msg: e.message }); } finally { setSaving(false); }
  };

  const remove = async (design, e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${design.name || design.gemstone?.species}"?`)) return;
    try {
      const r = await fetch(`/api/products/gemstone-designs/${design.designID}`, { method: 'DELETE' });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Delete failed');
      setToast({ sev: 'success', msg: 'Deleted' });
      await load();
    } catch (err) { setToast({ sev: 'error', msg: err.message }); }
  };

  const cost = useMemo(() => previewCost(f), [f]);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1100, mx: 'auto' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: REPAIRS_UI.textHeader }}>Gemstones</Typography>
          <Typography variant="body2" sx={{ color: REPAIRS_UI.textMuted }}>Cut stones as design products — 1-of-1, limited, or made-to-order.</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openNew} sx={{ bgcolor: REPAIRS_UI.accent, color: '#1a1205', textTransform: 'none', '&:hover': { bgcolor: REPAIRS_UI.accent } }}>New gemstone</Button>
      </Stack>

      {loading ? (
        <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress sx={{ color: REPAIRS_UI.accent }} /></Stack>
      ) : designs.length === 0 ? (
        <Paper sx={panelSx}>
          <Stack alignItems="center" spacing={1.5} sx={{ py: 5 }}>
            <DiamondIcon sx={{ fontSize: 40, color: REPAIRS_UI.textMuted }} />
            <Typography sx={{ color: REPAIRS_UI.textSecondary }}>No gemstone designs yet.</Typography>
            <Button onClick={openNew} sx={{ color: REPAIRS_UI.accent, textTransform: 'none' }}>Create the first one</Button>
          </Stack>
        </Paper>
      ) : (
        <Stack spacing={1}>
          {designs.map((d) => {
            const g = d.gemstone || {};
            return (
              <Paper key={d.designID} sx={{ ...panelSx, p: 1.5, cursor: 'pointer', '&:hover': { borderColor: REPAIRS_UI.accent } }} onClick={() => openEdit(d)}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <DiamondIcon sx={{ color: REPAIRS_UI.accent, fontSize: 20 }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 600 }} noWrap>{d.name || g.species}</Typography>
                    <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>
                      {[g.species, g.carat ? `${g.carat}ct` : null, g.naturalSynthetic, (g.color || []).join('/'), g.clarity].filter(Boolean).join(' · ')}
                    </Typography>
                  </Box>
                  <Chip size="small" label={d.edition?.type === 'limited' ? `limited ${d.edition.limit}` : d.edition?.type} variant="outlined" sx={{ height: 20 }} />
                  <Chip size="small" label={d.status} variant="outlined" sx={{ height: 20 }} />
                  <Typography sx={{ color: REPAIRS_UI.textSecondary, width: 90, textAlign: 'right' }}>{money(d.suggestedRetail)}</Typography>
                  <IconButton size="small" onClick={(e) => remove(d, e)} sx={{ color: REPAIRS_UI.textMuted }}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton>
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}` } }}>
        <DialogTitle sx={{ color: REPAIRS_UI.textHeader }}>{editingId ? 'Edit gemstone design' : 'New gemstone design'}</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <TextField size="small" label="Name" value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="defaults to species" sx={{ flex: 1, minWidth: 180 }} />
              <TextField size="small" label="Species *" value={f.species} onChange={(e) => set({ species: e.target.value })} placeholder="Amethyst, Sapphire…" sx={{ width: 160 }} />
            </Stack>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <TextField size="small" label="Carat" type="number" value={f.carat} onChange={(e) => set({ carat: e.target.value })} sx={{ width: 90 }} inputProps={{ step: 0.01, min: 0 }} />
              <TextField size="small" label="L (mm)" type="number" value={f.length} onChange={(e) => set({ length: e.target.value })} sx={{ width: 80 }} inputProps={{ step: 0.1 }} />
              <TextField size="small" label="W (mm)" type="number" value={f.width} onChange={(e) => set({ width: e.target.value })} sx={{ width: 80 }} inputProps={{ step: 0.1 }} />
              <TextField size="small" label="H (mm)" type="number" value={f.height} onChange={(e) => set({ height: e.target.value })} sx={{ width: 80 }} inputProps={{ step: 0.1 }} />
              <TextField select size="small" label="Origin" value={f.naturalSynthetic} onChange={(e) => set({ naturalSynthetic: e.target.value })} sx={{ width: 120 }}>
                {CREATIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
              </TextField>
            </Stack>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <TextField size="small" label="Cut(s)" value={f.cut} onChange={(e) => set({ cut: e.target.value })} placeholder="Cushion" sx={{ width: 150 }} helperText="comma-separated" FormHelperTextProps={{ sx: { mx: 0, fontSize: '0.6rem' } }} />
              <TextField size="small" label="Color(s)" value={f.color} onChange={(e) => set({ color: e.target.value })} placeholder="Blue" sx={{ width: 130 }} />
              <TextField size="small" label="Clarity" value={f.clarity} onChange={(e) => set({ clarity: e.target.value })} sx={{ width: 100 }} />
              <TextField size="small" label="Treatment(s)" value={f.treatment} onChange={(e) => set({ treatment: e.target.value })} sx={{ width: 140 }} />
            </Stack>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <TextField select size="small" label="Edition" value={f.editionType} onChange={(e) => set({ editionType: e.target.value })} sx={{ width: 130 }}>
                {EDITIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
              </TextField>
              {f.editionType === 'limited' && (
                <TextField size="small" label="Limit" type="number" value={f.editionLimit} onChange={(e) => set({ editionLimit: e.target.value })} sx={{ width: 90 }} inputProps={{ min: 1 }} />
              )}
              <TextField select size="small" label="Status" value={f.status} onChange={(e) => set({ status: e.target.value })} sx={{ width: 120 }}>
                {STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
            </Stack>
            <Typography variant="caption" sx={{ color: REPAIRS_UI.textSecondary, fontWeight: 600, mt: 0.5 }}>Pricing — carat × rate + cut labor</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <TextField size="small" label="$/carat" type="number" value={f.ratePerCarat} onChange={(e) => set({ ratePerCarat: e.target.value })} sx={{ width: 100 }} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
              <TextField size="small" label="Cut hrs" type="number" value={f.cutLaborHours} onChange={(e) => set({ cutLaborHours: e.target.value })} sx={{ width: 90 }} inputProps={{ step: 0.25 }} />
              <TextField size="small" label="$/hr" type="number" value={f.laborRate} onChange={(e) => set({ laborRate: e.target.value })} sx={{ width: 90 }} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
              <TextField size="small" label="Retail (override)" type="number" value={f.retailPrice} onChange={(e) => set({ retailPrice: e.target.value })} sx={{ width: 140 }} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
            </Stack>
            <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>
              Est. cost <b style={{ color: REPAIRS_UI.textHeader }}>{money(cost)}</b>{!f.retailPrice && <> · suggested retail <b style={{ color: REPAIRS_UI.textHeader }}>{money(cost * 2.5)}</b></>}
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} sx={{ color: REPAIRS_UI.textMuted, textTransform: 'none' }}>Cancel</Button>
          <Button onClick={save} disabled={saving} variant="contained" sx={{ bgcolor: REPAIRS_UI.accent, color: '#1a1205', textTransform: 'none', '&:hover': { bgcolor: REPAIRS_UI.accent } }}>
            {saving ? '…' : editingId ? 'Save' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={3500} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {toast ? <Alert severity={toast.sev} onClose={() => setToast(null)}>{toast.msg}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}
