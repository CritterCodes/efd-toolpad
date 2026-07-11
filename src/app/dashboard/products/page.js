'use client';

import React, { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Box, Typography, Button, Grid, Card, CardContent, CardActionArea, Paper, TextField,
  InputAdornment, FormControl, InputLabel, Select, MenuItem, Stack, Chip, CircularProgress,
  Snackbar, Alert, Skeleton, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, IconButton, Tooltip, Slide, ToggleButton, ToggleButtonGroup, Fab,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DiamondIcon from '@mui/icons-material/Diamond';
import SearchIcon from '@mui/icons-material/Search';
import InboxIcon from '@mui/icons-material/Inbox';
import GridViewIcon from '@mui/icons-material/GridView';
import TableRowsIcon from '@mui/icons-material/TableRows';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
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
import { filterCatalog, catalogStats, getProductThumb, formatPrice, formatMargin } from '@/services/products/catalogFilter';

const STATUS_OPTIONS = ['all', 'active', 'draft', 'approved', 'archived', 'pending'];
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'title', label: 'Title A–Z' },
  { value: 'price_asc', label: 'Price ↑' },
  { value: 'price_desc', label: 'Price ↓' },
];

const TYPE_CHIPS = [
  { value: 'all', label: 'All' },
  { value: 'gemstone', label: 'Gemstones' },
  { value: 'jewelry', label: 'Jewelry' },
];

const STATUS_COLOR = {
  active: '#66BB6A',
  approved: '#66BB6A',
  Available: '#66BB6A',
  draft: REPAIRS_UI.textMuted,
  archived: REPAIRS_UI.textMuted,
  pending: '#FFB74D',
};

