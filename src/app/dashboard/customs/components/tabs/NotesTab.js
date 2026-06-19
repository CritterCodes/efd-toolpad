import React, { useState } from 'react';
import {
  Box, Paper, Stack, Typography, Button, Chip, IconButton, Avatar,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import PersonIcon from '@mui/icons-material/Person';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

const dialogPaperProps = { sx: { backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', color: REPAIRS_UI.textPrimary, border: `1px solid ${REPAIRS_UI.border}` } };

export default function NotesTab({ customID, notes = [], onChanged, notify }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [type, setType] = useState('internal');
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/custom-orders/${customID}/notes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, type }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to add note');
      setText(''); setType('internal'); setOpen(false);
      await onChanged();
    } catch (e) { notify(e.message, 'error'); } finally { setBusy(false); }
  };
  const del = async (id) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/custom-orders/${customID}/notes/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to delete note');
      await onChanged();
    } catch (e) { notify(e.message, 'error'); } finally { setBusy(false); }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader }}>Notes ({notes.length})</Typography>
        <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)} sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, '&:hover': { backgroundColor: '#C19B2E' } }}>Add Note</Button>
      </Stack>

      {notes.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px dashed ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
          <Typography sx={{ color: REPAIRS_UI.textSecondary }}>No notes yet.</Typography>
        </Paper>
      ) : (
        <Stack spacing={1.5} sx={{ maxHeight: 480, overflowY: 'auto', pr: 0.5 }}>
          {notes.map((n) => (
            <Paper key={n.id} sx={{ p: 2, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Stack direction="row" spacing={1} alignItems="center">
                  <Avatar sx={{ width: 24, height: 24, bgcolor: REPAIRS_UI.bgTertiary }}><PersonIcon sx={{ fontSize: 14, color: REPAIRS_UI.textSecondary }} /></Avatar>
                  <Typography variant="body2" sx={{ color: REPAIRS_UI.textPrimary, fontWeight: 600 }}>{n.author || 'admin'}</Typography>
                  <Chip size="small" label={n.type === 'client_visible' ? 'Client Visible' : 'Internal'} color={n.type === 'client_visible' ? 'info' : 'default'} variant="outlined" sx={{ height: 20 }} />
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>{n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}</Typography>
                  <IconButton size="small" disabled={busy} onClick={() => del(n.id)} sx={{ color: REPAIRS_UI.textMuted }}><DeleteIcon fontSize="small" /></IconButton>
                </Stack>
              </Stack>
              <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary, mt: 1, whiteSpace: 'pre-wrap' }}>{n.text}</Typography>
              {Array.isArray(n.tags) && n.tags.length > 0 && (
                <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap' }}>
                  {n.tags.map((tag) => <Chip key={tag} size="small" label={tag} variant="outlined" sx={{ height: 20, borderColor: REPAIRS_UI.border, color: REPAIRS_UI.textMuted }} />)}
                </Stack>
              )}
            </Paper>
          ))}
        </Stack>
      )}

      <Dialog open={open} onClose={() => !busy && setOpen(false)} fullWidth maxWidth="sm" PaperProps={dialogPaperProps}>
        <DialogTitle>Add Note</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Note" value={text} onChange={(e) => setText(e.target.value)} fullWidth multiline minRows={3} autoFocus />
            <TextField select label="Visibility" value={type} onChange={(e) => setType(e.target.value)} fullWidth>
              <MenuItem value="internal">Internal</MenuItem>
              <MenuItem value="client_visible">Client Visible</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} sx={{ color: REPAIRS_UI.textSecondary }}>Cancel</Button>
          <Button variant="contained" onClick={add} disabled={busy || !text.trim()} sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, '&:hover': { backgroundColor: '#C19B2E' } }}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
