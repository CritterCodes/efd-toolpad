'use client';

import React, { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Box, Typography, Button, Grid, Paper, TextField,
  InputAdornment, FormControl, InputLabel, Select, MenuItem, Stack, Chip, CircularProgress,
  Snackbar, Alert, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, IconButton, Tooltip, Slide, ToggleButton, ToggleButtonGroup, Fab, Menu,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DiamondIcon from '@mui/icons-material/Diamond';
import SearchIcon from '@mui/icons-material/Search';
import GridViewIcon from '@mui/icons-material/GridView';
import TableRowsIcon from '@mui/icons-material/TableRows';
import CloseIcon from '@mui/icons-material/Close';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import InventoryIcon from '@mui/icons-material/Inventory';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DraftsIcon from '@mui/icons-material/Drafts';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PublishIcon from '@mui/icons-material/Publish';
import ArchiveIcon from '@mui/icons-material/Archive';
import PersonIcon from '@mui/icons-material/Person';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

import { REPAIRS_UI, repairsMenuProps } from '@/app/dashboard/repairs/components/repairsUi';
import { filterCatalog, catalogStats } from '@/services/products/catalogFilter';
import { MetricCard, ProductCard, ProductTableRow, SORT_OPTIONS, STATUS_OPTIONS, SkeletonCard, TYPE_CHIPS, getStatusLabel } from './catalogParts';
import { catalogActions } from './catalogActions';

function CatalogInner() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const isAdmin = ['admin', 'staff', 'dev', 'superadmin'].includes(session?.user?.role);

  const [products, setProducts] = useState([]);
  const [artisans, setArtisans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  const [search, setSearch] = useState('');
  const [type, setType] = useState(() => searchParams.get('type') || 'all');
  const [status, setStatus] = useState('all');
  const [artisanId, setArtisanId] = useState('all');
  const [sort, setSort] = useState('newest');
  const [viewMode, setViewMode] = useState('grid');

  const [selected, setSelected] = useState(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [moreAnchor, setMoreAnchor] = useState(null);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [reassignTo, setReassignTo] = useState('');

  const showSnack = (message, severity = 'success') => setSnack({ open: true, message, severity });
  const closeSnack = () => setSnack((s) => ({ ...s, open: false }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products?limit=200');
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to load products');
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : (data.products || []));
    } catch (e) {
      showSnack(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadArtisans = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await fetch('/api/custom-orders/assignable-artisans');
      if (!res.ok) return;
      const data = await res.json();
      setArtisans(Array.isArray(data) ? data : []);
    } catch {
      // artisan filter is optional
    }
  }, [isAdmin]);

  useEffect(() => { load(); loadArtisans(); }, [load, loadArtisans]);

  const stats = useMemo(() => catalogStats(products), [products]);

  const filtered = useMemo(
    () => filterCatalog(products, { search, type, status, artisanId, sort }),
    [products, search, type, status, artisanId, sort]
  );

  const toggleSelect = (id) => setSelected((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const clearSelection = () => setSelected(new Set());

  const handleEdit = (product) => {
    router.push(`/dashboard/products/${product._id}`);
  };

  const {
    handleDuplicate,
    handleBulkPublish,
    handleBulkArchive,
    handleBulkRemove,
    handleBulkReassign,
    confirmBulkReassign,
  } = catalogActions({
    clearSelection,
    load,
    reassignTo,
    selected,
    setBulkBusy,
    setReassignOpen,
    setReassignTo,
    showSnack,
  });
  const handleNewProduct = () => router.push('/dashboard/products/new');

  return (
    <Box sx={{ pb: 10 }}>
      {/* Header band */}
      <Box sx={{ backgroundColor: { xs: 'transparent', sm: REPAIRS_UI.bgPanel }, border: { xs: 'none', sm: `1px solid ${REPAIRS_UI.border}` }, borderRadius: { xs: 0, sm: 3 }, boxShadow: { xs: 'none', sm: 'none' }, p: { xs: 0.5, sm: 2.5, md: 3 }, mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
          <Box sx={{ maxWidth: 920 }}>
            <Typography sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, px: 1.25, py: 0.5, mb: 1.5, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', color: REPAIRS_UI.textPrimary, backgroundColor: REPAIRS_UI.bgCard, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, textTransform: 'uppercase' }}>
              <DiamondIcon sx={{ fontSize: 16, color: REPAIRS_UI.accent }} />
              Catalog
            </Typography>
            <Typography component="h1" sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 1 }}>Products</Typography>
            <Typography sx={{ color: REPAIRS_UI.textSecondary, lineHeight: 1.6 }}>
              Unified catalog — gemstones and jewelry across all artisans.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleNewProduct} sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, '&:hover': { backgroundColor: '#C19B2E' }, display: { xs: 'none', sm: 'inline-flex' } }}>
              New product
            </Button>
            <Tooltip title="More options">
              <IconButton onClick={(event) => setMoreAnchor(event.currentTarget)} sx={{ color: REPAIRS_UI.textSecondary, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 1.5 }}>
                <MoreVertIcon />
              </IconButton>
            </Tooltip>
            <Menu anchorEl={moreAnchor} open={Boolean(moreAnchor)} onClose={() => setMoreAnchor(null)} MenuListProps={{ dense: true }}>
              <MenuItem disabled>Import products</MenuItem>
              <MenuItem onClick={() => { setSelected(new Set(filtered.map((product) => String(product._id)))); setMoreAnchor(null); }}>
                Select filtered products
              </MenuItem>
              <MenuItem disabled={selected.size === 0} onClick={() => { setMoreAnchor(null); handleBulkArchive(); }}>
                Archive selected
              </MenuItem>
            </Menu>
          </Stack>
        </Stack>
      </Box>

      {/* Stats strip */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}><MetricCard icon={InventoryIcon} label="Total" value={stats.total} /></Grid>
        <Grid item xs={6} sm={3}><MetricCard icon={CheckCircleIcon} label="Active" value={stats.active} accent="#66BB6A" /></Grid>
        <Grid item xs={6} sm={3}><MetricCard icon={DraftsIcon} label="Draft" value={stats.draft} accent={REPAIRS_UI.textMuted} /></Grid>
        <Grid item xs={6} sm={3}><MetricCard icon={WarningAmberIcon} label="Out of stock" value={stats.outOfStock} accent="#FFB74D" /></Grid>
      </Grid>

      {/* Filters bar */}
      <Paper sx={{ p: { xs: 1.5, sm: 2 }, mb: 2, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none', position: { sm: 'sticky' }, top: { sm: 8 }, zIndex: { sm: 10 } }}>
        <Stack spacing={1.5}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
            {/* Search */}
            <TextField
              placeholder="Search products…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="small"
              sx={{ flex: 1 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: REPAIRS_UI.textSecondary }} /></InputAdornment> }}
            />

            {/* Status */}
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select value={status} label="Status" onChange={(e) => setStatus(e.target.value)} MenuProps={repairsMenuProps}>
                {STATUS_OPTIONS.map((s) => <MenuItem key={s} value={s}>{s === 'all' ? 'All statuses' : getStatusLabel(s)}</MenuItem>)}
              </Select>
            </FormControl>

            {/* Artisan (admin only) */}
            {isAdmin && (
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>Artisan</InputLabel>
                <Select value={artisanId} label="Artisan" onChange={(e) => setArtisanId(e.target.value)} MenuProps={repairsMenuProps}>
                  <MenuItem value="all">All artisans</MenuItem>
                  {artisans.map((a) => <MenuItem key={a.userID || a._id} value={a.userID || a._id}>{a.businessName || a.displayName || a.name || a.email}</MenuItem>)}
                </Select>
              </FormControl>
            )}

            {/* Sort */}
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Sort</InputLabel>
              <Select value={sort} label="Sort" onChange={(e) => setSort(e.target.value)} MenuProps={repairsMenuProps}>
                {SORT_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
              </Select>
            </FormControl>

            {/* Grid/Table toggle */}
            <ToggleButtonGroup value={viewMode} exclusive onChange={(_, v) => v && setViewMode(v)} size="small" sx={{ flexShrink: 0 }}>
              <ToggleButton value="grid" sx={{ color: REPAIRS_UI.textSecondary, borderColor: REPAIRS_UI.border, '&.Mui-selected': { backgroundColor: REPAIRS_UI.bgTertiary, color: REPAIRS_UI.accent } }}>
                <Tooltip title="Grid view"><GridViewIcon fontSize="small" /></Tooltip>
              </ToggleButton>
              <ToggleButton value="table" sx={{ color: REPAIRS_UI.textSecondary, borderColor: REPAIRS_UI.border, '&.Mui-selected': { backgroundColor: REPAIRS_UI.bgTertiary, color: REPAIRS_UI.accent } }}>
                <Tooltip title="Table view"><TableRowsIcon fontSize="small" /></Tooltip>
              </ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          {/* Type chips */}
          <Stack direction="row" spacing={1}>
            {TYPE_CHIPS.map((tc) => (
              <Chip
                key={tc.value}
                label={tc.label}
                onClick={() => setType(tc.value)}
                sx={{
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  backgroundColor: type === tc.value ? REPAIRS_UI.accent : REPAIRS_UI.bgTertiary,
                  color: type === tc.value ? '#1A1A1A' : REPAIRS_UI.textSecondary,
                  border: `1px solid ${type === tc.value ? REPAIRS_UI.accent : REPAIRS_UI.border}`,
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: type === tc.value ? '#C19B2E' : REPAIRS_UI.bgPanel },
                }}
              />
            ))}
          </Stack>
        </Stack>
      </Paper>

      {/* Body */}
      {loading ? (
        viewMode === 'grid' ? (
          <Grid container spacing={2}>
            {Array.from({ length: 8 }).map((_, i) => (
              <Grid item xs={6} sm={4} md={3} lg={2} key={i}><SkeletonCard /></Grid>
            ))}
          </Grid>
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress sx={{ color: REPAIRS_UI.accent }} />
          </Box>
        )
      ) : filtered.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center', backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px dashed ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
          <DiamondIcon sx={{ fontSize: 56, color: 'transparent', mb: 2, stroke: REPAIRS_UI.accent, strokeWidth: 1, filter: `drop-shadow(0 0 6px ${REPAIRS_UI.accent}55)` }} />
          <Typography sx={{ color: REPAIRS_UI.textSecondary }}>
            {products.length === 0 ? 'No products yet. Add one to start your catalog.' : 'No products match your filters.'}
          </Typography>
        </Paper>
      ) : viewMode === 'grid' ? (
        <Grid container spacing={2}>
          {filtered.map((p) => (
            <Grid item xs={6} sm={4} md={3} lg={2} key={String(p._id)}>
              <ProductCard product={p} selected={selected} onToggle={toggleSelect} onEdit={handleEdit} onDuplicate={handleDuplicate} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <TableContainer component={Paper} sx={{ backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { borderColor: REPAIRS_UI.border, backgroundColor: REPAIRS_UI.bgTertiary, color: REPAIRS_UI.textSecondary, fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' } }}>
                <TableCell>Product</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Artisan</TableCell>
                <TableCell>Price / Margin</TableCell>
                <TableCell>Updated</TableCell>
                <TableCell>Status</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((p) => (
                <ProductTableRow key={String(p._id)} product={p} selected={selected} onToggle={toggleSelect} onEdit={handleEdit} />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Slide-up bulk action bar */}
      <Slide direction="up" in={selected.size > 0} mountOnEnter unmountOnExit>
        <Paper elevation={8} sx={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 1300, display: 'flex', alignItems: 'center', gap: 1.5, px: 3, py: 1.5, backgroundColor: REPAIRS_UI.bgPanel, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 3, minWidth: { xs: 300, sm: 480 } }}>
          <Typography sx={{ color: REPAIRS_UI.textSecondary, fontSize: '0.875rem', flex: 1 }}>
            <Box component="span" sx={{ fontWeight: 700, color: REPAIRS_UI.accent }}>{selected.size}</Box>
            {' '}product{selected.size !== 1 ? 's' : ''} selected
          </Typography>
          <Tooltip title="Publish selected">
            <IconButton size="small" disabled={bulkBusy} onClick={handleBulkPublish} sx={{ color: '#66BB6A', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 1 }}>
              <PublishIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Archive selected">
            <IconButton size="small" disabled={bulkBusy} onClick={handleBulkArchive} sx={{ color: REPAIRS_UI.textSecondary, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 1 }}>
              <ArchiveIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {isAdmin && (
            <Tooltip title="Reassign artisan">
              <IconButton size="small" disabled={bulkBusy || artisans.length === 0} onClick={handleBulkReassign} sx={{ color: REPAIRS_UI.textSecondary, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 1 }}>
                <PersonIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Remove selected from catalog">
            <IconButton size="small" disabled={bulkBusy} onClick={handleBulkRemove} sx={{ color: '#ef5350', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 1 }}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Clear selection">
            <IconButton size="small" onClick={clearSelection} sx={{ color: REPAIRS_UI.textSecondary }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Paper>
      </Slide>

      <Dialog open={reassignOpen} onClose={() => setReassignOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Reassign products</DialogTitle>
        <DialogContent>
          <FormControl fullWidth size="small" sx={{ mt: 1 }}>
            <InputLabel>Artisan</InputLabel>
            <Select value={reassignTo} label="Artisan" onChange={(event) => setReassignTo(event.target.value)} MenuProps={repairsMenuProps}>
              {artisans.map((artisan) => {
                const id = artisan.userID || artisan.id || artisan._id;
                return <MenuItem key={String(id)} value={String(id)}>{artisan.businessName || artisan.displayName || artisan.name || artisan.email}</MenuItem>;
              })}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReassignOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={!reassignTo} onClick={confirmBulkReassign}>Reassign</Button>
        </DialogActions>
      </Dialog>

      {/* Mobile FAB */}
      <Fab
        onClick={handleNewProduct}
        sx={{ position: 'fixed', bottom: 24, right: 24, backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', display: { xs: 'flex', sm: 'none' }, '&:hover': { backgroundColor: '#C19B2E' } }}
      >
        <AddIcon />
      </Fab>

      <Snackbar open={snack.open} autoHideDuration={5000} onClose={closeSnack} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={closeSnack} severity={snack.severity} sx={{ backgroundColor: REPAIRS_UI.bgCard, color: REPAIRS_UI.textPrimary, border: `1px solid ${REPAIRS_UI.border}` }}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}

export default function ProductsPage() {
  return (
    <Suspense>
      <CatalogInner />
    </Suspense>
  );
}
