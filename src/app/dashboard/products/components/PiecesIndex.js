'use client';

/**
 * Every physical thing in the catalog.
 *
 * Designs are what EFD offers; pieces are what actually exists — the ring in the case, the stone
 * in the drawer. There was no page for them anywhere: the pieces API had filters and scoping but
 * nothing ever called it unscoped, so the only way to see stock was to open designs one at a time.
 *
 * ONE component, two scopes — the pieces API scopes an artisan to the designs they own, so the
 * artisan's "My Pieces" and admin's index are the same page with different wording.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Paper, Stack, Typography, Chip, Avatar, TextField, InputAdornment, MenuItem,
  CircularProgress, Divider,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import InventoryIcon from '@mui/icons-material/Inventory2';
import { REPAIRS_UI, repairsMenuProps } from '@/app/dashboard/repairs/components/repairsUi';

const panelSx = {
  p: 2, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none',
  border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none',
};
const fieldSx = {
  '& .MuiOutlinedInput-root': { color: REPAIRS_UI.textPrimary },
  '& .MuiInputLabel-root': { color: REPAIRS_UI.textMuted },
  '& .MuiOutlinedInput-notchedOutline': { borderColor: REPAIRS_UI.border },
};

const money = (v) => (Number.isFinite(Number(v)) && v !== null && v !== ''
  ? `$${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
  : '—');

const STATUS_COLOR = {
  available: '#4CAF50',
  reserved: '#FFB300',
  sold: '#9E9E9E',
  planned: '#64B5F6',
  casting_ordered: '#64B5F6',
  in_finishing: '#64B5F6',
  qc: '#64B5F6',
  completed: '#4CAF50',
  scrapped: '#E57373',
  cancelled: '#E57373',
  returned: '#E57373',
};

/** Statuses worth filtering by — the ones that describe stock, not production bookkeeping. */
const STATUS_FILTERS = ['available', 'reserved', 'sold', 'planned', 'scrapped'];

const firstImage = (design) => {
  const img = (design?.media?.images || [])[0];
  return typeof img === 'string' ? img : img?.url || null;
};

export function filterPieces(pieces, { search = '', status = 'all', designName = () => '' } = {}) {
  const q = search.trim().toLowerCase();
  return (pieces || []).filter((p) => {
    if (status !== 'all' && p.status !== status) return false;
    if (!q) return true;
    return `${designName(p.designID)} ${p.sku || ''} ${p.serialNumber || ''} ${p.metalType || ''} ${p.karat || ''}`
      .toLowerCase().includes(q);
  });
}

