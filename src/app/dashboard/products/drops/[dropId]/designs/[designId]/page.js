'use client';

import React, { useEffect, useState, useCallback, useMemo, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Button, Chip, Stack, Paper, CircularProgress, IconButton,
  TextField, FormControl, InputLabel, Select, MenuItem, Autocomplete, Snackbar, Alert, InputAdornment,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DesignServicesIcon from '@mui/icons-material/DesignServices';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
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
const METAL_KEYS = [
  { key: 'GOLD_14K_YELLOW', label: '14K Yellow Gold' },
  { key: 'GOLD_14K_WHITE', label: '14K White Gold' },
  { key: 'GOLD_18K_YELLOW', label: '18K Yellow Gold' },
  { key: 'GOLD_10K_YELLOW', label: '10K Yellow Gold' },
  { key: 'SILVER_STERLING', label: 'Sterling Silver' },
  { key: 'PLATINUM_IRIDIUM', label: 'Platinum' },
];

let variantSeq = 0;
function newVariantForm() {
  variantSeq += 1;
  return {
    variantId: `v-${Date.now().toString(36)}-${variantSeq}`,
    sku: '', label: '', metalKey: 'GOLD_14K_YELLOW',
    ringSize: '', sizingMin: '', sizingMax: '',
    retailPrice: '', leadTimeDays: '', active: true, customizable: false,
  };
}

const STATUS_COLOR = {
  draft: REPAIRS_UI.textMuted, cad_requested: '#FFB74D', cad_in_progress: '#64B5F6',
  cad_qc: '#FFB74D', ready: '#66BB6A', retired: REPAIRS_UI.textMuted,
};

const panelSx = { p: { xs: 2, md: 2.5 }, mb: 2, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' };
const cap = (s) => String(s || '').replace(/_/g, ' ');
const money = (x) => `$${(Number(x) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const sumLines = (arr) => (arr || []).reduce((s, r) => s + (Number(r.cost) || 0) * (Number(r.quantity) || 1), 0);
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
    // Pricing recipe — SHARED across variants; cascades. Retail is computed live from
    // market metal rates, never stored, so we only persist these inputs.
    pricing: {
      markup: d.pricing?.markup != null && d.pricing.markup !== '' ? String(d.pricing.markup) : '',
      laborTasks: (d.pricing?.laborTasks || []).map((t) => ({ description: t.description || '', quantity: t.quantity != null ? String(t.quantity) : '1', cost: t.cost != null ? String(t.cost) : '' })),
      shipping: (d.pricing?.shipping || []).map((s) => ({ description: s.description || '', cost: s.cost != null ? String(s.cost) : '' })),
      designFees: (d.pricing?.designFees || []).map((f) => ({ description: f.description || '', cost: f.cost != null ? String(f.cost) : '' })),
    },
    variants: (Array.isArray(d.variants) ? d.variants : []).map((v) => ({
      variantId: v.variantId || '',
      sku: v.sku || '',
      label: v.label || v.title || '',
      metalKey: v.metalKey || '',
      ringSize: v.ringSize != null ? String(v.ringSize) : '',
      sizingMin: v.sizingAllowance?.min != null ? String(v.sizingAllowance.min) : '',
      sizingMax: v.sizingAllowance?.max != null ? String(v.sizingAllowance.max) : '',
      retailPrice: v.pricing?.retailPrice != null ? String(v.pricing.retailPrice) : '',
      leadTimeDays: v.leadTimeDays != null ? String(v.leadTimeDays) : '',
      active: v.active !== false,
      customizable: Boolean(v.viewer?.customizable),
      // Per-variant pricing controls (the variant "owns" its stones + optional markup).
      stonesCost: v.stonesCost != null ? String(v.stonesCost) : '',
      markupOverride: v.markupOverride != null && v.markupOverride !== '' ? String(v.markupOverride) : '',
    })),
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

function VariantRow({ index, variant, isRing, hasGlb, onUpdate, onRemove }) {
  const set = (k, v) => onUpdate(index, { [k]: v });
  return (
    <Paper sx={{ p: 2, mb: 1.5, backgroundColor: REPAIRS_UI.bgTertiary, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
        <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader, fontSize: '0.9rem' }}>Variant {index + 1}</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            size="small" label={variant.active ? 'Active' : 'Inactive'} onClick={() => set('active', !variant.active)}
            sx={{ cursor: 'pointer', backgroundColor: variant.active ? '#66BB6A22' : REPAIRS_UI.bgCard, color: variant.active ? '#66BB6A' : REPAIRS_UI.textMuted, fontWeight: 700, fontSize: '0.72rem' }}
          />
          <IconButton size="small" onClick={() => onRemove(index)} sx={{ color: REPAIRS_UI.textMuted }}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton>
        </Stack>
      </Stack>
      <Stack spacing={1.5}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField label="SKU" value={variant.sku} onChange={(e) => set('sku', e.target.value)} size="small" fullWidth required error={!variant.sku.trim()} />
          <TextField label="Label (optional)" value={variant.label} onChange={(e) => set('label', e.target.value)} size="small" fullWidth />
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <FormControl size="small" sx={{ flex: 1 }}>
            <InputLabel>Metal</InputLabel>
            <Select value={variant.metalKey || ''} label="Metal" onChange={(e) => set('metalKey', e.target.value)} MenuProps={repairsMenuProps}>
              {METAL_KEYS.map((m) => <MenuItem key={m.key} value={m.key}>{m.label}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField label="Retail price ($)" type="number" value={variant.retailPrice} onChange={(e) => set('retailPrice', e.target.value)} size="small" sx={{ flex: 1 }} />
          <TextField label="Lead time (days)" type="number" value={variant.leadTimeDays} onChange={(e) => set('leadTimeDays', e.target.value)} size="small" sx={{ flex: 1 }} />
        </Stack>
        {isRing && (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField label="Nominal ring size" value={variant.ringSize} onChange={(e) => set('ringSize', e.target.value)} size="small" sx={{ flex: 1 }} required error={!variant.ringSize.trim()} helperText="e.g. 7" />
            <TextField label="Size range min" value={variant.sizingMin} onChange={(e) => set('sizingMin', e.target.value)} size="small" sx={{ flex: 1 }} helperText="resizable low" />
            <TextField label="Size range max" value={variant.sizingMax} onChange={(e) => set('sizingMax', e.target.value)} size="small" sx={{ flex: 1 }} helperText="resizable high" />
          </Stack>
        )}
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
          <Chip
            size="small"
            icon={<AutoAwesomeIcon sx={{ fontSize: 14 }} />}
            label={variant.customizable ? 'REFRAKT customization: ON' : 'REFRAKT customization: OFF'}
            onClick={() => set('customizable', !variant.customizable)}
            sx={{ cursor: 'pointer', backgroundColor: variant.customizable ? `${REPAIRS_UI.accent}22` : REPAIRS_UI.bgCard, color: variant.customizable ? REPAIRS_UI.accent : REPAIRS_UI.textSecondary, border: `1px solid ${variant.customizable ? REPAIRS_UI.accent : REPAIRS_UI.border}`, fontWeight: 700, '& .MuiChip-icon': { color: variant.customizable ? REPAIRS_UI.accent : REPAIRS_UI.textSecondary } }}
          />
          {variant.customizable && (
            <Typography variant="caption" sx={{ color: hasGlb ? REPAIRS_UI.textMuted : '#FFB74D' }}>
              {hasGlb
                ? 'Shoppers customize via the design’s REFRAKT model — every customized order is made-to-order.'
                : 'Upload a GLB on the CAD & 3D tab to power the customizer.'}
            </Typography>
          )}
        </Stack>
      </Stack>
    </Paper>
  );
}

function VariantsTab({ variants, category, hasGlb, onAdd, onUpdate, onRemove }) {
  const isRing = category === 'ring';
  return (
    <Paper sx={panelSx}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
        <Box>
          <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader }}>Variants</Typography>
          <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>
            Each variant is one sellable configuration (metal, size…). A sellable design needs at least one.
          </Typography>
        </Box>
        <Button size="small" startIcon={<AddIcon sx={{ fontSize: 16 }} />} onClick={onAdd} sx={{ color: REPAIRS_UI.accent, flexShrink: 0 }}>Add variant</Button>
      </Stack>
      {variants.length === 0 ? (
        <Typography sx={{ color: REPAIRS_UI.textMuted, fontSize: '0.85rem', textAlign: 'center', py: 3 }}>
          No variants yet. Add one (metal / size / price) to make this design sellable.
        </Typography>
      ) : variants.map((v, i) => (
        <VariantRow key={v.variantId || i} index={i} variant={v} isRing={isRing} hasGlb={hasGlb} onUpdate={onUpdate} onRemove={onRemove} />
      ))}
    </Paper>
  );
}

function PriceLineEditor({ rows, onChange, withQty, addLabel, emptyText }) {
  const set = (i, k, v) => onChange(rows.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const remove = (i) => onChange(rows.filter((_, idx) => idx !== i));
  const add = () => onChange([...rows, withQty ? { description: '', quantity: '1', cost: '' } : { description: '', cost: '' }]);
  return (
    <Box>
      {rows.length === 0
        ? <Typography variant="body2" sx={{ color: REPAIRS_UI.textMuted, py: 0.5 }}>{emptyText}</Typography>
        : (
          <Stack spacing={1}>
            {rows.map((r, i) => (
              <Stack key={i} direction="row" spacing={1} alignItems="center">
                <TextField size="small" label="Description" value={r.description || ''} onChange={(e) => set(i, 'description', e.target.value)} sx={{ flex: 1 }} />
                {withQty && <TextField size="small" label="Qty" type="number" value={r.quantity ?? '1'} onChange={(e) => set(i, 'quantity', e.target.value)} sx={{ width: 72 }} />}
                <TextField size="small" label="Cost" type="number" value={r.cost ?? ''} onChange={(e) => set(i, 'cost', e.target.value)} sx={{ width: 120 }} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
                <IconButton size="small" onClick={() => remove(i)} sx={{ color: REPAIRS_UI.textMuted }}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton>
              </Stack>
            ))}
          </Stack>
        )}
      <Button size="small" startIcon={<AddIcon sx={{ fontSize: 16 }} />} onClick={add} sx={{ color: REPAIRS_UI.accent, mt: 1 }}>{addLabel}</Button>
    </Box>
  );
}

function VariantPriceCard({ variant, mounting, sharedCosts, baseMarkup, hasVolume, loading, onChange }) {
  const stones = Number(variant.stonesCost) || 0;
  const markup = Number(variant.markupOverride) > 0 ? Number(variant.markupOverride) : baseMarkup;
  const cog = mounting + stones + sharedCosts;
  const retail = cog * markup;
  const label = variant.label?.trim() || variant.sku?.trim() || variant.variantId;
  const metal = METAL_KEYS.find((m) => m.key === variant.metalKey)?.label || variant.metalKey || 'No metal';
  return (
    <Paper sx={{ p: 2, mb: 1.5, backgroundColor: REPAIRS_UI.bgTertiary, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader, fontSize: '0.9rem' }}>{label}</Typography>
          <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>{metal}</Typography>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Typography sx={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: REPAIRS_UI.textSecondary }}>Live retail</Typography>
          <Typography sx={{ fontWeight: 700, fontSize: '1.35rem', color: REPAIRS_UI.accent, lineHeight: 1.1 }}>{money(retail)}</Typography>
        </Box>
      </Stack>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap>
        <Box sx={{ minWidth: 130 }}>
          <Typography sx={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: REPAIRS_UI.textSecondary }}>Mounting (live)</Typography>
          <Typography sx={{ fontSize: '0.9rem', color: hasVolume ? REPAIRS_UI.textPrimary : '#FFB74D', fontWeight: 500 }}>
            {loading ? '…' : hasVolume ? money(mounting) : 'needs STL'}
          </Typography>
        </Box>
        <TextField size="small" label="Stones $" type="number" value={variant.stonesCost} onChange={(e) => onChange({ stonesCost: e.target.value })} sx={{ width: 120 }} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
        <Box sx={{ minWidth: 110 }}>
          <Typography sx={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: REPAIRS_UI.textSecondary }}>Shared</Typography>
          <Typography sx={{ fontSize: '0.9rem', color: REPAIRS_UI.textPrimary, fontWeight: 500 }}>{money(sharedCosts)}</Typography>
        </Box>
        <TextField size="small" label="Markup ×" type="number" value={variant.markupOverride} onChange={(e) => onChange({ markupOverride: e.target.value })} placeholder={String(baseMarkup)} sx={{ width: 110 }} helperText={variant.markupOverride ? ' ' : `default ×${baseMarkup}`} FormHelperTextProps={{ sx: { mx: 0, fontSize: '0.6rem' } }} />
      </Stack>
      <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, mt: 1, display: 'block' }}>
        ({money(mounting)} mounting + {money(stones)} stones + {money(sharedCosts)} shared) × {markup} = {money(retail)}
      </Typography>
    </Paper>
  );
}

function PricingTab({ pricing, variants, stlVolumeCm3, defaultMarkup, onChange, onVariantChange }) {
  const [metalCosts, setMetalCosts] = useState({});
  const [loadingCosts, setLoadingCosts] = useState(false);
  const hasVolume = Number(stlVolumeCm3) > 0;
  const metalsKey = [...new Set(variants.map((v) => v.metalKey).filter(Boolean))].sort().join(',');

  useEffect(() => {
    if (!hasVolume || !metalsKey) { setMetalCosts({}); return undefined; }
    let cancelled = false;
    setLoadingCosts(true);
    (async () => {
      const out = {};
      for (const metalKey of metalsKey.split(',')) {
        try {
          const res = await fetch('/api/production/designs/estimate', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stlVolumeCm3: Number(stlVolumeCm3), metalKey }),
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok) out[metalKey] = Number(data.estimate?.metal?.metalCost) || 0;
        } catch { /* ignore per-metal failures */ }
      }
      if (!cancelled) { setMetalCosts(out); setLoadingCosts(false); }
    })();
    return () => { cancelled = true; };
  }, [hasVolume, metalsKey, stlVolumeCm3]);

  const set = (k, v) => onChange({ ...pricing, [k]: v });
  const sharedCosts = sumLines(pricing.laborTasks) + sumLines(pricing.shipping) + sumLines(pricing.designFees);
  const baseMarkup = Number(pricing.markup) > 0 ? Number(pricing.markup) : defaultMarkup;

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 0, md: 3 }} alignItems="flex-start">
      {/* Shared recipe */}
      <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
        <Paper sx={panelSx}>
          <PanelTitle>Shared costs</PanelTitle>
          <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, display: 'block', mb: 2 }}>
            These cascade to every variant. Change one and all variant prices update.
          </Typography>
          <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textSecondary, fontSize: '0.8rem', mb: 0.5 }}>Labor tasks</Typography>
          <PriceLineEditor rows={pricing.laborTasks} onChange={(rows) => set('laborTasks', rows)} withQty addLabel="Add task" emptyText="No labor tasks." />
          <Box sx={{ borderTop: `1px solid ${REPAIRS_UI.border}`, my: 2 }} />
          <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textSecondary, fontSize: '0.8rem', mb: 0.5 }}>Shipping</Typography>
          <PriceLineEditor rows={pricing.shipping} onChange={(rows) => set('shipping', rows)} addLabel="Add shipping" emptyText="No shipping costs." />
          <Box sx={{ borderTop: `1px solid ${REPAIRS_UI.border}`, my: 2 }} />
          <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textSecondary, fontSize: '0.8rem', mb: 0.5 }}>Design fees</Typography>
          <PriceLineEditor rows={pricing.designFees} onChange={(rows) => set('designFees', rows)} addLabel="Add fee" emptyText="No design fees." />
          <Box sx={{ borderTop: `1px solid ${REPAIRS_UI.border}`, my: 2 }} />
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <TextField size="small" label="COG markup" type="number" value={pricing.markup} onChange={(e) => set('markup', e.target.value)} placeholder={String(defaultMarkup)} InputProps={{ startAdornment: <InputAdornment position="start">×</InputAdornment> }} helperText={`Blank = default (×${defaultMarkup})`} sx={{ width: 200 }} />
            <Box sx={{ textAlign: 'right' }}>
              <Typography sx={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: REPAIRS_UI.textSecondary }}>Shared subtotal</Typography>
              <Typography sx={{ fontWeight: 700, color: REPAIRS_UI.textHeader }}>{money(sharedCosts)}</Typography>
            </Box>
          </Stack>
        </Paper>
      </Box>

      {/* Live per-variant retail */}
      <Box sx={{ width: { xs: '100%', md: 380 }, flexShrink: 0 }}>
        <Paper sx={panelSx}>
          <PanelTitle>Variant retail (live)</PanelTitle>
          {!hasVolume && (
            <Typography variant="caption" sx={{ color: '#FFB74D', display: 'block', mb: 1.5 }}>
              Upload an STL on the CAD &amp; 3D tab to price the mounting from metal.
            </Typography>
          )}
          {variants.length === 0 ? (
            <Typography sx={{ color: REPAIRS_UI.textMuted, fontSize: '0.85rem', py: 1 }}>Add variants (on the Variants tab) to price them.</Typography>
          ) : variants.map((v, i) => (
            <VariantPriceCard
              key={v.variantId || i}
              variant={v}
              mounting={metalCosts[v.metalKey] || 0}
              sharedCosts={sharedCosts}
              baseMarkup={baseMarkup}
              hasVolume={hasVolume}
              loading={loadingCosts}
              onChange={(patch) => onVariantChange(i, patch)}
            />
          ))}
          <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, display: 'block', mt: 1 }}>
            Retail is calculated live from today’s metal rates — never stored. The storefront recomputes the same way.
          </Typography>
        </Paper>
      </Box>
    </Stack>
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
  const [defaultMarkup, setDefaultMarkup] = useState(2.5);
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
    fetch('/api/admin/settings').then((r) => (r.ok ? r.json() : null)).then((s) => {
      const m = Number(s?.financial?.cogMarkup ?? s?.data?.financial?.cogMarkup);
      if (m > 0) setDefaultMarkup(m);
    }).catch(() => {});
  }, [load]);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setPricing = (v) => setForm((f) => ({ ...f, pricing: v }));
  const addVariant = () => setForm((f) => ({ ...f, variants: [...f.variants, newVariantForm()] }));
  const updateVariant = (i, patch) => setForm((f) => ({ ...f, variants: f.variants.map((v, idx) => (idx === i ? { ...v, ...patch } : v)) }));
  const removeVariant = (i) => setForm((f) => ({ ...f, variants: f.variants.filter((_, idx) => idx !== i) }));

  const dirty = useMemo(() => {
    if (!design || !form) return false;
    return JSON.stringify(form) !== JSON.stringify(toForm(design));
  }, [design, form]);

  const discard = () => setForm(toForm(design));

  const save = async () => {
    if (!form.name.trim()) { notify('Name is required.', 'error'); return; }
    if (!form.primaryArtisanId) { notify('A primary artisan is required.', 'error'); return; }
    for (const v of form.variants) {
      if (!v.sku.trim()) { notify('Every variant needs a SKU.', 'error'); return; }
      if (form.category === 'ring' && !v.ringSize.trim()) { notify('Ring variants need a nominal ring size.', 'error'); return; }
    }
    const skus = form.variants.map((v) => v.sku.trim());
    if (new Set(skus).size !== skus.length) { notify('Variant SKUs must be unique.', 'error'); return; }
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
        pricing: {
          markup: form.pricing.markup ? Number(form.pricing.markup) : null,
          laborTasks: form.pricing.laborTasks.map((t) => ({ description: t.description || '', quantity: Number(t.quantity) || 1, cost: Number(t.cost) || 0 })),
          shipping: form.pricing.shipping.map((s) => ({ description: s.description || '', cost: Number(s.cost) || 0 })),
          designFees: form.pricing.designFees.map((f) => ({ description: f.description || '', cost: Number(f.cost) || 0 })),
        },
        variants: form.variants.map((v) => ({
          variantId: v.variantId,
          sku: v.sku.trim(),
          ...(v.label.trim() ? { label: v.label.trim() } : {}),
          active: !!v.active,
          metalKey: v.metalKey || null,
          ...(form.category === 'ring'
            ? { ringSize: v.ringSize.trim() || null, ...((v.sizingMin || v.sizingMax) ? { sizingAllowance: { min: v.sizingMin, max: v.sizingMax } } : {}) }
            : {}),
          pricing: { retailPrice: v.retailPrice ? Number(v.retailPrice) : null },
          leadTimeDays: v.leadTimeDays ? Number(v.leadTimeDays) : null,
          viewer: { customizable: !!v.customizable },
          stonesCost: v.stonesCost ? Number(v.stonesCost) : 0,
          markupOverride: v.markupOverride ? Number(v.markupOverride) : null,
        })),
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
        <Tab label="Pricing" />
      </Tabs>

      {tab === 0 && <DetailsTab form={form} setField={setField} artisans={artisans} />}
      {tab === 1 && <CadTab design={design} dropId={dropId} designId={designId} onReload={load} notify={notify} />}
      {tab === 2 && (
        <VariantsTab
          variants={form.variants}
          category={form.category}
          hasGlb={!!design.designModel?.glbUrl}
          onAdd={addVariant}
          onUpdate={updateVariant}
          onRemove={removeVariant}
        />
      )}
      {tab === 3 && (
        <PricingTab
          pricing={form.pricing}
          variants={form.variants}
          stlVolumeCm3={design.stlVolumeCm3}
          defaultMarkup={defaultMarkup}
          onChange={setPricing}
          onVariantChange={updateVariant}
        />
      )}

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={closeSnack} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={closeSnack} severity={snack.severity} sx={{ backgroundColor: REPAIRS_UI.bgCard, color: REPAIRS_UI.textPrimary, border: `1px solid ${REPAIRS_UI.border}` }}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}
