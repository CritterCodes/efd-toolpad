'use client';

/**
 * U-13 — full-page piece form (two-column), replacing `CreatePieceDialog`. Shared by
 * `pieces/new` (create) and `pieces/[pieceID]/edit` (edit).
 *
 * Main: (create) source toggle + design link + optional initial materials seed; (edit) Media gallery.
 * Sidebar: metal / karat / SKU (+ status in edit) + design-link display.
 *
 * The piece PUT (`updateById`) blind-`$set`s the body (no whitelist) — so edit sends only a curated
 * subset (metalType/karat/sku/status), a safe partial `$set` that never clobbers actualMaterials/costs.
 */

import React, { useState } from 'react';
import {
  Box, Grid, Card, CardContent, Stack, Typography, TextField, FormControl, InputLabel,
  Select, MenuItem, Button, ToggleButton, ToggleButtonGroup, Table, TableBody, TableCell,
  TableHead, TableRow, Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { REPAIRS_UI, repairsMenuProps } from '@/app/dashboard/repairs/components/repairsUi';
import EntityGallery from '@/components/production/media/EntityGallery';

const STATUS_OPTIONS = ['planned', 'casting_ordered', 'in_finishing', 'qc', 'completed', 'available', 'reserved', 'sold', 'scrapped', 'returned'];
const money = (n) => `$${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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

export default function PieceForm({ mode = 'new', piece = null, onSaved, onError, onReloaded }) {
  const isEdit = mode === 'edit' && Boolean(piece?.pieceID);
  const [form, setForm] = useState({
    source: piece?.designID ? 'design' : 'handmade',
    designID: piece?.designID || '',
    metalType: piece?.metalType || '',
    karat: piece?.karat || '',
    sku: piece?.sku || '',
    status: piece?.status || 'planned',
  });
  const [materials, setMaterials] = useState([]); // create-only seed
  const [matDraft, setMatDraft] = useState({ description: '', qty: '1', unitCost: '' });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const addMaterial = () => {
    if (!matDraft.unitCost) { onError?.('Material unit cost is required.'); return; }
    setMaterials((list) => [...list, { description: matDraft.description, qty: Number(matDraft.qty) || 1, unitCost: Number(matDraft.unitCost) }]);
    setMatDraft({ description: '', qty: '1', unitCost: '' });
  };
  const removeMaterial = (i) => setMaterials((list) => list.filter((_, idx) => idx !== i));

  const save = async () => {
    if (form.source === 'design' && !form.designID.trim()) { onError?.('Design ID is required for a design-based piece.'); return; }
    setSaving(true);
    try {
      let url; let method; let body;
      if (isEdit) {
        url = `/api/production/pieces/${piece.pieceID}`;
        method = 'PUT';
        body = { metalType: form.metalType || null, karat: form.karat || null, sku: form.sku || null, status: form.status };
      } else {
        url = '/api/production/pieces';
        method = 'POST';
        body = {
          metalType: form.metalType || null,
          karat: form.karat || null,
          sku: form.sku || null,
          ...(form.source === 'design' ? { designID: form.designID.trim() } : {}),
          ...(materials.length ? { actualMaterials: materials } : {}),
        };
      }
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Save failed');
      onSaved?.(await res.json());
    } catch (e) { onError?.(e.message); } finally { setSaving(false); }
  };

  // Media (edit only — needs a pieceID). Wired to the U-4 piece images route (upload + delete).
  const uploadImage = async (file) => {
    if (!file || !isEdit) return;
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`/api/production/pieces/${piece.pieceID}/images`, { method: 'POST', body: fd });
    if (!res.ok) { onError?.((await res.json().catch(() => ({}))).error || 'Upload failed'); return; }
    onReloaded?.();
  };
  const deleteImage = async (imageId) => {
    const res = await fetch(`/api/production/pieces/${piece.pieceID}/images/${imageId}`, { method: 'DELETE' });
    if (!res.ok) { onError?.((await res.json().catch(() => ({}))).error || 'Delete failed'); return; }
    onReloaded?.();
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={8}>
        {!isEdit && (
          <Section title="Source">
            <Stack spacing={2}>
              <ToggleButtonGroup exclusive size="small" value={form.source} onChange={(_, v) => v && setForm((f) => ({ ...f, source: v }))} sx={{ alignSelf: 'flex-start' }}>
                <ToggleButton value="handmade" sx={{ color: REPAIRS_UI.textSecondary, '&.Mui-selected': { color: REPAIRS_UI.accent } }}>Handmade (no design)</ToggleButton>
                <ToggleButton value="design" sx={{ color: REPAIRS_UI.textSecondary, '&.Mui-selected': { color: REPAIRS_UI.accent } }}>From design</ToggleButton>
              </ToggleButtonGroup>
              {form.source === 'design' && (
                <TextField label="Design ID" value={form.designID} onChange={set('designID')} size="small" fullWidth
                  helperText="Spawns routed work orders from the design's routing." />
              )}
              <Typography sx={{ color: REPAIRS_UI.textMuted, fontSize: '0.8rem' }}>
                A bench work order is spawned automatically. COGS rolls up from materials + labor logged on the bench.
              </Typography>
            </Stack>
          </Section>
        )}

        {!isEdit && (
          <Section title="Initial materials (optional)">
            {materials.length > 0 && (
              <Table size="small" sx={{ mb: 2 }}>
                <TableHead><TableRow>
                  <TableCell sx={{ color: REPAIRS_UI.textMuted }}>Description</TableCell>
                  <TableCell align="right" sx={{ color: REPAIRS_UI.textMuted }}>Qty</TableCell>
                  <TableCell align="right" sx={{ color: REPAIRS_UI.textMuted }}>Unit</TableCell>
                  <TableCell align="right" sx={{ color: REPAIRS_UI.textMuted }}>Line</TableCell>
                  <TableCell />
                </TableRow></TableHead>
                <TableBody>
                  {materials.map((m, i) => (
                    <TableRow key={i}>
                      <TableCell sx={{ color: REPAIRS_UI.textPrimary }}>{m.description || '—'}</TableCell>
                      <TableCell align="right" sx={{ color: REPAIRS_UI.textPrimary }}>{m.qty}</TableCell>
                      <TableCell align="right" sx={{ color: REPAIRS_UI.textPrimary }}>{money(m.unitCost)}</TableCell>
                      <TableCell align="right" sx={{ color: REPAIRS_UI.textPrimary }}>{money((Number(m.unitCost) || 0) * (Number(m.qty) || 1))}</TableCell>
                      <TableCell align="right"><Button size="small" onClick={() => removeMaterial(i)} sx={{ color: REPAIRS_UI.textMuted, minWidth: 0 }}><DeleteOutlineIcon fontSize="small" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
              <TextField label="Material description" value={matDraft.description} onChange={(e) => setMatDraft((s) => ({ ...s, description: e.target.value }))} size="small" sx={{ flex: 2 }} />
              <TextField label="Qty" type="number" value={matDraft.qty} onChange={(e) => setMatDraft((s) => ({ ...s, qty: e.target.value }))} size="small" sx={{ width: 90 }} />
              <TextField label="Unit cost" type="number" value={matDraft.unitCost} onChange={(e) => setMatDraft((s) => ({ ...s, unitCost: e.target.value }))} size="small" sx={{ width: 120 }} />
              <Button onClick={addMaterial} startIcon={<AddIcon />} sx={{ color: REPAIRS_UI.accent, border: `1px solid ${REPAIRS_UI.border}`, textTransform: 'none' }}>Add</Button>
            </Stack>
            <Typography sx={{ color: REPAIRS_UI.textMuted, fontSize: '0.78rem', mt: 1 }}>Optional — you can also add materials on the piece detail page after creating.</Typography>
          </Section>
        )}

        {isEdit && (
          <Section title="Media">
            <EntityGallery
              title="Media"
              images={Array.isArray(piece.images) ? piece.images : []}
              onUpload={uploadImage}
              onDelete={deleteImage}
              cols={4}
              emptyText="No images yet. Upload one."
            />
            <Divider sx={{ borderColor: REPAIRS_UI.border, my: 2 }} />
            <Typography sx={{ color: REPAIRS_UI.textMuted, fontSize: '0.8rem' }}>Materials + COGS are managed on the piece detail page (they roll up from bench work orders).</Typography>
          </Section>
        )}
      </Grid>

      <Grid item xs={12} md={4}>
        <Section title="Piece">
          <Stack spacing={2}>
            <TextField label="SKU — optional" value={form.sku} onChange={set('sku')} size="small" fullWidth />
            <TextField label="Metal" value={form.metalType} onChange={set('metalType')} size="small" fullWidth placeholder="e.g. gold" />
            <TextField label="Karat" value={form.karat} onChange={set('karat')} size="small" fullWidth placeholder="e.g. 14k" />
            {isEdit && (
              <FormControl size="small" fullWidth>
                <InputLabel>Status</InputLabel>
                <Select value={form.status} label="Status" onChange={set('status')} MenuProps={repairsMenuProps}>
                  {STATUS_OPTIONS.map((s) => <MenuItem key={s} value={s}>{s.replace(/_/g, ' ')}</MenuItem>)}
                </Select>
              </FormControl>
            )}
            {isEdit && piece.designID && (
              <Box>
                <Typography sx={{ fontSize: '0.72rem', color: REPAIRS_UI.textMuted, textTransform: 'uppercase' }}>Design</Typography>
                <Typography sx={{ color: REPAIRS_UI.textSecondary, fontFamily: 'monospace', fontSize: '0.8rem' }}>{piece.designID}</Typography>
              </Box>
            )}
            {isEdit && (
              <Box>
                <Typography sx={{ fontSize: '0.72rem', color: REPAIRS_UI.textMuted, textTransform: 'uppercase' }}>Piece ID</Typography>
                <Typography sx={{ color: REPAIRS_UI.textSecondary, fontFamily: 'monospace', fontSize: '0.8rem' }}>{piece.pieceID}</Typography>
              </Box>
            )}
          </Stack>
        </Section>
        <Button onClick={save} disabled={saving} variant="contained" fullWidth sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, '&:hover': { backgroundColor: '#C19B2E' } }}>
          {saving ? 'Saving…' : (isEdit ? 'Save changes' : 'Create piece')}
        </Button>
      </Grid>
    </Grid>
  );
}
