'use client';

// U-13 — full-page Edit Piece form (edit mode of the shared PieceForm).
// PieceForm sends only a curated subset on edit (metalType/karat/sku/status) — the piece PUT
// (updateById) blind-$sets the body with no whitelist, so we never round-trip the whole GET doc.

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Box, Typography, Button, Snackbar, Alert, CircularProgress } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';
import PieceForm from '@/components/production/PieceForm';

export default function EditPiecePage() {
  const { pieceID } = useParams();
  const router = useRouter();
  const [piece, setPiece] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });
  const showSnack = (message, severity = 'success') => setSnack({ open: true, message, severity });

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/production/pieces/${pieceID}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to load piece');
      setPiece(data); setError(null);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [pieceID]);

  useEffect(() => { load(); }, [load]);

  const backToDetail = () => router.push(`/dashboard/production/pieces/${pieceID}`);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress sx={{ color: REPAIRS_UI.accent }} /></Box>;
  if (error || !piece) {
    return (
      <Box sx={{ p: 4 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/dashboard/production/pieces')} sx={{ color: REPAIRS_UI.textSecondary, mb: 2 }}>Back to pieces</Button>
        <Typography color="error">{error || 'Piece not found.'}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 6 }}>
      <Button startIcon={<ArrowBackIcon />} onClick={backToDetail} sx={{ color: REPAIRS_UI.textSecondary, mb: 2 }}>Back to piece</Button>

      <Box sx={{ backgroundColor: { xs: 'transparent', sm: REPAIRS_UI.bgPanel }, border: { xs: 'none', sm: `1px solid ${REPAIRS_UI.border}` }, borderRadius: { xs: 0, sm: 3 }, boxShadow: { xs: 'none', sm: REPAIRS_UI.shadow }, p: { xs: 0.5, sm: 2.5, md: 3 }, mb: 3 }}>
        <Typography sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, px: 1.25, py: 0.5, mb: 1.5, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', color: REPAIRS_UI.textPrimary, backgroundColor: REPAIRS_UI.bgCard, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, textTransform: 'uppercase' }}>
          <PrecisionManufacturingIcon sx={{ fontSize: 16, color: REPAIRS_UI.accent }} />
          Edit Piece
        </Typography>
        <Typography sx={{ fontSize: { xs: 24, md: 32 }, fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 1 }}>{piece.sku || piece.pieceID}</Typography>
        <Typography sx={{ color: REPAIRS_UI.textSecondary, lineHeight: 1.6, maxWidth: 720 }}>
          Update SKU, metal, status; upload media. Materials + COGS are managed on the piece detail page.
        </Typography>
      </Box>

      <PieceForm
        mode="edit"
        piece={piece}
        onSaved={(updated) => { showSnack('Saved.'); if (updated?.pieceID) setPiece(updated); }}
        onError={(m) => showSnack(m, 'error')}
        onReloaded={load}
      />

      <Snackbar open={snack.open} autoHideDuration={5000} onClose={() => setSnack((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnack((s) => ({ ...s, open: false }))} severity={snack.severity} sx={{ backgroundColor: REPAIRS_UI.bgCard, color: REPAIRS_UI.textPrimary, border: `1px solid ${REPAIRS_UI.border}` }}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}
