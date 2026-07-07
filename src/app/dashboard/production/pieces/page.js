'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Button, Grid, Paper, TextField, InputAdornment,
  FormControl, InputLabel, Select, MenuItem, Stack, Chip, CircularProgress, Snackbar, Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import SearchIcon from '@mui/icons-material/Search';
import InboxIcon from '@mui/icons-material/Inbox';
import PaymentsIcon from '@mui/icons-material/Payments';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';

import { REPAIRS_UI, repairsMenuProps } from '@/app/dashboard/repairs/components/repairsUi';
import MetricCard from '@/components/production/MetricCard';
import ProductionEntityCard from '@/components/production/ProductionEntityCard';
import { primaryImageOf } from '@/components/production/media/EntityThumbnail';

const STATUS_OPTIONS = ['all', 'planned', 'casting_ordered', 'in_finishing', 'qc', 'completed', 'available', 'reserved', 'sold', 'scrapped', 'returned'];
const STATUS_COLOR = { planned: REPAIRS_UI.textMuted, in_finishing: '#64B5F6', qc: '#FFB74D', completed: '#66BB6A', available: '#66BB6A', sold: REPAIRS_UI.accent };
const money = (n) => `$${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// U-7 — browse-only card via the shared <ProductionEntityCard> (thumbnail + chips + meta + footer).
function PieceCard({ piece }) {
  const p = piece;
  const woCount = Array.isArray(p.workOrderIDs) ? p.workOrderIDs.length : 0;
  const chips = [
    <Chip key="status" size="small" label={(p.status || 'planned').replace(/_/g, ' ')} sx={{ backgroundColor: `${STATUS_COLOR[p.status] || REPAIRS_UI.textMuted}22`, color: STATUS_COLOR[p.status] || REPAIRS_UI.textMuted, textTransform: 'capitalize', fontWeight: 700 }} />,
    ...(!p.designID ? [<Chip key="handmade" size="small" label="Handmade" sx={{ backgroundColor: REPAIRS_UI.bgTertiary, color: REPAIRS_UI.textSecondary, border: `1px solid ${REPAIRS_UI.border}` }} />] : []),
  ];
  return (
    <ProductionEntityCard
      image={primaryImageOf(p)}
      id={p.pieceID ? p.pieceID.slice(0, 8) : null}
      title={p.sku || p.pieceID?.slice(0, 8) || 'Piece'}
      meta={[p.metalType, p.karat].filter(Boolean).join(' ') || '—'}
      chips={chips}
      footerLeft={<Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}><BuildCircleIcon sx={{ fontSize: 15 }} />{woCount} WO{woCount === 1 ? '' : 's'}</Box>}
      footerRight={<Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}><PaymentsIcon sx={{ fontSize: 15 }} />COGS {money(p.totalCOGS)}</Box>}
      href={`/dashboard/production/pieces/${p.pieceID}`}
    />
  );
}

export default function ProductionPiecesPage() {
  const router = useRouter();
  const [pieces, setPieces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  const showSnack = (message, severity = 'success') => setSnack({ open: true, message, severity });
  const closeSnack = () => setSnack((s) => ({ ...s, open: false }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/production/pieces');
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to load pieces');
      setPieces(await res.json());
    } catch (e) { showSnack(e.message, 'error'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const metrics = useMemo(() => ({
    total: pieces.length,
    inProduction: pieces.filter((p) => ['casting_ordered', 'in_finishing', 'qc'].includes(p.status)).length,
    cogs: pieces.reduce((sum, p) => sum + (Number(p.totalCOGS) || 0), 0),
  }), [pieces]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return pieces.filter((p) => {
      if (status !== 'all' && (p.status || 'planned') !== status) return false;
      if (!q) return true;
      return [p.sku, p.pieceID, p.designID, p.metalType].filter(Boolean).join(' ').toLowerCase().includes(q);
    });
  }, [pieces, search, status]);

  return (
    <Box sx={{ pb: 6 }}>
      <Box sx={{ backgroundColor: { xs: 'transparent', sm: REPAIRS_UI.bgPanel }, border: { xs: 'none', sm: `1px solid ${REPAIRS_UI.border}` }, borderRadius: { xs: 0, sm: 3 }, boxShadow: { xs: 'none', sm: REPAIRS_UI.shadow }, p: { xs: 0.5, sm: 2.5, md: 3 }, mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box sx={{ maxWidth: 920 }}>
            <Typography sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, px: 1.25, py: 0.5, mb: 1.5, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', color: REPAIRS_UI.textPrimary, backgroundColor: REPAIRS_UI.bgCard, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, textTransform: 'uppercase' }}>
              <PrecisionManufacturingIcon sx={{ fontSize: 16, color: REPAIRS_UI.accent }} />
              Production Catalog
            </Typography>
            <Typography sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 1 }}>Pieces</Typography>
            <Typography sx={{ color: REPAIRS_UI.textSecondary, lineHeight: 1.6 }}>
              A physical instance produced from a design (or handmade). Carries actual COGS — materials at cost + labor from its bench work orders.
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => router.push('/dashboard/production/pieces/new')} sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, '&:hover': { backgroundColor: '#C19B2E' } }}>New Piece</Button>
        </Stack>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={4}><MetricCard icon={PrecisionManufacturingIcon} label="Total" value={metrics.total} /></Grid>
        <Grid item xs={4}><MetricCard icon={BuildCircleIcon} label="In production" value={metrics.inProduction} accent="#64B5F6" /></Grid>
        <Grid item xs={4}><MetricCard icon={PaymentsIcon} label="Total COGS" value={money(metrics.cogs)} /></Grid>
      </Grid>

      <Paper sx={{ p: 2, mb: 2, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
          <TextField placeholder="Search by SKU, ID, design, metal…" value={search} onChange={(e) => setSearch(e.target.value)} size="small" fullWidth
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
            {pieces.length === 0 ? 'No pieces yet. Create one (handmade or from a design).' : 'No pieces match your filters.'}
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {filtered.map((p) => (
            <Grid item xs={12} sm={6} md={4} key={p.pieceID}>
              <PieceCard piece={p} />
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
