import { Box, Typography, Stack, TextField, IconButton, InputAdornment, Button, Paper, Chip, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { REPAIRS_UI, repairsMenuProps } from '@/app/dashboard/repairs/components/repairsUi';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { finishUsesKarat, finishLabel, KARAT_OPTIONS } from '@/services/production/variantMetal';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import { speciesSG } from '@/constants/gemSpecies';
import { sumStones } from '@/services/production/variantPricing';
import { useState, useEffect } from 'react';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { CREATION_OPTS, GEM_YIELD_DEFAULT, money, panelSx } from './designShared';
import { VariantStones } from './VariantStones';
/** Color quality-buckets for a gem species, each with size-TIERED **rough** $/ct (what the cutter
 *  pays for rough — retail = (rough cost + labor) × markup, like jewelry). $/ct is not linear in
 *  size, so each bucket is a small tier table: "up to X finished ct → $Y/ct rough". Tiers must
 *  cover caratMax (validated); beyond them = special request. Label buckets with quality baked in
 *  ("chrome red AAA"). */
export function GemColorRates({ colors, onChange }) {
  const setColor = (i, patch) => onChange(colors.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const removeColor = (i) => onChange(colors.filter((_, idx) => idx !== i));
  const addColor = () => onChange([...colors, { label: '', rates: [{ upToCt: '', ratePerCarat: '' }] }]);
  const setTier = (ci, ti, patch) => setColor(ci, { rates: colors[ci].rates.map((t, idx) => (idx === ti ? { ...t, ...patch } : t)) });
  const removeTier = (ci, ti) => setColor(ci, { rates: colors[ci].rates.filter((_, idx) => idx !== ti) });
  const addTier = (ci) => setColor(ci, { rates: [...(colors[ci].rates || []), { upToCt: '', ratePerCarat: '' }] });
  return (
    <Box>
      <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textSecondary, fontSize: '0.72rem', mb: 0.75 }}>Colors &amp; ROUGH rates ($/ct of rough, tiered by finished size — quality in the label)</Typography>
      {colors.length === 0 && (
        <Typography variant="body2" sx={{ color: '#FFB74D', mb: 0.5 }}>Add at least one color bucket — it carries the price.</Typography>
      )}
      <Stack spacing={1}>
        {colors.map((c, ci) => (
          <Box key={ci} sx={{ p: 1, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
              <TextField size="small" label="Color / quality" value={c.label || ''} onChange={(e) => setColor(ci, { label: e.target.value })} sx={{ flex: 1 }} placeholder="chrome red AAA" />
              <IconButton size="small" onClick={() => removeColor(ci)} sx={{ color: REPAIRS_UI.textMuted }}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton>
            </Stack>
            <Stack spacing={0.75}>
              {(c.rates || []).map((t, ti) => (
                <Stack key={ti} direction="row" spacing={1} alignItems="center">
                  <TextField size="small" label="Up to ct" type="number" value={t.upToCt ?? ''} onChange={(e) => setTier(ci, ti, { upToCt: e.target.value })} sx={{ width: 100 }} inputProps={{ step: 0.5, min: 0 }} />
                  <TextField size="small" label="$/ct" type="number" value={t.ratePerCarat ?? ''} onChange={(e) => setTier(ci, ti, { ratePerCarat: e.target.value })} sx={{ width: 110 }}
                    InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
                  <IconButton size="small" onClick={() => removeTier(ci, ti)} sx={{ color: REPAIRS_UI.textMuted }} disabled={(c.rates || []).length <= 1}><DeleteIcon sx={{ fontSize: 14 }} /></IconButton>
                </Stack>
              ))}
              <Button size="small" startIcon={<AddIcon sx={{ fontSize: 14 }} />} onClick={() => addTier(ci)} sx={{ color: REPAIRS_UI.accent, alignSelf: 'flex-start', textTransform: 'none', py: 0 }}>Add size tier</Button>
            </Stack>
          </Box>
        ))}
      </Stack>
      <Button size="small" startIcon={<AddIcon sx={{ fontSize: 16 }} />} onClick={addColor} sx={{ color: REPAIRS_UI.accent, mt: 0.75, textTransform: 'none' }}>Add color</Button>
    </Box>
  );
}

export function VariantRow({ index, variant, isRing, isGem, hasGlb, stoneCosts, gemLinks = [], gemDocs = {}, onUpdate, onRemove, onConfigure }) {
  const set = (k, v) => onUpdate(index, { [k]: v });
  const gem = variant.gem || {};
  const setGem = (patch) => set('gem', { ...gem, ...patch });
  const configured = !!variant.viewerConfig;
  const usesKarat = finishUsesKarat(variant.finish);
  return (
    <Paper sx={{ p: 2, mb: 1.5, backgroundColor: REPAIRS_UI.bgTertiary, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
        <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader, fontSize: '0.9rem' }}>Variant {index + 1}</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            size="small" label={variant.active ? 'Active' : 'Inactive'} onClick={() => set('active', !variant.active)}
            sx={{ cursor: 'pointer', backgroundColor: variant.active ? '#66BB6A22' : REPAIRS_UI.bgCard, color: variant.active ? '#66BB6A' : REPAIRS_UI.textMuted, fontWeight: 700, fontSize: '0.72rem' }}
          />
          <IconButton size="small" onClick={() => onRemove(index)} sx={{ color: REPAIRS_UI.textMuted }}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton>
        </Stack>
      </Stack>
      <Stack spacing={1.5}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField label="SKU" value={variant.sku} onChange={(e) => set('sku', e.target.value)} size="small" fullWidth required error={!variant.sku.trim()} />
          <TextField label="Label (optional)" value={variant.label} onChange={(e) => set('label', e.target.value)} size="small" fullWidth />
        </Stack>
        {/* Look = built in REFRAKT (finish comes from the config); karat is a separate spec. */}
        <Box sx={{ p: 1.5, backgroundColor: REPAIRS_UI.bgCard, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 1.5 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.5} flexWrap="wrap" useFlexGap>
            <Box>
              <Typography sx={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: REPAIRS_UI.textSecondary }}>{isGem ? 'Look (from REFRAKT)' : 'Finish (from REFRAKT)'}</Typography>
              <Typography sx={{ fontWeight: 600, color: configured ? REPAIRS_UI.textHeader : REPAIRS_UI.textMuted }}>
                {configured ? (isGem ? 'Configured' : finishLabel(variant.finish)) : 'Not configured yet'}
              </Typography>
            </Box>
            <Button
              size="small"
              variant={configured ? 'text' : 'contained'}
              startIcon={<ViewInArIcon sx={{ fontSize: 16 }} />}
              onClick={() => onConfigure(index)}
              disabled={!hasGlb}
              sx={configured
                ? { color: REPAIRS_UI.accent, textTransform: 'none' }
                : { backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, textTransform: 'none', '&:hover': { backgroundColor: '#C19B2E' } }}
            >
              {configured ? 'Edit look in REFRAKT' : 'Configure look in REFRAKT'}
            </Button>
          </Stack>
          {!hasGlb && (
            <Typography variant="caption" sx={{ color: '#FFB74D', display: 'block', mt: 0.75 }}>
              Upload a GLB on the CAD &amp; 3D tab first — variant looks are built in REFRAKT.
            </Typography>
          )}
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          {!isGem && (
            <FormControl size="small" sx={{ flex: 1 }} disabled={!usesKarat}>
              <InputLabel>Karat</InputLabel>
              <Select value={usesKarat ? variant.karat : ''} label="Karat" onChange={(e) => set('karat', e.target.value)} MenuProps={repairsMenuProps}>
                {usesKarat
                  ? KARAT_OPTIONS.map((k) => <MenuItem key={k} value={k}>{k}K</MenuItem>)
                  : <MenuItem value="">N/A</MenuItem>}
              </Select>
            </FormControl>
          )}
          <TextField label="Lead time (days)" type="number" value={variant.leadTimeDays} onChange={(e) => set('leadTimeDays', e.target.value)} size="small" sx={{ flex: 1 }} />
        </Stack>
        {isRing && (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField label="Nominal ring size" value={variant.ringSize} onChange={(e) => set('ringSize', e.target.value)} size="small" sx={{ flex: 1 }} required error={!variant.ringSize.trim()} helperText="e.g. 7" />
            <TextField label="Size range min" value={variant.sizingMin} onChange={(e) => set('sizingMin', e.target.value)} size="small" sx={{ flex: 1 }} helperText="resizable low" />
            <TextField label="Size range max" value={variant.sizingMax} onChange={(e) => set('sizingMax', e.target.value)} size="small" sx={{ flex: 1 }} helperText="resizable high" />
          </Stack>
        )}
        {/* Gemstone variant = a SPECIES this cut is offered in (capability, not inventory): buy-vs-
            request toggle, carat range guard, color quality-buckets with size-tiered $/ct. The cut
            itself (shape/technique) is a design detail on the Details tab; dimensions derive from
            the GLB + carat (via species SG), never typed. */}
        {isGem && (
          <Box sx={{ p: 1.5, backgroundColor: REPAIRS_UI.bgCard, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 1.5 }}>
            <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textSecondary, fontSize: '0.8rem', mb: 1 }}>Species offering</Typography>
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                <TextField label="Species" value={gem.species || ''} onChange={(e) => setGem({ species: e.target.value })} size="small" sx={{ flex: 1, minWidth: 150 }} required error={!String(gem.species || '').trim()} placeholder="Garnet, Sapphire…" />
                <FormControl size="small" sx={{ width: 168 }}>
                  <InputLabel>Availability</InputLabel>
                  <Select value={gem.availability || 'purchase'} label="Availability" onChange={(e) => setGem({ availability: e.target.value })} MenuProps={repairsMenuProps}>
                    <MenuItem value="purchase">Purchase (buy now)</MenuItem>
                    <MenuItem value="special_request">Special request</MenuItem>
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ width: 110 }}>
                  <InputLabel>Origin</InputLabel>
                  <Select value={gem.creation || 'natural'} label="Origin" onChange={(e) => setGem({ creation: e.target.value })} MenuProps={repairsMenuProps}>
                    {CREATION_OPTS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                  </Select>
                </FormControl>
              </Stack>
              <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                <TextField label="Carat min" type="number" value={gem.caratMin || ''} onChange={(e) => setGem({ caratMin: e.target.value })} size="small" sx={{ width: 100 }} inputProps={{ step: 0.1, min: 0 }}
                  helperText="cuttable range" FormHelperTextProps={{ sx: { mx: 0, fontSize: '0.6rem' } }} />
                <TextField label="Carat max" type="number" value={gem.caratMax || ''} onChange={(e) => setGem({ caratMax: e.target.value })} size="small" sx={{ width: 100 }} inputProps={{ step: 0.1, min: 0 }}
                  error={Number(gem.caratMax) > 0 && Number(gem.caratMin) > Number(gem.caratMax)} />
                <TextField label="Treatment" value={gem.treatment || ''} onChange={(e) => setGem({ treatment: e.target.value })} size="small" sx={{ flex: 1, minWidth: 120 }} placeholder="unheated…"
                  helperText="different treatment = its own variant; shown on the listing" FormHelperTextProps={{ sx: { mx: 0, fontSize: '0.6rem' } }} />
                <TextField label="Clarity" value={gem.clarity || ''} onChange={(e) => setGem({ clarity: e.target.value })} size="small" sx={{ width: 100 }} />
                <TextField label="Lot qty" type="number" value={gem.lotQty ?? ''} onChange={(e) => setGem({ lotQty: e.target.value })} size="small" sx={{ width: 92 }} inputProps={{ min: 0 }}
                  helperText="special rough only" FormHelperTextProps={{ sx: { mx: 0, fontSize: '0.6rem' } }} />
              </Stack>
              <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                <TextField label="Yield" type="number" value={gem.yield ?? ''} onChange={(e) => setGem({ yield: e.target.value })} size="small" sx={{ width: 100 }}
                  placeholder={String(GEM_YIELD_DEFAULT)} inputProps={{ step: 0.05, min: 0.05, max: 1 }}
                  helperText="finished ÷ rough ct" FormHelperTextProps={{ sx: { mx: 0, fontSize: '0.6rem' } }} />
                <TextField label="Max pieces" type="number" value={gem.maxPieces ?? ''} onChange={(e) => setGem({ maxPieces: e.target.value })} size="small" sx={{ width: 104 }} inputProps={{ min: 1 }}
                  helperText="this variant's slice of the edition" FormHelperTextProps={{ sx: { mx: 0, fontSize: '0.6rem' } }} />
                <TextField label="SG override" type="number" value={gem.sg ?? ''} onChange={(e) => setGem({ sg: e.target.value })} size="small" sx={{ width: 118 }}
                  placeholder={speciesSG(gem.species) != null ? String(speciesSG(gem.species)) : '—'} inputProps={{ step: 0.01, min: 0.5, max: 9 }}
                  helperText="specific gravity — blank uses the species table (carat ⇄ mm)" FormHelperTextProps={{ sx: { mx: 0, fontSize: '0.6rem' } }} />
              </Stack>
              <GemColorRates colors={gem.colors || []} onChange={(colors) => setGem({ colors })} />
            </Stack>
          </Box>
        )}
        {/* Stone rows apply to JEWELRY consuming stones — a gemstone design IS the stone. */}
        {!isGem && <VariantStones gemstones={variant.gemstones} viewerConfig={variant.viewerConfig} stoneCosts={stoneCosts} gemLinks={gemLinks} gemDocs={gemDocs} onChange={(rows) => set('gemstones', rows)} />}
      </Stack>
    </Paper>
  );
}

