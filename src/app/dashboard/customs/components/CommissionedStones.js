'use client';
/**
 * Commissioned stones on a custom order.
 *
 * A custom-cut stone is a product, not a labour line: it gets its own gemstone Design + Piece, and the
 * cut work order hangs off THE STONE (services/customs/customGemComponent.js). This is where an admin
 * commissions one and where its price — the cutter's number, or one agreed with him — is recorded and
 * ported into the ring's quote as the centre-stone cost.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Box, Button, Chip, CircularProgress, Collapse, Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, MenuItem, Stack, TextField, Typography,
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

export default function CommissionedStones({ customID, notify, onChanged }) {
  const [stones, setStones] = useState(null);
  const [cutters, setCutters] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [priceDraft, setPriceDraft] = useState({});

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/custom-orders/${customID}/stones`);
      const body = await res.json().catch(() => ({}));
      setStones(Array.isArray(body.stones) ? body.stones : []);
    } catch { setStones([]); }
  }, [customID]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    // Gem cutters to assign the cut to. Falls back to a free-form-less empty list rather than
    // blocking the form — a stone can be commissioned before a cutter is picked.
    fetch('/api/users?role=artisan')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const all = Array.isArray(d) ? d : (d?.data || []);
        setCutters(all.filter((u) => {
          const raw = u?.artisanApplication?.artisanType ?? u?.artisanType;
          const types = (Array.isArray(raw) ? raw : String(raw || '').split(',')).map((t) => String(t).trim().toLowerCase());
          return types.some((t) => t.includes('gem') || t.includes('lapidar'));
        }));
      })
      .catch(() => setCutters([]));
  }, []);

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
      if (!res.ok) throw new Error(body.error || 'Could not commission the stone.');
      notify?.('Stone commissioned — its cut work order is on the cutter’s bench.', 'success');
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
    <Box sx={{ mt: 3 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
        <DiamondIcon sx={{ color: REPAIRS_UI.accent }} />
        <Typography sx={{ fontWeight: 700, color: REPAIRS_UI.textHeader, flex: 1 }}>Commissioned stones</Typography>
        <Button size="small" startIcon={<AddIcon />} onClick={() => setOpen(true)} sx={{ textTransform: 'none', color: REPAIRS_UI.accent }}>
          Commission a stone
        </Button>
      </Stack>
      <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, display: 'block', mb: 1.5 }}>
        A cut stone is its own design and piece, with its own cut work order. Its price becomes the quote&rsquo;s centre stone.
      </Typography>

      {stones === null ? (
        <CircularProgress size={20} sx={{ color: REPAIRS_UI.accent }} />
      ) : stones.length === 0 ? (
        <Typography variant="body2" sx={{ color: REPAIRS_UI.textMuted }}>No commissioned stones on this order.</Typography>
      ) : (
        <Stack spacing={1.5}>
          {stones.map((s) => (
            <Box key={s.pieceID} sx={{ border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, p: 1.5, bgcolor: REPAIRS_UI.bgPrimary }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between">
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 700, color: REPAIRS_UI.textHeader }}>{s.name}</Typography>
                  <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>{specLine(s.spec) || 'No spec recorded'}</Typography>
                  {s.spec?.cutToFit && <Chip size="small" label="cut to fit" sx={{ mt: 0.5 }} />}
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
                  sx={{ width: 160 }} inputProps={{ min: 0, step: 1 }}
                />
                <Button size="small" variant="outlined" onClick={() => savePrice(s.pieceID)} sx={{ textTransform: 'none' }}>
                  {s.stonePrice?.amount ? 'Update price' : 'Set price'}
                </Button>
                <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>
                  Writes the quote&rsquo;s centre stone cost.
                </Typography>
              </Stack>
            </Box>
          ))}
        </Stack>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Commission a cut stone</DialogTitle>
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
              <TextField select label="Cutter" fullWidth size="small" value={form.cutterUserID} onChange={(e) => set('cutterUserID', e.target.value)} helperText="assigns the cut work order to their bench">
                <MenuItem value="">Leave unclaimed</MenuItem>
                {cutters.map((u) => (
                  <MenuItem key={u.userID} value={u.userID}>{[u.firstName, u.lastName].filter(Boolean).join(' ') || u.email}</MenuItem>
                ))}
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
            {saving ? 'Commissioning…' : 'Commission stone'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
