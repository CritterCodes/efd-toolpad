import React, { useRef, useState } from 'react';
import { Box, Paper, Stack, Typography, Button, IconButton, ImageList, ImageListItem, Dialog } from '@mui/material';
import UploadIcon from '@mui/icons-material/UploadFile';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

export default function ImagesTab({ customID, images = [], onChanged, notify }) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);

  const upload = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`/api/custom-orders/${customID}/images`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Upload failed');
      await onChanged();
    } catch (e) { notify(e.message, 'error'); } finally { setBusy(false); if (fileRef.current) fileRef.current.value = ''; }
  };
  const del = async (id) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/custom-orders/${customID}/images/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Delete failed');
      await onChanged();
    } catch (e) { notify(e.message, 'error'); } finally { setBusy(false); }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader }}>Moodboard ({images.length})</Typography>
        <Button size="small" variant="contained" startIcon={<UploadIcon />} disabled={busy} onClick={() => fileRef.current?.click()} sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, '&:hover': { backgroundColor: '#C19B2E' } }}>
          {busy ? 'Uploading…' : 'Upload'}
        </Button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files?.[0])} />
      </Stack>

      {images.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px dashed ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
          <Typography sx={{ color: REPAIRS_UI.textSecondary }}>No reference images yet. Upload moodboard / inspiration images.</Typography>
        </Paper>
      ) : (
        <ImageList cols={4} gap={8} sx={{ m: 0 }}>
          {images.map((img) => (
            <ImageListItem key={img.id} sx={{ borderRadius: 1, overflow: 'hidden', border: `1px solid ${REPAIRS_UI.border}`, position: 'relative', '&:hover .ov': { opacity: 1 } }}>
              <Box component="img" src={img.url} alt={img.caption || ''} loading="lazy" onClick={() => setPreview(img.url)} sx={{ cursor: 'zoom-in', aspectRatio: '1 / 1', objectFit: 'cover' }} />
              <Box className="ov" sx={{ position: 'absolute', top: 4, right: 4, opacity: 0, transition: 'opacity 120ms' }}>
                <IconButton size="small" disabled={busy} onClick={() => del(img.id)} sx={{ bgcolor: 'rgba(0,0,0,0.6)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' } }}><DeleteIcon fontSize="small" /></IconButton>
              </Box>
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