// Summary card in the variants grid — click to open the variant's full editor.
export function VariantCard({ index, variant, isRing, isGem, stoneCosts, onOpen }) {
  const configured = !!variant.viewerConfig;
  const gemRange = variant.gem?.caratMin || variant.gem?.caratMax
    ? `${variant.gem?.caratMin || '?'}–${variant.gem?.caratMax || '?'}ct` : null;
  const metal = isGem
    ? ([variant.gem?.species, gemRange, variant.gem?.creation === 'lab' ? 'lab' : null, variant.gem?.treatment || null].filter(Boolean).join(' · ') || 'Species not specified')
    : configured
      ? [finishUsesKarat(variant.finish) ? `${variant.karat}K` : null, finishLabel(variant.finish)].filter(Boolean).join(' ')
      : 'Look not configured';
  const stones = sumStones(variant.gemstones, stoneCosts);
  const stoneCount = (variant.gemstones || []).reduce((n, g) => n + (Number(g.qty) || 1), 0);
  const title = variant.label?.trim() || variant.sku?.trim() || `Variant ${index + 1}`;
  return (
    <Paper onClick={onOpen}
      sx={{ p: 2, cursor: 'pointer', backgroundColor: REPAIRS_UI.bgTertiary, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none', transition: 'border-color .15s', '&:hover': { borderColor: REPAIRS_UI.accent } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</Typography>
          {variant.sku?.trim() && variant.label?.trim() && <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>{variant.sku.trim()}</Typography>}
        </Box>
        <Chip size="small" label={variant.active ? 'Active' : 'Inactive'}
          sx={{ flexShrink: 0, backgroundColor: variant.active ? '#66BB6A22' : REPAIRS_UI.bgCard, color: variant.active ? '#66BB6A' : REPAIRS_UI.textMuted, fontWeight: 700, fontSize: '0.68rem' }} />
      </Stack>
      <Stack spacing={0.25} sx={{ mt: 1 }}>
        <Typography variant="caption" sx={{ color: (isGem ? variant.gem?.species : configured) ? REPAIRS_UI.textSecondary : '#FFB74D' }}>{metal}</Typography>
        {isRing && variant.ringSize && <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>Size {variant.ringSize}</Typography>}
        {isGem
          ? <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>
              {[variant.gem?.availability === 'special_request' ? 'special request' : 'buy now',
                Number(variant.gem?.lotQty) > 0 ? `lot of ${variant.gem.lotQty}` : null,
                (variant.gem?.colors || []).length ? `${variant.gem.colors.length} color${variant.gem.colors.length === 1 ? '' : 's'}` : 'no colors/rates'].filter(Boolean).join(' · ')}
            </Typography>
          : <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>{stoneCount ? `${stoneCount} stone${stoneCount === 1 ? '' : 's'} · ${money(stones)}` : 'No stones'}</Typography>}
      </Stack>
    </Paper>
  );
}

export function VariantsTab({ variants, category, hasGlb, stoneCosts, gemLinks = [], gemDocs = {}, onAdd, onUpdate, onRemove, onConfigure }) {
  const isRing = category === 'ring';
  const isGem = category === 'gemstone';
  const [selected, setSelected] = useState(null);
  // Fall back to the grid if the open variant disappears (removed) or index drifts.
  useEffect(() => { if (selected != null && selected >= variants.length) setSelected(null); }, [selected, variants.length]);

  // Detail view — the full editor for one variant, still inside the Variants tab.
  if (selected != null && variants[selected]) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => setSelected(null)} sx={{ color: REPAIRS_UI.textSecondary, mb: 1.5, textTransform: 'none' }}>All variants</Button>
        <VariantRow index={selected} variant={variants[selected]} isRing={isRing} isGem={isGem} hasGlb={hasGlb} stoneCosts={stoneCosts} gemLinks={gemLinks} gemDocs={gemDocs} onUpdate={onUpdate}
          onRemove={(i) => { onRemove(i); setSelected(null); }} onConfigure={onConfigure} />
      </Box>
    );
  }

  // Grid view — one card per variant.
  return (
    <Paper sx={panelSx}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
        <Box>
          <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader }}>Variants</Typography>
          <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>
            Each variant is one sellable configuration, its look built in REFRAKT. A sellable design needs at least one.
          </Typography>
        </Box>
        {/* A gemstone variant is a material spec (species/carat/…) — no GLB required. Jewelry
            variants are looks built in REFRAKT, so those still need the model first. */}
        <Button size="small" variant="contained" startIcon={<AddIcon sx={{ fontSize: 16 }} />} onClick={onAdd} disabled={!hasGlb && !isGem}
          sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, textTransform: 'none', flexShrink: 0, '&:hover': { backgroundColor: '#C19B2E' } }}>
          Add variant
        </Button>
      </Stack>
      {!hasGlb && !isGem && (
        <Typography variant="caption" sx={{ color: '#FFB74D', display: 'block', mb: 2 }}>
          Upload a GLB on the CAD &amp; 3D tab first — variants are built in the REFRAKT studio.
        </Typography>
      )}
      {variants.length === 0 ? (
        <Typography sx={{ color: REPAIRS_UI.textMuted, fontSize: '0.85rem', textAlign: 'center', py: 3 }}>
          {isGem ? 'No variants yet. Each variant is one stone material (species, carat, quality) this cut is offered in.' : 'No variants yet. “Add variant” opens the REFRAKT studio to build the look.'}
        </Typography>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 1.5 }}>
          {variants.map((v, i) => (
            <VariantCard key={v.variantId || i} index={i} variant={v} isRing={isRing} isGem={isGem} stoneCosts={stoneCosts} onOpen={() => setSelected(i)} />
          ))}
        </Box>
      )}
    </Paper>
  );
}

