'use client';

import React from 'react';
import { Dialog, DialogTitle, DialogContent, IconButton, Box, Typography, Button } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import ThreeDIcon from '@mui/icons-material/ViewInAr';
import JewelryViewerClient from './JewelryViewerClient';

/**
 * GLB review modal — renders a GLB inline in the REFRAKT viewer (the SAME renderer
 * the customer sees on the shop), so QC reviews the model in 3D instead of downloading
 * it. Used for the CAD QC peer-review step on a GLB-stage work order. Raw GLB has no
 * meshMap yet, so the viewer just shows it with default materials + lighting + orbit.
 */
export default function GlbReviewModal({ open, onClose, glbUrl, title = 'GLB — 3D Review' }) {
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
          {open && glbUrl ? (
            <JewelryViewerClient glbUrl={glbUrl} config={{ background: '#080808' }} style={{ width: '100%', height: '100%' }} />
          ) : (
            <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography sx={{ color: '#6B7280', fontFamily: 'monospace', fontSize: 14 }}>No GLB to review</Typography>
            </Box>
          )}
        </Box>
        <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" sx={{ color: '#6B7280' }}>Drag to orbit · scroll to zoom</Typography>
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
