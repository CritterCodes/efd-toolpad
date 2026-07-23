'use client';

import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Stack, Paper, CircularProgress, Chip, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, Autocomplete, TextField,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import DiamondIcon from '@mui/icons-material/Diamond';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';
import { proposeGemMesh } from '@/services/production/gemLinks';

const money = (x) => `$${(Number(x) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const sizeLabel = (m) => (m.lengthMm && m.widthMm ? (Math.abs(m.lengthMm - m.widthMm) < 0.26 ? `${m.widthMm}mm` : `${m.lengthMm}×${m.widthMm}mm`) : '');

/** Load a GLB from a URL and measure every mesh with REFRAKT's own geometry exports —
 *  returns [{ name, lengthMm, widthMm, depthMm?, carat, cut }]. Client-only, best-effort. */
async function measureGlbMeshes(url) {
  const [{ GLTFLoader }, refrakt] = await Promise.all([
    import('three/examples/jsm/loaders/GLTFLoader.js'),
    import('@crittercodes/refrakt'),
  ]);
  const gltf = await new GLTFLoader().loadAsync(url);
  const root = gltf.scene;
  root.updateMatrixWorld(true);
  const unit = refrakt.detectUnitScaleMm(root);
  const specs = [];
  root.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    const m = refrakt.measureMesh(o, unit);
    if (m) specs.push({ name: o.name || `mesh_${specs.length}`, ...m });
  });
  return specs;
}

/**
 * Design-level gem links (jewelry only): declare which mesh in THIS design's GLB is a linked
 * gemstone design — BEFORE variants exist, so seeding pre-links stone rows and the REFRAKT studio
 * can constrain that slot's species to the cutter's variants. Slot identification is AUTOMATED by
 * geometric fingerprint (proportions + cut class — never absolute size, never typed mesh names).
 */
export default function GemLinksPanel({ design, designId, notify, onReload }) {
  const links = design.gemLinks || [];
  const glbUrl = design.designModel?.glbUrl || null;
  const [gemNames, setGemNames] = useState({}); // gemDesignId → name
  const [open, setOpen] = useState(false);
  const [gems, setGems] = useState([]);          // gem-design menu
  const [pick, setPick] = useState(null);        // chosen gem design
  const [matching, setMatching] = useState(false);
  const [proposal, setProposal] = useState(null); // { best, confident, ranked }
  const [err, setErr] = useState('');

  // Resolve linked gem names for display.
  useEffect(() => {
    const ids = [...new Set(links.map((l) => l.gemDesignId).filter((id) => id && !gemNames[id]))];
    if (!ids.length) return;
    Promise.all(ids.map((id) => fetch(`/api/production/designs/${id}`).then((r) => (r.ok ? r.json() : null)).catch(() => null)))
      .then((docs) => setGemNames((prev) => ({ ...prev, ...Object.fromEntries(docs.filter(Boolean).map((d) => [d.designID, d.name])) })));
  }, [links]); // eslint-disable-line react-hooks/exhaustive-deps

  const openDialog = async () => {
    setOpen(true); setPick(null); setProposal(null); setErr('');
    try {
      const r = await fetch('/api/production/designs?category=gemstone');
      const d = await r.json().catch(() => []);
      setGems((Array.isArray(d) ? d : []).filter((g) => g.status !== 'retired'));
    } catch { setGems([]); }
  };

  // The automation: fingerprint the gem design's mesh, measure every mesh in the jewelry GLB,
  // and propose the match — the jeweler confirms, never types a name.
  const runMatch = async (gem) => {
    setPick(gem); setProposal(null); setErr('');
    if (!glbUrl) { setErr('Upload this design’s GLB first (CAD & 3D tab).'); return; }
    const gemGlb = gem?.designModel?.glbUrl;
    setMatching(true);
    try {
      const jewelryMeshes = await measureGlbMeshes(glbUrl);
      if (!jewelryMeshes.length) throw new Error('No measurable meshes in this design’s GLB.');
      let result;
      if (gemGlb) {
        const gemMeshes = await measureGlbMeshes(gemGlb);
        const gemSpec = gemMeshes.sort((a, b) => (b.lengthMm * b.widthMm) - (a.lengthMm * a.widthMm))[0];
        result = proposeGemMesh(gemSpec, jewelryMeshes);
      } else {
        // No gem GLB yet — fall back to the measured picker (still no name-typing).
        result = { best: null, confident: false, ranked: jewelryMeshes.map((m) => ({ ...m, score: 0 })) };
      }
      setProposal(result);
    } catch (e) { setErr(e.message || 'Could not analyze the GLBs.'); } finally { setMatching(false); }
  };

  const saveLink = async (mesh) => {
    try {
      const next = [...links, { slot: { nameContains: mesh.name, match: 'exact' }, gemDesignId: pick.designID, allowedVariantIds: null }];
      const res = await fetch(`/api/production/designs/${designId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gemLinks: next }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Save failed');
      notify(`Linked “${pick.name}” to ${mesh.name} (${sizeLabel(mesh)})`, 'success');
      setOpen(false);
      onReload();
    } catch (e) { setErr(e.message); }
  };

  const removeLink = async (i) => {
    try {
      const next = links.filter((_, idx) => idx !== i);
      const res = await fetch(`/api/production/designs/${designId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gemLinks: next }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Save failed');
      notify('Gem link removed', 'success');
      onReload();
    } catch (e) { notify(e.message, 'error'); }
  };

  return (
    <Paper sx={{ p: { xs: 2, md: 2.5 }, mb: 2, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader }}>Gem links</Typography>
        <Button size="small" startIcon={<AddIcon sx={{ fontSize: 16 }} />} onClick={openDialog} sx={{ color: REPAIRS_UI.accent, textTransform: 'none' }}>Link gem design</Button>
      </Stack>
      <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, display: 'block', mb: 1 }}>
        Declare which stone in this GLB IS an in-house gem design — its species options then come from the cutter&apos;s variants, and seeded stone rows link automatically.
      </Typography>
      {links.length === 0
        ? <Typography variant="body2" sx={{ color: REPAIRS_UI.textMuted }}>No gem links.</Typography>
        : (
          <Stack spacing={0.75}>
            {links.map((l, i) => (
              <Stack key={i} direction="row" alignItems="center" spacing={1} sx={{ p: 0.75, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 1 }}>
                <DiamondIcon sx={{ color: REPAIRS_UI.accent, fontSize: 18 }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" noWrap sx={{ color: REPAIRS_UI.textHeader }}>{gemNames[l.gemDesignId] || l.gemDesignId}</Typography>
                  <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>mesh “{l.slot?.nameContains}”</Typography>
                </Box>
                <IconButton size="small" onClick={() => removeLink(i)} sx={{ color: REPAIRS_UI.textMuted }}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton>
              </Stack>
            ))}
          </Stack>
        )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}` } }}>
        <DialogTitle sx={{ color: REPAIRS_UI.textHeader }}>Link a gem design</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <Autocomplete
              size="small" options={gems}
              getOptionLabel={(g) => g.name || g.designID}
              isOptionEqualToValue={(o, v) => o.designID === v.designID}
              value={pick}
              onChange={(_, g) => { if (g) runMatch(g); }}
              renderInput={(params) => <TextField {...params} label="Gem design" placeholder="search the cutters’ menu…" />}
            />
            {err && <Typography variant="caption" sx={{ color: '#EF5350' }}>{err}</Typography>}
            {matching && <Stack alignItems="center" sx={{ py: 2 }}><CircularProgress size={20} sx={{ color: REPAIRS_UI.accent }} /><Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, mt: 1 }}>Measuring both models…</Typography></Stack>}
            {proposal && proposal.confident && proposal.best && (
              <Box sx={{ p: 1, border: `1px solid #66BB6A`, borderRadius: 1 }}>
                <Typography variant="body2" sx={{ color: REPAIRS_UI.textHeader }}>
                  Matched: <b>{proposal.best.name}</b> — {sizeLabel(proposal.best)} {proposal.best.cut} ({Math.round(proposal.best.score * 100)}% fingerprint match)
                </Typography>
                <Button size="small" variant="contained" onClick={() => saveLink(proposal.best)} sx={{ mt: 0.75, bgcolor: REPAIRS_UI.accent, color: '#1a1205', textTransform: 'none', '&:hover': { bgcolor: REPAIRS_UI.accent } }}>Confirm link</Button>
              </Box>
            )}
            {proposal && !proposal.confident && (
              <Box>
                <Typography variant="caption" sx={{ color: REPAIRS_UI.textSecondary, fontWeight: 600 }}>
                  {proposal.best ? 'No confident match — pick the stone (measured, no names needed):' : 'Pick the stone this gem design will be (measured):'}
                </Typography>
                <Stack spacing={0.5} sx={{ mt: 0.5, maxHeight: 220, overflowY: 'auto' }}>
                  {proposal.ranked.map((m) => (
                    <Stack key={m.name} direction="row" alignItems="center" spacing={1} onClick={() => saveLink(m)}
                      sx={{ p: 0.75, borderRadius: 1, cursor: 'pointer', border: `1px solid ${REPAIRS_UI.border}`, '&:hover': { borderColor: REPAIRS_UI.accent } }}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" noWrap sx={{ color: REPAIRS_UI.textHeader }}>{sizeLabel(m)} {m.cut || ''} {m.carat ? `· ≈${m.carat}ct` : ''}</Typography>
                        <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>{m.name}</Typography>
                      </Box>
                      {m.score > 0 && <Chip size="small" label={`${Math.round(m.score * 100)}%`} variant="outlined" sx={{ height: 18 }} />}
                    </Stack>
                  ))}
                </Stack>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} sx={{ color: REPAIRS_UI.textMuted, textTransform: 'none' }}>Close</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
