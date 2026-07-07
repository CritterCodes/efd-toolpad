'use client';

/**
 * 0008 C-1 — unified Products catalog. One list over `products` with productType SEGMENT TABS
 * (Jewelry / Gemstones / Concepts) + a status filter bar; rows open the shared M4-T1 editor.
 * ADDITIVE + reversible (0008 Track A / thread #207): this supersedes the redundant two-card launcher
 * that lived here, but the legacy per-type list/editor pages (`products/jewelry`, `…/gemstones`,
 * `…/awaiting-approval`) are UNTOUCHED and still reachable — retiring/redirecting them is the
 * owner-gated C-4. Awaiting-approval folds in as a status filter in C-2.
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Box, Typography, Paper, TextField, InputAdornment, FormControl, InputLabel, Select, MenuItem,
  Stack, Tabs, Tab, Grid, CircularProgress, Snackbar, Alert, Button,
} from '@mui/material';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import SearchIcon from '@mui/icons-material/Search';
import InboxIcon from '@mui/icons-material/Inbox';
import { REPAIRS_UI, repairsMenuProps } from '@/app/dashboard/repairs/components/repairsUi';
import { ProductCard, EditProductDialog, typeOf } from '@/components/production/productsCatalog';

// Segment tabs by productType (0008 IA). 'all' first, then the three types.
const TABS = [
  { key: 'all', label: 'All' },
  { key: 'jewelry', label: 'Jewelry' },
  { key: 'gemstone', label: 'Gemstones' },
  { key: 'concept', label: 'Concepts' },
];
const STATUSES = ['all', 'draft', 'pending-approval', 'published', 'unpublished', 'rejected'];

export default function ProductsCatalogPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  const showSnack = (message, severity = 'success') => setSnack({ open: true, message, severity });
  const closeSnack = () => setSnack((s) => ({ ...s, open: false }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products?limit=200');
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to load products');
      const data = await res.json();
      setProducts(Array.isArray(data.products) ? data.products : []);
    } catch (e) { showSnack(e.message, 'error'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // C-2: approve/reject/publish an artisan-submitted (pending-approval) product from the catalog,
  // reusing the existing POST /api/products/:id/{approve|reject|publish} routes (keyed by _id).
  const onStatusAction = async (product, action) => {
    let body = {};
    if (action === 'reject') {
      // eslint-disable-next-line no-alert
      const reason = typeof window !== 'undefined' ? window.prompt('Reason for rejection?') : null;
      if (reason == null) return; // cancelled
      body = { reason };
    }
    try {
      const res = await fetch(`/api/products/${product._id}/${action}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `${action} failed`);
      showSnack(`${action[0].toUpperCase()}${action.slice(1)}d "${product.title || product.productId}".`);
      load();
    } catch (e) { showSnack(e.message, 'error'); }
  };

  const counts = useMemo(() => {
    const c = { all: products.length, jewelry: 0, gemstone: 0, concept: 0 };
    for (const p of products) { const t = typeOf(p); if (c[t] != null) c[t] += 1; }
    return c;
  }, [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (tab !== 'all' && typeOf(p) !== tab) return false;
      if (status !== 'all' && (p.status || 'draft') !== status) return false;
      if (!q) return true;
      return [p.title, p.name, p.productId].filter(Boolean).join(' ').toLowerCase().includes(q);
    });
  }, [products, tab, status, search]);

  return (
    <Box sx={{ pb: 6 }}>
      <Box sx={{ backgroundColor: { xs: 'transparent', sm: REPAIRS_UI.bgPanel }, border: { xs: 'none', sm: `1px solid ${REPAIRS_UI.border}` }, borderRadius: { xs: 0, sm: 3 }, boxShadow: { xs: 'none', sm: REPAIRS_UI.shadow }, p: { xs: 0.5, sm: 2.5, md: 3 }, mb: 3 }}>
        <Box sx={{ maxWidth: 920 }}>
          <Typography sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, px: 1.25, py: 0.5, mb: 1.5, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', color: REPAIRS_UI.textPrimary, backgroundColor: REPAIRS_UI.bgCard, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, textTransform: 'uppercase' }}>
            <Inventory2Icon sx={{ fontSize: 16, color: REPAIRS_UI.accent }} />
            Catalog
          </Typography>
          <Typography sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 1 }}>Products</Typography>
          <Typography sx={{ color: REPAIRS_UI.textSecondary, lineHeight: 1.6 }}>
            One catalog over every product type. Tabs segment by type; edit price + run size inline. Created by the pipeline
            (list a design as a concept, or a piece as jewelry) and gemstone intake.
          </Typography>
        </Box>
      </Box>

      <Paper sx={{ mb: 2, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
        <Tabs value={tab} onChange={(_e, v) => setTab(v)} variant="scrollable" scrollButtons="auto"
          sx={{ borderBottom: `1px solid ${REPAIRS_UI.border}`, px: 1, '& .MuiTab-root': { color: REPAIRS_UI.textSecondary, textTransform: 'none' }, '& .Mui-selected': { color: `${REPAIRS_UI.accent} !important` }, '& .MuiTabs-indicator': { backgroundColor: REPAIRS_UI.accent } }}>
          {TABS.map((t) => <Tab key={t.key} value={t.key} label={`${t.label} (${counts[t.key] ?? 0})`} />)}
        </Tabs>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} sx={{ p: 2 }}>
          <TextField placeholder="Search by title or productId…" value={search} onChange={(e) => setSearch(e.target.value)} size="small" fullWidth
            InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ color: REPAIRS_UI.textSecondary }} /></InputAdornment>) }} />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Status</InputLabel>
            <Select value={status} label="Status" onChange={(e) => setStatus(e.target.value)} MenuProps={repairsMenuProps}>
              {STATUSES.map((s) => <MenuItem key={s} value={s}>{s === 'all' ? 'All statuses' : s.replace(/-/g, ' ')}</MenuItem>)}
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
            {products.length === 0 ? 'No products yet.' : 'No products match this tab / filters.'}
          </Typography>
          <Button component={Link} href="/dashboard/products/jewelry" size="small" sx={{ mt: 1, color: REPAIRS_UI.accent, textTransform: 'none' }}>
            Open the legacy per-type views
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {filtered.map((p) => (
            <Grid item xs={12} sm={6} md={4} key={p._id || p.productId}>
              <ProductCard product={p} onEdit={setEditing} onStatusAction={onStatusAction} />
            </Grid>
          ))}
        </Grid>
      )}

      <EditProductDialog
        product={editing}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); showSnack('Product updated.'); load(); }}
        onError={(m) => showSnack(m, 'error')}
      />

      <Snackbar open={snack.open} autoHideDuration={5000} onClose={closeSnack} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={closeSnack} severity={snack.severity} sx={{ backgroundColor: REPAIRS_UI.bgCard, color: REPAIRS_UI.textPrimary, border: `1px solid ${REPAIRS_UI.border}` }}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}
