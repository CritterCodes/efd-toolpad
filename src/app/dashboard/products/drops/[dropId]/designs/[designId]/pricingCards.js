import { Box, Typography, Stack, TextField, InputAdornment, IconButton, Button, Paper, Chip, Autocomplete } from '@mui/material';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { sumStones, autoLaborLines, sumLaborLines } from '@/services/production/variantPricing';
import { finishUsesKarat, finishLabel } from '@/services/production/variantMetal';
import { gemBuildableForRows } from '@/services/production/gemDesignMatch';
import { useState, useEffect } from 'react';
import { gemYield, money, tierRate } from './designShared';
export function PriceLineEditor({ rows, onChange, withQty, addLabel, emptyText }) {
  const set = (i, k, v) => onChange(rows.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const remove = (i) => onChange(rows.filter((_, idx) => idx !== i));
  const add = () => onChange([...rows, withQty ? { description: '', quantity: '1', cost: '' } : { description: '', cost: '' }]);
  return (
    <Box>
      {rows.length === 0
        ? <Typography variant="body2" sx={{ color: REPAIRS_UI.textMuted, py: 0.5 }}>{emptyText}</Typography>
        : (
          <Stack spacing={1}>
            {rows.map((r, i) => (
              <Stack key={i} direction="row" spacing={1} alignItems="center">
                <TextField size="small" label="Description" value={r.description || ''} onChange={(e) => set(i, 'description', e.target.value)} sx={{ flex: 1 }} />
                {withQty && <TextField size="small" label="Qty" type="number" value={r.quantity ?? '1'} onChange={(e) => set(i, 'quantity', e.target.value)} sx={{ width: 72 }} />}
                <TextField size="small" label="Cost" type="number" value={r.cost ?? ''} onChange={(e) => set(i, 'cost', e.target.value)} sx={{ width: 120 }} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
                <IconButton size="small" onClick={() => remove(i)} sx={{ color: REPAIRS_UI.textMuted }}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton>
              </Stack>
            ))}
          </Stack>
        )}
      <Button size="small" startIcon={<AddIcon sx={{ fontSize: 16 }} />} onClick={add} sx={{ color: REPAIRS_UI.accent, mt: 1 }}>{addLabel}</Button>
    </Box>
  );
}

export function VariantPriceCard({ variant, mounting, sharedCosts, hasSharedLabor = false, baseMarkup, hasVolume, loading, stoneCosts, gemDocs = {}, productionMethod, taskCosts, onChange }) {
  const stones = sumStones(variant.gemstones, stoneCosts);
  const stoneCount = (variant.gemstones || []).reduce((n, g) => n + (Number(g.qty) || 1), 0);
  const markup = Number(variant.markupOverride) > 0 ? Number(variant.markupOverride) : baseMarkup;
  // Per-piece labor inferred automatically (casting + carat-band setting × counts).
  const autoLines = autoLaborLines(variant, productionMethod, taskCosts);
  // Once auto labor has been materialised into the SHARED labor rows it arrives via `sharedCosts`;
  // adding it here as well would charge the same setting and cleanup twice.
  const autoLabor = hasSharedLabor ? 0 : sumLaborLines(autoLines);
  const cog = mounting + stones + autoLabor + sharedCosts;
  const retail = cog * markup;
  const label = variant.label?.trim() || variant.sku?.trim() || variant.variantId;
  const metal = [finishUsesKarat(variant.finish) ? `${variant.karat}K` : null, finishLabel(variant.finish)].filter(Boolean).join(' ');
  return (
    <Paper sx={{ p: 2, mb: 1.5, backgroundColor: REPAIRS_UI.bgTertiary, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader, fontSize: '0.9rem' }}>{label}</Typography>
          <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>{metal}</Typography>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Typography sx={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: REPAIRS_UI.textSecondary }}>Live retail</Typography>
          <Typography sx={{ fontWeight: 700, fontSize: '1.35rem', color: REPAIRS_UI.accent, lineHeight: 1.1 }}>{money(retail)}</Typography>
        </Box>
      </Stack>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap>
        <Box sx={{ minWidth: 130 }}>
          <Typography sx={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: REPAIRS_UI.textSecondary }}>Mounting (live)</Typography>
          <Typography sx={{ fontSize: '0.9rem', color: hasVolume ? REPAIRS_UI.textPrimary : '#FFB74D', fontWeight: 500 }}>
            {loading ? '…' : hasVolume ? money(mounting) : 'needs STL'}
          </Typography>
        </Box>
        <Box sx={{ minWidth: 110 }}>
          <Typography sx={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: REPAIRS_UI.textSecondary }}>Stones{stoneCount ? ` (${stoneCount})` : ''}</Typography>
          <Typography sx={{ fontSize: '0.9rem', color: REPAIRS_UI.textPrimary, fontWeight: 500 }}>{money(stones)}</Typography>
        </Box>
        {/* Hidden once labor lives in the shared rows — it's counted under Shared then, and showing a
            second "Labor" column reading $0.00 next to a Shared total that contains it is confusing. */}
        {!hasSharedLabor && (
          <Box sx={{ minWidth: 110 }}>
            <Typography sx={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: REPAIRS_UI.textSecondary }}>Labor (auto)</Typography>
            <Typography sx={{ fontSize: '0.9rem', color: REPAIRS_UI.textPrimary, fontWeight: 500 }}>{money(autoLabor)}</Typography>
          </Box>
        )}
        <Box sx={{ minWidth: 110 }}>
          <Typography sx={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: REPAIRS_UI.textSecondary }}>Shared</Typography>
          <Typography sx={{ fontSize: '0.9rem', color: REPAIRS_UI.textPrimary, fontWeight: 500 }}>{money(sharedCosts)}</Typography>
        </Box>
        <TextField size="small" label="Markup ×" type="number" value={variant.markupOverride} onChange={(e) => onChange({ markupOverride: e.target.value })} placeholder={String(baseMarkup)} sx={{ width: 110 }} helperText={variant.markupOverride ? ' ' : `default ×${baseMarkup}`} FormHelperTextProps={{ sx: { mx: 0, fontSize: '0.6rem' } }} />
      </Stack>
      {autoLines.length > 0 && !hasSharedLabor && (
        <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, mt: 0.75, display: 'block' }}>
          Auto labor: {autoLines.map((l) => `${l.label}${l.qty > 1 ? ` ×${l.qty}` : ''}`).join(' · ')}
        </Typography>
      )}
      <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, mt: 0.5, display: 'block' }}>
        ({money(mounting)} mounting + {money(stones)} stones + {money(autoLabor)} labor + {money(sharedCosts)} shared) × {markup} = {money(retail)}
      </Typography>
      {(() => { const b = gemBuildableForRows(variant.gemstones, gemDocs); return b.cap != null ? (
        <Typography variant="caption" sx={{ color: b.cap > 0 ? '#CE93D8' : '#EF5350', display: 'block', mt: 0.25 }}>
          Gem-capped: {b.cap} buildable — limited by “{b.limiting}”’s edition.
        </Typography>
      ) : null; })()}
    </Paper>
  );
}

