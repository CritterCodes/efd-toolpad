'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Button, Paper, TextField, FormControl, InputLabel, Select, MenuItem,
  Stack, Chip, CircularProgress, Snackbar, Alert, Autocomplete, Divider,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';

import { REPAIRS_UI, repairsMenuProps } from '@/app/dashboard/repairs/components/repairsUi';

const CHANNEL_OPTIONS = ['online', 'showcase', 'show', 'wholesale'];
const STATUS_OPTIONS = ['draft', 'scheduled', 'released', 'archived'];

function toSlug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export default function NewDropPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '', slug: '', description: '', ownerType: 'efd', ownerId: '',
    channels: ['online'], status: 'draft', releaseAt: '',
  });
  const [slugDirty, setSlugDirty] = useState(false);
  const [artisans, setArtisans] = useState([]);
  const [artisansLoading, setArtisansLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'error' });

  const showSnack = (message, severity = 'error') => setSnack({ open: true, message, severity });
  const closeSnack = () => setSnack((s) => ({ ...s, open: false }));

  useEffect(() => {
    let cancelled = false;
    setArtisansLoading(true);
    fetch('/api/users?role=artisan')
      .then((r) => r.json())
      .then((data) => { if (!cancelled) setArtisans(Array.isArray(data) ? data : []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setArtisansLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const set = (k) => (e) => {
    const v = e.target ? e.target.value : e;
    setForm((f) => {
      const next = { ...f, [k]: v };
      if (k === 'name' && !slugDirty) next.slug = toSlug(v);
      return next;
    });
  };

  const handleSlugChange = (e) => {
    setSlugDirty(true);
    setForm((f) => ({ ...f, slug: e.target.value }));
  };

  const toggleChannel = (ch) => {
    setForm((f) => ({
      ...f,
      channels: f.channels.includes(ch) ? f.channels.filter((c) => c !== ch) : [...f.channels, ch],
    }));
  };

  const submit = async () => {
    if (!form.name.trim()) { showSnack('Name is required.'); return; }
    if (!form.slug.trim()) { showSnack('Slug is required.'); return; }
    if (form.ownerType === 'artisan' && !form.ownerId) { showSnack('Select an artisan owner.'); return; }
    if (form.status === 'scheduled' && !form.releaseAt) { showSnack('Release date is required when status is scheduled.'); return; }
    setSaving(true);
    try {
      const selectedArtisan = artisans.find((a) => (a.userID || a._id?.toString()) === form.ownerId);
      const body = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description.trim() || '',
        ownerType: form.ownerType,
        ownerId: form.ownerType === 'artisan' ? form.ownerId : null,
        ownerInfo: selectedArtisan ? { name: [selectedArtisan.firstName, selectedArtisan.lastName].filter(Boolean).join(' '), email: selectedArtisan.email } : null,
        channels: form.channels,
        status: form.status,
        releaseAt: form.releaseAt || null,
      };
      const res = await fetch('/api/production/drops', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to create drop');
      const created = await res.json();
      router.push(`/dashboard/products/drops/${created.dropId}`);
    } catch (e) {
      showSnack(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ pb: 6, maxWidth: 900, mx: 'auto' }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/dashboard/products/drops')} sx={{ color: REPAIRS_UI.textSecondary }}>
          Drops
        </Button>
        <Typography sx={{ color: REPAIRS_UI.textMuted }}>/</Typography>
        <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 600 }}>New Drop</Typography>
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="flex-start">
        <Box sx={{ flex: 1 }}>
          <Paper sx={{ p: 3, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none', mb: 2 }}>
            <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 2 }}>Drop details</Typography>
            <Stack spacing={2}>
              <TextField
                label="Name"
                value={form.name}
                onChange={set('name')}
                size="small"
                fullWidth
                required
                autoFocus
                InputProps={{ sx: { color: REPAIRS_UI.textPrimary } }}
              />
              <TextField
                label="Slug"
                value={form.slug}
                onChange={handleSlugChange}
                size="small"
                fullWidth
                required
                helperText="URL-safe identifier (auto-generated from name)"
                InputProps={{ sx: { color: REPAIRS_UI.textPrimary } }}
              />
              <TextField
                label="Description"
                value={form.description}
                onChange={set('description')}
                size="small"
                fullWidth
                multiline
                minRows={3}
                InputProps={{ sx: { color: REPAIRS_UI.textPrimary } }}
              />
            </Stack>
          </Paper>

          <Paper sx={{ p: 3, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none', mb: 2 }}>
            <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 2 }}>Channels</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {CHANNEL_OPTIONS.map((ch) => (
                <Chip
                  key={ch}
                  label={ch}
                  onClick={() => toggleChannel(ch)}
                  sx={{
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    backgroundColor: form.channels.includes(ch) ? `${REPAIRS_UI.accent}33` : REPAIRS_UI.bgTertiary,
                    color: form.channels.includes(ch) ? REPAIRS_UI.accent : REPAIRS_UI.textSecondary,
                    border: `1px solid ${form.channels.includes(ch) ? REPAIRS_UI.accent : REPAIRS_UI.border}`,
                    fontWeight: form.channels.includes(ch) ? 700 : 400,
                  }}
                />
              ))}
            </Stack>
          </Paper>
        </Box>

        <Box sx={{ width: { xs: '100%', md: 280 } }}>
          <Paper sx={{ p: 3, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none', mb: 2 }}>
            <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 2 }}>Status</Typography>
            <FormControl size="small" fullWidth>
              <InputLabel>Status</InputLabel>
              <Select value={form.status} label="Status" onChange={set('status')} MenuProps={repairsMenuProps}>
                {STATUS_OPTIONS.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </Select>
            </FormControl>
            {form.status === 'scheduled' && (
              <TextField
                label="Release date"
                type="datetime-local"
                value={form.releaseAt}
                onChange={set('releaseAt')}
                size="small"
                fullWidth
                sx={{ mt: 2 }}
                InputLabelProps={{ shrink: true }}
              />
            )}
          </Paper>

          <Paper sx={{ p: 3, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none', mb: 2 }}>
            <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 2 }}>Ownership</Typography>
            <Stack spacing={2}>
              <FormControl size="small" fullWidth>
                <InputLabel>Owner type</InputLabel>
                <Select value={form.ownerType} label="Owner type" onChange={set('ownerType')} MenuProps={repairsMenuProps}>
                  <MenuItem value="efd">EFD (house)</MenuItem>
                  <MenuItem value="artisan">Artisan</MenuItem>
                </Select>
              </FormControl>
              {form.ownerType === 'artisan' && (
                <Autocomplete
                  size="small"
                  options={artisans}
                  loading={artisansLoading}
                  getOptionLabel={(a) => [a.firstName, a.lastName].filter(Boolean).join(' ') || a.email || a.userID || ''}
                  isOptionEqualToValue={(o, v) => (o.userID || o._id?.toString()) === (v.userID || v._id?.toString())}
                  value={artisans.find((a) => (a.userID || a._id?.toString()) === form.ownerId) || null}
                  onChange={(_, opt) => setForm((f) => ({ ...f, ownerId: opt ? (opt.userID || opt._id?.toString() || '') : '' }))}
                  renderInput={(params) => <TextField {...params} label="Artisan" required />}
                />
              )}
            </Stack>
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
              {saving ? 'Creating…' : 'Create drop'}
            </Button>
            <Button onClick={() => router.push('/dashboard/products/drops')} fullWidth sx={{ color: REPAIRS_UI.textSecondary }}>
              Cancel
            </Button>
          </Stack>
        </Box>
      </Stack>

      <Snackbar open={snack.open} autoHideDuration={6000} onClose={closeSnack} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={closeSnack} severity={snack.severity} sx={{ backgroundColor: REPAIRS_UI.bgCard, color: REPAIRS_UI.textPrimary, border: `1px solid ${REPAIRS_UI.border}` }}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
