'use client';

// U-14 — full-page "New Drop" form (replaces CreateDropDialog). Thin wrapper: header + DropForm.

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, Button, Snackbar, Alert } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CollectionsIcon from '@mui/icons-material/Collections';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';
import DropForm from '@/components/production/DropForm';

export default function NewDropPage() {
  const router = useRouter();
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });
  const showSnack = (message, severity = 'success') => setSnack({ open: true, message, severity });

  const onSaved = (created) => {
    if (created?.collectionId) router.push(`/dashboard/production/drops/${created.collectionId}`);
    else router.push('/dashboard/production/drops');
  };

  return (
    <Box sx={{ pb: 6 }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/dashboard/production/drops')} sx={{ color: REPAIRS_UI.textSecondary, mb: 2 }}>Back to drops</Button>

      <Box sx={{ backgroundColor: { xs: 'transparent', sm: REPAIRS_UI.bgPanel }, border: { xs: 'none', sm: `1px solid ${REPAIRS_UI.border}` }, borderRadius: { xs: 0, sm: 3 }, boxShadow: { xs: 'none', sm: REPAIRS_UI.shadow }, p: { xs: 0.5, sm: 2.5, md: 3 }, mb: 3 }}>
        <Typography sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, px: 1.25, py: 0.5, mb: 1.5, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', color: REPAIRS_UI.textPrimary, backgroundColor: REPAIRS_UI.bgCard, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, textTransform: 'uppercase' }}>
          <CollectionsIcon sx={{ fontSize: 16, color: REPAIRS_UI.accent }} />
          New Drop
        </Typography>
        <Typography sx={{ fontSize: { xs: 24, md: 32 }, fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 1 }}>Create a drop</Typography>
        <Typography sx={{ color: REPAIRS_UI.textSecondary, lineHeight: 1.6, maxWidth: 720 }}>
          Curate products into a drop, then release them together on a schedule. Add a cover image + stage products on the drop page after creating it.
        </Typography>
      </Box>

      <DropForm onSaved={onSaved} onError={(m) => showSnack(m, 'error')} />

      <Snackbar open={snack.open} autoHideDuration={5000} onClose={() => setSnack((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnack((s) => ({ ...s, open: false }))} severity={snack.severity} sx={{ backgroundColor: REPAIRS_UI.bgCard, color: REPAIRS_UI.textPrimary, border: `1px solid ${REPAIRS_UI.border}` }}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}
