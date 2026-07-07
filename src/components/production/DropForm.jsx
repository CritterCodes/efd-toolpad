'use client';

/**
 * U-14 — full-page drop form (two-column), replacing `CreateDropDialog`. Create-only: the cover
 * image + member curation live on the drop detail page (U-11 cover/gallery + the add-products
 * drawer), so this form is just the drop metadata. Data model unchanged (a drop is a collection
 * with a release date — POSTs to /api/production/collections).
 *
 * Main: Name / Description / Theme. Sidebar: owner-type, release date.
 */

import React, { useState } from 'react';
import {
  Box, Grid, Card, CardContent, Stack, Typography, TextField, FormControl, InputLabel,
  Select, MenuItem, Button,
} from '@mui/material';
import { REPAIRS_UI, repairsMenuProps } from '@/app/dashboard/repairs/components/repairsUi';

function Section({ title, children }) {
  return (
    <Card sx={{ backgroundColor: REPAIRS_UI.bgCard, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, mb: 3 }}>
      <CardContent>
        <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 2 }}>{title}</Typography>
        {children}
      </CardContent>
    </Card>
  );
}

export default function DropForm({ onSaved, onError }) {
  const [form, setForm] = useState({ name: '', description: '', theme: '', ownerType: 'efd', releaseAt: '' });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!form.name.trim()) { onError?.('Name is required.'); return; }
    setSaving(true);
    try {
      const body = { ...form, releaseAt: form.releaseAt || null };
      const res = await fetch('/api/production/collections', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to create drop');
      onSaved?.(await res.json());
    } catch (e) { onError?.(e.message); } finally { setSaving(false); }
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={8}>
        <Section title="Details">
          <Stack spacing={2}>
            <TextField label="Name" value={form.name} onChange={set('name')} size="small" fullWidth required autoFocus />
            <TextField label="Theme" value={form.theme} onChange={set('theme')} size="small" fullWidth />
            <TextField label="Description" value={form.description} onChange={set('description')} size="small" fullWidth multiline minRows={3} />
            <Typography sx={{ color: REPAIRS_UI.textMuted, fontSize: '0.82rem' }}>
              Create the drop first, then add a cover image + stage products on its detail page.
            </Typography>
          </Stack>
        </Section>
      </Grid>

      <Grid item xs={12} md={4}>
        <Section title="Release">
          <Stack spacing={2}>
            <FormControl size="small" fullWidth>
              <InputLabel>Owner</InputLabel>
              <Select value={form.ownerType} label="Owner" onChange={set('ownerType')} MenuProps={repairsMenuProps}>
                <MenuItem value="efd">EFD (house)</MenuItem>
                <MenuItem value="artisan">Artisan</MenuItem>
              </Select>
            </FormControl>
            <TextField label="Release date" type="datetime-local" value={form.releaseAt} onChange={set('releaseAt')} size="small" fullWidth InputLabelProps={{ shrink: true }} />
            <Typography sx={{ color: REPAIRS_UI.textMuted, fontSize: '0.78rem' }}>
              A drop is a collection with a release date. Schedule / go-live happen on the drop page once members are staged.
            </Typography>
          </Stack>
        </Section>
        <Button onClick={save} disabled={saving} variant="contained" fullWidth sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, '&:hover': { backgroundColor: '#C19B2E' } }}>
          {saving ? 'Saving…' : 'Create drop'}
        </Button>
      </Grid>
    </Grid>
  );
}
