import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Stack, Typography, Button, IconButton, Divider, TextField, Grid, Chip,
  FormControlLabel, Switch, InputAdornment, Autocomplete, MenuItem,
} from '@mui/material';
import CalculateIcon from '@mui/icons-material/Calculate';
import InsightsIcon from '@mui/icons-material/Insights';
import DiamondIcon from '@mui/icons-material/AutoAwesome';
import BuildIcon from '@mui/icons-material/Build';
import ShippingIcon from '@mui/icons-material/LocalShipping';
import TuneIcon from '@mui/icons-material/Tune';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import PublishIcon from '@mui/icons-material/Publish';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';
import { METAL_TYPES } from '@/constants/metalTypes';

// Castable metals for the model-cost estimator (exclude the wax/reference entry).
const METAL_OPTS = Object.entries(METAL_TYPES)
  .filter(([, m]) => m.category !== 'reference')
  .map(([value, m]) => ({ value, label: m.label }));

const cardSx = { p: 2.5, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' };
const money = (x) => `$${(Number(x) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const n = (v) => Number(v) || 0;
const lineSum = (arr) => (arr || []).reduce((s, x) => s + n(x.cost) * Math.max(n(x.quantity) || 1, 1), 0);
// Marked-up revenue honouring an optional per-line `markup`. MIRRORS lineRevenue in customQuote.js —
// if these drift, the preview quotes a price the save won't produce.
const lineRevenue = (arr, dflt) => (arr || []).reduce((s, x) => {
  const cost = n(x.cost) * Math.max(n(x.quantity) || 1, 1);
  return s + cost * (n(x.markup) > 0 ? n(x.markup) : dflt);
}, 0);
const goldBtn = { backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, '&:hover': { backgroundColor: '#C19B2E' } };
const DISCIPLINE_OPTS = [
  { value: 'bench_jewelry', label: 'Bench' }, { value: 'cad', label: 'CAD' },
  { value: 'engraving', label: 'Engraving' }, { value: 'gem_cutting', label: 'Gem Cutting' },
];
// Map a task-catalog category to a bench discipline (for the generated work order's lane).
function categoryToDiscipline(category = '') {
  const c = String(category).toLowerCase();
  if (/cad|design/.test(c)) return 'cad';
  if (/engrav/.test(c)) return 'engraving';
  if (/gem|cut|lapidar|ston.*cut/.test(c)) return 'gem_cutting';
  return 'bench_jewelry';
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

/** Autocomplete sourced from the repair task catalog + historical custom tasks. */
function TaskAutocomplete({ value, disabled, onText, onPick }) {
  const [options, setOptions] = useState([]);
  const [input, setInput] = useState(value || '');
  useEffect(() => { setInput(value || ''); }, [value]);
  useEffect(() => {
    if (disabled) return undefined;
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/custom-orders/task-suggestions?context=custom&search=${encodeURIComponent(input || '')}`);
        if (r.ok && !cancelled) setOptions(await r.json());
      } catch { /* ignore */ }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [input, disabled]);
  return (
    <Autocomplete
      freeSolo size="small" disabled={disabled} options={options} filterOptions={(x) => x}
      value={null} inputValue={input}
      getOptionLabel={(o) => (typeof o === 'string' ? o : o.label || '')}
      isOptionEqualToValue={(o, v) => o.label === v.label}
      onInputChange={(_, v) => { setInput(v); onText(v); }}
      onChange={(_, v) => { if (v && typeof v !== 'string') onPick({ description: v.label, cost: v.cost, hours: v.hours, category: v.category }); }}
      renderOption={(props, o) => (
        <Box component="li" {...props} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
          <span>{o.label}</span>
          <Stack direction="row" spacing={0.75} alignItems="center">
            {o.cost > 0 && <Typography variant="caption" sx={{ color: 'text.secondary' }}>${o.cost}</Typography>}
            <Chip size="small" label={o.source === 'custom' ? 'custom' : 'repair'} variant="outlined" sx={{ height: 18 }} />
          </Stack>
        </Box>
      )}
      renderInput={(params) => <TextField {...params} label="Task description" placeholder="set stones, polish…" />}
    />
  );
}