function getStatusLabel(s) {
  if (!s || s === 'draft') return 'Draft';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function getStatusColor(s) {
  return STATUS_COLOR[s] || REPAIRS_UI.textMuted;
}

function fmtPrice(product) {
  const p = formatPrice(product);
  if (p == null) return '—';
  return `$${p.toLocaleString()}`;
}

function fmtMargin(product) {
  const m = formatMargin(product);
  if (m == null) return null;
  return `${Math.round(m)}%`;
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function MetricCard({ icon: Icon, label, value, accent }) {
  return (
    <Card sx={{ height: '100%', backgroundColor: REPAIRS_UI.bgCard, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: '14px !important' }}>
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

function ProductThumb({ product, size = 56 }) {
  const url = getProductThumb(product);
  return (
    <Box sx={{ width: size, height: size, flexShrink: 0, borderRadius: 1, overflow: 'hidden', border: `1px solid ${REPAIRS_UI.border}`, backgroundColor: REPAIRS_UI.bgTertiary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {url ? (
        <Box component="img" src={url} alt={product.title || 'Product'} sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      ) : (
        <DiamondIcon sx={{ color: REPAIRS_UI.border, fontSize: size * 0.4 }} />
      )}
    </Box>
  );
}

function SkeletonCard() {
  return (
    <Card sx={{ height: 260, backgroundColor: REPAIRS_UI.bgCard, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
      <CardContent>
        <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 1, mb: 1, bgcolor: REPAIRS_UI.bgTertiary }} />
        <Skeleton width="60%" height={18} sx={{ bgcolor: REPAIRS_UI.bgTertiary, mb: 0.5 }} />
        <Skeleton width="40%" height={14} sx={{ bgcolor: REPAIRS_UI.bgTertiary }} />
      </CardContent>
    </Card>
  );
}

function ProductCard({ product, selected, onToggle, onEdit, onDuplicate }) {
  const [hovered, setHovered] = useState(false);
  const isSelected = selected.has(String(product._id));
  const margin = fmtMargin(product);

  return (
    <Card
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      sx={{
        height: '100%',
        backgroundColor: REPAIRS_UI.bgCard,
        backgroundImage: 'none',
        border: `1px solid ${isSelected ? REPAIRS_UI.accent : REPAIRS_UI.border}`,
        borderRadius: 2,
        boxShadow: 'none',
        cursor: 'pointer',
        transition: 'border-color 0.15s',
        position: 'relative',
        '&:hover': { borderColor: REPAIRS_UI.accent },
      }}
      onClick={() => onToggle(String(product._id))}
    >
      {/* Thumbnail area */}
      <Box sx={{ position: 'relative', pt: '100%', overflow: 'hidden', borderRadius: '8px 8px 0 0', backgroundColor: REPAIRS_UI.bgTertiary }}>
        {(() => {
          const url = getProductThumb(product);
          return url ? (
            <Box component="img" src={url} alt={product.title || 'Product'} sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DiamondIcon sx={{ color: REPAIRS_UI.border, fontSize: 48 }} />
            </Box>
          );
        })()}

        {/* Type badge TL */}
        <Box sx={{ position: 'absolute', top: 8, left: 8 }}>
          <Chip size="small" label={product.productType === 'gemstone' ? 'Gemstone' : 'Jewelry'} sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, backgroundColor: `${REPAIRS_UI.bgPanel}CC`, color: REPAIRS_UI.textSecondary, border: `1px solid ${REPAIRS_UI.border}` }} />
        </Box>

        {/* Status pill TR */}
        <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
          <Box sx={{ height: 20, px: 1, borderRadius: 1, display: 'flex', alignItems: 'center', backgroundColor: `${getStatusColor(product.status)}22`, border: `1px solid ${getStatusColor(product.status)}44` }}>
            <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: getStatusColor(product.status) }}>{getStatusLabel(product.status)}</Typography>
          </Box>
        </Box>

        {/* Hover actions */}
        {hovered && (
          <Box sx={{ position: 'absolute', bottom: 8, right: 8, display: 'flex', gap: 0.5 }}>
            <Tooltip title="Edit">
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); onEdit(product); }} sx={{ backgroundColor: `${REPAIRS_UI.bgPanel}DD`, color: REPAIRS_UI.accent, '&:hover': { backgroundColor: REPAIRS_UI.bgPanel } }}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Duplicate">
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDuplicate(product); }} sx={{ backgroundColor: `${REPAIRS_UI.bgPanel}DD`, color: REPAIRS_UI.textSecondary, '&:hover': { backgroundColor: REPAIRS_UI.bgPanel } }}>
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>

      <CardContent sx={{ pt: 1.25, pb: '10px !important' }}>
        <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: REPAIRS_UI.textHeader, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.4, mb: 0.5 }}>
          {product.title || 'Untitled'}
        </Typography>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: REPAIRS_UI.textPrimary }}>{fmtPrice(product)}</Typography>
          {margin && <Typography sx={{ fontSize: '0.72rem', color: '#66BB6A' }}>{margin}</Typography>}
        </Stack>
      </CardContent>
    </Card>
  );
}

