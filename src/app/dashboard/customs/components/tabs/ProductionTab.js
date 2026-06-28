import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Stack, Typography, Button, Chip, Grid, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DownloadIcon from '@mui/icons-material/Download';
import PaletteIcon from '@mui/icons-material/Palette';
import { useRouter } from 'next/navigation';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';
import MaterialAssigner from '@/components/viewers/MaterialAssigner';

const dialogPaperProps = { sx: { backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', color: REPAIRS_UI.textPrimary, border: `1px solid ${REPAIRS_UI.border}` } };
const panelSx = { p: 2.5, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' };
const money = (n) => `$${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const LANES = [
  { value: 'cad', label: 'CAD' },
  { value: 'bench_jewelry', label: 'Bench' },
  { value: 'engraving', label: 'Engraving' },
  { value: 'gem_cutting', label: 'Gem Cutting' },
];
const LANE_LABEL = Object.fromEntries(LANES.map((l) => [l.value, l.label]));

function statusColor(s = '') {
  if (/PROGRESS/i.test(s)) return 'primary';
  if (/\bQC\b|QUALITY/i.test(s)) return 'secondary';
  if (/READY/i.test(s)) return 'info';
  if (/COMPLETED/i.test(s)) return 'success';
  return 'default';
}

export default function ProductionTab({ customID, order, margin, notify, onChanged }) {
  const router = useRouter();
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const EMPTY_FORM = { discipline: 'bench_jewelry', cadStage: 'glb', title: '', estLaborHours: '', assignedToUserID: '', fee: '' };
  const [form, setForm] = useState(EMPTY_FORM);
  const [artisans, setArtisans] = useState([]);
  const [castOpen, setCastOpen] = useState(false);
  const EMPTY_CAST = { amount: '', vendor: '', invoiceNumber: '', notes: '' };
  const [castForm, setCastForm] = useState(EMPTY_CAST);
  const [busy, setBusy] = useState(false);
  const [assignGlbUrl, setAssignGlbUrl] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/custom-orders/${customID}/work-orders`);
      setWorkOrders(res.ok ? await res.json() : []);
    } finally { setLoading(false); }
  }, [customID]);
  useEffect(() => { load(); }, [load]);
  // Load assignable artisans when the dialog opens (for CAD assignment).
  useEffect(() => {
    if (!addOpen) return;
    fetch('/api/custom-orders/assignable-artisans').then((r) => r.ok ? r.json() : []).then(setArtisans).catch(() => setArtisans([]));
  }, [addOpen]);

  const isCad = form.discipline === 'cad';
  const add = async () => {
    setBusy(true);
    try {
      const payload = { discipline: form.discipline, title: form.title || null, estLaborHours: Number(form.estLaborHours) || 0 };
      if (isCad) {
        payload.cadStage = form.cadStage;
        if (form.assignedToUserID) payload.assignedToUserID = form.assignedToUserID;
        if (form.fee !== '') payload.flatFee = Number(form.fee) || 0; // designer/modeler payout on the WO (→ COGS)
      }
      const res = await fetch(`/api/custom-orders/${customID}/work-orders`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to add work order');
      setAddOpen(false); setForm(EMPTY_FORM);
      notify('Work order added — routed to the bench', 'success');
      await load(); await onChanged?.();
    } catch (e) { notify(e.message, 'error'); } finally { setBusy(false); }
  };

  const addCasting = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/custom-orders/${customID}/casting`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(castForm.amount) || 0, vendor: castForm.vendor, invoiceNumber: castForm.invoiceNumber, notes: castForm.notes }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to record casting');
      setCastOpen(false); setCastForm(EMPTY_CAST);
      notify('Casting recorded — COGS + ledger updated, bench ticket printing', 'success');
      // Print the bench "ready for work" ticket immediately so the cast piece can be binned.
      if (typeof window !== 'undefined') window.open(`/dashboard/customs/${customID}/print`, '_blank');
      await load(); await onChanged?.();
    } catch (e) { notify(e.message, 'error'); } finally { setBusy(false); }
  };

  return (
    <Stack spacing={2}>
      {/* COGS rollup */}
      <Paper sx={panelSx}>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <BuildCircleIcon sx={{ color: REPAIRS_UI.accent }} />
            <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader }}>Production &amp; COGS</Typography>
          </Stack>
          <Button size="small" variant="outlined" disabled={busy} onClick={() => setCastOpen(true)} sx={{ borderColor: REPAIRS_UI.border, color: REPAIRS_UI.textPrimary }}>Casting received</Button>
        </Stack>
        <Grid container spacing={2}>
          <Grid item xs={6} sm={3}><Typography variant="caption" sx={{ color: REPAIRS_UI.textSecondary }}>Work orders</Typography><Typography sx={{ fontWeight: 700, color: REPAIRS_UI.textPrimary }}>{workOrders.length}</Typography></Grid>
          <Grid item xs={6} sm={3}><Typography variant="caption" sx={{ color: REPAIRS_UI.textSecondary }}>Pieces</Typography><Typography sx={{ fontWeight: 700, color: REPAIRS_UI.textPrimary }}>{(order.pieceIDs || []).length}</Typography></Grid>
          <Grid item xs={6} sm={3}><Typography variant="caption" sx={{ color: REPAIRS_UI.textSecondary }}>Piece COGS</Typography><Typography sx={{ fontWeight: 700, color: REPAIRS_UI.textPrimary }}>{money(margin?.cogs)}</Typography></Grid>
          <Grid item xs={6} sm={3}><Typography variant="caption" sx={{ color: REPAIRS_UI.textSecondary }}>Margin</Typography><Typography sx={{ fontWeight: 700, color: (margin?.margin ?? 0) >= 0 ? '#66BB6A' : '#EF5350' }}>{money(margin?.margin)} ({margin?.marginPct ?? 0}%)</Typography></Grid>
        </Grid>
        {order.clientMgmtBonusAwarded && (order.clientMgmtBonus || 0) > 0 && (
          <Typography variant="caption" display="block" sx={{ mt: 1, color: '#66BB6A' }}>
            Client-management bonus paid: {money(order.clientMgmtBonus)} (designer managed the client).
          </Typography>
        )}
        <Typography variant="caption" display="block" sx={{ mt: 1.5, color: REPAIRS_UI.textMuted, lineHeight: 1.5 }}>
          Work orders are generated from the quote&rsquo;s labor tasks when the order reaches production (deposit ≥ 50%);
          the CAD work order is created at designer assignment. Each routes to its discipline lane on the bench, and
          labor logged there rolls into piece COGS → margin. Use &ldquo;Add work order&rdquo; for anything beyond the quote plan.
        </Typography>
      </Paper>

      {/* Work orders */}
      <Box>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
          <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader }}>Work orders</Typography>
          <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setAddOpen(true)} sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, '&:hover': { backgroundColor: '#C19B2E' } }}>Add work order</Button>
        </Stack>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress sx={{ color: REPAIRS_UI.accent }} /></Box>
        ) : workOrders.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center', backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px dashed ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
            <Typography sx={{ color: REPAIRS_UI.textSecondary }}>No work orders yet. Add one (or assign a CAD designer) to start production.</Typography>
          </Paper>
        ) : (
          <Stack spacing={1.25}>
            {workOrders.map((wo) => (
              <Paper key={wo.workOrderID} sx={{ p: 1.75, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1} flexWrap="wrap">
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                    <Chip size="small" label={LANE_LABEL[wo.discipline] || wo.discipline} variant="outlined" sx={{ borderColor: REPAIRS_UI.border, color: REPAIRS_UI.textSecondary }} />
                    <Typography variant="body2" sx={{ color: REPAIRS_UI.textPrimary }} noWrap>{wo.title || wo.discipline}</Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {wo.labor?.value > 0 && <Typography variant="caption" sx={{ color: REPAIRS_UI.textSecondary }}>labor {money(wo.labor.value)}</Typography>}
                    <Chip size="small" label={wo.assignedJeweler || 'Unclaimed'} variant="outlined" sx={{ height: 22, borderColor: REPAIRS_UI.border, color: REPAIRS_UI.textSecondary }} />
                    <Chip size="small" label={wo.status || '—'} color={statusColor(wo.status)} />
                  </Stack>
                </Stack>
                {(wo.files?.stl?.url || wo.files?.glb?.url) && (
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 1, pl: 0.25 }}>
                    {wo.files?.stl?.url && (
                      <Button size="small" variant="outlined" startIcon={<DownloadIcon sx={{ fontSize: 15 }} />} component="a" href={wo.files.stl.url} target="_blank" rel="noreferrer" sx={{ color: '#64B5F6', borderColor: REPAIRS_UI.border, textTransform: 'none' }}>
                        STL{wo.files.stl.originalName ? ` · ${wo.files.stl.originalName}` : ''}{wo.files.stl.volumeCm3 ? ` (${wo.files.stl.volumeCm3} cm³)` : ''}
                      </Button>
                    )}
                    {wo.files?.glb?.url && (
                      <>
                        <Button size="small" variant="outlined" startIcon={<DownloadIcon sx={{ fontSize: 15 }} />} component="a" href={wo.files.glb.url} target="_blank" rel="noreferrer" sx={{ color: '#66BB6A', borderColor: REPAIRS_UI.border, textTransform: 'none' }}>
                          GLB{wo.files.glb.originalName ? ` · ${wo.files.glb.originalName}` : ''}
                        </Button>
                        <Button size="small" variant="outlined" startIcon={<PaletteIcon sx={{ fontSize: 15 }} />} onClick={() => setAssignGlbUrl(wo.files.glb.url)} sx={{ color: REPAIRS_UI.accent, borderColor: REPAIRS_UI.border, textTransform: 'none' }}>
                          Assign materials
                        </Button>
                      </>
                    )}
                  </Stack>
                )}
              </Paper>
            ))}
            <Button size="small" startIcon={<OpenInNewIcon sx={{ fontSize: 15 }} />} onClick={() => router.push('/dashboard/repairs/my-bench')} sx={{ alignSelf: 'flex-start', color: REPAIRS_UI.textSecondary }}>Open the bench</Button>
          </Stack>
        )}
      </Box>

      <Dialog open={addOpen} onClose={() => !busy && setAddOpen(false)} fullWidth maxWidth="sm" PaperProps={dialogPaperProps}>
        <DialogTitle>Add work order</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField select label="Discipline" value={form.discipline} onChange={(e) => setForm((f) => ({ ...f, discipline: e.target.value }))} fullWidth>
              {LANES.map((l) => <MenuItem key={l.value} value={l.value}>{l.label}</MenuItem>)}
            </TextField>
            {isCad && (
              <>
                <TextField select label="CAD stage" value={form.cadStage} onChange={(e) => setForm((f) => ({ ...f, cadStage: e.target.value }))} fullWidth>
                  <MenuItem value="design">Design (STL — casting)</MenuItem>
                  <MenuItem value="glb">GLB (web viewer)</MenuItem>
                </TextField>
                <TextField select label="Assign CAD designer (optional)" value={form.assignedToUserID} onChange={(e) => setForm((f) => ({ ...f, assignedToUserID: e.target.value, fee: f.fee || (artisans.find((a) => a.userID === e.target.value)?.customDesignFee || '') }))} fullWidth helperText="Assigning snapshots their CAD fee into COGS.">
                  <MenuItem value="">Unassigned (claimed from the bench)</MenuItem>
                  {artisans.map((a) => <MenuItem key={a.userID} value={a.userID}>{a.name}{a.customDesignFee ? ` · $${a.customDesignFee.toLocaleString()}` : ''}</MenuItem>)}
                </TextField>
                <TextField label={form.cadStage === 'glb' ? 'GLB fee' : 'CAD fee'} type="number" value={form.fee} onChange={(e) => setForm((f) => ({ ...f, fee: e.target.value }))} fullWidth InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} helperText={form.cadStage === 'glb' ? 'Modeler payout (→ COGS). Adds a "GLB Creation" labor line to the quote (cost from the custom task; editable there).' : 'Folds into the quote (designFee) + paid on QC.'} />
              </>
            )}
            <TextField label="Title" placeholder="e.g. Cast cleanup & stone setting" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} fullWidth />
            {!isCad && <TextField label="Est. labor hours" type="number" value={form.estLaborHours} onChange={(e) => setForm((f) => ({ ...f, estLaborHours: e.target.value }))} fullWidth />}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)} sx={{ color: REPAIRS_UI.textSecondary }}>Cancel</Button>
          <Button variant="contained" onClick={add} disabled={busy} sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, '&:hover': { backgroundColor: '#C19B2E' } }}>Add</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={castOpen} onClose={() => !busy && setCastOpen(false)} fullWidth maxWidth="sm" PaperProps={dialogPaperProps}>
        <DialogTitle>Casting received</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>Records the vendor casting invoice → piece COGS + finance/expenses ledger (both stamped with the invoice #), and generates the in-house bench work orders from the quote.</Typography>
            <TextField label="Amount" type="number" value={castForm.amount} onChange={(e) => setCastForm((f) => ({ ...f, amount: e.target.value }))} fullWidth />
            <TextField label="Casting vendor" value={castForm.vendor} onChange={(e) => setCastForm((f) => ({ ...f, vendor: e.target.value }))} fullWidth />
            <TextField label="Vendor invoice #" value={castForm.invoiceNumber} onChange={(e) => setCastForm((f) => ({ ...f, invoiceNumber: e.target.value }))} fullWidth />
            <TextField label="Notes" value={castForm.notes} onChange={(e) => setCastForm((f) => ({ ...f, notes: e.target.value }))} fullWidth multiline minRows={2} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCastOpen(false)} sx={{ color: REPAIRS_UI.textSecondary }}>Cancel</Button>
          <Button variant="contained" onClick={addCasting} disabled={busy || !(Number(castForm.amount) > 0)} sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, '&:hover': { backgroundColor: '#C19B2E' } }}>Record</Button>
        </DialogActions>
      </Dialog>

      <MaterialAssigner
        open={!!assignGlbUrl}
        onClose={() => setAssignGlbUrl(null)}
        customID={customID}
        glbUrl={assignGlbUrl}
        initialDesignModel={order?.designModel}
        onSaved={() => { setAssignGlbUrl(null); onChanged?.(); }}
      />
    </Stack>
  );
}
