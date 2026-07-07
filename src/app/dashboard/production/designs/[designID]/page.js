'use client';

/**
 * M3-T6 — Design detail page. The entry point that makes the M3 authoring screens reachable:
 * a design opens here and links to "Materials (Studio)" (M3-T1) + "Customize options" (M3-T2).
 * (Owner QA #182: those screens existed but nothing linked to them.)
 */

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Box, Typography, Button, Card, CardContent, Stack, Chip, CircularProgress, Divider, Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import TuneIcon from '@mui/icons-material/Tune';
import DiamondIcon from '@mui/icons-material/AutoAwesome';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';
import { customizableSlots } from '@/services/production/customizableBindings';

const money = (n) => `$${(Number(n) || 0).toLocaleString()}`;
const STATUS_COLOR = { concept: REPAIRS_UI.textMuted, cad: '#64B5F6', approved_for_production: '#66BB6A', retired: REPAIRS_UI.textMuted };

export default function DesignDetailPage() {
  const { designID } = useParams();
  const router = useRouter();
  const [design, setDesign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/production/designs/${designID}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to load design');
        if (!cancelled) setDesign(data);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [designID]);

  const back = useCallback(() => router.push('/dashboard/production/designs'), [router]);

  const glbUrl = design?.viewer?.glbUrl || null;
  const meshMap = design?.viewer?.meshMap;
  const slotCount = Array.isArray(meshMap) ? meshMap.length : 0;
  const customizableCount = useMemo(() => customizableSlots(meshMap || []).length, [meshMap]);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress sx={{ color: REPAIRS_UI.accent }} /></Box>;
  }
  if (error || !design) {
    return (
      <Box sx={{ p: 4 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={back} sx={{ color: REPAIRS_UI.textSecondary, mb: 2 }}>Back to designs</Button>
        <Typography color="error">{error || 'Design not found.'}</Typography>
      </Box>
    );
  }

  const d = design;
  const authoringHref = (suffix) => `/dashboard/production/designs/${designID}/${suffix}`;

  return (
    <Box sx={{ pb: 6 }}>
      <Button startIcon={<ArrowBackIcon />} onClick={back} sx={{ color: REPAIRS_UI.textSecondary, mb: 2 }}>Back to designs</Button>

      {/* Header */}
      <Box sx={{ backgroundColor: REPAIRS_UI.bgPanel, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 3, p: { xs: 2, md: 3 }, mb: 3 }}>
        <Stack direction="row" spacing={1} sx={{ mb: 1 }} alignItems="center">
          <Chip size="small" label={(d.status || 'concept').replace(/_/g, ' ')} sx={{ backgroundColor: `${STATUS_COLOR[d.status] || REPAIRS_UI.textMuted}22`, color: STATUS_COLOR[d.status] || REPAIRS_UI.textMuted, textTransform: 'capitalize', fontWeight: 700 }} />
          {d.gemstoneId && <Chip size="small" icon={<DiamondIcon sx={{ fontSize: 14 }} />} label="Gem-linked" sx={{ backgroundColor: REPAIRS_UI.bgTertiary, color: REPAIRS_UI.accent, border: `1px solid ${REPAIRS_UI.border}` }} />}
        </Stack>
        <Typography sx={{ fontSize: { xs: 26, md: 32 }, fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 0.5 }}>{d.name || 'Untitled design'}</Typography>
        {d.description && <Typography sx={{ color: REPAIRS_UI.textSecondary, lineHeight: 1.6, maxWidth: 720 }}>{d.description}</Typography>}
        <Stack direction="row" spacing={3} sx={{ mt: 2 }}>
          <Box><Typography sx={{ fontSize: '0.72rem', color: REPAIRS_UI.textMuted, textTransform: 'uppercase' }}>Est. cost</Typography><Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 600 }}>{d.estCost != null ? money(d.estCost) : '—'}</Typography></Box>
          <Box><Typography sx={{ fontSize: '0.72rem', color: REPAIRS_UI.textMuted, textTransform: 'uppercase' }}>CAD files</Typography><Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 600 }}>{d.cadFiles?.length || 0}</Typography></Box>
          <Box><Typography sx={{ fontSize: '0.72rem', color: REPAIRS_UI.textMuted, textTransform: 'uppercase' }}>Design ID</Typography><Typography sx={{ color: REPAIRS_UI.textSecondary, fontSize: '0.85rem', fontFamily: 'monospace' }}>{d.designID}</Typography></Box>
        </Stack>
      </Box>

      {/* 3D / Customizer authoring */}
      <Card sx={{ backgroundColor: REPAIRS_UI.bgCard, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2 }}>
        <CardContent>
          <Typography sx={{ fontSize: 18, fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 0.5 }}>3D &amp; Customizer authoring</Typography>
          <Typography sx={{ color: REPAIRS_UI.textSecondary, fontSize: '0.88rem', mb: 2 }}>
            Tag base materials on the GLB (Studio), then mark which parts a customer can change (Customizer options).
          </Typography>

          <Stack direction="row" spacing={3} sx={{ mb: 2 }}>
            <Box><Typography sx={{ fontSize: '0.72rem', color: REPAIRS_UI.textMuted, textTransform: 'uppercase' }}>GLB</Typography><Typography sx={{ color: glbUrl ? '#66BB6A' : REPAIRS_UI.textMuted, fontWeight: 600 }}>{glbUrl ? 'attached' : 'none'}</Typography></Box>
            <Box><Typography sx={{ fontSize: '0.72rem', color: REPAIRS_UI.textMuted, textTransform: 'uppercase' }}>meshMap slots</Typography><Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 600 }}>{slotCount}</Typography></Box>
            <Box><Typography sx={{ fontSize: '0.72rem', color: REPAIRS_UI.textMuted, textTransform: 'uppercase' }}>Customizable</Typography><Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 600 }}>{customizableCount}</Typography></Box>
          </Stack>

          {!glbUrl && (
            <Alert severity="info" sx={{ mb: 2, backgroundColor: REPAIRS_UI.bgTertiary, color: REPAIRS_UI.textPrimary, border: `1px solid ${REPAIRS_UI.border}` }}>
              No GLB attached yet — upload a CAD/STL or GLB on this design (or via the customs GLB work order) before authoring materials.
            </Alert>
          )}

          <Divider sx={{ borderColor: REPAIRS_UI.border, mb: 2 }} />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button component={Link} href={authoringHref('materials')} disabled={!glbUrl} startIcon={<ViewInArIcon />} variant="contained"
              sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, '&:hover': { backgroundColor: '#C19B2E' } }}>
              Materials (Studio)
            </Button>
            <Button component={Link} href={authoringHref('customize')} disabled={!glbUrl} startIcon={<TuneIcon />} variant="outlined"
              sx={{ color: REPAIRS_UI.accent, borderColor: REPAIRS_UI.border }}>
              Customize options
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
