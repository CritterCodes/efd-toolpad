'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Button, Paper, TextField, FormControl, InputLabel, Select, MenuItem,
  Stack, Chip, CircularProgress, Snackbar, Alert, Autocomplete, Divider, IconButton,
  Tooltip,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import { REPAIRS_UI, repairsMenuProps } from '@/app/dashboard/repairs/components/repairsUi';

const DESIGN_STATUSES = ['draft', 'cad_requested', 'cad_in_progress', 'cad_qc', 'ready', 'retired'];
const PRODUCTION_METHODS = ['cad_cast', 'handmade', 'hybrid'];
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

function newVariant() {
  return {
    variantId: `v-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    sku: '',
    active: true,
    metalKey: 'GOLD_14K_YELLOW',
    ringSize: '',
    sizingAllowance: { min: '', max: '' },
    pricing: { retailPrice: '' },
    leadTimeDays: '',
    viewer: { customizable: false, customizerParams: '' },
  };
}

function VariantRow({ variant, isRing, onChange, onDelete, index }) {
  const set = (k) => (e) => onChange({ ...variant, [k]: e.target ? e.target.value : e });
  const setNested = (parent, k) => (e) => onChange({ ...variant, [parent]: { ...variant[parent], [k]: e.target ? e.target.value : e } });

  return (
    <Box sx={{ p: 2, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 1.5, mb: 1.5 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
        <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 600, fontSize: '0.85rem' }}>Variant {index + 1}</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            size="small"
            label={variant.active ? 'Active' : 'Inactive'}
            onClick={() => onChange({ ...variant, active: !variant.active })}
            sx={{
              cursor: 'pointer',
              backgroundColor: variant.active ? '#66BB6A22' : REPAIRS_UI.bgTertiary,
              color: variant.active ? '#66BB6A' : REPAIRS_UI.textMuted,
              fontWeight: 700,
              fontSize: '0.72rem',
            }}
          />
          <Tooltip title="Remove variant">
            <IconButton size="small" onClick={onDelete} sx={{ color: REPAIRS_UI.textMuted }}>
              <DeleteIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1.5}>
          <TextField
            label="Variant ID"
            value={variant.variantId}
            onChange={set('variantId')}
            size="small"
            fullWidth
            required
            helperText="Unique within this design"
          />
          <TextField
            label="SKU"
            value={variant.sku}
            onChange={set('sku')}
            size="small"
            fullWidth
            required
          />
        </Stack>
        <Stack direction="row" spacing={1.5}>
          <FormControl size="small" sx={{ flex: 1 }}>
            <InputLabel>Metal</InputLabel>
            <Select value={variant.metalKey || 'GOLD_14K_YELLOW'} label="Metal" onChange={set('metalKey')} MenuProps={repairsMenuProps}>
              {METAL_KEYS.map((m) => <MenuItem key={m.key} value={m.key}>{m.label}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField
            label="Retail price ($)"
            type="number"
            value={variant.pricing?.retailPrice || ''}
            onChange={(e) => onChange({ ...variant, pricing: { ...variant.pricing, retailPrice: e.target.value } })}
            size="small"
            sx={{ flex: 1 }}
          />
          <TextField
            label="Lead time (days)"
            type="number"
            value={variant.leadTimeDays || ''}
            onChange={set('leadTimeDays')}
            size="small"
            sx={{ flex: 1 }}
          />
        </Stack>
        {isRing && (
          <Stack direction="row" spacing={1.5}>
            <TextField
              label="Nominal ring size"
              value={variant.ringSize || ''}
              onChange={set('ringSize')}
              size="small"
              sx={{ flex: 1 }}
              required
              helperText="e.g. 7"
            />
            <TextField
              label="Size range min"
              value={variant.sizingAllowance?.min || ''}
              onChange={setNested('sizingAllowance', 'min')}
              size="small"
              sx={{ flex: 1 }}
              helperText="smallest size we can fill"
            />
            <TextField
              label="Size range max"
              value={variant.sizingAllowance?.max || ''}
              onChange={setNested('sizingAllowance', 'max')}
              size="small"
              sx={{ flex: 1 }}
              helperText="largest size we can fill"
            />
          </Stack>
        )}
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Chip
            size="small"
            label={variant.viewer?.customizable ? 'Customizer On' : 'Customizer Off'}
            onClick={() => onChange({ ...variant, viewer: { ...variant.viewer, customizable: !variant.viewer?.customizable } })}
            sx={{
              cursor: 'pointer',
              backgroundColor: variant.viewer?.customizable ? `${REPAIRS_UI.accent}33` : REPAIRS_UI.bgTertiary,
              color: variant.viewer?.customizable ? REPAIRS_UI.accent : REPAIRS_UI.textSecondary,
              border: `1px solid ${variant.viewer?.customizable ? REPAIRS_UI.accent : REPAIRS_UI.border}`,
              fontWeight: 700,
            }}
          />
          {variant.viewer?.customizable && (
            <TextField
              label="Customizer params (JSON)"
              value={typeof variant.viewer?.customizerParams === 'string' ? variant.viewer.customizerParams : JSON.stringify(variant.viewer?.customizerParams || {})}
              onChange={(e) => onChange({ ...variant, viewer: { ...variant.viewer, customizerParams: e.target.value } })}
              size="small"
              sx={{ flex: 1 }}
              helperText="Refrakt viewer/customizer configuration JSON"
            />
          )}
        </Stack>
      </Stack>
    </Box>
  );
}

function AssetUploader({ designId, field, label, accept, files, onUploaded, onError }) {
  const [uploading, setUploading] = useState(false);

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !designId) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('field', field);
      const res = await fetch(`/api/production/designs/${designId}/assets`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Upload failed');
      onUploaded?.();
    } catch (err) {
      onError?.(err.message);
    } finally {
      setUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.5 }}>
        <Button
          component="label"
          size="small"
          disabled={uploading || !designId}
          startIcon={uploading ? <CircularProgress size={14} /> : <UploadFileIcon sx={{ fontSize: 16 }} />}
          variant="outlined"
          sx={{ color: (files?.length ? '#66BB6A' : REPAIRS_UI.accent), borderColor: (files?.length ? '#66BB6A' : REPAIRS_UI.border), textTransform: 'none', fontSize: '0.8rem' }}
        >
          {uploading ? 'Uploading…' : label}
          {files?.length ? <CheckCircleIcon sx={{ fontSize: 14, ml: 0.5, color: '#66BB6A' }} /> : null}
          <input type="file" hidden accept={accept} onChange={upload} />
        </Button>
        {files?.length > 0 && (
          <Typography sx={{ color: REPAIRS_UI.textMuted, fontSize: '0.75rem' }}>{files.length} file{files.length !== 1 ? 's' : ''} uploaded</Typography>
        )}
        {!designId && (
          <Typography sx={{ color: REPAIRS_UI.textMuted, fontSize: '0.75rem' }}>Save design first to upload</Typography>
        )}
      </Stack>
    </Box>
  );
}

const emptyForm = (dropId) => ({
  name: '',
  description: '',
  story: '',
  category: '',
  tags: [],
  status: 'draft',
  productionMethod: 'cad_cast',
  primaryArtisanId: '',
  edition: { type: 'unlimited', limit: '' },
  stlVolumeCm3: '',
  variants: [newVariant()],
  dropId: dropId || null,
});

export default function DesignEditor({ dropId, designId, onSave, onCancel }) {
  const isEdit = Boolean(designId);
  const [form, setForm] = useState(emptyForm(dropId));
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [artisans, setArtisans] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [savedDesignId, setSavedDesignId] = useState(designId || null);
  const [cadFiles, setCadFiles] = useState([]);
  const [sketches, setSketches] = useState([]);
  const [referenceImages, setReferenceImages] = useState([]);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'error' });

  const showSnack = (message, severity = 'error') => setSnack({ open: true, message, severity });
  const closeSnack = () => setSnack((s) => ({ ...s, open: false }));

  const loadDesign = useCallback(async () => {
    if (!designId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/production/designs/${designId}`);
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Design not found');
      const d = await res.json();
      setForm({
        name: d.name || '',
        description: d.description || '',
        story: d.story || '',
        category: d.category || '',
        tags: Array.isArray(d.tags) ? d.tags : [],
        status: d.status || 'draft',
        productionMethod: d.productionMethod || 'cad_cast',
        primaryArtisanId: d.primaryArtisanId || '',
        edition: { type: d.edition?.type || 'unlimited', limit: d.edition?.limit ?? '' },
        stlVolumeCm3: d.stlVolumeCm3 ?? '',
        variants: Array.isArray(d.variants) && d.variants.length > 0
          ? d.variants.map((v) => ({
              ...v,
              metalKey: v.metalKey || 'GOLD_14K_YELLOW',
              sizingAllowance: v.sizingAllowance || { min: '', max: '' },
              pricing: { retailPrice: v.pricing?.retailPrice ?? '', ...v.pricing },
              viewer: { customizable: Boolean(v.viewer?.customizable), customizerParams: v.viewer?.customizerParams ? (typeof v.viewer.customizerParams === 'string' ? v.viewer.customizerParams : JSON.stringify(v.viewer.customizerParams)) : '', ...v.viewer },
              leadTimeDays: v.leadTimeDays ?? '',
            }))
          : [newVariant()],
        dropId: d.dropId || dropId || null,
      });
      setCadFiles(Array.isArray(d.cadRevisions) ? d.cadRevisions : []);
      setSketches(Array.isArray(d.sketches) ? d.sketches : []);
      setReferenceImages(Array.isArray(d.referenceImages) ? d.referenceImages : []);
    } catch (e) {
      showSnack(e.message);
    } finally {
      setLoading(false);
    }
  }, [designId, dropId]);

  useEffect(() => {
    loadDesign();
    fetch('/api/users?role=artisan')
      .then((r) => r.json())
      .then((data) => setArtisans(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [loadDesign]);

  const refreshAssets = useCallback(async () => {
    if (!savedDesignId) return;
    try {
      const res = await fetch(`/api/production/designs/${savedDesignId}`);
      if (res.ok) {
        const d = await res.json();
        setCadFiles(Array.isArray(d.cadRevisions) ? d.cadRevisions : []);
        setSketches(Array.isArray(d.sketches) ? d.sketches : []);
        setReferenceImages(Array.isArray(d.referenceImages) ? d.referenceImages : []);
      }
    } catch { /* non-fatal */ }
  }, [savedDesignId]);

  const setF = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target ? e.target.value : e }));

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (t && !form.tags.includes(t)) setForm((f) => ({ ...f, tags: [...f.tags, t] }));
    setTagInput('');
  };

  const removeTag = (t) => setForm((f) => ({ ...f, tags: f.tags.filter((x) => x !== t) }));

  const setVariant = (i, v) => setForm((f) => {
    const variants = [...f.variants];
    variants[i] = v;
    return { ...f, variants };
  });

  const addVariant = () => setForm((f) => ({ ...f, variants: [...f.variants, newVariant()] }));
  const removeVariant = (i) => setForm((f) => ({ ...f, variants: f.variants.filter((_, idx) => idx !== i) }));

  const submit = async () => {
    if (!form.name.trim()) { showSnack('Name is required.'); return; }
    if (form.variants.length === 0) { showSnack('At least one variant is required.'); return; }
    if (form.variants.some((v) => !v.variantId?.trim() || !v.sku?.trim())) { showSnack('All variants need a variant ID and SKU.'); return; }
    if (form.category === 'ring' && form.variants.some((v) => !v.ringSize?.trim())) {
      showSnack('Ring designs require a nominal ring size on each variant.'); return;
    }
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        story: form.story.trim() || '',
        category: form.category || null,
        tags: form.tags,
        status: form.status,
        productionMethod: form.productionMethod,
        primaryArtisanId: form.primaryArtisanId || null,
        edition: {
          type: form.edition.type,
          ...(form.edition.type === 'limited' ? { limit: Number(form.edition.limit) || 1 } : {}),
          allocated: 0, committed: 0, nextNumber: 1,
        },
        stlVolumeCm3: form.stlVolumeCm3 ? Number(form.stlVolumeCm3) : null,
        variants: form.variants.map((v) => ({
          variantId: v.variantId.trim(),
          sku: v.sku.trim(),
          active: Boolean(v.active),
          metalKey: v.metalKey || null,
          ringSize: form.category === 'ring' ? (v.ringSize?.trim() || null) : undefined,
          sizingAllowance: form.category === 'ring' && (v.sizingAllowance?.min || v.sizingAllowance?.max)
            ? { min: v.sizingAllowance.min, max: v.sizingAllowance.max }
            : undefined,
          pricing: { retailPrice: v.pricing?.retailPrice ? Number(v.pricing.retailPrice) : null },
          leadTimeDays: v.leadTimeDays ? Number(v.leadTimeDays) : null,
          viewer: v.viewer?.customizable ? {
            customizable: true,
            customizerParams: (() => { try { return JSON.parse(v.viewer.customizerParams || '{}'); } catch { return {}; } })(),
          } : { customizable: false },
        })),
        dropId: form.dropId || dropId || null,
      };

      let url = '/api/production/designs';
      let method = 'POST';
      if (isEdit && designId) {
        url = `/api/production/designs/${designId}`;
        method = 'PUT';
      }

      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to save design');
      const saved = await res.json();
      if (!savedDesignId) setSavedDesignId(saved.designID);
      showSnack('Design saved.', 'success');
      onSave?.(saved);
    } catch (e) {
      showSnack(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress sx={{ color: REPAIRS_UI.accent }} /></Box>;
  }

  const isRing = form.category === 'ring';

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="flex-start">
      <Box sx={{ flex: 1 }}>
        <Paper sx={{ p: 3, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none', mb: 2 }}>
          <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 2 }}>Design details</Typography>
          <Stack spacing={2}>
            <TextField label="Name" value={form.name} onChange={setF('name')} size="small" fullWidth required />
            <TextField label="Description" value={form.description} onChange={setF('description')} size="small" fullWidth multiline minRows={3} />
            <TextField label="Story / context" value={form.story} onChange={setF('story')} size="small" fullWidth multiline minRows={2} helperText="Customer-facing backstory, optional" />
            <Stack direction="row" spacing={1.5}>
              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel>Category</InputLabel>
                <Select value={form.category} label="Category" onChange={setF('category')} MenuProps={repairsMenuProps}>
                  <MenuItem value="">Unspecified</MenuItem>
                  {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel>Production method</InputLabel>
                <Select value={form.productionMethod} label="Production method" onChange={setF('productionMethod')} MenuProps={repairsMenuProps}>
                  {PRODUCTION_METHODS.map((m) => <MenuItem key={m} value={m}>{m.replace(/_/g, ' ')}</MenuItem>)}
                </Select>
              </FormControl>
            </Stack>
            <Box>
              <Typography sx={{ color: REPAIRS_UI.textSecondary, fontSize: '0.8rem', mb: 0.75 }}>Tags</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                {form.tags.map((t) => (
                  <Chip key={t} label={t} size="small" onDelete={() => removeTag(t)} sx={{ backgroundColor: REPAIRS_UI.bgTertiary, color: REPAIRS_UI.textPrimary, border: `1px solid ${REPAIRS_UI.border}` }} />
                ))}
              </Stack>
              <Stack direction="row" spacing={1}>
                <TextField
                  placeholder="Add tag…"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                  size="small"
                  sx={{ flex: 1 }}
                />
                <Button onClick={addTag} size="small" sx={{ color: REPAIRS_UI.accent }}>Add</Button>
              </Stack>
            </Box>
            <TextField
              label="CAD volume (cm³)"
              type="number"
              value={form.stlVolumeCm3}
              onChange={setF('stlVolumeCm3')}
              size="small"
              helperText="From the STL file. Leave blank for sketch-only or handmade designs."
            />
          </Stack>
        </Paper>

        <Paper sx={{ p: 3, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none', mb: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader }}>Variants</Typography>
            <Button size="small" startIcon={<AddIcon />} onClick={addVariant} sx={{ color: REPAIRS_UI.accent }}>Add variant</Button>
          </Stack>
          {form.variants.map((v, i) => (
            <VariantRow
              key={v.variantId || i}
              variant={v}
              isRing={isRing}
              index={i}
              onChange={(updated) => setVariant(i, updated)}
              onDelete={() => removeVariant(i)}
            />
          ))}
          {form.variants.length === 0 && (
            <Typography sx={{ color: REPAIRS_UI.textMuted, fontSize: '0.85rem', textAlign: 'center', py: 2 }}>
              No variants yet. At least one is required.
            </Typography>
          )}
        </Paper>

        <Paper sx={{ p: 3, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none', mb: 2 }}>
          <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 2 }}>Files &amp; uploads</Typography>
          <Typography sx={{ color: REPAIRS_UI.textSecondary, fontSize: '0.82rem', mb: 2 }}>
            Drafts can be saved without STL/GLB files. Upload files after saving for the first time.
          </Typography>
          <Stack spacing={2}>
            <AssetUploader
              designId={savedDesignId}
              field="referenceImages"
              label="Upload STL / GLB"
              accept=".stl,.glb,.obj,.3dm,.zip"
              files={cadFiles}
              onUploaded={refreshAssets}
              onError={showSnack}
            />
            <AssetUploader
              designId={savedDesignId}
              field="sketches"
              label="Upload sketch / reference"
              accept=".jpg,.jpeg,.png,.webp,.pdf,.heic"
              files={sketches}
              onUploaded={refreshAssets}
              onError={showSnack}
            />
            <AssetUploader
              designId={savedDesignId}
              field="referenceImages"
              label="Upload render / reference image"
              accept=".jpg,.jpeg,.png,.webp"
              files={referenceImages}
              onUploaded={refreshAssets}
              onError={showSnack}
            />
          </Stack>
        </Paper>
      </Box>

      <Box sx={{ width: { xs: '100%', md: 280 } }}>
        <Paper sx={{ p: 3, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none', mb: 2 }}>
          <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 2 }}>Status</Typography>
          <FormControl size="small" fullWidth>
            <InputLabel>Status</InputLabel>
            <Select value={form.status} label="Status" onChange={setF('status')} MenuProps={repairsMenuProps}>
              {DESIGN_STATUSES.map((s) => <MenuItem key={s} value={s}>{s.replace(/_/g, ' ')}</MenuItem>)}
            </Select>
          </FormControl>
        </Paper>

        <Paper sx={{ p: 3, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none', mb: 2 }}>
          <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 2 }}>Capacity / Edition</Typography>
          <FormControl size="small" fullWidth sx={{ mb: 1.5 }}>
            <InputLabel>Edition type</InputLabel>
            <Select value={form.edition.type} label="Edition type" onChange={(e) => setForm((f) => ({ ...f, edition: { ...f.edition, type: e.target.value } }))} MenuProps={repairsMenuProps}>
              {EDITION_TYPES.map((et) => <MenuItem key={et.value} value={et.value}>{et.label}</MenuItem>)}
            </Select>
          </FormControl>
          {form.edition.type === 'limited' && (
            <TextField
              label="Edition limit"
              type="number"
              value={form.edition.limit}
              onChange={(e) => setForm((f) => ({ ...f, edition: { ...f.edition, limit: e.target.value } }))}
              size="small"
              fullWidth
              required
            />
          )}
          {form.edition.type === 'one_of_one' && (
            <Typography sx={{ color: REPAIRS_UI.textMuted, fontSize: '0.8rem' }}>Only one piece will ever be made.</Typography>
          )}
        </Paper>

        <Paper sx={{ p: 3, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none', mb: 2 }}>
          <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 2 }}>Artisan assignment</Typography>
          <Autocomplete
            size="small"
            options={artisans}
            getOptionLabel={(a) => [a.firstName, a.lastName].filter(Boolean).join(' ') || a.email || a.userID || ''}
            isOptionEqualToValue={(o, v) => (o.userID || o._id?.toString()) === (v.userID || v._id?.toString())}
            value={artisans.find((a) => (a.userID || a._id?.toString()) === form.primaryArtisanId) || null}
            onChange={(_, opt) => setForm((f) => ({ ...f, primaryArtisanId: opt ? (opt.userID || opt._id?.toString() || '') : '' }))}
            renderInput={(params) => <TextField {...params} label="Primary artisan (optional)" />}
          />
          <Typography sx={{ color: REPAIRS_UI.textMuted, fontSize: '0.75rem', mt: 1 }}>
            EFD drops can have multiple artisans assigned per design.
          </Typography>
        </Paper>

        <Divider sx={{ borderColor: REPAIRS_UI.border, mb: 2 }} />
        <Stack spacing={1.5}>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
            disabled={saving}
            onClick={submit}
            fullWidth
            sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, '&:hover': { backgroundColor: '#C19B2E' } }}
          >
            {saving ? 'Saving…' : isEdit ? 'Save design' : 'Create design'}
          </Button>
          <Button onClick={onCancel} fullWidth sx={{ color: REPAIRS_UI.textSecondary }}>
            Cancel
          </Button>
        </Stack>
      </Box>

      <Snackbar open={snack.open} autoHideDuration={6000} onClose={closeSnack} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={closeSnack} severity={snack.severity} sx={{ backgroundColor: REPAIRS_UI.bgCard, color: REPAIRS_UI.textPrimary, border: `1px solid ${REPAIRS_UI.border}` }}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
