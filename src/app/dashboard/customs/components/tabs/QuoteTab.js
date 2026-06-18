import React, { useState } from 'react';
import {
  Box, Paper, Stack, Typography, Button, IconButton, Divider, TextField, MenuItem,
  Table, TableHead, TableRow, TableCell, TableBody, Grid,
} from '@mui/material';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

const panelSx = { p: 2.5, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' };
const money = (n) => `$${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const num = (v) => Number(v) || 0;
const MATERIAL_CATEGORIES = [
  { value: 'material', label: 'Material' },
  { value: 'gemstone', label: 'Gemstone' },
  { value: 'finding', label: 'Finding' },
  { value: 'mounting', label: 'Mounting' },
];

function lineCost(m) {
  if (m.cost != null && m.cost !== '') return num(m.cost);
  return Math.max(num(m.quantity) || 1, 0) * num(m.unitPrice);
}

// Normalize a stored material line into editable {name, category, quantity, unitPrice}.
function toEditable(m) {
  const hasUnit = m.unitPrice != null && m.unitPrice !== '';
  return {
    name: m.name || m.displayName || '',
    category: m.category || 'material',
    quantity: m.quantity ?? 1,
    unitPrice: hasUnit ? m.unitPrice : (m.cost ?? 0),
  };
}

export default function QuoteTab({ customID, order, margin, onChanged, notify }) {
  const q = order.quote || {};
  const [editMode, setEditMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [materials, setMaterials] = useState([]);
  const [fields, setFields] = useState({ laborCost: 0, castingCost: 0, shippingCost: 0, designFee: 0, rushMultiplier: 1 });

  const startEdit = () => {
    setMaterials((q.materialCosts || []).map(toEditable));
    setFields({
      laborCost: q.laborCost || 0, castingCost: q.castingCost || 0, shippingCost: q.shippingCost || 0,
      designFee: q.designFee || 0, rushMultiplier: q.rushMultiplier || 1,
    });
    setEditMode(true);
  };
  const setField = (k, v) => setFields((f) => ({ ...f, [k]: v }));
  const setRow = (i, k, v) => setMaterials((rows) => rows.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const addRow = () => setMaterials((rows) => [...rows, { name: '', category: 'material', quantity: 1, unitPrice: 0 }]);
  const removeRow = (i) => setMaterials((rows) => rows.filter((_, idx) => idx !== i));

  // Live preview (mirrors the single-COG-bucket engine; glb/qc fees come from production).
  const glbFee = num(q.glbFee);
  const qcFee = num(q.qcReviewFee);
  const cogMarkup = num(q.cogMarkup) || 2.5;
  const matTotal = materials.reduce((s, m) => s + lineCost(m), 0);
  const liveCog = matTotal + num(fields.laborCost) + num(fields.castingCost) + num(fields.shippingCost) + num(fields.designFee) + glbFee + qcFee;
  const liveRush = num(fields.rushMultiplier) > 1 ? num(fields.rushMultiplier) : 1;
  const liveTotal = liveCog * cogMarkup * liveRush;

  const save = async () => {
    setBusy(true);
    try {
      const materialCosts = materials
        .filter((m) => m.name.trim() || lineCost(m) > 0)
        .map((m) => ({ name: m.name.trim() || 'Item', category: m.category, quantity: num(m.quantity) || 1, unitPrice: num(m.unitPrice) }));
      const res = await fetch(`/api/custom-orders/${customID}/quote`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materialCosts,
          laborCost: num(fields.laborCost), castingCost: num(fields.castingCost),
          shippingCost: num(fields.shippingCost), designFee: num(fields.designFee), rushMultiplier: num(fields.rushMultiplier) || 1,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Quote save failed');
      notify('Quote saved', 'success');
      setEditMode(false);
      await onChanged?.();
    } catch (e) { notify(e.message, 'error'); } finally { setBusy(false); }
  };

  /* ---------------- view mode ---------------- */
  if (!editMode) {
    const viewMatTotal = (q.materialCosts || []).reduce((s, m) => s + lineCost(m), 0);
    const rows = [
      ['Materials & gemstones', viewMatTotal],
      ['Labor', q.laborCost], ['Casting', q.castingCost], ['Shipping', q.shippingCost],
      ['Designer fee', q.designFee], ['GLB fee', q.glbFee], ['QC review fee', q.qcReviewFee],
    ].filter(([, v]) => num(v) > 0);
    return (
      <Paper sx={panelSx}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
          <Stack direction="row" spacing={1} alignItems="center"><RequestQuoteIcon sx={{ color: REPAIRS_UI.accent }} /><Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader }}>Quote</Typography></Stack>
          <Button size="small" startIcon={<EditIcon sx={{ fontSize: 16 }} />} onClick={startEdit} sx={{ color: REPAIRS_UI.accent }}>Edit</Button>
        </Stack>
        {(q.materialCosts || []).length > 0 && (
          <Table size="small" sx={{ mb: 1 }}>
            <TableBody>
              {q.materialCosts.map((m, i) => (
                <TableRow key={i}>
                  <TableCell sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border }}>{m.name || 'Item'}{m.category && m.category !== 'material' ? ` · ${m.category}` : ''}</TableCell>
                  <TableCell sx={{ color: REPAIRS_UI.textSecondary, borderColor: REPAIRS_UI.border }} align="right">{num(m.quantity) || 1} × {money(m.unitPrice ?? m.cost)}</TableCell>
                  <TableCell sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border }} align="right">{money(lineCost(m))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <Stack spacing={0.75}>
          {rows.map(([label, v]) => (
            <Stack key={label} direction="row" justifyContent="space-between"><Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>{label}</Typography><Typography variant="body2">{money(v)}</Typography></Stack>
          ))}
        </Stack>
        <Divider sx={{ my: 1.5, borderColor: REPAIRS_UI.border }} />
        <Stack direction="row" justifyContent="space-between"><Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>COG (cost)</Typography><Typography variant="body2">{money(q.cog)}</Typography></Stack>
        <Stack direction="row" justifyContent="space-between"><Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>Markup</Typography><Typography variant="body2">× {q.cogMarkup || 2.5}{q.rushMultiplier > 1 ? ` · rush × ${q.rushMultiplier}` : ''}</Typography></Stack>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
          <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader }}>Quote total</Typography>
          <Typography sx={{ fontWeight: 700, fontSize: '1.25rem', color: REPAIRS_UI.accent }}>{money(q.quoteTotal)}</Typography>
        </Stack>
        {margin && (
          <Stack direction="row" spacing={3} sx={{ mt: 2 }}>
            <Box><Typography sx={{ fontSize: '0.72rem', color: REPAIRS_UI.textSecondary, textTransform: 'uppercase' }}>Margin (vs piece COGS)</Typography><Typography sx={{ fontWeight: 700, color: margin.margin >= 0 ? '#66BB6A' : '#EF5350' }}>{money(margin.margin)} ({margin.marginPct}%)</Typography></Box>
            <Box><Typography sx={{ fontSize: '0.72rem', color: REPAIRS_UI.textSecondary, textTransform: 'uppercase' }}>Piece COGS</Typography><Typography sx={{ fontWeight: 700, color: REPAIRS_UI.textPrimary }}>{money(margin.cogs)}</Typography></Box>
          </Stack>
        )}
      </Paper>
    );
  }

  /* ---------------- edit mode ---------------- */
  return (
    <Paper sx={panelSx}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
        <Stack direction="row" spacing={1} alignItems="center"><RequestQuoteIcon sx={{ color: REPAIRS_UI.accent }} /><Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader }}>Edit quote</Typography></Stack>
        <Stack direction="row" spacing={1}>
          <Button size="small" onClick={() => setEditMode(false)} sx={{ color: REPAIRS_UI.textSecondary }}>Cancel</Button>
          <Button size="small" variant="contained" disabled={busy} onClick={save} sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, '&:hover': { backgroundColor: '#C19B2E' } }}>Save</Button>
        </Stack>
      </Stack>

      <Typography variant="caption" sx={{ color: REPAIRS_UI.textSecondary, fontWeight: 600 }}>Materials &amp; gemstones</Typography>
      <Table size="small" sx={{ mb: 1 }}>
        <TableHead>
          <TableRow>
            {['Item', 'Category', 'Qty', 'Unit', 'Total', ''].map((h, i) => <TableCell key={i} align={['Qty', 'Unit', 'Total'].includes(h) ? 'right' : 'left'} sx={{ color: REPAIRS_UI.textMuted, borderColor: REPAIRS_UI.border, px: 0.75 }}>{h}</TableCell>)}
          </TableRow>
        </TableHead>
        <TableBody>
          {materials.map((m, i) => (
            <TableRow key={i}>
              <TableCell sx={{ borderColor: REPAIRS_UI.border, px: 0.75 }}><TextField variant="standard" value={m.name} onChange={(e) => setRow(i, 'name', e.target.value)} fullWidth placeholder="Item" /></TableCell>
              <TableCell sx={{ borderColor: REPAIRS_UI.border, px: 0.75 }}><TextField select variant="standard" value={m.category} onChange={(e) => setRow(i, 'category', e.target.value)} sx={{ minWidth: 90 }}>{MATERIAL_CATEGORIES.map((c) => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}</TextField></TableCell>
              <TableCell sx={{ borderColor: REPAIRS_UI.border, px: 0.75, width: 60 }}><TextField variant="standard" type="number" value={m.quantity} onChange={(e) => setRow(i, 'quantity', e.target.value)} inputProps={{ style: { textAlign: 'right' } }} /></TableCell>
              <TableCell sx={{ borderColor: REPAIRS_UI.border, px: 0.75, width: 80 }}><TextField variant="standard" type="number" value={m.unitPrice} onChange={(e) => setRow(i, 'unitPrice', e.target.value)} inputProps={{ style: { textAlign: 'right' } }} /></TableCell>
              <TableCell align="right" sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border, px: 0.75 }}>{money(lineCost(m))}</TableCell>
              <TableCell sx={{ borderColor: REPAIRS_UI.border, px: 0.25 }}><IconButton size="small" onClick={() => removeRow(i)} sx={{ color: REPAIRS_UI.textMuted }}><DeleteIcon fontSize="small" /></IconButton></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Button size="small" startIcon={<AddIcon />} onClick={addRow} sx={{ color: REPAIRS_UI.accent, mb: 2 }}>Add line</Button>

      <Grid container spacing={2} sx={{ mb: 1 }}>
        <Grid item xs={6} sm={3}><TextField label="Labor" type="number" size="small" value={fields.laborCost} onChange={(e) => setField('laborCost', e.target.value)} fullWidth /></Grid>
        <Grid item xs={6} sm={3}><TextField label="Casting" type="number" size="small" value={fields.castingCost} onChange={(e) => setField('castingCost', e.target.value)} fullWidth /></Grid>
        <Grid item xs={6} sm={3}><TextField label="Shipping" type="number" size="small" value={fields.shippingCost} onChange={(e) => setField('shippingCost', e.target.value)} fullWidth /></Grid>
        <Grid item xs={6} sm={3}><TextField label="Designer fee" type="number" size="small" value={fields.designFee} onChange={(e) => setField('designFee', e.target.value)} fullWidth helperText="From CAD assignment" /></Grid>
        <Grid item xs={6} sm={3}><TextField label="Rush ×" type="number" size="small" value={fields.rushMultiplier} onChange={(e) => setField('rushMultiplier', e.target.value)} fullWidth /></Grid>
      </Grid>
      {(glbFee > 0 || qcFee > 0) && (
        <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, display: 'block', mb: 1 }}>
          + GLB fee {money(glbFee)} · QC fee {money(qcFee)} (from production)
        </Typography>
      )}

      <Divider sx={{ my: 1.5, borderColor: REPAIRS_UI.border }} />
      <Stack direction="row" justifyContent="space-between"><Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>COG (cost)</Typography><Typography variant="body2">{money(liveCog)}</Typography></Stack>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 0.5 }}>
        <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader }}>Quote total (× {cogMarkup}{liveRush > 1 ? ` · rush × ${liveRush}` : ''})</Typography>
        <Typography sx={{ fontWeight: 700, fontSize: '1.2rem', color: REPAIRS_UI.accent }}>{money(liveTotal)}</Typography>
      </Stack>
    </Paper>
  );
}
