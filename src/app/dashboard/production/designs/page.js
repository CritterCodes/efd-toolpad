'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Button, Grid, Paper, TextField, InputAdornment,
  FormControl, InputLabel, Select, MenuItem, Stack, Chip, CircularProgress, Snackbar, Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DesignServicesIcon from '@mui/icons-material/DesignServices';
import SearchIcon from '@mui/icons-material/Search';
import InboxIcon from '@mui/icons-material/Inbox';
import CalculateIcon from '@mui/icons-material/Calculate';
import DiamondIcon from '@mui/icons-material/AutoAwesome';

import { REPAIRS_UI, repairsMenuProps } from '@/app/dashboard/repairs/components/repairsUi';
import MetricCard from '@/components/production/MetricCard';
import ProductionEntityCard from '@/components/production/ProductionEntityCard';

const STATUS_OPTIONS = ['all', 'concept', 'cad', 'approved_for_production', 'retired'];
const STATUS_COLOR = { concept: REPAIRS_UI.textMuted, cad: '#64B5F6', approved_for_production: '#66BB6A', retired: REPAIRS_UI.textMuted };
const money = (n) => `$${(Number(n) || 0).toLocaleString()}`;

// U-7/U-8 — browse-only card via the shared <ProductionEntityCard>. The on-card STL/CAD upload
// (old M2-T4 control) is removed here; it relocates to the design detail (U-9) + form (U-12).
function DesignCard({ design }) {
  const d = design;
  const chips = [
    <Chip key="status" size="small" label={(d.status || 'concept').replace(/_/g, ' ')} sx={{ backgroundColor: `${STATUS_COLOR[d.status] || REPAIRS_UI.textMuted}22`, color: STATUS_COLOR[d.status] || REPAIRS_UI.textMuted, textTransform: 'capitalize', fontWeight: 700 }} />,
    ...(d.gemstoneId ? [<Chip key="gem" size="small" icon={<DiamondIcon sx={{ fontSize: 14 }} />} label="Gem-linked" sx={{ backgroundColor: REPAIRS_UI.bgTertiary, color: REPAIRS_UI.accent, border: `1px solid ${REPAIRS_UI.border}` }} />] : []),
    ...(d.cadFiles?.length ? [<Chip key="cad" size="small" label={`CAD ✓ ${d.cadFiles.length}`} sx={{ backgroundColor: '#66BB6A22', color: '#66BB6A', fontWeight: 700 }} />] : []),
  ];
  return (
    <ProductionEntityCard
      image={d.renders?.[0] || d.referenceImages?.[0] || null}
      title={d.name || 'Untitled design'}
      description={d.description || null}
      chips={chips}
      footerLeft={<span>{d.estCost != null ? `est ${money(d.estCost)}` : 'no estimate'}</span>}
      href={`/dashboard/production/designs/${d.designID}`}
    />
  );
}

export default function ProductionDesignsPage() {
  const router = useRouter();
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  const showSnack = (message, severity = 'success') => setSnack({ open: true, message, severity });
  const closeSnack = () => setSnack((s) => ({ ...s, open: false }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/production/designs');
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to load designs');
      setDesigns(await res.json());
    } catch (e) { showSnack(e.message, 'error'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const metrics = useMemo(() => ({
    total: designs.length,
    withCad: designs.filter((d) => d.cadFiles?.length || d.stlVolumeCm3).length,
    gemLinked: designs.filter((d) => d.gemstoneId).length,
  }), [designs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return designs.filter((d) => {
      if (status !== 'all' && (d.status || 'concept') !== status) return false;
      if (!q) return true;
      return [d.name, d.description].filter(Boolean).join(' ').toLowerCase().includes(q);
    });
  }, [designs, search, status]);

  return (
    <Box sx={{ pb: 6 }}>
      <Box sx={{ backgroundColor: { xs: 'transparent', sm: REPAIRS_UI.bgPanel }, border: { xs: 'none', sm: `1px solid ${REPAIRS_UI.border}` }, borderRadius: { xs: 0, sm: 3 }, boxShadow: { xs: 'none', sm: REPAIRS_UI.shadow }, p: { xs: 0.5, sm: 2.5, md: 3 }, mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box sx={{ maxWidth: 920 }}>
            <Typography sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, px: 1.25, py: 0.5, mb: 1.5, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', color: REPAIRS_UI.textPrimary, backgroundColor: REPAIRS_UI.bgCard, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, textTransform: 'uppercase' }}>
              <DesignServicesIcon sx={{ fontSize: 16, color: REPAIRS_UI.accent }} />
              Production Catalog
            </Typography>
            <Typography sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 1 }}>Designs</Typography>
            <Typography sx={{ color: REPAIRS_UI.textSecondary, lineHeight: 1.6 }}>
              A reusable manufacturing spec — CAD/BOM/routing + a live-metal cost estimate. CAD is optional (handmade designs skip it).
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => router.push('/dashboard/production/designs/new')} sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, '&:hover': { backgroundColor: '#C19B2E' } }}>New Design</Button>
        </Stack>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={4}><MetricCard icon={DesignServicesIcon} label="Total" value={metrics.total} /></Grid>
        <Grid item xs={4}><MetricCard icon={CalculateIcon} label="With CAD" value={metrics.withCad} accent="#64B5F6" /></Grid>
        <Grid item xs={4}><MetricCard icon={DiamondIcon} label="Gem-linked" value={metrics.gemLinked} /></Grid>
      </Grid>

      <Paper sx={{ p: 2, mb: 2, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
          <TextField placeholder="Search by name or description…" value={search} onChange={(e) => setSearch(e.target.value)} size="small" fullWidth
            InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ color: REPAIRS_UI.textSecondary }} /></InputAdornment>) }} />
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Status</InputLabel>
            <Select value={status} label="Status" onChange={(e) => setStatus(e.target.value)} MenuProps={repairsMenuProps}>
              {STATUS_OPTIONS.map((s) => <MenuItem key={s} value={s}>{s === 'all' ? 'All statuses' : s.replace(/_/g, ' ')}</MenuItem>)}
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
            {designs.length === 0 ? 'No designs yet. Create one to start the catalog.' : 'No designs match your filters.'}
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {filtered.map((d) => (
            <Grid item xs={12} sm={6} md={4} key={d.designID}>
              <DesignCard design={d} />
            </Grid>
          ))}
        </Grid>
      )}

      <Snackbar open={snack.open} autoHideDuration={5000} onClose={closeSnack} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={closeSnack} severity={snack.severity} sx={{ backgroundColor: REPAIRS_UI.bgCard, color: REPAIRS_UI.textPrimary, border: `1px solid ${REPAIRS_UI.border}` }}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}
