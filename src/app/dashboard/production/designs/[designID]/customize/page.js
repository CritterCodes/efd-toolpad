'use client';

/**
 * M3-T2 — Customizer authoring screen (decision 0005 §6). Embeds refrakt 1.10.x
 * `<ConfiguratorSetup>` (appearance authoring: which parts customize + allowed presets +
 * default + per-metal `volumeCm3`), then layers admin's COST BINDINGS on each option
 * (metalKey per finish; gemstoneId per gem) — refrakt authors appearance, admin owns price.
 * Save persists the bound meshMap on `design.viewer.meshMap` (PUT …/customizable); the
 * live-pricing endpoint 422s any customizable option left unbound (0005 §10).
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import {
  Box, Typography, Button, Stack, Chip, Divider, CircularProgress, Snackbar, Alert,
  FormControl, InputLabel, Select, MenuItem, Autocomplete, TextField,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

import { REPAIRS_UI, repairsMenuProps } from '@/app/dashboard/repairs/components/repairsUi';
import { METAL_TYPES } from '@/constants/metalTypes';
import { customizableSlots, annotateBindings, unboundSlots } from '@/services/production/customizableBindings';

// refrakt admin authoring surface — WebGL, never SSR.
const ConfiguratorSetup = dynamic(() => import('@crittercodes/refrakt/ConfiguratorSetup'), { ssr: false });

const METAL_KEYS = Object.keys(METAL_TYPES);
const UNITS = ['cm', 'mm', 'm'];

export default function DesignCustomizePage() {
  const { designID } = useParams();
  const router = useRouter();

  const [design, setDesign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [meshMap, setMeshMap] = useState([]);           // emitted by ConfiguratorSetup (appearance)
  const [bindings, setBindings] = useState({});         // { [nameContains]: { [optionValue]: bindingObj } }
  const [gemstones, setGemstones] = useState([]);
  const [modelUnit, setModelUnit] = useState('cm');     // refrakt #144: default cm, but validate per-asset
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  const showSnack = (message, severity = 'success') => setSnack({ open: true, message, severity });
  const back = useCallback(() => router.push('/dashboard/production/designs'), [router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [dRes, gRes] = await Promise.all([
          fetch(`/api/production/designs/${designID}`),
          fetch('/api/products/gemstones').catch(() => null),
        ]);
        const dData = await dRes.json().catch(() => ({}));
        if (!dRes.ok) throw new Error(dData.error || 'Failed to load design');
        if (cancelled) return;
        const dsn = dData.design || dData;
        setDesign(dsn);
        // Seed bindings from any already-authored meshMap so re-editing keeps them.
        const seeded = {};
        for (const s of customizableSlots(dsn.viewer?.meshMap || [])) {
          const key = s.type === 'gem' ? 'gemPreset' : 'finish';
          for (const o of s.options) if (o.binding) { (seeded[s.nameContains] ||= {})[o[key]] = o.binding; }
        }
        setBindings(seeded);
        // /api/products/gemstones returns { success, gemstones: [...] } — read that shape (bug: was reading g.products → empty picker).
        if (gRes && gRes.ok) { const g = await gRes.json().catch(() => ({})); setGemstones(Array.isArray(g) ? g : (g.gemstones || g.products || [])); }
      } catch (e) { if (!cancelled) setError(e.message); } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [designID]);

  const glbUrl = design?.viewer?.glbUrl || null;
  const slots = useMemo(() => customizableSlots(meshMap), [meshMap]);
  const unbound = useMemo(() => unboundSlots(annotateBindings(meshMap, bindings)), [meshMap, bindings]);
  // Per-metal-slot volume emitted by ConfiguratorSetup (depends on modelUnit) — surfaced so the
  // admin can sanity-check the unit (a wrong unit → 10³–10⁶× off → near-zero metal price; refrakt #151).
  const volBySlot = useMemo(() => Object.fromEntries(
    (meshMap || []).filter((s) => s?.type === 'metal' && typeof s.volumeCm3 === 'number').map((s) => [s.nameContains, s.volumeCm3]),
  ), [meshMap]);
  // Metal slots with NO usable volumeCm3 → the pricing endpoint prices them at $0. Harmless for a
  // single-metal piece (whole-model stlVolume fallback), but with ≥2 metal slots it SILENTLY
  // under-counts that slot's metal (#187/#196). Surface it so the author fixes it before listing.
  const metalSlots = useMemo(() => (meshMap || []).filter((s) => s?.type === 'metal'), [meshMap]);
  const metalMissingVol = useMemo(
    () => metalSlots.filter((s) => !(typeof s.volumeCm3 === 'number' && s.volumeCm3 > 0)).map((s) => s.nameContains || '(unnamed)'),
    [metalSlots],
  );

  const setBinding = (nameContains, optionValue, binding) =>
    setBindings((b) => ({ ...b, [nameContains]: { ...(b[nameContains] || {}), [optionValue]: binding } }));

  const save = async () => {
    setSaving(true);
    try {
      const bound = annotateBindings(meshMap, bindings);
      const res = await fetch(`/api/production/designs/${designID}/customizable`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meshMap: bound, glbUrl }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Save failed');
      const left = data.unboundSlots || [];
      showSnack(left.length ? `Saved — ⚠ ${left.length} slot(s) still need a binding: ${left.join(', ')}` : 'Customizer options saved.', left.length ? 'warning' : 'success');
    } catch (e) { showSnack(e.message, 'error'); } finally { setSaving(false); }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress sx={{ color: REPAIRS_UI.accent }} /></Box>;
  if (error || !glbUrl) {
    return (
      <Box sx={{ p: 4 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={back} sx={{ color: REPAIRS_UI.textSecondary, mb: 2 }}>Back to designs</Button>
        <Typography color="error">{error || 'This design has no GLB yet — upload/export the GLB before authoring the Customizer.'}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 6 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Button startIcon={<ArrowBackIcon />} onClick={back} sx={{ color: REPAIRS_UI.textSecondary, mb: 0.5 }}>Back to designs</Button>
          <Typography sx={{ fontSize: 24, fontWeight: 600, color: REPAIRS_UI.textHeader }}>Customizer options — {design.name || design.designID}</Typography>
        </Box>
        <Stack direction="row" spacing={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>GLB unit</InputLabel>
            <Select value={modelUnit} label="GLB unit" onChange={(e) => setModelUnit(e.target.value)} MenuProps={repairsMenuProps}>
              {UNITS.map((u) => <MenuItem key={u} value={u}>{u}</MenuItem>)}
            </Select>
          </FormControl>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={save} disabled={saving}
            sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, '&:hover': { backgroundColor: '#C19B2E' } }}>
            {saving ? 'Saving…' : 'Save options'}
          </Button>
        </Stack>
      </Stack>

      <Alert severity="warning" sx={{ mb: 2, backgroundColor: '#2A2410', color: '#FFCC80', border: `1px solid ${REPAIRS_UI.border}` }}>
        Set <b>GLB unit</b> to the model’s TRUE unit — a wrong unit throws per-part metal volume (and price) off by
        10³–10⁶× (near-zero metal cost). Verify: a metal slot’s <code>volumeCm3 × SG</code> (18K gold ≈ 15.6, silver ≈ 10.5)
        ≈ the piece’s known metal mass in grams. Volumes are shown per metal slot below. (refrakt #151)
      </Alert>

      {metalMissingVol.length > 0 && (
        <Alert severity="error" sx={{ mb: 2, backgroundColor: '#2A1414', color: '#EF9A9A', border: `1px solid ${REPAIRS_UI.border}` }}>
          <b>{metalMissingVol.length} metal slot(s) have no <code>volumeCm3</code></b> ({metalMissingVol.join(', ')}) — these
          will price at <b>$0</b> metal.{metalSlots.length > 1 ? ' With more than one metal slot the whole-model fallback does NOT apply, so this slot silently UNDER-counts metal cost (#187/#196).' : ' A single-metal piece falls back to the whole-model volume, but a real per-slot volume is safer.'} Check the GLB unit is correct and the slot has renderable geometry so <code>ConfiguratorSetup</code> can emit its volume.
        </Alert>
      )}

      {/* refrakt authoring surface (appearance: which parts customizable + allowed presets + default) */}
      <Box sx={{ border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, overflow: 'hidden', mb: 3 }}>
        <ConfiguratorSetup glbUrl={glbUrl} config={design.viewer || {}} onChange={setMeshMap} modelUnit={modelUnit} />
      </Box>

      {/* admin cost-binding editor (0005 §6): bind each allowed option → a real cost input */}
      <Box sx={{ backgroundColor: REPAIRS_UI.bgPanel, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, p: 2.5 }}>
        <Typography sx={{ fontSize: 16, fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 0.5 }}>Cost bindings</Typography>
        <Typography sx={{ color: REPAIRS_UI.textSecondary, fontSize: '0.85rem', mb: 2 }}>
          Bind each allowed preset to a real cost input — metal → a metal key; stone → a gemstone. Unbound options
          can’t be priced (the storefront rejects them). {unbound.length > 0 && <Chip size="small" icon={<WarningAmberIcon sx={{ fontSize: 15 }} />} label={`${unbound.length} unbound`} sx={{ ml: 1, backgroundColor: '#FFB74D22', color: '#FFB74D' }} />}
        </Typography>
        {slots.length === 0 && <Typography sx={{ color: REPAIRS_UI.textMuted, fontSize: '0.85rem' }}>Turn on customization for a part above to bind its presets.</Typography>}
        <Stack spacing={2} divider={<Divider sx={{ borderColor: REPAIRS_UI.border }} />}>
          {slots.map((s) => {
            const key = s.type === 'gem' ? 'gemPreset' : 'finish';
            return (
              <Box key={s.nameContains}>
                <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textPrimary, mb: 1 }}>
                  {s.label || s.nameContains} <Chip size="small" label={s.type} sx={{ ml: 1, backgroundColor: REPAIRS_UI.bgTertiary, color: REPAIRS_UI.textSecondary }} />
                  {s.type === 'metal' && volBySlot[s.nameContains] != null && (
                    <Chip size="small" label={`vol ${volBySlot[s.nameContains]} cm³`} sx={{ ml: 1, backgroundColor: REPAIRS_UI.bgTertiary, color: REPAIRS_UI.textMuted }} />
                  )}
                </Typography>
                <Stack spacing={1.5}>
                  {s.options.map((o) => {
                    const val = o[key];
                    const cur = bindings[s.nameContains]?.[val];
                    return (
                      <Stack key={val} direction="row" spacing={2} alignItems="center">
                        <Chip size="small" label={val} sx={{ minWidth: 96, backgroundColor: REPAIRS_UI.bgCard, color: REPAIRS_UI.textPrimary, border: `1px solid ${REPAIRS_UI.border}` }} />
                        {s.type === 'metal' ? (
                          <FormControl size="small" sx={{ minWidth: 220 }}>
                            <InputLabel>metalKey</InputLabel>
                            <Select label="metalKey" value={cur?.metalKey || ''} onChange={(e) => setBinding(s.nameContains, val, { metalKey: e.target.value })} MenuProps={repairsMenuProps}>
                              {METAL_KEYS.map((k) => <MenuItem key={k} value={k}>{k}</MenuItem>)}
                            </Select>
                          </FormControl>
                        ) : (
                          <Autocomplete size="small" sx={{ minWidth: 280 }} options={gemstones}
                            getOptionLabel={(g) => `${g.title || g.productId}${g.jewelry?.gemstone?.carat ? ` · ${g.jewelry.gemstone.carat}ct` : ''}`}
                            isOptionEqualToValue={(a, b) => a.productId === b.productId}
                            value={gemstones.find((g) => g.productId === cur?.gemstoneId) || null}
                            onChange={(_, g) => setBinding(s.nameContains, val, g ? { gemstoneId: g.productId } : undefined)}
                            renderInput={(p) => <TextField {...p} label="gemstone" placeholder="Search gemstones…" />} />
                        )}
                        {!cur && <Typography sx={{ color: '#FFB74D', fontSize: '0.78rem' }}>unbound</Typography>}
                      </Stack>
                    );
                  })}
                </Stack>
              </Box>
            );
          })}
        </Stack>
      </Box>

      <Snackbar open={snack.open} autoHideDuration={6000} onClose={() => setSnack((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))} sx={{ backgroundColor: REPAIRS_UI.bgCard, color: REPAIRS_UI.textPrimary, border: `1px solid ${REPAIRS_UI.border}` }}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}
