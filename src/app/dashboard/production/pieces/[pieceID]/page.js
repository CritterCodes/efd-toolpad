'use client';

/**
 * Piece detail — wires the orphaned Piece lifecycle routes (tech-debt #187 🟠): a piece's status,
 * materials, COGS recompute, and list-as-product were UI-unreachable (PieceCard was a dead end).
 * Mirrors the design detail page (M3-T6) + M2 editor archetype.
 */

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Box, Typography, Button, Card, CardContent, Stack, Chip, CircularProgress, Divider, Alert,
  Table, TableBody, TableCell, TableHead, TableRow, TextField, Snackbar,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import CalculateIcon from '@mui/icons-material/Calculate';
import SellIcon from '@mui/icons-material/Sell';
import AddIcon from '@mui/icons-material/Add';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';
import EntityGallery from '@/components/production/media/EntityGallery';

const money = (n) => `$${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const STATUS_COLOR = { planned: REPAIRS_UI.textMuted, casting_ordered: '#64B5F6', in_finishing: '#FFB74D', qc: '#BA68C8', available: '#66BB6A', sold: REPAIRS_UI.textMuted };

export default function PieceDetailPage() {
  const { pieceID } = useParams();
  const router = useRouter();
  const [piece, setPiece] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [mat, setMat] = useState({ description: '', qty: '1', unitCost: '' });
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });
  const showSnack = (message, severity = 'success') => setSnack({ open: true, message, severity });

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/production/pieces/${pieceID}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to load piece');
      setPiece(data);
      setError(null);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [pieceID]);

  useEffect(() => { load(); }, [load]);

  const back = useCallback(() => router.push('/dashboard/production/pieces'), [router]);

  const act = async (label, fn) => {
    setBusy(true);
    try { await fn(); await load(); showSnack(`${label} done.`); }
    catch (e) { showSnack(e.message, 'error'); }
    finally { setBusy(false); }
  };

  const post = async (suffix, body) => {
    const res = await fetch(`/api/production/pieces/${pieceID}/${suffix}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `${suffix} failed`);
    return data;
  };

  const recompute = () => act('Recompute COGS', () => post('recompute'));
  const listProduct = () => act('List as product', () => post('list-product'));
  const addMaterial = () => {
    if (!mat.unitCost) { showSnack('Unit cost is required.', 'error'); return; }
    act('Add material', async () => { await post('materials', { description: mat.description, qty: Number(mat.qty) || 1, unitCost: Number(mat.unitCost) }); setMat({ description: '', qty: '1', unitCost: '' }); });
  };

  // U-10 — piece Media gallery via the U-4 images route (upload + delete; returns the image sub-doc).
  const uploadImage = async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`/api/production/pieces/${pieceID}/images`, { method: 'POST', body: fd });
    if (!res.ok) { showSnack((await res.json().catch(() => ({}))).error || 'Upload failed', 'error'); return; }
    showSnack('Image uploaded.'); await load();
  };
  const deleteImage = async (imageId) => {
    const res = await fetch(`/api/production/pieces/${pieceID}/images/${imageId}`, { method: 'DELETE' });
    if (!res.ok) { showSnack((await res.json().catch(() => ({}))).error || 'Delete failed', 'error'); return; }
    showSnack('Image removed.'); await load();
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress sx={{ color: REPAIRS_UI.accent }} /></Box>;
  if (error || !piece) {
    return (
      <Box sx={{ p: 4 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={back} sx={{ color: REPAIRS_UI.textSecondary, mb: 2 }}>Back to pieces</Button>
        <Typography color="error">{error || 'Piece not found.'}</Typography>
      </Box>
    );
  }

  const p = piece;
  const materials = Array.isArray(p.actualMaterials) ? p.actualMaterials : [];
  const listed = Boolean(p.productID);

  return (
    <Box sx={{ pb: 6 }}>
      <Button startIcon={<ArrowBackIcon />} onClick={back} sx={{ color: REPAIRS_UI.textSecondary, mb: 2 }}>Back to pieces</Button>

      <Box sx={{ backgroundColor: REPAIRS_UI.bgPanel, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 3, p: { xs: 2, md: 3 }, mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip size="small" label={(p.status || 'planned').replace(/_/g, ' ')} sx={{ backgroundColor: `${STATUS_COLOR[p.status] || REPAIRS_UI.textMuted}22`, color: STATUS_COLOR[p.status] || REPAIRS_UI.textMuted, textTransform: 'capitalize', fontWeight: 700 }} />
            {listed && <Chip size="small" label={`Listed · ${p.productID}`} sx={{ backgroundColor: REPAIRS_UI.bgTertiary, color: '#66BB6A', border: `1px solid ${REPAIRS_UI.border}` }} />}
          </Stack>
          <Button component={Link} href={`/dashboard/production/pieces/${p.pieceID}/edit`} startIcon={<EditIcon sx={{ fontSize: 16 }} />} variant="outlined" size="small" sx={{ color: REPAIRS_UI.accent, borderColor: REPAIRS_UI.border, textTransform: 'none' }}>Edit</Button>
        </Stack>
        <Typography sx={{ fontSize: { xs: 24, md: 30 }, fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 0.5 }}>{p.sku || p.pieceID}</Typography>
        <Stack direction="row" spacing={3} sx={{ mt: 2, flexWrap: 'wrap' }}>
          <Box><Typography sx={{ fontSize: '0.72rem', color: REPAIRS_UI.textMuted, textTransform: 'uppercase' }}>COGS</Typography><Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 700 }}>{money(p.totalCOGS)}</Typography></Box>
          <Box><Typography sx={{ fontSize: '0.72rem', color: REPAIRS_UI.textMuted, textTransform: 'uppercase' }}>Metal</Typography><Typography sx={{ color: REPAIRS_UI.textHeader }}>{[p.karat, p.metalType].filter(Boolean).join(' ') || '—'}</Typography></Box>
          <Box><Typography sx={{ fontSize: '0.72rem', color: REPAIRS_UI.textMuted, textTransform: 'uppercase' }}>Work orders</Typography><Typography sx={{ color: REPAIRS_UI.textHeader }}>{Array.isArray(p.workOrderIDs) ? p.workOrderIDs.length : 0}</Typography></Box>
          {p.designID && <Box><Typography sx={{ fontSize: '0.72rem', color: REPAIRS_UI.textMuted, textTransform: 'uppercase' }}>Design</Typography><Typography component={Link} href={`/dashboard/production/designs/${p.designID}`} sx={{ color: REPAIRS_UI.accent, fontSize: '0.85rem', fontFamily: 'monospace', textDecoration: 'none' }}>{p.designID}</Typography></Box>}
        </Stack>
      </Box>

      <Card sx={{ backgroundColor: REPAIRS_UI.bgCard, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, mb: 3 }}>
        <CardContent>
          <Typography sx={{ fontSize: 17, fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 1.5 }}>Lifecycle actions</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button onClick={recompute} disabled={busy} startIcon={<CalculateIcon />} variant="outlined" sx={{ color: REPAIRS_UI.accent, borderColor: REPAIRS_UI.border }}>Recompute COGS</Button>
            <Button onClick={listProduct} disabled={busy || listed} startIcon={<SellIcon />} variant="contained" sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, '&:hover': { backgroundColor: '#C19B2E' } }}>
              {listed ? 'Already listed' : 'List as product'}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ backgroundColor: REPAIRS_UI.bgCard, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2 }}>
        <CardContent>
          <Typography sx={{ fontSize: 17, fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 1 }}>Materials (at cost)</Typography>
          {materials.length === 0 ? (
            <Typography sx={{ color: REPAIRS_UI.textSecondary, fontSize: '0.88rem', mb: 2 }}>No material lines yet. Bench labor + these roll up into COGS.</Typography>
          ) : (
            <Table size="small" sx={{ mb: 2 }}>
              <TableHead><TableRow>
                <TableCell sx={{ color: REPAIRS_UI.textMuted }}>Description</TableCell>
                <TableCell align="right" sx={{ color: REPAIRS_UI.textMuted }}>Qty</TableCell>
                <TableCell align="right" sx={{ color: REPAIRS_UI.textMuted }}>Unit</TableCell>
                <TableCell align="right" sx={{ color: REPAIRS_UI.textMuted }}>Line</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {materials.map((m, i) => (
                  <TableRow key={i}>
                    <TableCell sx={{ color: REPAIRS_UI.textPrimary }}>{m.description || m.materialID || '—'}</TableCell>
                    <TableCell align="right" sx={{ color: REPAIRS_UI.textPrimary }}>{m.qty ?? 1}</TableCell>
                    <TableCell align="right" sx={{ color: REPAIRS_UI.textPrimary }}>{money(m.unitCost)}</TableCell>
                    <TableCell align="right" sx={{ color: REPAIRS_UI.textPrimary }}>{money((Number(m.unitCost) || 0) * (Number(m.qty) || 1))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <Divider sx={{ borderColor: REPAIRS_UI.border, mb: 2 }} />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
            <TextField label="Material description" value={mat.description} onChange={(e) => setMat((s) => ({ ...s, description: e.target.value }))} size="small" sx={{ flex: 2 }} />
            <TextField label="Qty" type="number" value={mat.qty} onChange={(e) => setMat((s) => ({ ...s, qty: e.target.value }))} size="small" sx={{ width: 90 }} />
            <TextField label="Unit cost" type="number" value={mat.unitCost} onChange={(e) => setMat((s) => ({ ...s, unitCost: e.target.value }))} size="small" sx={{ width: 120 }} />
            <Button onClick={addMaterial} disabled={busy} startIcon={<AddIcon />} sx={{ color: REPAIRS_UI.accent, border: `1px solid ${REPAIRS_UI.border}`, textTransform: 'none' }}>Add</Button>
          </Stack>
        </CardContent>
      </Card>

      {/* U-10 — Media gallery via the U-4 piece images route (upload + delete). */}
      <Card sx={{ mt: 3, backgroundColor: REPAIRS_UI.bgCard, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2 }}>
        <CardContent>
          <EntityGallery
            title="Media"
            images={Array.isArray(p.images) ? p.images : []}
            onUpload={uploadImage}
            onDelete={deleteImage}
            cols={4}
            emptyText="No images yet. Upload one."
          />
        </CardContent>
      </Card>

      <Snackbar open={snack.open} autoHideDuration={5000} onClose={() => setSnack((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnack((s) => ({ ...s, open: false }))} severity={snack.severity} sx={{ backgroundColor: REPAIRS_UI.bgCard, color: REPAIRS_UI.textPrimary, border: `1px solid ${REPAIRS_UI.border}` }}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}
