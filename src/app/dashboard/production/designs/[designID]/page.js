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
  Snackbar, Paper, IconButton,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import TuneIcon from '@mui/icons-material/Tune';
import DiamondIcon from '@mui/icons-material/AutoAwesome';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DescriptionIcon from '@mui/icons-material/Description';
import DownloadIcon from '@mui/icons-material/Download';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';
import { customizableSlots } from '@/services/production/customizableBindings';
import EntityGallery from '@/components/production/media/EntityGallery';

// design assets (renders/referenceImages/cadFiles) are stored as URL strings; map to the sub-doc the gallery expects.
const asImage = (u) => (typeof u === 'string' ? { url: u } : u);
const fileName = (u) => { try { return decodeURIComponent(String(u).split('?')[0].split('/').pop()) || 'file'; } catch { return 'file'; } };

const money = (n) => `$${(Number(n) || 0).toLocaleString()}`;
const STATUS_COLOR = { concept: REPAIRS_UI.textMuted, cad: '#64B5F6', approved_for_production: '#66BB6A', retired: REPAIRS_UI.textMuted };

export default function DesignDetailPage() {
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
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [designID]);

  useEffect(() => { load(); }, [load]);

  // U-9 — upload a CAD/render/reference asset to the design (assets route appends the URL to design[field]).
  const uploadAsset = useCallback(async (field, file) => {
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('field', field);
      const res = await fetch(`/api/production/designs/${designID}/assets`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Upload failed');
      showSnack('Uploaded.'); await load();
    } catch (e) { showSnack(e.message, 'error'); }
  }, [designID, load]);

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

      {/* U-9 — Media gallery (reference images + renders). Design assets have no delete route yet → upload-only. */}
      <Card sx={{ mt: 3, backgroundColor: REPAIRS_UI.bgCard, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2 }}>
        <CardContent>
          <EntityGallery
            title="Media"
            images={[...(d.referenceImages || []), ...(d.renders || [])].map(asImage)}
            onUpload={(file) => uploadAsset('referenceImages', file)}
            cols={4}
            emptyText="No reference images or renders yet. Upload one."
          />
        </CardContent>
      </Card>

      {/* U-9 — CAD/STL files (the on-card upload from U-8 relocates here). Upload + download; stored as URL strings. */}
      <Card sx={{ mt: 3, backgroundColor: REPAIRS_UI.bgCard, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2 }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader }}>CAD / STL files ({d.cadFiles?.length || 0})</Typography>
            <Button size="small" component="label" variant="contained" startIcon={<UploadFileIcon />}
              sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, '&:hover': { backgroundColor: '#C19B2E' } }}>
              Upload CAD/STL
              <input type="file" hidden accept=".stl,.obj,.glb,.3dm,.zip" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAsset('cadFiles', f); if (e.target) e.target.value = ''; }} />
            </Button>
          </Stack>
          {(d.cadFiles?.length || 0) === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center', backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px dashed ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
              <Typography sx={{ color: REPAIRS_UI.textSecondary }}>No CAD/STL files yet. Upload one (.stl/.obj/.glb/.3dm/.zip).</Typography>
            </Paper>
          ) : (
            <Stack spacing={1}>
              {d.cadFiles.map((u, i) => (
                <Stack key={i} direction="row" alignItems="center" spacing={1.5} sx={{ p: 1, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 1 }}>
                  <DescriptionIcon sx={{ color: REPAIRS_UI.textMuted }} />
                  <Typography sx={{ flex: 1, minWidth: 0, color: REPAIRS_UI.textPrimary, fontSize: '0.85rem' }} noWrap>{fileName(u)}</Typography>
                  <IconButton component="a" href={u} target="_blank" rel="noopener noreferrer" download size="small" sx={{ color: REPAIRS_UI.accent }} aria-label="Download"><DownloadIcon fontSize="small" /></IconButton>
                </Stack>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

      <Snackbar open={snack.open} autoHideDuration={5000} onClose={() => setSnack((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnack((s) => ({ ...s, open: false }))} severity={snack.severity} sx={{ backgroundColor: REPAIRS_UI.bgCard, color: REPAIRS_UI.textPrimary, border: `1px solid ${REPAIRS_UI.border}` }}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}
