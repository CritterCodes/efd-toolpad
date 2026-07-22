'use client';

import React, { useEffect, useState, useCallback, useMemo, use } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Button, Chip, Stack, Paper, CircularProgress, IconButton,
  TextField, FormControl, InputLabel, Select, MenuItem, Autocomplete, Snackbar, Alert, InputAdornment,
  Switch, FormControlLabel, Dialog, DialogTitle, DialogContent, DialogActions, Divider, Tooltip,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DesignServicesIcon from '@mui/icons-material/DesignServices';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import EditIcon from '@mui/icons-material/Edit';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';

import { REPAIRS_UI, repairsMenuProps } from '@/app/dashboard/repairs/components/repairsUi';
import { getSTLVolume } from '@/lib/stlParser';
import { KARAT_OPTIONS, finishUsesKarat, finishLabel, composeMetalKey } from '@/services/production/variantMetal';

// Read-only WebGL product viewer (client-only — must be dynamically imported, ssr:false).
const JewelryViewer = dynamic(() => import('@crittercodes/refrakt').then((m) => m.JewelryViewer), { ssr: false });

const DESIGN_STATUSES = ['draft', 'cad_requested', 'cad_in_progress', 'cad_qc', 'ready', 'retired'];
const PRODUCTION_METHODS = ['cad_cast', 'handmade'];
const EDITION_TYPES = [
  { value: 'one_of_one', label: 'One of One' },
  { value: 'limited', label: 'Limited Release' },
  { value: 'unlimited', label: 'No Limit (unlimited)' },
];
const CATEGORIES = ['ring', 'necklace', 'bracelet', 'earrings', 'pendant', 'brooch', 'other'];

const DISCIPLINE_OPTS = [
  { value: 'bench_jewelry', label: 'Bench' }, { value: 'cad', label: 'CAD' },
  { value: 'engraving', label: 'Engraving' }, { value: 'gem_cutting', label: 'Gem Cutting' },
];
// Map a task-catalog category to a bench discipline (mirrors the customs quote builder).
function categoryToDiscipline(category = '') {
  const c = String(category).toLowerCase();
  if (/cad|design/.test(c)) return 'cad';
  if (/engrav/.test(c)) return 'engraving';
  if (/gem|cut|lapidar|ston.*cut/.test(c)) return 'gem_cutting';
  return 'bench_jewelry';
}

let variantSeq = 0;
function newVariantForm() {
  variantSeq += 1;
  return {
    variantId: `v-${Date.now().toString(36)}-${variantSeq}`,
    sku: '', label: '',
    // Finish comes from REFRAKT (studio-driven); karat is a separate spec; metalKey is
    // composed from both for the pricing estimate engine.
    finish: 'gold', karat: '14', metalKey: composeMetalKey('gold', '14'), viewerConfig: null,
    ringSize: '', sizingMin: '', sizingMax: '',
    gemstones: [], // [{ slot, role, qty, stoneSkuId, stullerSku, label, unitCost, source }]
    retailPrice: '', leadTimeDays: '', active: true,
    // Gemstone-design variants: a SPECIES the cut is offered in (capability, not inventory).
    // colors = quality buckets, each with size-TIERED $/ct (rates non-linear in size).
    gem: { species: '', availability: 'purchase', caratMin: '', caratMax: '', creation: 'natural', clarity: '', treatment: '', cutLaborCost: '', lotQty: '', colors: [] },
  };
}
// Resolve a color bucket's $/ct for a carat: first tier whose upToCt covers it; else the last tier.
function tierRate(rates = [], carat) {
  const tiers = rates.map((t) => ({ upToCt: Number(t.upToCt) || 0, ratePerCarat: Number(t.ratePerCarat) || 0 })).filter((t) => t.upToCt > 0).sort((a, b) => a.upToCt - b.upToCt);
  if (!tiers.length) return 0;
  const c = Number(carat) || 0;
  return (tiers.find((t) => c <= t.upToCt) || tiers[tiers.length - 1]).ratePerCarat;
}

const STATUS_COLOR = {
  draft: REPAIRS_UI.textMuted, cad_requested: '#FFB74D', cad_in_progress: '#64B5F6',
  cad_qc: '#FFB74D', ready: '#66BB6A', retired: REPAIRS_UI.textMuted,
};

// How the artisan/admin applies the design fee to each piece's cost recipe.
const DESIGN_FEE_MODES = [
  { value: 'flat', label: 'Full fee per piece' },
  { value: 'split', label: 'Split across the edition' },
  { value: 'waived', label: 'Waived' },
];
// The per-piece design fee that cascades into shared costs. `split` divides the fee across
// a limited edition's run; unlimited editions can only be flat (custom amount) or waived.
function effectiveDesignFee(fee, artisanFee, editionType, editionLimit) {
  const mode = fee?.mode || 'flat';
  if (mode === 'waived') return 0;
  const base = fee?.amount != null && fee.amount !== '' ? Number(fee.amount) : (Number(artisanFee) || 0);
  if (mode === 'split' && editionType === 'limited') {
    const n = Number(editionLimit) || 1;
    return n > 0 ? base / n : base;
  }
  return base;
}

