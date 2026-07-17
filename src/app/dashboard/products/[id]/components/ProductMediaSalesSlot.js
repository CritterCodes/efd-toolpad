'use client';

import React, { useRef, useState } from 'react';
import { Box, Button, IconButton, LinearProgress, Stack, Typography } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

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

export default function ProductMediaSalesSlot({ productId, mediaType, label, accept, value, icon: Icon, onChanged }) {
  const fileRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const upload = async (file) => {
    if (!file) return;
    setBusy(true);
    setError('');
    setProgress(0);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('mediaType', mediaType);
      await xhrUpload(`/api/products/${productId}/sales-media`, fd, setProgress);
      await onChanged();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
      setProgress(0);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const del = async () => {
    if (!value?.id || !window.confirm(`Remove ${label}?`)) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/products/${productId}/sales-media?mediaType=${mediaType}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Delete failed');
      await onChanged();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Typography sx={{ fontSize: '0.78rem', color: REPAIRS_UI.textSecondary, mb: 0.5 }}>{label}</Typography>
      {busy && (
        <LinearProgress
          variant={progress > 0 ? 'determinate' : 'indeterminate'}
          value={progress}
          sx={{ mb: 0.5, height: 2, backgroundColor: REPAIRS_UI.border, '& .MuiLinearProgress-bar': { backgroundColor: REPAIRS_UI.accent } }}
        />
      )}
      {error && <Typography sx={{ color: '#EF5350', fontSize: '0.75rem', mb: 0.5 }}>{error}</Typography>}

      {value?.url ? (
        <Stack direction="row" alignItems="center" gap={1} sx={{ p: 1, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 1, backgroundColor: REPAIRS_UI.bgCard }}>
          <Icon sx={{ color: REPAIRS_UI.accent, fontSize: 20, flexShrink: 0 }} />
          <Typography sx={{ flex: 1, color: REPAIRS_UI.textPrimary, fontSize: '0.8rem', minWidth: 0 }} noWrap>
            {value.url.split('/').pop()}
          </Typography>
          <Button size="small" component="label" disabled={busy}
            sx={{ color: REPAIRS_UI.accent, fontSize: '0.7rem', minWidth: 0, px: 1 }}>
            Replace
            <input ref={fileRef} type="file" hidden accept={accept} onChange={(e) => upload(e.target.files?.[0])} />
          </Button>
          <IconButton size="small" disabled={busy} onClick={del} sx={{ color: REPAIRS_UI.textMuted, '&:hover': { color: '#EF5350' } }}>
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Stack>
      ) : (
        <Button size="small" variant="outlined" component="label" startIcon={<Icon />} disabled={busy}
          sx={{ borderColor: REPAIRS_UI.border, color: REPAIRS_UI.textSecondary, '&:hover': { borderColor: REPAIRS_UI.accent, color: REPAIRS_UI.accent } }}>
          Upload {label}
          <input ref={fileRef} type="file" hidden accept={accept} onChange={(e) => upload(e.target.files?.[0])} />
        </Button>
      )}
    </Box>
  );
}
