import React, { useState } from 'react';
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, MenuItem, Stack, TextField, Typography,
} from '@mui/material';
import { facelift } from '@/components/facelift';
import { resolvePricingSettings } from '@/services/pricing/engine';
import { buildStullerRepairMaterial } from '@/services/pricing/stullerMaterial';

/**
 * "Move to Needs Parts" — name the part first, so the ticket is re-priced before it leaves the bench.
 *
 * Moved out of the My Bench page on 2026-10-02 for max-lines. It owns its own form state, which is the
 * point: eight of the page's `useState` calls existed only to serve this dialog, and the page had no
 * reason to know whether a Stuller SKU box was empty.
 */
const DEFAULT_FORM = { source: 'stuller', stullerSku: '', name: '', description: '', quantity: '1', price: '' };

export function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * A Stuller part is priced by services/pricing/stullerMaterial.js — wholesale when the work order's
 * repair is a store job, retail otherwise. The browser's number is a preview; `mark-waiting-parts`
 * re-prices from the repair's billing mode before storing it.
 */
export function buildStullerMaterial(stullerResponse, stullerSku, settings, isWholesale = false) {
  return buildStullerRepairMaterial({ item: stullerResponse, sku: stullerSku, isWholesale, settings });
}

/** Is this work order billed to a store? Three shapes carry it, depending on where the order came from. */
export function isWholesaleWorkOrder(wo) {
  return Boolean(wo?.isWholesale || wo?.repair?.isWholesale || wo?.billing?.mode === 'wholesale');
}

/** A manual material line, from what the jeweler typed. Throws with a message the dialog can show. */
export function buildManualMaterial(form) {
  const name = form.name.trim();
  const quantity = Math.max(toNumber(form.quantity, 1), 0);
  const price = Math.max(toNumber(form.price, 0), 0);
  if (!name) throw new Error('Enter a material name.');
  if (quantity <= 0) throw new Error('Quantity must be greater than zero.');
  return {
    id: Date.now(), name, displayName: name, description: form.description.trim() || name,
    quantity, price, retailPrice: price, unitCost: price,
    category: 'manual_material', supplier: 'Manual', isStullerItem: false,
  };
}

const NO_SEARCH = { term: '', results: [], loading: false, error: '', ran: false };

/** How many results are worth showing in a dialog. More than this and the list stops being a list. */
const MAX_RESULTS = 8;