const panelSx = { p: { xs: 2, md: 2.5 }, mb: 2, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' };
const cap = (s) => String(s || '').replace(/_/g, ' ');
const money = (x) => `$${(Number(x) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const sumLines = (arr) => (arr || []).reduce((s, r) => s + (Number(r.cost) || 0) * (Number(r.quantity) || 1), 0);
// A stone row's unit cost. SKU-linked rows read the CURRENT catalog (Stuller wholesale,
// kept fresh by the cron) so pricing stays live like metal; manual rows use their own cost.
const stoneUnit = (r, stoneCosts = {}) => (r?.stoneSkuId && stoneCosts[r.stoneSkuId] != null ? Number(stoneCosts[r.stoneSkuId]) : Number(r?.unitCost) || 0);
// Per-variant stone cost = Σ(unit × qty). Accents are priced per-stone × quantity.
const sumStones = (arr, stoneCosts = {}) => (arr || []).reduce((s, r) => s + stoneUnit(r, stoneCosts) * (Number(r.qty) || 1), 0);
// Physical size label from measured mm — one number for round/square, L×W for fancy.
const stoneSizeLabel = ({ l, w } = {}) => {
  if (l == null || w == null) return '';
  return Math.abs(l - w) < 0.26 ? `${w}mm` : `${l}×${w}mm`;
};
const GEM_ROLES = [{ value: 'center', label: 'Center' }, { value: 'accent', label: 'Accent' }];
// Stone creation is PER STONE (a variant/piece can mix natural + lab) — binary, no simulant.
const CREATION_OPTS = [{ value: 'natural', label: 'Natural' }, { value: 'lab', label: 'Lab' }];

// Stone-setting labor is inferred from carat band × count (gem type is irrelevant). Labels
// match the task catalog; `fallback` is used if the catalog lookup misses.
const SETTING_BANDS = [
  { key: '1plus', min: 1, label: 'Set Stone 1ct or larger', fallback: 40 },
  { key: 'mid', min: 0.5, label: 'Set Stone 0.5ct to 0.99ct', fallback: 20 },
  { key: 'small', min: 0.0001, label: 'Set Stone less than 0.49ct', fallback: 10 },
];
const caratBand = (ct) => { const c = Number(ct) || 0; return SETTING_BANDS.find((b) => c >= b.min) || null; };
const sumLaborLines = (lines) => (lines || []).reduce((s, l) => s + (Number(l.cost) || 0) * (Number(l.qty) || 1), 0);

// Per-piece labor inferred automatically: casting defaults (by production method) +
// stone-setting tasks tallied by carat band × count. taskCosts overrides the fallbacks.
function autoLaborLines(variant, productionMethod, taskCosts = {}) {
  const lines = [];
  if (productionMethod === 'cad_cast') {
    lines.push({ key: 'cleanup', label: 'Clean up Casting', qty: 1, cost: taskCosts['Clean up Casting'] ?? 40, auto: 'casting' });
  }
  const tally = new Map();
  for (const g of (variant.gemstones || [])) {
    const band = caratBand(g.caratEach);
    if (!band) continue;
    const cur = tally.get(band.key) || { key: band.key, label: band.label, qty: 0, cost: taskCosts[band.label] ?? band.fallback, auto: 'setting' };
    cur.qty += Number(g.qty) || 1;
    tally.set(band.key, cur);
  }
  for (const l of tally.values()) lines.push(l);
  return lines;
}
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
    // Gemstone designs: the CUT is the design — shape(s) + cutting technique live here; the
    // material spec (species/carat/color/…) is per-variant, like metal on jewelry.
    gemCut: (d.gemstone?.cut || []).join(', '),
    gemCutStyle: (d.gemstone?.cutStyle || []).join(', '),
    // Customization is a DESIGN-level capability (shoppers open REFRAKT and customize the
    // design's model), not a per-variant flag.
    customizable: Boolean(d.customizable),
    // Pricing recipe — SHARED across variants; cascades. Retail is computed live from
    // market metal rates, never stored, so we only persist these inputs.
    pricing: {
      markup: d.pricing?.markup != null && d.pricing.markup !== '' ? String(d.pricing.markup) : '',
      laborTasks: (d.pricing?.laborTasks || []).map((t) => ({ description: t.description || '', quantity: t.quantity != null ? String(t.quantity) : '1', hours: t.hours != null ? String(t.hours) : '', discipline: t.discipline || 'bench_jewelry', cost: t.cost != null ? String(t.cost) : '' })),
      shipping: (d.pricing?.shipping || []).map((s) => ({ description: s.description || '', cost: s.cost != null ? String(s.cost) : '' })),
      // Design-fee policy: how the artisan's fee is applied per piece (flat/split/waived)
      // + an optional custom amount (blank = the artisan's profile fee).
      designFee: {
        mode: d.pricing?.designFee?.mode || 'flat',
        amount: d.pricing?.designFee?.amount != null && d.pricing.designFee.amount !== '' ? String(d.pricing.designFee.amount) : '',
      },
    },
    variants: (Array.isArray(d.variants) ? d.variants : []).map((v) => {
      const finish = v.finish || 'gold';
      const karat = v.karat != null ? String(v.karat) : '14';
      return {
      variantId: v.variantId || '',
      sku: v.sku || '',
      label: v.label || v.title || '',
      finish,
      karat,
      // metalKey is always derived from finish+karat (kept only for the pricing estimate).
      metalKey: composeMetalKey(finish, karat),
      viewerConfig: v.viewerConfig || null,
      ringSize: v.ringSize != null ? String(v.ringSize) : '',
      sizingMin: v.sizingAllowance?.min != null ? String(v.sizingAllowance.min) : '',
      sizingMax: v.sizingAllowance?.max != null ? String(v.sizingAllowance.max) : '',
      retailPrice: v.pricing?.retailPrice != null ? String(v.pricing.retailPrice) : '',
      leadTimeDays: v.leadTimeDays != null ? String(v.leadTimeDays) : '',
      active: v.active !== false,
      // The variant "owns" its stones (center + accents) and an optional markup override.
      // Each stone row links a catalog gemstone; cost = unitCost × qty (per-stone).
      gemstones: (v.gemstones || []).map((g) => ({
        slot: g.slot || '',
        role: g.role || 'accent',
        qty: g.qty != null ? String(g.qty) : '1',
        stoneSkuId: g.stoneSkuId || '',
        stullerSku: g.stullerSku || '',
        label: g.label || '',
        unitCost: g.unitCost != null ? String(g.unitCost) : '',
        caratEach: g.caratEach != null ? String(g.caratEach) : '',
        sizeMm: g.sizeMm || '',
        cut: g.cut || '',
        // Per-stone creation (natural | lab) — sourcing key, defaults natural.
        creation: g.creation || 'natural',
        // Measured geometry (from REFRAKT) — kept so auto-match/Stuller search stays precise on reload.
        preset: g.preset || g.gemType || '',
        lengthMm: g.lengthMm != null ? String(g.lengthMm) : '',
        widthMm: g.widthMm != null ? String(g.widthMm) : '',
        source: g.source || '',
      })),
      markupOverride: v.markupOverride != null && v.markupOverride !== '' ? String(v.markupOverride) : '',
      // Gemstone-design variants: a SPECIES offering — availability toggle, carat range guard,
      // color quality-buckets with size-tiered $/ct. No fixed carat, no typed dimensions.
      gem: {
        species: v.gemstone?.species || '',
        availability: v.gemstone?.availability === 'special_request' ? 'special_request' : 'purchase',
        caratMin: v.gemstone?.caratMin != null ? String(v.gemstone.caratMin) : '',
        caratMax: v.gemstone?.caratMax != null ? String(v.gemstone.caratMax) : '',
        creation: v.gemstone?.naturalSynthetic === 'lab' ? 'lab' : 'natural',
        clarity: v.gemstone?.clarity || '',
        treatment: Array.isArray(v.gemstone?.treatment) ? v.gemstone.treatment.join(', ') : (v.gemstone?.treatment || ''),
        cutLaborCost: v.gemstone?.cutLaborCost != null ? String(v.gemstone.cutLaborCost) : '',
        lotQty: v.gemstone?.lotQty != null ? String(v.gemstone.lotQty) : '',
        colors: (v.gemstone?.colors || []).map((c) => ({
          label: c.label || '',
          rates: (c.rates || []).map((t) => ({ upToCt: t.upToCt != null ? String(t.upToCt) : '', ratePerCarat: t.ratePerCarat != null ? String(t.ratePerCarat) : '' })),
        })),
      },
      };
    }),
  };
}
// Comma-string → trimmed array (gem cut/color/treatment lists are edited as CSV text).
const csvArr = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean);

function DetailsTab({ form, setField, artisans }) {
  const isGem = form.category === 'gemstone';
  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 0, md: 3 }} alignItems="flex-start">
      {/* Main column */}
      <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
        <Paper sx={panelSx}>
          <PanelTitle>Details</PanelTitle>
          <Stack spacing={2}>
            <TextField label="Name" value={form.name} onChange={(e) => setField('name', e.target.value)} size="small" fullWidth required />
            <TextField label="Description" value={form.description} onChange={(e) => setField('description', e.target.value)} size="small" fullWidth multiline minRows={4} />
            {/* Jewelry categories (ring/necklace/…) never apply to a gemstone design. */}
            {!isGem && (
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
            )}
            {/* Gemstone: the CUT is the design — shape + cutting technique. Material (species/
                carat/color…) lives per variant, like metal on jewelry. */}
            {isGem && (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField label="Cut(s)" value={form.gemCut} onChange={(e) => setField('gemCut', e.target.value)} size="small" sx={{ flex: 1 }}
                  placeholder="cushion, portuguese round…" helperText="comma-separated" FormHelperTextProps={{ sx: { mx: 0, fontSize: '0.62rem' } }} />
                <TextField label="Cutting technique" value={form.gemCutStyle} onChange={(e) => setField('gemCutStyle', e.target.value)} size="small" sx={{ flex: 1 }}
                  placeholder="brilliant, step, fantasy…" helperText="comma-separated" FormHelperTextProps={{ sx: { mx: 0, fontSize: '0.62rem' } }} />
              </Stack>
            )}
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

function CadTab({ design, designId, onReload, notify, onCreateFirstVariant, form, setField }) {
  const [busyStl, setBusyStl] = useState(false);
  const [busyGlb, setBusyGlb] = useState(false);
  const dm = design.designModel || {};
  const glbUrl = dm.glbUrl || null;
  // The preview shows the FIRST variant's look — that first variant is the design's
  // default. Materials live on variants (built in REFRAKT), so there's nothing to preview
  // until a variant has been configured.
  const firstConfigured = (design.variants || []).find((v) => v.viewerConfig);

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
          <CadUploadRow label="GLB" accept=".glb" hint="The 3D mesh every variant renders — build each look on the Variants tab." done={!!glbUrl} uploading={busyGlb} onPick={onGlb} />
        </Paper>
      </Box>

      <Box sx={{ width: { xs: '100%', md: 420 }, flexShrink: 0 }}>
        <Paper sx={panelSx}>
          <PanelTitle>3D preview</PanelTitle>
          {firstConfigured ? (
            <>
              <Box sx={{ height: 360, borderRadius: 2, overflow: 'hidden', border: `1px solid ${REPAIRS_UI.border}` }}>
                <JewelryViewer glbUrl={glbUrl} config={firstConfigured.viewerConfig} style={{ width: '100%', height: '100%' }} />
              </Box>
              <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, display: 'block', mt: 1 }}>
                Drag to orbit · scroll to zoom. Showing the default (first) variant — build every look on the Variants tab.
              </Typography>
            </>
          ) : (
            <Box sx={{ minHeight: 360, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1.5, backgroundColor: REPAIRS_UI.bgTertiary, border: `1px dashed ${REPAIRS_UI.border}`, borderRadius: 2, p: 3, textAlign: 'center' }}>
              <ViewInArIcon sx={{ fontSize: 40, color: REPAIRS_UI.textMuted }} />
              {!glbUrl ? (
                <Typography variant="body2" sx={{ color: REPAIRS_UI.textMuted }}>
                  Upload a GLB, then build your first variant in REFRAKT to set the default look.
                </Typography>
              ) : (
                <>
                  <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>
                    No variant yet. Build your first one in REFRAKT — it becomes this design’s default look.
                  </Typography>
                  <Button variant="contained" startIcon={<ViewInArIcon sx={{ fontSize: 16 }} />} onClick={onCreateFirstVariant}
                    sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, textTransform: 'none', '&:hover': { backgroundColor: '#C19B2E' } }}>
                    Create first variant
                  </Button>
                </>
              )}
            </Box>
          )}
        </Paper>

        {/* Customization is a DESIGN-level capability (not per-variant): can shoppers open
            REFRAKT and customize this design's model? Runs on the GLB above. */}
        <Paper sx={panelSx}>
          <PanelTitle>Customization</PanelTitle>
          <FormControlLabel
            control={<Switch checked={!!form?.customizable} disabled={!glbUrl} onChange={(e) => setField('customizable', e.target.checked)} sx={{ '& .Mui-checked': { color: REPAIRS_UI.accent }, '& .Mui-checked + .MuiSwitch-track': { backgroundColor: REPAIRS_UI.accent } }} />}
            label={<Typography sx={{ color: REPAIRS_UI.textPrimary, fontWeight: 600, fontSize: '0.9rem' }}>Allow customization in REFRAKT</Typography>}
          />
          <Typography variant="caption" sx={{ color: glbUrl ? REPAIRS_UI.textMuted : '#FFB74D', display: 'block', mt: 0.5 }}>
            {glbUrl
              ? 'Shoppers open REFRAKT and customize this design (finish, gems) starting from its default look — every customized order is made-to-order.'
              : 'Upload a GLB to enable the customizer.'}
          </Typography>
        </Paper>
      </Box>
    </Stack>
  );
}

/** Color quality-buckets for a gem species, each with size-TIERED $/ct — $/ct is not linear in
 *  size (a 4ct clean stone costs far more per carat than a 1ct), so each bucket is a small tier
 *  table: "up to X ct → $Y/ct". Label buckets with quality baked in ("chrome red AAA"). */
function GemColorRates({ colors, onChange }) {
  const setColor = (i, patch) => onChange(colors.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const removeColor = (i) => onChange(colors.filter((_, idx) => idx !== i));
  const addColor = () => onChange([...colors, { label: '', rates: [{ upToCt: '', ratePerCarat: '' }] }]);
  const setTier = (ci, ti, patch) => setColor(ci, { rates: colors[ci].rates.map((t, idx) => (idx === ti ? { ...t, ...patch } : t)) });
  const removeTier = (ci, ti) => setColor(ci, { rates: colors[ci].rates.filter((_, idx) => idx !== ti) });
  const addTier = (ci) => setColor(ci, { rates: [...(colors[ci].rates || []), { upToCt: '', ratePerCarat: '' }] });
  return (
    <Box>
      <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textSecondary, fontSize: '0.72rem', mb: 0.75 }}>Colors &amp; rates ($/ct by size — quality in the label)</Typography>
      {colors.length === 0 && (
        <Typography variant="body2" sx={{ color: '#FFB74D', mb: 0.5 }}>Add at least one color bucket — it carries the price.</Typography>
      )}
      <Stack spacing={1}>
        {colors.map((c, ci) => (
          <Box key={ci} sx={{ p: 1, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
              <TextField size="small" label="Color / quality" value={c.label || ''} onChange={(e) => setColor(ci, { label: e.target.value })} sx={{ flex: 1 }} placeholder="chrome red AAA" />
              <IconButton size="small" onClick={() => removeColor(ci)} sx={{ color: REPAIRS_UI.textMuted }}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton>
            </Stack>
            <Stack spacing={0.75}>
              {(c.rates || []).map((t, ti) => (
                <Stack key={ti} direction="row" spacing={1} alignItems="center">
                  <TextField size="small" label="Up to ct" type="number" value={t.upToCt ?? ''} onChange={(e) => setTier(ci, ti, { upToCt: e.target.value })} sx={{ width: 100 }} inputProps={{ step: 0.5, min: 0 }} />
                  <TextField size="small" label="$/ct" type="number" value={t.ratePerCarat ?? ''} onChange={(e) => setTier(ci, ti, { ratePerCarat: e.target.value })} sx={{ width: 110 }}
                    InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
                  <IconButton size="small" onClick={() => removeTier(ci, ti)} sx={{ color: REPAIRS_UI.textMuted }} disabled={(c.rates || []).length <= 1}><DeleteIcon sx={{ fontSize: 14 }} /></IconButton>
                </Stack>
              ))}
              <Button size="small" startIcon={<AddIcon sx={{ fontSize: 14 }} />} onClick={() => addTier(ci)} sx={{ color: REPAIRS_UI.accent, alignSelf: 'flex-start', textTransform: 'none', py: 0 }}>Add size tier</Button>
            </Stack>
          </Box>
        ))}
      </Stack>
      <Button size="small" startIcon={<AddIcon sx={{ fontSize: 16 }} />} onClick={addColor} sx={{ color: REPAIRS_UI.accent, mt: 0.75, textTransform: 'none' }}>Add color</Button>
    </Box>
  );
}

function VariantRow({ index, variant, isRing, isGem, hasGlb, stoneCosts, onUpdate, onRemove, onConfigure }) {
  const set = (k, v) => onUpdate(index, { [k]: v });
  const gem = variant.gem || {};
  const setGem = (patch) => set('gem', { ...gem, ...patch });
  const configured = !!variant.viewerConfig;
  const usesKarat = finishUsesKarat(variant.finish);
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
        {/* Look = built in REFRAKT (finish comes from the config); karat is a separate spec. */}
        <Box sx={{ p: 1.5, backgroundColor: REPAIRS_UI.bgCard, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 1.5 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.5} flexWrap="wrap" useFlexGap>
            <Box>
              <Typography sx={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: REPAIRS_UI.textSecondary }}>{isGem ? 'Look (from REFRAKT)' : 'Finish (from REFRAKT)'}</Typography>
              <Typography sx={{ fontWeight: 600, color: configured ? REPAIRS_UI.textHeader : REPAIRS_UI.textMuted }}>
                {configured ? (isGem ? 'Configured' : finishLabel(variant.finish)) : 'Not configured yet'}
              </Typography>
            </Box>
            <Button
              size="small"
              variant={configured ? 'text' : 'contained'}
              startIcon={<ViewInArIcon sx={{ fontSize: 16 }} />}
              onClick={() => onConfigure(index)}
              disabled={!hasGlb}
              sx={configured
                ? { color: REPAIRS_UI.accent, textTransform: 'none' }
                : { backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, textTransform: 'none', '&:hover': { backgroundColor: '#C19B2E' } }}
            >
              {configured ? 'Edit look in REFRAKT' : 'Configure look in REFRAKT'}
            </Button>
          </Stack>
          {!hasGlb && (
            <Typography variant="caption" sx={{ color: '#FFB74D', display: 'block', mt: 0.75 }}>
              Upload a GLB on the CAD &amp; 3D tab first — variant looks are built in REFRAKT.
            </Typography>
          )}
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          {!isGem && (
            <FormControl size="small" sx={{ flex: 1 }} disabled={!usesKarat}>
              <InputLabel>Karat</InputLabel>
              <Select value={usesKarat ? variant.karat : ''} label="Karat" onChange={(e) => set('karat', e.target.value)} MenuProps={repairsMenuProps}>
                {usesKarat
                  ? KARAT_OPTIONS.map((k) => <MenuItem key={k} value={k}>{k}K</MenuItem>)
                  : <MenuItem value="">N/A</MenuItem>}
              </Select>
            </FormControl>
          )}
          <TextField label="Lead time (days)" type="number" value={variant.leadTimeDays} onChange={(e) => set('leadTimeDays', e.target.value)} size="small" sx={{ flex: 1 }} />
        </Stack>
        {isRing && (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField label="Nominal ring size" value={variant.ringSize} onChange={(e) => set('ringSize', e.target.value)} size="small" sx={{ flex: 1 }} required error={!variant.ringSize.trim()} helperText="e.g. 7" />
            <TextField label="Size range min" value={variant.sizingMin} onChange={(e) => set('sizingMin', e.target.value)} size="small" sx={{ flex: 1 }} helperText="resizable low" />
            <TextField label="Size range max" value={variant.sizingMax} onChange={(e) => set('sizingMax', e.target.value)} size="small" sx={{ flex: 1 }} helperText="resizable high" />
          </Stack>
        )}
        {/* Gemstone variant = a SPECIES this cut is offered in (capability, not inventory): buy-vs-
            request toggle, carat range guard, color quality-buckets with size-tiered $/ct. The cut
            itself (shape/technique) is a design detail on the Details tab; dimensions derive from
            the GLB + carat (via species SG), never typed. */}
        {isGem && (
          <Box sx={{ p: 1.5, backgroundColor: REPAIRS_UI.bgCard, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 1.5 }}>
            <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textSecondary, fontSize: '0.8rem', mb: 1 }}>Species offering</Typography>
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                <TextField label="Species" value={gem.species || ''} onChange={(e) => setGem({ species: e.target.value })} size="small" sx={{ flex: 1, minWidth: 150 }} required error={!String(gem.species || '').trim()} placeholder="Garnet, Sapphire…" />
                <FormControl size="small" sx={{ width: 168 }}>
                  <InputLabel>Availability</InputLabel>
                  <Select value={gem.availability || 'purchase'} label="Availability" onChange={(e) => setGem({ availability: e.target.value })} MenuProps={repairsMenuProps}>
                    <MenuItem value="purchase">Purchase (buy now)</MenuItem>
                    <MenuItem value="special_request">Special request</MenuItem>
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ width: 110 }}>
                  <InputLabel>Origin</InputLabel>
                  <Select value={gem.creation || 'natural'} label="Origin" onChange={(e) => setGem({ creation: e.target.value })} MenuProps={repairsMenuProps}>
                    {CREATION_OPTS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                  </Select>
                </FormControl>
              </Stack>
              <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                <TextField label="Carat min" type="number" value={gem.caratMin || ''} onChange={(e) => setGem({ caratMin: e.target.value })} size="small" sx={{ width: 100 }} inputProps={{ step: 0.1, min: 0 }}
                  helperText="cuttable range" FormHelperTextProps={{ sx: { mx: 0, fontSize: '0.6rem' } }} />
                <TextField label="Carat max" type="number" value={gem.caratMax || ''} onChange={(e) => setGem({ caratMax: e.target.value })} size="small" sx={{ width: 100 }} inputProps={{ step: 0.1, min: 0 }}
                  error={Number(gem.caratMax) > 0 && Number(gem.caratMin) > Number(gem.caratMax)} />
                <TextField label="Treatment" value={gem.treatment || ''} onChange={(e) => setGem({ treatment: e.target.value })} size="small" sx={{ flex: 1, minWidth: 120 }} placeholder="unheated…"
                  helperText="different treatment = its own variant; shown on the listing" FormHelperTextProps={{ sx: { mx: 0, fontSize: '0.6rem' } }} />
                <TextField label="Clarity" value={gem.clarity || ''} onChange={(e) => setGem({ clarity: e.target.value })} size="small" sx={{ width: 100 }} />
                <TextField label="Lot qty" type="number" value={gem.lotQty ?? ''} onChange={(e) => setGem({ lotQty: e.target.value })} size="small" sx={{ width: 92 }} inputProps={{ min: 0 }}
                  helperText="special rough only" FormHelperTextProps={{ sx: { mx: 0, fontSize: '0.6rem' } }} />
              </Stack>
              <GemColorRates colors={gem.colors || []} onChange={(colors) => setGem({ colors })} />
            </Stack>
          </Box>
        )}
        {/* Stone rows apply to JEWELRY consuming stones — a gemstone design IS the stone. */}
        {!isGem && <VariantStones gemstones={variant.gemstones} viewerConfig={variant.viewerConfig} stoneCosts={stoneCosts} onChange={(rows) => set('gemstones', rows)} />}
      </Stack>
    </Paper>
  );
}

// Summary card in the variants grid — click to open the variant's full editor.
function VariantCard({ index, variant, isRing, isGem, stoneCosts, onOpen }) {
  const configured = !!variant.viewerConfig;
  const gemRange = variant.gem?.caratMin || variant.gem?.caratMax
    ? `${variant.gem?.caratMin || '?'}–${variant.gem?.caratMax || '?'}ct` : null;
  const metal = isGem
    ? ([variant.gem?.species, gemRange, variant.gem?.creation === 'lab' ? 'lab' : null, variant.gem?.treatment || null].filter(Boolean).join(' · ') || 'Species not specified')
    : configured
      ? [finishUsesKarat(variant.finish) ? `${variant.karat}K` : null, finishLabel(variant.finish)].filter(Boolean).join(' ')
      : 'Look not configured';
  const stones = sumStones(variant.gemstones, stoneCosts);
  const stoneCount = (variant.gemstones || []).reduce((n, g) => n + (Number(g.qty) || 1), 0);
  const title = variant.label?.trim() || variant.sku?.trim() || `Variant ${index + 1}`;
  return (
    <Paper onClick={onOpen}
      sx={{ p: 2, cursor: 'pointer', backgroundColor: REPAIRS_UI.bgTertiary, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none', transition: 'border-color .15s', '&:hover': { borderColor: REPAIRS_UI.accent } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</Typography>
          {variant.sku?.trim() && variant.label?.trim() && <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>{variant.sku.trim()}</Typography>}
        </Box>
        <Chip size="small" label={variant.active ? 'Active' : 'Inactive'}
          sx={{ flexShrink: 0, backgroundColor: variant.active ? '#66BB6A22' : REPAIRS_UI.bgCard, color: variant.active ? '#66BB6A' : REPAIRS_UI.textMuted, fontWeight: 700, fontSize: '0.68rem' }} />
      </Stack>
      <Stack spacing={0.25} sx={{ mt: 1 }}>
        <Typography variant="caption" sx={{ color: (isGem ? variant.gem?.species : configured) ? REPAIRS_UI.textSecondary : '#FFB74D' }}>{metal}</Typography>
        {isRing && variant.ringSize && <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>Size {variant.ringSize}</Typography>}
        {isGem
          ? <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>
              {[variant.gem?.availability === 'special_request' ? 'special request' : 'buy now',
                Number(variant.gem?.lotQty) > 0 ? `lot of ${variant.gem.lotQty}` : null,
                (variant.gem?.colors || []).length ? `${variant.gem.colors.length} color${variant.gem.colors.length === 1 ? '' : 's'}` : 'no colors/rates'].filter(Boolean).join(' · ')}
            </Typography>
          : <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>{stoneCount ? `${stoneCount} stone${stoneCount === 1 ? '' : 's'} · ${money(stones)}` : 'No stones'}</Typography>}
      </Stack>
    </Paper>
  );
}

function VariantsTab({ variants, category, hasGlb, stoneCosts, onAdd, onUpdate, onRemove, onConfigure }) {
  const isRing = category === 'ring';
  const isGem = category === 'gemstone';
  const [selected, setSelected] = useState(null);
  // Fall back to the grid if the open variant disappears (removed) or index drifts.
  useEffect(() => { if (selected != null && selected >= variants.length) setSelected(null); }, [selected, variants.length]);

  // Detail view — the full editor for one variant, still inside the Variants tab.
  if (selected != null && variants[selected]) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => setSelected(null)} sx={{ color: REPAIRS_UI.textSecondary, mb: 1.5, textTransform: 'none' }}>All variants</Button>
        <VariantRow index={selected} variant={variants[selected]} isRing={isRing} isGem={isGem} hasGlb={hasGlb} stoneCosts={stoneCosts} onUpdate={onUpdate}
          onRemove={(i) => { onRemove(i); setSelected(null); }} onConfigure={onConfigure} />
      </Box>
    );
  }

  // Grid view — one card per variant.
  return (
    <Paper sx={panelSx}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
        <Box>
          <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader }}>Variants</Typography>
          <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>
            Each variant is one sellable configuration, its look built in REFRAKT. A sellable design needs at least one.
          </Typography>
        </Box>
        {/* A gemstone variant is a material spec (species/carat/…) — no GLB required. Jewelry
            variants are looks built in REFRAKT, so those still need the model first. */}
        <Button size="small" variant="contained" startIcon={<AddIcon sx={{ fontSize: 16 }} />} onClick={onAdd} disabled={!hasGlb && !isGem}
          sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, textTransform: 'none', flexShrink: 0, '&:hover': { backgroundColor: '#C19B2E' } }}>
          Add variant
        </Button>
      </Stack>
      {!hasGlb && !isGem && (
        <Typography variant="caption" sx={{ color: '#FFB74D', display: 'block', mb: 2 }}>
          Upload a GLB on the CAD &amp; 3D tab first — variants are built in the REFRAKT studio.
        </Typography>
      )}
      {variants.length === 0 ? (
        <Typography sx={{ color: REPAIRS_UI.textMuted, fontSize: '0.85rem', textAlign: 'center', py: 3 }}>
          {isGem ? 'No variants yet. Each variant is one stone material (species, carat, quality) this cut is offered in.' : 'No variants yet. “Add variant” opens the REFRAKT studio to build the look.'}
        </Typography>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 1.5 }}>
          {variants.map((v, i) => (
            <VariantCard key={v.variantId || i} index={i} variant={v} isRing={isRing} isGem={isGem} stoneCosts={stoneCosts} onOpen={() => setSelected(i)} />
          ))}
        </Box>
      )}
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

function VariantPriceCard({ variant, mounting, sharedCosts, baseMarkup, hasVolume, loading, stoneCosts, productionMethod, taskCosts, onChange }) {
  const stones = sumStones(variant.gemstones, stoneCosts);
  const stoneCount = (variant.gemstones || []).reduce((n, g) => n + (Number(g.qty) || 1), 0);
  const markup = Number(variant.markupOverride) > 0 ? Number(variant.markupOverride) : baseMarkup;
  // Per-piece labor inferred automatically (casting + carat-band setting × counts).
  const autoLines = autoLaborLines(variant, productionMethod, taskCosts);
  const autoLabor = sumLaborLines(autoLines);
  const cog = mounting + stones + autoLabor + sharedCosts;
  const retail = cog * markup;
  const label = variant.label?.trim() || variant.sku?.trim() || variant.variantId;
  const metal = [finishUsesKarat(variant.finish) ? `${variant.karat}K` : null, finishLabel(variant.finish)].filter(Boolean).join(' ');
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
        <Box sx={{ minWidth: 110 }}>
          <Typography sx={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: REPAIRS_UI.textSecondary }}>Stones{stoneCount ? ` (${stoneCount})` : ''}</Typography>
          <Typography sx={{ fontSize: '0.9rem', color: REPAIRS_UI.textPrimary, fontWeight: 500 }}>{money(stones)}</Typography>
        </Box>
        <Box sx={{ minWidth: 110 }}>
          <Typography sx={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: REPAIRS_UI.textSecondary }}>Labor (auto)</Typography>
          <Typography sx={{ fontSize: '0.9rem', color: REPAIRS_UI.textPrimary, fontWeight: 500 }}>{money(autoLabor)}</Typography>
        </Box>
        <Box sx={{ minWidth: 110 }}>
          <Typography sx={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: REPAIRS_UI.textSecondary }}>Shared</Typography>
          <Typography sx={{ fontSize: '0.9rem', color: REPAIRS_UI.textPrimary, fontWeight: 500 }}>{money(sharedCosts)}</Typography>
        </Box>
        <TextField size="small" label="Markup ×" type="number" value={variant.markupOverride} onChange={(e) => onChange({ markupOverride: e.target.value })} placeholder={String(baseMarkup)} sx={{ width: 110 }} helperText={variant.markupOverride ? ' ' : `default ×${baseMarkup}`} FormHelperTextProps={{ sx: { mx: 0, fontSize: '0.6rem' } }} />
      </Stack>
      {autoLines.length > 0 && (
        <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, mt: 0.75, display: 'block' }}>
          Auto labor: {autoLines.map((l) => `${l.label}${l.qty > 1 ? ` ×${l.qty}` : ''}`).join(' · ')}
        </Typography>
      )}
      <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, mt: 0.5, display: 'block' }}>
        ({money(mounting)} mounting + {money(stones)} stones + {money(autoLabor)} labor + {money(sharedCosts)} shared) × {markup} = {money(retail)}
      </Typography>
    </Paper>
  );
}

/** Gemstone variant retail (owner's recipe): carat × tiered $/ct (per color) + cut labor +
 *  shared, × markup. The customer picks the carat at order time, so the card shows each color
 *  bucket's retail RANGE across the variant's cuttable carat span. */
function GemVariantPriceCard({ variant, sharedCosts, baseMarkup, onChange }) {
  const gem = variant.gem || {};
  const setGem = (patch) => onChange({ gem: { ...gem, ...patch } });
  const cutLabor = Number(gem.cutLaborCost) || 0;
  const markup = Number(variant.markupOverride) > 0 ? Number(variant.markupOverride) : baseMarkup;
  const lo = Number(gem.caratMin) || 0;
  const hi = Number(gem.caratMax) || lo;
  const retailAt = (rates, ct) => (ct * tierRate(rates, ct) + cutLabor + sharedCosts) * markup;
  const label = variant.label?.trim() || variant.sku?.trim() || variant.variantId;
  const colors = (gem.colors || []).filter((c) => String(c.label || '').trim());
  const stone = [gem.species, lo || hi ? `${lo}–${hi}ct` : null, gem.creation === 'lab' ? 'lab' : null, gem.treatment || null].filter(Boolean).join(' · ');
  const ready = colors.length > 0 && hi > 0;
  return (
    <Paper sx={{ p: 2, mb: 1.5, backgroundColor: REPAIRS_UI.bgTertiary, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader, fontSize: '0.9rem' }}>{label}</Typography>
          <Typography variant="caption" sx={{ color: stone ? REPAIRS_UI.textMuted : '#FFB74D' }}>{stone || 'Species not specified (Variants tab)'}</Typography>
        </Box>
        <Chip size="small" label={gem.availability === 'special_request' ? 'special request' : 'buy now'} variant="outlined"
          sx={{ height: 20, color: gem.availability === 'special_request' ? '#FFB74D' : '#66BB6A', borderColor: 'currentColor' }} />
      </Stack>
      {!ready ? (
        <Typography variant="caption" sx={{ color: '#FFB74D', display: 'block', mt: 1 }}>
          Set the carat range and at least one color bucket with rates (Variants tab) to price this.
        </Typography>
      ) : (
        <Stack spacing={0.5} sx={{ mt: 1.25 }}>
          {colors.map((c, i) => (
            <Stack key={i} direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" sx={{ color: REPAIRS_UI.textPrimary }}>{c.label}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: REPAIRS_UI.accent }}>
                {money(retailAt(c.rates, lo))}{hi > lo ? ` – ${money(retailAt(c.rates, hi))}` : ''}
              </Typography>
            </Stack>
          ))}
        </Stack>
      )}
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap>
        <TextField size="small" label="Cut labor" type="number" value={gem.cutLaborCost ?? ''} onChange={(e) => setGem({ cutLaborCost: e.target.value })} sx={{ width: 110 }}
          InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
        <Box sx={{ minWidth: 90 }}>
          <Typography sx={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: REPAIRS_UI.textSecondary }}>Shared</Typography>
          <Typography sx={{ fontSize: '0.9rem', color: REPAIRS_UI.textPrimary, fontWeight: 500 }}>{money(sharedCosts)}</Typography>
        </Box>
        <TextField size="small" label="Markup ×" type="number" value={variant.markupOverride} onChange={(e) => onChange({ markupOverride: e.target.value })} placeholder={String(baseMarkup)} sx={{ width: 100 }}
          helperText={variant.markupOverride ? ' ' : `default ×${baseMarkup}`} FormHelperTextProps={{ sx: { mx: 0, fontSize: '0.6rem' } }} />
      </Stack>
      <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, mt: 0.5, display: 'block' }}>
        retail = (carat × color&apos;s tier rate + {money(cutLabor)} cut labor + {money(sharedCosts)} shared) × {markup}; customer picks the carat.
      </Typography>
    </Paper>
  );
}

/** Task autocomplete sourced from the repair catalog + custom history — same source as
 *  the customs quote builder (/api/custom-orders/task-suggestions). On pick, fills the
 *  cost, hours, and lane. */
function TaskAutocomplete({ value, onText, onPick }) {
  const [options, setOptions] = useState([]);
  const [input, setInput] = useState(value || '');
  useEffect(() => { setInput(value || ''); }, [value]);
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/custom-orders/task-suggestions?context=custom&search=${encodeURIComponent(input || '')}`);
        if (r.ok && !cancelled) setOptions(await r.json());
      } catch { /* ignore */ }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [input]);
  return (
    <Autocomplete
      freeSolo size="small" options={options} filterOptions={(x) => x}
      value={null} inputValue={input}
      getOptionLabel={(o) => (typeof o === 'string' ? o : o.label || '')}
      isOptionEqualToValue={(o, v) => o.label === v.label}
      onInputChange={(_, v) => { setInput(v); onText(v); }}
      onChange={(_, v) => { if (v && typeof v !== 'string') onPick({ description: v.label, cost: v.cost, hours: v.hours, category: v.category }); }}
      renderOption={(props, o) => (
        <Box component="li" {...props} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
          <span>{o.label}</span>
          <Stack direction="row" spacing={0.75} alignItems="center">
            {o.cost > 0 && <Typography variant="caption" sx={{ color: 'text.secondary' }}>${o.cost}</Typography>}
            <Chip size="small" label={o.source === 'custom' ? 'custom' : 'repair'} variant="outlined" sx={{ height: 18 }} />
          </Stack>
        </Box>
      )}
      renderInput={(params) => <TextField {...params} label="Task" placeholder="set stones, polish…" />}
    />
  );
}

