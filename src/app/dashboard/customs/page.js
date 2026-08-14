'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Typography, Button, Grid, Card, CardContent, Paper, TextField, InputAdornment,
  FormControl, InputLabel, Select, MenuItem, Stack, CircularProgress, Snackbar, Alert,
  Pagination, FormControlLabel, Switch, Tabs, Tab, Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DiamondIcon from '@mui/icons-material/AutoAwesome';
import SearchIcon from '@mui/icons-material/Search';
import InboxIcon from '@mui/icons-material/Inbox';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import PaymentsIcon from '@mui/icons-material/Payments';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { useRouter } from 'next/navigation';

import { REPAIRS_UI, repairsMenuProps } from '@/app/dashboard/repairs/components/repairsUi';
import CustomOrderCard from './components/CustomOrderCard';
import NewCustomStepper from './components/NewCustomStepper';

const TERMINAL = ['completed', 'delivered', 'cancelled'];
// Statuses whose quote is a real commitment — the money metric counts ONLY these.
// Pre-quote drafts aren't owed money, and done/cancelled orders aren't pipeline.
const MONEY_STATUSES = ['quote', 'deposit', 'in_production', 'qc'];

const PHASE_TABS = [
  { key: 'active', label: 'Active', statuses: null }, // null = every non-terminal status
  { key: 'intake', label: 'Intake', statuses: ['pending', 'consultation'] },
  { key: 'design', label: 'Design', statuses: ['design'] },
  { key: 'payment', label: 'Awaiting payment', statuses: ['quote', 'deposit'] },
  { key: 'production', label: 'In production', statuses: ['in_production', 'qc'] },
  { key: 'done', label: 'Done', statuses: ['completed', 'delivered'] },
  { key: 'cancelled', label: 'Cancelled', statuses: ['cancelled'] },
];

const inPhase = (order, tab) => (tab.statuses ? tab.statuses.includes(order.status) : !TERMINAL.includes(order.status));

