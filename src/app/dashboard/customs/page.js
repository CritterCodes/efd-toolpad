'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Typography, Button, Chip, Grid, Card, CardActionArea, CardContent, Paper,
  TextField, InputAdornment, FormControl, InputLabel, Select, MenuItem, Stack,
  CircularProgress, Snackbar, Alert, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DiamondIcon from '@mui/icons-material/AutoAwesome';
import SearchIcon from '@mui/icons-material/Search';
import InboxIcon from '@mui/icons-material/Inbox';
import PersonIcon from '@mui/icons-material/Person';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import PaymentsIcon from '@mui/icons-material/Payments';
import { useRouter } from 'next/navigation';

import { REPAIRS_UI, repairsMenuProps } from '@/app/dashboard/repairs/components/repairsUi';

const STATUS_COLOR = {
  pending: 'default', consultation: 'info', design: 'info', quote: 'warning',
  deposit: 'warning', in_production: 'primary', qc: 'secondary',
  completed: 'success', delivered: 'success', cancelled: 'error',
};

const STATUS_OPTIONS = [
  'all', 'pending', 'consultation', 'design', 'quote', 'deposit',
  'in_production', 'qc', 'completed', 'delivered', 'cancelled',
];

const money = (n) => `$${(Number(n) || 0).toLocaleString()}`;

const dialogPaperProps = {
  sx: {
    backgroundColor: REPAIRS_UI.bgPanel,
    backgroundImage: 'none',
    color: REPAIRS_UI.textPrimary,
    border: `1px solid ${REPAIRS_UI.border}`,
  },
};

