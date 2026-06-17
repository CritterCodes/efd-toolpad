import React, { useState } from 'react';
import { Box, Paper, Stack, Typography, Button, TextField, Switch, FormControlLabel, Link, Alert } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

const panelSx = { p: 2.5, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' };
const SHOP_BASE = process.env.NEXT_PUBLIC_SHOP_URL || '';

export default function ShareTab({ customID, order, onChanged, notify }) {
  const [glbUrl, setGlbUrl] = useState(order.designModel?.glbUrl || '');
  const [busy, setBusy] = useState(false);
  const model = order.designModel;
  const share = order.share;
  const shareUrl = share?.token ? `${SHOP_BASE}/d/${share.token}` : '';

  const call = async (fn, okMsg) => {
    setBusy(true);
    try { await fn(); if (okMsg) notify(okMsg, 'success'); await onChanged(); }
    catch (e) { notify(e.message, 'error'); } finally { setBusy(false); }
  };
  const saveModel = () => call(async () => {
    const res = await fetch(`/api/custom-orders/${customID}/design-model`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ glbUrl, meshMap: model?.meshMap || [] }) });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to save model');
  }, 'Design model saved');
  const createShare = () => call(async () => {
    const res = await fetch(`/api/custom-orders/${customID}/share`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shareTitle: order.title || '' }) });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to create share link');
  }, 'Share link created');
  const toggleShare = (enabled) => call(async () => {
    const res = await fetch(`/api/custom-orders/${customID}/share`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled }) });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to update share link');
  });

  return (
    <Stack spacing={2}>
      <Paper sx={panelSx}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
          <ViewInArIcon sx={{ color: REPAIRS_UI.accent }} />
          <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader }}>3D Model (GLB)</Typography>
        </Stack>
        <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, display: 'block', mb: 1.5 }}>
          The GLB is the client-review/web model (created in the CAD GLB stage). Mesh-map assignment comes with the shared meshMap builder.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
          <TextField label="GLB URL" value={glbUrl} onChange={(e) => setGlbUrl(e.target.value)} size="small" fullWidth />
          <Button variant="outlined" disabled={busy || !glbUrl.trim()} onClick={saveModel} sx={{ borderColor: REPAIRS_UI.accent, color: REPAIRS_UI.accent, whiteSpace: 'nowrap' }}>Save Model</Button>
        </Stack>
      </Paper>

      <Paper sx={panelSx}>
        <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 1.5 }}>Client Share Link</Typography>
        {!model?.glbUrl ? (
          <Alert severity="info" sx={{ backgroundColor: REPAIRS_UI.bgCard, color: REPAIRS_UI.textSecondary, border: `1px solid ${REPAIRS_UI.border}` }}>
            Save a 3D model above before minting a share link.
          </Alert>
        ) : !share?.token ? (
          <Button variant="contained" disabled={busy} onClick={createShare} sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, '&:hover': { backgroundColor: '#C19B2E' } }}>Create Share Link</Button>
        ) : (
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Link href={shareUrl} target="_blank" rel="noreferrer" sx={{ color: REPAIRS_UI.accent, wordBreak: 'break-all' }}>{shareUrl || `/d/${share.token}`}</Link>
              <Button size="small" startIcon={<ContentCopyIcon sx={{ fontSize: 15 }} />} onClick={() => { navigator.clipboard?.writeText(shareUrl); notify('Link copied', 'success'); }} sx={{ color: REPAIRS_UI.textSecondary }}>Copy</Button>
            </Stack>
            <FormControlLabel sx={{ color: REPAIRS_UI.textSecondary }} control={<Switch checked={!!share.enabled} disabled={busy} onChange={(e) => toggleShare(e.target.checked)} />} label={share.enabled ? 'Enabled (public)' : 'Disabled'} />
          </Stack>
        )}
      </Paper>
    </Stack>
  );
}
