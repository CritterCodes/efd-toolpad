'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Paper, TextField, InputAdornment,
  FormControl, InputLabel, Select, MenuItem, IconButton, Tooltip, CircularProgress,
  Snackbar, Alert, Stack,
} from '@mui/material';
import HandymanIcon from '@mui/icons-material/Handyman';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import AssignmentLateIcon from '@mui/icons-material/AssignmentLate';
import ViewListIcon from '@mui/icons-material/ViewList';
import InboxIcon from '@mui/icons-material/Inbox';
import DesignServicesIcon from '@mui/icons-material/DesignServices';
import { useRouter } from 'next/navigation';

import { REPAIRS_UI, repairsMenuProps } from '@/app/dashboard/repairs/components/repairsUi';
import BenchWorkCard from './components/BenchWorkCard';

const LANE_OPTIONS = [
  { value: 'all', label: 'All lanes' },
  { value: 'bench_jewelry', label: 'Bench' },
  { value: 'cad', label: 'CAD' },
  { value: 'engraving', label: 'Engraving' },
  { value: 'gem_cutting', label: 'Gem Cutting' },
];

function MetricCard({ icon: Icon, label, value, accent }) {
  return (
    <Card
      sx={{
        height: '100%',
        backgroundColor: REPAIRS_UI.bgCard,
        backgroundImage: 'none',
        border: `1px solid ${REPAIRS_UI.border}`,
        borderRadius: 2,
      }}
    >
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 44,
            height: 44,
            borderRadius: 2,
            backgroundColor: REPAIRS_UI.bgTertiary,
            border: `1px solid ${REPAIRS_UI.border}`,
          }}
        >
          <Icon sx={{ color: accent || REPAIRS_UI.accent, fontSize: 22 }} />
        </Box>
        <Box>
          <Typography sx={{ fontSize: 28, fontWeight: 700, color: REPAIRS_UI.textHeader, lineHeight: 1.1 }}>
            {value}
          </Typography>
          <Typography sx={{ fontSize: '0.78rem', color: REPAIRS_UI.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {label}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function BenchPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyID, setBusyID] = useState('');
  const [search, setSearch] = useState('');
  const [lane, setLane] = useState('all');
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  const showSnack = (message, severity = 'success') => setSnack({ open: true, message, severity });
  const closeSnack = () => setSnack((s) => ({ ...s, open: false }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bench/my-bench');
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to load bench');
      setItems(await res.json());
    } catch (e) {
      showSnack(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const act = async (wo, action, successMsg) => {
    setBusyID(wo.workOrderID);
    try {
      const res = await fetch(`/api/bench/work-orders/${wo.workOrderID}/${action}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `${action} failed`);
      showSnack(successMsg, 'success');
      await load();
    } catch (e) {
      showSnack(e.message, 'error');
    } finally {
      setBusyID('');
    }
  };

  const metrics = useMemo(() => {
    const lanes = new Set(items.map((w) => w.discipline));
    return {
      active: items.length,
      rush: items.filter((w) => w.isRush).length,
      unclaimed: items.filter((w) => !w.assignedToUserID).length,
      lanes: lanes.size,
    };
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((w) => {
      if (lane !== 'all' && w.discipline !== lane) return false;
      if (!q) return true;
      const s = w.source || {};
      const hay = [
        w.title, w.status, w.assignedJeweler, w.sourceID,
        s.clientName, s.businessName, s.designName, s.sku,
      ].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [items, search, lane]);

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
              <HandymanIcon sx={{ fontSize: 16, color: REPAIRS_UI.accent }} />
              Workshop
            </Typography>
            <Typography sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 1 }}>
              Bench
            </Typography>
            <Typography sx={{ color: REPAIRS_UI.textSecondary, lineHeight: 1.6 }}>
              All active work across your disciplines — repairs, production pieces, customs and sale service.
            </Typography>
          </Box>
          <Tooltip title="Refresh">
            <IconButton
              onClick={load}
              sx={{
                color: REPAIRS_UI.textPrimary,
                border: `1px solid ${REPAIRS_UI.border}`,
                backgroundColor: REPAIRS_UI.bgCard,
                '&:hover': { backgroundColor: REPAIRS_UI.bgTertiary },
              }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* Metric cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}><MetricCard icon={ViewListIcon} label="Active work" value={metrics.active} /></Grid>
        <Grid item xs={6} md={3}><MetricCard icon={PriorityHighIcon} label="Rush" value={metrics.rush} accent="#EF5350" /></Grid>
        <Grid item xs={6} md={3}><MetricCard icon={AssignmentLateIcon} label="Unclaimed" value={metrics.unclaimed} accent="#FFB74D" /></Grid>
        <Grid item xs={6} md={3}><MetricCard icon={DesignServicesIcon} label="Lanes" value={metrics.lanes} /></Grid>
      </Grid>

      {/* Filter bar */}
      <Paper
        sx={{
          p: 2, mb: 3,
          backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none',
          border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none',
        }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
          <TextField
            placeholder="Search work, client, design, status…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: REPAIRS_UI.textSecondary }} />
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Lane</InputLabel>
            <Select
              value={lane}
              label="Lane"
              onChange={(e) => setLane(e.target.value)}
              MenuProps={repairsMenuProps}
            >
              {LANE_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {/* Grid / states */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: REPAIRS_UI.accent }} />
        </Box>
      ) : filtered.length === 0 ? (
        <Paper
          sx={{
            p: 6, textAlign: 'center',
            backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none',
            border: `1px dashed ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none',
          }}
        >
          <InboxIcon sx={{ fontSize: 48, color: REPAIRS_UI.textMuted, mb: 1 }} />
          <Typography sx={{ color: REPAIRS_UI.textSecondary }}>
            {items.length === 0
              ? 'No active bench work in your lanes.'
              : 'No work matches your filters.'}
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {filtered.map((wo) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={wo.workOrderID}>
              <BenchWorkCard
                wo={wo}
                busy={busyID === wo.workOrderID}
                onClaim={(w) => act(w, 'claim', 'Work claimed')}
                onComplete={(w) => act(w, 'complete', 'Work completed — labor logged')}
                onOpenRepair={(w) => router.push(`/dashboard/repairs/${w.sourceID}`)}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <Snackbar
        open={snack.open}
        autoHideDuration={5000}
        onClose={closeSnack}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={closeSnack}
          severity={snack.severity}
          sx={{
            backgroundColor: REPAIRS_UI.bgCard,
            color: REPAIRS_UI.textPrimary,
            border: `1px solid ${REPAIRS_UI.border}`,
          }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