/** Gemstone variant retail (cutter's recipe): material (rough $/ct × rough carats via yield) +
 *  cut labor + shared, × markup — like jewelry. The customer picks the carat at order time, so
 *  the card shows each color bucket's retail RANGE across the variant's cuttable carat span. */
export function GemVariantPriceCard({ variant, sharedCosts, baseMarkup, onChange }) {
  const gem = variant.gem || {};
  const setGem = (patch) => onChange({ gem: { ...gem, ...patch } });
  const cutLabor = Number(gem.cutLaborCost) || 0;
  const markup = Number(variant.markupOverride) > 0 ? Number(variant.markupOverride) : baseMarkup;
  const y = gemYield(gem);
  const lo = Number(gem.caratMin) || 0;
  const hi = Number(gem.caratMax) || lo;
  // Strict: null when the color's tiers don't cover the carat (special request / fix the tiers).
  const retailAt = (rates, ct) => {
    const rate = tierRate(rates, ct);
    return rate == null ? null : ((ct / y) * rate + cutLabor + sharedCosts) * markup;
  };
  const label = variant.label?.trim() || variant.sku?.trim() || variant.variantId;
  const colors = (gem.colors || []).filter((c) => String(c.label || '').trim());
  const stone = [gem.species, lo || hi ? `${lo}–${hi}ct` : null, gem.creation === 'lab' ? 'lab' : null, gem.treatment || null].filter(Boolean).join(' · ');
  const ready = colors.length > 0 && hi > 0;
  return (
    <Paper sx={{ p: 2, mb: 1.5, backgroundColor: REPAIRS_UI.bgTertiary, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader, fontSize: '0.9rem' }}>{label}</Typography>
          <Typography variant="caption" sx={{ color: stone ? REPAIRS_UI.textMuted : '#FFB74D' }}>{stone || 'Species not specified (Variants tab)'}</Typography>
        </Box>
        <Chip size="small" label={gem.availability === 'special_request' ? 'special request' : 'buy now'} variant="outlined"
          sx={{ height: 20, color: gem.availability === 'special_request' ? '#FFB74D' : '#66BB6A', borderColor: 'currentColor' }} />
      </Stack>
      {!ready ? (
        <Typography variant="caption" sx={{ color: '#FFB74D', display: 'block', mt: 1 }}>
          Set the carat range and at least one color bucket with rates (Variants tab) to price this.
        </Typography>
      ) : (
        <Stack spacing={0.5} sx={{ mt: 1.25 }}>
          {colors.map((c, i) => {
            const rLo = retailAt(c.rates, lo);
            const rHi = retailAt(c.rates, hi);
            return (
              <Stack key={i} direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" sx={{ color: REPAIRS_UI.textPrimary }}>{c.label}</Typography>
                {rLo == null || rHi == null ? (
                  <Typography variant="caption" sx={{ color: '#EF5350' }}>tiers don&apos;t cover {rLo == null ? `${lo}ct` : `${hi}ct`}</Typography>
                ) : (
                  <Typography variant="body2" sx={{ fontWeight: 700, color: REPAIRS_UI.accent }}>
                    {money(rLo)}{hi > lo ? ` – ${money(rHi)}` : ''}
                  </Typography>
                )}
              </Stack>
            );
          })}
        </Stack>
      )}
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap>
        <TextField size="small" label="Cut labor" type="number" value={gem.cutLaborCost ?? ''} onChange={(e) => setGem({ cutLaborCost: e.target.value })} sx={{ width: 110 }}
          InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
        <Box sx={{ minWidth: 90 }}>
          <Typography sx={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: REPAIRS_UI.textSecondary }}>Shared</Typography>
          <Typography sx={{ fontSize: '0.9rem', color: REPAIRS_UI.textPrimary, fontWeight: 500 }}>{money(sharedCosts)}</Typography>
        </Box>
        <TextField size="small" label="Markup ×" type="number" value={variant.markupOverride} onChange={(e) => onChange({ markupOverride: e.target.value })} placeholder={String(baseMarkup)} sx={{ width: 100 }}
          helperText={variant.markupOverride ? ' ' : `default ×${baseMarkup}`} FormHelperTextProps={{ sx: { mx: 0, fontSize: '0.6rem' } }} />
      </Stack>
      <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, mt: 0.5, display: 'block' }}>
        retail = (carat ÷ {y} yield × rough $/ct + {money(cutLabor)} cut labor + {money(sharedCosts)} shared) × {markup}; customer picks the carat (0.25ct steps, ± cut tolerance).
      </Typography>
    </Paper>
  );
}

