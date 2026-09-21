"use client";
import React, { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  List, ListItem, ListItemText, Stack, TextField, Typography,
} from '@mui/material';
import BlockIcon from '@mui/icons-material/Block';
import RestoreIcon from '@mui/icons-material/Restore';

const fmt = (v) => (v ? new Date(v).toLocaleString() : '');

/**
 * Account access card on the artisan admin page: the Terminate action (admin only) with a
 * preview of everything it will touch, and the terminated banner with Reinstate.
 *
 * Terminate revokes access on the person's NEXT request (the API guards re-read the account
 * live), strips capabilities and on-site, releases claimed bench work to the open queue, and
 * records who/when/why. It never deletes anything and never touches pay — credited labor stays
 * owed and is settled from the payroll page.
 */
export default function ArtisanAccountStatus({ artisan, isAdmin, onChanged }) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const id = artisan?.userID || artisan?._id;
  const terminated = artisan?.status === 'terminated';
  const t = artisan?.termination || null;

  useEffect(() => {
    if (!open || !id) return;
    setPreview(null);
    fetch(`/api/users/${id}/terminate`)
      .then((r) => r.json())
      .then((body) => setPreview(body?.error ? { error: body.error } : body))
      .catch((e) => setPreview({ error: e.message }));
  }, [open, id]);

  const act = async (path, body) => {
    setBusy(true); setError('');
    try {
      const res = await fetch(`/api/users/${id}/${path}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status}).`);
      setOpen(false); setReason('');
      onChanged?.(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!isAdmin) {
    return terminated ? (
      <Alert severity="error" icon={<BlockIcon />} sx={{ mb: 2 }}>Access terminated {fmt(t?.at)}.</Alert>
    ) : null;
  }

  if (terminated) {
    return (
      <Alert
        severity="error" icon={<BlockIcon />} sx={{ mb: 2 }}
        action={<Button color="inherit" size="small" startIcon={<RestoreIcon />} disabled={busy} onClick={() => act('reinstate')}>Reinstate sign-in</Button>}
      >
        <Typography variant="subtitle2">Access terminated {fmt(t?.at)}{t?.byName ? ` by ${t.byName}` : ''}</Typography>
        {t?.reason && <Typography variant="body2">Reason: {t.reason}</Typography>}
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          Sign-in is blocked and every live session was signed out. Capabilities and on-site are off.
          {t?.releasedRepairIDs?.length ? ` ${t.releasedRepairIDs.length} claimed repair${t.releasedRepairIDs.length === 1 ? '' : 's'} released to the open queue.` : ''}
          {t?.openWorkOrderIDs?.length ? ` ${t.openWorkOrderIDs.length} non-repair work order${t.openWorkOrderIDs.length === 1 ? '' : 's'} still need reassigning.` : ''}
          {' '}Credited labor stays on the payroll page until paid. Reinstating restores sign-in only; access must be re-granted.
        </Typography>
        {error && <Typography variant="body2" color="error" sx={{ mt: 1 }}>{error}</Typography>}
      </Alert>
    );
  }

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="outlined" color="error" size="small" startIcon={<BlockIcon />} onClick={() => setOpen(true)}>
          Terminate access
        </Button>
      </Box>
      <Dialog open={open} onClose={() => !busy && setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Terminate {artisan?.firstName} {artisan?.lastName}&apos;s access</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            This blocks sign-in immediately, signs out every live session on its next request, turns off all staff
            capabilities and on-site status, and removes push subscriptions. Nothing is deleted: the name stays on
            every repair, labor log and payroll batch, and credited labor stays owed until you pay it.
          </Typography>
          {!preview && <Typography variant="body2" color="text.secondary">Checking what this will touch…</Typography>}
          {preview?.error && <Alert severity="error" sx={{ mb: 2 }}>{preview.error}</Alert>}
          {preview && !preview.error && (
            <Stack spacing={1} sx={{ mb: 2 }}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip size="small" label={`${preview.releasableRepairs.length} claimed repair${preview.releasableRepairs.length === 1 ? '' : 's'} → open queue`} />
                <Chip size="small" label={`${preview.repairsInQc} in QC (stay credited)`} />
                <Chip size="small" color={preview.openWorkOrders.length ? 'warning' : 'default'} label={`${preview.openWorkOrders.length} non-repair work order${preview.openWorkOrders.length === 1 ? '' : 's'}`} />
                <Chip size="small" label={`${preview.pushSubscriptions} push device${preview.pushSubscriptions === 1 ? '' : 's'}`} />
              </Stack>
              {preview.releasableRepairs.length > 0 && (
                <List dense disablePadding>
                  {preview.releasableRepairs.map((r) => (
                    <ListItem key={r.repairID} disableGutters>
                      <ListItemText primary={`${r.repairID} — ${r.businessName || r.clientName || ''}`} secondary={r.status} />
                    </ListItem>
                  ))}
                </List>
              )}
              {preview.openWorkOrders.length > 0 && (
                <Alert severity="warning">
                  Non-repair work orders are not moved automatically. Reassign them from the bench after terminating:
                  {' '}{preview.openWorkOrders.map((w) => w.title || w.sourceID).join(', ')}.
                </Alert>
              )}
            </Stack>
          )}
          <TextField
            fullWidth multiline minRows={2} size="small" label="Reason (kept on the record)"
            value={reason} onChange={(e) => setReason(e.target.value)} disabled={busy}
          />
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
          <Button variant="contained" color="error" disabled={busy || !preview || !!preview.error} onClick={() => act('terminate', { reason })}>
            Terminate access
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
