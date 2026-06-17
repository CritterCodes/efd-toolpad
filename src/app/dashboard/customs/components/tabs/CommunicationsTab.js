import React, { useState } from 'react';
import { Box, Paper, Stack, Typography, Tabs, Tab, TextField, Button } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

const THREADS = [
  { key: 'client', label: 'Client', hint: 'Visible to the client on the storefront portal.' },
  { key: 'internal', label: 'Internal', hint: 'Team-only — not shown to the client.' },
];

export default function CommunicationsTab({ customID, communications = [], onChanged, notify }) {
  const [thread, setThread] = useState('client');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const active = THREADS.find((t) => t.key === thread);
  const messages = (communications || []).filter((m) => (m.thread || 'client') === thread);

  const send = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/custom-orders/${customID}/communications`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, thread }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to send');
      setText('');
      await onChanged();
    } catch (e) { notify(e.message, 'error'); } finally { setBusy(false); }
  };

  return (
    <Box>
      <Tabs value={thread} onChange={(_, v) => setThread(v)} sx={{ mb: 2, '& .MuiTab-root': { color: REPAIRS_UI.textSecondary, textTransform: 'none' }, '& .Mui-selected': { color: REPAIRS_UI.accent }, '& .MuiTabs-indicator': { bgcolor: REPAIRS_UI.accent } }}>
        {THREADS.map((t) => <Tab key={t.key} value={t.key} label={`${t.label} (${(communications || []).filter((m) => (m.thread || 'client') === t.key).length})`} />)}
      </Tabs>
      <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, display: 'block', mb: 1.5 }}>{active.hint}</Typography>

      <Stack spacing={1.25} sx={{ mb: 2, maxHeight: 360, overflowY: 'auto' }}>
        {messages.length === 0 ? (
          <Paper sx={{ p: 3, textAlign: 'center', backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px dashed ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
            <Typography sx={{ color: REPAIRS_UI.textSecondary }}>No messages in this thread yet.</Typography>
          </Paper>
        ) : messages.map((m) => (
          <Paper key={m.id} sx={{ p: 1.5, backgroundColor: REPAIRS_UI.bgCard, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none', alignSelf: m.direction === 'inbound' ? 'flex-start' : 'flex-end', maxWidth: '85%' }}>
            <Stack direction="row" justifyContent="space-between" spacing={2}>
              <Typography variant="caption" sx={{ color: REPAIRS_UI.textSecondary, fontWeight: 600 }}>{m.author || (m.direction === 'inbound' ? 'Client' : 'admin')}</Typography>
              <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>{m.createdAt ? new Date(m.createdAt).toLocaleString() : ''}</Typography>
            </Stack>
            <Typography variant="body2" sx={{ color: REPAIRS_UI.textPrimary, mt: 0.5, whiteSpace: 'pre-wrap' }}>{m.text}</Typography>
          </Paper>
        ))}
      </Stack>

      <Stack direction="row" spacing={1} alignItems="flex-end">
        <TextField placeholder={`Message the ${active.label.toLowerCase()} thread…`} value={text} onChange={(e) => setText(e.target.value)} fullWidth multiline maxRows={4} size="small" />
        <Button variant="contained" endIcon={<SendIcon />} disabled={busy || !text.trim()} onClick={send} sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, '&:hover': { backgroundColor: '#C19B2E' } }}>Send</Button>
      </Stack>
    </Box>
  );
}
