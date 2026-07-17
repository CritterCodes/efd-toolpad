'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Button, Paper, TextField, InputAdornment, FormControl, InputLabel,
  Select, MenuItem, Stack, Chip, CircularProgress, Snackbar, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import SearchIcon from '@mui/icons-material/Search';
import InboxIcon from '@mui/icons-material/Inbox';
import EditIcon from '@mui/icons-material/Edit';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import EventIcon from '@mui/icons-material/Event';

import { REPAIRS_UI, repairsMenuProps } from '@/app/dashboard/repairs/components/repairsUi';

const STATUS_OPTIONS = ['all', 'draft', 'scheduled', 'released', 'archived'];
const STATUS_COLOR = {
  draft: REPAIRS_UI.textMuted,
  scheduled: '#FFB74D',
  released: '#66BB6A',
  archived: REPAIRS_UI.textMuted,
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

export default function DropsPage() {
  const router = useRouter();
  const [drops, setDrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  const showSnack = (message, severity = 'error') => setSnack({ open: true, message, severity });
  const closeSnack = () => setSnack((s) => ({ ...s, open: false }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/production/drops');
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to load drops');
      setDrops(await res.json());
    } catch (e) {
      showSnack(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return drops.filter((d) => {
      if (status !== 'all' && (d.status || 'draft') !== status) return false;
      if (!q) return true;
      return [d.name, d.slug, d.description].filter(Boolean).join(' ').toLowerCase().includes(q);
    });
  }, [drops, search, status]);

  const metrics = useMemo(() => ({
    total: drops.length,
    scheduled: drops.filter((d) => d.status === 'scheduled').length,
    released: drops.filter((d) => d.status === 'released').length,
  }), [drops]);

  return (
    <Box sx={{ pb: 6 }}>
      <Box sx={{
        backgroundColor: { xs: 'transparent', sm: REPAIRS_UI.bgPanel },
        border: { xs: 'none', sm: `1px solid ${REPAIRS_UI.border}` },
        borderRadius: { xs: 0, sm: 3 },
        boxShadow: { xs: 'none', sm: REPAIRS_UI.shadow },
        p: { xs: 0.5, sm: 2.5, md: 3 },
        mb: 3,
      }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography sx={{
              display: 'inline-flex', alignItems: 'center', gap: 1,
              px: 1.25, py: 0.5, mb: 1.5, fontSize: '0.72rem', fontWeight: 700,
              letterSpacing: '0.08em', color: REPAIRS_UI.textPrimary,
              backgroundColor: REPAIRS_UI.bgCard, border: `1px solid ${REPAIRS_UI.border}`,
              borderRadius: 2, textTransform: 'uppercase',
            }}>
              <RocketLaunchIcon sx={{ fontSize: 16, color: REPAIRS_UI.accent }} />
              Products
            </Typography>
            <Typography sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 0.5 }}>
              Drops
            </Typography>
            <Typography sx={{ color: REPAIRS_UI.textSecondary, lineHeight: 1.6 }}>
              Release drops own their timing and contain the designs and pieces for that release.
            </Typography>
            <Stack direction="row" spacing={3} sx={{ mt: 2 }}>
              {[
                { label: 'Total', value: metrics.total },
                { label: 'Scheduled', value: metrics.scheduled, color: '#FFB74D' },
                { label: 'Released', value: metrics.released, color: '#66BB6A' },
              ].map(({ label, value, color }) => (
                <Box key={label}>
                  <Typography sx={{ fontSize: 22, fontWeight: 700, color: color || REPAIRS_UI.textHeader, lineHeight: 1 }}>{value}</Typography>
                  <Typography sx={{ fontSize: '0.72rem', color: REPAIRS_UI.textSecondary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</Typography>
                </Box>
              ))}
            </Stack>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => router.push('/dashboard/products/drops/new')}
            sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, '&:hover': { backgroundColor: '#C19B2E' } }}
          >
            New Drop
          </Button>
        </Stack>
      </Box>

      <Paper sx={{ p: 2, mb: 2, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
          <TextField
            placeholder="Search by name, slug, description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            fullWidth
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: REPAIRS_UI.textSecondary }} /></InputAdornment> }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Status</InputLabel>
            <Select value={status} label="Status" onChange={(e) => setStatus(e.target.value)} MenuProps={repairsMenuProps}>
              {STATUS_OPTIONS.map((s) => (
                <MenuItem key={s} value={s}>{s === 'all' ? 'All statuses' : s}</MenuItem>
              ))}
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
            {drops.length === 0 ? 'No drops yet. Create one to start a release.' : 'No drops match your filters.'}
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { color: REPAIRS_UI.textSecondary, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${REPAIRS_UI.border}`, fontWeight: 600 } }}>
                <TableCell>Name</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Owner</TableCell>
                <TableCell><EventIcon sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />Release</TableCell>
                <TableCell>Designs</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((drop) => (
                <TableRow
                  key={drop.dropId}
                  hover
                  sx={{ cursor: 'pointer', '& td': { borderBottom: `1px solid ${REPAIRS_UI.border}`, color: REPAIRS_UI.textPrimary }, '&:hover': { backgroundColor: REPAIRS_UI.bgTertiary } }}
                  onClick={() => router.push(`/dashboard/products/drops/${drop.dropId}`)}
                >
                  <TableCell>
                    <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader, fontSize: '0.9rem' }}>{drop.name}</Typography>
                    <Typography sx={{ color: REPAIRS_UI.textMuted, fontSize: '0.75rem' }}>{drop.slug}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={drop.status || 'draft'}
                      sx={{
                        backgroundColor: `${STATUS_COLOR[drop.status] || REPAIRS_UI.textMuted}22`,
                        color: STATUS_COLOR[drop.status] || REPAIRS_UI.textMuted,
                        textTransform: 'capitalize',
                        fontWeight: 700,
                        fontSize: '0.72rem',
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ color: REPAIRS_UI.textSecondary, fontSize: '0.85rem' }}>
                    {drop.ownerType === 'artisan' ? (drop.ownerInfo?.name || drop.ownerId || 'Artisan') : 'EFD'}
                  </TableCell>
                  <TableCell sx={{ color: REPAIRS_UI.textSecondary, fontSize: '0.85rem' }}>
                    {fmtDate(drop.releaseAt)}
                  </TableCell>
                  <TableCell sx={{ color: REPAIRS_UI.textSecondary, fontSize: '0.85rem' }}>
                    {Array.isArray(drop.designOrder) ? drop.designOrder.length : 0}
                  </TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <Tooltip title="Open drop">
                        <IconButton size="small" onClick={() => router.push(`/dashboard/products/drops/${drop.dropId}`)} sx={{ color: REPAIRS_UI.textSecondary }}>
                          <OpenInNewIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit drop">
                        <IconButton size="small" onClick={() => router.push(`/dashboard/products/drops/${drop.dropId}/edit`)} sx={{ color: REPAIRS_UI.textSecondary }}>
                          <EditIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Snackbar open={snack.open} autoHideDuration={5000} onClose={closeSnack} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={closeSnack} severity={snack.severity} sx={{ backgroundColor: REPAIRS_UI.bgCard, color: REPAIRS_UI.textPrimary, border: `1px solid ${REPAIRS_UI.border}` }}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
