'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Grid, Snackbar, Stack, TextField, Typography } from '@mui/material';
import FactoryIcon from '@mui/icons-material/Factory';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import HandymanIcon from '@mui/icons-material/Handyman';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

const emptyForm = { amount: '', purchaseOrder: '', invoiceNumber: '', vendor: '', hours: '', notes: '' };

export default function CastingBoardPage() {
  const [pieces, setPieces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/production/casting');
      if (!response.ok) throw new Error('Failed to load casting queue.');
      setPieces(await response.json());
    } catch (error) { setSnack({ open: true, message: error.message, severity: 'error' }); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const open = (piece, action) => { setDialog({ piece, action }); setForm({ ...emptyForm, amount: piece.casting?.amount || '', vendor: piece.casting?.vendor || '' }); };
  const submit = async () => {
    setBusy(true);
    try {
      const response = await fetch(`/api/production/casting/${dialog.piece.pieceID}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: dialog.action, ...form }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Casting action failed.');
      setDialog(null); setSnack({ open: true, message: 'Casting queue updated.', severity: 'success' }); await load();
    } catch (error) { setSnack({ open: true, message: error.message, severity: 'error' }); }
    finally { setBusy(false); }
  };

  return <Box sx={{ pb: 6 }}>
    <Box sx={{ backgroundColor: REPAIRS_UI.bgPanel, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 3, p: { xs: 2, md: 3 }, mb: 3 }}>
      <Typography sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, color: REPAIRS_UI.accent, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}><FactoryIcon fontSize="small" /> Shared production</Typography>
      <Typography sx={{ color: REPAIRS_UI.textHeader, fontSize: { xs: 28, md: 36 }, fontWeight: 600, mt: 1 }}>Casting board</Typography>
      <Typography sx={{ color: REPAIRS_UI.textSecondary, mt: 1 }}>Custom and production pieces waiting for metal. Carrera is material expense; in-house casting enters the claimable labor bench.</Typography>
    </Box>
    {loading ? <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress sx={{ color: REPAIRS_UI.accent }} /></Box> :
      <Grid container spacing={2}>{pieces.map((piece) => {
        const state = piece.casting?.state || 'needs_ordering';
        return <Grid item xs={12} md={6} lg={4} key={piece.pieceID}><Card sx={{ height: '100%', bgcolor: REPAIRS_UI.bgCard, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}` }}><CardContent>
          <Stack direction="row" justifyContent="space-between"><Chip size="small" label={piece.customOrderID ? 'Custom' : 'Production'} /><Chip size="small" label={state.replace('_', ' ')} color={state === 'ordered' ? 'info' : 'warning'} /></Stack>
          <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 700, fontSize: 18, mt: 2 }}>{piece.sku || piece.pieceID.slice(0, 8)}</Typography>
          <Typography sx={{ color: REPAIRS_UI.textSecondary, mb: 2 }}>{[piece.metalType, piece.karat].filter(Boolean).join(' ') || 'Metal not specified'}</Typography>
          {state === 'needs_ordering' ? <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}><Button variant="outlined" startIcon={<LocalShippingIcon />} onClick={() => open(piece, 'order_carrera')}>Order from Carrera</Button><Button variant="outlined" startIcon={<HandymanIcon />} onClick={() => open(piece, 'cast_in_house')}>Cast in-house</Button></Stack> : <Button variant="contained" onClick={() => open(piece, 'mark_received')} sx={{ bgcolor: REPAIRS_UI.accent, color: '#1A1A1A' }}>Mark received</Button>}
        </CardContent></Card></Grid>;
      })}</Grid>}
    {!loading && pieces.length === 0 && <Alert severity="info">No pieces are waiting on casting.</Alert>}
    <Dialog open={!!dialog} onClose={() => !busy && setDialog(null)} fullWidth maxWidth="sm"><DialogTitle>{dialog?.action === 'order_carrera' ? 'Order from Carrera' : dialog?.action === 'cast_in_house' ? 'Cast in-house' : 'Mark casting received'}</DialogTitle><DialogContent><Stack spacing={2} sx={{ mt: 1 }}>
      {dialog?.action === 'cast_in_house' ? <TextField label="Estimated labor hours" type="number" value={form.hours} onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))} /> : <><TextField label="Casting amount" type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />{dialog?.action === 'order_carrera' && <TextField label="Vendor PO" value={form.purchaseOrder} onChange={(e) => setForm((f) => ({ ...f, purchaseOrder: e.target.value }))} />}<TextField label="Invoice #" value={form.invoiceNumber} onChange={(e) => setForm((f) => ({ ...f, invoiceNumber: e.target.value }))} />{dialog?.action === 'mark_received' && <TextField label="Vendor" value={form.vendor} onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))} />}</>}
    </Stack></DialogContent><DialogActions><Button onClick={() => setDialog(null)}>Cancel</Button><Button onClick={submit} disabled={busy} variant="contained">{busy ? 'Saving…' : 'Confirm'}</Button></DialogActions></Dialog>
    <Snackbar open={snack.open} autoHideDuration={4500} onClose={() => setSnack((s) => ({ ...s, open: false }))}><Alert severity={snack.severity}>{snack.message}</Alert></Snackbar>
  </Box>;
}
