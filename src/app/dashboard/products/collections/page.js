'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Typography, Button, Paper, TextField, InputAdornment, FormControl, InputLabel,
  Select, MenuItem, Stack, Chip, CircularProgress, Snackbar, Alert, Grid, Card,
  CardContent, CardActionArea, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CollectionsBookmarkIcon from '@mui/icons-material/CollectionsBookmark';
import SearchIcon from '@mui/icons-material/Search';
import InboxIcon from '@mui/icons-material/Inbox';
import TuneIcon from '@mui/icons-material/Tune';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';

import { REPAIRS_UI, repairsMenuProps } from '@/app/dashboard/repairs/components/repairsUi';

const STATUS_OPTIONS = ['all', 'draft', 'published', 'archived'];
const STATUS_COLOR = { draft: REPAIRS_UI.textMuted, published: '#66BB6A', archived: REPAIRS_UI.textMuted };

function RuleSummary({ rules }) {
  if (!rules || Object.keys(rules).length === 0) return <Typography sx={{ color: REPAIRS_UI.textMuted, fontSize: '0.8rem' }}>No rules (manual only)</Typography>;
  const group = rules.all || rules.any;
  const op = rules.all ? 'ALL' : 'ANY';
  if (!Array.isArray(group)) return null;
  return (
    <Box>
      <Typography sx={{ color: REPAIRS_UI.textMuted, fontSize: '0.7rem', mb: 0.5 }}>Matches {op} of:</Typography>
      <Stack spacing={0.25}>
        {group.slice(0, 3).map((rule, i) => (
          <Typography key={i} sx={{ color: REPAIRS_UI.textSecondary, fontSize: '0.78rem' }}>
            {rule.field} {rule.operator} {JSON.stringify(rule.value)}
          </Typography>
        ))}
        {group.length > 3 && <Typography sx={{ color: REPAIRS_UI.textMuted, fontSize: '0.75rem' }}>+{group.length - 3} more…</Typography>}
      </Stack>
    </Box>
  );
}

