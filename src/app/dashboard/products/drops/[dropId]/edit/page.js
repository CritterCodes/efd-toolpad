'use client';

import React, { useEffect, useState, useCallback, useMemo, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Button, Paper, TextField, FormControl, InputLabel, Select, MenuItem,
  Stack, Chip, CircularProgress, Snackbar, Alert, Divider,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import PersonIcon from '@mui/icons-material/Person';

import { REPAIRS_UI, repairsMenuProps } from '@/app/dashboard/repairs/components/repairsUi';

const STATUS_OPTIONS = ['draft', 'scheduled', 'released', 'archived'];

export default function EditDropPage({ params }) {
  const router = useRouter();
  const { dropId } = use(params);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [artisans, setArtisans] = useState([]);
  const [designs, setDesigns] = useState([]);
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'error' });

  const showSnack = (message, severity = 'error') => setSnack({ open: true, message, severity });
  const closeSnack = () => setSnack((s) => ({ ...s, open: false }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/production/drops/${dropId}`);
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Drop not found');
      const drop = await res.json();
      setForm({
        name: drop.name || '',
        slug: drop.slug || '',
        description: drop.description || '',
        channels: Array.isArray(drop.channels) ? drop.channels : ['online'],
        status: drop.status || 'draft',
        releaseAt: drop.releaseAt ? new Date(drop.releaseAt).toISOString().slice(0, 16) : '',
      });
    } catch (e) {
      showSnack(e.message);
    } finally {
      setLoading(false);
    }
  }, [dropId]);

  useEffect(() => {
    load();
    let cancelled = false;
    fetch('/api/users?role=artisan')
      .then((r) => r.json())
      .then((data) => { if (!cancelled) setArtisans(Array.isArray(data) ? data : (data.data || data.users || [])); })
      .catch(() => {});
    fetch(`/api/production/designs?dropID=${dropId}`)
      .then((r) => r.json())
      .then((data) => { if (!cancelled) setDesigns(Array.isArray(data) ? data : []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [load, dropId]);

  const set = (k) => (e) => {
    const v = e.target ? e.target.value : e;
    setForm((f) => ({ ...f, [k]: v }));
  };

  // Artisan credit is DERIVED from the designs in the drop, not chosen here.
  const artisanNameById = useMemo(() => {
    const m = {};
    for (const a of artisans) {
      const id = a.userID || a._id?.toString();
      if (id) m[id] = [a.firstName, a.lastName].filter(Boolean).join(' ') || a.email || id;
    }
    return m;
  }, [artisans]);

  const contributors = useMemo(() => {
    const ids = [...new Set(designs.map((d) => d.primaryArtisanId).filter(Boolean))];
    return ids.map((id) => ({ id, name: artisanNameById[id] || 'Unknown artisan' }));
  }, [designs, artisanNameById]);

  const submit = async () => {
    if (!form.name.trim()) { showSnack('Name is required.'); return; }
    if (!form.slug.trim()) { showSnack('Slug is required.'); return; }
    if (form.status === 'scheduled' && !form.releaseAt) { showSnack('Release date is required when status is scheduled.'); return; }
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description.trim() || '',
        // Admin-created drops are EFD (house); artisan credit is derived from the designs.
        ownerType: 'efd',
        ownerId: null,
        ownerInfo: null,
        channels: form.channels,
        status: form.status,
        releaseAt: form.releaseAt || null,
      };
      const res = await fetch(`/api/production/drops/${dropId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to update drop');
      showSnack('Drop saved.', 'success');
      setTimeout(() => router.push(`/dashboard/products/drops/${dropId}`), 800);
    } catch (e) {
      showSnack(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress sx={{ color: REPAIRS_UI.accent }} /></Box>;
  }

  return (
    <Box sx={{ pb: 6, maxWidth: 900, mx: 'auto' }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.push(`/dashboard/products/drops/${dropId}`)} sx={{ color: REPAIRS_UI.textSecondary }}>
          Drop
        </Button>
        <Typography sx={{ color: REPAIRS_UI.textMuted }}>/</Typography>
        <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 600 }}>Edit Drop</Typography>
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="flex-start">
        <Box sx={{ flex: 1 }}>
          <Paper sx={{ p: 3, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none', mb: 2 }}>
            <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 2 }}>Drop details</Typography>
            <Stack spacing={2}>
              <TextField label="Name" value={form.name} onChange={set('name')} size="small" fullWidth required />
              <TextField
                label="Slug"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                size="small"
                fullWidth
                required
                helperText="URL-safe identifier"
              />
              <TextField label="Description" value={form.description} onChange={set('description')} size="small" fullWidth multiline minRows={3} />
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
            <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 0.5 }}>Ownership &amp; credit</Typography>
            <Typography sx={{ color: REPAIRS_UI.textMuted, fontSize: '0.78rem', mb: 2, lineHeight: 1.5 }}>
              Admin-created drops belong to EFD. Artisan credit is derived automatically from the designs in this drop.
            </Typography>
            <Stack spacing={2}>
              <Box>
                <Typography sx={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: REPAIRS_UI.textSecondary, mb: 0.75 }}>Owner</Typography>
                <Chip
                  label="EFD · House"
                  sx={{ backgroundColor: `${REPAIRS_UI.accent}22`, color: REPAIRS_UI.accent, border: `1px solid ${REPAIRS_UI.accent}55`, fontWeight: 700 }}
                />
              </Box>
              <Box>
                <Typography sx={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: REPAIRS_UI.textSecondary, mb: 0.75 }}>
                  Credited artisans{contributors.length ? ` (${contributors.length})` : ''}
                </Typography>
                {contributors.length === 0 ? (
                  <Typography sx={{ color: REPAIRS_UI.textMuted, fontSize: '0.85rem', lineHeight: 1.5 }}>
                    None yet — each design’s primary artisan is credited here as designs are added.
                  </Typography>
                ) : (
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {contributors.map((c) => (
                      <Chip
                        key={c.id}
                        icon={<PersonIcon sx={{ fontSize: 15 }} />}
                        label={c.name}
                        sx={{ backgroundColor: REPAIRS_UI.bgTertiary, color: REPAIRS_UI.textPrimary, border: `1px solid ${REPAIRS_UI.border}`, '& .MuiChip-icon': { color: REPAIRS_UI.textSecondary } }}
                      />
                    ))}
                  </Stack>
                )}
              </Box>
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
              {saving ? 'Saving…' : 'Save drop'}
            </Button>
            <Button onClick={() => router.push(`/dashboard/products/drops/${dropId}`)} fullWidth sx={{ color: REPAIRS_UI.textSecondary }}>
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
