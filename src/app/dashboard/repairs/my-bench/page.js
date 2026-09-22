'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { buildStullerRepairMaterial } from '@/services/pricing/stullerMaterial';
import {
  Box, Typography, Grid, Button, Chip, CircularProgress, Tabs, Tab,
  TextField, MenuItem, Alert, Snackbar, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import {
  Handyman as WorkIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  QrCodeScanner as ScanIcon,
  VerifiedUser as QCIcon,
  Category as PartsIcon,
  Forum as CommunicationsIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

import ContinuousBarcodeScanner from '@/components/repairs/ContinuousBarcodeScanner';
import { BENCH_QUEUE, BENCH_TABS, isWorkOrderInTab } from '@/services/workOrders/workOrderWorkflow';
import { uploadSizeError } from '@/lib/uploadLimits';
import { directUpload, postFileWithProgress } from '@/lib/directUpload';
import BenchWorkCard from './components/BenchWorkCard';
import { isAdminRole } from '@/lib/repairAccess';
import { PageHeader, SurfaceCard, SectionLabel, facelift } from '@/components/facelift';

const DEFAULT_PARTS_FORM = { source: 'stuller', stullerSku: '', name: '', description: '', quantity: '1', price: '' };

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
// A Stuller part is priced by services/pricing/stullerMaterial.js — wholesale when the work
// order's repair is a store job, retail otherwise. The browser's number is a preview; the
// mark-waiting-parts action re-prices from the repair's billing mode before storing it.
function buildStullerMaterial(stullerResponse, stullerSku, adminSettings = {}, isWholesale = false) {
  return buildStullerRepairMaterial({ item: stullerResponse, sku: stullerSku, isWholesale, adminSettings });
}

export default function BenchPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [busyID, setBusyID] = useState('');
  // Per-work-order upload progress — a 91 MB STL with no feedback is indistinguishable from a hang.
  const [uploadPct, setUploadPct] = useState({});
  const [cardErrors, setCardErrors] = useState({});
  const [jewelers, setJewelers] = useState([]);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  // Scan-to-claim (repairs)
  const [scanValue, setScanValue] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const [queuedClaimIDs, setQueuedClaimIDs] = useState([]);
  const [claimScannerOpen, setClaimScannerOpen] = useState(false);

  // Bulk QC + parts
  const [bulkQcLoading, setBulkQcLoading] = useState(false);
  const [selectedQcIDs, setSelectedQcIDs] = useState([]);
  const [bulkCompleteLoading, setBulkCompleteLoading] = useState(false);
  const [partsDialogWO, setPartsDialogWO] = useState(null);
  const [partsForm, setPartsForm] = useState(DEFAULT_PARTS_FORM);
  const [partsLoading, setPartsLoading] = useState(false);
  const [partsError, setPartsError] = useState('');

  const showSnack = (message, severity = 'success') => setSnack({ open: true, message, severity });
  const closeSnack = () => setSnack((s) => ({ ...s, open: false }));

  const fetchWorkOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bench/my-bench');
      if (res.ok) setWorkOrders(await res.json());
      else showSnack((await res.json().catch(() => ({}))).error || 'Failed to load bench', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  // QC mode + whether this session may self-certify (services/repairs/qcMode.js).
  const [qc, setQc] = useState(null);
  const fetchQcMode = useCallback(async () => {
    try {
      const res = await fetch('/api/bench/qc-mode');
      if (res.ok) setQc(await res.json());
    } catch { /* bench works without it: falls back to Move to QC */ }
  }, []);

  const fetchJewelers = useCallback(async () => {
    try {
      const res = await fetch('/api/repairs/bench-jewelers');
      setJewelers(res.ok ? await res.json() : []);
    } catch {
      setJewelers([]);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchWorkOrders();
      fetchJewelers();
      fetchQcMode();
    }
  }, [status, fetchWorkOrders, fetchJewelers, fetchQcMode]);

  const userID = session?.user?.userID;
  const isAdmin = isAdminRole(session);

  // Unified per-work-order action.
  const runAction = async (wo, action, body = {}) => {
    setBusyID(wo.workOrderID);
    setCardErrors((m) => ({ ...m, [wo.workOrderID]: '' }));
    try {
      const res = await fetch(`/api/bench/work-orders/${wo.workOrderID}/${action}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `${action} failed`);
      await fetchWorkOrders();
    } catch (e) {
      setCardErrors((m) => ({ ...m, [wo.workOrderID]: e.message }));
      showSnack(e.message, 'error');
    } finally {
      setBusyID('');
    }
  };

  // CAD STL/GLB upload (multipart) → moves the CAD work order to QC.
  const uploadCadFile = async (wo, file, kind) => {
    setBusyID(wo.workOrderID);
    setCardErrors((m) => ({ ...m, [wo.workOrderID]: '' }));
    try {
      if (kind === 'stl') {
        // DIRECT to storage. A CAD STL is the manufacturing file Carrera casts from — a real one is
        // 91 MB — and a serverless request body caps at ~4.5 MB, so it cannot go through upload-stl.
        // The browser PUTs it straight to MinIO, then we record the reference and move the WO to QC.
        const { url, key } = await directUpload(file, {
          scope: 'work-order', id: wo.workOrderID,
          onProgress: (pct) => setUploadPct((m) => ({ ...m, [wo.workOrderID]: pct })),
        });
        // NOTE: no client-side volume. The server streams the stored object and measures it
        // itself (attachCadStl -> stlVolumeCm3FromStorage) — volume sets the mounting cost and
        // therefore the retail price, so it must not be a number the browser supplies.
        // The key comes STRAIGHT from the presign response. Deriving it from the url assumed exactly
        // one path segment before the key, which broke whenever MINIO_PUBLIC_URL carried a path — the
        // upload succeeded and attach-stl then refused the mismatched key as "not your work order".
        const res = await fetch(`/api/bench/work-orders/${wo.workOrderID}/attach-stl`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, key, originalName: file.name }),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Could not attach the STL');
        showSnack('STL uploaded — work order moved to QC', 'success');
      } else {
        const tooBig = uploadSizeError(file);
        if (tooBig) throw new Error(tooBig);
        // XHR multipart, not fetch — fetch has no upload-progress events, and a GLB on shop
        // wifi takes long enough that a silent button reads as a hang.
        await postFileWithProgress(`/api/bench/work-orders/${wo.workOrderID}/upload-${kind}`, file, {
          onProgress: (pct) => setUploadPct((m) => ({ ...m, [wo.workOrderID]: pct })),
        });
        showSnack(`${kind.toUpperCase()} uploaded — work order moved to QC`, 'success');
      }
      await fetchWorkOrders();
    } catch (e) {
      setCardErrors((m) => ({ ...m, [wo.workOrderID]: e.message }));
      showSnack(e.message, 'error');
    } finally {
      setBusyID('');
      setUploadPct((m) => { const n = { ...m }; delete n[wo.workOrderID]; return n; });
    }
  };
  const uploadStl = (wo, file) => uploadCadFile(wo, file, 'stl');
  const uploadGlb = (wo, file) => uploadCadFile(wo, file, 'glb');

  // --- Scan to claim (repairs; scanned value is a repairID) ---
  const queueClaimID = (repairID) => {
    const clean = String(repairID || '').trim();
    if (!clean) return;
    setQueuedClaimIDs((prev) => (prev.includes(clean) ? prev : [...prev, clean]));
    setScanValue('');
  };
  const handleQueueScan = (e) => { e?.preventDefault?.(); queueClaimID(scanValue); };
  const removeQueued = (repairID) => setQueuedClaimIDs((prev) => prev.filter((id) => id !== repairID));

  const claimQueued = async () => {
    if (queuedClaimIDs.length === 0) return;
    setScanLoading(true);
    try {
      const results = [];
      for (const repairID of queuedClaimIDs) {
        const res = await fetch(`/api/repairs/${encodeURIComponent(repairID)}/claim`, { method: 'POST' });
        results.push({ repairID, ok: res.ok, error: res.ok ? null : ((await res.json().catch(() => ({}))).error || 'Unable to claim') });
      }
      const claimed = results.filter((r) => r.ok).map((r) => r.repairID);
      const failed = results.filter((r) => !r.ok);
      if (claimed.length) setQueuedClaimIDs((prev) => prev.filter((id) => !claimed.includes(id)));
      await fetchWorkOrders();
      if (claimed.length) showSnack(`Claimed ${claimed.length} repair${claimed.length !== 1 ? 's' : ''}.`, 'success');
      if (failed.length) showSnack(failed.map((r) => `${r.repairID}: ${r.error}`).join(' | '), 'error');
    } finally {
      setScanLoading(false);
    }
  };

  // --- Bulk: move my in-progress repairs to QC ---
  const byTab = useMemo(() => Object.fromEntries(
    BENCH_TABS.map(({ key }) => [key, workOrders.filter((wo) => isWorkOrderInTab(wo, key, userID))]),
  ), [workOrders, userID]);

  // Every source supports move-to-QC now (repairs + production/custom pieces).
  const mineInProgress = useMemo(
    () => (byTab[BENCH_QUEUE.MINE] || []).filter((wo) => wo.benchQueue === BENCH_QUEUE.IN_PROGRESS),
    [byTab],
  );

  const moveMyBenchToQc = async () => {
    if (mineInProgress.length === 0) return;
    setBulkQcLoading(true);
    try {
      let moved = 0; const errs = [];
      for (const wo of mineInProgress) {
        const res = await fetch(`/api/bench/work-orders/${wo.workOrderID}/move-to-qc`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
        });
        if (res.ok) moved += 1; else errs.push((await res.json().catch(() => ({}))).error || wo.workOrderID);
      }
      await fetchWorkOrders();
      if (moved) showSnack(`Moved ${moved} repair${moved !== 1 ? 's' : ''} to QC.`, 'success');
      if (errs.length) showSnack(errs.join(' | '), 'error');
    } finally {
      setBulkQcLoading(false);
    }
  };

  // --- Bulk QC approve ---
  const toggleQc = (id) => setSelectedQcIDs((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const completeSelectedQc = async () => {
    const ids = (byTab[BENCH_QUEUE.QC] || []).filter((wo) => selectedQcIDs.includes(wo.workOrderID));
    if (ids.length === 0) return;
    setBulkCompleteLoading(true);
    try {
      let done = 0; const errs = [];
      for (const wo of ids) {
        const res = await fetch(`/api/bench/work-orders/${wo.workOrderID}/complete-from-qc`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
        });
        if (res.ok) { done += 1; } else errs.push((await res.json().catch(() => ({}))).error || wo.workOrderID);
      }
      if (done) setSelectedQcIDs((prev) => prev.filter((id) => !ids.some((wo) => wo.workOrderID === id)));
      await fetchWorkOrders();
      if (done) showSnack(`Approved ${done} and moved to Payment & Pickup.`, 'success');
      if (errs.length) showSnack(errs.join(' | '), 'error');
    } finally {
      setBulkCompleteLoading(false);
    }
  };

  // --- Parts dialog ---
  const openPartsDialog = (wo) => { setPartsDialogWO(wo); setPartsForm(DEFAULT_PARTS_FORM); setPartsError(''); };
  const closePartsDialog = () => { if (!partsLoading) { setPartsDialogWO(null); setPartsForm(DEFAULT_PARTS_FORM); setPartsError(''); } };
  const setPF = (field, value) => setPartsForm((prev) => ({ ...prev, [field]: value }));

  const submitNeedsParts = async () => {
    if (!partsDialogWO) return;
    setPartsLoading(true);
    setPartsError('');
    try {
      let material;
      if (partsForm.source === 'stuller') {
        const cleanSku = partsForm.stullerSku.trim();
        if (!cleanSku) throw new Error('Enter a Stuller part number.');
        const [stullerRes, settingsRes] = await Promise.all([
          fetch('/api/stuller/item', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ itemNumber: cleanSku }) }),
          fetch('/api/admin/settings'),
        ]);
        const stullerData = await stullerRes.json().catch(() => ({}));
        if (!stullerRes.ok) throw new Error(stullerData.error || 'Failed to fetch Stuller item.');
        const adminSettings = settingsRes.ok ? await settingsRes.json().catch(() => ({})) : {};
        material = buildStullerMaterial(stullerData, cleanSku, adminSettings, !!(partsDialogWO?.isWholesale || partsDialogWO?.repair?.isWholesale || partsDialogWO?.billing?.mode === 'wholesale'));
      } else {
        const name = partsForm.name.trim();
        const quantity = Math.max(toNumber(partsForm.quantity, 1), 0);
        const price = Math.max(toNumber(partsForm.price, 0), 0);
        if (!name) throw new Error('Enter a material name.');
        if (quantity <= 0) throw new Error('Quantity must be greater than zero.');
        material = {
          id: Date.now(), name, displayName: name, description: partsForm.description.trim() || name,
          quantity, price, retailPrice: price, unitCost: price, category: 'manual_material', supplier: 'Manual', isStullerItem: false,
        };
      }
      const res = await fetch(`/api/bench/work-orders/${partsDialogWO.workOrderID}/mark-waiting-parts`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ material }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Unable to move to needs parts.');
      await fetchWorkOrders();
      showSnack(`Added material and moved ${partsDialogWO.sourceID} to Needs Parts.`, 'success');
      setPartsDialogWO(null);
      setPartsForm(DEFAULT_PARTS_FORM);
    } catch (e) {
      setPartsError(e.message);
    } finally {
      setPartsLoading(false);
    }
  };

  if (status === 'loading') {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}><CircularProgress /></Box>;
  }

  const activeKey = BENCH_TABS[tab].key;
  const shown = byTab[activeKey] || [];
  const shownQcIDs = activeKey === BENCH_QUEUE.QC ? shown.map((wo) => wo.workOrderID) : [];
  const selectedShownQc = shownQcIDs.filter((id) => selectedQcIDs.includes(id));

  return (
    <Box sx={{ pb: 8 }}>
      {/* Header panel */}
      <PageHeader
        badge="Bench work"
        badgeIcon={<WorkIcon sx={{ fontSize: 14 }} />}
        title="My Bench"
        subtitle="All active work across your disciplines — repairs, production, customs, sale service."
        actions={(
          <>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => router.push('/dashboard/repairs/new')}>New Repair</Button>
            <Button variant="contained" color="success" startIcon={<QCIcon />} onClick={moveMyBenchToQc} disabled={bulkQcLoading || mineInProgress.length === 0}>
              {bulkQcLoading ? 'Moving…' : `Move My Bench to QC (${mineInProgress.length})`}
            </Button>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchWorkOrders} disabled={loading}>Refresh</Button>
          </>
        )}
      >
        {/* Summary counts */}
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mt: 2.5 }}>
          {BENCH_TABS.map(({ label, key }) => (
            <Box key={key}>
              <Typography sx={{ fontSize: '1.375rem', fontWeight: 700, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>{byTab[key]?.length ?? 0}</Typography>
              <SectionLabel sx={{ mt: 0.25, fontSize: '0.594rem' }}>{label}</SectionLabel>
            </Box>
          ))}
        </Box>
      </PageHeader>

      {/* Scan to claim */}
      <SurfaceCard sx={{ mt: 2.5 }}>
        <SectionLabel>Scan to claim</SectionLabel>
        <Box component="form" onSubmit={handleQueueScan} sx={{ mt: 1.5, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <TextField
            label="Scan to Claim" placeholder="Scan repair ticket barcode" value={scanValue}
            onChange={(e) => setScanValue(e.target.value)} autoComplete="off" autoFocus size="small"
            sx={{ minWidth: { xs: '100%', sm: 320 } }}
            helperText="Barcode scan lands here. Press Enter to queue each repair, then claim the batch."
          />
          <Button type="submit" variant="outlined" startIcon={<ScanIcon />} disabled={scanLoading || !scanValue.trim()}>Queue Scan</Button>
          <Button type="button" variant="outlined" startIcon={<ScanIcon />} disabled={scanLoading} onClick={() => setClaimScannerOpen(true)}>Camera Scan</Button>
          <Button type="button" variant="contained" disabled={scanLoading || queuedClaimIDs.length === 0} onClick={claimQueued}>
            {scanLoading ? 'Claiming…' : `Claim ${queuedClaimIDs.length} Queued`}
          </Button>
        </Box>
        {queuedClaimIDs.length > 0 && (
          <Box sx={{ mt: 1.5 }}>
            <SectionLabel sx={{ mb: 1 }}>Queued to claim ({queuedClaimIDs.length})</SectionLabel>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {queuedClaimIDs.map((id) => (
                <Chip key={id} label={id} onDelete={() => removeQueued(id)} deleteIcon={<CloseIcon />} />
              ))}
            </Box>
          </Box>
        )}
      </SurfaceCard>

      {/* Tabs */}
      <Tabs
        value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile
        sx={{ mt: 2.5, mb: 2, maxWidth: '100%', '& .MuiTabs-scroller': { overflowX: 'auto !important' } }}
      >
        {BENCH_TABS.map(({ label, key }) => <Tab key={key} label={`${label} (${byTab[key]?.length ?? 0})`} />)}
      </Tabs>

      {/* QC bulk bar */}
      {activeKey === BENCH_QUEUE.QC && shown.length > 0 && (
        <SurfaceCard accent="#34D399" sx={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap', py: 1.5, mb: 2 }}>
          <Box>
            <Typography sx={{ fontWeight: 600 }}>QC Selection</Typography>
            <Typography variant="caption" sx={{ color: facelift.text3 }}>{selectedShownQc.length} selected on this tab</Typography>
          </Box>
          <Button variant="contained" color="success" startIcon={<QCIcon />} disabled={bulkCompleteLoading || selectedShownQc.length === 0} onClick={completeSelectedQc}>
            {bulkCompleteLoading ? 'Approving…' : `Approve to Payment & Pickup (${selectedShownQc.length})`}
          </Button>
        </SurfaceCard>
      )}

      {/* Grid / states */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
      ) : shown.length === 0 ? (
        <SurfaceCard sx={{ py: 6, alignItems: 'center', textAlign: 'center' }}>
          {activeKey === BENCH_QUEUE.COMMUNICATIONS
            ? <CommunicationsIcon sx={{ fontSize: 48, color: facelift.text4, mb: 1.5 }} />
            : <WorkIcon sx={{ fontSize: 48, color: facelift.text4, mb: 1.5 }} />}
          <Typography sx={{ fontWeight: 600 }}>Nothing here</Typography>
          <Typography variant="body2" sx={{ color: facelift.text2, mt: 0.5 }}>
            {activeKey === BENCH_QUEUE.MINE ? 'You have no work claimed to your bench.' : 'No work in this category.'}
          </Typography>
        </SurfaceCard>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(3, minmax(0, 1fr))' },
            gap: 2,
          }}
        >
          {shown.map((wo) => (
            <BenchWorkCard
              key={wo.workOrderID}
              wo={wo}
              currentUserID={userID}
              isAdmin={isAdmin}
              jewelers={jewelers}
              qc={qc}
              busy={busyID === wo.workOrderID}
              uploadPct={uploadPct[wo.workOrderID] ?? null}
              error={cardErrors[wo.workOrderID]}
              selectable={activeKey === BENCH_QUEUE.QC}
              isSelected={selectedQcIDs.includes(wo.workOrderID)}
              onToggleSelect={toggleQc}
              onAction={runAction}
              onOpenPartsDialog={openPartsDialog}
              onUploadStl={uploadStl}
              onUploadGlb={uploadGlb}
            />
          ))}
        </Box>
      )}

      {/* Camera scanner */}
      <ContinuousBarcodeScanner
        open={claimScannerOpen}
        title="Scan Repairs to Claim"
        queuedCount={queuedClaimIDs.length}
        actionLabel={scanLoading ? 'Claiming…' : `Claim ${queuedClaimIDs.length} Queued`}
        actionDisabled={scanLoading || queuedClaimIDs.length === 0}
        onClose={() => setClaimScannerOpen(false)}
        onScan={queueClaimID}
        onAction={claimQueued}
      >
        {queuedClaimIDs.length > 0 ? (
          <Box>
            <SectionLabel sx={{ mb: 1 }}>Queued to claim ({queuedClaimIDs.length})</SectionLabel>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {queuedClaimIDs.map((id) => (
                <Chip key={id} label={id} onDelete={() => removeQueued(id)} deleteIcon={<CloseIcon />} />
              ))}
            </Box>
          </Box>
        ) : (
          <Typography variant="body2" sx={{ color: facelift.text2 }}>Scanned repairs appear here. The camera stays open until you close it.</Typography>
        )}
      </ContinuousBarcodeScanner>

      {/* Needs Parts dialog */}
      <Dialog open={!!partsDialogWO} onClose={closePartsDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Move to Needs Parts</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" sx={{ color: facelift.text2 }}>Add the part or material that needs to be ordered before moving this repair.</Typography>
            {partsDialogWO && <Alert severity="info">{partsDialogWO.sourceID} — {partsDialogWO.source?.clientName || partsDialogWO.source?.businessName || ''}</Alert>}
            {partsError && <Alert severity="error">{partsError}</Alert>}
            <TextField select label="Material Source" value={partsForm.source} onChange={(e) => setPF('source', e.target.value)} fullWidth>
              <MenuItem value="stuller">Stuller part number</MenuItem>
              <MenuItem value="manual">Manual material</MenuItem>
            </TextField>
            {partsForm.source === 'stuller' ? (
              <TextField label="Stuller Part Number" value={partsForm.stullerSku} onChange={(e) => setPF('stullerSku', e.target.value)} autoFocus fullWidth />
            ) : (
              <>
                <TextField label="Material Name" value={partsForm.name} onChange={(e) => setPF('name', e.target.value)} autoFocus fullWidth />
                <TextField label="Description" value={partsForm.description} onChange={(e) => setPF('description', e.target.value)} fullWidth multiline minRows={2} />
                <Grid container spacing={1.5}>
                  <Grid item xs={6}><TextField label="Quantity" type="number" value={partsForm.quantity} onChange={(e) => setPF('quantity', e.target.value)} inputProps={{ min: 0, step: 0.25 }} fullWidth /></Grid>
                  <Grid item xs={6}><TextField label="Line Price" type="number" value={partsForm.price} onChange={(e) => setPF('price', e.target.value)} inputProps={{ min: 0, step: 0.01 }} fullWidth /></Grid>
                </Grid>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closePartsDialog} disabled={partsLoading}>Cancel</Button>
          <Button variant="contained" onClick={submitNeedsParts} disabled={partsLoading}>
            {partsLoading ? 'Moving…' : 'Add Material & Move'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={5000} onClose={closeSnack} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={closeSnack} severity={snack.severity}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}
