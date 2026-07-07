'use client';

// U-12 — full-page Edit Design form (edit mode of the shared DesignForm).
// Note: DesignForm sends only a curated field subset (safe partial $set) — the design PUT
// (updateById) blind-$sets the body with no whitelist, so we never round-trip the whole GET doc.

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Box, Typography, Button, Snackbar, Alert, CircularProgress } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DesignServicesIcon from '@mui/icons-material/DesignServices';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';
import DesignForm from '@/components/production/DesignForm';

export default function EditDesignPage() {
  const { designID } = useParams();
  const router = useRouter();
  const [design, setDesign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });
  const showSnack = (message, severity = 'success') => setSnack({ open: true, message, severity });

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/production/designs/${designID}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to load design');
      setDesign(data); setError(null);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [designID]);

  useEffect(() => { load(); }, [load]);

  const backToDetail = () => router.push(`/dashboard/production/designs/${designID}`);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress sx={{ color: REPAIRS_UI.accent }} /></Box>;
  if (error || !design) {
    return (
      <Box sx={{ p: 4 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/dashboard/production/designs')} sx={{ color: REPAIRS_UI.textSecondary, mb: 2 }}>Back to designs</Button>
        <Typography color="error">{error || 'Design not found.'}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 6 }}>
      <Button startIcon={<ArrowBackIcon />} onClick={backToDetail} sx={{ color: REPAIRS_UI.textSecondary, mb: 2 }}>Back to design</Button>

      <Box sx={{ backgroundColor: { xs: 'transparent', sm: REPAIRS_UI.bgPanel }, border: { xs: 'none', sm: `1px solid ${REPAIRS_UI.border}` }, borderRadius: { xs: 0, sm: 3 }, boxShadow: { xs: 'none', sm: REPAIRS_UI.shadow }, p: { xs: 0.5, sm: 2.5, md: 3 }, mb: 3 }}>
        <Typography sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, px: 1.25, py: 0.5, mb: 1.5, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', color: REPAIRS_UI.textPrimary, backgroundColor: REPAIRS_UI.bgCard, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, textTransform: 'uppercase' }}>
          <DesignServicesIcon sx={{ fontSize: 16, color: REPAIRS_UI.accent }} />
          Edit Design
        </Typography>
        <Typography sx={{ fontSize: { xs: 24, md: 32 }, fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 1 }}>{design.name || 'Untitled design'}</Typography>
        <Typography sx={{ color: REPAIRS_UI.textSecondary, lineHeight: 1.6, maxWidth: 720 }}>
          Update details, status, metal, and gemstone link; upload CAD/STL + media. Changes save to the design spec.
        </Typography>
      </Box>

      <DesignForm
        mode="edit"
        design={design}
        onSaved={(updated) => { showSnack('Saved.'); if (updated?.designID) setDesign(updated); }}
        onError={(m) => showSnack(m, 'error')}
        onReloaded={load}
      />

      <Snackbar open={snack.open} autoHideDuration={5000} onClose={() => setSnack((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnack((s) => ({ ...s, open: false }))} severity={snack.severity} sx={{ backgroundColor: REPAIRS_UI.bgCard, color: REPAIRS_UI.textPrimary, border: `1px solid ${REPAIRS_UI.border}` }}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}
