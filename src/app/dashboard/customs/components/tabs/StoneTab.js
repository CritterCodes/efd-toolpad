'use client';
/**
 * The custom order's STONE tab — where a commissioned stone is fitted into the order.
 *
 * The cutter is not picked here. He is ASSIGNED to the order like any other artisan (owner,
 * 2026-09-23: "he gets added as an artisan on the custom order"), which is what gives him comms
 * access and puts him on the job; this tab only hands a stone to somebody already on it. That is
 * why the cutter list below is the order's own stone assignments rather than every gem cutter in
 * the shop.
 *
 * The stone itself is a PRODUCT, not a labour line: each one becomes its own gemstone Design +
 * Piece with its own cut work order on the stone (services/customs/customGemComponent.js), and its
 * price — the cutter's number — is what the ring's quote reads as its centre stone.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Button, Chip, CircularProgress, Collapse, Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, MenuItem, Paper, Stack, TextField, Typography,
} from '@mui/material';
import DiamondIcon from '@mui/icons-material/Diamond';
import AddIcon from '@mui/icons-material/Add';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

const money = (n) => Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const BLANK = {
  species: '', cut: '', cutStyle: '', colorLabel: '',
  sizeMode: 'carat', carat: '', targetMm: '', tolerance: '',
  clarity: '', treatment: '', naturalSynthetic: 'natural', notes: '', cutterUserID: '',
};

/** The spec line a cutter reads off the bench card. */
function specLine(spec = {}) {
  const size = spec.sizeMode === 'dimensions'
    ? [spec.targetMm ? `${spec.targetMm}mm` : null, spec.tolerance ? `±${spec.tolerance}mm` : null].filter(Boolean).join(' ')
    : spec.carat ? `${spec.carat}ct` : '';
  return [size, (spec.cut || []).join('/'), (spec.cutStyle || []).join('/'), spec.color, spec.clarity, spec.treatment]
    .filter(Boolean).join(' · ');
}

