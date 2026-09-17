'use client';

/**
 * The design's listing photos — what a shopper sees.
 *
 * Photos had no design-side home. The only manager in admin wrote `products.images`, and the
 * storefront stopped reading that collection, so uploading a photo there put it somewhere no
 * customer could reach. These go on the design, which is what the shop renders.
 *
 * Order is meaningful: the first photo is the listing's face, in the shop and everywhere in
 * admin that shows a thumbnail.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Box, Paper, Stack, Typography, Button, IconButton, LinearProgress, Tooltip, Chip, Alert,
} from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

const imageUrl = (img) => (typeof img === 'string' ? img : img?.url || '');
const imageId = (img) => (typeof img === 'string' ? img : img?.id || img?.url || '');

export default function MediaTab({ design, designId, onReload, notify }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  // Memoised: `move` depends on it, and a fresh array each render would rebuild that callback.
  const images = useMemo(() => design?.media?.images || [], [design]);

  const upload = useCallback(async (files) => {
    const picked = Array.from(files || []).filter((f) => f.type.startsWith('image/'));
    if (!picked.length) return;
    setBusy(true);
    setProgress(0);
    try {
      for (let i = 0; i < picked.length; i += 1) {
        const body = new FormData();
        body.append('file', picked[i]);
        const res = await fetch(`/api/production/designs/${designId}/media`, { method: 'POST', body });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Upload failed');
        setProgress(Math.round(((i + 1) / picked.length) * 100));
      }
      notify?.(picked.length === 1 ? 'Photo added.' : `${picked.length} photos added.`);
      await onReload?.();
    } catch (e) {
      notify?.(e.message, 'error');
    } finally {
      setBusy(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = '';
    }
  }, [designId, notify, onReload]);

  const remove = useCallback(async (img) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/production/designs/${designId}/media?imageId=${encodeURIComponent(imageId(img))}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Could not remove the photo');
      notify?.('Photo removed.');
      await onReload?.();
    } catch (e) {
      notify?.(e.message, 'error');
    } finally {
      setBusy(false);
    }
  }, [designId, notify, onReload]);

  const move = useCallback(async (index, delta) => {
    const next = [...images];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setBusy(true);
    try {
      const res = await fetch(`/api/production/designs/${designId}/media`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: next.map(imageId) }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Could not reorder');
      await onReload?.();
    } catch (e) {
      notify?.(e.message, 'error');
    } finally {
      setBusy(false);
    }
  }, [designId, images, notify, onReload]);

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" spacing={1.5} sx={{ mb: 2 }}>
        <Box>
          <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 700 }}>Listing photos</Typography>
          <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>
            What a shopper sees. The first one is the listing&apos;s face.
          </Typography>
        </Box>
        <Button
          variant="outlined" startIcon={<PhotoCameraIcon />} disabled={busy}
          onClick={() => inputRef.current?.click()}
          sx={{ color: REPAIRS_UI.accent, borderColor: `${REPAIRS_UI.accent}66`, textTransform: 'none', fontWeight: 600, '&:hover': { borderColor: REPAIRS_UI.accent } }}
        >
          Add photos
        </Button>
        <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(e) => upload(e.target.files)} />
      </Stack>

      {busy && <LinearProgress variant={progress ? 'determinate' : 'indeterminate'} value={progress} sx={{ mb: 2, '& .MuiLinearProgress-bar': { backgroundColor: REPAIRS_UI.accent } }} />}

      {images.length === 0 ? (
        <Paper sx={{ p: 4, backgroundColor: REPAIRS_UI.bgCard, border: `1px dashed ${REPAIRS_UI.border}`, borderRadius: 2 }}>
          <Stack alignItems="center" spacing={1.5}>
            <PhotoCameraIcon sx={{ fontSize: 40, color: REPAIRS_UI.textMuted }} />
            <Typography sx={{ color: REPAIRS_UI.textSecondary }}>No photos yet.</Typography>
            <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, textAlign: 'center', maxWidth: 420 }}>
              A listing with no photo is a listing nobody clicks. Drop in at least one before
              listing this design.
            </Typography>
          </Stack>
        </Paper>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(180px, 100%), 1fr))', gap: 2 }}>
          {images.map((img, i) => (
            <Paper key={imageId(img) || i} sx={{ p: 1, backgroundColor: REPAIRS_UI.bgCard, border: `1px solid ${i === 0 ? REPAIRS_UI.accent : REPAIRS_UI.border}`, borderRadius: 2 }}>
              <Box sx={{ position: 'relative', pt: '100%', borderRadius: 1, overflow: 'hidden', backgroundColor: '#0E0E0E' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl(img)} alt={`${design?.name || 'Design'} photo ${i + 1}`}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                {i === 0 && (
                  <Chip size="small" label="Primary"
                    sx={{ position: 'absolute', top: 6, left: 6, height: 20, backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 700 }} />
                )}
              </Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 0.5 }}>
                <Stack direction="row">
                  <Tooltip title="Move earlier">
                    <span>
                      <IconButton size="small" disabled={busy || i === 0} onClick={() => move(i, -1)} sx={{ color: REPAIRS_UI.textSecondary }}>
                        <ArrowBackIosNewIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Move later">
                    <span>
                      <IconButton size="small" disabled={busy || i === images.length - 1} onClick={() => move(i, 1)} sx={{ color: REPAIRS_UI.textSecondary }}>
                        <ArrowForwardIosIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
                <Tooltip title="Remove photo">
                  <span>
                    <IconButton size="small" disabled={busy} onClick={() => remove(img)} sx={{ color: '#E57373' }}>
                      <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>
            </Paper>
          ))}
        </Box>
      )}

      {images.some((img) => typeof img === 'string') && (
        <Alert severity="info" sx={{ mt: 2, backgroundColor: REPAIRS_UI.bgCard, color: REPAIRS_UI.textSecondary, border: `1px solid ${REPAIRS_UI.border}` }}>
          Some photos were attached before photos had ids — they can be reordered and removed, but
          were stored as plain links.
        </Alert>
      )}
    </Box>
  );
}
