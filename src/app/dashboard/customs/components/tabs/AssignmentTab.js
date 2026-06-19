import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Stack, Typography, Button, Chip, IconButton, Avatar,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/PersonAdd';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import DesignServicesIcon from '@mui/icons-material/DesignServices';
import HandymanIcon from '@mui/icons-material/Handyman';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

const dialogPaperProps = { sx: { backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', color: REPAIRS_UI.textPrimary, border: `1px solid ${REPAIRS_UI.border}` } };
const money = (n) => `$${(Number(n) || 0).toLocaleString()}`;
const ROLE_META = {
  cad: { label: 'CAD Designer', Icon: DesignServicesIcon, color: '#64B5F6' },
  bench: { label: 'Bench Jeweler', Icon: HandymanIcon, color: REPAIRS_UI.accent },
};

export default function AssignmentTab({ customID, assignments = [], onChanged, notify }) {
  const [open, setOpen] = useState(false);
  const [artisans, setArtisans] = useState([]);
  const [userID, setUserID] = useState('');
  const [role, setRole] = useState('cad');
  const [fee, setFee] = useState('');
  const [busy, setBusy] = useState(false);

  const loadArtisans = useCallback(async () => {
    try {
      const res = await fetch('/api/custom-orders/assignable-artisans');
      setArtisans(res.ok ? await res.json() : []);
    } catch { setArtisans([]); }
  }, []);
  useEffect(() => { if (open) loadArtisans(); }, [open, loadArtisans]);

  const picked = artisans.find((a) => a.userID === userID);

  // When an artisan is picked, default the CAD fee to their profile fee (editable).
  const pickArtisan = (id) => {
    setUserID(id);
    const a = artisans.find((x) => x.userID === id);
    setFee(a?.customDesignFee ? String(a.customDesignFee) : '');
  };

  const assign = async () => {
    if (!userID) return;
    setBusy(true);
    try {
      const payload = { userID, role };
      if (role === 'cad' && fee !== '') payload.fee = Number(fee);
      const res = await fetch(`/api/custom-orders/${customID}/assignments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to assign');
      setOpen(false); setUserID(''); setRole('cad'); setFee('');
      notify(role === 'cad' ? 'CAD designer assigned — design fee folded into the quote' : 'Artisan assigned', 'success');
      await onChanged();
    } catch (e) { notify(e.message, 'error'); } finally { setBusy(false); }
  };
  const remove = async (id) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/custom-orders/${customID}/assignments/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to remove');
      await onChanged();
    } catch (e) { notify(e.message, 'error'); } finally { setBusy(false); }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader }}>Assigned artisans ({assignments.length})</Typography>
        <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)} sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, '&:hover': { backgroundColor: '#C19B2E' } }}>Assign</Button>
      </Stack>

      <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, display: 'block', mb: 2 }}>
        Assigning a CAD designer snapshots their fee into the quote (folds into COG) and grants them access to the
        client + internal comms threads. Their bench work order is created when CAD work begins.
      </Typography>

      {assignments.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px dashed ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
          <Typography sx={{ color: REPAIRS_UI.textSecondary }}>No artisans assigned yet.</Typography>
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {assignments.map((a) => {
            const meta = ROLE_META[a.role] || ROLE_META.cad;
            const Icon = meta.Icon;
            return (
              <Paper key={a.id} sx={{ p: 2, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar sx={{ bgcolor: REPAIRS_UI.bgTertiary }}><Icon sx={{ color: meta.color }} /></Avatar>
                    <Box>
                      <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textPrimary }}>{a.name}</Typography>
                      <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
                        <Chip size="small" label={meta.label} variant="outlined" sx={{ height: 20, borderColor: REPAIRS_UI.border, color: REPAIRS_UI.textSecondary }} />
                        {a.artisanType && <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>{a.artisanType}</Typography>}
                        {a.assignedAt && <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>· assigned {new Date(a.assignedAt).toLocaleDateString()}</Typography>}
                      </Stack>
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    {a.role === 'cad' && <Box sx={{ textAlign: 'right' }}><Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, display: 'block' }}>CAD fee</Typography><Typography sx={{ fontWeight: 600, color: REPAIRS_UI.accent }}>{money(a.feeSnapshot)}</Typography></Box>}
                    <IconButton size="small" disabled={busy} onClick={() => remove(a.id)} sx={{ color: REPAIRS_UI.textMuted }}><DeleteIcon fontSize="small" /></IconButton>
                  </Stack>
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      )}

      <Dialog open={open} onClose={() => !busy && setOpen(false)} fullWidth maxWidth="sm" PaperProps={dialogPaperProps}>
        <DialogTitle>Assign Artisan</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField select label="Role" value={role} onChange={(e) => setRole(e.target.value)} fullWidth>
              <MenuItem value="cad">CAD Designer (fee → quote)</MenuItem>
              <MenuItem value="bench">Bench Jeweler</MenuItem>
            </TextField>
            <TextField select label="Artisan" value={userID} onChange={(e) => pickArtisan(e.target.value)} fullWidth>
              {artisans.length === 0 && <MenuItem value="" disabled>No assignable artisans found</MenuItem>}
              {artisans.map((a) => (
                <MenuItem key={a.userID} value={a.userID}>
                  {a.name}{a.artisanType ? ` · ${a.artisanType}` : ''}{a.customDesignFee ? ` · ${money(a.customDesignFee)}` : ''}
                </MenuItem>
              ))}
            </TextField>
            {role === 'cad' && (
              <>
                <TextField
                  label="CAD design fee" type="number" value={fee} disabled={!picked}
                  onChange={(e) => setFee(e.target.value)}
                  InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                  helperText={picked
                    ? (picked.customDesignFee > 0 ? 'Defaults to the designer’s profile fee — edit to override for this custom.' : 'This designer has no profile fee — enter the fee for this custom.')
                    : 'Pick a designer to set their fee.'}
                  fullWidth
                />
                <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>
                  {Number(fee) > 0 ? `${money(Number(fee))} will be folded into the quote (COG → markup) and paid to the designer on QC approval.` : 'No design fee will be added to the quote.'}
                </Typography>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} sx={{ color: REPAIRS_UI.textSecondary }}>Cancel</Button>
          <Button variant="contained" onClick={assign} disabled={busy || !userID} sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, '&:hover': { backgroundColor: '#C19B2E' } }}>Assign</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
