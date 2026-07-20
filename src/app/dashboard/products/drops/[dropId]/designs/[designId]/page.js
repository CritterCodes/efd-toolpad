'use client';

import React, { useEffect, useState, useCallback, useMemo, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Button, Chip, Stack, Paper, CircularProgress,
  TextField, FormControl, InputLabel, Select, MenuItem, Autocomplete, Snackbar, Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DesignServicesIcon from '@mui/icons-material/DesignServices';
import StyleIcon from '@mui/icons-material/Style';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';

import { REPAIRS_UI, repairsMenuProps } from '@/app/dashboard/repairs/components/repairsUi';
import { getSTLVolume } from '@/lib/stlParser';

const DESIGN_STATUSES = ['draft', 'cad_requested', 'cad_in_progress', 'cad_qc', 'ready', 'retired'];
const PRODUCTION_METHODS = ['cad_cast', 'handmade'];
const EDITION_TYPES = [
  { value: 'one_of_one', label: 'One of One' },
  { value: 'limited', label: 'Limited Release' },
  { value: 'unlimited', label: 'No Limit (unlimited)' },
];
const CATEGORIES = ['ring', 'necklace', 'bracelet', 'earrings', 'pendant', 'brooch', 'other'];

const STATUS_COLOR = {
  draft: REPAIRS_UI.textMuted, cad_requested: '#FFB74D', cad_in_progress: '#64B5F6',
  cad_qc: '#FFB74D', ready: '#66BB6A', retired: REPAIRS_UI.textMuted,
};

const panelSx = { p: { xs: 2, md: 2.5 }, mb: 2, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' };
const cap = (s) => String(s || '').replace(/_/g, ' ');
const artisanLabel = (a) => [a.firstName, a.lastName].filter(Boolean).join(' ') || a.email || a.userID || '';
const artisanId = (a) => a.userID || a._id?.toString();

function PanelTitle({ children }) {
  return <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 2 }}>{children}</Typography>;
}

// Flatten a design doc into the editable form shape (stable key order → dirty diffing).
function toForm(d) {
  return {
    name: d.name || '',
    description: d.description || '',
    category: d.category || '',
    productionMethod: d.productionMethod || 'cad_cast',
    status: d.status || 'draft',
    editionType: d.edition?.type || 'unlimited',
    editionLimit: d.edition?.limit != null ? String(d.edition.limit) : '',
    primaryArtisanId: d.primaryArtisanId || '',
    tags: Array.isArray(d.tags) ? d.tags : [],
  };
}

function DetailsTab({ form, setField, artisans }) {
  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 0, md: 3 }} alignItems="flex-start">
      {/* Main column */}
      <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
        <Paper sx={panelSx}>
          <PanelTitle>Details</PanelTitle>
          <Stack spacing={2}>
            <TextField label="Name" value={form.name} onChange={(e) => setField('name', e.target.value)} size="small" fullWidth required />
            <TextField label="Description" value={form.description} onChange={(e) => setField('description', e.target.value)} size="small" fullWidth multiline minRows={4} />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel>Category</InputLabel>
                <Select value={form.category} label="Category" onChange={(e) => setField('category', e.target.value)} MenuProps={repairsMenuProps}>
                  <MenuItem value="">Unspecified</MenuItem>
                  {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel>Production method</InputLabel>
                <Select value={form.productionMethod} label="Production method" onChange={(e) => setField('productionMethod', e.target.value)} MenuProps={repairsMenuProps}>
                  {PRODUCTION_METHODS.map((m) => <MenuItem key={m} value={m}>{cap(m)}</MenuItem>)}
                </Select>
              </FormControl>
            </Stack>
            <Autocomplete
              multiple freeSolo options={[]} value={form.tags}
              onChange={(_, v) => setField('tags', v)}
              renderInput={(params) => <TextField {...params} label="Tags" placeholder="add tag…" size="small" />}
            />
          </Stack>
        </Paper>
      </Box>

      {/* Sidebar */}
      <Box sx={{ width: { xs: '100%', md: 300 }, flexShrink: 0 }}>
        <Paper sx={panelSx}>
          <PanelTitle>Status</PanelTitle>
          <FormControl size="small" fullWidth>
            <Select value={form.status} onChange={(e) => setField('status', e.target.value)} MenuProps={repairsMenuProps}>
              {DESIGN_STATUSES.map((s) => <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>{cap(s)}</MenuItem>)}
            </Select>
          </FormControl>
        </Paper>

        <Paper sx={panelSx}>
          <PanelTitle>Edition</PanelTitle>
          <Stack spacing={2}>
            <FormControl size="small" fullWidth>
              <InputLabel>Edition type</InputLabel>
              <Select value={form.editionType} label="Edition type" onChange={(e) => setField('editionType', e.target.value)} MenuProps={repairsMenuProps}>
                {EDITION_TYPES.map((et) => <MenuItem key={et.value} value={et.value}>{et.label}</MenuItem>)}
              </Select>
            </FormControl>
            {form.editionType === 'limited' && (
              <TextField label="Edition limit" type="number" value={form.editionLimit} onChange={(e) => setField('editionLimit', e.target.value)} size="small" fullWidth />
            )}
          </Stack>
        </Paper>

        <Paper sx={panelSx}>
          <PanelTitle>Artisan credit</PanelTitle>
          <Autocomplete
            size="small" options={artisans}
            getOptionLabel={artisanLabel}
            isOptionEqualToValue={(o, v) => artisanId(o) === artisanId(v)}
            value={artisans.find((a) => artisanId(a) === form.primaryArtisanId) || null}
            onChange={(_, opt) => setField('primaryArtisanId', opt ? (artisanId(opt) || '') : '')}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Primary artisan"
                placeholder="search…"
                required
                error={!form.primaryArtisanId}
                helperText={!form.primaryArtisanId ? 'Required — a design must credit an artisan.' : ' '}
              />
            )}
          />
          <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, mt: 0.5, display: 'block' }}>
            Drop credit is derived from each design’s primary artisan.
          </Typography>
        </Paper>
      </Box>
    </Stack>
  );
}