/** Stone picker for a variant stone row. Searches the reorderable stone-SKU catalog
 *  (/api/products/stones) for reuse, plus a Stuller SKU lookup that sources the stone
 *  (wholesale cost + specs) into the catalog and links it. */
function StonePicker({ value, onPick }) {
  const [options, setOptions] = useState([]);
  const [input, setInput] = useState(value || '');
  const [sku, setSku] = useState('');
  const [looking, setLooking] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { setInput(value || ''); }, [value]);
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/products/stones?search=${encodeURIComponent(input || '')}`);
        const d = await r.json().catch(() => ({}));
        if (!cancelled && r.ok) setOptions(d.stones || []);
      } catch { /* ignore */ }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [input]);
  const pick = (s) => onPick({ stoneSkuId: s.stoneSkuId || '', stullerSku: s.stullerSku || '', label: s.label || '', unitCost: s.cost != null ? s.cost : '', caratEach: s.caratEach != null ? s.caratEach : '', source: s.source || 'catalog' });
  const lookup = async () => {
    const n = sku.trim();
    if (!n) return;
    setLooking(true); setErr('');
    try {
      const r = await fetch('/api/products/stones/from-stuller', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ itemNumber: n }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Lookup failed');
      pick(d.stone);
      setSku('');
    } catch (e) { setErr(e.message); } finally { setLooking(false); }
  };
  return (
    <Box>
      <Autocomplete
        freeSolo size="small" options={options} filterOptions={(x) => x}
        value={null} inputValue={input}
        getOptionLabel={(o) => (typeof o === 'string' ? o : o.label || '')}
        onInputChange={(_, v) => setInput(v)}
        onChange={(_, v) => { if (v && typeof v !== 'string') pick(v); }}
        renderOption={(props, o) => (
          <Box component="li" {...props} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
            <span>{o.label}</span>
            <Stack direction="row" spacing={0.75} alignItems="center">
              {o.cost > 0 && <Typography variant="caption" sx={{ color: 'text.secondary' }}>${o.cost}</Typography>}
              {o.stullerSku && <Chip size="small" label="Stuller" variant="outlined" sx={{ height: 18 }} />}
            </Stack>
          </Box>
        )}
        renderInput={(params) => <TextField {...params} label="Stone (catalog)" placeholder="search saved stones…" />}
      />
      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.5 }}>
        <TextField size="small" label="Stuller SKU" value={sku} onChange={(e) => setSku(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); lookup(); } }} sx={{ flex: 1 }} />
        <Button size="small" onClick={lookup} disabled={looking || !sku.trim()} sx={{ color: REPAIRS_UI.accent, textTransform: 'none', whiteSpace: 'nowrap', minWidth: 0 }}>
          {looking ? '…' : 'Look up'}
        </Button>
      </Stack>
      {err && <Typography variant="caption" sx={{ color: '#EF5350', display: 'block' }}>{err}</Typography>}
    </Box>
  );
}

const CONF_COLOR = { exact: '#66BB6A', close: '#FFA726', loose: REPAIRS_UI.textMuted };
// Trade shapes (REFRAKT's cut vocabulary) offered when entering a stone by hand.
const SHAPE_OPTS = ['round', 'oval', 'princess', 'cushion', 'radiant', 'emerald', 'asscher', 'baguette', 'pear', 'marquise', 'heart', 'trillion'];
// Diamond-equivalent carat from a footprint (matches REFRAKT: 0.00364·L·W²) — for manual entry.
const caratFromMm = (l, w) => { const L = Number(l); const W = Number(w); return (L > 0 && W > 0) ? Math.round(0.00364 * L * W * W * 1000) / 1000 : null; };
// One-line attribute summary for the (uncluttered) inline stone row; details live in the modal.
const stoneSummary = (r) => {
  const size = stoneSizeLabel({ l: Number(r.lengthMm) || null, w: Number(r.widthMm) || null }) || r.sizeMm || (r.caratEach ? `${r.caratEach}ct` : '');
  return [cap(r.role), r.creation, size, r.cut, r.preset].filter(Boolean).join(' · ');
};

/** Full stone-line editor (modal). Holds all the per-line detail that used to clutter the row —
 *  role, origin, and the geometry REFRAKT stamps for a CAD design (type/cut/mm), entered by HAND
 *  for a handmade design (no GLB) — plus the catalog + live Stuller match driven by those fields.
 *  Edits a local copy; commits on Done. */
function StoneEditorModal({ open, row, onClose, onSave }) {
  const [r, setR] = useState(row || {});
  const [data, setData] = useState({ catalog: [], stuller: [], stullerError: null });
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  // Seed the working copy when the modal OPENS (not on every row identity change, which would
  // discard in-progress edits).
  useEffect(() => { if (open) { setR(row || {}); setErr(''); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const f = (patch) => setR((x) => ({ ...x, ...patch }));
  const creation = r.creation || 'natural';
  const linked = Boolean(r.stoneSkuId);
  const compCarat = caratFromMm(r.lengthMm, r.widthMm);

  // Find catalog + Stuller matches from the current attributes (debounced as the user types mm).
  const find = useCallback(async () => {
    if (!open) return;
    if (!r.preset && !r.lengthMm && !r.caratEach) { setData({ catalog: [], stuller: [], stullerError: null }); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/products/stones/match', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gemType: r.preset, cut: r.cut, creation, carat: r.caratEach, lengthMm: r.lengthMm, widthMm: r.widthMm }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'Match failed');
      setData({ catalog: d.catalog || [], stuller: d.stuller || [], stullerError: d.stullerError });
    } catch (e) { setData({ catalog: [], stuller: [], stullerError: e.message }); } finally { setLoading(false); }
  }, [open, r.preset, r.cut, creation, r.caratEach, r.lengthMm, r.widthMm]);
  useEffect(() => { const t = setTimeout(find, 300); return () => clearTimeout(t); }, [find]);

  const applyCatalog = (s) => f({ stoneSkuId: s.stoneSkuId || '', stullerSku: s.stullerSku || '', label: s.label || '', unitCost: s.cost != null ? String(s.cost) : '', creation: s.naturalSynthetic || creation, caratEach: r.caratEach || (s.caratEach != null ? String(s.caratEach) : ''), source: 'catalog' });
  const applyStuller = async (c) => {
    const id = c.itemNumber || c.serialNumber || 'x';
    setBusy(id); setErr('');
    try {
      // Melee = a real /v2/products SKU → persist (+ cron-refresh) via from-stuller. Serialized
      // certified stones = point-in-time capture via from-gem.
      const req = c.kind === 'melee'
        ? { url: '/api/products/stones/from-stuller', payload: { itemNumber: c.itemNumber } }
        : { url: '/api/products/stones/from-gem', payload: { candidate: c } };
      const res = await fetch(req.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req.payload) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'Save failed');
      const s = d.stone || {};
      f({ stoneSkuId: s.stoneSkuId || '', stullerSku: s.stullerSku || '', label: s.label || '', unitCost: s.cost != null ? String(s.cost) : '', creation: c.creation || s.naturalSynthetic || creation, caratEach: r.caratEach || (s.caratEach != null ? String(s.caratEach) : ''), source: 'stuller' });
    } catch (e) { setErr(e.message); } finally { setBusy(''); }
  };
  const unlink = () => f({ stoneSkuId: '', stullerSku: '', source: '' });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}` } }}>
      <DialogTitle sx={{ color: REPAIRS_UI.textHeader, pb: 0.5 }}>Stone details</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Stack spacing={1.5}>
          {/* Attributes — for CAD these come prefilled from REFRAKT; for handmade, entered here. */}
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <TextField select size="small" label="Role" value={r.role || 'accent'} onChange={(e) => f({ role: e.target.value })} sx={{ width: 110 }}>
              {GEM_ROLES.map((g) => <MenuItem key={g.value} value={g.value}>{g.label}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Origin" value={creation} onChange={(e) => f({ creation: e.target.value })} sx={{ width: 110 }}>
              {CREATION_OPTS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </TextField>
            <TextField size="small" label="Qty" type="number" value={r.qty ?? '1'} onChange={(e) => f({ qty: e.target.value })} sx={{ width: 72 }} inputProps={{ min: 1 }} />
          </Stack>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <TextField size="small" label="Gem type" value={r.preset || ''} onChange={(e) => f({ preset: e.target.value })} placeholder="diamond, amethyst…" sx={{ width: 150 }} />
            <TextField select size="small" label="Cut / shape" value={r.cut || ''} onChange={(e) => f({ cut: e.target.value })} sx={{ width: 140 }}>
              <MenuItem value="">—</MenuItem>
              {SHAPE_OPTS.map((s) => <MenuItem key={s} value={s}>{cap(s)}</MenuItem>)}
            </TextField>
          </Stack>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="flex-start">
            <TextField size="small" label="Length (mm)" type="number" value={r.lengthMm ?? ''} onChange={(e) => f({ lengthMm: e.target.value })} sx={{ width: 110 }} inputProps={{ step: 0.05, min: 0 }} />
            <TextField size="small" label="Width (mm)" type="number" value={r.widthMm ?? ''} onChange={(e) => f({ widthMm: e.target.value })} sx={{ width: 110 }} inputProps={{ step: 0.05, min: 0 }} />
            <Box>
              <TextField size="small" label="Carat (ct ea)" type="number" value={r.caratEach ?? ''} onChange={(e) => f({ caratEach: e.target.value })} sx={{ width: 120 }} inputProps={{ step: 0.01, min: 0 }} />
              {compCarat != null && String(r.caratEach || '') !== String(compCarat) && (
                <Button size="small" onClick={() => f({ caratEach: String(compCarat) })} sx={{ color: REPAIRS_UI.accent, textTransform: 'none', fontSize: '0.62rem', p: 0, minWidth: 0, mt: 0.25 }}>≈ {compCarat}ct from mm — use</Button>
              )}
            </Box>
          </Stack>

          {linked ? (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ p: 0.75, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 1 }}>
              <Chip size="small" label={r.source === 'stuller' ? 'Stuller' : 'catalog'} variant="outlined" sx={{ height: 18 }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" noWrap sx={{ color: REPAIRS_UI.textHeader }}>{r.label}</Typography>
                <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>{r.stullerSku}</Typography>
              </Box>
              <Button size="small" onClick={unlink} sx={{ color: REPAIRS_UI.textMuted, textTransform: 'none' }}>Unlink</Button>
            </Stack>
          ) : (
            <TextField size="small" label="Unit cost (manual, $/stone)" type="number" value={r.unitCost ?? ''} onChange={(e) => f({ unitCost: e.target.value })} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} sx={{ maxWidth: 240 }} />
          )}

          <Divider sx={{ borderColor: REPAIRS_UI.border }} />
          <StonePicker value={r.label} onPick={(p) => f(p)} />
          {err && <Alert severity="error">{err}</Alert>}

          {loading ? (
            <Stack alignItems="center" sx={{ py: 2 }}><CircularProgress size={20} sx={{ color: REPAIRS_UI.accent }} /></Stack>
          ) : (
            <Stack spacing={1.5}>
              <Box>
                <Typography variant="caption" sx={{ color: REPAIRS_UI.textSecondary, fontWeight: 600 }}>From your catalog</Typography>
                {data.catalog.length === 0
                  ? <Typography variant="body2" sx={{ color: REPAIRS_UI.textMuted, py: 0.5 }}>No catalog match yet.</Typography>
                  : <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                      {data.catalog.map((c) => (
                        <Stack key={c.stone.stoneSkuId} direction="row" alignItems="center" spacing={1} onClick={() => applyCatalog(c.stone)}
                          sx={{ p: 0.75, borderRadius: 1, cursor: 'pointer', border: `1px solid ${REPAIRS_UI.border}`, '&:hover': { borderColor: REPAIRS_UI.accent } }}>
                          <Chip size="small" label={c.confidence} sx={{ height: 18, bgcolor: 'transparent', color: CONF_COLOR[c.confidence], border: `1px solid ${CONF_COLOR[c.confidence]}` }} />
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" noWrap sx={{ color: REPAIRS_UI.textHeader }}>{c.stone.label}</Typography>
                            <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>{[c.stone.dimensions, c.stone.shape, c.stone.stullerSku].filter(Boolean).join(' · ')}</Typography>
                          </Box>
                          <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>{money(c.stone.cost)}</Typography>
                        </Stack>
                      ))}
                    </Stack>}
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: REPAIRS_UI.textSecondary, fontWeight: 600 }}>From Stuller (live, by mm)</Typography>
                {data.stuller.length === 0
                  ? <Typography variant="body2" sx={{ color: data.stullerError ? '#EF5350' : REPAIRS_UI.textMuted, py: 0.5 }}>{data.stullerError || 'No matching stones on Stuller for this size.'}</Typography>
                  : <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                      {data.stuller.map((c) => { const id = c.itemNumber || c.serialNumber; return (
                        <Stack key={id} direction="row" alignItems="center" spacing={1} onClick={() => !busy && applyStuller(c)}
                          sx={{ p: 0.75, borderRadius: 1, cursor: 'pointer', border: `1px solid ${REPAIRS_UI.border}`, opacity: busy && busy !== id ? 0.5 : 1, '&:hover': { borderColor: REPAIRS_UI.accent } }}>
                          <Chip size="small" label={c.kind === 'melee' ? 'melee' : 'certified'} sx={{ height: 18, bgcolor: 'transparent', color: c.kind === 'melee' ? '#66BB6A' : '#42A5F5', border: `1px solid ${c.kind === 'melee' ? '#66BB6A' : '#42A5F5'}` }} />
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" noWrap sx={{ color: REPAIRS_UI.textHeader }}>{c.title}</Typography>
                            <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>{[c.lengthMm && c.widthMm ? stoneSizeLabel({ l: c.lengthMm, w: c.widthMm }) : null, c.color, c.clarity, id, c.deviationMm != null ? `±${c.deviationMm}mm` : null].filter(Boolean).join(' · ')}</Typography>
                          </Box>
                          {busy === id ? <CircularProgress size={16} sx={{ color: REPAIRS_UI.accent }} /> : <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>{money(c.price)}{c.kind === 'melee' ? '/ea' : ''}</Typography>}
                        </Stack>
                      ); })}
                    </Stack>}
              </Box>
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ color: REPAIRS_UI.textMuted, textTransform: 'none' }}>Cancel</Button>
        <Button onClick={() => { onSave(r); onClose(); }} variant="contained" sx={{ bgcolor: REPAIRS_UI.accent, color: '#1a1205', textTransform: 'none', '&:hover': { bgcolor: REPAIRS_UI.accent } }}>Done</Button>
      </DialogActions>
    </Dialog>
  );
}

