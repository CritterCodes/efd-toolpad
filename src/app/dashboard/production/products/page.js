'use client';

/**
 * M4-T1 — Polymorphic Product editor (pipeline catalog view). One list for all `productType`s
 * (gemstone / concept / jewelry) with run size, pricing, media + readiness at a glance, and an
 * inline edit of the pipeline-owned fields (retail price + run size) via PUT /api/products/:id.
 * Products are CREATED by the pipeline (list-concept / list-product); this edits + surfaces them.
 * Built on the M2 editor archetype (Designs/Pieces/Collections). Status transitions (publish) stay
 * on the existing status routes — surfaced read-only here for now.
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Paper, TextField, InputAdornment,
  FormControl, InputLabel, Select, MenuItem, Stack, CircularProgress, Snackbar, Alert,
} from '@mui/material';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import SearchIcon from '@mui/icons-material/Search';
import InboxIcon from '@mui/icons-material/Inbox';
import DiamondIcon from '@mui/icons-material/AutoAwesome';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import { REPAIRS_UI, repairsMenuProps } from '@/app/dashboard/repairs/components/repairsUi';
import { ProductCard, EditProductDialog, typeOf } from '@/components/production/productsCatalog';

const TYPES = ['all', 'gemstone', 'concept', 'jewelry'];
const STATUSES = ['all', 'draft', 'pending', 'published', 'unpublished', 'rejected'];

function MetricCard({ icon: Icon, label, value, accent }) {
  return (
    <Card sx={{ height: '100%', backgroundColor: REPAIRS_UI.bgCard, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2 }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 2, backgroundColor: REPAIRS_UI.bgTertiary, border: `1px solid ${REPAIRS_UI.border}` }}>
          <Icon sx={{ color: accent || REPAIRS_UI.accent, fontSize: 22 }} />
        </Box>
        <Box>
          <Typography sx={{ fontSize: 24, fontWeight: 700, color: REPAIRS_UI.textHeader, lineHeight: 1.1 }}>{value}</Typography>
          <Typography sx={{ fontSize: '0.74rem', color: REPAIRS_UI.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function ProductionProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState('all');
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

  const metrics = useMemo(() => ({
    total: products.length,
    published: products.filter((p) => p.status === 'published').length,
    concept: products.filter((p) => typeOf(p) === 'concept').length,
  }), [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (type !== 'all' && typeOf(p) !== type) return false;
      if (status !== 'all' && (p.status || 'draft') !== status) return false;
      if (!q) return true;
      return [p.title, p.name, p.productId].filter(Boolean).join(' ').toLowerCase().includes(q);
    });
  }, [products, type, status, search]);

  return (
    <Box sx={{ pb: 6 }}>
      <Box sx={{ backgroundColor: { xs: 'transparent', sm: REPAIRS_UI.bgPanel }, border: { xs: 'none', sm: `1px solid ${REPAIRS_UI.border}` }, borderRadius: { xs: 0, sm: 3 }, boxShadow: { xs: 'none', sm: REPAIRS_UI.shadow }, p: { xs: 0.5, sm: 2.5, md: 3 }, mb: 3 }}>
        <Box sx={{ maxWidth: 920 }}>
          <Typography sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, px: 1.25, py: 0.5, mb: 1.5, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', color: REPAIRS_UI.textPrimary, backgroundColor: REPAIRS_UI.bgCard, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, textTransform: 'uppercase' }}>
            <Inventory2Icon sx={{ fontSize: 16, color: REPAIRS_UI.accent }} />
            Production Catalog
          </Typography>
          <Typography sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 1 }}>Products</Typography>
          <Typography sx={{ color: REPAIRS_UI.textSecondary, lineHeight: 1.6 }}>
            Every listable thing is a Product (gemstone · concept · jewelry). Created by the pipeline (list a design as a
            concept, or a piece as jewelry); edit run size + pricing here, then stage into a Drop.
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={4}><MetricCard icon={Inventory2Icon} label="Total" value={metrics.total} /></Grid>
        <Grid item xs={4}><MetricCard icon={ViewInArIcon} label="Published" value={metrics.published} accent="#66BB6A" /></Grid>
        <Grid item xs={4}><MetricCard icon={DiamondIcon} label="Concepts" value={metrics.concept} accent="#64B5F6" /></Grid>
      </Grid>

      <Paper sx={{ p: 2, mb: 2, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
          <TextField placeholder="Search by title or productId…" value={search} onChange={(e) => setSearch(e.target.value)} size="small" fullWidth
            InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ color: REPAIRS_UI.textSecondary }} /></InputAdornment>) }} />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Type</InputLabel>
            <Select value={type} label="Type" onChange={(e) => setType(e.target.value)} MenuProps={repairsMenuProps}>
              {TYPES.map((t) => <MenuItem key={t} value={t}>{t === 'all' ? 'All types' : t}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Status</InputLabel>
            <Select value={status} label="Status" onChange={(e) => setStatus(e.target.value)} MenuProps={repairsMenuProps}>
              {STATUSES.map((s) => <MenuItem key={s} value={s}>{s === 'all' ? 'All statuses' : s}</MenuItem>)}
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
            {products.length === 0 ? 'No products yet. List a design (concept) or a piece (jewelry) from the pipeline.' : 'No products match your filters.'}
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {filtered.map((p) => (
            <Grid item xs={12} sm={6} md={4} key={p._id || p.productId}>
              <ProductCard product={p} onEdit={setEditing} />
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