function CollectionCard({ collection }) {
  const c = collection;
  const includeCount = Array.isArray(c.manualIncludes) ? c.manualIncludes.length : 0;
  const excludeCount = Array.isArray(c.manualExcludes) ? c.manualExcludes.length : 0;
  return (
    <Card sx={{ height: '100%', backgroundColor: REPAIRS_UI.bgCard, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2 }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
          <Chip
            size="small"
            label={c.status || 'draft'}
            sx={{ backgroundColor: `${STATUS_COLOR[c.status] || REPAIRS_UI.textMuted}22`, color: STATUS_COLOR[c.status] || REPAIRS_UI.textMuted, textTransform: 'capitalize', fontWeight: 700, fontSize: '0.72rem' }}
          />
          <TuneIcon sx={{ fontSize: 16, color: REPAIRS_UI.textMuted }} />
        </Stack>
        <Typography sx={{ fontSize: 17, fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 0.75 }}>{c.name || 'Untitled collection'}</Typography>
        {c.description && (
          <Typography sx={{ color: REPAIRS_UI.textSecondary, fontSize: '0.82rem', mb: 1.25, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {c.description}
          </Typography>
        )}
        <RuleSummary rules={c.rules} />
        {(includeCount > 0 || excludeCount > 0) && (
          <Stack direction="row" spacing={2} sx={{ mt: 1.25 }}>
            {includeCount > 0 && (
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: REPAIRS_UI.textMuted, fontSize: '0.78rem' }}>
                <AddCircleOutlineIcon sx={{ fontSize: 14, color: '#66BB6A' }} />{includeCount} manual incl.
              </Box>
            )}
            {excludeCount > 0 && (
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: REPAIRS_UI.textMuted, fontSize: '0.78rem' }}>
                <RemoveCircleOutlineIcon sx={{ fontSize: 14, color: '#F87171' }} />{excludeCount} excl.
              </Box>
            )}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

function RULE_FIELDS() {
  return [
    'productType', 'jewelry.category', 'primaryArtisanId', 'collaborators', 'dropId',
    'edition.type', 'offers', 'customizerEnabled', 'variants.metal', 'variants.karat',
    'variants.finish', 'retailPrice', 'status', 'channels', 'tags', 'metadata',
  ];
}

function CreateCollectionDialog({ open, onClose, onCreated, onError }) {
  const empty = {
    name: '', slug: '', description: '', status: 'draft',
    ruleField: 'edition.type', ruleOperator: 'eq', ruleValue: '',
    manualIncludes: '', manualExcludes: '',
  };
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [slugDirty, setSlugDirty] = useState(false);

  const set = (k) => (e) => {
    const v = e.target ? e.target.value : e;
    setForm((f) => {
      const next = { ...f, [k]: v };
      if (k === 'name' && !slugDirty) next.slug = v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      return next;
    });
  };

  const submit = async () => {
    if (!form.name.trim()) { onError('Name is required.'); return; }
    if (!form.slug.trim()) { onError('Slug is required.'); return; }
    setSaving(true);
    try {
      const rules = form.ruleValue.trim()
        ? { all: [{ field: form.ruleField, operator: form.ruleOperator, value: form.ruleValue.trim() }] }
        : {};
      const manualIncludes = form.manualIncludes.split(',').map((s) => s.trim()).filter(Boolean);
      const manualExcludes = form.manualExcludes.split(',').map((s) => s.trim()).filter(Boolean);
      const body = { name: form.name.trim(), slug: form.slug.trim(), description: form.description.trim(), status: form.status, rules, manualIncludes, manualExcludes };
      const res = await fetch('/api/production/collections', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to create collection');
      const created = await res.json();
      setForm(empty);
      setSlugDirty(false);
      onCreated(created);
    } catch (e) {
      onError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" PaperProps={{ sx: { backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}` } }}>
      <DialogTitle sx={{ color: REPAIRS_UI.textHeader }}>New Smart Collection</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Name" value={form.name} onChange={set('name')} size="small" fullWidth required autoFocus />
          <TextField
            label="Slug"
            value={form.slug}
            onChange={(e) => { setSlugDirty(true); setForm((f) => ({ ...f, slug: e.target.value })); }}
            size="small"
            fullWidth
            required
            helperText="URL-safe identifier"
          />
          <TextField label="Description" value={form.description} onChange={set('description')} size="small" fullWidth multiline minRows={2} />
          <FormControl size="small" fullWidth>
            <InputLabel>Status</InputLabel>
            <Select value={form.status} label="Status" onChange={set('status')} MenuProps={repairsMenuProps}>
              <MenuItem value="draft">Draft</MenuItem>
              <MenuItem value="published">Published</MenuItem>
              <MenuItem value="archived">Archived</MenuItem>
            </Select>
          </FormControl>
          <Typography sx={{ color: REPAIRS_UI.textSecondary, fontSize: '0.82rem', fontWeight: 600 }}>Smart Rule (optional)</Typography>
          <Stack direction="row" spacing={1}>
            <FormControl size="small" sx={{ flex: 2 }}>
              <InputLabel>Field</InputLabel>
              <Select value={form.ruleField} label="Field" onChange={set('ruleField')} MenuProps={repairsMenuProps}>
                {RULE_FIELDS().map((f) => <MenuItem key={f} value={f}>{f}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ flex: 1 }}>
              <InputLabel>Operator</InputLabel>
              <Select value={form.ruleOperator} label="Operator" onChange={set('ruleOperator')} MenuProps={repairsMenuProps}>
                {['eq', 'not_eq', 'in', 'not_in', 'contains', 'not_contains', 'gte', 'lte', 'exists'].map((op) => (
                  <MenuItem key={op} value={op}>{op}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField label="Value" value={form.ruleValue} onChange={set('ruleValue')} size="small" sx={{ flex: 1.5 }} helperText="Leave blank for rule-free" />
          </Stack>
          <TextField label="Manual includes (product IDs, comma-separated)" value={form.manualIncludes} onChange={set('manualIncludes')} size="small" fullWidth helperText="Pinned items always shown" />
          <TextField label="Manual excludes (product IDs, comma-separated)" value={form.manualExcludes} onChange={set('manualExcludes')} size="small" fullWidth helperText="Items always hidden" />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ color: REPAIRS_UI.textSecondary }}>Cancel</Button>
        <Button onClick={submit} disabled={saving} variant="contained" sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, '&:hover': { backgroundColor: '#C19B2E' } }}>
          {saving ? 'Creating…' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function CollectionsPage() {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  const showSnack = (message, severity = 'success') => setSnack({ open: true, message, severity });
  const closeSnack = () => setSnack((s) => ({ ...s, open: false }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/production/collections');
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to load collections');
      setCollections(await res.json());
    } catch (e) {
      showSnack(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return collections.filter((c) => {
      if (status !== 'all' && (c.status || 'draft') !== status) return false;
      if (!q) return true;
      return [c.name, c.slug, c.description].filter(Boolean).join(' ').toLowerCase().includes(q);
    });
  }, [collections, search, status]);

  return (
    <Box sx={{ pb: 6 }}>
      <Box sx={{
        backgroundColor: { xs: 'transparent', sm: REPAIRS_UI.bgPanel },
        border: { xs: 'none', sm: `1px solid ${REPAIRS_UI.border}` },
        borderRadius: { xs: 0, sm: 3 },
        boxShadow: { xs: 'none', sm: REPAIRS_UI.shadow },
        p: { xs: 0.5, sm: 2.5, md: 3 },
        mb: 3,
      }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography sx={{
              display: 'inline-flex', alignItems: 'center', gap: 1,
              px: 1.25, py: 0.5, mb: 1.5, fontSize: '0.72rem', fontWeight: 700,
              letterSpacing: '0.08em', color: REPAIRS_UI.textPrimary,
              backgroundColor: REPAIRS_UI.bgCard, border: `1px solid ${REPAIRS_UI.border}`,
              borderRadius: 2, textTransform: 'uppercase',
            }}>
              <CollectionsBookmarkIcon sx={{ fontSize: 16, color: REPAIRS_UI.accent }} />
              Products
            </Typography>
            <Typography sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 0.5 }}>
              Collections
            </Typography>
            <Typography sx={{ color: REPAIRS_UI.textSecondary, lineHeight: 1.6 }}>
              Smart groupings driven by tags, metadata, product params, and manual overrides. Collections are not Drops.
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpen(true)}
            sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, '&:hover': { backgroundColor: '#C19B2E' } }}
          >
            New Collection
          </Button>
        </Stack>
      </Box>

      <Paper sx={{ p: 2, mb: 2, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
          <TextField
            placeholder="Search by name, slug, description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            fullWidth
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: REPAIRS_UI.textSecondary }} /></InputAdornment> }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Status</InputLabel>
            <Select value={status} label="Status" onChange={(e) => setStatus(e.target.value)} MenuProps={repairsMenuProps}>
              {STATUS_OPTIONS.map((s) => <MenuItem key={s} value={s}>{s === 'all' ? 'All statuses' : s}</MenuItem>)}
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress sx={{ color: REPAIRS_UI.accent }} /></Box>
      ) : filtered.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center', backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px dashed ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
          <InboxIcon sx={{ fontSize: 48, color: REPAIRS_UI.textMuted, mb: 1 }} />
          <Typography sx={{ color: REPAIRS_UI.textSecondary }}>
            {collections.length === 0 ? 'No collections yet. Create one to start grouping products.' : 'No collections match your filters.'}
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {filtered.map((c) => (
            <Grid item xs={12} sm={6} md={4} key={c.collectionId || c.slug}>
              <CollectionCard collection={c} />
            </Grid>
          ))}
        </Grid>
      )}

      <CreateCollectionDialog
        open={open}
        onClose={() => setOpen(false)}
        onCreated={(created) => { setOpen(false); showSnack(`Created "${created.name}".`); load(); }}
        onError={(m) => showSnack(m, 'error')}
      />

      <Snackbar open={snack.open} autoHideDuration={5000} onClose={closeSnack} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={closeSnack} severity={snack.severity} sx={{ backgroundColor: REPAIRS_UI.bgCard, color: REPAIRS_UI.textPrimary, border: `1px solid ${REPAIRS_UI.border}` }}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