export function NeedsPartsDialog({ workOrder, onClose, onMoved, onError }) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState(NO_SEARCH);

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  /**
   * F48: this dialog used to ask for a Stuller part number typed from memory, at the bench, with the piece
   * in your hand — while intake has had a search against the same catalogue all along. Same endpoint,
   * `GET /api/stuller/search?q=`, which is staff-guarded. Typing a number you know still works; the search
   * is for the far more common case of knowing what the part *is*.
   */
  const runSearch = async () => {
    const q = search.term.trim();
    if (!q) return;
    setSearch((prev) => ({ ...prev, loading: true, error: '', ran: true }));
    try {
      const res = await fetch(`/api/stuller/search?q=${encodeURIComponent(q)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Stuller search failed.');
      setSearch((prev) => ({ ...prev, results: (data.results || []).slice(0, MAX_RESULTS), loading: false }));
    } catch (e) {
      setSearch((prev) => ({ ...prev, results: [], loading: false, error: e.message }));
    }
  };

  const close = () => {
    if (loading) return;
    setForm(DEFAULT_FORM);
    setSearch(NO_SEARCH);
    setError('');
    onClose();
  };

  const submit = async () => {
    if (!workOrder) return;
    setLoading(true);
    setError('');
    try {
      let material;
      if (form.source === 'stuller') {
        const cleanSku = form.stullerSku.trim();
        if (!cleanSku) throw new Error('Enter a Stuller part number.');
        const [stullerRes, settingsRes] = await Promise.all([
          fetch('/api/stuller/item', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ itemNumber: cleanSku }) }),
          fetch('/api/admin/settings'),
        ]);
        const stullerData = await stullerRes.json().catch(() => ({}));
        if (!stullerRes.ok) throw new Error(stullerData.error || 'Failed to fetch Stuller item.');
        // No settings, no price — never a default markup (owner, 2026-09-30).
        if (!settingsRes.ok) throw new Error('Pricing settings did not load — the part cannot be priced. Reload and try again.');
        const settings = resolvePricingSettings(await settingsRes.json());
        material = buildStullerMaterial(stullerData, cleanSku, settings, isWholesaleWorkOrder(workOrder));
      } else {
        material = buildManualMaterial(form);
      }

      const res = await fetch(`/api/bench/work-orders/${workOrder.workOrderID}/mark-waiting-parts`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ material }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Unable to move to needs parts.');

      await onMoved(workOrder);
      setForm(DEFAULT_FORM);
    } catch (e) {
      setError(e.message);
      onError?.(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={Boolean(workOrder)} onClose={close} maxWidth="sm" fullWidth>
      <DialogTitle>Move to Needs Parts</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" sx={{ color: facelift.text2 }}>
            Add the part or material that needs to be ordered before moving this repair.
          </Typography>
          {workOrder && (
            <Alert severity="info">
              {workOrder.sourceID} — {workOrder.source?.clientName || workOrder.source?.businessName || ''}
            </Alert>
          )}
          {error && <Alert severity="error">{error}</Alert>}

          <TextField select label="Material Source" value={form.source} onChange={(e) => setField('source', e.target.value)} fullWidth>
            <MenuItem value="stuller">Stuller part number</MenuItem>
            <MenuItem value="manual">Manual material</MenuItem>
          </TextField>

          {form.source === 'stuller' ? (
            <>
              <TextField label="Stuller Part Number" value={form.stullerSku} onChange={(e) => setField('stullerSku', e.target.value)} autoFocus fullWidth />

              <Stack direction="row" spacing={1} alignItems="flex-start">
                <TextField
                  label="Search Stuller"
                  placeholder="half shank, 14k white"
                  value={search.term}
                  onChange={(e) => setSearch((prev) => ({ ...prev, term: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); runSearch(); } }}
                  fullWidth
                />
                <Button onClick={runSearch} disabled={search.loading || !search.term.trim()} sx={{ mt: 1 }}>
                  {search.loading ? 'Searching…' : 'Search'}
                </Button>
              </Stack>

              {search.error && <Alert severity="error">{search.error}</Alert>}
              {search.ran && !search.loading && !search.error && search.results.length === 0 && (
                <Typography variant="body2" sx={{ color: facelift.text3 }}>
                  Nothing matched. Try fewer words, or type the part number.
                </Typography>
              )}

              {search.results.length > 0 && (
                <Stack spacing={0.5} sx={{ maxHeight: 260, overflowY: 'auto' }}>
                  {search.results.map((item) => {
                    const sku = item.itemNumber || item.sku;
                    const chosen = sku === form.stullerSku;
                    return (
                      <Button
                        key={sku}
                        onClick={() => setField('stullerSku', sku)}
                        sx={{
                          justifyContent: 'flex-start', textAlign: 'left', textTransform: 'none',
                          borderRadius: 2, px: 1.5, py: 1,
                          border: `1px solid ${chosen ? facelift.gold : facelift.border}`,
                          color: chosen ? facelift.gold : facelift.text,
                        }}
                      >
                        <Stack sx={{ width: '100%' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.description || sku}</Typography>
                          <Typography variant="caption" sx={{ color: facelift.text3, fontFamily: facelift.mono }}>
                            {sku}{item.unitCost ? ` · $${Number(item.unitCost).toFixed(2)}` : ''}
                          </Typography>
                        </Stack>
                      </Button>
                    );
                  })}
                </Stack>
              )}
            </>
          ) : (
            <>
              <TextField label="Material Name" value={form.name} onChange={(e) => setField('name', e.target.value)} autoFocus fullWidth />
              <TextField label="Description" value={form.description} onChange={(e) => setField('description', e.target.value)} fullWidth multiline minRows={2} />
              <Grid container spacing={1.5}>
                <Grid item xs={6}>
                  <TextField label="Quantity" type="number" value={form.quantity} onChange={(e) => setField('quantity', e.target.value)} inputProps={{ min: 0, step: 0.25 }} fullWidth />
                </Grid>
                <Grid item xs={6}>
                  <TextField label="Line Price" type="number" value={form.price} onChange={(e) => setField('price', e.target.value)} inputProps={{ min: 0, step: 0.01 }} fullWidth />
                </Grid>
              </Grid>
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close} disabled={loading}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={loading}>
          {loading ? 'Moving…' : 'Add Material & Move'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
