'use client';

/**
 * U-12 — full-page design form (two-column), replacing `CreateDesignDialog`. Shared by
 * `designs/new` (create) and `designs/[designID]/edit` (edit). Media + CAD/STL upload render in
 * EDIT mode only (they need a designID → create first, then add assets here or on detail U-9).
 *
 * Main column: Title/Description · CAD volume + estimate preview · (edit) CAD files + Media.
 * Sidebar: (edit) status · metal · gemstone link · (edit) design ID.
 */

import React, { useEffect, useState } from 'react';
import {
  Box, Grid, Card, CardContent, Stack, Typography, TextField, FormControl, InputLabel,
  Select, MenuItem, Button, Autocomplete, Divider, IconButton,
} from '@mui/material';
import CalculateIcon from '@mui/icons-material/Calculate';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DescriptionIcon from '@mui/icons-material/Description';
import DownloadIcon from '@mui/icons-material/Download';
import { REPAIRS_UI, repairsMenuProps } from '@/app/dashboard/repairs/components/repairsUi';
import EntityGallery from '@/components/production/media/EntityGallery';

const METAL_KEYS = [
  { key: 'GOLD_14K_YELLOW', label: '14K Yellow Gold' },
  { key: 'GOLD_14K_WHITE', label: '14K White Gold' },
  { key: 'GOLD_18K_YELLOW', label: '18K Yellow Gold' },
  { key: 'GOLD_10K_YELLOW', label: '10K Yellow Gold' },
  { key: 'SILVER_STERLING', label: 'Sterling Silver' },
  { key: 'PLATINUM_IRIDIUM', label: 'Platinum' },
];
const STATUS_OPTIONS = ['concept', 'cad', 'approved_for_production', 'retired'];
const money = (n) => `$${(Number(n) || 0).toLocaleString()}`;
const fileName = (u) => { try { return decodeURIComponent(String(u).split('?')[0].split('/').pop()) || 'file'; } catch { return 'file'; } };
const asImage = (u) => (typeof u === 'string' ? { url: u } : u);

function Section({ title, children }) {
  return (
    <Card sx={{ backgroundColor: REPAIRS_UI.bgCard, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, mb: 3 }}>
      <CardContent>
        <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 2 }}>{title}</Typography>
        {children}
      </CardContent>
    </Card>
  );
}

