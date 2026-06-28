'use client';

import React, { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, IconButton, Box, Typography, Button, CircularProgress } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import ThreeDIcon from '@mui/icons-material/ViewInAr';
import JewelryViewerClient from './JewelryViewerClient';

/**
 * GLB review modal — renders a GLB inline in the REFRAKT viewer (the SAME renderer
 * the customer sees on the shop), so QC reviews the model in 3D instead of downloading
 * it. Used for the CAD QC peer-review step on a GLB-stage work order.
 *
 * A raw QC GLB has no meshMap yet, so on open we ask /api/glb/inspect for a heuristic
 * `suggestedMeshMap` (tags gem/metal meshes by node name) and feed it to the viewer —
 * otherwise diamonds fall back to their dull baked GLB material instead of the gem
 * ray-march shader. This is a preview heuristic; the authoritative meshMap is built
 * later in the meshMap builder.
 */
export default function GlbReviewModal({ open, onClose, glbUrl, title = 'GLB — 3D Review' }) {
  const [meshMap, setMeshMap] = useState(null);
  const [inspecting, setInspecting] = useState(false);

  useEffect(() => {
    if (!open || !glbUrl) { setMeshMap(null); return undefined; }
    let cancelled = false;
    setInspecting(true);
    (async () => {
      try {
        const res = await fetch('/api/glb/inspect', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ glbUrl }),
        });
        const data = await res.json().catch(() => ({}));
        if (!cancelled) setMeshMap(res.ok && Array.isArray(data.suggestedMeshMap) ? data.suggestedMeshMap : []);
      } catch {
        if (!cancelled) setMeshMap([]); // fall back to default materials
      } finally {
        if (!cancelled) setInspecting(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, glbUrl]);

  // Wait for the inspect result before mounting the viewer, so the gem/metal materials
  // are applied on first render (the viewer assigns materials once, in a layout effect).
  const ready = open && glbUrl && meshMap !== null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { backgroundColor: '#0B0D10', backgroundImage: 'none', border: '1px solid #2A2F38' } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#E6E8EB' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ThreeDIcon sx={{ color: '#D4AF37', fontSize: 20 }} />
          <Typography sx={{ fontWeight: 600 }}>{title}</Typography>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: '#9CA3AF' }}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ width: '100%', height: '68vh', minHeight: 380, backgroundColor: '#080808', position: 'relative' }}>
          {!glbUrl ? (
            <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography sx={{ color: '#6B7280', fontFamily: 'monospace', fontSize: 14 }}>No GLB to review</Typography>
            </Box>
          ) : !ready ? (
            <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CircularProgress size={28} sx={{ color: '#D4AF37' }} />
            </Box>
          ) : (
            <JewelryViewerClient glbUrl={glbUrl} config={{ background: '#080808', meshMap }} style={{ width: '100%', height: '100%' }} />
          )}
        </Box>
        <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" sx={{ color: '#6B7280' }}>
            {inspecting ? 'Inspecting model…' : 'Drag to orbit · scroll to zoom · materials auto-detected for preview'}
          </Typography>
          {glbUrl && (
            <Button size="small" startIcon={<DownloadIcon sx={{ fontSize: 14 }} />} component="a" href={glbUrl} target="_blank" rel="noreferrer" sx={{ color: '#9CA3AF' }}>
              Download GLB
            </Button>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
