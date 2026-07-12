'use client';

import React, { useRef, useState } from 'react';
import { Box, Paper, Stack, Typography, Button, IconButton, ImageList, ImageListItem } from '@mui/material';
import UploadIcon from '@mui/icons-material/UploadFile';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

export default function ProductMediaPanel({ productId, images = [], onChanged }) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const upload = async (file) => {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`/api/products/${productId}/images`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Upload failed');
      await onChanged();
    } catch (e) { setError(e.message); } finally { setBusy(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const del = async (imageId) => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/products/${productId}/images/${imageId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Delete failed');
      await onChanged();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const isNew = !productId || productId === 'new';

  return (
    <Box sx={{ mb: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader }}>Images ({images.length})</Typography>
        <Button
          size="small"
          variant="contained"
          startIcon={<UploadIcon />}
          disabled={busy || isNew}
          onClick={() => fileRef.current?.click()}
          sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, '&:hover': { backgroundColor: '#C19B2E' } }}
        >
          {busy ? 'Uploading…' : 'Upload'}
        </Button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files?.[0])} />
      </Stack>

      {error && <Typography sx={{ color: '#EF5350', fontSize: '0.8rem', mb: 1 }}>{error}</Typography>}
      {isNew && <Typography sx={{ color: REPAIRS_UI.textSecondary, fontSize: '0.8rem', mb: 1 }}>Save the product first to enable image upload.</Typography>}

      {images.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px dashed ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
          <Typography sx={{ color: REPAIRS_UI.textSecondary }}>No images yet. Click Upload to add product photos.</Typography>
        </Paper>
      ) : (
        <ImageList cols={4} gap={8} sx={{ m: 0 }}>
          {images.map((img, idx) => {
            const imgId = typeof img === 'object' ? img.id : null;
            const url = typeof img === 'object' ? img.url : img;
            return (
              <ImageListItem key={imgId || url || idx} sx={{ borderRadius: 1, overflow: 'hidden', border: `1px solid ${REPAIRS_UI.border}`, position: 'relative', '&:hover .ov': { opacity: 1 } }}>
                <Box component="img" src={url} alt="" loading="lazy" sx={{ aspectRatio: '1 / 1', objectFit: 'cover', width: '100%', display: 'block' }} />
                {imgId && (
                  <Box className="ov" sx={{ position: 'absolute', top: 4, right: 4, opacity: 0, transition: 'opacity 120ms' }}>
                    <IconButton size="small" disabled={busy} onClick={() => del(imgId)} sx={{ bgcolor: 'rgba(0,0,0,0.6)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' } }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                )}
              </ImageListItem>
            );
          })}
        </ImageList>
      )}
    </Box>
  );
}