export default function DesignForm({ mode = 'new', design = null, onSaved, onError, onReloaded }) {
  const isEdit = mode === 'edit' && Boolean(design?.designID);
  const [form, setForm] = useState({
    name: design?.name || '',
    description: design?.description || '',
    metalKey: design?.metalOptions?.[0] || 'GOLD_14K_YELLOW',
    stlVolumeCm3: design?.stlVolumeCm3 != null ? String(design.stlVolumeCm3) : '',
    gemstoneId: design?.gemstoneId || '',
    status: design?.status || 'concept',
  });
  const [estimate, setEstimate] = useState(null);
  const [estimating, setEstimating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [gems, setGems] = useState([]);
  const set = (k) => (e) => {
    const v = e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
    if (k === 'metalKey' || k === 'stlVolumeCm3') setEstimate(null);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/products/gemstones');
        const data = await res.json().catch(() => ({}));
        if (!cancelled) setGems(Array.isArray(data.gemstones) ? data.gemstones : []);
      } catch { /* non-fatal — picker stays empty */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const gemLabel = (g) => (
    g?.title
    || [g?.gemstone?.species, g?.gemstone?.carat ? `${g.gemstone.carat}ct` : null].filter(Boolean).join(' ')
    || g?.productId
    || ''
  );

  const previewEstimate = async () => {
    if (!form.stlVolumeCm3) { onError?.('Enter a CAD volume (cm³) to estimate.'); return; }
    setEstimating(true);
    try {
      const res = await fetch('/api/production/designs/estimate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stlVolumeCm3: Number(form.stlVolumeCm3), metalKey: form.metalKey }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Estimate failed');
      setEstimate((await res.json()).estimate);
    } catch (e) { onError?.(e.message); } finally { setEstimating(false); }
  };

  const save = async () => {
    if (!form.name.trim()) { onError?.('Name is required.'); return; }
    setSaving(true);
    try {
      const body = {
        name: form.name,
        description: form.description,
        metalOptions: [form.metalKey],
        stlVolumeCm3: form.stlVolumeCm3 ? Number(form.stlVolumeCm3) : null,
        gemstoneId: form.gemstoneId || null,
        ...(estimate ? { estCost: estimate.estCost } : {}),
        ...(isEdit ? { status: form.status } : {}),
      };
      const url = isEdit ? `/api/production/designs/${design.designID}` : '/api/production/designs';
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Save failed');
      onSaved?.(await res.json());
    } catch (e) { onError?.(e.message); } finally { setSaving(false); }
  };

  // asset upload (edit only — needs a designID). Mirrors the U-9 detail-page wiring.
  const uploadAsset = async (field, file) => {
    if (!file || !isEdit) return;
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('field', field);
      const res = await fetch(`/api/production/designs/${design.designID}/assets`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Upload failed');
      onReloaded?.();
    } catch (e) { onError?.(e.message); }
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={8}>
        <Section title="Details">
          <Stack spacing={2}>
            <TextField label="Name" value={form.name} onChange={set('name')} size="small" fullWidth required autoFocus />
            <TextField label="Description" value={form.description} onChange={set('description')} size="small" fullWidth multiline minRows={3} />
          </Stack>
        </Section>

        <Section title="CAD & estimate">
          <Stack spacing={2}>
            <TextField label="CAD volume (cm³) — optional" type="number" value={form.stlVolumeCm3} onChange={set('stlVolumeCm3')} size="small" fullWidth
              helperText="From the STL. Leave blank for a handmade / no-CAD design." />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button onClick={previewEstimate} disabled={estimating || !form.stlVolumeCm3} startIcon={<CalculateIcon />} variant="outlined" sx={{ color: REPAIRS_UI.accent, borderColor: REPAIRS_UI.border }}>
                {estimating ? 'Estimating…' : 'Preview estimate'}
              </Button>
              {estimate && (
                <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 600 }}>
                  est {money(estimate.estCost)} <Typography component="span" sx={{ color: REPAIRS_UI.textMuted, fontSize: '0.8rem' }}>(metal {money(estimate.metal?.metalCost)})</Typography>
                </Typography>
              )}
            </Box>
            {isEdit ? (
              <>
                <Divider sx={{ borderColor: REPAIRS_UI.border }} />
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography sx={{ color: REPAIRS_UI.textSecondary, fontSize: '0.9rem' }}>CAD / STL files ({design.cadFiles?.length || 0})</Typography>
                  <Button size="small" component="label" variant="contained" startIcon={<UploadFileIcon />} sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, '&:hover': { backgroundColor: '#C19B2E' } }}>
                    Upload
                    <input type="file" hidden accept=".stl,.obj,.glb,.3dm,.zip" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAsset('cadFiles', f); if (e.target) e.target.value = ''; }} />
                  </Button>
                </Stack>
                {(design.cadFiles || []).map((u, i) => (
                  <Stack key={i} direction="row" alignItems="center" spacing={1.5} sx={{ p: 1, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 1 }}>
                    <DescriptionIcon sx={{ color: REPAIRS_UI.textMuted }} />
                    <Typography sx={{ flex: 1, minWidth: 0, color: REPAIRS_UI.textPrimary, fontSize: '0.85rem' }} noWrap>{fileName(u)}</Typography>
                    <IconButton component="a" href={u} target="_blank" rel="noopener noreferrer" download size="small" sx={{ color: REPAIRS_UI.accent }} aria-label="Download"><DownloadIcon fontSize="small" /></IconButton>
                  </Stack>
                ))}
              </>
            ) : (
              <Typography sx={{ color: REPAIRS_UI.textMuted, fontSize: '0.82rem' }}>Save the design first, then upload CAD/STL + media on its detail page.</Typography>
            )}
          </Stack>
        </Section>

        {isEdit && (
          <Section title="Media">
            <EntityGallery
              title="Media"
              images={[...(design.referenceImages || []), ...(design.renders || [])].map(asImage)}
              onUpload={(file) => uploadAsset('referenceImages', file)}
              cols={4}
              emptyText="No reference images or renders yet. Upload one."
            />
          </Section>
        )}
      </Grid>

      <Grid item xs={12} md={4}>
        <Section title="Settings">
          <Stack spacing={2}>
            {isEdit && (
              <FormControl size="small" fullWidth>
                <InputLabel>Status</InputLabel>
                <Select value={form.status} label="Status" onChange={set('status')} MenuProps={repairsMenuProps}>
                  {STATUS_OPTIONS.map((s) => <MenuItem key={s} value={s}>{s.replace(/_/g, ' ')}</MenuItem>)}
                </Select>
              </FormControl>
            )}
            <FormControl size="small" fullWidth>
              <InputLabel>Metal</InputLabel>
              <Select value={form.metalKey} label="Metal" onChange={set('metalKey')} MenuProps={repairsMenuProps}>
                {METAL_KEYS.map((m) => <MenuItem key={m.key} value={m.key}>{m.label}</MenuItem>)}
              </Select>
            </FormControl>
            <Autocomplete
              size="small"
              options={gems}
              getOptionLabel={gemLabel}
              isOptionEqualToValue={(o, v) => o?.productId === v?.productId}
              value={gems.find((g) => g.productId === form.gemstoneId) || null}
              onChange={(_, opt) => setForm((f) => ({ ...f, gemstoneId: opt?.productId || '' }))}
              renderInput={(params) => (
                <TextField {...params} label="Gemstone link — optional" helperText="Links this design to its originating stone (the flywheel)." />
              )}
            />
            {isEdit && (
              <Box>
                <Typography sx={{ fontSize: '0.72rem', color: REPAIRS_UI.textMuted, textTransform: 'uppercase' }}>Design ID</Typography>
                <Typography sx={{ color: REPAIRS_UI.textSecondary, fontFamily: 'monospace', fontSize: '0.8rem' }}>{design.designID}</Typography>
              </Box>
            )}
          </Stack>
        </Section>
        <Button onClick={save} disabled={saving} variant="contained" fullWidth sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, '&:hover': { backgroundColor: '#C19B2E' } }}>
          {saving ? 'Saving…' : (isEdit ? 'Save changes' : 'Create design')}
        </Button>
      </Grid>
    </Grid>
  );
}