/** Repeatable line-item editor (description [+discipline][+qty] + cost). `suggest` → task autocomplete. */
function LineEditor({ rows, onChange, withQty, withDiscipline, withHours, withMarkup, defaultMarkup, editMode, emptyText, suggest }) {
  const set = (i, k, v) => onChange(rows.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const patch = (i, obj) => onChange(rows.map((r, idx) => (idx === i ? { ...r, ...obj } : r)));
  const remove = (i) => onChange(rows.filter((_, idx) => idx !== i));
  if (!rows.length) return <Typography variant="body2" sx={{ color: REPAIRS_UI.textMuted, py: 1 }}>{emptyText}</Typography>;
  const descSm = withDiscipline ? 4 : (withMarkup ? 4 : (withQty ? 6 : 8));
  return (
    <Stack spacing={1}>
      {rows.map((r, i) => {
        // Bench-lane labor with no hours → the generated work order has nothing to pay the
        // jeweler. CAD-lane lines (QC/GLB) don't spawn paying bench WOs, so don't warn there.
        const noHours = withHours && r.discipline !== 'cad' && !(Number(r.hours) > 0);
        return (
        <Grid container spacing={1} key={i} alignItems="center">
          <Grid item xs={12} sm={descSm}>
            {suggest
              ? <TaskAutocomplete value={r.description} disabled={!editMode} onText={(v) => set(i, 'description', v)} onPick={({ description, cost, hours, category }) => patch(i, { description, cost, hours, ...(category ? { discipline: categoryToDiscipline(category) } : {}) })} />
              : <TextField fullWidth size="small" label="Description" value={r.description || ''} disabled={!editMode} onChange={(e) => set(i, 'description', e.target.value)} />}
          </Grid>
          {withDiscipline && (
            <Grid item xs={6} sm={2.5}>
              <TextField select fullWidth size="small" label="Lane" value={r.discipline || 'bench_jewelry'} disabled={!editMode} onChange={(e) => set(i, 'discipline', e.target.value)}>
                {DISCIPLINE_OPTS.map((d) => <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>)}
              </TextField>
            </Grid>
          )}
          {withQty && <Grid item xs={4} sm={withDiscipline ? 1 : 2}><TextField fullWidth size="small" label="Qty" type="number" value={r.quantity ?? 1} disabled={!editMode} onChange={(e) => set(i, 'quantity', e.target.value)} /></Grid>}
          {withHours && (
            <Grid item xs={4} sm={1.5}>
              <TextField
                fullWidth size="small" label="Hrs" type="number" value={r.hours ?? 0} disabled={!editMode}
                onChange={(e) => set(i, 'hours', e.target.value)}
                error={noHours}
                helperText={noHours ? 'no payout' : ' '}
                FormHelperTextProps={{ sx: { mx: 0, mt: 0, fontSize: '0.6rem', color: '#EF5350' } }}
                inputProps={{ step: 0.25, min: 0 }}
              />
            </Grid>
          )}
          <Grid item xs={withDiscipline ? 6 : 8} sm={withDiscipline ? 2 : (withMarkup ? 2.5 : 3)}><TextField fullWidth size="small" label="Cost" type="number" value={r.cost ?? 0} disabled={!editMode} onChange={(e) => set(i, 'cost', e.target.value)} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} /></Grid>
          {withMarkup && (
            <Grid item xs={10} sm={2.5}>
              {/* Optional per-line markup. Blank = the default. For a bought-in good that didn't earn
                  keystone — one expensive melee, a clasp — not for melee you set by the dozen. */}
              <TextField
                fullWidth size="small" label="Markup" type="number"
                value={r.markup ?? ''} disabled={!editMode}
                onChange={(e) => set(i, 'markup', e.target.value)}
                placeholder={String(defaultMarkup ?? '')}
                InputProps={{ startAdornment: <InputAdornment position="start">×</InputAdornment> }}
                inputProps={{ step: 0.05, min: 0 }}
              />
            </Grid>
          )}
          <Grid item xs={2} sm={1}>{editMode && <IconButton size="small" onClick={() => remove(i)} sx={{ color: REPAIRS_UI.textMuted }}><DeleteIcon fontSize="small" /></IconButton>}</Grid>
        </Grid>
      );
      })}
    </Stack>
  );
}

