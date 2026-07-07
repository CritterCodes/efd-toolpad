'use client';

/**
 * Shared polymorphic-catalog pieces (0008 C-1): the ProductCard + the M4-T1 edit dialog + helpers,
 * reused by BOTH the pipeline Products list (`dashboard/production/products`) and the unified catalog
 * list (`dashboard/products`, C-1). One editor, one card — so the consolidation doesn't duplicate them.
 */

import React, { useEffect, useState } from 'react';
import {
  Box, Card, CardContent, Stack, Chip, Typography, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, FormControl, InputLabel, Select, MenuItem, InputAdornment, Divider,
} from '@mui/material';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import ImageIcon from '@mui/icons-material/Image';
import DiamondIcon from '@mui/icons-material/AutoAwesome';
import EditIcon from '@mui/icons-material/Edit';
import { REPAIRS_UI, repairsMenuProps } from '@/app/dashboard/repairs/components/repairsUi';
import EntityThumbnail from '@/components/production/media/EntityThumbnail';
import EntityGallery from '@/components/production/media/EntityGallery';

/** Primary image (or first) of a product's images[] — the card thumbnail source (U-6). */
export const primaryImageOf = (p) => {
  const imgs = Array.isArray(p?.images) ? p.images : [];
  return imgs.find((i) => i?.isPrimary) || imgs[0] || null;
};

export const money = (n) => `$${(Number(n) || 0).toLocaleString()}`;
export const TYPE_COLOR = { gemstone: '#BA68C8', concept: '#64B5F6', jewelry: REPAIRS_UI.accent };
export const STATUS_COLOR = { draft: REPAIRS_UI.textMuted, pending: '#FFB74D', 'pending-approval': '#FFB74D', published: '#66BB6A', unpublished: REPAIRS_UI.textMuted, rejected: '#E57373' };

export const priceOf = (p) => p?.pricing?.retailPrice ?? p?.price ?? null;
export const typeOf = (p) => p?.productType || 'jewelry';

export function runSizeLabel(rs) {
  if (!rs || rs.type === 'unlimited') return 'Made to order';
  if (rs.type === 'one_of_one') return 'One of one';
  if (rs.type === 'limited') return rs.remaining != null ? `Edition of ${rs.size} · ${rs.remaining} left` : `Edition of ${rs.size}`;
  return 'Made to order';
}

// Lightweight client readiness hint (the AUTHORITATIVE gate is server-side at release, M4-T2/#203).
export function readinessHint(p) {
  const issues = [];
  if (!p.title) issues.push('title');
  if (typeof priceOf(p) !== 'number') issues.push('price');
  if (!p.viewer && !(Array.isArray(p.images) && p.images.length)) issues.push('media');
  return issues;
}

