'use client';

// Item 4 (#225) — this IS the canonical Drops route. `production/collections` now redirects here.
// The route/UI says "Drop"; the data model + API stay `/api/production/collections/*` (a drop is a
// collection with a release date — model unchanged, per the owner's item-4 note).

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Button, Grid, Paper, TextField,
  InputAdornment, FormControl, InputLabel, Select, MenuItem, Stack, Chip, CircularProgress,
  Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CollectionsIcon from '@mui/icons-material/Collections';
import SearchIcon from '@mui/icons-material/Search';
import InboxIcon from '@mui/icons-material/Inbox';
import EventIcon from '@mui/icons-material/Event';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';

import { REPAIRS_UI, repairsMenuProps } from '@/app/dashboard/repairs/components/repairsUi';
import MetricCard from '@/components/production/MetricCard';
import ProductionEntityCard from '@/components/production/ProductionEntityCard';
import { primaryImageOf } from '@/components/production/media/EntityThumbnail';

const STATUS_OPTIONS = ['all', 'draft', 'scheduled', 'released', 'archived'];
const STATUS_COLOR = { draft: REPAIRS_UI.textMuted, scheduled: '#FFB74D', released: '#66BB6A', archived: REPAIRS_UI.textMuted };
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—');


// U-7 — browse-only card via the shared <ProductionEntityCard>.
function DropCard({ collection, onManage }) {
  const c = collection;
  const memberCount = Array.isArray(c.members) ? c.members.length : 0;
  const chips = [
    <Chip key="owner" size="small" label={c.ownerType === 'artisan' ? 'Artisan' : 'EFD'} sx={{ backgroundColor: REPAIRS_UI.bgTertiary, color: REPAIRS_UI.textSecondary, border: `1px solid ${REPAIRS_UI.border}`, fontWeight: 600 }} />,
    <Chip key="status" size="small" label={c.status || 'draft'} sx={{ backgroundColor: `${STATUS_COLOR[c.status] || REPAIRS_UI.textMuted}22`, color: STATUS_COLOR[c.status] || REPAIRS_UI.textMuted, textTransform: 'capitalize', fontWeight: 700 }} />,
  ];
  return (
    <ProductionEntityCard
      image={primaryImageOf(c)}
      id={c.collectionId}
      title={c.name || 'Untitled drop'}
      meta={c.theme || null}
      chips={chips}
      footerLeft={<Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}><CollectionsIcon sx={{ fontSize: 15 }} />{memberCount} {memberCount === 1 ? 'product' : 'products'}</Box>}
      footerRight={<Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontSize: '0.8rem' }}><EventIcon sx={{ fontSize: 15 }} />{fmtDate(c.releaseAt)}</Box>}
      onOpen={() => onManage(c)}
    />
  );
}

