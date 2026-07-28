'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Paper, Stack, Chip, Button, CircularProgress, Snackbar, Alert, TextField, IconButton,
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CloseIcon from '@mui/icons-material/Close';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

const STATUS_COLORS = { draft: REPAIRS_UI.textMuted, scheduled: '#FFA726', released: '#66BB6A', archived: '#EF5350' };

/**
 * My Drops — an artisan's owned + collaborated drops with collaborator management (artisan-owned
 * drops). Owners can add/remove collaborators (releasing stays with EFD staff).
 */
export default function MyDropsPage() {
  const [drops, setDrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState(null);
  const [snack, setSnack] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dropsRes, meRes] = await Promise.all([fetch('/api/production/drops'), fetch('/api/auth/session')]);
      const d = await dropsRes.json().catch(() => ({}));
      const s = await meRes.json().catch(() => ({}));
      setDrops(Array.isArray(d) ? d : d.drops || []);
      setMe(s?.user?.userID || s?.user?.email || null);
    } catch { setDrops([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const owns = (drop) => drop.ownerType === 'artisan' && (drop.ownerId === me);

  const change = async (dropId, payload) => {
    const r = await fetch(`/api/production/drops/${dropId}/collaborators`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    const d = await r.json().catch(() => ({}));
    if (r.ok) { setSnack({ message: 'Collaborators updated.', severity: 'success' }); load(); }
    else { setSnack({ message: d.error || 'Update failed.', severity: 'error' }); }
  };

  if (loading) return <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress sx={{ color: REPAIRS_UI.accent }} /></Stack>;

  return (
    <Box sx={{ pb: 6 }}>
      <Paper sx={{ p: { xs: 2, md: 3 }, mb: 3, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
        <Typography sx={{ fontSize: { xs: 22, md: 28 }, fontWeight: 600, color: REPAIRS_UI.textHeader }}>My Drops</Typography>
        <Typography sx={{ color: REPAIRS_UI.textSecondary }}>Drops you own or collaborate on. Owners curate collaborators; EFD handles release.</Typography>
      </Paper>

      {drops.length === 0
        ? <Paper sx={{ p: 5, textAlign: 'center', backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px dashed ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
            <Typography sx={{ color: REPAIRS_UI.textSecondary }}>No drops yet.</Typography>
          </Paper>
        : (
          <Stack spacing={1.5}>
            {drops.map((drop) => (
              <DropCard key={drop.dropId} drop={drop} owned={owns(drop)} onChange={change} STATUS_COLORS={STATUS_COLORS} />
            ))}
          </Stack>
        )}

      <Snackbar open={Boolean(snack)} autoHideDuration={4000} onClose={() => setSnack(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {snack ? <Alert severity={snack.severity} onClose={() => setSnack(null)} sx={{ width: '100%' }}>{snack.message}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}

function DropCard({ drop, owned, onChange, STATUS_COLORS }) {
  const [add, setAdd] = useState('');
  return (
    <Paper sx={{ p: 2, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Box>
          <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader }}>{drop.name}</Typography>
          <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>{drop.slug}</Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip size="small" label={drop.status} sx={{ height: 20, color: '#1a1205', bgcolor: STATUS_COLORS[drop.status] || REPAIRS_UI.textMuted, fontWeight: 700 }} />
          <Chip size="small" variant="outlined" label={owned ? 'owner' : 'collaborator'} sx={{ height: 20, color: REPAIRS_UI.textMuted, borderColor: REPAIRS_UI.border }} />
        </Stack>
      </Stack>

      <Typography variant="caption" sx={{ color: REPAIRS_UI.textSecondary, display: 'block', mb: 0.5 }}>Collaborators</Typography>
      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: owned ? 1 : 0 }}>
        {(drop.collaborators || []).length === 0 && <Typography variant="body2" sx={{ color: REPAIRS_UI.textMuted }}>None.</Typography>}
        {(drop.collaborators || []).map((c) => (
          <Chip key={c} size="small" label={c}
            onDelete={owned ? () => onChange(drop.dropId, { remove: c }) : undefined}
            deleteIcon={owned ? <CloseIcon /> : undefined}
            sx={{ bgcolor: REPAIRS_UI.bgTertiary, color: REPAIRS_UI.textSecondary, border: `1px solid ${REPAIRS_UI.border}` }} />
        ))}
      </Stack>

      {owned && (
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField size="small" placeholder="artisan userID" value={add} onChange={(e) => setAdd(e.target.value)} sx={{ maxWidth: 240 }} />
          <Button size="small" startIcon={<PersonAddIcon sx={{ fontSize: 16 }} />} disabled={!add.trim()}
            onClick={() => { onChange(drop.dropId, { add: add.trim() }); setAdd(''); }}
            sx={{ color: REPAIRS_UI.accent, textTransform: 'none' }}>Add</Button>
        </Stack>
      )}
    </Paper>
  );
}
