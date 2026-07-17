'use client';

import React, { useEffect, useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Button, Paper, Stack, Chip, CircularProgress, Snackbar, Alert,
  Tab, Tabs, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Tooltip,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import DesignServicesIcon from '@mui/icons-material/DesignServices';
import DiamondIcon from '@mui/icons-material/AutoAwesome';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';

import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

const STATUS_COLOR = {
  draft: REPAIRS_UI.textMuted,
  scheduled: '#FFB74D',
  released: '#66BB6A',
  archived: REPAIRS_UI.textMuted,
};

const PIECE_STATUS_COLOR = {
  available: '#66BB6A',
  completed: '#66BB6A',
  qc: '#FFB74D',
  in_finishing: '#64B5F6',
  planned: REPAIRS_UI.textMuted,
  sold: REPAIRS_UI.accent,
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

function DesignsTab({ dropId, designs, loading, onNewDesign }) {
  const router = useRouter();
  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress sx={{ color: REPAIRS_UI.accent }} /></Box>;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography sx={{ color: REPAIRS_UI.textSecondary, fontSize: '0.85rem' }}>
          {designs.length} design{designs.length !== 1 ? 's' : ''} in this drop
        </Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => router.push(`/dashboard/products/drops/${dropId}/designs/new`)}
          sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, '&:hover': { backgroundColor: '#C19B2E' } }}
        >
          Add Design
        </Button>
      </Stack>
      {designs.length === 0 ? (
        <Paper sx={{ p: 5, textAlign: 'center', backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px dashed ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
          <DesignServicesIcon sx={{ fontSize: 40, color: REPAIRS_UI.textMuted, mb: 1 }} />
          <Typography sx={{ color: REPAIRS_UI.textSecondary }}>No designs yet. Add one to this drop.</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { color: REPAIRS_UI.textSecondary, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${REPAIRS_UI.border}`, fontWeight: 600 } }}>
                <TableCell>Name</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Edition</TableCell>
                <TableCell>Variants</TableCell>
                <TableCell>CAD</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {designs.map((d) => (
                <TableRow
                  key={d.designID}
                  hover
                  sx={{ cursor: 'pointer', '& td': { borderBottom: `1px solid ${REPAIRS_UI.border}`, color: REPAIRS_UI.textPrimary }, '&:hover': { backgroundColor: REPAIRS_UI.bgTertiary } }}
                  onClick={() => router.push(`/dashboard/products/drops/${dropId}/designs/${d.designID}/edit`)}
                >
                  <TableCell>
                    <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader, fontSize: '0.9rem' }}>{d.name || 'Untitled'}</Typography>
                    {d.category && <Typography sx={{ color: REPAIRS_UI.textMuted, fontSize: '0.75rem' }}>{d.category}</Typography>}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={(d.status || 'draft').replace(/_/g, ' ')}
                      sx={{ backgroundColor: `${STATUS_COLOR[d.status] || REPAIRS_UI.textMuted}22`, color: STATUS_COLOR[d.status] || REPAIRS_UI.textMuted, textTransform: 'capitalize', fontWeight: 700, fontSize: '0.72rem' }}
                    />
                  </TableCell>
                  <TableCell sx={{ color: REPAIRS_UI.textSecondary, fontSize: '0.85rem' }}>
                    {d.edition?.type?.replace(/_/g, ' ') || 'unlimited'}
                  </TableCell>
                  <TableCell sx={{ color: REPAIRS_UI.textSecondary, fontSize: '0.85rem' }}>
                    {Array.isArray(d.variants) ? d.variants.length : 0}
                  </TableCell>
                  <TableCell>
                    {d.cadRevisions?.length || d.stlVolumeCm3 ? (
                      <CheckCircleIcon sx={{ fontSize: 16, color: '#66BB6A' }} />
                    ) : (
                      <RadioButtonUncheckedIcon sx={{ fontSize: 16, color: REPAIRS_UI.textMuted }} />
                    )}
                  </TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <Tooltip title="Edit design">
                      <IconButton size="small" onClick={() => router.push(`/dashboard/products/drops/${dropId}/designs/${d.designID}/edit`)} sx={{ color: REPAIRS_UI.textSecondary }}>
                        <EditIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

function PiecesTab({ pieces, loading, designs }) {
  const designMap = Object.fromEntries((designs || []).map((d) => [d.designID, d]));

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress sx={{ color: REPAIRS_UI.accent }} /></Box>;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography sx={{ color: REPAIRS_UI.textSecondary, fontSize: '0.85rem' }}>
          {pieces.length} piece{pieces.length !== 1 ? 's' : ''} in this drop — manage from a design variant
        </Typography>
      </Stack>
      {pieces.length === 0 ? (
        <Paper sx={{ p: 5, textAlign: 'center', backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px dashed ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
          <DiamondIcon sx={{ fontSize: 40, color: REPAIRS_UI.textMuted, mb: 1 }} />
          <Typography sx={{ color: REPAIRS_UI.textSecondary }}>No physical pieces yet.</Typography>
          <Typography sx={{ color: REPAIRS_UI.textMuted, fontSize: '0.85rem', mt: 0.5 }}>
            Designs without pieces are made-to-order. Open a design to create a piece from a variant.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { color: REPAIRS_UI.textSecondary, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${REPAIRS_UI.border}`, fontWeight: 600 } }}>
                <TableCell>SKU / ID</TableCell>
                <TableCell>Design</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Fulfillment</TableCell>
                <TableCell>Metal</TableCell>
                <TableCell>Edition #</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pieces.map((p) => {
                const design = designMap[p.designID];
                const isRTS = p.status === 'available' || p.status === 'completed' || p.status === 'qc';
                return (
                  <TableRow key={p.pieceID} sx={{ '& td': { borderBottom: `1px solid ${REPAIRS_UI.border}`, color: REPAIRS_UI.textPrimary } }}>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader, fontSize: '0.85rem' }}>{p.sku || p.pieceID?.slice(0, 12)}</Typography>
                    </TableCell>
                    <TableCell sx={{ color: REPAIRS_UI.textSecondary, fontSize: '0.85rem' }}>
                      {design?.name || p.designID?.slice(0, 8) || '—'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={(p.status || 'planned').replace(/_/g, ' ')}
                        sx={{ backgroundColor: `${PIECE_STATUS_COLOR[p.status] || REPAIRS_UI.textMuted}22`, color: PIECE_STATUS_COLOR[p.status] || REPAIRS_UI.textMuted, textTransform: 'capitalize', fontWeight: 700, fontSize: '0.72rem' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={isRTS ? 'Ready to Ship' : 'Made to Order'}
                        icon={isRTS ? <CheckCircleIcon sx={{ fontSize: 14 }} /> : undefined}
                        sx={{ backgroundColor: isRTS ? '#66BB6A22' : `${REPAIRS_UI.accent}22`, color: isRTS ? '#66BB6A' : REPAIRS_UI.accent, fontWeight: 700, fontSize: '0.72rem' }}
                      />
                    </TableCell>
                    <TableCell sx={{ color: REPAIRS_UI.textSecondary, fontSize: '0.85rem' }}>
                      {[p.metalType, p.karat].filter(Boolean).join(' ') || '—'}
                    </TableCell>
                    <TableCell sx={{ color: REPAIRS_UI.textSecondary, fontSize: '0.85rem' }}>
                      {p.editionNumber ?? '—'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

export default function DropDetailPage({ params }) {
  const router = useRouter();
  const { dropId } = use(params);
  const [drop, setDrop] = useState(null);
  const [designs, setDesigns] = useState([]);
  const [pieces, setPieces] = useState([]);
  const [dropLoading, setDropLoading] = useState(true);
  const [designsLoading, setDesignsLoading] = useState(true);
  const [piecesLoading, setPiecesLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'error' });

  const showSnack = (message, severity = 'error') => setSnack({ open: true, message, severity });
  const closeSnack = () => setSnack((s) => ({ ...s, open: false }));

  const loadDrop = useCallback(async () => {
    setDropLoading(true);
    try {
      const res = await fetch(`/api/production/drops/${dropId}`);
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Drop not found');
      setDrop(await res.json());
    } catch (e) {
      showSnack(e.message);
    } finally {
      setDropLoading(false);
    }
  }, [dropId]);

  const loadDesigns = useCallback(async () => {
    setDesignsLoading(true);
    try {
      const res = await fetch(`/api/production/designs?dropID=${dropId}`);
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to load designs');
      setDesigns(await res.json());
    } catch (e) {
      showSnack(e.message);
    } finally {
      setDesignsLoading(false);
    }
  }, [dropId]);

  const loadPieces = useCallback(async () => {
    setPiecesLoading(true);
    try {
      const res = await fetch(`/api/production/pieces?dropId=${dropId}`);
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to load pieces');
      setPieces(await res.json());
    } catch (e) {
      showSnack(e.message);
    } finally {
      setPiecesLoading(false);
    }
  }, [dropId]);

  useEffect(() => {
    loadDrop();
    loadDesigns();
    loadPieces();
  }, [loadDrop, loadDesigns, loadPieces]);

  const STATUS_COLOR_LOCAL = {
    draft: REPAIRS_UI.textMuted,
    scheduled: '#FFB74D',
    released: '#66BB6A',
    archived: REPAIRS_UI.textMuted,
  };

  if (dropLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress sx={{ color: REPAIRS_UI.accent }} /></Box>;
  }

  if (!drop) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography sx={{ color: REPAIRS_UI.textSecondary }}>Drop not found.</Typography>
        <Button onClick={() => router.push('/dashboard/products/drops')} sx={{ mt: 2, color: REPAIRS_UI.accent }}>Back to Drops</Button>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 6 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/dashboard/products/drops')} sx={{ color: REPAIRS_UI.textSecondary }}>
          Drops
        </Button>
        <Typography sx={{ color: REPAIRS_UI.textMuted }}>/</Typography>
        <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 600 }}>{drop.name}</Typography>
      </Stack>

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
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <RocketLaunchIcon sx={{ fontSize: 20, color: REPAIRS_UI.accent }} />
              <Typography sx={{ fontSize: { xs: 24, md: 32 }, fontWeight: 600, color: REPAIRS_UI.textHeader }}>
                {drop.name}
              </Typography>
              <Chip
                size="small"
                label={drop.status || 'draft'}
                sx={{ backgroundColor: `${STATUS_COLOR_LOCAL[drop.status] || REPAIRS_UI.textMuted}22`, color: STATUS_COLOR_LOCAL[drop.status] || REPAIRS_UI.textMuted, textTransform: 'capitalize', fontWeight: 700 }}
              />
            </Stack>
            {drop.description && (
              <Typography sx={{ color: REPAIRS_UI.textSecondary, lineHeight: 1.6, mb: 1 }}>{drop.description}</Typography>
            )}
            <Stack direction="row" spacing={3} sx={{ mt: 1 }}>
              <Box>
                <Typography sx={{ fontSize: '0.72rem', color: REPAIRS_UI.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Owner</Typography>
                <Typography sx={{ color: REPAIRS_UI.textSecondary, fontSize: '0.9rem' }}>
                  {drop.ownerType === 'artisan' ? (drop.ownerInfo?.name || drop.ownerId || 'Artisan') : 'EFD (house)'}
                </Typography>
              </Box>
              {drop.releaseAt && (
                <Box>
                  <Typography sx={{ fontSize: '0.72rem', color: REPAIRS_UI.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Release</Typography>
                  <Typography sx={{ color: REPAIRS_UI.textSecondary, fontSize: '0.9rem' }}>{fmtDate(drop.releaseAt)}</Typography>
                </Box>
              )}
              {Array.isArray(drop.channels) && drop.channels.length > 0 && (
                <Box>
                  <Typography sx={{ fontSize: '0.72rem', color: REPAIRS_UI.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Channels</Typography>
                  <Typography sx={{ color: REPAIRS_UI.textSecondary, fontSize: '0.9rem' }}>{drop.channels.join(', ')}</Typography>
                </Box>
              )}
            </Stack>
          </Box>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => router.push(`/dashboard/products/drops/${dropId}/edit`)}
            sx={{ color: REPAIRS_UI.accent, borderColor: REPAIRS_UI.accent }}
          >
            Edit Drop
          </Button>
        </Stack>
      </Box>

      <Box sx={{ borderBottom: `1px solid ${REPAIRS_UI.border}`, mb: 3 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            '& .MuiTab-root': { color: REPAIRS_UI.textSecondary, textTransform: 'none', fontWeight: 600 },
            '& .Mui-selected': { color: REPAIRS_UI.accent },
            '& .MuiTabs-indicator': { backgroundColor: REPAIRS_UI.accent },
          }}
        >
          <Tab label={`Designs (${designs.length})`} />
          <Tab label={`Pieces (${pieces.length})`} />
        </Tabs>
      </Box>

      {tab === 0 && (
        <DesignsTab dropId={dropId} designs={designs} loading={designsLoading} />
      )}
      {tab === 1 && (
        <PiecesTab pieces={pieces} loading={piecesLoading} designs={designs} />
      )}

      <Snackbar open={snack.open} autoHideDuration={5000} onClose={closeSnack} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={closeSnack} severity={snack.severity} sx={{ backgroundColor: REPAIRS_UI.bgCard, color: REPAIRS_UI.textPrimary, border: `1px solid ${REPAIRS_UI.border}` }}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