/** Per-variant stones: center + accents, seeded from the variant's REFRAKT gem slots and
 *  linked to the gemstone catalog. Cost = unit × qty (accents priced per-stone). */
function VariantStones({ gemstones, viewerConfig, stoneCosts = {}, onChange }) {
  const rows = gemstones || [];
  const [editIdx, setEditIdx] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const set = (i, patch) => onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const saveRow = (i, updated) => onChange(rows.map((r, idx) => (idx === i ? updated : r)));
  const remove = (i) => onChange(rows.filter((_, idx) => idx !== i));
  // Add opens the editor immediately — for handmade (no REFRAKT geometry) that's where type/cut/mm
  // get entered by hand so the catalog + Stuller match can run.
  const add = () => { onChange([...rows, { slot: '', role: 'accent', qty: '1', stoneSkuId: '', stullerSku: '', label: '', unitCost: '', caratEach: '', sizeMm: '', cut: '', creation: 'natural', preset: '', lengthMm: '', widthMm: '', source: '' }]); setEditIdx(rows.length); };
  const gemSlots = (viewerConfig?.meshMap || []).filter((s) => s.type === 'gem');
  // REFRAKT (1.11+) stamps each gem slot with its measured size (lengthMm/widthMm/carat) + cut.
  // Group by gem type + cut + size so mixed accent sizes/shapes split into sourceable rows.
  const gemGroups = (() => {
    const m = new Map();
    for (const s of gemSlots) {
      // REFRAKT 1.12+ stamps per-stone `creation` (natural|lab); group by it too so a natural center
      // + lab melee of the same size split into separate sourceable rows. Missing → natural.
      const creation = s.creation || 'natural';
      const key = `${s.gemPreset || 'gem'}|${s.cut || 'na'}|${s.carat != null ? s.carat : 'na'}|${creation}`;
      const g = m.get(key) || { slot: s.nameContains || '', preset: s.gemPreset || '', cut: s.cut || '', creation, qty: 0, carat: s.carat != null ? s.carat : '', lengthMm: s.lengthMm != null ? s.lengthMm : '', widthMm: s.widthMm != null ? s.widthMm : '', size: stoneSizeLabel({ l: s.lengthMm, w: s.widthMm }) };
      g.qty += 1;
      m.set(key, g);
    }
    return [...m.values()];
  })();
  // Assign a role per group. Name hints win; otherwise there is AT MOST ONE center — the single
  // largest (by carat) qty-1 stone — and everything else is an accent. (A design usually has one
  // focal stone or none; multiple distinct melee groups must not all read as "center".)
  const rolesFor = (groups) => {
    const byName = groups.map((g) => (
      /center|centre|main|feature|solitaire/i.test(g.slot) ? 'center'
        : /accent|melee|pave|pavé|side|halo/i.test(g.slot) ? 'accent' : null
    ));
    let centerIdx = -1;
    if (!byName.includes('center')) {
      let maxCt = -1;
      groups.forEach((g, i) => { const c = Number(g.carat) || 0; if (Number(g.qty) === 1 && c > maxCt) { maxCt = c; centerIdx = i; } });
    }
    return groups.map((g, i) => byName[i] || (i === centerIdx ? 'center' : 'accent'));
  };
  const baseRow = (g, role) => ({
    slot: g.slot, role,
    qty: String(g.qty), stoneSkuId: '', stullerSku: '', label: '', unitCost: '',
    caratEach: g.carat !== '' && g.carat != null ? String(g.carat) : '', sizeMm: g.size || '', cut: g.cut || '', creation: g.creation || 'natural',
    preset: g.preset, lengthMm: g.lengthMm !== '' && g.lengthMm != null ? String(g.lengthMm) : '', widthMm: g.widthMm !== '' && g.widthMm != null ? String(g.widthMm) : '', source: '',
  });
  // Seed the rows, then auto-link any that EXACTLY match a curated catalog stone (owner's choice).
  const seed = async () => {
    const roles = rolesFor(gemGroups);
    const base = gemGroups.map((g, i) => baseRow(g, roles[i]));
    setSeeding(true);
    try {
      const linked = await Promise.all(base.map(async (row) => {
        try {
          const r = await fetch('/api/products/stones/match', { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gemType: row.preset, cut: row.cut, creation: row.creation, carat: row.caratEach, lengthMm: row.lengthMm, widthMm: row.widthMm, includeStuller: false }) });
          const d = await r.json().catch(() => ({}));
          const top = r.ok && (d.catalog || [])[0];
          if (top && top.confidence === 'exact') {
            const s = top.stone;
            return { ...row, stoneSkuId: s.stoneSkuId || '', stullerSku: s.stullerSku || '', label: s.label || '', unitCost: s.cost != null ? String(s.cost) : '', source: 'catalog' };
          }
        } catch { /* leave unlinked */ }
        return row;
      }));
      onChange(linked);
    } finally { setSeeding(false); }
  };
  const subtotal = sumStones(rows, stoneCosts);
  return (
    <Box sx={{ p: 1.5, backgroundColor: REPAIRS_UI.bgCard, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 1.5 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textSecondary, fontSize: '0.8rem' }}>Gemstones</Typography>
        {gemGroups.length > 0 && rows.length === 0 && (
          <Button size="small" onClick={seed} disabled={seeding} startIcon={seeding ? <CircularProgress size={12} sx={{ color: REPAIRS_UI.accent }} /> : null} sx={{ color: REPAIRS_UI.accent, textTransform: 'none' }}>
            {seeding ? 'Matching…' : `Seed from REFRAKT (${gemGroups.length})`}
          </Button>
        )}
      </Stack>
      {rows.length === 0
        ? <Typography variant="body2" sx={{ color: REPAIRS_UI.textMuted, py: 0.5 }}>{gemGroups.length ? 'Seed from REFRAKT or add stones manually.' : 'No stones. Add the stones this variant is set with.'}</Typography>
        : (
          <Stack spacing={0.75}>
            {rows.map((r, i) => {
              const band = caratBand(r.caratEach);
              const summary = [stoneSummary(r), band ? band.label : null].filter(Boolean).join(' · ');
              return (
                <Stack key={i} direction="row" spacing={1} alignItems="center" sx={{ p: 0.75, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 1 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }} onClick={() => setEditIdx(i)} style={{ cursor: 'pointer' }}>
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <Typography variant="body2" noWrap sx={{ color: r.label ? REPAIRS_UI.textHeader : REPAIRS_UI.textMuted }}>{r.label || 'No stone linked'}</Typography>
                      {r.source && <Chip size="small" label={r.source === 'stuller' ? 'Stuller' : 'catalog'} variant="outlined" sx={{ height: 15, fontSize: '0.58rem' }} />}
                    </Stack>
                    <Typography variant="caption" noWrap sx={{ color: REPAIRS_UI.textMuted, display: 'block' }}>{summary || 'Add details →'}</Typography>
                  </Box>
                  <TextField size="small" label="Qty" type="number" value={r.qty ?? '1'} onChange={(e) => set(i, { qty: e.target.value })} sx={{ width: 62 }} inputProps={{ min: 1 }} />
                  <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary, width: 76, textAlign: 'right' }}>{money(stoneUnit(r, stoneCosts) * (Number(r.qty) || 1))}</Typography>
                  <Tooltip title="Edit stone details + match">
                    <IconButton size="small" onClick={() => setEditIdx(i)} sx={{ color: REPAIRS_UI.accent }}><EditIcon sx={{ fontSize: 16 }} /></IconButton>
                  </Tooltip>
                  <IconButton size="small" onClick={() => remove(i)} sx={{ color: REPAIRS_UI.textMuted }}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton>
                </Stack>
              );
            })}
          </Stack>
        )}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
        <Button size="small" startIcon={<AddIcon sx={{ fontSize: 16 }} />} onClick={add} sx={{ color: REPAIRS_UI.accent }}>Add stone</Button>
        <Typography variant="caption" sx={{ color: REPAIRS_UI.textSecondary }}>Stones subtotal: <b style={{ color: REPAIRS_UI.textHeader }}>{money(subtotal)}</b></Typography>
      </Stack>
      <StoneEditorModal open={editIdx != null} row={editIdx != null ? rows[editIdx] : null} onClose={() => setEditIdx(null)} onSave={(u) => saveRow(editIdx, u)} />
    </Box>
  );
}