function CreateDropDialog({ open, onClose, onCreated, onError }) {
  const empty = { name: '', ownerType: 'efd', theme: '', description: '', releaseAt: '' };
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!form.name.trim()) { onError('Name is required.'); return; }
    setSaving(true);
    try {
      const body = { ...form, releaseAt: form.releaseAt || null };
      const res = await fetch('/api/production/collections', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to create drop');
      const created = await res.json();
      setForm(empty);
      onCreated(created);
    } catch (e) {
      onError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm"
      PaperProps={{ sx: { backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}` } }}>
      <DialogTitle sx={{ color: REPAIRS_UI.textHeader }}>New Drop</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Name" value={form.name} onChange={set('name')} size="small" fullWidth autoFocus required />
          <FormControl size="small" fullWidth>
            <InputLabel>Owner</InputLabel>
            <Select value={form.ownerType} label="Owner" onChange={set('ownerType')} MenuProps={repairsMenuProps}>
              <MenuItem value="efd">EFD (house)</MenuItem>
              <MenuItem value="artisan">Artisan</MenuItem>
            </Select>
          </FormControl>
          <TextField label="Theme" value={form.theme} onChange={set('theme')} size="small" fullWidth />
          <TextField label="Description" value={form.description} onChange={set('description')} size="small" fullWidth multiline minRows={2} />
          <TextField label="Release date" type="datetime-local" value={form.releaseAt} onChange={set('releaseAt')} size="small" fullWidth InputLabelProps={{ shrink: true }} />
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

export default function ProductionDropsPage() {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [ownerType, setOwnerType] = useState('all');
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });
  const router = useRouter();

  const showSnack = (message, severity = 'success') => setSnack({ open: true, message, severity });
  const closeSnack = () => setSnack((s) => ({ ...s, open: false }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/production/collections');
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to load drops');
      setCollections(await res.json());
    } catch (e) {
      showSnack(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const metrics = useMemo(() => ({
    total: collections.length,
    scheduled: collections.filter((c) => c.status === 'scheduled').length,
    released: collections.filter((c) => c.status === 'released').length,
  }), [collections]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return collections.filter((c) => {
      if (status !== 'all' && (c.status || 'draft') !== status) return false;
      if (ownerType !== 'all' && (c.ownerType || 'efd') !== ownerType) return false;
      if (!q) return true;
      return [c.name, c.theme, c.description, c.slug].filter(Boolean).join(' ').toLowerCase().includes(q);
    });
  }, [collections, search, status, ownerType]);

  // M5-T1: open the drop detail page (stage members + schedule + go-live).
  const onManage = (c) => router.push(`/dashboard/production/drops/${c.collectionId}`);

  return (
    <Box sx={{ pb: 6 }}>
      <Box sx={{ backgroundColor: { xs: 'transparent', sm: REPAIRS_UI.bgPanel }, border: { xs: 'none', sm: `1px solid ${REPAIRS_UI.border}` }, borderRadius: { xs: 0, sm: 3 }, boxShadow: { xs: 'none', sm: REPAIRS_UI.shadow }, p: { xs: 0.5, sm: 2.5, md: 3 }, mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box sx={{ maxWidth: 920 }}>
            <Typography sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, px: 1.25, py: 0.5, mb: 1.5, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', color: REPAIRS_UI.textPrimary, backgroundColor: REPAIRS_UI.bgCard, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, textTransform: 'uppercase' }}>
              <CollectionsIcon sx={{ fontSize: 16, color: REPAIRS_UI.accent }} />
              Production Catalog
            </Typography>
            <Typography sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 1 }}>Drops</Typography>
            <Typography sx={{ color: REPAIRS_UI.textSecondary, lineHeight: 1.6 }}>
              Curate products into a drop, then release them together on a schedule. A drop is a collection with a release date.
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)} sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, '&:hover': { backgroundColor: '#C19B2E' } }}>New Drop</Button>
        </Stack>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={4}><MetricCard icon={CollectionsIcon} label="Total" value={metrics.total} /></Grid>
        <Grid item xs={4}><MetricCard icon={EventIcon} label="Scheduled" value={metrics.scheduled} accent="#FFB74D" /></Grid>
        <Grid item xs={4}><MetricCard icon={RocketLaunchIcon} label="Released" value={metrics.released} accent="#66BB6A" /></Grid>
      </Grid>

      <Paper sx={{ p: 2, mb: 2, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
          <TextField placeholder="Search by name, theme, description…" value={search} onChange={(e) => setSearch(e.target.value)} size="small" fullWidth
            InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ color: REPAIRS_UI.textSecondary }} /></InputAdornment>) }} />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Status</InputLabel>
            <Select value={status} label="Status" onChange={(e) => setStatus(e.target.value)} MenuProps={repairsMenuProps}>
              {STATUS_OPTIONS.map((s) => <MenuItem key={s} value={s}>{s === 'all' ? 'All statuses' : s}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Owner</InputLabel>
            <Select value={ownerType} label="Owner" onChange={(e) => setOwnerType(e.target.value)} MenuProps={repairsMenuProps}>
              <MenuItem value="all">All owners</MenuItem>
              <MenuItem value="efd">EFD (house)</MenuItem>
              <MenuItem value="artisan">Artisan</MenuItem>
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
            {collections.length === 0 ? 'No drops yet. Create one to start staging products.' : 'No drops match your filters.'}
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {filtered.map((c) => (
            <Grid item xs={12} sm={6} md={4} key={c.collectionId || c.slug}>
              <DropCard collection={c} onManage={onManage} />
            </Grid>
          ))}
        </Grid>
      )}

      <CreateDropDialog
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