const PAGE_SIZE = 9;
const money = (n) => `$${(Number(n) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

function MetricCard({ icon: Icon, label, value, accent, onClick, active }) {
  return (
    <Card
      onClick={onClick}
      sx={{
        height: '100%', backgroundColor: REPAIRS_UI.bgCard, backgroundImage: 'none',
        border: `1px solid ${active ? (accent || REPAIRS_UI.accent) : REPAIRS_UI.border}`, borderRadius: 2,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 120ms ease',
        '&:hover': onClick ? { borderColor: accent || REPAIRS_UI.accent } : undefined,
      }}
    >
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 2, backgroundColor: REPAIRS_UI.bgTertiary, border: `1px solid ${REPAIRS_UI.border}`, flexShrink: 0 }}>
          <Icon sx={{ color: accent || REPAIRS_UI.accent, fontSize: 22 }} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 24, fontWeight: 700, color: REPAIRS_UI.textHeader, lineHeight: 1.1 }} noWrap>{value}</Typography>
          <Typography sx={{ fontSize: '0.74rem', color: REPAIRS_UI.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }} noWrap>{label}</Typography>
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
  const [tab, setTab] = useState('active');
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
  useEffect(() => { setPage(1); }, [search, tab, status, type, rushOnly, sort]);

  const currentTab = PHASE_TABS.find((t) => t.key === tab) || PHASE_TABS[0];
  // The status dropdown narrows WITHIN the current tab, so it only offers that tab's statuses.
  const statusOptions = currentTab.statuses
    || ['pending', 'consultation', 'design', 'quote', 'deposit', 'in_production', 'qc'];
  const selectTab = (key) => { setTab(key); setStatus('all'); };

  const tabCounts = useMemo(() => {
    const counts = {};
    for (const t of PHASE_TABS) counts[t.key] = orders.filter((o) => inPhase(o, t)).length;
    return counts;
  }, [orders]);

  const metrics = useMemo(() => {
    const active = orders.filter((o) => !TERMINAL.includes(o.status));
    // Outstanding = balance still to collect on committed (quoted → qc) orders, tax-inclusive.
    // NOT the old "pipeline" (which summed every quote ever drafted, even cancelled ones).
    const outstanding = orders
      .filter((o) => MONEY_STATUSES.includes(o.status))
      .reduce((sum, o) => {
        const total = o.quote?.total ?? o.quote?.quoteTotal ?? 0;
        return sum + (o.payment ? o.payment.remainingAmount : total);
      }, 0);
    return {
      active: active.length,
      inProduction: orders.filter((o) => o.status === 'in_production' || o.status === 'qc').length,
      awaitingPayment: orders.filter((o) => ['quote', 'deposit'].includes(o.status)).length,
      rush: active.filter((o) => o.isRush).length,
      outstanding,
    };
  }, [orders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = orders.filter((o) => {
      if (!inPhase(o, currentTab)) return false;
      if (status !== 'all' && o.status !== status) return false;
      if (type !== 'all' && (o.type || 'custom-design') !== type) return false;
      if (rushOnly && !o.isRush) return false;
      if (!q) return true;
      const hay = [o.customID, o.customerName, o.clientID, o.jewelryType, o.title, o.status, o.description].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
    const created = (o) => new Date(o.createdAt || 0).getTime();
    const balance = (o) => (o.payment ? o.payment.remainingAmount : (o.quote?.total ?? o.quote?.quoteTotal ?? 0));
    list = list.slice().sort((a, b) => {
      if (sort === 'due') {
        // Soonest due first; orders with no due date sink to the bottom.
        const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return da - db;
      }
      if (sort === 'balance') return balance(b) - balance(a);
      return sort === 'newest' ? created(b) - created(a) : created(a) - created(b);
    });
    return list;
  }, [orders, search, currentTab, status, type, rushOnly, sort]);

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

      {/* Metrics — clickable, each jumps to the matching view */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={2.4}>
          <MetricCard icon={DiamondIcon} label="Active" value={metrics.active} onClick={() => selectTab('active')} active={tab === 'active'} />
        </Grid>
        <Grid item xs={6} md={2.4}>
          <MetricCard icon={BuildCircleIcon} label="In production" value={metrics.inProduction} accent="#64B5F6" onClick={() => selectTab('production')} active={tab === 'production'} />
        </Grid>
        <Grid item xs={6} md={2.4}>
          <MetricCard icon={PaymentsIcon} label="Awaiting payment" value={metrics.awaitingPayment} accent="#FFB74D" onClick={() => selectTab('payment')} active={tab === 'payment'} />
        </Grid>
        <Grid item xs={6} md={2.4}>
          <MetricCard icon={PriorityHighIcon} label="Rush (active)" value={metrics.rush} accent="#EF5350" onClick={() => setRushOnly((v) => !v)} active={rushOnly} />
        </Grid>
        <Grid item xs={12} md={2.4}>
          <MetricCard icon={AccountBalanceWalletIcon} label="Outstanding" value={money(metrics.outstanding)} />
        </Grid>
      </Grid>

      {/* Phase tabs */}
      <Tabs
        value={tab}
        onChange={(_, v) => selectTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          mb: 2, minHeight: 40,
          '& .MuiTab-root': { color: REPAIRS_UI.textSecondary, textTransform: 'none', minHeight: 40, fontWeight: 600 },
          '& .Mui-selected': { color: `${REPAIRS_UI.accent} !important` },
          '& .MuiTabs-indicator': { backgroundColor: REPAIRS_UI.accent },
        }}
      >
        {PHASE_TABS.map((t) => (
          <Tab
            key={t.key}
            value={t.key}
            label={(
              <Stack direction="row" spacing={0.75} alignItems="center">
                <span>{t.label}</span>
                <Chip size="small" label={tabCounts[t.key] ?? 0} sx={{ height: 18, fontSize: '0.68rem', backgroundColor: tab === t.key ? `${REPAIRS_UI.accent}22` : REPAIRS_UI.bgTertiary, color: tab === t.key ? REPAIRS_UI.accent : REPAIRS_UI.textSecondary }} />
              </Stack>
            )}
          />
        ))}
      </Tabs>

      {/* Filter bar */}
      <Paper sx={{ p: 2, mb: 2, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
          <TextField placeholder="Search by ID, customer, jewelry type, description…" value={search} onChange={(e) => setSearch(e.target.value)} size="small" fullWidth
            InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ color: REPAIRS_UI.textSecondary }} /></InputAdornment>) }} />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Type</InputLabel>
            <Select value={type} label="Type" onChange={(e) => setType(e.target.value)} MenuProps={repairsMenuProps}>
              <MenuItem value="all">All types</MenuItem>
              <MenuItem value="custom-design">Custom Design</MenuItem>
              <MenuItem value="repair">Repair</MenuItem>
            </Select>
          </FormControl>
          {statusOptions.length > 1 && (
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Status</InputLabel>
              <Select value={status} label="Status" onChange={(e) => setStatus(e.target.value)} MenuProps={repairsMenuProps}>
                <MenuItem value="all">All in tab</MenuItem>
                {statusOptions.map((s) => <MenuItem key={s} value={s}>{s.replace('_', ' ')}</MenuItem>)}
              </Select>
            </FormControl>
          )}
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Sort</InputLabel>
            <Select value={sort} label="Sort" onChange={(e) => setSort(e.target.value)} MenuProps={repairsMenuProps}>
              <MenuItem value="newest">Newest</MenuItem>
              <MenuItem value="oldest">Oldest</MenuItem>
              <MenuItem value="due">Due date</MenuItem>
              <MenuItem value="balance">Balance owed</MenuItem>
            </Select>
          </FormControl>
          <FormControlLabel sx={{ color: REPAIRS_UI.textSecondary, whiteSpace: 'nowrap' }} control={<Switch checked={rushOnly} onChange={(e) => setRushOnly(e.target.checked)} />} label="Rush" />
        </Stack>
      </Paper>

      {/* Results count */}
      {!loading && (
        <Typography variant="body2" sx={{ color: REPAIRS_UI.textMuted, mb: 1.5 }}>
          Showing {paged.length} of {filtered.length}{filtered.length !== orders.length ? ` (of ${orders.length} total)` : ''}
        </Typography>
      )}

      {/* Grid / states */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress sx={{ color: REPAIRS_UI.accent }} /></Box>
      ) : filtered.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center', backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px dashed ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
          <InboxIcon sx={{ fontSize: 48, color: REPAIRS_UI.textMuted, mb: 1 }} />
          <Typography sx={{ color: REPAIRS_UI.textSecondary }}>
            {orders.length === 0 ? 'No custom orders yet. Create one to get started.' : 'No orders match this view.'}
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
