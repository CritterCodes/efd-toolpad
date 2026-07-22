'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Button, Paper, TextField, FormControl, InputLabel, Select, MenuItem,
  Stack, Chip, CircularProgress, Snackbar, Alert, Autocomplete, Divider,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';

import { REPAIRS_UI, repairsMenuProps } from '@/app/dashboard/repairs/components/repairsUi';

const DESIGN_STATUSES = ['draft', 'cad_requested', 'cad_in_progress', 'cad_qc', 'ready', 'retired'];
const PRODUCTION_METHODS = ['cad_cast', 'handmade'];
const EDITION_TYPES = [
  { value: 'one_of_one', label: 'One of One' },
  { value: 'limited', label: 'Limited Release' },
  { value: 'unlimited', label: 'No Limit (unlimited)' },
];
const CATEGORIES = ['ring', 'necklace', 'bracelet', 'earrings', 'pendant', 'brooch', 'other'];

const emptyForm = (dropId) => ({
  name: '',
  description: '',
  category: '',
  tags: [],
  status: 'draft',
  productionMethod: 'cad_cast',
  primaryArtisanId: '',
  edition: { type: 'unlimited', limit: '' },
  dropId: dropId || null,
});

export default function DesignEditor({ dropId, designId, onSave, onCancel }) {
  const isEdit = Boolean(designId);
  const [form, setForm] = useState(emptyForm(dropId));
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [artisans, setArtisans] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'error' });

  const showSnack = (message, severity = 'error') => setSnack({ open: true, message, severity });
  const closeSnack = () => setSnack((s) => ({ ...s, open: false }));

  const loadDesign = useCallback(async () => {
    if (!designId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/production/designs/${designId}`);
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Design not found');
      const d = await res.json();
      setForm({
        name: d.name || '',
        description: d.description || '',
        category: d.category || '',
        tags: Array.isArray(d.tags) ? d.tags : [],
        status: d.status || 'draft',
        productionMethod: d.productionMethod || 'cad_cast',
        primaryArtisanId: d.primaryArtisanId || '',
        edition: { type: d.edition?.type || 'unlimited', limit: d.edition?.limit ?? '' },
        dropId: d.dropId || dropId || null,
      });
    } catch (e) {
      showSnack(e.message);
    } finally {
      setLoading(false);
    }
  }, [designId, dropId]);

  useEffect(() => {
    loadDesign();
    // /api/users returns a {success, data} envelope — unwrap it or the list is always empty.
    fetch('/api/users?role=artisan')
      .then((r) => r.json())
      .then((data) => setArtisans(Array.isArray(data) ? data : (data.data || data.users || [])))
      .catch(() => {});
  }, [loadDesign]);

  const setF = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target ? e.target.value : e }));

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (t && !form.tags.includes(t)) setForm((f) => ({ ...f, tags: [...f.tags, t] }));
    setTagInput('');
  };

  const removeTag = (t) => setForm((f) => ({ ...f, tags: f.tags.filter((x) => x !== t) }));

  const submit = async () => {
    if (!form.name.trim()) { showSnack('Name is required.'); return; }
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        category: form.category || null,
        tags: form.tags,
        status: form.status,
        productionMethod: form.productionMethod,
        primaryArtisanId: form.primaryArtisanId || null,
        edition: {
          type: form.edition.type,
          ...(form.edition.type === 'limited' ? { limit: Number(form.edition.limit) || 1 } : {}),
          allocated: 0, committed: 0, nextNumber: 1,
        },
        dropId: form.dropId || dropId || null,
      };

      let url = '/api/production/designs';
      let method = 'POST';
      if (isEdit && designId) {
        url = `/api/production/designs/${designId}`;
        method = 'PUT';
      }

      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to save design');
      const saved = await res.json();
      showSnack('Design saved.', 'success');
      onSave?.(saved);
    } catch (e) {
      showSnack(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress sx={{ color: REPAIRS_UI.accent }} /></Box>;
  }

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="flex-start">
      <Box sx={{ flex: 1 }}>
        <Paper sx={{ p: 3, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none', mb: 2 }}>
          <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 2 }}>Design details</Typography>
          <Stack spacing={2}>
            <TextField label="Name" value={form.name} onChange={setF('name')} size="small" fullWidth required />
            <TextField label="Description" value={form.description} onChange={setF('description')} size="small" fullWidth multiline minRows={3} />
            <Stack direction="row" spacing={1.5}>
              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel>Category</InputLabel>
                <Select value={form.category} label="Category" onChange={setF('category')} MenuProps={repairsMenuProps}>
                  <MenuItem value="">Unspecified</MenuItem>
                  {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel>Production method</InputLabel>
                <Select value={form.productionMethod} label="Production method" onChange={setF('productionMethod')} MenuProps={repairsMenuProps}>
                  {PRODUCTION_METHODS.map((m) => <MenuItem key={m} value={m}>{m.replace(/_/g, ' ')}</MenuItem>)}
                </Select>
              </FormControl>
            </Stack>
            <Box>
              <Typography sx={{ color: REPAIRS_UI.textSecondary, fontSize: '0.8rem', mb: 0.75 }}>Tags</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                {form.tags.map((t) => (
                  <Chip key={t} label={t} size="small" onDelete={() => removeTag(t)} sx={{ backgroundColor: REPAIRS_UI.bgTertiary, color: REPAIRS_UI.textPrimary, border: `1px solid ${REPAIRS_UI.border}` }} />
                ))}
              </Stack>
              <Stack direction="row" spacing={1}>
                <TextField
                  placeholder="Add tag…"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                  size="small"
                  sx={{ flex: 1 }}
                />
                <Button onClick={addTag} size="small" sx={{ color: REPAIRS_UI.accent }}>Add</Button>
              </Stack>
            </Box>
          </Stack>
        </Paper>
      </Box>

      <Box sx={{ width: { xs: '100%', md: 280 } }}>
        <Paper sx={{ p: 3, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none', mb: 2 }}>
          <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 2 }}>Status</Typography>
          <FormControl size="small" fullWidth>
            <InputLabel>Status</InputLabel>
            <Select value={form.status} label="Status" onChange={setF('status')} MenuProps={repairsMenuProps}>
              {DESIGN_STATUSES.map((s) => <MenuItem key={s} value={s}>{s.replace(/_/g, ' ')}</MenuItem>)}
            </Select>
          </FormControl>
        </Paper>

        <Paper sx={{ p: 3, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none', mb: 2 }}>
          <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 2 }}>Capacity / Edition</Typography>
          <FormControl size="small" fullWidth sx={{ mb: 1.5 }}>
            <InputLabel>Edition type</InputLabel>
            <Select value={form.edition.type} label="Edition type" onChange={(e) => setForm((f) => ({ ...f, edition: { ...f.edition, type: e.target.value } }))} MenuProps={repairsMenuProps}>
              {EDITION_TYPES.map((et) => <MenuItem key={et.value} value={et.value}>{et.label}</MenuItem>)}
            </Select>
          </FormControl>
          {form.edition.type === 'limited' && (
            <TextField
              label="Edition limit"
              type="number"
              value={form.edition.limit}
              onChange={(e) => setForm((f) => ({ ...f, edition: { ...f.edition, limit: e.target.value } }))}
              size="small"
              fullWidth
              required
            />
          )}
          {form.edition.type === 'one_of_one' && (
            <Typography sx={{ color: REPAIRS_UI.textMuted, fontSize: '0.8rem' }}>Only one piece will ever be made.</Typography>
          )}
        </Paper>

        <Paper sx={{ p: 3, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none', mb: 2 }}>
          <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 2 }}>Artisan assignment</Typography>
          <Autocomplete
            size="small"
            options={artisans}
            getOptionLabel={(a) => [a.firstName, a.lastName].filter(Boolean).join(' ') || a.email || a.userID || ''}
            isOptionEqualToValue={(o, v) => (o.userID || o._id?.toString()) === (v.userID || v._id?.toString())}
            value={artisans.find((a) => (a.userID || a._id?.toString()) === form.primaryArtisanId) || null}
            onChange={(_, opt) => setForm((f) => ({ ...f, primaryArtisanId: opt ? (opt.userID || opt._id?.toString() || '') : '' }))}
            renderInput={(params) => <TextField {...params} label="Primary artisan (optional)" />}
          />
          <Typography sx={{ color: REPAIRS_UI.textMuted, fontSize: '0.75rem', mt: 1 }}>
            EFD drops can have multiple artisans assigned per design.
          </Typography>
        </Paper>

        <Divider sx={{ borderColor: REPAIRS_UI.border, mb: 2 }} />
        <Stack spacing={1.5}>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
            disabled={saving}
            onClick={submit}
            fullWidth
            sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, '&:hover': { backgroundColor: '#C19B2E' } }}
          >
            {saving ? 'Saving…' : isEdit ? 'Save design' : 'Create design'}
          </Button>
          <Button onClick={onCancel} fullWidth sx={{ color: REPAIRS_UI.textSecondary }}>
            Cancel
          </Button>
        </Stack>
      </Box>

      <Snackbar open={snack.open} autoHideDuration={6000} onClose={closeSnack} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={closeSnack} severity={snack.severity} sx={{ backgroundColor: REPAIRS_UI.bgCard, color: REPAIRS_UI.textPrimary, border: `1px solid ${REPAIRS_UI.border}` }}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
