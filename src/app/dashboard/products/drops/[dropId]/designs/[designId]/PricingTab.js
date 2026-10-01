import { Box, Typography, Stack, TextField, MenuItem, InputAdornment, IconButton, Button, Alert, Paper, FormControl, InputLabel, Select } from '@mui/material';
import { REPAIRS_UI, repairsMenuProps } from '@/app/dashboard/repairs/components/repairsUi';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useState, useRef, useEffect } from 'react';
import { autoLaborAsSharedRows, effectiveDesignFee, sumLines } from '@/services/production/variantPricing';
import { isTwoTone, metalFinishes, finishLabel } from '@/services/production/variantMetal';
import { GemVariantPriceCard, PriceLineEditor, TaskAutocomplete, VariantPriceCard } from './pricingCards';
import { DESIGN_FEE_MODES, DISCIPLINE_OPTS, PanelTitle, categoryToDiscipline, money, panelSx } from './designShared';
/** Labor-task editor with catalog-linked descriptions + lane/qty/hours/cost (mirrors the quote). */
export function LaborTaskEditor({ rows, onChange }) {
  const set = (i, k, v) => onChange(rows.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const patch = (i, obj) => onChange(rows.map((r, idx) => (idx === i ? { ...r, ...obj } : r)));
  const remove = (i) => onChange(rows.filter((_, idx) => idx !== i));
  const add = () => onChange([...rows, { description: '', quantity: '1', hours: '', discipline: 'bench_jewelry', cost: '' }]);
  return (
    <Box>
      {rows.length === 0
        ? <Typography variant="body2" sx={{ color: REPAIRS_UI.textMuted, py: 0.5 }}>No labor tasks.</Typography>
        : (
          <Stack spacing={1.25}>
            {rows.map((r, i) => (
              <Stack key={i} direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Box sx={{ flex: 1, minWidth: 180 }}>
                  <TaskAutocomplete
                    value={r.description}
                    onText={(v) => set(i, 'description', v)}
                    onPick={({ description, cost, hours, category }) => patch(i, { description, cost: cost != null ? String(cost) : r.cost, hours: hours != null ? String(hours) : r.hours, ...(category ? { discipline: categoryToDiscipline(category) } : {}) })}
                  />
                </Box>
                <TextField select size="small" label="Lane" value={r.discipline || 'bench_jewelry'} onChange={(e) => set(i, 'discipline', e.target.value)} sx={{ width: 120 }}>
                  {DISCIPLINE_OPTS.map((d) => <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>)}
                </TextField>
                <TextField size="small" label="Qty" type="number" value={r.quantity ?? '1'} onChange={(e) => set(i, 'quantity', e.target.value)} sx={{ width: 64 }} />
                <TextField size="small" label="Hrs" type="number" value={r.hours ?? ''} onChange={(e) => set(i, 'hours', e.target.value)} sx={{ width: 68 }} inputProps={{ step: 0.25, min: 0 }} />
                <TextField size="small" label="Cost" type="number" value={r.cost ?? ''} onChange={(e) => set(i, 'cost', e.target.value)} sx={{ width: 110 }} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
                <IconButton size="small" onClick={() => remove(i)} sx={{ color: REPAIRS_UI.textMuted }}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton>
              </Stack>
            ))}
          </Stack>
        )}
      <Button size="small" startIcon={<AddIcon sx={{ fontSize: 16 }} />} onClick={add} sx={{ color: REPAIRS_UI.accent, mt: 1 }}>Add task</Button>
    </Box>
  );
}

export function PricingTab({ pricing, variants, category, stlVolumeCm3, defaultMarkup, artisanFee, artisanName, editionType, editionLimit, productionMethod, stoneCosts, gemDocs = {}, onChange, onVariantChange }) {
  const isGem = category === 'gemstone';
  const [metalCosts, setMetalCosts] = useState({});
  const [loadingCosts, setLoadingCosts] = useState(false);
  const [taskCosts, setTaskCosts] = useState({}); // { catalog task label: cost } for auto labor
  const hasVolume = Number(stlVolumeCm3) > 0;
  // Gem pricing is carat × rate (no metal/mounting) — skip the live metal-cost fetches entirely.
  const metalsKey = isGem ? '' : [...new Set(variants.map((v) => v.metalKey).filter(Boolean))].sort().join(',');

  /**
   * MATERIALISE auto labor into the shared Labor tasks rows, once, when there are none.
   *
   * The stone count belongs to the DESIGN (one CAD file), so auto labor is the same for every variant
   * and is genuinely shared. Seeding makes it visible and editable instead of an invisible addition to
   * each variant's price.
   *
   * PRICE-NEUTRAL BY CONSTRUCTION: `sumLines` (cost × quantity) over the seeded rows equals
   * `sumLaborLines` over the auto lines, and the variant cards stop adding auto labor as soon as shared
   * labor rows exist (see `hasSharedLabor` below). Without that switch the same labor would be counted
   * twice — once in sharedCosts and again per card.
   *
   * Waits for taskCosts so the rows carry real catalog prices rather than the hardcoded fallbacks.
   */
  const seededLabor = useRef(false);
  useEffect(() => {
    if (seededLabor.current || isGem) return;
    if ((pricing.laborTasks || []).length > 0) return;
    if (!Object.keys(taskCosts).length) return;          // catalog not loaded yet
    const first = variants.find((v) => (v.gemstones || []).length) || variants[0];
    if (!first) return;
    const rows = autoLaborAsSharedRows(first, productionMethod, taskCosts);
    if (!rows.length) return;
    seededLabor.current = true;
    set('laborTasks', rows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGem, pricing.laborTasks, taskCosts, variants, productionMethod]);

  // Once shared labor rows exist they ARE the labor; the cards must not add it again.
  const hasSharedLabor = (pricing.laborTasks || []).length > 0;

  // TWO-TONE GUARD. Mounting cost = the full stl volume × ONE metal (the variant's metalKey, derived
  // from the FIRST metal slot). A variant whose config mixes finishes is therefore priced as if it
  // were entirely the first one. Pricing it correctly needs per-mesh volume, which we don't capture —
  // so warn rather than silently produce a wrong number. See variantMetal.isTwoTone.
  const twoToneVariants = isGem ? [] : variants.filter((v) => isTwoTone(v.viewerConfig));

  // Pull current costs for the auto-labor tasks (casting cleanup + carat-band settings).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const out = {};
      for (const q of ['casting', 'set stone']) {
        try {
          const r = await fetch(`/api/custom-orders/task-suggestions?context=custom&search=${encodeURIComponent(q)}`);
          const d = await r.json().catch(() => []);
          for (const t of (Array.isArray(d) ? d : [])) if (t.label && t.cost != null) out[t.label] = Number(t.cost);
        } catch { /* fall back to defaults */ }
      }
      if (!cancelled) setTaskCosts(out);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!hasVolume || !metalsKey) { setMetalCosts({}); return undefined; }
    let cancelled = false;
    setLoadingCosts(true);
    (async () => {
      const out = {};
      for (const metalKey of metalsKey.split(',')) {
        try {
          const res = await fetch('/api/production/designs/estimate', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stlVolumeCm3: Number(stlVolumeCm3), metalKey }),
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok) out[metalKey] = Number(data.estimate?.metal?.metalCost) || 0;
        } catch { /* ignore per-metal failures */ }
      }
      if (!cancelled) { setMetalCosts(out); setLoadingCosts(false); }
    })();
    return () => { cancelled = true; };
  }, [hasVolume, metalsKey, stlVolumeCm3]);

  const set = (k, v) => onChange({ ...pricing, [k]: v });
  const fee = pricing.designFee || { mode: 'flat', amount: '' };
  const setFee = (patch) => set('designFee', { ...fee, ...patch });
  const isLimited = editionType === 'limited';
  const feeBase = fee.amount !== '' && fee.amount != null ? Number(fee.amount) : (Number(artisanFee) || 0);
  const feeAmt = effectiveDesignFee(fee, artisanFee, editionType, editionLimit);
  const sharedCosts = sumLines(pricing.laborTasks) + sumLines(pricing.shipping) + feeAmt;
  const baseMarkup = Number(pricing.markup) > 0 ? Number(pricing.markup) : defaultMarkup;

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 0, md: 3 }} alignItems="flex-start">
      {/* Shared recipe */}
      <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
        {twoToneVariants.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2, backgroundColor: REPAIRS_UI.bgCard, color: REPAIRS_UI.textPrimary, border: `1px solid ${REPAIRS_UI.border}` }}>
            <strong>Two-tone mounting isn’t priced yet.</strong> {twoToneVariants.length === 1 ? 'One variant mixes' : `${twoToneVariants.length} variants mix`} metal finishes
            ({twoToneVariants.map((v) => metalFinishes(v.viewerConfig).map(finishLabel).join(' + ')).join('; ')}),
            but mounting cost is the full volume × a single metal — the first finish in the config. Treat the
            mounting figure below as an estimate for that one metal and set the price manually.
          </Alert>
        )}
        <Paper sx={panelSx}>
          <PanelTitle>Shared costs</PanelTitle>
          <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, display: 'block', mb: 2 }}>
            These cascade to every variant. Change one and all variant prices update.
          </Typography>
          <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textSecondary, fontSize: '0.8rem', mb: 0.5 }}>Labor tasks</Typography>
          <LaborTaskEditor rows={pricing.laborTasks} onChange={(rows) => set('laborTasks', rows)} />
          <Box sx={{ borderTop: `1px solid ${REPAIRS_UI.border}`, my: 2 }} />
          <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textSecondary, fontSize: '0.8rem', mb: 0.5 }}>Shipping</Typography>
          <PriceLineEditor rows={pricing.shipping} onChange={(rows) => set('shipping', rows)} addLabel="Add shipping" emptyText="No shipping costs." />
          <Box sx={{ borderTop: `1px solid ${REPAIRS_UI.border}`, my: 2 }} />
          <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textSecondary, fontSize: '0.8rem', mb: 0.5 }}>Design fee</Typography>
          <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, display: 'block', mb: 1 }}>
            {artisanName ? `Base fee from ${artisanName}’s profile — blank amount uses it.` : 'Set a primary artisan (Details tab) to pull the base fee.'}
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 1 }}>
            <FormControl size="small" sx={{ flex: 1 }}>
              <InputLabel>Apply as</InputLabel>
              <Select value={fee.mode || 'flat'} label="Apply as" onChange={(e) => setFee({ mode: e.target.value })} MenuProps={repairsMenuProps}>
                {DESIGN_FEE_MODES.filter((m) => m.value !== 'split' || isLimited).map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField size="small" label="Fee amount" type="number" value={fee.amount ?? ''} onChange={(e) => setFee({ amount: e.target.value })}
              placeholder={String(Number(artisanFee) || 0)} disabled={fee.mode === 'waived'}
              InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} sx={{ width: { xs: '100%', sm: 160 } }} />
          </Stack>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 0.5 }}>
            <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>
              {fee.mode === 'waived'
                ? 'Waived — no design fee in the price.'
                : fee.mode === 'split' && isLimited
                  ? `${money(feeBase)} ÷ ${Number(editionLimit) || 1} editions`
                  : 'Flat, per piece'}
            </Typography>
            <Typography sx={{ fontWeight: 600, color: feeAmt > 0 ? REPAIRS_UI.textPrimary : REPAIRS_UI.textMuted }}>{money(feeAmt)}<Typography component="span" variant="caption" sx={{ color: REPAIRS_UI.textMuted }}> / piece</Typography></Typography>
          </Stack>
          <Box sx={{ borderTop: `1px solid ${REPAIRS_UI.border}`, my: 2 }} />
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <TextField size="small" label="COG markup" type="number" value={pricing.markup} onChange={(e) => set('markup', e.target.value)} placeholder={String(defaultMarkup)} InputProps={{ startAdornment: <InputAdornment position="start">×</InputAdornment> }} helperText={`Blank = default (×${defaultMarkup})`} sx={{ width: 200 }} />
            <Box sx={{ textAlign: 'right' }}>
              <Typography sx={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: REPAIRS_UI.textSecondary }}>Shared subtotal</Typography>
              <Typography sx={{ fontWeight: 700, color: REPAIRS_UI.textHeader }}>{money(sharedCosts)}</Typography>
            </Box>
          </Stack>
        </Paper>
      </Box>

      {/* Live per-variant retail */}
      <Box sx={{ width: { xs: '100%', md: 380 }, flexShrink: 0 }}>
        <Paper sx={panelSx}>
          <PanelTitle>Variant retail (live)</PanelTitle>
          {!isGem && !hasVolume && (
            <Typography variant="caption" sx={{ color: '#FFB74D', display: 'block', mb: 1.5 }}>
              Upload an STL on the CAD &amp; 3D tab to price the mounting from metal.
            </Typography>
          )}
          {variants.length === 0 ? (
            <Typography sx={{ color: REPAIRS_UI.textMuted, fontSize: '0.85rem', py: 1 }}>Add variants (on the Variants tab) to price them.</Typography>
          ) : variants.map((v, i) => (
            isGem ? (
              <GemVariantPriceCard
                key={v.variantId || i}
                variant={v}
                sharedCosts={sharedCosts}
                baseMarkup={baseMarkup}
                onChange={(patch) => onVariantChange(i, patch)}
              />
            ) : (
            <VariantPriceCard
              key={v.variantId || i}
              variant={v}
              mounting={metalCosts[v.metalKey] || 0}
              sharedCosts={sharedCosts}
              // Auto labor has been materialised into the shared rows — don't add it a second time.
              hasSharedLabor={hasSharedLabor}
              baseMarkup={baseMarkup}
              hasVolume={hasVolume}
              loading={loadingCosts}
              stoneCosts={stoneCosts}
              gemDocs={gemDocs}
              productionMethod={productionMethod}
              taskCosts={taskCosts}
              onChange={(patch) => onVariantChange(i, patch)}
            />)
          ))}
          <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, display: 'block', mt: 1 }}>
            Retail is calculated live from today’s metal rates — never stored. The storefront recomputes the same way.
          </Typography>
        </Paper>
      </Box>
    </Stack>
  );
}