function MetricCard({ icon: Icon, label, value, accent }) {
  return (
    <Card sx={{ height: '100%', backgroundColor: REPAIRS_UI.bgCard, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2 }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 2, backgroundColor: REPAIRS_UI.bgTertiary, border: `1px solid ${REPAIRS_UI.border}` }}>
          <Icon sx={{ color: accent || REPAIRS_UI.accent, fontSize: 22 }} />
        </Box>
        <Box>
          <Typography sx={{ fontSize: 26, fontWeight: 700, color: REPAIRS_UI.textHeader, lineHeight: 1.1 }}>{value}</Typography>
          <Typography sx={{ fontSize: '0.78rem', color: REPAIRS_UI.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</Typography>
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
  const [form, setForm] = useState({ customerName: '', title: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
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

  const create = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/custom-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to create');
      const created = await res.json();
      setOpen(false);
      setForm({ customerName: '', title: '', description: '' });
      router.push(`/dashboard/customs/${created.customID}`);
    } catch (e) {
      showSnack(e.message, 'error');
      setSaving(false);
    }
  };

  const metrics = useMemo(() => ({
    total: orders.length,
    inProduction: orders.filter((o) => o.status === 'in_production' || o.status === 'qc').length,
    awaitingPayment: orders.filter((o) => ['quote', 'deposit'].includes(o.status)).length,
    pipeline: orders.reduce((sum, o) => sum + (o.quote?.quoteTotal || 0), 0),
  }), [orders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (status !== 'all' && o.status !== status) return false;
      if (!q) return true;
      const hay = [o.customID, o.customerName, o.clientID, o.title, o.status].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [orders, search, status]);

  return (
    <Box sx={{ pb: 6 }}>
      {/* Header panel */}
      <Box
        sx={{
          backgroundColor: { xs: 'transparent', sm: REPAIRS_UI.bgPanel },
          border: { xs: 'none', sm: `1px solid ${REPAIRS_UI.border}` },
          borderRadius: { xs: 0, sm: 3 },
          boxShadow: { xs: 'none', sm: REPAIRS_UI.shadow },
          p: { xs: 0.5, sm: 2.5, md: 3 },
          mb: 3,
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box sx={{ maxWidth: 920 }}>
            <Typography
              sx={{
                display: 'inline-flex', alignItems: 'center', gap: 1,
                px: 1.25, py: 0.5, mb: 1.5,
                fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em',
                color: REPAIRS_UI.textPrimary, backgroundColor: REPAIRS_UI.bgCard,
                border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, textTransform: 'uppercase',
              }}
            >
              <DiamondIcon sx={{ fontSize: 16, color: REPAIRS_UI.accent }} />
              Custom Orders
            </Typography>
            <Typography sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 1 }}>
              Customs
            </Typography>
            <Typography sx={{ color: REPAIRS_UI.textSecondary, lineHeight: 1.6 }}>
              Bespoke pieces from consultation to delivery. Legacy tickets live under &ldquo;Custom Tickets (Legacy)&rdquo;.
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpen(true)}
            sx={{
              backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600,
              '&:hover': { backgroundColor: '#C19B2E' },
            }}
          >
            New Custom
          </Button>
        </Stack>
      </Box>

      {/* Metric cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}><MetricCard icon={DiamondIcon} label="Total orders" value={metrics.total} /></Grid>
        <Grid item xs={6} md={3}><MetricCard icon={BuildCircleIcon} label="In production" value={metrics.inProduction} accent="#64B5F6" /></Grid>
        <Grid item xs={6} md={3}><MetricCard icon={PaymentsIcon} label="Awaiting payment" value={metrics.awaitingPayment} accent="#FFB74D" /></Grid>
        <Grid item xs={6} md={3}><MetricCard icon={PaymentsIcon} label="Pipeline value" value={money(metrics.pipeline)} /></Grid>
      </Grid>

      {/* Filter bar */}
      <Paper sx={{ p: 2, mb: 3, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
          <TextField
            placeholder="Search by ID, customer, title…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            fullWidth
            InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ color: REPAIRS_UI.textSecondary }} /></InputAdornment>) }}
          />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Status</InputLabel>
            <Select value={status} label="Status" onChange={(e) => setStatus(e.target.value)} MenuProps={repairsMenuProps}>
              {STATUS_OPTIONS.map((s) => (
                <MenuItem key={s} value={s}>{s === 'all' ? 'All statuses' : s.replace('_', ' ')}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Paper>

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
        <Grid container spacing={2}>
          {filtered.map((o) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={o.customID}>
              <Card sx={{ height: '100%', backgroundColor: REPAIRS_UI.bgCard, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, transition: 'box-shadow 120ms ease, transform 120ms ease', '&:hover': { boxShadow: REPAIRS_UI.shadow, transform: 'translateY(-2px)' } }}>
              <CardActionArea onClick={() => router.push(`/dashboard/customs/${o.customID}`)} sx={{ height: '100%' }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                    <Chip size="small" label={(o.status || '').replace('_', ' ')} color={STATUS_COLOR[o.status] || 'default'} />
                    <Typography sx={{ fontSize: '0.72rem', color: REPAIRS_UI.textMuted }}>{o.customID}</Typography>
                  </Stack>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: REPAIRS_UI.textPrimary }} noWrap title={o.title || ''}>
                    {o.title || 'Untitled custom'}
                  </Typography>
                  <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
                    <PersonIcon sx={{ fontSize: 15, color: REPAIRS_UI.textSecondary }} />
                    <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }} noWrap>
                      {o.customerName || o.clientID || '—'}
                    </Typography>
                  </Stack>
                  <Divider sx={{ my: 1.5, borderColor: REPAIRS_UI.border }} />
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" sx={{ color: REPAIRS_UI.textSecondary }}>Quote</Typography>
                    <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.accent }}>{money(o.quote?.quoteTotal)}</Typography>
                  </Stack>
                </CardContent>
              </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* New custom dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm" PaperProps={dialogPaperProps}>
        <DialogTitle>New Custom Order</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Customer name" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} fullWidth />
            <TextField label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} fullWidth />
            <TextField label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} fullWidth multiline rows={3} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} sx={{ color: REPAIRS_UI.textSecondary }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={create}
            disabled={saving || (!form.customerName && !form.title)}
            sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, '&:hover': { backgroundColor: '#C19B2E' } }}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={5000} onClose={closeSnack} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={closeSnack} severity={snack.severity} sx={{ backgroundColor: REPAIRS_UI.bgCard, color: REPAIRS_UI.textPrimary, border: `1px solid ${REPAIRS_UI.border}` }}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
