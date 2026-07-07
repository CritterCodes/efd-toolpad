'use client';

/**
 * M5-T1 — drop "stage + release" detail page (owner-locked interaction spec, goal §"M5-T1 interaction
 * spec"). FIRST INCREMENT: member-list canvas + persistent header action bar (status chip + readiness
 * summary) + Go-live-now confirm modal + basic scheduling. Readiness GATES RELEASE, not membership
 * (spec §7). Deferred to a follow-up: add-products right-side drawer + drag-and-drop reorder.
 *
 * NOTE (flagged to @pm, #197): the §8 readiness gate currently lives on members-add (M4-T2, 422) but
 * this spec puts it at RELEASE. Client here disables Schedule/Go-live until all members pass §8; the
 * authoritative server-side release gate + relaxing the members-add block await PM's reconciliation.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box, Typography, Button, Card, CardContent, Stack, Chip, CircularProgress, Alert, Grid, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, TextField, InputAdornment,
  Drawer, List, ListItemButton, ListItemText, Checkbox, IconButton, Divider,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import ScheduleIcon from '@mui/icons-material/Schedule';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';
import { validateProductContract } from '@/services/products/productContract';

const money = (n) => `$${(Number(n) || 0).toLocaleString()}`;
const STATUS_COLOR = { draft: REPAIRS_UI.textMuted, scheduled: '#FFB74D', released: '#66BB6A', archived: REPAIRS_UI.textMuted };
const priceOf = (p) => p?.pricing?.retailPrice ?? p?.price ?? null;

export default function CollectionDetailPage() {
  const { collectionID } = useParams();
  const router = useRouter();
  const [collection, setCollection] = useState(null);
  const [productsById, setProductsById] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [goLive, setGoLive] = useState(false);
  const [when, setWhen] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [pickSearch, setPickSearch] = useState('');
  const [picked, setPicked] = useState(() => new Set());

  const load = useCallback(async () => {
    try {
      const [cRes, pRes] = await Promise.all([
        fetch(`/api/production/collections/${collectionID}`),
        fetch('/api/products?limit=200'),
      ]);
      const cData = await cRes.json().catch(() => ({}));
      if (!cRes.ok) throw new Error(cData.error || 'Failed to load collection');
      const pData = await pRes.json().catch(() => ({}));
      const map = {};
      for (const p of (Array.isArray(pData.products) ? pData.products : [])) map[p.productId] = p;
      setCollection(cData); setProductsById(map); setError(null);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [collectionID]);

  useEffect(() => { load(); }, [load]);

  const back = useCallback(() => router.push('/dashboard/production/collections'), [router]);

  const members = useMemo(() => {
    const list = Array.isArray(collection?.members) ? [...collection.members] : [];
    list.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    return list.map((m) => {
      const product = productsById[m.productId] || null;
      const check = product ? validateProductContract(product) : { valid: false, errors: ['product not found'] };
      return { ...m, product, ready: check.valid, errors: check.errors };
    });
  }, [collection, productsById]);

  const readyCount = members.filter((m) => m.ready).length;
  const allReady = members.length > 0 && readyCount === members.length;
  const status = collection?.status || 'draft';
  const released = status === 'released';

  // Add-products picker: all products NOT already staged (staging a not-ready product is allowed — spec §7).
  const memberIds = useMemo(() => new Set((collection?.members || []).map((m) => m.productId)), [collection]);
  const candidates = useMemo(() => {
    const q = pickSearch.trim().toLowerCase();
    return Object.values(productsById)
      .filter((p) => !memberIds.has(p.productId))
      .filter((p) => !q || [p.title, p.name, p.productId].filter(Boolean).join(' ').toLowerCase().includes(q));
  }, [productsById, memberIds, pickSearch]);

  const togglePick = (id) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const doAddPicked = async () => {
    const ids = [...picked];
    if (!ids.length) return;
    setBusy(true); setNotice(null);
    let ok = 0;
    for (const productId of ids) {
      try {
        const res = await fetch(`/api/production/collections/${collectionID}/members`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId }),
        });
        if (res.ok) ok += 1;
      } catch { /* keep going; summarize below */ }
    }
    setPicked(new Set()); setAddOpen(false); await load();
    setNotice({ severity: ok === ids.length ? 'success' : 'warning', msg: `Staged ${ok} of ${ids.length} product(s).` });
    setBusy(false);
  };

  const patch = async (body) => {
    const res = await fetch(`/api/production/collections/${collectionID}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Update failed');
    return data;
  };

  const doSchedule = async () => {
    if (!when) { setNotice({ severity: 'error', msg: 'Pick a date/time first.' }); return; }
    setBusy(true); setNotice(null);
    try { await patch({ status: 'scheduled', releaseAt: new Date(when).toISOString() }); await load(); setNotice({ severity: 'success', msg: `Scheduled for ${new Date(when).toLocaleString()}.` }); }
    catch (e) { setNotice({ severity: 'error', msg: e.message }); } finally { setBusy(false); }
  };

  // a11y reorder (spec: drag-and-drop with an up/down fallback; DnD-pointer is a later polish).
  const reorder = async (index, dir) => {
    const ids = members.map((m) => m.productId);
    const j = index + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j], ids[index]];
    setBusy(true); setNotice(null);
    try { await patch2(ids); await load(); }
    catch (e) { setNotice({ severity: 'error', msg: e.message }); }
    finally { setBusy(false); }
  };
  const patch2 = async (order) => {
    const res = await fetch(`/api/production/collections/${collectionID}/members`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Reorder failed');
  };

  const doGoLive = async () => {
    setBusy(true); setNotice(null);
    try {
      const res = await fetch(`/api/production/collections/${collectionID}/release`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Release failed');
      setGoLive(false); await load(); setNotice({ severity: 'success', msg: `Released — ${members.length} product(s) live.` });
    } catch (e) { setGoLive(false); setNotice({ severity: 'error', msg: e.message }); } finally { setBusy(false); }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress sx={{ color: REPAIRS_UI.accent }} /></Box>;
  if (error || !collection) {
    return (
      <Box sx={{ p: 4 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={back} sx={{ color: REPAIRS_UI.textSecondary, mb: 2 }}>Back to collections</Button>
        <Typography color="error">{error || 'Collection not found.'}</Typography>
      </Box>
    );
  }

  const gateTip = released ? 'Already released.' : (allReady ? '' : `${members.length - readyCount} member(s) not stage-ready (contract §8). Fix them first.`);

  return (
    <Box sx={{ pb: 6 }}>
      <Button startIcon={<ArrowBackIcon />} onClick={back} sx={{ color: REPAIRS_UI.textSecondary, mb: 2 }}>Back to collections</Button>

      {/* Persistent header action bar (spec) */}
      <Box sx={{ backgroundColor: REPAIRS_UI.bgPanel, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 3, p: { xs: 2, md: 3 }, mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={2}>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
              <Chip size="small" label={status} sx={{ backgroundColor: `${STATUS_COLOR[status] || REPAIRS_UI.textMuted}22`, color: STATUS_COLOR[status] || REPAIRS_UI.textMuted, textTransform: 'capitalize', fontWeight: 700 }} />
              <Chip size="small" label={(collection.ownerType || 'efd').toUpperCase()} sx={{ backgroundColor: REPAIRS_UI.bgTertiary, color: REPAIRS_UI.textSecondary, border: `1px solid ${REPAIRS_UI.border}` }} />
            </Stack>
            <Typography sx={{ fontSize: { xs: 24, md: 30 }, fontWeight: 600, color: REPAIRS_UI.textHeader }}>{collection.name || 'Untitled drop'}</Typography>
            <Typography sx={{ color: allReady ? '#66BB6A' : REPAIRS_UI.textSecondary, fontSize: '0.85rem', mt: 0.5 }}>
              {members.length === 0 ? 'No members staged yet' : `${readyCount} of ${members.length} ready`}
              {collection.releaseAt && status === 'scheduled' ? ` · drops ${new Date(collection.releaseAt).toLocaleString()}` : ''}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5} alignItems="center">
            {!released && (
              <Button onClick={() => setAddOpen(true)} startIcon={<AddIcon />} variant="outlined" sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border }}>Add products</Button>
            )}
            {!released && (
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField type="datetime-local" size="small" value={when} onChange={(e) => setWhen(e.target.value)} disabled={!allReady}
                  sx={{ '& input': { color: REPAIRS_UI.textPrimary } }} />
                <Tooltip title={gateTip}><span>
                  <Button onClick={doSchedule} disabled={!allReady || busy} startIcon={<ScheduleIcon />} variant="outlined" sx={{ color: REPAIRS_UI.accent, borderColor: REPAIRS_UI.border }}>Schedule</Button>
                </span></Tooltip>
                <Tooltip title={gateTip}><span>
                  <Button onClick={() => setGoLive(true)} disabled={!allReady || busy} startIcon={<RocketLaunchIcon />} variant="contained" sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, '&:hover': { backgroundColor: '#C19B2E' } }}>Go live now</Button>
                </span></Tooltip>
              </Stack>
            )}
            {released && <Chip label="Released" sx={{ backgroundColor: '#66BB6A22', color: '#66BB6A', fontWeight: 700 }} />}
          </Stack>
        </Stack>
      </Box>

      {notice && <Alert severity={notice.severity} sx={{ mb: 2, backgroundColor: REPAIRS_UI.bgCard, color: REPAIRS_UI.textPrimary, border: `1px solid ${REPAIRS_UI.border}` }} onClose={() => setNotice(null)}>{notice.msg}</Alert>}

      {/* Member list = the canvas */}
      {members.length === 0 ? (
        <Card sx={{ backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px dashed ${REPAIRS_UI.border}`, borderRadius: 2 }}>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Typography sx={{ color: REPAIRS_UI.textSecondary }}>No products staged. (Add-products drawer lands in the next increment — stage via the API or the Products editor meanwhile.)</Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {members.map((m, idx) => (
            <Grid item xs={12} sm={6} md={4} key={m.productId}>
              <Card sx={{ height: '100%', backgroundColor: REPAIRS_UI.bgCard, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2 }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                    <Chip size="small"
                      icon={m.ready ? <CheckCircleIcon sx={{ fontSize: 14 }} /> : <WarningAmberIcon sx={{ fontSize: 14 }} />}
                      label={m.ready ? 'Ready' : 'Not ready'}
                      sx={{ backgroundColor: m.ready ? '#66BB6A22' : '#E5737322', color: m.ready ? '#66BB6A' : '#E57373', fontWeight: 700 }} />
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      {!released && (
                        <>
                          <IconButton size="small" aria-label="Move up" disabled={busy || idx === 0} onClick={() => reorder(idx, -1)} sx={{ color: REPAIRS_UI.textSecondary, p: 0.25 }}><ArrowUpwardIcon sx={{ fontSize: 16 }} /></IconButton>
                          <IconButton size="small" aria-label="Move down" disabled={busy || idx === members.length - 1} onClick={() => reorder(idx, 1)} sx={{ color: REPAIRS_UI.textSecondary, p: 0.25 }}><ArrowDownwardIcon sx={{ fontSize: 16 }} /></IconButton>
                        </>
                      )}
                      <Typography sx={{ color: REPAIRS_UI.textMuted, fontSize: '0.75rem' }}>#{idx + 1}</Typography>
                    </Stack>
                  </Stack>
                  <Typography sx={{ fontSize: 15, fontWeight: 600, color: REPAIRS_UI.textHeader }}>{m.product?.title || m.product?.name || m.productId}</Typography>
                  <Typography sx={{ color: REPAIRS_UI.textSecondary, fontSize: '0.82rem' }}>
                    {priceOf(m.product) != null ? money(priceOf(m.product)) : '—'}
                    {m.product?.seller?.name || m.product?.artisanId ? ` · ${m.product.seller?.name || m.product.artisanId}` : ''}
                  </Typography>
                  {!m.ready && <Typography sx={{ color: '#E57373', fontSize: '0.76rem', mt: 0.5 }}>{(m.errors || []).slice(0, 2).join('; ')}</Typography>}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Add products — right-side drawer (spec): searchable picker, multi-select, membership stays visible behind it */}
      <Drawer anchor="right" open={addOpen} onClose={() => setAddOpen(false)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 420 }, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', borderLeft: `1px solid ${REPAIRS_UI.border}` } }}>
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
            <Typography sx={{ fontSize: 18, fontWeight: 600, color: REPAIRS_UI.textHeader }}>Add products</Typography>
            <IconButton onClick={() => setAddOpen(false)} sx={{ color: REPAIRS_UI.textSecondary }}><CloseIcon /></IconButton>
          </Stack>
          <TextField placeholder="Search products…" value={pickSearch} onChange={(e) => setPickSearch(e.target.value)} size="small" fullWidth sx={{ mb: 1 }}
            InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ color: REPAIRS_UI.textSecondary }} /></InputAdornment>) }} />
          <Typography sx={{ fontSize: '0.75rem', color: REPAIRS_UI.textMuted, mb: 1 }}>Staging a not-yet-ready product is allowed — readiness gates the release, not membership.</Typography>
          <Box sx={{ flex: 1, overflowY: 'auto', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 1 }}>
            {candidates.length === 0 ? (
              <Typography sx={{ color: REPAIRS_UI.textSecondary, p: 2, fontSize: '0.85rem' }}>No products to add (all staged, or none match).</Typography>
            ) : (
              <List dense disablePadding>
                {candidates.map((p) => {
                  const ready = validateProductContract(p).valid;
                  return (
                    <ListItemButton key={p.productId} onClick={() => togglePick(p.productId)} sx={{ borderBottom: `1px solid ${REPAIRS_UI.border}` }}>
                      <Checkbox edge="start" checked={picked.has(p.productId)} tabIndex={-1} disableRipple sx={{ color: REPAIRS_UI.textMuted, '&.Mui-checked': { color: REPAIRS_UI.accent } }} />
                      <ListItemText
                        primary={<span style={{ color: REPAIRS_UI.textHeader }}>{p.title || p.name || p.productId}</span>}
                        secondary={<span style={{ color: REPAIRS_UI.textSecondary }}>{priceOf(p) != null ? money(priceOf(p)) : '—'} · {p.productType || 'jewelry'} · {ready ? 'ready' : '⚠ not ready'}</span>}
                      />
                    </ListItemButton>
                  );
                })}
              </List>
            )}
          </Box>
          <Divider sx={{ borderColor: REPAIRS_UI.border, my: 1.5 }} />
          <Button onClick={doAddPicked} disabled={busy || picked.size === 0} variant="contained" fullWidth
            sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, '&:hover': { backgroundColor: '#C19B2E' } }}>
            {busy ? 'Staging…' : `Add ${picked.size || ''} product${picked.size === 1 ? '' : 's'}`.trim()}
          </Button>
        </Box>
      </Drawer>

      {/* Go-live = the ONE modal (outward-facing, irreversible) */}
      <Dialog open={goLive} onClose={() => setGoLive(false)}
        PaperProps={{ sx: { backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}` } }}>
        <DialogTitle sx={{ color: REPAIRS_UI.textHeader }}>Publish this drop now?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: REPAIRS_UI.textSecondary }}>
            Publish {members.length} product(s) now? They go live on the shop immediately at <code>/drops/{collection.slug || collection.collectionId}</code>. This is outward-facing and can’t be quietly undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setGoLive(false)} sx={{ color: REPAIRS_UI.textSecondary }}>Cancel</Button>
          <Button onClick={doGoLive} disabled={busy} variant="contained" sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, '&:hover': { backgroundColor: '#C19B2E' } }}>
            {busy ? 'Publishing…' : 'Publish now'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