function ProductTableRow({ product, selected, onToggle, onEdit }) {
  const isSelected = selected.has(String(product._id));
  const margin = fmtMargin(product);

  return (
    <TableRow
      onClick={() => onToggle(String(product._id))}
      sx={{ cursor: 'pointer', backgroundColor: isSelected ? `${REPAIRS_UI.accent}11` : 'transparent', '&:hover': { backgroundColor: REPAIRS_UI.bgTertiary } }}
    >
      <TableCell sx={{ borderColor: REPAIRS_UI.border, py: 1 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <ProductThumb product={product} size={40} />
          <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: REPAIRS_UI.textHeader }}>{product.title || 'Untitled'}</Typography>
        </Stack>
      </TableCell>
      <TableCell sx={{ borderColor: REPAIRS_UI.border, color: REPAIRS_UI.textSecondary, fontSize: '0.8rem' }}>
        {product.productType === 'gemstone' ? 'Gemstone' : 'Jewelry'}
      </TableCell>
      <TableCell sx={{ borderColor: REPAIRS_UI.border, color: REPAIRS_UI.textSecondary, fontSize: '0.8rem' }}>
        {product.artisanInfo?.businessName || product.artisanId || '—'}
      </TableCell>
      <TableCell sx={{ borderColor: REPAIRS_UI.border }}>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: REPAIRS_UI.textPrimary }}>{fmtPrice(product)}</Typography>
          {margin && <Typography sx={{ fontSize: '0.72rem', color: '#66BB6A' }}>{margin}</Typography>}
        </Stack>
      </TableCell>
      <TableCell sx={{ borderColor: REPAIRS_UI.border, color: REPAIRS_UI.textMuted, fontSize: '0.78rem' }}>
        {fmtDate(product.updatedAt || product.createdAt)}
      </TableCell>
      <TableCell sx={{ borderColor: REPAIRS_UI.border }}>
        <Box sx={{ display: 'inline-flex', px: 1, py: 0.25, borderRadius: 1, backgroundColor: `${getStatusColor(product.status)}22` }}>
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: getStatusColor(product.status) }}>{getStatusLabel(product.status)}</Typography>
        </Box>
      </TableCell>
      <TableCell sx={{ borderColor: REPAIRS_UI.border }}>
        <Tooltip title="Edit">
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); onEdit(product); }} sx={{ color: REPAIRS_UI.textSecondary, '&:hover': { color: REPAIRS_UI.accent } }}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
}

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
    const subtype = product.productType === 'gemstone' ? 'gemstones' : 'jewelry';
    router.push(`/dashboard/products/${subtype}/${product._id}`);
  };

  const handleDuplicate = (product) => {
    showSnack(`Duplicate for "${product.title || 'product'}" — coming soon.`, 'info');
  };

  const handleBulkPublish = () => showSnack(`Publish ${selected.size} product(s) — coming soon.`, 'info');
  const handleBulkArchive = () => showSnack(`Archive ${selected.size} product(s) — coming soon.`, 'info');
  const handleBulkReassign = () => showSnack(`Reassign ${selected.size} product(s) — coming soon.`, 'info');
  const handleBulkDelete = () => showSnack(`Delete ${selected.size} product(s) — coming soon.`, 'info');

  const handleNewProduct = () => router.push('/dashboard/products/jewelry/new');

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
            <Typography sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 1 }}>Products</Typography>
            <Typography sx={{ color: REPAIRS_UI.textSecondary, lineHeight: 1.6 }}>
              Unified catalog — gemstones and jewelry across all artisans.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleNewProduct} sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, '&:hover': { backgroundColor: '#C19B2E' }, display: { xs: 'none', sm: 'inline-flex' } }}>
              New product
            </Button>
            <Tooltip title="More options">
              <IconButton sx={{ color: REPAIRS_UI.textSecondary, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 1.5 }}>
                <MoreVertIcon />
              </IconButton>
            </Tooltip>
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
          <DiamondIcon sx={{ fontSize: 48, color: 'transparent', mb: 1, stroke: REPAIRS_UI.accent, filter: `drop-shadow(0 0 4px ${REPAIRS_UI.accent}44)`, WebkitTextStroke: `1px ${REPAIRS_UI.accent}` }} />
          <DiamondIcon sx={{ fontSize: 48, color: `${REPAIRS_UI.accent}22`, mb: 1, position: 'relative', mt: -8 }} />
          <Box sx={{ mt: -6, mb: 1 }}>
            <DiamondIcon sx={{ fontSize: 48, color: 'transparent', filter: `drop-shadow(0 0 6px ${REPAIRS_UI.accent}55)`, WebkitTextStrokeWidth: '1px', WebkitTextStrokeColor: REPAIRS_UI.accent }} />
          </Box>
          <InboxIcon sx={{ fontSize: 48, color: REPAIRS_UI.textMuted, mb: 1 }} />
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
            <IconButton size="small" onClick={handleBulkPublish} sx={{ color: '#66BB6A', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 1 }}>
              <PublishIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Archive selected">
            <IconButton size="small" onClick={handleBulkArchive} sx={{ color: REPAIRS_UI.textSecondary, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 1 }}>
              <ArchiveIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {isAdmin && (
            <Tooltip title="Reassign artisan">
              <IconButton size="small" onClick={handleBulkReassign} sx={{ color: REPAIRS_UI.textSecondary, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 1 }}>
                <PersonIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Delete selected">
            <IconButton size="small" onClick={handleBulkDelete} sx={{ color: '#ef5350', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 1 }}>
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
