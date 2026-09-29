'use client';
/**
 * Store Settings → Volume pricing. The quantity ladder, editable here and nowhere else
 * (owner, 2026-09-29: "this doesn't get hard coded, this needs to be updated in the ui").
 *
 * Flat tiers: the quantity picks ONE tier and every unit is priced at it. Each tier says how much of
 * the machine and how much of the markup that quantity still carries; labor and materials are never
 * reduced, which is why the preview shows the cost floor alongside the price.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, IconButton, Stack, Table, TableBody, TableCell, TableHead,
  TableRow, TextField, Typography,
} from '@mui/material';
import LayersIcon from '@mui/icons-material/Layers';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';

const money = (n) => Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/** The worked example the preview prices: one retip — 0.2 h of bench time and one laser pulse. */
const SAMPLE = { hours: 0.2, toolCost: 10 };

export default function QuantityTierSettings() {
  const [tiers, setTiers] = useState(null);
  const [defaults, setDefaults] = useState([]);
  const [pricing, setPricing] = useState({ wage: 50, businessMultiplier: 2, wholesaleMarkup: 1.2 });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = useCallback(() => {
    fetch('/api/admin/settings/quantity-tiers')
      .then((r) => r.json())
      .then((body) => {
        setTiers(Array.isArray(body?.tiers) ? body.tiers : []);
        setDefaults(body?.defaults || []);
        if (body?.pricing) setPricing(body.pricing);
      })
      .catch(() => setMsg({ severity: 'error', text: 'Could not load volume pricing.' }));
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async (next) => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/settings/quantity-tiers', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tiers: next }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Could not save');
      setTiers(body.tiers);
      setMsg({
        severity: 'success',
        text: body.tiers.length ? 'Volume pricing saved.' : 'Volume pricing is off — every quantity pays the list price.',
      });
    } catch (e) {
      setMsg({ severity: 'error', text: e.message });
    } finally {
      setSaving(false);
    }
  };

  if (!tiers) return null;

  const setRow = (i, key, value) => setTiers((rows) => rows.map((r, n) => (n === i ? { ...r, [key]: value } : r)));
  const addRow = () => setTiers((rows) => [...rows, { minQty: (rows[rows.length - 1]?.minQty || 0) + 10, toolPct: 100, marginPct: 100 }]);
  const removeRow = (i) => {
    const next = tiers.filter((_, n) => n !== i);
    setTiers(next);
    save(next);
  };

  // The same arithmetic the pricing engine runs, on the sample task, so the numbers on screen are
  // this shop's wage and multipliers rather than a worked example from somewhere else.
  const laborCost = round2(SAMPLE.hours * pricing.wage);
  const baseCost = round2(laborCost + SAMPLE.toolCost);
  const preview = (row, multiplier) => {
    const toolPct = Math.min(Math.max(Number(row.toolPct) || 0, 0), 100);
    const marginPct = Math.min(Math.max(Number(row.marginPct) || 0, 0), 100);
    const adjustedBase = baseCost - SAMPLE.toolCost * (1 - toolPct / 100);
    return round2(adjustedBase * (1 + (multiplier - 1) * (marginPct / 100)));
  };
  const rangeLabel = (i) => {
    const next = tiers[i + 1];
    return next ? `${tiers[i].minQty}–${next.minQty - 1}` : `${tiers[i].minQty}+`;
  };

  return (
    <Card sx={{ mt: 3 }}>
      <CardContent>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
          <LayersIcon />
          <Typography variant="h6" sx={{ flex: 1 }}>Volume pricing</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          One price per unit, chosen by how many the job needs — twenty prongs are all priced at the twenty-plus rate.
          A tier can give back part of the <strong>machine</strong> (its recovery is a monthly cost, so one big job
          over-pays it) and part of the <strong>markup</strong>, which is how volume pricing works on tasks with no
          machine at all. Labor and materials are never reduced.
        </Typography>

        {tiers.length === 0 ? (
          <Alert severity="info" action={<Button size="small" onClick={() => { setTiers(defaults.map((d) => ({ ...d }))); }}>Use suggested</Button>}>
            No volume pricing — every quantity pays the list price.
          </Alert>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>From qty</TableCell>
                  <TableCell>Applies to</TableCell>
                  <TableCell align="right">Machine %</TableCell>
                  <TableCell align="right">Markup %</TableCell>
                  <TableCell align="right">Retail each</TableCell>
                  <TableCell align="right">Wholesale each</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {tiers.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <TextField
                        size="small" type="number" value={row.minQty} sx={{ width: 90 }}
                        onChange={(e) => setRow(i, 'minQty', e.target.value)}
                        onBlur={() => save(tiers)} inputProps={{ min: 1, step: 1 }}
                      />
                    </TableCell>
                    <TableCell><Typography variant="body2" color="text.secondary">{rangeLabel(i)}</Typography></TableCell>
                    <TableCell align="right">
                      <TextField
                        size="small" type="number" value={row.toolPct} sx={{ width: 90 }}
                        onChange={(e) => setRow(i, 'toolPct', e.target.value)}
                        onBlur={() => save(tiers)} inputProps={{ min: 0, max: 100, step: 5 }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        size="small" type="number" value={row.marginPct} sx={{ width: 90 }}
                        onChange={(e) => setRow(i, 'marginPct', e.target.value)}
                        onBlur={() => save(tiers)} inputProps={{ min: 0, max: 100, step: 5 }}
                      />
                    </TableCell>
                    <TableCell align="right">{money(preview(row, pricing.businessMultiplier))}</TableCell>
                    <TableCell align="right">{money(preview(row, pricing.wholesaleMarkup))}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => removeRow(i)} disabled={saving} aria-label={`Remove the ${rangeLabel(i)} tier`}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}

        <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap>
          <Button size="small" startIcon={<AddIcon />} onClick={addRow} disabled={saving}>Add tier</Button>
          {tiers.length > 0 && <Button size="small" variant="outlined" onClick={() => save(tiers)} disabled={saving}>Save</Button>}
        </Stack>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
          Prices shown are one retip — {SAMPLE.hours} h at {money(pricing.wage)}/h plus {money(SAMPLE.toolCost)} of laser,
          so {money(baseCost)} of cost. Whatever a tier gives back, the price can never fall below the cost in the job.
        </Typography>

        {msg && <Alert severity={msg.severity} sx={{ mt: 2 }}>{msg.text}</Alert>}
      </CardContent>
    </Card>
  );
}
