'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Box, Typography, Paper, Stack, Button, Chip, CircularProgress, Snackbar, Alert, Divider } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

/**
 * Policies — the in-app artisan terms with versioned acceptance (§4c / ARTISAN_TERMS §12).
 * Renders the current policy sections; an unaccepted (or outdated) policy shows an Accept button
 * that records `users.agreements[]`. A version bump re-prompts automatically.
 */
export default function PoliciesPage() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snack, setSnack] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/policies');
      const d = await r.json().catch(() => ({}));
      setPolicies(Array.isArray(d.policies) ? d.policies : []);
    } catch { setPolicies([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const accept = async (p) => {
    const r = await fetch(`/api/policies/${p.docId}/accept`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ version: p.version }),
    });
    const d = await r.json().catch(() => ({}));
    if (r.ok) { setSnack({ message: 'Accepted — thank you.', severity: 'success' }); load(); }
    else { setSnack({ message: d.error || 'Could not record acceptance.', severity: 'error' }); }
  };

  if (loading) return <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress sx={{ color: REPAIRS_UI.accent }} /></Stack>;

  return (
    <Box sx={{ pb: 6, maxWidth: 820, mx: 'auto' }}>
      {policies.map((p) => (
        <Paper key={p.docId} sx={{ p: { xs: 2, md: 3 }, mb: 3, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
            <Box>
              <Typography sx={{ fontSize: { xs: 20, md: 26 }, fontWeight: 600, color: REPAIRS_UI.textHeader }}>{p.title}</Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 0.5 }} alignItems="center">
                <Chip size="small" label={`v${p.version}`} sx={{ height: 20, color: REPAIRS_UI.textMuted, bgcolor: REPAIRS_UI.bgTertiary, border: `1px solid ${REPAIRS_UI.border}` }} />
                {p.status === 'draft' && <Chip size="small" label="draft — pending legal review" sx={{ height: 20, color: '#FFA726', bgcolor: 'transparent', border: '1px solid #FFA726' }} />}
                {!p.needsAcceptance && <Chip size="small" icon={<CheckCircleIcon sx={{ fontSize: 14, color: '#66BB6A !important' }} />} label={`accepted v${p.acceptedVersion}`} sx={{ height: 20, color: '#66BB6A', bgcolor: 'transparent', border: '1px solid #66BB6A' }} />}
              </Stack>
            </Box>
            {p.needsAcceptance && (
              <Button variant="contained" onClick={() => accept(p)} sx={{ bgcolor: REPAIRS_UI.accent, color: '#1a1205', textTransform: 'none', '&:hover': { bgcolor: REPAIRS_UI.accent } }}>
                {p.acceptedVersion ? 'Accept updated terms' : 'Accept'}
              </Button>
            )}
          </Stack>
          <Divider sx={{ borderColor: REPAIRS_UI.border, my: 1.5 }} />
          <Stack spacing={1.5}>
            {(p.sections || []).map((s, i) => (
              <Box key={i}>
                <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader }}>{s.heading}</Typography>
                <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary, lineHeight: 1.6 }}>{s.body}</Typography>
              </Box>
            ))}
          </Stack>
        </Paper>
      ))}
      <Snackbar open={Boolean(snack)} autoHideDuration={4000} onClose={() => setSnack(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {snack ? <Alert severity={snack.severity} onClose={() => setSnack(null)} sx={{ width: '100%' }}>{snack.message}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}
