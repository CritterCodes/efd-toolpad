'use client';

import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Paper, TextField, FormControl, InputLabel, Select, MenuItem,
  Stack, Chip, CircularProgress, Snackbar, Alert, Autocomplete,
} from '@mui/material';
import DiamondIcon from '@mui/icons-material/Diamond';
import DesignServicesIcon from '@mui/icons-material/DesignServices';
import CheckIcon from '@mui/icons-material/Check';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { REPAIRS_UI, repairsMenuProps } from '@/app/dashboard/repairs/components/repairsUi';

const CATEGORIES = ['ring', 'necklace', 'bracelet', 'earrings', 'pendant', 'brooch', 'other'];
const EDITION_TYPES = [
  { value: 'one_of_one', label: 'One of One' },
  { value: 'limited', label: 'Limited Release' },
  { value: 'unlimited', label: 'No Limit (unlimited)' },
];
const STEPS = ['Type', 'Model', 'Details'];

const cardSx = (selected) => ({
  flex: 1, p: 2.5, cursor: 'pointer', textAlign: 'center', borderRadius: 2,
  backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none',
  border: `1px solid ${selected ? REPAIRS_UI.accent : REPAIRS_UI.border}`,
  boxShadow: selected ? `0 0 0 1px ${REPAIRS_UI.accent}` : 'none',
  '&:hover': { borderColor: REPAIRS_UI.accent },
});
const panelSx = { p: 3, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' };

/**
 * Guided create flow for ANY design — jewelry or gemstone. A gemstone is just a Design
 * (category:'gemstone'); this only branches the question set. The rich spec (variants/metal for
 * jewelry, carat/cut/color for gems, GLB, pricing) is authored on the design detail page after.
 */
export default function DesignCreateStepper({ dropId, onSave, onCancel }) {
  const [step, setStep] = useState(0);
  const [designType, setDesignType] = useState(''); // 'jewelry' | 'gemstone'
  const [hasModel, setHasModel] = useState(null);    // true | false
  const [artisans, setArtisans] = useState([]);
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'error' });
  const [f, setF] = useState({ name: '', species: '', category: '', editionType: 'unlimited', editionLimit: '', primaryArtisanId: '', tags: [], status: 'draft' });
  const [tagInput, setTagInput] = useState('');
  const set = (patch) => setF((x) => ({ ...x, ...patch }));
  const showSnack = (message, severity = 'error') => setSnack({ open: true, message, severity });

  useEffect(() => {
    fetch('/api/users?role=artisan').then((r) => r.json()).then((d) => setArtisans(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const isGem = designType === 'gemstone';
  const addTag = () => { const t = tagInput.trim().toLowerCase().replace(/\s+/g, '-'); if (t && !f.tags.includes(t)) set({ tags: [...f.tags, t] }); setTagInput(''); };

  const create = async () => {
    if (isGem && !f.species.trim()) { showSnack('Species is required for a gemstone.'); return; }
    if (!isGem && !f.name.trim()) { showSnack('Name is required.'); return; }
    setSaving(true);
    try {
      const body = {
        name: (f.name.trim() || (isGem ? f.species.trim() : '')),
        category: isGem ? 'gemstone' : (f.category || null),
        tags: f.tags,
        status: f.status,
        // Jewelry with a model casts from CAD; everything else is handmade (a gem is hand-cut).
        productionMethod: !isGem && hasModel ? 'cad_cast' : 'handmade',
        primaryArtisanId: f.primaryArtisanId || null,
        edition: { type: f.editionType, ...(f.editionType === 'limited' ? { limit: Number(f.editionLimit) || 1 } : {}), allocated: 0, committed: 0, nextNumber: 1 },
        dropId: dropId || null,
        metadata: { hasModel: Boolean(hasModel) },
        ...(isGem ? { gemstone: { species: f.species.trim() } } : {}),
      };
      const res = await fetch('/api/production/designs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to create design');
      onSave?.(await res.json());
    } catch (e) { showSnack(e.message); } finally { setSaving(false); }
  };

  const canNext = step === 0 ? Boolean(designType) : step === 1 ? hasModel !== null : true;

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      {/* step rail */}
      <Stack direction="row" spacing={1} sx={{ mb: 3 }} justifyContent="center">
        {STEPS.map((label, i) => (
          <Stack key={label} direction="row" alignItems="center" spacing={0.75}>
            <Box sx={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
              bgcolor: i < step ? REPAIRS_UI.accent : 'transparent', color: i <= step ? (i < step ? '#1a1205' : REPAIRS_UI.accent) : REPAIRS_UI.textMuted,
              border: `1px solid ${i <= step ? REPAIRS_UI.accent : REPAIRS_UI.border}` }}>
              {i < step ? <CheckIcon sx={{ fontSize: 14 }} /> : i + 1}
            </Box>
            <Typography variant="caption" sx={{ color: i <= step ? REPAIRS_UI.textHeader : REPAIRS_UI.textMuted }}>{label}</Typography>
            {i < STEPS.length - 1 && <Box sx={{ width: 24, height: 1, bgcolor: REPAIRS_UI.border, mx: 0.5 }} />}
          </Stack>
        ))}
      </Stack>

      {step === 0 && (
        <Box>
          <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 600, mb: 2, textAlign: 'center' }}>What are you designing?</Typography>
          <Stack direction="row" spacing={2}>
            <Paper sx={cardSx(designType === 'jewelry')} onClick={() => setDesignType('jewelry')}>
              <DesignServicesIcon sx={{ fontSize: 32, color: REPAIRS_UI.accent, mb: 1 }} />
              <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 600 }}>Jewelry</Typography>
              <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>Ring, pendant, earrings…</Typography>
            </Paper>
            <Paper sx={cardSx(designType === 'gemstone')} onClick={() => setDesignType('gemstone')}>
              <DiamondIcon sx={{ fontSize: 32, color: REPAIRS_UI.accent, mb: 1 }} />
              <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 600 }}>Gemstone</Typography>
              <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>A cut stone as a product</Typography>
            </Paper>
          </Stack>
        </Box>
      )}

      {step === 1 && (
        <Box>
          <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 600, mb: 0.5, textAlign: 'center' }}>Do you have a 3D model / CAD?</Typography>
          <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, display: 'block', textAlign: 'center', mb: 2 }}>
            {isGem ? 'A GLB of the cut stone for the viewer — you can add it after.' : 'A CAD/STL to cast from, or a GLB for the viewer.'}
          </Typography>
          <Stack direction="row" spacing={2}>
            <Paper sx={cardSx(hasModel === true)} onClick={() => setHasModel(true)}>
              <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 600 }}>Yes</Typography>
              <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>{isGem ? 'I have a GLB' : 'CAD/STL or GLB ready'}</Typography>
            </Paper>
            <Paper sx={cardSx(hasModel === false)} onClick={() => setHasModel(false)}>
              <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 600 }}>No / not yet</Typography>
              <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>{isGem ? 'Hand-cut, no model' : 'Handmade / add later'}</Typography>
            </Paper>
          </Stack>
        </Box>
      )}

      {step === 2 && (
        <Paper sx={panelSx}>
          <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 600, mb: 2 }}>{isGem ? 'Gemstone basics' : 'Design basics'}</Typography>
          <Stack spacing={2}>
            {isGem && (
              <TextField label="Species" value={f.species} onChange={(e) => set({ species: e.target.value })} size="small" fullWidth required placeholder="Amethyst, Sapphire…" helperText="Full gem spec (carat, cut, color…) comes next, on the design page." />
            )}
            <TextField label={isGem ? 'Name (optional)' : 'Name'} value={f.name} onChange={(e) => set({ name: e.target.value })} size="small" fullWidth required={!isGem} placeholder={isGem ? 'defaults to species' : ''} />
            <Stack direction="row" spacing={1.5}>
              {!isGem && (
                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel>Category</InputLabel>
                  <Select value={f.category} label="Category" onChange={(e) => set({ category: e.target.value })} MenuProps={repairsMenuProps}>
                    <MenuItem value="">Unspecified</MenuItem>
                    {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                  </Select>
                </FormControl>
              )}
              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel>Edition</InputLabel>
                <Select value={f.editionType} label="Edition" onChange={(e) => set({ editionType: e.target.value })} MenuProps={repairsMenuProps}>
                  {EDITION_TYPES.map((et) => <MenuItem key={et.value} value={et.value}>{et.label}</MenuItem>)}
                </Select>
              </FormControl>
              {f.editionType === 'limited' && (
                <TextField label="Limit" type="number" value={f.editionLimit} onChange={(e) => set({ editionLimit: e.target.value })} size="small" sx={{ width: 90 }} inputProps={{ min: 1 }} />
              )}
            </Stack>
            <Autocomplete
              size="small" options={artisans}
              getOptionLabel={(a) => [a.firstName, a.lastName].filter(Boolean).join(' ') || a.email || a.userID || ''}
              isOptionEqualToValue={(o, v) => (o.userID || o._id?.toString()) === (v.userID || v._id?.toString())}
              value={artisans.find((a) => (a.userID || a._id?.toString()) === f.primaryArtisanId) || null}
              onChange={(_, opt) => set({ primaryArtisanId: opt ? (opt.userID || opt._id?.toString() || '') : '' })}
              renderInput={(params) => <TextField {...params} label="Primary artisan (optional)" />}
            />
            <Box>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                {f.tags.map((t) => <Chip key={t} label={t} size="small" onDelete={() => set({ tags: f.tags.filter((x) => x !== t) })} sx={{ backgroundColor: REPAIRS_UI.bgTertiary, color: REPAIRS_UI.textPrimary, border: `1px solid ${REPAIRS_UI.border}` }} />)}
              </Stack>
              <Stack direction="row" spacing={1}>
                <TextField placeholder="Add tag…" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} size="small" sx={{ flex: 1 }} />
                <Button onClick={addTag} size="small" sx={{ color: REPAIRS_UI.accent }}>Add</Button>
              </Stack>
            </Box>
          </Stack>
        </Paper>
      )}

      {/* nav */}
      <Stack direction="row" justifyContent="space-between" sx={{ mt: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => (step === 0 ? onCancel?.() : setStep((s) => s - 1))} sx={{ color: REPAIRS_UI.textSecondary }}>
          {step === 0 ? 'Cancel' : 'Back'}
        </Button>
        {step < 2 ? (
          <Button variant="contained" disabled={!canNext} onClick={() => setStep((s) => s + 1)} sx={{ bgcolor: REPAIRS_UI.accent, color: '#1a1205', fontWeight: 600, '&:hover': { bgcolor: '#C19B2E' } }}>Next</Button>
        ) : (
          <Button variant="contained" disabled={saving} onClick={create} startIcon={saving ? <CircularProgress size={16} /> : null} sx={{ bgcolor: REPAIRS_UI.accent, color: '#1a1205', fontWeight: 600, '&:hover': { bgcolor: '#C19B2E' } }}>
            {saving ? 'Creating…' : `Create ${isGem ? 'gemstone' : 'design'}`}
          </Button>
        )}
      </Stack>

      <Snackbar open={snack.open} autoHideDuration={6000} onClose={() => setSnack((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnack((s) => ({ ...s, open: false }))} severity={snack.severity} sx={{ backgroundColor: REPAIRS_UI.bgCard, color: REPAIRS_UI.textPrimary, border: `1px solid ${REPAIRS_UI.border}` }}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}
