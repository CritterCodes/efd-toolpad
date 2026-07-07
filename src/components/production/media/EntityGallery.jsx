'use client';

/**
 * U-2 (production-ui-rework) — shared image gallery for entity detail pages + forms. Generalizes the
 * customs `ImagesTab` (upload button + ImageList grid + click-to-zoom Dialog + hover-delete + empty
 * state) but ROUTE-AGNOSTIC: the caller injects `onUpload(file)` / `onDelete(id)` (each entity wires
 * its own U-4 images route), so one gallery serves piece/collection/product/design.
 */

import React, { useRef, useState } from 'react';
import { Box, Paper, Stack, Typography, Button, IconButton, ImageList, ImageListItem, Dialog } from '@mui/material';
import UploadIcon from '@mui/icons-material/UploadFile';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

const idOf = (img, i) => img.id || img.key || img.url || i;

export default function EntityGallery({
  images = [],
  onUpload,
  onDelete,
  title = 'Images',
  accept = 'image/*',
  cols = 4,
  emptyText = 'No images yet. Upload one.',
}) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);

  const doUpload = async (file) => {
    if (!file || !onUpload) return;
    setBusy(true);
    try { await onUpload(file); } catch { /* caller surfaces its own error */ } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };
  const doDelete = async (id) => {
    if (!onDelete) return;
    setBusy(true);
    try { await onDelete(id); } catch { /* caller surfaces its own error */ } finally { setBusy(false); }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader }}>{title} ({images.length})</Typography>
        {onUpload && (
          <>
            <Button size="small" variant="contained" startIcon={<UploadIcon />} disabled={busy} onClick={() => fileRef.current?.click()}
              sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, '&:hover': { backgroundColor: '#C19B2E' } }}>
              {busy ? 'Uploading…' : 'Upload'}
            </Button>
            <input ref={fileRef} type="file" accept={accept} hidden onChange={(e) => doUpload(e.target.files?.[0])} />
          </>
        )}
      </Stack>

      {images.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px dashed ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
          <Typography sx={{ color: REPAIRS_UI.textSecondary }}>{emptyText}</Typography>
        </Paper>
      ) : (
        <ImageList cols={cols} gap={8} sx={{ m: 0 }}>
          {images.map((img, i) => (
            <ImageListItem key={idOf(img, i)} sx={{ borderRadius: 1, overflow: 'hidden', border: `1px solid ${REPAIRS_UI.border}`, position: 'relative', '&:hover .ov': { opacity: 1 } }}>
              <Box component="img" src={img.url} alt={img.caption || ''} loading="lazy" onClick={() => setPreview(img.url)} sx={{ cursor: 'zoom-in', aspectRatio: '1 / 1', objectFit: 'cover' }} />
              {img.isPrimary && (
                <Box sx={{ position: 'absolute', bottom: 4, left: 4, px: 0.75, py: 0.25, borderRadius: 0.5, fontSize: '0.6rem', fontWeight: 700, color: '#1A1A1A', backgroundColor: REPAIRS_UI.accent }}>PRIMARY</Box>
              )}
              {onDelete && (
                <Box className="ov" sx={{ position: 'absolute', top: 4, right: 4, opacity: 0, transition: 'opacity 120ms' }}>
                  <IconButton size="small" disabled={busy} onClick={() => doDelete(idOf(img, i))} sx={{ bgcolor: 'rgba(0,0,0,0.6)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' } }}><DeleteIcon fontSize="small" /></IconButton>
                </Box>
              )}
            </ImageListItem>
          ))}
        </ImageList>
      )}

      <Dialog open={!!preview} onClose={() => setPreview(null)} maxWidth="md" PaperProps={{ sx: { backgroundColor: 'transparent', boxShadow: 'none' } }}>
        {preview && <Box component="img" src={preview} alt="" sx={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: 1 }} />}
      </Dialog>
    </Box>
  );
}
