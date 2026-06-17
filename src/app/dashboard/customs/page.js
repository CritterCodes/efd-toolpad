'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Typography, Button, Grid, Card, CardContent, Paper, TextField, InputAdornment,
  FormControl, InputLabel, Select, MenuItem, Stack, CircularProgress, Snackbar, Alert,
  Pagination, FormControlLabel, Switch,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DiamondIcon from '@mui/icons-material/AutoAwesome';
import SearchIcon from '@mui/icons-material/Search';
import InboxIcon from '@mui/icons-material/Inbox';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import PaymentsIcon from '@mui/icons-material/Payments';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import { useRouter } from 'next/navigation';

import { REPAIRS_UI, repairsMenuProps } from '@/app/dashboard/repairs/components/repairsUi';
import CustomOrderCard from './components/CustomOrderCard';
import NewCustomStepper from './components/NewCustomStepper';

const STATUS_OPTIONS = [
  'all', 'pending', 'consultation', 'design', 'quote', 'deposit',
  'in_production', 'qc', 'completed', 'delivered', 'cancelled',
];
const PAGE_SIZE = 9;
const money = (n) => `$${(Number(n) || 0).toLocaleString()}`;

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

export default function CustomsPage() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [type, setType] = useState('all');
  const [rushOnly, setRushOnly] = useState(false);
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  const showSnack = (message, severity = 'success') => setSnack({ open: true, message, severity });
  const closeSnack = () => setSnack((s) => ({ ...s, open: false }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/custom-orders');
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to load custom orders');
      setOrders(await res.json());
    } catch (e) {
      showSnack(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, status, type, rushOnly, sort]);

  const metrics = useMemo(() => ({
    total: orders.length,
    inProduction: orders.filter((o) => o.status === 'in_production' || o.status === 'qc').length,
    awaitingPayment: orders.filter((o) => ['quote', 'deposit'].includes(o.status)).length,
    rush: orders.filter((o) => o.isRush).length,
    pipeline: orders.reduce((sum, o) => sum + (o.quote?.quoteTotal || 0), 0),
  }), [orders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = orders.filter((o) => {
      if (status !== 'all' && o.status !== status) return false;
      if (type !== 'all' && (o.type || 'custom-design') !== type) return false;
      if (rushOnly && !o.isRush) return false;
      if (!q) return true;
      const hay = [o.customID, o.customerName, o.clientID, o.title, o.status, o.description].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
    list = list.slice().sort((a, b) => {
      const da = new Date(a.createdAt || 0).getTime();
      const db = new Date(b.createdAt || 0).getTime();
      return sort === 'newest' ? db - da : da - db;
    });
    return list;
  }, [orders, search, status, type, rushOnly, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <Box sx={{ pb: 6 }}>
      {/* Header */}
      <Box sx={{ backgroundColor: { xs: 'transparent', sm: REPAIRS_UI.bgPanel }, border: { xs: 'none', sm: `1px solid ${REPAIRS_UI.border}` }, borderRadius: { xs: 0, sm: 3 }, boxShadow: { xs: 'none', sm: REPAIRS_UI.shadow }, p: { xs: 0.5, sm: 2.5, md: 3 }, mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box sx={{ maxWidth: 920 }}>
            <Typography sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, px: 1.25, py: 0.5, mb: 1.5, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', color: REPAIRS_UI.textPrimary, backgroundColor: REPAIRS_UI.bgCard, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, textTransform: 'uppercase' }}>
              <DiamondIcon sx={{ fontSize: 16, color: REPAIRS_UI.accent }} />
              Custom Orders
            </Typography>
            <Typography sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 1 }}>Customs</Typography>
            <Typography sx={{ color: REPAIRS_UI.textSecondary, lineHeight: 1.6 }}>
              Bespoke pieces from consultation to delivery. Legacy tickets live under &ldquo;Custom Tickets (Legacy)&rdquo;.
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)} sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, '&:hover': { backgroundColor: '#C19B2E' } }}>New Custom</Button>
        </Stack>
      </Box>

      {/* Metrics */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={2.4}><MetricCard icon={DiamondIcon} label="Total" value={metrics.total} /></Grid>
        <Grid item xs={6} md={2.4}><MetricCard icon={BuildCircleIcon} label="In production" value={metrics.inProduction} accent="#64B5F6" /></Grid>
        <Grid item xs={6} md={2.4}><MetricCard icon={PaymentsIcon} label="Awaiting payment" value={metrics.awaitingPayment} accent="#FFB74D" /></Grid>
        <Grid item xs={6} md={2.4}><MetricCard icon={PriorityHighIcon} label="Rush" value={metrics.rush} accent="#EF5350" /></Grid>
        <Grid item xs={12} md={2.4}><MetricCard icon={PaymentsIcon} label="Pipeline" value={money(metrics.pipeline)} /></Grid>
      </Grid>

      {/* Filter bar */}
      <Paper sx={{ p: 2, mb: 2, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
          <TextField placeholder="Search by ID, customer, title, description…" value={search} onChange={(e) => setSearch(e.target.value)} size="small" fullWidth
            InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ color: REPAIRS_UI.textSecondary }} /></InputAdornment>) }} />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Type</InputLabel>
            <Select value={type} label="Type" onChange={(e) => setType(e.target.value)} MenuProps={repairsMenuProps}>
              <MenuItem value="all">All types</MenuItem>
              <MenuItem value="custom-design">Custom Design</MenuItem>
              <MenuItem value="repair">Repair</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Status</InputLabel>
            <Select value={status} label="Status" onChange={(e) => setStatus(e.target.value)} MenuProps={repairsMenuProps}>
              {STATUS_OPTIONS.map((s) => <MenuItem key={s} value={s}>{s === 'all' ? 'All statuses' : s.replace('_', ' ')}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Sort</InputLabel>
            <Select value={sort} label="Sort" onChange={(e) => setSort(e.target.value)} MenuProps={repairsMenuProps}>
              <MenuItem value="newest">Newest</MenuItem>
              <MenuItem value="oldest">Oldest</MenuItem>
            </Select>
          </FormControl>
          <FormControlLabel sx={{ color: REPAIRS_UI.textSecondary, whiteSpace: 'nowrap' }} control={<Switch checked={rushOnly} onChange={(e) => setRushOnly(e.target.checked)} />} label="Rush" />
        </Stack>
      </Paper>

      {/* Results count */}
      {!loading && (
        <Typography variant="body2" sx={{ color: REPAIRS_UI.textMuted, mb: 1.5 }}>
          Showing {paged.length} of {filtered.length}{filtered.length !== orders.length ? ` (filtered from ${orders.length})` : ''}
        </Typography>
      )}

      {/* Grid / states */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress sx={{ color: REPAIRS_UI.accent }} /></Box>
      ) : filtered.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center', backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px dashed ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
          <InboxIcon sx={{ fontSize: 48, color: REPAIRS_UI.textMuted, mb: 1 }} />
          <Typography sx={{ color: REPAIRS_UI.textSecondary }}>
            {orders.length === 0 ? 'No custom orders yet. Create one to get started.' : 'No orders match your filters.'}
          </Typography>
        </Paper>
      ) : (
        <>
          <Grid container spacing={2}>
            {paged.map((o) => (
              <Grid item xs={12} sm={6} md={4} key={o.customID}>
                <CustomOrderCard order={o} onOpen={(id) => router.push(`/dashboard/customs/${id}`)} />
              </Grid>
            ))}
          </Grid>
          {pageCount > 1 && (
            <Stack alignItems="center" sx={{ mt: 3 }}>
              <Pagination count={pageCount} page={page} onChange={(_, p) => setPage(p)} showFirstButton showLastButton
                sx={{ '& .MuiPaginationItem-root': { color: REPAIRS_UI.textSecondary }, '& .Mui-selected': { backgroundColor: `${REPAIRS_UI.accent}22`, color: REPAIRS_UI.accent } }} />
            </Stack>
          )}
        </>
      )}

      <NewCustomStepper
        open={open}
        onClose={() => setOpen(false)}
        onCreated={(customID) => { setOpen(false); router.push(`/dashboard/customs/${customID}`); }}
        onError={(m) => showSnack(m, 'error')}
      />

      <Snackbar open={snack.open} autoHideDuration={5000} onClose={closeSnack} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={closeSnack} severity={snack.severity} sx={{ backgroundColor: REPAIRS_UI.bgCard, color: REPAIRS_UI.textPrimary, border: `1px solid ${REPAIRS_UI.border}` }}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}
