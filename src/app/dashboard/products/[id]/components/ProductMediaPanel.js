'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Box, Stack, Typography, Button, IconButton, Chip, LinearProgress,
  Menu, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Divider, Paper, Tooltip
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ReplayIcon from '@mui/icons-material/Replay';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';
import ProductMediaSalesSlot from './ProductMediaSalesSlot';

const SX = REPAIRS_UI;

function xhrUpload(url, formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText)); } catch { resolve({}); }
      } else {
        try { reject(new Error(JSON.parse(xhr.responseText).error || `HTTP ${xhr.status}`)); }
        catch { reject(new Error(`HTTP ${xhr.status}`)); }
      }
    };
    xhr.onerror = () => reject(new Error('Network error'));
    xhr.open('POST', url);
    xhr.send(formData);
  });
}

export default function ProductMediaPanel({ productId, images = [], onChanged, productType, salesMedia }) {
  const uploadRef = useRef(null);
  const cameraRef = useRef(null);
  const replaceRef = useRef(null);
  const [localImages, setLocalImages] = useState(images);
  const [localSalesMedia, setLocalSalesMedia] = useState(salesMedia || {});
  const [uploads, setUploads] = useState([]);
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuImg, setMenuImg] = useState(null);
  const [pendingReplace, setPendingReplace] = useState(null);
  const [altDialog, setAltDialog] = useState({ open: false, imageId: '', value: '' });

  useEffect(() => setLocalImages(images), [images]);
  useEffect(() => setLocalSalesMedia(salesMedia || {}), [salesMedia]);

  const isNew = !productId || productId === 'new';

  const doUpload = useCallback(async (file, uploadId) => {
    const fd = new FormData();
    fd.append('file', file);
    try {
      await xhrUpload(`/api/products/${productId}/images`, fd,
        (p) => setUploads((prev) => prev.map((u) => u.id === uploadId ? { ...u, progress: p } : u)));
      setUploads((prev) => prev.filter((u) => u.id !== uploadId));
      await onChanged();
    } catch (e) {
      setUploads((prev) => prev.map((u) => u.id === uploadId ? { ...u, status: 'error', error: e.message } : u));
    }
  }, [productId, onChanged]);

  const startUpload = useCallback((file) => {
    if (!file) return;
    const id = `${Date.now()}-${Math.random()}`;
    setUploads((prev) => [...prev, { id, name: file.name, progress: 0, status: 'uploading', file }]);
    doUpload(file, id);
  }, [doUpload]);

  const retryUpload = useCallback((upload) => {
    setUploads((prev) => prev.map((u) => u.id === upload.id ? { ...u, status: 'uploading', progress: 0, error: '' } : u));
    doUpload(upload.file, upload.id);
  }, [doUpload]);

  const handleFiles = (e) => Array.from(e.target.files || []).forEach(startUpload);

  const reorder = useCallback(async (newOrder) => {
    setLocalImages(newOrder);
    try {
      const res = await fetch(`/api/products/${productId}/images`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: newOrder.map((img) => img.id) }),
      });
      if (!res.ok) setLocalImages(images);
      else await onChanged();
    } catch { setLocalImages(images); }
  }, [productId, images, onChanged]);

  const handleDrop = (e, dropIdx) => {
    e.preventDefault();
    setDragOverIdx(null);
    if (dragIdx === null || dragIdx === dropIdx) { setDragIdx(null); return; }
    const next = [...localImages];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(dropIdx, 0, moved);
    setDragIdx(null);
    reorder(next);
  };

  const closeMenu = () => { setMenuAnchor(null); setMenuImg(null); };

  const setPrimary = async () => {
    const img = menuImg;
    closeMenu();
    const idx = localImages.findIndex((i) => i.id === img.id);
    if (idx === 0) return;
    const next = [localImages[idx], ...localImages.filter((_, i) => i !== idx)];
    reorder(next);
  };

  const openAlt = () => {
    const img = menuImg;
    closeMenu();
    setAltDialog({ open: true, imageId: img.id, value: img.alt || '' });
  };

  const saveAlt = async () => {
    const { imageId, value } = altDialog;
    setAltDialog({ open: false, imageId: '', value: '' });
    const res = await fetch(`/api/products/${productId}/images/${imageId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alt: value }),
    });
    if (res.ok) {
      setLocalImages((prev) => prev.map((img) => img.id === imageId ? { ...img, alt: value } : img));
    }
  };

  const startReplace = () => {
    setPendingReplace(menuImg);
    closeMenu();
    replaceRef.current?.click();
  };

  const doReplace = async (file) => {
    if (!file || !pendingReplace) return;
    const oldId = pendingReplace.id;
    setPendingReplace(null);
    const id = `replace-${Date.now()}`;
    setUploads((prev) => [...prev, { id, name: file.name, progress: 0, status: 'uploading', file }]);
    const fd = new FormData();
    fd.append('file', file);
    try {
      await xhrUpload(`/api/products/${productId}/images`, fd,
        (p) => setUploads((prev) => prev.map((u) => u.id === id ? { ...u, progress: p } : u)));
      await fetch(`/api/products/${productId}/images/${oldId}`, { method: 'DELETE' });
      setUploads((prev) => prev.filter((u) => u.id !== id));
      await onChanged();
    } catch (e) {
      setUploads((prev) => prev.map((u) => u.id === id ? { ...u, status: 'error', error: e.message } : u));
    }
    if (replaceRef.current) replaceRef.current.value = '';
  };

  const deleteImage = async (imageId) => {
    closeMenu();
    const res = await fetch(`/api/products/${productId}/images/${imageId}`, { method: 'DELETE' });
    if (res.ok) await onChanged();
  };

  const salesMediaChanged = useCallback(async () => {
    const res = await fetch(`/api/products/${productId}`);
    if (!res.ok) return;
    const data = await res.json();
    setLocalSalesMedia((data.product || data).salesMedia || {});
  }, [productId]);

  return (
    <Box sx={{ mb: 1 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography sx={{ fontWeight: 600, color: SX.textHeader }}>Media ({localImages.length})</Typography>
        <Stack direction="row" gap={1}>
          <Button size="small" variant="contained" startIcon={<UploadFileIcon />} disabled={isNew}
            onClick={() => uploadRef.current?.click()}
            sx={{ backgroundColor: SX.accent, color: '#1A1A1A', fontWeight: 600, '&:hover': { backgroundColor: '#C19B2E' } }}>
            Upload
          </Button>
          <Tooltip title="Camera (mobile)">
            <span>
              <Button size="small" variant="outlined" disabled={isNew} onClick={() => cameraRef.current?.click()}
                sx={{ borderColor: SX.border, color: SX.textSecondary, minWidth: 36, px: 1, '&:hover': { borderColor: SX.accent, color: SX.accent } }}>
                <PhotoCameraIcon fontSize="small" />
              </Button>
            </span>
          </Tooltip>
        </Stack>
      </Stack>

      <input ref={uploadRef} type="file" accept="image/*" multiple hidden onChange={handleFiles} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={handleFiles} />
      <input ref={replaceRef} type="file" accept="image/*" hidden onChange={(e) => doReplace(e.target.files?.[0])} />

      {isNew && <Typography sx={{ color: SX.textSecondary, fontSize: '0.8rem', mb: 1 }}>Save the product first to enable media upload.</Typography>}

      {uploads.length > 0 && (
        <Box sx={{ mb: 2 }}>
          {uploads.map((u) => (
            <Stack key={u.id} direction="row" alignItems="center" gap={1} sx={{ mb: 0.5 }}>
              <Typography sx={{ color: SX.textSecondary, fontSize: '0.75rem', minWidth: 0, flex: 1 }} noWrap>{u.name}</Typography>
              {u.status === 'uploading' && (
                <LinearProgress variant="determinate" value={u.progress}
                  sx={{ flex: 2, height: 4, borderRadius: 2, backgroundColor: SX.border, '& .MuiLinearProgress-bar': { backgroundColor: SX.accent } }} />
              )}
              {u.status === 'error' && <>
                <Typography sx={{ color: '#EF5350', fontSize: '0.72rem' }}>{u.error}</Typography>
                <IconButton size="small" onClick={() => retryUpload(u)} sx={{ color: SX.accent }}><ReplayIcon fontSize="small" /></IconButton>
              </>}
            </Stack>
          ))}
        </Box>
      )}

      {localImages.length === 0 && uploads.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', backgroundColor: SX.bgPanel, backgroundImage: 'none', border: `1px dashed ${SX.border}`, borderRadius: 2, boxShadow: 'none' }}>
          <Typography sx={{ color: SX.textSecondary }}>No photos yet. Click Upload to add product photos.</Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 1 }}>
          {localImages.map((img, idx) => (
            <Box key={img.id || idx}
              draggable
              onDragStart={() => setDragIdx(idx)}
              onDragOver={(e) => { e.preventDefault(); setDragOverIdx(idx); }}
              onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
              onDrop={(e) => handleDrop(e, idx)}
              sx={{
                position: 'relative', borderRadius: 1, overflow: 'hidden', cursor: 'grab',
                border: `2px solid ${dragOverIdx === idx && dragIdx !== idx ? SX.accent : SX.border}`,
                opacity: dragIdx === idx ? 0.5 : 1,
                '&:hover .img-overlay': { opacity: 1 },
              }}>
              <Box component="img" src={img.url} alt={img.alt || ''} loading="lazy"
                sx={{ aspectRatio: '1 / 1', objectFit: 'cover', width: '100%', display: 'block', pointerEvents: 'none' }} />
              {idx === 0 && (
                <Chip label="PRIMARY" size="small"
                  sx={{ position: 'absolute', top: 4, left: 4, height: 18, fontSize: '0.6rem', fontWeight: 700, backgroundColor: SX.accent, color: '#1A1A1A' }} />
              )}
              <Box className="img-overlay" sx={{ position: 'absolute', top: 4, right: 4, opacity: 0, transition: 'opacity 120ms' }}>
                <IconButton size="small" onClick={(e) => { setMenuAnchor(e.currentTarget); setMenuImg(img); }}
                  sx={{ bgcolor: 'rgba(0,0,0,0.65)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,0,0,0.85)' } }}>
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          ))}
        </Box>
      )}

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu}
        PaperProps={{ sx: { backgroundColor: SX.bgCard, border: `1px solid ${SX.border}`, backgroundImage: 'none', color: SX.textPrimary } }}>
        <MenuItem onClick={setPrimary} disabled={menuImg && localImages[0]?.id === menuImg.id}>Set primary</MenuItem>
        <MenuItem onClick={openAlt}>Edit alt text</MenuItem>
        <MenuItem onClick={startReplace}>Replace</MenuItem>
        <Divider sx={{ borderColor: SX.border }} />
        <MenuItem onClick={() => deleteImage(menuImg?.id)} sx={{ color: '#EF5350' }}>
          <DeleteOutlineIcon fontSize="small" sx={{ mr: 1 }} />Delete
        </MenuItem>
      </Menu>

      <Dialog open={altDialog.open} onClose={() => setAltDialog({ open: false, imageId: '', value: '' })}
        PaperProps={{ sx: { backgroundColor: SX.bgPanel, backgroundImage: 'none', border: `1px solid ${SX.border}` } }}>
        <DialogTitle sx={{ color: SX.textHeader }}>Edit alt text</DialogTitle>
        <DialogContent>
          <TextField fullWidth autoFocus multiline minRows={2} value={altDialog.value}
            onChange={(e) => setAltDialog((p) => ({ ...p, value: e.target.value }))}
            placeholder="Describe the image for accessibility and SEO"
            inputProps={{ maxLength: 500 }}
            sx={{ mt: 1, '& .MuiOutlinedInput-root': { color: SX.textPrimary, '& fieldset': { borderColor: SX.border } } }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAltDialog({ open: false, imageId: '', value: '' })} sx={{ color: SX.textSecondary }}>Cancel</Button>
          <Button onClick={saveAlt} sx={{ color: SX.accent }}>Save</Button></DialogActions>
      </Dialog>

      {productType === 'jewelry' && !isNew && (
        <Box sx={{ mt: 3 }}>
          <Divider sx={{ borderColor: SX.border, mb: 2 }} />
          <Typography sx={{ fontWeight: 600, color: SX.textHeader, mb: 2 }}>Sales Media</Typography>
          <ProductMediaSalesSlot productId={productId} mediaType="video" label="Product Video" accept="video/*"
            value={localSalesMedia.video} icon={VideoLibraryIcon} onChanged={salesMediaChanged} />
          <ProductMediaSalesSlot productId={productId} mediaType="glb" label="3D Model (GLB)" accept=".glb"
            value={localSalesMedia.glb} icon={ViewInArIcon} onChanged={salesMediaChanged} />
        </Box>
      )}
    </Box>
  );
}
