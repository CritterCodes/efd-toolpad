'use client';

/**
 * The physical pieces of this design — and the way to record one that already exists.
 *
 * Until now nothing in admin could create a piece at all. The drops page told people to "open a
 * design to create a piece from a variant", which was instructions for a button that did not
 * exist; the only pieces in the database got there by import scripts. This is that button.
 *
 * Two intents, deliberately separate (see services/production/pieceIntake):
 *   Record existing — the thing is already made. Comes in available, with its cost, no work
 *     orders. Open to the artisan whose design it is.
 *   Produce one — staff put it into production and work orders spawn.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Box, Paper, Stack, Typography, Button, Chip, TextField, MenuItem, Dialog, DialogTitle,
  DialogContent, DialogActions, CircularProgress, Divider, Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import InventoryIcon from '@mui/icons-material/Inventory2';
import { REPAIRS_UI, repairsMenuProps } from '@/app/dashboard/repairs/components/repairsUi';

const money = (v) => (Number.isFinite(Number(v)) && v !== null && v !== ''
  ? `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  : '—');

const STATUS_COLOR = {
  available: '#4CAF50',
  reserved: '#FFB300',
  sold: '#9E9E9E',
  planned: '#64B5F6',
  casting_ordered: '#64B5F6',
  in_finishing: '#64B5F6',
  qc: '#64B5F6',
  completed: '#4CAF50',
  scrapped: '#E57373',
  cancelled: '#E57373',
};

const METAL_TYPES = ['gold', 'silver', 'platinum', 'palladium', 'brass', 'copper', 'titanium', 'other'];

const EMPTY = {
  variantId: '', metalType: '', karat: '', finish: '', ringSize: '', weight: '',
  sku: '', serialNumber: '', cost: '', retailPrice: '', compareAtPrice: '', note: '',
};

const fieldSx = {
  '& .MuiOutlinedInput-root': { color: REPAIRS_UI.textPrimary, backgroundColor: REPAIRS_UI.bgInput || 'transparent' },
  '& .MuiInputLabel-root': { color: REPAIRS_UI.textMuted },
  '& .MuiOutlinedInput-notchedOutline': { borderColor: REPAIRS_UI.border },
};

export default function PiecesTab({ design, designId, notify }) {
  const [pieces, setPieces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY);

  const variants = design?.variants || [];
  const edition = design?.edition || {};
  // A one-of-one that already has its piece has nothing left to give; the server refuses, and
  // saying so up front beats a 409 after the form is filled in.
  const cap = edition.type === 'one_of_one' ? 1 : edition.limit;
  const remaining = edition.type === 'unlimited' || !cap
    ? null
    : Math.max(0, cap - (edition.allocated || 0) - (edition.committed || 0));
  const editionSpent = remaining === 0;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/production/pieces?designID=${encodeURIComponent(designId)}`);
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to load pieces');
      setPieces(await res.json());
    } catch (e) {
      notify?.(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [designId, notify]);

  useEffect(() => { load(); }, [load]);

  const setField = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/production/pieces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, designID: designId, premade: true }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Failed to record the piece');
      notify?.('Piece recorded — it is available to sell.');
      setOpen(false);
      setForm(EMPTY);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" spacing={1.5} sx={{ mb: 2 }}>
        <Box>
          <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 700 }}>Physical pieces</Typography>
          <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>
            {remaining === null
              ? 'This design can be made to order — pieces here are the ones that physically exist.'
              : `${remaining} of ${cap} left in the edition.`}
          </Typography>
        </Box>
        <Button
          variant="outlined" startIcon={<AddIcon />} disabled={editionSpent}
          onClick={() => { setForm({ ...EMPTY, variantId: design?.defaultVariantId || variants[0]?.variantId || '' }); setOpen(true); }}
          sx={{ color: REPAIRS_UI.accent, borderColor: `${REPAIRS_UI.accent}66`, textTransform: 'none', fontWeight: 600, '&:hover': { borderColor: REPAIRS_UI.accent } }}
        >
          Record existing piece
        </Button>
      </Stack>

      {editionSpent && (
        <Alert severity="info" sx={{ mb: 2, backgroundColor: REPAIRS_UI.bgCard, color: REPAIRS_UI.textSecondary, border: `1px solid ${REPAIRS_UI.border}` }}>
          This edition is fully allocated — every piece it allows already exists. Raise the edition
          limit on the Details tab to record another.
        </Alert>
      )}

      {loading ? (
        <Stack alignItems="center" sx={{ py: 5 }}><CircularProgress sx={{ color: REPAIRS_UI.accent }} /></Stack>
      ) : pieces.length === 0 ? (
        <Paper sx={{ p: 4, backgroundColor: REPAIRS_UI.bgCard, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2 }}>
          <Stack alignItems="center" spacing={1.5}>
            <InventoryIcon sx={{ fontSize: 40, color: REPAIRS_UI.textMuted }} />
            <Typography sx={{ color: REPAIRS_UI.textSecondary }}>No physical pieces yet.</Typography>
            <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, textAlign: 'center', maxWidth: 420 }}>
              A design with no pieces is made to order. If one already exists — you made it, or it
              came in on consignment — record it here and it becomes sellable.
            </Typography>
          </Stack>
        </Paper>
      ) : (
        <Stack spacing={1}>
          {pieces.map((p) => (
            <Paper key={p.pieceID} sx={{ p: 1.75, backgroundColor: REPAIRS_UI.bgCard, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
                    <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 600 }}>
                      {p.editionNumber ? `#${p.editionNumber}` : 'Unnumbered'}
                    </Typography>
                    {p.sku && <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>{p.sku}</Typography>}
                    {p.provenance?.kind === 'premade' && (
                      <Chip size="small" label="Premade" variant="outlined"
                        sx={{ height: 20, borderColor: REPAIRS_UI.border, color: REPAIRS_UI.textMuted }} />
                    )}
                  </Stack>
                  <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>
                    {[p.metalType, p.karat, p.finish, p.ringSize && `size ${p.ringSize}`].filter(Boolean).join(' · ') || 'No metal recorded'}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, display: 'block' }}>COGS</Typography>
                    <Typography sx={{ color: REPAIRS_UI.textSecondary, fontSize: '0.85rem' }}>{money(p.totalCOGS)}</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, display: 'block' }}>Price</Typography>
                    <Typography sx={{ color: REPAIRS_UI.textPrimary, fontWeight: 600, fontSize: '0.85rem' }}>{money(p.pricing?.retailPrice)}</Typography>
                  </Box>
                  <Chip size="small" label={(p.status || '').replace(/_/g, ' ')}
                    sx={{ textTransform: 'capitalize', backgroundColor: `${STATUS_COLOR[p.status] || REPAIRS_UI.textMuted}22`, color: STATUS_COLOR[p.status] || REPAIRS_UI.textMuted, fontWeight: 700 }} />
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}

      <Dialog open={open} onClose={() => !saving && setOpen(false)} fullWidth maxWidth="sm"
        PaperProps={{ sx: { backgroundColor: REPAIRS_UI.bgCard, border: `1px solid ${REPAIRS_UI.border}` } }}>
        <DialogTitle sx={{ color: REPAIRS_UI.textHeader, fontWeight: 700 }}>Record an existing piece</DialogTitle>
        <DialogContent>
          <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, display: 'block', mb: 2 }}>
            For something that is already made. No work orders are created and no labor is credited —
            record what it cost you, and it becomes available to sell.
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Stack spacing={2}>
            {variants.length > 0 && (
              <TextField select size="small" fullWidth label="Variant" value={form.variantId} sx={fieldSx}
                SelectProps={{ MenuProps: repairsMenuProps }}
                onChange={(e) => setField('variantId', e.target.value)}>
                {variants.map((v) => (
                  <MenuItem key={v.variantId} value={v.variantId}>{v.label || v.sku || v.variantId}</MenuItem>
                ))}
              </TextField>
            )}

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField select size="small" fullWidth label="Metal" value={form.metalType} sx={fieldSx}
                SelectProps={{ MenuProps: repairsMenuProps }}
                onChange={(e) => setField('metalType', e.target.value)}>
                <MenuItem value="">—</MenuItem>
                {METAL_TYPES.map((m) => <MenuItem key={m} value={m} sx={{ textTransform: 'capitalize' }}>{m}</MenuItem>)}
              </TextField>
              {/* Free text, not the gold karat list — a premade piece is as often 925 or 950. */}
              <TextField size="small" fullWidth label="Karat / purity" value={form.karat} sx={fieldSx}
                placeholder="14k, 925, 950…"
                onChange={(e) => setField('karat', e.target.value)} />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField size="small" fullWidth label="Finish" value={form.finish} sx={fieldSx}
                onChange={(e) => setField('finish', e.target.value)} />
              <TextField size="small" fullWidth label="Ring size" value={form.ringSize} sx={fieldSx}
                onChange={(e) => setField('ringSize', e.target.value)} />
              <TextField size="small" fullWidth label="Weight (g)" value={form.weight} sx={fieldSx}
                onChange={(e) => setField('weight', e.target.value)} />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField size="small" fullWidth label="SKU" value={form.sku} sx={fieldSx}
                onChange={(e) => setField('sku', e.target.value)} />
              <TextField size="small" fullWidth label="Serial number" value={form.serialNumber} sx={fieldSx}
                onChange={(e) => setField('serialNumber', e.target.value)} />
            </Stack>

            <Divider sx={{ borderColor: REPAIRS_UI.border }} />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField size="small" fullWidth label="What it cost you" value={form.cost} sx={fieldSx}
                helperText="Materials and anything paid out. Leave blank if it settles on sale."
                onChange={(e) => setField('cost', e.target.value)} />
              <TextField size="small" fullWidth label="Selling price" value={form.retailPrice} sx={fieldSx}
                helperText="This one-off's price — it is not repriced nightly."
                onChange={(e) => setField('retailPrice', e.target.value)} />
            </Stack>

            <TextField size="small" fullWidth multiline minRows={2} label="Note" value={form.note} sx={fieldSx}
              placeholder="Where it came from, when it was made, anything worth remembering."
              onChange={(e) => setField('note', e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)} disabled={saving} sx={{ color: REPAIRS_UI.textSecondary, textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" onClick={submit} disabled={saving}
            sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, textTransform: 'none', '&:hover': { backgroundColor: '#C19B2E' } }}>
            {saving ? 'Recording…' : 'Record piece'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