/** Labor-task editor with catalog-linked descriptions + lane/qty/hours/cost (mirrors the quote). */
function LaborTaskEditor({ rows, onChange }) {
  const set = (i, k, v) => onChange(rows.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const patch = (i, obj) => onChange(rows.map((r, idx) => (idx === i ? { ...r, ...obj } : r)));
  const remove = (i) => onChange(rows.filter((_, idx) => idx !== i));
  const add = () => onChange([...rows, { description: '', quantity: '1', hours: '', discipline: 'bench_jewelry', cost: '' }]);
  return (
    <Box>
      {rows.length === 0
        ? <Typography variant="body2" sx={{ color: REPAIRS_UI.textMuted, py: 0.5 }}>No labor tasks.</Typography>
        : (
          <Stack spacing={1.25}>
            {rows.map((r, i) => (
              <Stack key={i} direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Box sx={{ flex: 1, minWidth: 180 }}>
                  <TaskAutocomplete
                    value={r.description}
                    onText={(v) => set(i, 'description', v)}
                    onPick={({ description, cost, hours, category }) => patch(i, { description, cost: cost != null ? String(cost) : r.cost, hours: hours != null ? String(hours) : r.hours, ...(category ? { discipline: categoryToDiscipline(category) } : {}) })}
                  />
                </Box>
                <TextField select size="small" label="Lane" value={r.discipline || 'bench_jewelry'} onChange={(e) => set(i, 'discipline', e.target.value)} sx={{ width: 120 }}>
                  {DISCIPLINE_OPTS.map((d) => <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>)}
                </TextField>
                <TextField size="small" label="Qty" type="number" value={r.quantity ?? '1'} onChange={(e) => set(i, 'quantity', e.target.value)} sx={{ width: 64 }} />
                <TextField size="small" label="Hrs" type="number" value={r.hours ?? ''} onChange={(e) => set(i, 'hours', e.target.value)} sx={{ width: 68 }} inputProps={{ step: 0.25, min: 0 }} />
                <TextField size="small" label="Cost" type="number" value={r.cost ?? ''} onChange={(e) => set(i, 'cost', e.target.value)} sx={{ width: 110 }} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
                <IconButton size="small" onClick={() => remove(i)} sx={{ color: REPAIRS_UI.textMuted }}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton>
              </Stack>
            ))}
          </Stack>
        )}
      <Button size="small" startIcon={<AddIcon sx={{ fontSize: 16 }} />} onClick={add} sx={{ color: REPAIRS_UI.accent, mt: 1 }}>Add task</Button>
    </Box>
  );
}

function PricingTab({ pricing, variants, category, stlVolumeCm3, defaultMarkup, artisanFee, artisanName, editionType, editionLimit, productionMethod, stoneCosts, onChange, onVariantChange }) {
  const isGem = category === 'gemstone';
  const [metalCosts, setMetalCosts] = useState({});
  const [loadingCosts, setLoadingCosts] = useState(false);
  const [taskCosts, setTaskCosts] = useState({}); // { catalog task label: cost } for auto labor
  const hasVolume = Number(stlVolumeCm3) > 0;
  // Gem pricing is carat × rate (no metal/mounting) — skip the live metal-cost fetches entirely.
  const metalsKey = isGem ? '' : [...new Set(variants.map((v) => v.metalKey).filter(Boolean))].sort().join(',');

  // Pull current costs for the auto-labor tasks (casting cleanup + carat-band settings).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const out = {};
      for (const q of ['casting', 'set stone']) {
        try {
          const r = await fetch(`/api/custom-orders/task-suggestions?context=custom&search=${encodeURIComponent(q)}`);
          const d = await r.json().catch(() => []);
          for (const t of (Array.isArray(d) ? d : [])) if (t.label && t.cost != null) out[t.label] = Number(t.cost);
        } catch { /* fall back to defaults */ }
      }
      if (!cancelled) setTaskCosts(out);
    })();
    return () => { cancelled = true; };
  }, []);

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
  const fee = pricing.designFee || { mode: 'flat', amount: '' };
  const setFee = (patch) => set('designFee', { ...fee, ...patch });
  const isLimited = editionType === 'limited';
  const feeBase = fee.amount !== '' && fee.amount != null ? Number(fee.amount) : (Number(artisanFee) || 0);
  const feeAmt = effectiveDesignFee(fee, artisanFee, editionType, editionLimit);
  const sharedCosts = sumLines(pricing.laborTasks) + sumLines(pricing.shipping) + feeAmt;
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
          <LaborTaskEditor rows={pricing.laborTasks} onChange={(rows) => set('laborTasks', rows)} />
          <Box sx={{ borderTop: `1px solid ${REPAIRS_UI.border}`, my: 2 }} />
          <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textSecondary, fontSize: '0.8rem', mb: 0.5 }}>Shipping</Typography>
          <PriceLineEditor rows={pricing.shipping} onChange={(rows) => set('shipping', rows)} addLabel="Add shipping" emptyText="No shipping costs." />
          <Box sx={{ borderTop: `1px solid ${REPAIRS_UI.border}`, my: 2 }} />
          <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textSecondary, fontSize: '0.8rem', mb: 0.5 }}>Design fee</Typography>
          <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, display: 'block', mb: 1 }}>
            {artisanName ? `Base fee from ${artisanName}’s profile — blank amount uses it.` : 'Set a primary artisan (Details tab) to pull the base fee.'}
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 1 }}>
            <FormControl size="small" sx={{ flex: 1 }}>
              <InputLabel>Apply as</InputLabel>
              <Select value={fee.mode || 'flat'} label="Apply as" onChange={(e) => setFee({ mode: e.target.value })} MenuProps={repairsMenuProps}>
                {DESIGN_FEE_MODES.filter((m) => m.value !== 'split' || isLimited).map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField size="small" label="Fee amount" type="number" value={fee.amount ?? ''} onChange={(e) => setFee({ amount: e.target.value })}
              placeholder={String(Number(artisanFee) || 0)} disabled={fee.mode === 'waived'}
              InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} sx={{ width: { xs: '100%', sm: 160 } }} />
          </Stack>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 0.5 }}>
            <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>
              {fee.mode === 'waived'
                ? 'Waived — no design fee in the price.'
                : fee.mode === 'split' && isLimited
                  ? `${money(feeBase)} ÷ ${Number(editionLimit) || 1} editions`
                  : 'Flat, per piece'}
            </Typography>
            <Typography sx={{ fontWeight: 600, color: feeAmt > 0 ? REPAIRS_UI.textPrimary : REPAIRS_UI.textMuted }}>{money(feeAmt)}<Typography component="span" variant="caption" sx={{ color: REPAIRS_UI.textMuted }}> / piece</Typography></Typography>
          </Stack>
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
          {!isGem && !hasVolume && (
            <Typography variant="caption" sx={{ color: '#FFB74D', display: 'block', mb: 1.5 }}>
              Upload an STL on the CAD &amp; 3D tab to price the mounting from metal.
            </Typography>
          )}
          {variants.length === 0 ? (
            <Typography sx={{ color: REPAIRS_UI.textMuted, fontSize: '0.85rem', py: 1 }}>Add variants (on the Variants tab) to price them.</Typography>
          ) : variants.map((v, i) => (
            isGem ? (
              <GemVariantPriceCard
                key={v.variantId || i}
                variant={v}
                sharedCosts={sharedCosts}
                baseMarkup={baseMarkup}
                onChange={(patch) => onVariantChange(i, patch)}
              />
            ) : (
            <VariantPriceCard
              key={v.variantId || i}
              variant={v}
              mounting={metalCosts[v.metalKey] || 0}
              sharedCosts={sharedCosts}
              baseMarkup={baseMarkup}
              hasVolume={hasVolume}
              loading={loadingCosts}
              stoneCosts={stoneCosts}
              productionMethod={productionMethod}
              taskCosts={taskCosts}
              onChange={(patch) => onVariantChange(i, patch)}
            />)
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
  const [stoneCosts, setStoneCosts] = useState({}); // { stoneSkuId: current wholesale cost }
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
    // Current wholesale cost per stone SKU (kept fresh by the cron) — read live into pricing.
    fetch('/api/products/stones').then((r) => (r.ok ? r.json() : null)).then((d) => {
      const map = {};
      for (const s of (d?.stones || [])) if (s.stoneSkuId) map[s.stoneSkuId] = Number(s.cost) || 0;
      setStoneCosts(map);
    }).catch(() => {});
  }, [load]);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setPricing = (v) => setForm((f) => ({ ...f, pricing: v }));
  const updateVariant = (i, patch) => setForm((f) => ({
    ...f,
    variants: f.variants.map((v, idx) => {
      if (idx !== i) return v;
      const merged = { ...v, ...patch };
      // Keep the pricing metalKey in sync whenever finish or karat changes.
      if ('finish' in patch || 'karat' in patch) merged.metalKey = composeMetalKey(merged.finish, merged.karat);
      return merged;
    }),
  }));
  const removeVariant = (i) => setForm((f) => ({ ...f, variants: f.variants.filter((_, idx) => idx !== i) }));

  const configurePath = (variantId) => `/dashboard/products/drops/${dropId}/designs/${designId}/variants/${variantId}/configure`;

  // "Configure look" needs the variant persisted first (the studio is a separate route
  // that reads from the DB). Save pending edits, then navigate.
  const configureVariant = async (i) => {
    if (!design.designModel?.glbUrl) { notify('Upload a GLB on the CAD & 3D tab first.', 'error'); return; }
    const v = form.variants[i];
    if (dirty) { const ok = await save(); if (!ok) return; }
    router.push(configurePath(v.variantId));
  };

  // "Add variant" (studio-driven): append a stub with an auto-SKU, persist, then open the
  // studio to build the look.
  const addAndConfigureVariant = async () => {
    const isGem = form.category === 'gemstone';
    // Jewelry variants are looks built in REFRAKT (need the GLB); a gemstone variant is a
    // material spec (species/carat/…) edited right on the row — no model required.
    if (!isGem && !design.designModel?.glbUrl) { notify('Upload a GLB on the CAD & 3D tab first — variants are built in REFRAKT.', 'error'); return; }
    const v = newVariantForm();
    const base = (form.name || design.name || 'VAR').toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 12) || 'VAR';
    v.sku = `${base}-${v.variantId.split('-').pop()}`;
    if (form.category === 'ring') v.ringSize = '7'; // sensible default so the stub can persist; editable on the row
    v.active = false; // stub starts inactive until its look is built + specs confirmed
    const nextForm = { ...form, variants: [...form.variants, v] };
    setForm(nextForm);
    if (isGem) return; // stays a local edit — fill the stone spec, then Save
    const ok = await save(nextForm);
    if (ok) router.push(configurePath(v.variantId));
  };

  // CAD tab's "Create first variant": configure the first EXISTING variant if there is one
  // (avoid piling up stubs when a studio session was abandoned); otherwise create + open one.
  const configureFirstVariant = () => (form.variants.length ? configureVariant(0) : addAndConfigureVariant());

  const dirty = useMemo(() => {
    if (!design || !form) return false;
    return JSON.stringify(form) !== JSON.stringify(toForm(design));
  }, [design, form]);

  const discard = () => setForm(toForm(design));

  const save = async (f = form) => {
    if (!f.name.trim()) { notify('Name is required.', 'error'); return false; }
    if (!f.primaryArtisanId) { notify('A primary artisan is required.', 'error'); return false; }
    for (const v of f.variants) {
      if (!v.sku.trim()) { notify('Every variant needs a SKU.', 'error'); return false; }
      if (f.category === 'ring' && !v.ringSize.trim()) { notify('Ring variants need a nominal ring size.', 'error'); return false; }
    }
    const skus = f.variants.map((v) => v.sku.trim());
    if (new Set(skus).size !== skus.length) { notify('Variant SKUs must be unique.', 'error'); return false; }
    const form = f; // subsequent body-building reads from the form being saved
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
        customizable: !!form.customizable,
        edition: { type: form.editionType, ...(form.editionType === 'limited' ? { limit: Number(form.editionLimit) || 1 } : {}) },
        // Gemstone designs: the cut (shape + technique) is a DESIGN detail.
        ...(form.category === 'gemstone' ? { gemstone: { cut: csvArr(form.gemCut), cutStyle: csvArr(form.gemCutStyle) } } : {}),
        pricing: {
          markup: form.pricing.markup ? Number(form.pricing.markup) : null,
          laborTasks: form.pricing.laborTasks.map((t) => ({ description: t.description || '', quantity: Number(t.quantity) || 1, hours: Number(t.hours) || 0, discipline: t.discipline || 'bench_jewelry', cost: Number(t.cost) || 0 })),
          shipping: form.pricing.shipping.map((s) => ({ description: s.description || '', cost: Number(s.cost) || 0 })),
          designFee: { mode: form.pricing.designFee?.mode || 'flat', amount: form.pricing.designFee?.amount ? Number(form.pricing.designFee.amount) : null },
        },
        variants: form.variants.map((v) => ({
          variantId: v.variantId,
          sku: v.sku.trim(),
          ...(v.label.trim() ? { label: v.label.trim() } : {}),
          active: !!v.active,
          finish: v.finish || 'gold',
          karat: finishUsesKarat(v.finish) ? (v.karat || '14') : null,
          metalKey: composeMetalKey(v.finish, v.karat),
          viewerConfig: v.viewerConfig || null,
          ...(form.category === 'ring'
            ? { ringSize: v.ringSize.trim() || null, ...((v.sizingMin || v.sizingMax) ? { sizingAllowance: { min: v.sizingMin, max: v.sizingMax } } : {}) }
            : {}),
          pricing: { retailPrice: v.retailPrice ? Number(v.retailPrice) : null },
          leadTimeDays: v.leadTimeDays ? Number(v.leadTimeDays) : null,
          gemstones: (v.gemstones || []).map((g) => ({
            slot: g.slot || null,
            role: g.role || 'accent',
            qty: Number(g.qty) || 1,
            stoneSkuId: g.stoneSkuId || null,
            stullerSku: g.stullerSku || null,
            label: g.label || '',
            // Store the resolved unit (SKU-linked → current catalog wholesale; else manual).
            unitCost: stoneUnit(g, stoneCosts),
            caratEach: g.caratEach ? Number(g.caratEach) : null,
            sizeMm: g.sizeMm || null,
            cut: g.cut || null,
            creation: g.creation || 'natural',
            preset: g.preset || g.gemType || null,
            lengthMm: g.lengthMm ? Number(g.lengthMm) : null,
            widthMm: g.widthMm ? Number(g.widthMm) : null,
            source: g.source || null,
          })),
          // Snapshot the stone total (Σ unit × qty) so external readers don't recompute.
          stonesCost: sumStones(v.gemstones, stoneCosts),
          markupOverride: v.markupOverride ? Number(v.markupOverride) : null,
          // Gemstone-design variants: a species offering (capability) — toggle, carat range,
          // tiered color rates. lotQty only for special-rough variants (fixed quantity).
          ...(form.category === 'gemstone' ? {
            gemstone: {
              species: v.gem?.species?.trim() || null,
              availability: v.gem?.availability === 'special_request' ? 'special_request' : 'purchase',
              caratMin: v.gem?.caratMin ? Number(v.gem.caratMin) : null,
              caratMax: v.gem?.caratMax ? Number(v.gem.caratMax) : null,
              naturalSynthetic: v.gem?.creation === 'lab' ? 'lab' : 'natural',
              clarity: v.gem?.clarity?.trim() || null,
              treatment: v.gem?.treatment?.trim() || null,
              cutLaborCost: v.gem?.cutLaborCost ? Number(v.gem.cutLaborCost) : null,
              lotQty: v.gem?.lotQty ? Number(v.gem.lotQty) : null,
              colors: (v.gem?.colors || [])
                .filter((c) => String(c.label || '').trim())
                .map((c) => ({
                  label: c.label.trim(),
                  rates: (c.rates || [])
                    .filter((t) => Number(t.upToCt) > 0 && Number(t.ratePerCarat) > 0)
                    .map((t) => ({ upToCt: Number(t.upToCt), ratePerCarat: Number(t.ratePerCarat) }))
                    .sort((a, b) => a.upToCt - b.upToCt),
                })),
              ratesUpdatedAt: new Date().toISOString(), // staleness nag reads this
            },
          } : {}),
        })),
      };
      const res = await fetch(`/api/production/designs/${designId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Save failed');
      notify('Saved', 'success');
      await load();
      return true;
    } catch (e) { notify(e.message, 'error'); return false; } finally { setSaving(false); }
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
                <Button size="small" variant="contained" onClick={() => save()} disabled={saving || !form.name.trim() || !form.primaryArtisanId}
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
      {tab === 1 && <CadTab design={design} designId={designId} onReload={load} notify={notify} onCreateFirstVariant={configureFirstVariant} form={form} setField={setField} />}
      {tab === 2 && (
        <VariantsTab
          variants={form.variants}
          category={form.category}
          hasGlb={!!design.designModel?.glbUrl}
          stoneCosts={stoneCosts}
          onAdd={addAndConfigureVariant}
          onUpdate={updateVariant}
          onRemove={removeVariant}
          onConfigure={configureVariant}
        />
      )}
      {tab === 3 && (
        <PricingTab
          pricing={form.pricing}
          variants={form.variants}
          category={form.category}
          stlVolumeCm3={design.stlVolumeCm3}
          defaultMarkup={defaultMarkup}
          artisanFee={Number(artisans.find((a) => artisanId(a) === form.primaryArtisanId)?.artisanApplication?.customDesignFee) || 0}
          artisanName={form.primaryArtisanId ? artisanName(form.primaryArtisanId) : ''}
          editionType={form.editionType}
          editionLimit={form.editionLimit}
          productionMethod={form.productionMethod}
          stoneCosts={stoneCosts}
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
