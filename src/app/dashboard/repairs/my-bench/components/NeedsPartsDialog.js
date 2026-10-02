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

export function NeedsPartsDialog({ workOrder, onClose, onMoved, onError }) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const close = () => {
    if (loading) return;
    setForm(DEFAULT_FORM);
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
            <TextField label="Stuller Part Number" value={form.stullerSku} onChange={(e) => setField('stullerSku', e.target.value)} autoFocus fullWidth />
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
