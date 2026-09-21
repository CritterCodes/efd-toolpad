'use client';

/**
 * The catalog, as designs.
 *
 * This replaces a table of `products` documents — a collection the storefront no longer reads and
 * that nobody is supposed to author. What EFD offers is designs: made to order while no piece
 * exists, ready to ship once one does. So this lists designs, and says for each how many physical
 * pieces exist behind it.
 *
 * ONE component, two scopes. Admin sees every artisan's; an artisan sees their own — not because
 * this page filters, but because the designs API already scopes the list to the caller. Two
 * surfaces built separately is how they drift, and the artisan side was the one that had a working
 * drop-free designs page while admin could only reach designs nested inside a drop.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Paper, Stack, Typography, Button, Chip, Avatar, TextField, InputAdornment,
  MenuItem, CircularProgress, Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import DiamondIcon from '@mui/icons-material/Diamond';
import DesignServicesIcon from '@mui/icons-material/DesignServices';
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

const money = (v) => (Number(v) > 0 ? `$${Number(v).toLocaleString()}` : 'no price yet');

const firstImage = (design) => {
  const img = (design?.media?.images || [])[0];
  return typeof img === 'string' ? img : img?.url || null;
};

/**
 * What the row shows as the price. A design's variants carry the made-to-order price (the daily
 * repricer authors those); `suggestedRetail` is the fallback for one-offs priced by hand. The
 * lowest active variant wins, because that is the "from" price a shopper sees.
 */
export function designPrice(design) {
  const prices = (design?.variants || [])
    .filter((v) => v.active !== false)
    .map((v) => Number(v?.pricing?.retailPrice ?? v?.price))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (prices.length) return Math.min(...prices);
  const suggested = Number(design?.suggestedRetail);
  return Number.isFinite(suggested) && suggested > 0 ? suggested : null;
}

/** A design offers ready-to-ship stock only while a piece is actually available. */
export function designAvailability(design) {
  if ((design?.availablePieceCount ?? 0) > 0) return 'ready';
  if ((design?.pieceCount ?? 0) > 0) return 'spoken for';
  return 'made to order';
}

export function filterDesigns(designs, { search = '', artisanId = 'all', type = 'all', status = 'all' } = {}) {
  const q = search.trim().toLowerCase();
  return (designs || []).filter((d) => {
    if (q && !`${d.name || ''} ${d.description || ''} ${d.designID || ''}`.toLowerCase().includes(q)) return false;
    if (artisanId !== 'all' && d.primaryArtisanId !== artisanId) return false;
    if (type !== 'all' && (d.category || 'uncategorised') !== type) return false;
    if (status === 'published' && !d.listing?.published) return false;
    if (status === 'draft' && d.listing?.published) return false;
    if (status === 'ready' && !(d.availablePieceCount > 0)) return false;
    return true;
  });
}

