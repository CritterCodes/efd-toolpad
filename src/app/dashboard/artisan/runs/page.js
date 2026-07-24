'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Paper, Stack, Chip, Button, CircularProgress, Snackbar, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, Autocomplete, TextField, IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

const STATUS_COLORS = {
  planned: REPAIRS_UI.textMuted, casting: '#66BB6A', bench: '#42A5F5',
  qc: '#FFA726', done: REPAIRS_UI.accent, cancelled: '#EF5350',
};

/**
 * My Runs — an artisan's production runs (PRODUCTION_RUNS.md §2). List + a create wizard that
 * mints a solo run immediately, or plans a collaborative run to await dual-signature (§4e).
 */
export default function MyRunsPage() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snack, setSnack] = useState(null);
  const [open, setOpen] = useState(false);

  const notify = (message, severity = 'success') => setSnack({ message, severity });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/production/runs');
      const d = await r.json().catch(() => ({}));
      setRuns(Array.isArray(d.runs) ? d.runs : []);
    } catch { setRuns([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <Box sx={{ pb: 6 }}>
      <Paper sx={{ p: { xs: 2, md: 3 }, mb: 3, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography sx={{ fontSize: { xs: 22, md: 28 }, fontWeight: 600, color: REPAIRS_UI.textHeader }}>My Runs</Typography>
            <Typography sx={{ color: REPAIRS_UI.textSecondary }}>Produce a limited run of one of your designs — solo or with collaborators.</Typography>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}
            sx={{ bgcolor: REPAIRS_UI.accent, color: '#1a1205', textTransform: 'none', '&:hover': { bgcolor: REPAIRS_UI.accent } }}>
            Start a run
          </Button>
        </Stack>
      </Paper>

      {loading
        ? <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress sx={{ color: REPAIRS_UI.accent }} /></Stack>
        : runs.length === 0
          ? <Paper sx={{ p: 5, textAlign: 'center', backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px dashed ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
              <Typography sx={{ color: REPAIRS_UI.textSecondary }}>No runs yet. Start one to mint a batch of pieces against a design’s edition.</Typography>
            </Paper>
          : (
            <Stack spacing={1.5}>
              {runs.map((run) => (
                <Paper key={run.runId} sx={{ p: 2, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Box sx={{ minWidth: 0 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip size="small" label={run.status} sx={{ height: 20, color: '#1a1205', bgcolor: STATUS_COLORS[run.status] || REPAIRS_UI.textMuted, fontWeight: 700 }} />
                        <Typography variant="body2" sx={{ color: REPAIRS_UI.textHeader }}>
                          {(run.items || []).reduce((n, it) => n + (Number(it.qty) || 0), 0)} pieces · {(run.items || []).length} variant(s)
                        </Typography>
                        {run.collaborators?.length > 0 && <Chip size="small" variant="outlined" label={`collab ×${run.collaborators.length}`} sx={{ height: 20, color: REPAIRS_UI.textMuted, borderColor: REPAIRS_UI.border }} />}
                      </Stack>
                      <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>{run.designID}</Typography>
                    </Box>
                    {run.status === 'planned' && run.collaborators?.length > 0 && (
                      <Button size="small" startIcon={<PlayArrowIcon sx={{ fontSize: 16 }} />}
                        onClick={async () => {
                          const r = await fetch(`/api/production/runs/${run.runId}/mint`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
                          const d = await r.json().catch(() => ({}));
                          if (r.ok) { notify('Run minted'); load(); } else { notify(d.error || 'Mint blocked', 'error'); }
                        }}
                        sx={{ color: REPAIRS_UI.accent, textTransform: 'none' }}>Mint</Button>
                    )}
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}

      <NewRunDialog open={open} onClose={() => setOpen(false)} notify={notify} onCreated={load} />
      <Snackbar open={Boolean(snack)} autoHideDuration={4000} onClose={() => setSnack(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {snack ? <Alert severity={snack.severity} onClose={() => setSnack(null)} sx={{ width: '100%' }}>{snack.message}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}

/** Pick one of the artisan's ready designs, set a quantity per variant, create the run. */
function NewRunDialog({ open, onClose, notify, onCreated }) {
  const [designs, setDesigns] = useState([]);
  const [design, setDesign] = useState(null);
  const [qty, setQty] = useState({});   // variantId → qty
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch('/api/production/designs')
      .then((r) => r.json()).then((d) => setDesigns((Array.isArray(d) ? d : d.designs || []).filter((x) => x.category !== 'gemstone')))
      .catch(() => setDesigns([]));
  }, [open]);

  const submit = async () => {
    const items = Object.entries(qty).map(([variantId, q]) => ({ variantId, qty: Number(q) || 0 })).filter((it) => it.qty > 0);
    if (!design || items.length === 0) { notify('Pick a design and at least one quantity.', 'warning'); return; }
    setBusy(true);
    try {
      const r = await fetch('/api/production/runs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ designID: design.designID, items }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { notify(d.error || 'Could not start the run.', 'error'); return; }
      notify(d.minted ? 'Run minted — pieces are in production.' : 'Run planned — awaiting collaborator signatures.');
      onClose(); onCreated(); setDesign(null); setQty({});
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}` } }}>
      <DialogTitle sx={{ color: REPAIRS_UI.textHeader }}>Start a run</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <Autocomplete
            size="small" options={designs}
            getOptionLabel={(d) => d.name || d.designID}
            isOptionEqualToValue={(o, v) => o.designID === v.designID}
            value={design}
            onChange={(_, d) => { setDesign(d); setQty({}); }}
            renderInput={(params) => <TextField {...params} label="Design" placeholder="one of your designs…" />}
          />
          {design && (design.variants || []).map((v) => (
            <Stack key={v.variantId} direction="row" alignItems="center" spacing={1}>
              <Typography variant="body2" sx={{ flex: 1, color: REPAIRS_UI.textHeader }}>{v.sku || v.variantId}</Typography>
              <TextField size="small" type="number" label="qty" value={qty[v.variantId] || ''} inputProps={{ min: 0 }}
                onChange={(e) => setQty((prev) => ({ ...prev, [v.variantId]: e.target.value }))} sx={{ width: 90 }} />
            </Stack>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ color: REPAIRS_UI.textMuted, textTransform: 'none' }}>Cancel</Button>
        <Button onClick={submit} disabled={busy} variant="contained" sx={{ bgcolor: REPAIRS_UI.accent, color: '#1a1205', textTransform: 'none', '&:hover': { bgcolor: REPAIRS_UI.accent } }}>
          {busy ? 'Starting…' : 'Start run'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