function CadUploadRow({ label, accept, hint, done, uploading, onPick }) {
  return (
    <Stack direction="row" alignItems="center" spacing={2} sx={{ py: 0.75, flexWrap: 'wrap', useFlexGap: true }}>
      <Button
        component="label" size="small" variant="outlined" disabled={uploading}
        startIcon={uploading ? <CircularProgress size={14} /> : <UploadFileIcon sx={{ fontSize: 16 }} />}
        sx={{ color: done ? '#66BB6A' : REPAIRS_UI.accent, borderColor: done ? '#66BB6A' : REPAIRS_UI.border, textTransform: 'none' }}
      >
        {uploading ? 'Uploading…' : (done ? `Replace ${label}` : `Upload ${label}`)}
        <input type="file" hidden accept={accept} onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); if (e.target) e.target.value = ''; }} />
      </Button>
      {done
        ? <Chip size="small" icon={<CheckCircleIcon sx={{ fontSize: 14 }} />} label="Uploaded" sx={{ backgroundColor: '#66BB6A22', color: '#66BB6A', fontWeight: 700, '& .MuiChip-icon': { color: '#66BB6A' } }} />
        : <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>{hint}</Typography>}
    </Stack>
  );
}

function CadTab({ design, dropId, designId, onReload, notify }) {
  const router = useRouter();
  const [busyStl, setBusyStl] = useState(false);
  const [busyGlb, setBusyGlb] = useState(false);
  const dm = design.designModel || {};
  const hasMesh = dm.meshMap && Object.keys(dm.meshMap).length > 0;

  const uploadAsset = async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('field', 'referenceImages'); // storage sink; CAD urls are tracked on the design fields below
    const res = await fetch(`/api/production/designs/${designId}/assets`, { method: 'POST', body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data.url;
  };
  const patch = async (fields) => {
    const res = await fetch(`/api/production/designs/${designId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields) });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Save failed');
  };
  const onStl = async (file) => {
    setBusyStl(true);
    try {
      const url = await uploadAsset(file);
      // CAD volume is calculated from the STL, never typed (same math as customs CAD upload).
      let volume = null;
      try { const mm3 = await getSTLVolume(file); if (mm3 > 0) volume = Math.round((mm3 / 1000) * 1000) / 1000; } catch { /* best-effort */ }
      await patch({ stlUrl: url, stlVolumeCm3: volume });
      notify(volume ? `STL uploaded · volume ${volume} cm³` : 'STL uploaded', 'success');
      onReload();
    } catch (e) { notify(e.message, 'error'); } finally { setBusyStl(false); }
  };
  const onGlb = async (file) => {
    setBusyGlb(true);
    try {
      const url = await uploadAsset(file);
      await patch({ designModel: { ...dm, glbUrl: url } });
      notify('GLB uploaded', 'success');
      onReload();
    } catch (e) { notify(e.message, 'error'); } finally { setBusyGlb(false); }
  };

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 0, md: 3 }} alignItems="flex-start">
      <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
        <Paper sx={panelSx}>
          <PanelTitle>CAD files</PanelTitle>
          <CadUploadRow label="STL" accept=".stl" hint="Volume is calculated from the STL." done={!!design.stlUrl} uploading={busyStl} onPick={onStl} />
          <Box sx={{ pl: 0.5, mt: 1 }}>
            <Typography sx={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: REPAIRS_UI.textSecondary, mb: 0.25 }}>CAD volume</Typography>
            <Typography sx={{ color: design.stlVolumeCm3 != null ? REPAIRS_UI.textHeader : REPAIRS_UI.textMuted, fontSize: '1rem', fontWeight: 600 }}>
              {design.stlVolumeCm3 != null ? `${design.stlVolumeCm3} cm³` : 'Not calculated yet'}
            </Typography>
            <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>Calculated automatically from the uploaded STL — never typed.</Typography>
          </Box>
          <Box sx={{ borderTop: `1px solid ${REPAIRS_UI.border}`, my: 1.5 }} />
          <CadUploadRow label="GLB" accept=".glb" hint="Needed for the 3D viewer & material assignment." done={!!dm.glbUrl} uploading={busyGlb} onPick={onGlb} />
        </Paper>
      </Box>

      <Box sx={{ width: { xs: '100%', md: 300 }, flexShrink: 0 }}>
        <Paper sx={panelSx}>
          <PanelTitle>Materials (REFRAKT)</PanelTitle>
          {!dm.glbUrl ? (
            <Typography variant="body2" sx={{ color: REPAIRS_UI.textMuted }}>Upload a GLB to assign materials.</Typography>
          ) : (
            <Stack spacing={1.5} alignItems="flex-start">
              <Chip size="small" label={hasMesh ? 'Materials assigned' : 'Not assigned yet'}
                sx={{ backgroundColor: hasMesh ? '#66BB6A22' : REPAIRS_UI.bgTertiary, color: hasMesh ? '#66BB6A' : REPAIRS_UI.textSecondary, border: `1px solid ${hasMesh ? '#66BB6A' : REPAIRS_UI.border}`, fontWeight: 700 }} />
              <Button variant="contained" startIcon={<AutoAwesomeIcon sx={{ fontSize: 16 }} />}
                onClick={() => router.push(`/dashboard/products/drops/${dropId}/designs/${designId}/assign-materials`)}
                sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, textTransform: 'none', '&:hover': { backgroundColor: '#C19B2E' } }}>
                {hasMesh ? 'Edit materials' : 'Assign materials'}
              </Button>
              <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>Opens the REFRAKT studio to map metals &amp; gems onto the GLB.</Typography>
            </Stack>
          )}
        </Paper>
      </Box>
    </Stack>
  );
}

function PlaceholderPanel({ icon: Icon, title, lines }) {
  return (
    <Paper sx={{ ...panelSx, textAlign: 'center', py: 6 }}>
      <Icon sx={{ fontSize: 44, color: REPAIRS_UI.textMuted, mb: 1 }} />
      <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 1 }}>{title}</Typography>
      {lines.map((l, i) => <Typography key={i} variant="body2" sx={{ color: REPAIRS_UI.textSecondary, maxWidth: 540, mx: 'auto', lineHeight: 1.6 }}>{l}</Typography>)}
    </Paper>
  );
}

export default function DesignDetailPage({ params }) {
  const router = useRouter();
  const { dropId, designId } = use(params);
  const [design, setDesign] = useState(null);
  const [form, setForm] = useState(null);
  const [artisans, setArtisans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState(0);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });
  const notify = (message, severity = 'success') => setSnack({ open: true, message, severity });
  const closeSnack = () => setSnack((s) => ({ ...s, open: false }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/production/designs/${designId}`);
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Design not found');
      const d = await res.json();
      setDesign(d);
      setForm(toForm(d));
    } catch (e) { notify(e.message, 'error'); } finally { setLoading(false); }
  }, [designId]);

  useEffect(() => {
    load();
    fetch('/api/users?role=artisan').then((r) => r.json())
      .then((d) => setArtisans(Array.isArray(d) ? d : (d.data || d.users || [])))
      .catch(() => {});
  }, [load]);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const dirty = useMemo(() => {
    if (!design || !form) return false;
    return JSON.stringify(form) !== JSON.stringify(toForm(design));
  }, [design, form]);

  const discard = () => setForm(toForm(design));

  const save = async () => {
    if (!form.name.trim()) { notify('Name is required.', 'error'); return; }
    if (!form.primaryArtisanId) { notify('A primary artisan is required.', 'error'); return; }
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        category: form.category || null,
        productionMethod: form.productionMethod,
        status: form.status,
        tags: form.tags,
        primaryArtisanId: form.primaryArtisanId || null,
        edition: { type: form.editionType, ...(form.editionType === 'limited' ? { limit: Number(form.editionLimit) || 1 } : {}) },
      };
      const res = await fetch(`/api/production/designs/${designId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Save failed');
      notify('Saved', 'success');
      await load();
    } catch (e) { notify(e.message, 'error'); } finally { setSaving(false); }
  };

  const backToDrop = () => router.push(`/dashboard/products/drops/${dropId}`);
  const artisanName = (id) => { const a = artisans.find((x) => artisanId(x) === id); return a ? artisanLabel(a) : id; };

  if (loading || !form) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress sx={{ color: REPAIRS_UI.accent }} /></Box>;
  if (!design) {
    return (
      <Box sx={{ p: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={backToDrop} sx={{ color: REPAIRS_UI.textSecondary, mb: 2 }}>Back to drop</Button>
        <Typography color="error">Design not found.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 6 }}>
      {/* Sticky unsaved-changes bar (Shopify-style) */}
      {dirty && (
        <Box sx={{ position: 'sticky', top: 0, zIndex: 20, mb: 2 }}>
          <Paper sx={{ p: 1.5, backgroundColor: REPAIRS_UI.bgCard, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.accent}`, borderRadius: 2, boxShadow: REPAIRS_UI.shadow }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
              <Typography sx={{ color: REPAIRS_UI.textPrimary, fontWeight: 600, fontSize: '0.9rem' }}>Unsaved changes</Typography>
              <Stack direction="row" spacing={1}>
                <Button size="small" onClick={discard} disabled={saving} sx={{ color: REPAIRS_UI.textSecondary, textTransform: 'none' }}>Discard</Button>
                <Button size="small" variant="contained" onClick={save} disabled={saving || !form.name.trim() || !form.primaryArtisanId}
                  startIcon={saving ? <CircularProgress size={14} sx={{ color: '#1A1A1A' }} /> : null}
                  sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, textTransform: 'none', '&:hover': { backgroundColor: '#C19B2E' } }}>
                  {saving ? 'Saving…' : 'Save'}
                </Button>
              </Stack>
            </Stack>
          </Paper>
        </Box>
      )}

      {/* Header */}
      <Box sx={{ backgroundColor: { xs: 'transparent', sm: REPAIRS_UI.bgPanel }, border: { xs: 'none', sm: `1px solid ${REPAIRS_UI.border}` }, borderRadius: { xs: 0, sm: 3 }, boxShadow: { xs: 'none', sm: REPAIRS_UI.shadow }, p: { xs: 0.5, sm: 2.5, md: 3 }, mb: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={backToDrop} sx={{ color: REPAIRS_UI.textSecondary, mb: 1.5, pl: 0 }}>Back to drop</Button>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, px: 1.25, py: 0.5, mb: 1.5, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', color: REPAIRS_UI.textPrimary, backgroundColor: REPAIRS_UI.bgCard, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, textTransform: 'uppercase' }}>
              <DesignServicesIcon sx={{ fontSize: 16, color: REPAIRS_UI.accent }} /> Design
            </Typography>
            <Typography sx={{ fontSize: { xs: 26, md: 32 }, fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 0.5 }}>{design.name || 'Untitled design'}</Typography>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              {design.category && <Typography sx={{ color: REPAIRS_UI.textSecondary, textTransform: 'capitalize' }}>{cap(design.category)}</Typography>}
              {design.primaryArtisanId && <Typography sx={{ color: REPAIRS_UI.textMuted, fontSize: '0.85rem' }}>· {artisanName(design.primaryArtisanId)}</Typography>}
            </Stack>
          </Box>
          <Chip label={cap(design.status || 'draft')} sx={{ backgroundColor: `${STATUS_COLOR[design.status] || REPAIRS_UI.textMuted}22`, color: STATUS_COLOR[design.status] || REPAIRS_UI.textMuted, fontWeight: 700, textTransform: 'capitalize', flexShrink: 0 }} />
        </Stack>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile
        sx={{ mb: 2, borderBottom: `1px solid ${REPAIRS_UI.border}`, '& .MuiTab-root': { color: REPAIRS_UI.textSecondary, textTransform: 'none', fontWeight: 600 }, '& .Mui-selected': { color: REPAIRS_UI.accent }, '& .MuiTabs-indicator': { backgroundColor: REPAIRS_UI.accent } }}>
        <Tab label="Details" />
        <Tab label="CAD & 3D" />
        <Tab label="Variants" />
      </Tabs>

      {tab === 0 && <DetailsTab form={form} setField={setField} artisans={artisans} />}
      {tab === 1 && <CadTab design={design} dropId={dropId} designId={designId} onReload={load} notify={notify} />}
      {tab === 2 && <PlaceholderPanel icon={StyleIcon} title="Variants — coming next" lines={[
        'Create one or many variants, each with a REFRAKT material configuration.',
        'Optionally expose a REFRAKT customizer so shoppers can personalize (made-to-order).',
      ]} />}

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={closeSnack} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={closeSnack} severity={snack.severity} sx={{ backgroundColor: REPAIRS_UI.bgCard, color: REPAIRS_UI.textPrimary, border: `1px solid ${REPAIRS_UI.border}` }}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}