export default function DesignsIndex({
  title = 'Catalog',
  subtitle = 'Every design EFD offers — made to order until a physical piece exists.',
  detailBase = '/dashboard/products/designs',
  newHref = '/dashboard/products/designs/new',
  showArtisanFilter = true,
}) {
  const router = useRouter();
  const [designs, setDesigns] = useState([]);
  const [artisans, setArtisans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [artisanId, setArtisanId] = useState('all');
  const [type, setType] = useState('all');
  const [status, setStatus] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/production/designs?withCounts=1');
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to load designs');
      const all = await res.json();
      // Custom-order designs are work in progress for one customer, not catalog offerings.
      setDesigns((Array.isArray(all) ? all : []).filter((d) => d.primaryArtisanId));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    if (!showArtisanFilter) return;
    fetch('/api/users?role=artisan')
      .then((r) => (r.ok ? r.json() : {}))
      .then((d) => setArtisans(Array.isArray(d) ? d : (d.data || d.users || [])))
      .catch(() => {});
  }, [load, showArtisanFilter]);

  const artisanName = useCallback((id) => {
    const a = artisans.find((x) => (x.userID || x.email) === id);
    if (!a) return id || '—';
    return a.artisanApplication?.businessName || [a.firstName, a.lastName].filter(Boolean).join(' ') || a.email || id;
  }, [artisans]);

  const types = useMemo(
    () => [...new Set(designs.map((d) => d.category).filter(Boolean))].sort(),
    [designs],
  );
  const shown = useMemo(
    () => filterDesigns(designs, { search, artisanId, type, status }),
    [designs, search, artisanId, type, status],
  );
  const stats = useMemo(() => ({
    total: designs.length,
    published: designs.filter((d) => d.listing?.published).length,
    ready: designs.filter((d) => d.availablePieceCount > 0).length,
  }), [designs]);

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, maxWidth: 1200, mx: 'auto', overflowX: 'hidden' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2} sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: REPAIRS_UI.textHeader }}>{title}</Typography>
          <Typography variant="body2" sx={{ color: REPAIRS_UI.textMuted }}>{subtitle}</Typography>
        </Box>
        <Button
          variant="contained" startIcon={<AddIcon />} onClick={() => router.push(newHref)}
          sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, textTransform: 'none', '&:hover': { backgroundColor: '#C19B2E' } }}
        >
          New design
        </Button>
      </Stack>

      <Paper sx={{ ...panelSx, mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
          <TextField
            size="small" fullWidth placeholder="Search designs" value={search} sx={fieldSx}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: REPAIRS_UI.textMuted, fontSize: 18 }} /></InputAdornment> }}
          />
          {showArtisanFilter && (
            <TextField select size="small" label="Artisan" value={artisanId} sx={{ ...fieldSx, minWidth: { md: 180 } }}
              SelectProps={{ MenuProps: repairsMenuProps }} onChange={(e) => setArtisanId(e.target.value)}>
              <MenuItem value="all">All artisans</MenuItem>
              {[...new Set(designs.map((d) => d.primaryArtisanId).filter(Boolean))].map((id) => (
                <MenuItem key={id} value={id}>{artisanName(id)}</MenuItem>
              ))}
            </TextField>
          )}
          <TextField select size="small" label="Type" value={type} sx={{ ...fieldSx, minWidth: { md: 150 } }}
            SelectProps={{ MenuProps: repairsMenuProps }} onChange={(e) => setType(e.target.value)}>
            <MenuItem value="all">All types</MenuItem>
            {types.map((t) => <MenuItem key={t} value={t} sx={{ textTransform: 'capitalize' }}>{t}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Status" value={status} sx={{ ...fieldSx, minWidth: { md: 160 } }}
            SelectProps={{ MenuProps: repairsMenuProps }} onChange={(e) => setStatus(e.target.value)}>
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="published">Live in shop</MenuItem>
            <MenuItem value="draft">Not listed</MenuItem>
            <MenuItem value="ready">Ready to ship</MenuItem>
          </TextField>
        </Stack>
        <Divider sx={{ my: 1.5, borderColor: REPAIRS_UI.border }} />
        <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
          <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>{stats.total} designs</Typography>
          <Typography variant="caption" sx={{ color: REPAIRS_UI.accent }}>{stats.published} live in shop</Typography>
          <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>{stats.ready} ready to ship</Typography>
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
            <DesignServicesIcon sx={{ fontSize: 40, color: REPAIRS_UI.textMuted }} />
            <Typography sx={{ color: REPAIRS_UI.textSecondary }}>
              {designs.length ? 'No designs match those filters.' : 'No designs yet.'}
            </Typography>
          </Stack>
        </Paper>
      ) : (
        <Stack spacing={1}>
          {shown.map((d) => {
            const isGem = d.category === 'gemstone';
            const live = d.listing?.published === true;
            const price = designPrice(d);
            return (
              <Paper
                key={d.designID}
                onClick={() => router.push(`${detailBase}/${d.designID}`)}
                role="link" tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') router.push(`${detailBase}/${d.designID}`); }}
                sx={{ ...panelSx, p: 1.5, cursor: 'pointer', '&:hover': { borderColor: REPAIRS_UI.accent } }}
              >
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Avatar variant="rounded" src={firstImage(d) || undefined} sx={{ width: 48, height: 48, bgcolor: REPAIRS_UI.border }}>
                    {isGem
                      ? <DiamondIcon sx={{ color: REPAIRS_UI.accent, fontSize: 22 }} />
                      : <DesignServicesIcon sx={{ color: REPAIRS_UI.accent, fontSize: 22 }} />}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 600 }} noWrap>{d.name || 'Untitled design'}</Typography>
                    <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }} noWrap>
                      {[
                        d.category || 'uncategorised',
                        showArtisanFilter ? artisanName(d.primaryArtisanId) : null,
                        money(price),
                      ].filter(Boolean).join(' · ')}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={0.75} alignItems="center" sx={{ flexShrink: 0 }}>
                    <Chip size="small" variant="outlined" label={designAvailability(d)}
                      sx={{ height: 20, textTransform: 'capitalize', borderColor: REPAIRS_UI.border, color: REPAIRS_UI.textSecondary, display: { xs: 'none', sm: 'inline-flex' } }} />
                    <Chip size="small" variant="outlined" label={live ? 'Live in shop' : 'Not listed'}
                      sx={{ height: 20, ...(live ? { borderColor: REPAIRS_UI.accent, color: REPAIRS_UI.accent } : { borderColor: REPAIRS_UI.border, color: REPAIRS_UI.textMuted }) }} />
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
