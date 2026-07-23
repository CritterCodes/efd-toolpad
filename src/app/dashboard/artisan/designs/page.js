'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, Button, Stack, Paper, CircularProgress, Chip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DesignServicesIcon from '@mui/icons-material/DesignServices';
import DiamondIcon from '@mui/icons-material/Diamond';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

const panelSx = { p: 2, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' };
const cap = (s) => String(s || '').replace(/_/g, ' ');

/** Artisan "My Designs" — the self-service surface. The designs API scopes the list to the
 *  signed-in artisan (staff landing here see everything; that's fine — they have the drops UI). */
export default function MyDesignsPage() {
  const router = useRouter();
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/production/designs')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setDesigns(Array.isArray(d) ? d : []))
      .catch(() => setDesigns([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1000, mx: 'auto' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: REPAIRS_UI.textHeader }}>My Designs</Typography>
          <Typography variant="body2" sx={{ color: REPAIRS_UI.textMuted }}>Jewelry and gemstone designs you author and own.</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => router.push('/dashboard/artisan/designs/new')}
          sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, textTransform: 'none', '&:hover': { backgroundColor: '#C19B2E' } }}>
          New design
        </Button>
      </Stack>

      {loading ? (
        <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress sx={{ color: REPAIRS_UI.accent }} /></Stack>
      ) : designs.length === 0 ? (
        <Paper sx={panelSx}>
          <Stack alignItems="center" spacing={1.5} sx={{ py: 5 }}>
            <DesignServicesIcon sx={{ fontSize: 40, color: REPAIRS_UI.textMuted }} />
            <Typography sx={{ color: REPAIRS_UI.textSecondary }}>No designs yet.</Typography>
            <Button onClick={() => router.push('/dashboard/artisan/designs/new')} sx={{ color: REPAIRS_UI.accent, textTransform: 'none' }}>Create your first design</Button>
          </Stack>
        </Paper>
      ) : (
        <Stack spacing={1}>
          {designs.map((d) => {
            const isGem = d.category === 'gemstone';
            return (
              <Paper key={d.designID} onClick={() => router.push(`/dashboard/artisan/designs/${d.designID}`)}
                sx={{ ...panelSx, p: 1.5, cursor: 'pointer', transition: 'border-color .15s', '&:hover': { borderColor: REPAIRS_UI.accent } }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  {isGem ? <DiamondIcon sx={{ color: REPAIRS_UI.accent, fontSize: 20 }} /> : <DesignServicesIcon sx={{ color: REPAIRS_UI.accent, fontSize: 20 }} />}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 600 }} noWrap>{d.name || 'Untitled design'}</Typography>
                    <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>
                      {[isGem ? 'gemstone' : (d.category || 'jewelry'), d.edition?.type === 'limited' ? `limited ${d.edition.limit}` : cap(d.edition?.type), `${(d.variants || []).length} variant${(d.variants || []).length === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}
                    </Typography>
                  </Box>
                  {d.dropId && <Chip size="small" label="in a drop" variant="outlined" sx={{ height: 20 }} />}
                  <Chip size="small" label={cap(d.status)} variant="outlined" sx={{ height: 20, textTransform: 'capitalize' }} />
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