export default function PiecesIndex({
  title = 'Pieces',
  subtitle = 'Every physical item in the catalog — what exists, what it cost, what it sells for.',
  detailBase = '/dashboard/products/designs',
}) {
  const router = useRouter();
  const [pieces, setPieces] = useState([]);
  const [designs, setDesigns] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, dRes] = await Promise.all([
        fetch('/api/production/pieces'),
        fetch('/api/production/designs'),
      ]);
      if (!pRes.ok) throw new Error((await pRes.json().catch(() => ({}))).error || 'Failed to load pieces');
      const list = await pRes.json();
      const designList = dRes.ok ? await dRes.json() : [];
      setPieces(Array.isArray(list) ? list : []);
      setDesigns(Object.fromEntries((Array.isArray(designList) ? designList : []).map((d) => [d.designID, d])));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const designName = useCallback(
    (id) => designs[id]?.name || 'Unknown design',
    [designs],
  );

  const shown = useMemo(
    () => filterPieces(pieces, { search, status, designName }),
    [pieces, search, status, designName],
  );
  const stats = useMemo(() => ({
    total: pieces.length,
    available: pieces.filter((p) => p.status === 'available').length,
    sold: pieces.filter((p) => p.status === 'sold').length,
  }), [pieces]);

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, maxWidth: 1200, mx: 'auto', overflowX: 'hidden' }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: REPAIRS_UI.textHeader }}>{title}</Typography>
        <Typography variant="body2" sx={{ color: REPAIRS_UI.textMuted }}>{subtitle}</Typography>
      </Box>

      <Paper sx={{ ...panelSx, mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
          <TextField
            size="small" fullWidth placeholder="Search by design, SKU, serial or metal" value={search} sx={fieldSx}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: REPAIRS_UI.textMuted, fontSize: 18 }} /></InputAdornment> }}
          />
          <TextField select size="small" label="Status" value={status} sx={{ ...fieldSx, minWidth: { md: 180 } }}
            SelectProps={{ MenuProps: repairsMenuProps }} onChange={(e) => setStatus(e.target.value)}>
            <MenuItem value="all">All statuses</MenuItem>
            {STATUS_FILTERS.map((s) => (
              <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>{s}</MenuItem>
            ))}
          </TextField>
        </Stack>
        <Divider sx={{ my: 1.5, borderColor: REPAIRS_UI.border }} />
        <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
          <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>{stats.total} pieces</Typography>
          <Typography variant="caption" sx={{ color: '#4CAF50' }}>{stats.available} available</Typography>
          <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>{stats.sold} sold</Typography>
        </Stack>
      </Paper>

      {error && (
        <Paper sx={{ ...panelSx, mb: 2, borderColor: '#7A2E2E' }}>
          <Typography sx={{ color: '#F8BBBB' }}>{error}</Typography>
        </Paper>
      )}

      {loading ? (
        <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress sx={{ color: REPAIRS_UI.accent }} /></Stack>
      ) : shown.length === 0 ? (
        <Paper sx={panelSx}>
          <Stack alignItems="center" spacing={1.5} sx={{ py: 5 }}>
            <InventoryIcon sx={{ fontSize: 40, color: REPAIRS_UI.textMuted }} />
            <Typography sx={{ color: REPAIRS_UI.textSecondary }}>
              {pieces.length ? 'No pieces match those filters.' : 'No physical pieces yet.'}
            </Typography>
            {!pieces.length && (
              <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, textAlign: 'center', maxWidth: 440 }}>
                Open a design and record one on its Pieces tab — including anything already made.
              </Typography>
            )}
          </Stack>
        </Paper>
      ) : (
        <Stack spacing={1}>
          {shown.map((p) => {
            const design = designs[p.designID];
            const href = `${detailBase}/${p.designID}?tab=pieces`;
            return (
              <Paper
                key={p.pieceID}
                onClick={() => router.push(href)}
                role="link" tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') router.push(href); }}
                sx={{ ...panelSx, p: 1.5, cursor: 'pointer', '&:hover': { borderColor: REPAIRS_UI.accent } }}
              >
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Avatar variant="rounded" src={firstImage(design) || undefined} sx={{ width: 48, height: 48, bgcolor: REPAIRS_UI.border }}>
                    <InventoryIcon sx={{ color: REPAIRS_UI.accent, fontSize: 20 }} />
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
                      <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 600 }} noWrap>{designName(p.designID)}</Typography>
                      {p.editionNumber ? (
                        <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>#{p.editionNumber}</Typography>
                      ) : null}
                      {p.provenance?.kind === 'premade' && (
                        <Chip size="small" label="Premade" variant="outlined"
                          sx={{ height: 18, borderColor: REPAIRS_UI.border, color: REPAIRS_UI.textMuted }} />
                      )}
                    </Stack>
                    <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }} noWrap>
                      {[p.metalType, p.karat, p.ringSize && `size ${p.ringSize}`, p.sku].filter(Boolean).join(' · ') || 'No metal recorded'}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={2} alignItems="center" sx={{ flexShrink: 0 }}>
                    <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
                      <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, display: 'block' }}>COGS</Typography>
                      <Typography sx={{ color: REPAIRS_UI.textSecondary, fontSize: '0.8rem' }}>{money(p.totalCOGS)}</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, display: 'block' }}>Price</Typography>
                      <Typography sx={{ color: REPAIRS_UI.textPrimary, fontWeight: 600, fontSize: '0.8rem' }}>{money(p.pricing?.retailPrice)}</Typography>
                    </Box>
                    <Chip size="small" label={(p.status || '').replace(/_/g, ' ')}
                      sx={{ textTransform: 'capitalize', backgroundColor: `${STATUS_COLOR[p.status] || REPAIRS_UI.textMuted}22`, color: STATUS_COLOR[p.status] || REPAIRS_UI.textMuted, fontWeight: 700 }} />
                  </Stack>
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