function QuoteSummaryCard({ lines, cog, cogMarkup, rush, subtotal, taxRate, taxAmount, total, effectiveMarkup }) {
  // Once the centre stone or any material line carries its own markup, "× 2.5" is no longer what the
  // customer is actually paying per dollar of cost. Show the blend whenever it differs from the
  // headline, so a quote stays explainable weeks later.
  const blended = Number(effectiveMarkup) > 0 && Math.abs(effectiveMarkup - cogMarkup * (rush > 1 ? rush : 1)) > 0.005;
  return (
    <Paper sx={cardSx}>
      <CardHead icon={CalculateIcon} title="Quote Summary" />
      {lines.map(([label, v]) => <Row key={label} label={label} value={money(v)} />)}
      <Divider sx={{ my: 1.25, borderColor: REPAIRS_UI.border }} />
      <Row label="COG (cost)" value={money(cog)} />
      <Row label="Markup" value={`× ${cogMarkup}${rush > 1 ? ` · rush × ${rush}` : ''}`} />
      {blended && <Row label="Effective (blended)" value={`× ${effectiveMarkup}`} color={REPAIRS_UI.accent} />}
      <Row label="Subtotal" value={money(subtotal)} />
      <Row label={`Sales tax (${(Number(taxRate) * 100).toFixed(taxRate && taxRate * 100 % 1 ? 2 : 1)}%)`} value={money(taxAmount)} />
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
        <Typography sx={{ fontWeight: 700, color: REPAIRS_UI.textHeader }}>Total due</Typography>
        <Typography sx={{ fontWeight: 700, fontSize: '1.4rem', color: REPAIRS_UI.accent }}>{money(total)}</Typography>
      </Stack>
      <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>
        {taxRate > 0 ? 'Sales tax (admin-settings rate) is added to the subtotal and billed on invoices.' : 'Tax-exempt — no sales tax applied.'}
      </Typography>
    </Paper>
  );
}
function AnalyticsCard({ cog, total, designerPayout, margin, bonus, floorPct, workRevenue, workCog }) {
  const grossProfit = total - cog;
  const grossMargin = total > 0 ? (grossProfit / total) * 100 : 0;

  // THE FLOOR IS CHECKED ON EFD'S OWN WORK, not on the blended total.
  //
  // The floor exists to catch under-pricing EFD's labour and mounting. A centre stone resold at near
  // cost is not EFD's work, and leaving it in the denominator turns this metric into "how much of this
  // sale was pass-through" — which drags a correctly-priced diamond ring under the floor. Concretely:
  // a $4,000 stone at 1.3× in a $1,000 ring at 2.5× blends to 35.1% and would trip a 45% floor, while
  // the ring itself is at a healthy 60%. A warning that fires on every diamond sale is one nobody
  // reads, which costs us the cases it should actually catch.
  const workMargin = workRevenue > 0 ? ((workRevenue - workCog) / workRevenue) * 100 : grossMargin;
  const belowFloor = workMargin < floorPct;
  // Worth surfacing separately when a pass-through line pulls the blend well below the work margin.
  const blendDiffers = Math.abs(workMargin - grossMargin) > 0.05;
  return (
    <Paper sx={{ ...cardSx, backgroundColor: REPAIRS_UI.bgCard }}>
      <CardHead icon={InsightsIcon} title="Financial Analytics" color="#64B5F6" />
      <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quoted</Typography>
      <Box sx={{ mt: 0.5 }}>
        <Row label="COG (materials + labor + fees)" value={money(cog)} />
        <Row label="Quote total" value={money(total)} />
        <Row label="Gross profit" value={money(grossProfit)} color="#66BB6A" />
        {/* Blended margin, shown for information — it's what the sale actually yields, but a
            pass-through stone legitimately drags it down, so it is NOT what the floor judges. */}
        <Row label="Gross margin (blended)" value={`${grossMargin.toFixed(1)}%`} />
        {blendDiffers && (
          <Row
            label="Margin on EFD's work"
            value={`${workMargin.toFixed(1)}%${belowFloor ? ` (below ${floorPct.toFixed(0)}% floor)` : ''}`}
            warn={belowFloor} strong={belowFloor}
          />
        )}
        {!blendDiffers && belowFloor && (
          <Row label="Margin floor" value={`below ${floorPct.toFixed(0)}%`} warn strong />
        )}
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

const blankForm = (q = {}) => ({
  centerstone: { item: q.centerstone?.item || q.centerstone?.description || '', cost: q.centerstone?.cost ?? 0 },
  // '' = no override; falls back to the settings centre-stone default, then to the COG markup.
  centerstoneMarkup: n(q.centerstoneMarkup) > 0 ? q.centerstoneMarkup : '',
  mounting: { item: q.mounting?.item || q.mounting?.description || '', cost: q.mounting?.cost ?? 0 },
  accentStones: Array.isArray(q.accentStones) ? q.accentStones : [],
  additionalMaterials: Array.isArray(q.additionalMaterials) ? q.additionalMaterials : [],
  laborTasks: Array.isArray(q.laborTasks) ? q.laborTasks : [],
  shippingCosts: Array.isArray(q.shippingCosts) ? q.shippingCosts : [],
  isRush: !!q.isRush,
  includeCustomDesign: !!q.includeCustomDesign || n(q.designFee) > 0,
  designFee: q.designFee ?? 0,
  cogMarkup: n(q.cogMarkup) > 0 ? q.cogMarkup : '', // '' = use the admin-settings default
  taxExempt: !!q.taxExempt, // resale/wholesale custom → no sales tax
});

export default function QuoteTab({ customID, order, margin, onChanged, notify }) {
  const q = order.quote || {};
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(() => blankForm(q));
  const [floorPct, setFloorPct] = useState(45);
  const [defaultMarkup, setDefaultMarkup] = useState(2.5); // admin-settings cogMarkup (fallback when no per-quote override)
  const [defaultStoneMarkup, setDefaultStoneMarkup] = useState(0); // 0 = unset ⇒ centre stone uses the COG markup
  const [taxRate, setTaxRate] = useState(0); // admin-settings pricing.taxRate (fraction)
  const [defaultRush, setDefaultRush] = useState(1.5); // admin-settings rushMultiplier; mirrors DEFAULT_RUSH

  // Always-editable (no Edit toggle). Re-sync from the order whenever it reloads
  // (after save / casting / status changes — the only times `order.quote` changes
  // identity; in-progress edits aren't clobbered because typing doesn't reload).
  useEffect(() => { setForm(blankForm(order.quote || {})); }, [order.quote]);
  useEffect(() => {
    fetch('/api/admin/settings').then((r) => r.ok ? r.json() : null).then((s) => {
      const f = Number(s?.financial?.targetMarginFloor);
      if (f >= 0 && f <= 1) setFloorPct(f * 100);
      const cs = Number(s?.financial?.centerstoneMarkup);
      if (cs > 0) setDefaultStoneMarkup(cs);
      const m = Number(s?.financial?.cogMarkup);
      if (m > 0) setDefaultMarkup(m);
      const t = Number(s?.pricing?.taxRate);
      if (t >= 0) setTaxRate(t);
      const r = Number(s?.financial?.rushMultiplier);
      if (r > 1) setDefaultRush(r);
    }).catch(() => {});
  }, []);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setNested = (parent, k, v) => setForm((f) => ({ ...f, [parent]: { ...f[parent], [k]: v } }));

  // Model-cost estimator (Build B): STL volume (set on CAD upload) × metal → mounting metal cost.
  const stlVolumeCm3 = n(order.designModel?.stlVolumeCm3);
  const [estMetal, setEstMetal] = useState('GOLD_14K_YELLOW');
  const [estimating, setEstimating] = useState(false);
  const estimateMounting = async () => {
    if (stlVolumeCm3 <= 0) { notify('No model volume yet — upload the STL on the CAD work order first.', 'warning'); return; }
    setEstimating(true);
    try {
      const res = await fetch('/api/production/designs/estimate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stlVolumeCm3, metalKey: estMetal }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Estimate failed');
      const metalCost = n(data.estimate?.metal?.metalCost);
      setNested('mounting', 'cost', metalCost);
      const label = METAL_OPTS.find((m) => m.value === estMetal)?.label || estMetal;
      if (!form.mounting.item) setNested('mounting', 'item', `${label} mounting (cast)`);
      notify(`Estimated ${label} metal: ${money(metalCost)} (${data.estimate.metal.metalWeightG} g from ${stlVolumeCm3} cm³)`, 'success');
    } catch (e) { notify(e.message, 'error'); } finally { setEstimating(false); }
  };

  // Live COG/total (mirrors computeQuote; glb/qc/casting come from production/order).
  const castingCost = n(q.castingCost); const glbFee = n(q.glbFee); const qcFee = n(q.qcReviewFee);
  // Per-quote markup override (form) wins over the admin-settings default — mirrors computeQuote.
  const cogMarkup = n(form.cogMarkup) > 0 ? n(form.cogMarkup) : defaultMarkup;
  // The CENTRE STONE is marked up separately — it doesn't carry mounting keystone. Mirrors
  // computeQuote; if these two ever disagree the preview quotes a price the save won't produce.
  const centerstoneMarkup = n(form.centerstoneMarkup) > 0
    ? n(form.centerstoneMarkup)
    : (defaultStoneMarkup > 0 ? defaultStoneMarkup : cogMarkup);
  const stoneCost = n(form.centerstone.cost);
  const otherMatTotal = n(form.mounting.cost) + lineSum(form.accentStones) + lineSum(form.additionalMaterials);
  const matTotal = stoneCost + otherMatTotal;
  const laborTotal = lineSum(form.laborTasks);
  const shipTotal = lineSum(form.shippingCosts);
  const designTotal = form.includeCustomDesign ? n(form.designFee) : n(form.designFee);
  const cogExStone = otherMatTotal + laborTotal + shipTotal + castingCost + designTotal + glbFee + qcFee;
  const cog = cogExStone + stoneCost;
  // Fallback chain must match computeQuote's: per-quote override → admin settings → hard default. It
  // used to jump straight to 1.5, so a shop with settings.rushMultiplier = 2.0 previewed a rush ring at
  // 2.5×1.5 and SAVED it at 2.5×2.0 — a $1,250 gap on a $1,000 ring between the screen and the invoice.
  const rush = form.isRush ? (n(q.rushMultiplier) > 1 ? n(q.rushMultiplier) : defaultRush) : 1;
  // Rush multiplies the RING only — it prices EFD's capacity, and a bought-in stone costs the same
  // whether it's set tomorrow or in three weeks. Material lines may each override the markup.
  // MIRRORS computeQuote — if these drift the preview quotes a price the save won't produce.
  const rushable =
    n(form.mounting.cost) * cogMarkup
    + lineRevenue(form.accentStones, cogMarkup)
    + lineRevenue(form.additionalMaterials, cogMarkup)
    + (laborTotal + shipTotal + castingCost + designTotal + glbFee + qcFee) * cogMarkup;
  const subtotal = (rushable * rush) + (stoneCost * centerstoneMarkup); // pre-tax
  // Once markups vary per line, a single "× 2.5" in the summary is a lie.
  const effectiveMarkup = cog > 0 ? Math.round((subtotal / cog) * 1000) / 1000 : cogMarkup;
  const effTaxRate = form.taxExempt ? 0 : taxRate;
  const taxAmount = subtotal * effTaxRate;
  const total = subtotal + taxAmount; // tax-inclusive grand total the customer is billed

  const summaryLines = [
    ['Materials & gemstones', matTotal], ['Labor', laborTotal], ['Shipping', shipTotal],
    ['Casting', castingCost], ['Designer fee', designTotal], ['GLB fee', glbFee], ['QC review fee', qcFee],
  ].filter(([, v]) => n(v) > 0);

  const persist = useCallback(async (extra = {}) => {
    setBusy(true);
    try {
      const body = {
        centerstone: form.centerstone, mounting: form.mounting,
        // markup: 0 = no override, use the default. Persisted per line so a quote can be explained later.
        accentStones: form.accentStones.map((r) => ({ description: r.description || '', quantity: n(r.quantity) || 1, cost: n(r.cost), markup: n(r.markup) || 0 })),
        additionalMaterials: form.additionalMaterials.map((r) => ({ description: r.description || '', quantity: n(r.quantity) || 1, cost: n(r.cost), markup: n(r.markup) || 0 })),
        laborTasks: form.laborTasks.map((r) => ({ description: r.description || '', quantity: n(r.quantity) || 1, cost: n(r.cost), hours: n(r.hours), discipline: r.discipline || 'bench_jewelry', ...(r.autoKey ? { autoKey: r.autoKey, source: r.source || 'auto' } : {}), ...(r.noWorkOrder ? { noWorkOrder: true } : {}) })),
        shippingCosts: form.shippingCosts.map((r) => ({ description: r.description || '', cost: n(r.cost) })),
        isRush: form.isRush, includeCustomDesign: form.includeCustomDesign, designFee: n(form.designFee),
        cogMarkup: n(form.cogMarkup) || 0, // 0 = revert to the admin-settings default
        centerstoneMarkup: n(form.centerstoneMarkup) || 0, // 0 = settings default, else the COG markup
        taxExempt: !!form.taxExempt,

        // clear legacy flats so they don't double-count
        materialCosts: [], laborCost: 0, shippingCost: 0,
        ...extra,
      };
      const res = await fetch(`/api/custom-orders/${customID}/quote`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Quote save failed');
      const data = await res.json().catch(() => ({}));
      await onChanged?.();
      return { sync: data.workOrdersSync || { updated: Number(data.workOrdersSynced) || 0, spawned: 0, removed: 0 } };
    } catch (e) { notify(e.message, 'error'); return false; } finally { setBusy(false); }
  }, [customID, form, onChanged, notify]);

  const save = async () => {
    const r = await persist();
    if (!r) return;
    const { updated = 0, spawned = 0, removed = 0 } = r.sync || {};
    const parts = [];
    if (updated) parts.push(`${updated} updated`);
    if (spawned) parts.push(`${spawned} added`);
    if (removed) parts.push(`${removed} removed`);
    notify(`Quote saved${parts.length ? ` · work orders: ${parts.join(', ')}` : ''}`, 'success');
  };
  const publish = async () => { if (await persist({ quotePublished: true, publishedAt: new Date().toISOString() })) notify('Quote published to client', 'success'); };
  const unpublish = async () => { if (await persist({ quotePublished: false, publishedAt: null })) notify('Quote unpublished', 'success'); };

  const published = !!q.quotePublished;
  const lineAdd = (key, newRow) => setField(key, [...form[key], newRow]);

  return (
    <Stack spacing={2}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography sx={{ fontWeight: 600, fontSize: '1.2rem', color: REPAIRS_UI.textHeader }}>Quote Builder</Typography>
          {published && <Chip size="small" icon={<VisibilityIcon sx={{ fontSize: 15 }} />} color="success" label="Published to client" />}
          <Chip size="small" label={money(total)} sx={{ bgcolor: REPAIRS_UI.bgTertiary, color: REPAIRS_UI.accent, fontWeight: 700 }} />
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="contained" disabled={busy} onClick={save} sx={goldBtn}>Save</Button>
          {published
            ? <Button size="small" variant="outlined" color="warning" startIcon={<VisibilityIcon />} disabled={busy} onClick={unpublish}>Unpublish</Button>
            : <Button size="small" variant="contained" color="success" startIcon={<PublishIcon />} disabled={busy || total <= 0} onClick={publish}>Publish</Button>}
        </Stack>
      </Stack>

      {/* Phase 1: Materials */}
      <Paper sx={cardSx}>
        <CardHead icon={DiamondIcon} title="Materials" />
        <Grid container spacing={2} sx={{ mb: 1.5 }}>
          <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Centerstone" value={form.centerstone.item} disabled={busy} onChange={(e) => setNested('centerstone', 'item', e.target.value)} /></Grid>
          <Grid item xs={12} sm={3}><TextField fullWidth size="small" label="Cost" type="number" value={form.centerstone.cost} disabled={busy} onChange={(e) => setNested('centerstone', 'cost', e.target.value)} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} /></Grid>
          {/* A significant stone doesn't carry mounting keystone — a natural diamond can't take the
              2.5× the ring around it takes. Blank keeps whatever the default is, so nothing changes
              unless it's set here. */}
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth size="small" label="Stone markup" type="number"
              value={form.centerstoneMarkup} disabled={busy}
              onChange={(e) => setField('centerstoneMarkup', e.target.value)}
              placeholder={String(defaultStoneMarkup > 0 ? defaultStoneMarkup : cogMarkup)}
              helperText={n(form.centerstoneMarkup) > 0
                ? `Stone × ${n(form.centerstoneMarkup)}, rest × ${cogMarkup}`
                : `Default × ${defaultStoneMarkup > 0 ? defaultStoneMarkup : cogMarkup}`}
              InputProps={{ startAdornment: <InputAdornment position="start">×</InputAdornment> }}
            />
          </Grid>
          <Grid item xs={12} sm={8}><TextField fullWidth size="small" label="Mounting" value={form.mounting.item} disabled={busy} onChange={(e) => setNested('mounting', 'item', e.target.value)} /></Grid>
          <Grid item xs={12} sm={4}><TextField fullWidth size="small" label="Cost" type="number" value={form.mounting.cost} disabled={busy} onChange={(e) => setNested('mounting', 'cost', e.target.value)} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} /></Grid>
          <Grid item xs={12}>
            <Stack spacing={1} sx={{ p: 1.25, borderRadius: 1, border: `1px dashed ${stlVolumeCm3 > 0 ? REPAIRS_UI.accent : REPAIRS_UI.border}`, bgcolor: REPAIRS_UI.bgTertiary }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <CalculateIcon sx={{ color: REPAIRS_UI.accent, fontSize: 18 }} />
                <Typography variant="caption" sx={{ color: REPAIRS_UI.textPrimary, fontWeight: 600 }}>Casting quote (from CAD model)</Typography>
              </Stack>
              <Typography variant="caption" sx={{ color: REPAIRS_UI.textSecondary }}>
                {stlVolumeCm3 > 0
                  ? `The uploaded CAD model is ${stlVolumeCm3} cm³. Estimate the metal/casting cost from it — this replaces a vendor casting quote and fills the Mounting cost above.`
                  : 'Upload the STL on the CAD work order, then estimate the metal/casting cost from the model here — it replaces a vendor casting quote and fills the Mounting cost.'}
              </Typography>
              {stlVolumeCm3 > 0 && (
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <TextField select size="small" label="Metal" value={estMetal} onChange={(e) => setEstMetal(e.target.value)} sx={{ minWidth: 180 }}>
                    {METAL_OPTS.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
                  </TextField>
                  <Button size="small" variant="contained" startIcon={<CalculateIcon />} disabled={estimating || busy} onClick={estimateMounting} sx={goldBtn}>
                    Estimate casting → Mounting
                  </Button>
                </Stack>
              )}
            </Stack>
          </Grid>
        </Grid>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary, fontWeight: 600 }}>Accent stones</Typography>
          {<Button size="small" startIcon={<AddIcon />} onClick={() => lineAdd('accentStones', { description: '', quantity: 1, cost: 0 })} sx={{ color: REPAIRS_UI.accent }}>Add stone</Button>}
        </Stack>
        <LineEditor rows={form.accentStones} onChange={(rows) => setField('accentStones', rows)} withQty withMarkup defaultMarkup={cogMarkup} editMode={!busy} emptyText="No accent stones." />
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 2, mb: 1 }}>
          <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary, fontWeight: 600 }}>Additional materials</Typography>
          {<Button size="small" startIcon={<AddIcon />} onClick={() => lineAdd('additionalMaterials', { description: '', quantity: 1, cost: 0 })} sx={{ color: REPAIRS_UI.accent }}>Add material</Button>}
        </Stack>
        <LineEditor rows={form.additionalMaterials} onChange={(rows) => setField('additionalMaterials', rows)} withQty withMarkup defaultMarkup={cogMarkup} editMode={!busy} emptyText="No additional materials." />
      </Paper>

      {/* Phase 2: Labor */}
      <Paper sx={cardSx}>
        <CardHead icon={BuildIcon} title="Labor Tasks" action={<Button size="small" startIcon={<AddIcon />} onClick={() => lineAdd('laborTasks', { description: '', quantity: 1, cost: 0, hours: 0, discipline: 'bench_jewelry' })} sx={{ color: REPAIRS_UI.accent }}>Add task</Button>} />
        <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, display: 'block', mb: 1 }}>Each bench task generates a work order in its lane when the order reaches production (deposit ≥ 50%). <b>Hrs</b> is the labor the bench jeweler is paid for (hours × their rate) — a bench task with 0 hrs spawns a work order with no payout. Cost is what the customer is charged. CAD/QC/GLB lines are added automatically by the design flow.</Typography>
        <LineEditor rows={form.laborTasks} onChange={(rows) => setField('laborTasks', rows)} withQty withDiscipline withHours editMode={!busy} suggest emptyText='No labor tasks. Click "Add task" to add production tasks.' />
      </Paper>

      {/* Phase 3: Additional services */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper sx={cardSx}>
            <CardHead icon={ShippingIcon} title="Shipping" action={<Button size="small" startIcon={<AddIcon />} onClick={() => lineAdd('shippingCosts', { description: '', cost: 0 })} sx={{ color: REPAIRS_UI.accent }}>Add shipping</Button>} />
            <LineEditor rows={form.shippingCosts} onChange={(rows) => setField('shippingCosts', rows)} editMode={!busy} emptyText="No shipping costs." />
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={cardSx}>
            <CardHead icon={TuneIcon} title="Options" />
            <Stack spacing={1}>
              <FormControlLabel control={<Switch checked={form.isRush} disabled={busy} onChange={(e) => setField('isRush', e.target.checked)} />} label={`Rush order (${Math.round((rush > 1 ? rush : 1.5) * 100 - 100)}% surcharge on COG)`} sx={{ color: REPAIRS_UI.textSecondary }} />
              <FormControlLabel control={<Switch checked={form.includeCustomDesign} disabled={busy} onChange={(e) => setField('includeCustomDesign', e.target.checked)} />} label="Custom design fee" sx={{ color: REPAIRS_UI.textSecondary }} />
              <FormControlLabel control={<Switch checked={form.taxExempt} disabled={busy || !taxRate} onChange={(e) => setField('taxExempt', e.target.checked)} />} label={`Tax exempt (no sales tax)${taxRate ? '' : ' — no rate set'}`} sx={{ color: REPAIRS_UI.textSecondary }} />
              {form.includeCustomDesign && (
                <TextField size="small" label="Designer fee" type="number" value={form.designFee} disabled={busy} onChange={(e) => setField('designFee', e.target.value)} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} helperText="Snapshotted from the assigned CAD designer." />
              )}
              <TextField
                size="small" label="COG markup" type="number" value={form.cogMarkup} disabled={busy}
                onChange={(e) => setField('cogMarkup', e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start">×</InputAdornment> }}
                placeholder={String(defaultMarkup)}
                helperText={`Multiplier on COG for this quote. Blank = default (×${defaultMarkup}).`}
              />
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* Two-panel summary */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}><QuoteSummaryCard lines={summaryLines} cog={cog} cogMarkup={cogMarkup} rush={rush} subtotal={subtotal} taxRate={effTaxRate} taxAmount={taxAmount} total={total} effectiveMarkup={effectiveMarkup} /></Grid>
        <Grid item xs={12} md={6}><AnalyticsCard cog={cog} total={subtotal} designerPayout={designTotal} margin={margin} bonus={n(order.clientMgmtBonus)} floorPct={floorPct} workRevenue={rushable * rush} workCog={cogExStone} /></Grid>
      </Grid>
    </Stack>
  );
}