/** Task autocomplete sourced from the repair catalog + custom history — same source as
 *  the customs quote builder (/api/custom-orders/task-suggestions). On pick, fills the
 *  cost, hours, and lane. */
export function TaskAutocomplete({ value, onText, onPick }) {
  const [options, setOptions] = useState([]);
  const [input, setInput] = useState(value || '');
  useEffect(() => { setInput(value || ''); }, [value]);
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/custom-orders/task-suggestions?context=custom&search=${encodeURIComponent(input || '')}`);
        if (r.ok && !cancelled) setOptions(await r.json());
      } catch { /* ignore */ }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [input]);
  return (
    <Autocomplete
      freeSolo size="small" options={options} filterOptions={(x) => x}
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
      renderInput={(params) => <TextField {...params} label="Task" placeholder="set stones, polish…" />}
    />
  );
}

/** Stone picker for a variant stone row. Searches the reorderable stone-SKU catalog
 *  (/api/products/stones) for reuse, plus a Stuller SKU lookup that sources the stone
 *  (wholesale cost + specs) into the catalog and links it. */
export function StonePicker({ value, onPick }) {
  const [options, setOptions] = useState([]);
  const [input, setInput] = useState(value || '');
  const [sku, setSku] = useState('');
  const [looking, setLooking] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { setInput(value || ''); }, [value]);
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/products/stones?search=${encodeURIComponent(input || '')}`);
        const d = await r.json().catch(() => ({}));
        if (!cancelled && r.ok) setOptions(d.stones || []);
      } catch { /* ignore */ }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [input]);
  const pick = (s) => onPick({ stoneSkuId: s.stoneSkuId || '', stullerSku: s.stullerSku || '', label: s.label || '', unitCost: s.cost != null ? s.cost : '', caratEach: s.caratEach != null ? s.caratEach : '', source: s.source || 'catalog' });
  const lookup = async () => {
    const n = sku.trim();
    if (!n) return;
    setLooking(true); setErr('');
    try {
      const r = await fetch('/api/products/stones/from-stuller', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ itemNumber: n }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Lookup failed');
      pick(d.stone);
      setSku('');
    } catch (e) { setErr(e.message); } finally { setLooking(false); }
  };
  return (
    <Box>
      <Autocomplete
        freeSolo size="small" options={options} filterOptions={(x) => x}
        value={null} inputValue={input}
        getOptionLabel={(o) => (typeof o === 'string' ? o : o.label || '')}
        onInputChange={(_, v) => setInput(v)}
        onChange={(_, v) => { if (v && typeof v !== 'string') pick(v); }}
        renderOption={(props, o) => (
          <Box component="li" {...props} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
            <span>{o.label}</span>
            <Stack direction="row" spacing={0.75} alignItems="center">
              {o.cost > 0 && <Typography variant="caption" sx={{ color: 'text.secondary' }}>${o.cost}</Typography>}
              {o.stullerSku && <Chip size="small" label="Stuller" variant="outlined" sx={{ height: 18 }} />}
            </Stack>
          </Box>
        )}
        renderInput={(params) => <TextField {...params} label="Stone (catalog)" placeholder="search saved stones…" />}
      />
      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.5 }}>
        <TextField size="small" label="Stuller SKU" value={sku} onChange={(e) => setSku(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); lookup(); } }} sx={{ flex: 1 }} />
        <Button size="small" onClick={lookup} disabled={looking || !sku.trim()} sx={{ color: REPAIRS_UI.accent, textTransform: 'none', whiteSpace: 'nowrap', minWidth: 0 }}>
          {looking ? '…' : 'Look up'}
        </Button>
      </Stack>
      {err && <Typography variant="caption" sx={{ color: '#EF5350', display: 'block' }}>{err}</Typography>}
    </Box>
  );
}