export function ProductCard({ product, onEdit, onStatusAction }) {
  const p = product;
  const type = typeOf(p);
  const issues = readinessHint(p);
  // C-2: awaiting-approval review folded into the catalog — approve/reject/publish appear per-row for
  // artisan-submitted products, only when the host wires `onStatusAction` (the unified catalog does).
  const pending = p.status === 'pending-approval';
  return (
    <Card sx={{ height: '100%', backgroundColor: REPAIRS_UI.bgCard, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2 }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
          <Chip size="small" label={type} sx={{ backgroundColor: `${TYPE_COLOR[type] || REPAIRS_UI.accent}22`, color: TYPE_COLOR[type] || REPAIRS_UI.accent, textTransform: 'capitalize', fontWeight: 700 }} />
          <Chip size="small" label={(p.status || 'draft').replace(/_/g, ' ')} sx={{ backgroundColor: `${STATUS_COLOR[p.status] || REPAIRS_UI.textMuted}22`, color: STATUS_COLOR[p.status] || REPAIRS_UI.textMuted, textTransform: 'capitalize', fontWeight: 700 }} />
        </Stack>
        <Stack direction="row" spacing={1.25} alignItems="flex-start" sx={{ mb: 1 }}>
          <EntityThumbnail image={primaryImageOf(p)} size={56} />
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{ fontSize: 17, fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 0.25 }} noWrap>{p.title || p.name || 'Untitled product'}</Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 700 }}>{priceOf(p) != null ? money(priceOf(p)) : '—'}</Typography>
              <Typography sx={{ color: REPAIRS_UI.textMuted, fontSize: '0.8rem' }} noWrap>· {runSizeLabel(p.runSize)}</Typography>
            </Stack>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
          {p.viewer && <Chip size="small" icon={<ViewInArIcon sx={{ fontSize: 14 }} />} label="3D" sx={{ backgroundColor: REPAIRS_UI.bgTertiary, color: REPAIRS_UI.textSecondary, border: `1px solid ${REPAIRS_UI.border}` }} />}
          {Array.isArray(p.images) && p.images.length > 0 && <Chip size="small" icon={<ImageIcon sx={{ fontSize: 14 }} />} label={p.images.length} sx={{ backgroundColor: REPAIRS_UI.bgTertiary, color: REPAIRS_UI.textSecondary, border: `1px solid ${REPAIRS_UI.border}` }} />}
          {p.references?.gemstoneId && <Chip size="small" icon={<DiamondIcon sx={{ fontSize: 14 }} />} label="Gem" sx={{ backgroundColor: REPAIRS_UI.bgTertiary, color: REPAIRS_UI.accent, border: `1px solid ${REPAIRS_UI.border}` }} />}
        </Stack>
        {issues.length > 0
          ? <Typography sx={{ fontSize: '0.76rem', color: '#E57373', mb: 1 }}>Not stage-ready: missing {issues.join(', ')}</Typography>
          : <Typography sx={{ fontSize: '0.76rem', color: '#66BB6A', mb: 1 }}>Looks stage-ready ✓</Typography>}
        <Button size="small" fullWidth onClick={() => onEdit(p)} startIcon={<EditIcon sx={{ fontSize: 15 }} />}
          sx={{ color: REPAIRS_UI.accent, textTransform: 'none', fontSize: '0.8rem', border: `1px solid ${REPAIRS_UI.border}` }}>
          Edit price &amp; run size
        </Button>
        {pending && onStatusAction && (
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <Button size="small" fullWidth onClick={() => onStatusAction(p, 'approve')} sx={{ color: '#66BB6A', textTransform: 'none', fontSize: '0.78rem', border: '1px solid #66BB6A55' }}>Approve</Button>
            <Button size="small" fullWidth onClick={() => onStatusAction(p, 'reject')} sx={{ color: '#E57373', textTransform: 'none', fontSize: '0.78rem', border: '1px solid #E5737355' }}>Reject</Button>
            <Button size="small" fullWidth onClick={() => onStatusAction(p, 'publish')} sx={{ color: REPAIRS_UI.accent, textTransform: 'none', fontSize: '0.78rem', border: `1px solid ${REPAIRS_UI.border}` }}>Publish</Button>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

export function EditProductDialog({ product, onClose, onSaved, onError }) {
  const open = Boolean(product);
  const [retailPrice, setRetailPrice] = useState('');
  const [runType, setRunType] = useState('unlimited');
  const [size, setSize] = useState('');
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState([]); // U-6: live product media

  useEffect(() => {
    if (!product) return;
    setRetailPrice(priceOf(product) != null ? String(priceOf(product)) : '');
    setRunType(product.runSize?.type || 'unlimited');
    setSize(product.runSize?.size != null ? String(product.runSize.size) : '');
    setImages(Array.isArray(product.images) ? product.images : []);
  }, [product]);

  // U-6 media (wired to the U-4 /api/products/[_id]/images routes). Local state keeps the gallery live;
  // the list reload on Save/close persists the change into the cards' thumbnails.
  const uploadImage = async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`/api/products/${product._id}/images`, { method: 'POST', body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { onError(data.error || 'Image upload failed'); return; }
    setImages((prev) => [...prev, data]);
  };
  const deleteImage = async (id) => {
    const res = await fetch(`/api/products/${product._id}/images/${id}`, { method: 'DELETE' });
    if (!res.ok) { onError((await res.json().catch(() => ({}))).error || 'Image delete failed'); return; }
    setImages((prev) => prev.filter((i) => i.id !== id));
  };

  const submit = async () => {
    const price = Number(retailPrice);
    if (!Number.isFinite(price) || price < 0) { onError('Enter a valid retail price.'); return; }
    let runSize = { type: runType };
    if (runType === 'limited') {
      const n = Math.floor(Number(size));
      if (!Number.isInteger(n) || n < 1) { onError('Edition size must be a positive integer.'); return; }
      const produced = Math.max(0, (product.runSize?.size ?? n) - (product.runSize?.remaining ?? n));
      runSize = { type: 'limited', size: n, remaining: Math.max(0, n - produced) };
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/products/${product._id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pricing: { ...(product.pricing || {}), retailPrice: price }, runSize }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Save failed');
      onSaved();
    } catch (e) { onError(e.message); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm"
      PaperProps={{ sx: { backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}` } }}>
      <DialogTitle sx={{ color: REPAIRS_UI.textHeader }}>Edit {product?.title || 'product'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Retail price (USD)" type="number" value={retailPrice} onChange={(e) => setRetailPrice(e.target.value)} size="small" fullWidth
            InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
          <FormControl size="small" fullWidth>
            <InputLabel>Run size</InputLabel>
            <Select value={runType} label="Run size" onChange={(e) => setRunType(e.target.value)} MenuProps={repairsMenuProps}>
              <MenuItem value="unlimited">Made to order (unlimited)</MenuItem>
              <MenuItem value="one_of_one">One of one</MenuItem>
              <MenuItem value="limited">Limited edition</MenuItem>
            </Select>
          </FormControl>
          {runType === 'limited' && (
            <TextField label="Edition size" type="number" value={size} onChange={(e) => setSize(e.target.value)} size="small" fullWidth
              helperText="remaining is recomputed from units already produced." />
          )}
          <Divider sx={{ borderColor: REPAIRS_UI.border }} />
          {/* U-6: product media — the headline catalog gap. Uploads via the U-4 images route. */}
          <EntityGallery images={images} onUpload={product?._id ? uploadImage : undefined} onDelete={product?._id ? deleteImage : undefined}
            title="Product images" cols={3} emptyText="No product images. Upload photos for the catalog thumbnail + product page." />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ color: REPAIRS_UI.textSecondary }}>Cancel</Button>
        <Button onClick={submit} disabled={saving} variant="contained" sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, '&:hover': { backgroundColor: '#C19B2E' } }}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
