import React, { useRef, useState } from 'react';
import { Box, Paper, Stack, Typography, Button, IconButton, ImageList, ImageListItem, Dialog, DialogTitle, DialogContent, DialogActions, useMediaQuery } from '@mui/material';
import UploadIcon from '@mui/icons-material/UploadFile';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

/**
 * `canEdit` defaults to true so every existing caller is unchanged; the customs detail page passes
 * `false` for an artisan. The upload and delete routes are staff-only — see the note in NotesTab.
 * An assigned artisan still SEES the moodboard, which is the half of this tab they need.
 */
export default function ImagesTab({ customID, images = [], onChanged, notify, canEdit = true }) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const narrow = useMediaQuery('(max-width: 599.95px)'); // MUI `sm` breakpoint, without needing a ThemeProvider

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
        {canEdit && (
          <>
            <Button size="small" variant="contained" startIcon={<UploadIcon />} disabled={busy} onClick={() => fileRef.current?.click()} sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, '&:hover': { backgroundColor: '#C19B2E' } }}>
              {busy ? 'Uploading…' : 'Upload'}
            </Button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files?.[0])} />
          </>
        )}
      </Stack>

      {images.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px dashed ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
          <Typography sx={{ color: REPAIRS_UI.textSecondary }}>{canEdit ? 'No reference images yet. Upload moodboard / inspiration images.' : 'No reference images on this order yet.'}</Typography>
        </Paper>
      ) : (
        <ImageList cols={narrow ? 2 : 4} gap={8} sx={{ m: 0 }}>
          {images.map((img) => (
            <ImageListItem key={img.id} sx={{ borderRadius: 1, overflow: 'hidden', border: `1px solid ${REPAIRS_UI.border}`, position: 'relative', '&:hover .ov, &:focus-within .ov': { opacity: 1 } }}>
              <Box component="img" src={img.url} alt={img.caption || ''} loading="lazy" onClick={() => setPreview(img.url)} sx={{ cursor: 'zoom-in', aspectRatio: '1 / 1', objectFit: 'cover' }} />
              {canEdit && (
                // Hidden-until-hover only where hover exists. On a phone there is no hover, so an
                // opacity:0 button was invisible but still tappable — tapping the image to view it
                // deleted it (2026-11-09, two client reference images lost). On touch it stays visible.
                <Box className="ov" sx={{ position: 'absolute', top: 4, right: 4, transition: 'opacity 120ms', '@media (hover: hover)': { opacity: 0 } }}>
                  <IconButton size="small" aria-label="Remove image" disabled={busy} onClick={() => setConfirm(img)} sx={{ bgcolor: 'rgba(0,0,0,0.6)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' } }}><DeleteIcon fontSize="small" /></IconButton>
                </Box>
              )}
            </ImageListItem>
          ))}
        </ImageList>
      )}

      <Dialog open={!!preview} onClose={() => setPreview(null)} maxWidth="md" PaperProps={{ sx: { backgroundColor: 'transparent', boxShadow: 'none' } }}>
        {preview && <Box component="img" src={preview} alt="" sx={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: 1 }} />}
      </Dialog>

      <Dialog open={!!confirm} onClose={() => setConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Remove this image?</DialogTitle>
        <DialogContent>
          {confirm && <Box component="img" src={confirm.url} alt="" sx={{ width: '100%', maxHeight: 240, objectFit: 'contain', borderRadius: 1, mb: 1 }} />}
          <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>It comes off this order&apos;s moodboard.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm(null)}>Keep</Button>
          <Button color="error" disabled={busy} onClick={async () => { const id = confirm.id; setConfirm(null); await del(id); }}>Remove</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