export default function StoneTab({ customID, order, notify, onChanged }) {
  const [stones, setStones] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [priceDraft, setPriceDraft] = useState({});

  // The cutters on THIS order. Assignment is the entry point; this tab is the workbench.
  const cutters = useMemo(
    () => (order?.assignments || []).filter((a) => a.role === 'stone'),
    [order?.assignments],
  );
  const centerstone = order?.quote?.centerstone || {};

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/custom-orders/${customID}/stones`);
      const body = await res.json().catch(() => ({}));
      setStones(Array.isArray(body.stones) ? body.stones : []);
    } catch { setStones([]); }
  }, [customID]);

  useEffect(() => { load(); }, [load]);

  const openForm = () => {
    // One cutter on the order is the obvious answer — don't make it a choice.
    setForm({ ...BLANK, cutterUserID: cutters.length === 1 ? cutters[0].userID : '' });
    setOpen(true);
  };
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/custom-orders/${customID}/stones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          cut: form.cut ? form.cut.split(',').map((s) => s.trim()).filter(Boolean) : [],
          cutStyle: form.cutStyle ? form.cutStyle.split(',').map((s) => s.trim()).filter(Boolean) : [],
          carat: form.carat === '' ? null : Number(form.carat),
          targetMm: form.targetMm === '' ? null : Number(form.targetMm),
          tolerance: form.tolerance === '' ? null : Number(form.tolerance),
          cutterUserID: form.cutterUserID || null,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Could not add the stone.');
      notify?.(form.cutterUserID
        ? 'Stone added — its cut work order is on the cutter’s bench.'
        : 'Stone added — its cut work order is unclaimed.', 'success');
      setOpen(false); setForm(BLANK);
      await load(); onChanged?.();
    } catch (e) {
      notify?.(e.message, 'error');
    } finally { setSaving(false); }
  };

  const savePrice = async (pieceID) => {
    const price = Number(priceDraft[pieceID]);
    if (!(price > 0)) { notify?.('Enter a price above zero.', 'warning'); return; }
    try {
      const res = await fetch(`/api/custom-orders/${customID}/stones/${pieceID}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ price }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Could not save the price.');
      notify?.(`Stone priced at ${money(price)} — the quote’s centre stone now reads from it.`, 'success');
      setPriceDraft((d) => ({ ...d, [pieceID]: '' }));
      await load(); onChanged?.();
    } catch (e) {
      notify?.(e.message, 'error');
    }
  };

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 2, bgcolor: REPAIRS_UI.bgPanel, border: `1px solid ${REPAIRS_UI.border}` }}>
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
          <DiamondIcon sx={{ color: REPAIRS_UI.accent }} />
          <Typography sx={{ fontWeight: 700, color: REPAIRS_UI.textHeader, flex: 1, minWidth: 0 }}>
            Stones on this order
          </Typography>
          <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={openForm} sx={{ textTransform: 'none' }}>
            Add a stone
          </Button>
        </Stack>

        <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, display: 'block', mt: 1 }}>
          A cut stone is its own design and piece with its own cut work order. Its price becomes the quote&rsquo;s centre stone.
        </Typography>

        <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="caption" sx={{ color: REPAIRS_UI.textSecondary }}>Cutters on this order:</Typography>
          {cutters.length === 0
            ? <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>
                none yet — add one on the Assignment tab as a Stone Cutter, then their stone can go here.
              </Typography>
            : cutters.map((c) => <Chip key={c.id} size="small" label={c.name} sx={{ color: REPAIRS_UI.textPrimary }} />)}
        </Stack>
      </Paper>

      {stones === null ? (
        <CircularProgress size={20} sx={{ color: REPAIRS_UI.accent }} />
      ) : stones.length === 0 ? (
        <Typography variant="body2" sx={{ color: REPAIRS_UI.textMuted }}>No stones on this order yet.</Typography>
      ) : (
        <Stack spacing={1.5}>
          {stones.map((s) => (
            <Paper key={s.pieceID} sx={{ p: 2, bgcolor: REPAIRS_UI.bgPanel, border: `1px solid ${REPAIRS_UI.border}` }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between">
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 700, color: REPAIRS_UI.textHeader }}>{s.name}</Typography>
                  <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>{specLine(s.spec) || 'No spec recorded'}</Typography>
                  <Stack direction="row" spacing={0.75} sx={{ mt: 0.75 }} flexWrap="wrap" useFlexGap>
                    {s.spec?.cutToFit && <Chip size="small" label="cut to fit" />}
                    {/* Whether this stone is actually fitted into the order's price yet. */}
                    {centerstone.sourcePieceID === s.pieceID
                      ? <Chip size="small" label="on the quote" sx={{ bgcolor: 'rgba(156,204,101,0.18)', color: '#9CCC65' }} />
                      : <Chip size="small" variant="outlined" label="not on the quote" />}
                  </Stack>
                </Box>
                <Box sx={{ textAlign: { xs: 'left', sm: 'right' }, flexShrink: 0 }}>
                  <Chip size="small" label={s.status} />
                  <Typography sx={{ fontWeight: 700, color: REPAIRS_UI.textHeader, mt: 0.5 }}>
                    {s.stonePrice?.amount ? money(s.stonePrice.amount) : 'not priced'}
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} alignItems="center" flexWrap="wrap" useFlexGap>
                <TextField
                  size="small" type="number" label="Stone price"
                  value={priceDraft[s.pieceID] ?? ''}
                  onChange={(e) => setPriceDraft((d) => ({ ...d, [s.pieceID]: e.target.value }))}
                  sx={{ width: { xs: '100%', sm: 160 } }} inputProps={{ min: 0, step: 1 }}
                />
                <Button size="small" variant="outlined" onClick={() => savePrice(s.pieceID)} sx={{ textTransform: 'none' }}>
                  {s.stonePrice?.amount ? 'Update price' : 'Set price'}
                </Button>
                <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>
                  Writes the quote&rsquo;s centre stone cost.
                </Typography>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add a stone to this order</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12} sm={6}>
              <TextField label="Species" required fullWidth size="small" value={form.species} onChange={(e) => set('species', e.target.value)} helperText="e.g. Citrine, Tourmaline" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Colour" fullWidth size="small" value={form.colorLabel} onChange={(e) => set('colorLabel', e.target.value)} helperText="the quality bucket, e.g. Golden" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Cut" fullWidth size="small" value={form.cut} onChange={(e) => set('cut', e.target.value)} helperText="shape, e.g. Marquise" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Cutting style" fullWidth size="small" value={form.cutStyle} onChange={(e) => set('cutStyle', e.target.value)} helperText="e.g. Brilliant, Step" />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField select label="Size by" fullWidth size="small" value={form.sizeMode} onChange={(e) => set('sizeMode', e.target.value)}>
                <MenuItem value="carat">Carat</MenuItem>
                <MenuItem value="dimensions">Dimensions</MenuItem>
              </TextField>
            </Grid>
            <Collapse in={form.sizeMode === 'carat'} component={Grid} item xs={12} sm={8}>
              <TextField label="Target carat" type="number" fullWidth size="small" value={form.carat} onChange={(e) => set('carat', e.target.value)} inputProps={{ min: 0, step: 0.25 }} />
            </Collapse>
            <Collapse in={form.sizeMode === 'dimensions'} component={Grid} item xs={12} sm={8}>
              <Stack direction="row" spacing={1}>
                <TextField label="Target mm" type="number" fullWidth size="small" value={form.targetMm} onChange={(e) => set('targetMm', e.target.value)} inputProps={{ min: 0, step: 0.25 }} />
                <TextField label="± tolerance" type="number" fullWidth size="small" value={form.tolerance} onChange={(e) => set('tolerance', e.target.value)} inputProps={{ min: 0, step: 0.05 }} helperText="cut to fit" />
              </Stack>
            </Collapse>
            <Grid item xs={12} sm={4}>
              <TextField label="Clarity" fullWidth size="small" value={form.clarity} onChange={(e) => set('clarity', e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Treatment" fullWidth size="small" value={form.treatment} onChange={(e) => set('treatment', e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField select label="Natural / lab" fullWidth size="small" value={form.naturalSynthetic} onChange={(e) => set('naturalSynthetic', e.target.value)}>
                <MenuItem value="natural">Natural</MenuItem>
                <MenuItem value="synthetic">Lab grown</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                select label="Cutter" fullWidth size="small" value={form.cutterUserID}
                onChange={(e) => set('cutterUserID', e.target.value)}
                helperText={cutters.length
                  ? 'the cut work order goes to their bench'
                  : 'nobody is assigned as a stone cutter on this order yet — Assignment tab'}
              >
                <MenuItem value="">Leave unclaimed</MenuItem>
                {cutters.map((c) => <MenuItem key={c.id} value={c.userID}>{c.name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField label="Notes for the cutter" fullWidth size="small" multiline minRows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" onClick={submit} disabled={saving || !form.species.trim()} sx={{ textTransform: 'none' }}>
            {saving ? 'Adding…' : 'Add stone'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
