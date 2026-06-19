import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Stack, Typography, Button, IconButton, Divider, TextField, MenuItem,
  Table, TableHead, TableRow, TableCell, TableBody, Grid, Chip,
} from '@mui/material';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import CalculateIcon from '@mui/icons-material/Calculate';
import InsightsIcon from '@mui/icons-material/Insights';
import DiamondIcon from '@mui/icons-material/AutoAwesome';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

const cardSx = { p: 2.5, height: '100%', backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' };
const money = (n) => `$${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const num = (v) => Number(v) || 0;
const MATERIAL_CATEGORIES = [
  { value: 'material', label: 'Material' }, { value: 'gemstone', label: 'Gemstone' },
  { value: 'finding', label: 'Finding' }, { value: 'mounting', label: 'Mounting' },
];

function lineCost(m) {
  if (m.cost != null && m.cost !== '') return num(m.cost);
  return Math.max(num(m.quantity) || 1, 0) * num(m.unitPrice);
}
function toEditable(m) {
  const hasUnit = m.unitPrice != null && m.unitPrice !== '';
  return { name: m.name || m.displayName || '', category: m.category || 'material', quantity: m.quantity ?? 1, unitPrice: hasUnit ? m.unitPrice : (m.cost ?? 0) };
}
function CardHead({ icon: Icon, title, action, color = REPAIRS_UI.accent }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
      <Stack direction="row" spacing={1} alignItems="center"><Icon sx={{ color, fontSize: 20 }} /><Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader }}>{title}</Typography></Stack>
      {action}
    </Stack>
  );
}
function Row({ label, value, color, strong, warn }) {
  return (
    <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.75 }}>
      <Typography variant="body2" sx={{ color: warn ? '#EF5350' : REPAIRS_UI.textSecondary, fontWeight: strong ? 700 : 400 }}>{label}</Typography>
      <Typography variant="body2" sx={{ color: color || REPAIRS_UI.textPrimary, fontWeight: strong ? 700 : 400 }}>{value}</Typography>
    </Stack>
  );
}

/** Customer-facing summary. */
function QuoteSummaryCard({ lines, cog, cogMarkup, rush, total }) {
  return (
    <Paper sx={cardSx}>
      <CardHead icon={CalculateIcon} title="Quote Summary" />
      {lines.map(([label, v]) => <Row key={label} label={label} value={money(v)} />)}
      <Divider sx={{ my: 1.25, borderColor: REPAIRS_UI.border }} />
      <Row label="COG (cost)" value={money(cog)} />
      <Row label="Markup" value={`× ${cogMarkup}${rush > 1 ? ` · rush × ${rush}` : ''}`} />
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
        <Typography sx={{ fontWeight: 700, color: REPAIRS_UI.textHeader }}>Quote total</Typography>
        <Typography sx={{ fontWeight: 700, fontSize: '1.4rem', color: REPAIRS_UI.accent }}>{money(total)}</Typography>
      </Stack>
      <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>Sales tax calculated at checkout (Stripe Tax).</Typography>
    </Paper>
  );
}

/** Internal analytics. */
function AnalyticsCard({ cog, total, designerPayout, margin, bonus, floorPct }) {
  const grossProfit = total - cog;
  const grossMargin = total > 0 ? (grossProfit / total) * 100 : 0;
  const belowFloor = grossMargin < floorPct;
  return (
    <Paper sx={{ ...cardSx, backgroundColor: REPAIRS_UI.bgCard }}>
      <CardHead icon={InsightsIcon} title="Financial Analytics" color="#64B5F6" />
      <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quoted</Typography>
      <Box sx={{ mt: 0.5 }}>
        <Row label="COG (materials + labor + fees)" value={money(cog)} />
        <Row label="Quote total" value={money(total)} />
        <Row label="Gross profit" value={money(grossProfit)} color="#66BB6A" />
        <Row label="Gross margin" value={`${grossMargin.toFixed(1)}%${belowFloor ? ` (below ${floorPct.toFixed(0)}% floor)` : ''}`} warn={belowFloor} strong={belowFloor} />
      </Box>
      <Divider sx={{ my: 1.25, borderColor: REPAIRS_UI.border }} />
      <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actuals (from production)</Typography>
      <Box sx={{ mt: 0.5 }}>
        <Row label="Designer payout" value={money(designerPayout)} />
        {bonus > 0 && <Row label="Client-mgmt bonus" value={money(bonus)} />}
        {margin && <Row label="Piece COGS" value={money(margin.cogs)} />}
        {margin && <Row label="Margin (vs piece COGS)" value={`${money(margin.margin)} (${margin.marginPct}%)`} color={margin.margin >= 0 ? '#66BB6A' : '#EF5350'} strong />}
      </Box>
    </Paper>
  );
}

export default function QuoteTab({ customID, order, margin, onChanged, notify }) {
  const q = order.quote || {};
  const [editMode, setEditMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [materials, setMaterials] = useState([]);
  const [fields, setFields] = useState({ laborCost: 0, castingCost: 0, shippingCost: 0, designFee: 0, rushMultiplier: 1 });
  const [floorPct, setFloorPct] = useState(45);

  useEffect(() => {
    fetch('/api/admin/settings').then((r) => r.ok ? r.json() : null).then((s) => {
      const f = Number(s?.financial?.targetMarginFloor);
      if (f >= 0 && f <= 1) setFloorPct(f * 100);
    }).catch(() => {});
  }, []);

  const startEdit = () => {
    setMaterials((q.materialCosts || []).map(toEditable));
    setFields({ laborCost: q.laborCost || 0, castingCost: q.castingCost || 0, shippingCost: q.shippingCost || 0, designFee: q.designFee || 0, rushMultiplier: q.rushMultiplier || 1 });
    setEditMode(true);
  };
  const setField = (k, v) => setFields((f) => ({ ...f, [k]: v }));
  const setRow = (i, k, v) => setMaterials((rows) => rows.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const addRow = () => setMaterials((rows) => [...rows, { name: '', category: 'material', quantity: 1, unitPrice: 0 }]);
  const removeRow = (i) => setMaterials((rows) => rows.filter((_, idx) => idx !== i));

  const glbFee = num(q.glbFee);
  const qcFee = num(q.qcReviewFee);
  const cogMarkup = num(q.cogMarkup) || 2.5;

  // Values shown depend on mode (stored vs live edit).
  const matLines = editMode ? materials : (q.materialCosts || []).map(toEditable);
  const matTotal = matLines.reduce((s, m) => s + lineCost(m), 0);
  const f = editMode ? fields : { laborCost: q.laborCost, castingCost: q.castingCost, shippingCost: q.shippingCost, designFee: q.designFee, rushMultiplier: q.rushMultiplier };
  const cog = matTotal + num(f.laborCost) + num(f.castingCost) + num(f.shippingCost) + num(f.designFee) + glbFee + qcFee;
  const rush = num(f.rushMultiplier) > 1 ? num(f.rushMultiplier) : 1;
  const total = editMode ? cog * cogMarkup * rush : num(q.quoteTotal);

  const summaryLines = [
    ['Materials & gemstones', matTotal], ['Labor', num(f.laborCost)], ['Casting', num(f.castingCost)],
    ['Shipping', num(f.shippingCost)], ['Designer fee', num(f.designFee)], ['GLB fee', glbFee], ['QC review fee', qcFee],
  ].filter(([, v]) => num(v) > 0);

  const save = async () => {
    setBusy(true);
    try {
      const materialCosts = materials.filter((m) => m.name.trim() || lineCost(m) > 0)
        .map((m) => ({ name: m.name.trim() || 'Item', category: m.category, quantity: num(m.quantity) || 1, unitPrice: num(m.unitPrice) }));
      const res = await fetch(`/api/custom-orders/${customID}/quote`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materialCosts, laborCost: num(fields.laborCost), castingCost: num(fields.castingCost), shippingCost: num(fields.shippingCost), designFee: num(fields.designFee), rushMultiplier: num(fields.rushMultiplier) || 1 }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Quote save failed');
      notify('Quote saved', 'success');
      setEditMode(false);
      await onChanged?.();
    } catch (e) { notify(e.message, 'error'); } finally { setBusy(false); }
  };

  return (
    <Stack spacing={2}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Stack direction="row" spacing={1} alignItems="center"><RequestQuoteIcon sx={{ color: REPAIRS_UI.accent }} /><Typography sx={{ fontWeight: 600, fontSize: '1.1rem', color: REPAIRS_UI.textHeader }}>Quote</Typography>
          <Chip size="small" label={money(total)} sx={{ bgcolor: REPAIRS_UI.bgTertiary, color: REPAIRS_UI.accent, fontWeight: 700 }} /></Stack>
        {editMode
          ? <Stack direction="row" spacing={1}><Button size="small" onClick={() => setEditMode(false)} sx={{ color: REPAIRS_UI.textSecondary }}>Cancel</Button><Button size="small" variant="contained" disabled={busy} onClick={save} sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, '&:hover': { backgroundColor: '#C19B2E' } }}>Save</Button></Stack>
          : <Button size="small" startIcon={<EditIcon sx={{ fontSize: 16 }} />} onClick={startEdit} sx={{ color: REPAIRS_UI.accent }}>Edit</Button>}
      </Stack>

      {/* Editor (carded line-item table + fields) */}
      {editMode && (
        <Paper sx={cardSx}>
          <CardHead icon={DiamondIcon} title="Materials & gemstones" action={<Button size="small" startIcon={<AddIcon />} onClick={addRow} sx={{ color: REPAIRS_UI.accent }}>Add line</Button>} />
          <Table size="small" sx={{ mb: 2 }}>
            <TableHead><TableRow>{['Item', 'Category', 'Qty', 'Unit', 'Total', ''].map((h, i) => <TableCell key={i} align={['Qty', 'Unit', 'Total'].includes(h) ? 'right' : 'left'} sx={{ color: REPAIRS_UI.textMuted, borderColor: REPAIRS_UI.border, px: 0.75 }}>{h}</TableCell>)}</TableRow></TableHead>
            <TableBody>
              {materials.map((m, i) => (
                <TableRow key={i}>
                  <TableCell sx={{ borderColor: REPAIRS_UI.border, px: 0.75 }}><TextField variant="standard" value={m.name} onChange={(e) => setRow(i, 'name', e.target.value)} fullWidth placeholder="Item" /></TableCell>
                  <TableCell sx={{ borderColor: REPAIRS_UI.border, px: 0.75 }}><TextField select variant="standard" value={m.category} onChange={(e) => setRow(i, 'category', e.target.value)} sx={{ minWidth: 90 }}>{MATERIAL_CATEGORIES.map((c) => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}</TextField></TableCell>
                  <TableCell sx={{ borderColor: REPAIRS_UI.border, px: 0.75, width: 56 }}><TextField variant="standard" type="number" value={m.quantity} onChange={(e) => setRow(i, 'quantity', e.target.value)} inputProps={{ style: { textAlign: 'right' } }} /></TableCell>
                  <TableCell sx={{ borderColor: REPAIRS_UI.border, px: 0.75, width: 76 }}><TextField variant="standard" type="number" value={m.unitPrice} onChange={(e) => setRow(i, 'unitPrice', e.target.value)} inputProps={{ style: { textAlign: 'right' } }} /></TableCell>
                  <TableCell align="right" sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border, px: 0.75 }}>{money(lineCost(m))}</TableCell>
                  <TableCell sx={{ borderColor: REPAIRS_UI.border, px: 0.25 }}><IconButton size="small" onClick={() => removeRow(i)} sx={{ color: REPAIRS_UI.textMuted }}><DeleteIcon fontSize="small" /></IconButton></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={2.4}><TextField label="Labor" type="number" size="small" value={fields.laborCost} onChange={(e) => setField('laborCost', e.target.value)} fullWidth /></Grid>
            <Grid item xs={6} sm={2.4}><TextField label="Casting" type="number" size="small" value={fields.castingCost} onChange={(e) => setField('castingCost', e.target.value)} fullWidth /></Grid>
            <Grid item xs={6} sm={2.4}><TextField label="Shipping" type="number" size="small" value={fields.shippingCost} onChange={(e) => setField('shippingCost', e.target.value)} fullWidth /></Grid>
            <Grid item xs={6} sm={2.4}><TextField label="Designer fee" type="number" size="small" value={fields.designFee} onChange={(e) => setField('designFee', e.target.value)} fullWidth /></Grid>
            <Grid item xs={6} sm={2.4}><TextField label="Rush ×" type="number" size="small" value={fields.rushMultiplier} onChange={(e) => setField('rushMultiplier', e.target.value)} fullWidth /></Grid>
          </Grid>
        </Paper>
      )}

      {/* Two-panel summary */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}><QuoteSummaryCard lines={summaryLines} cog={cog} cogMarkup={cogMarkup} rush={rush} total={total} /></Grid>
        <Grid item xs={12} md={6}><AnalyticsCard cog={cog} total={total} designerPayout={num(f.designFee)} margin={margin} bonus={num(order.clientMgmtBonus)} floorPct={floorPct} /></Grid>
      </Grid>
    </Stack>
  );
}
