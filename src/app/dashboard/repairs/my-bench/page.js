'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Typography, Button, Chip, CircularProgress,
  TextField, MenuItem, Alert, Snackbar, Stack, Pagination,
} from '@mui/material';
import {
  Handyman as WorkIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  VerifiedUser as QCIcon,
  Forum as CommunicationsIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

import ContinuousBarcodeScanner from '@/components/repairs/ContinuousBarcodeScanner';
import { scanActionsFor, scanActionByKey, runScanAction, summarizeScanRun } from '@/services/bench/scanActions';
import { hasNamedCapability } from '@/lib/repairAccess';
import { BENCH_QUEUE, BENCH_TABS, isWorkOrderInTab } from '@/services/workOrders/workOrderWorkflow';
import { uploadSizeError } from '@/lib/uploadLimits';
import { directUpload, postFileWithProgress } from '@/lib/directUpload';
import BenchWorkCard from './components/BenchWorkCard';
import { isAdminRole, isOnsiteRepairOps } from '@/lib/repairAccess';
import { PageHeader, SurfaceCard, SectionLabel, TabRail, facelift } from '@/components/facelift';
import { NeedsPartsDialog } from './components/NeedsPartsDialog';
import { BenchScanPanel } from './components/BenchScanPanel';

const BENCH_PAGE_SIZE = 20;


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
  // What a scanned batch does. Claim is the default because it is how the piece reaches a bench;
  // everything after that is a move the jeweler makes with the piece already in hand.
  const [scanAction, setScanAction] = useState('claim');
  const [benchPage, setBenchPage] = useState(1);
  useEffect(() => { setBenchPage(1); }, [tab]);
  const scanActions = useMemo(() => scanActionsFor((c) => hasNamedCapability(session, c)), [session]);
  // Every scan route needs on-site repair ops (requireRepairOps); an off-site artisan saw a scan box that could only
  // fail (EFD-DEFECTS B7).
  const canScan = isAdminRole(session) || isOnsiteRepairOps(session);

  // Bulk QC + parts
  const [bulkQcLoading, setBulkQcLoading] = useState(false);
  const [selectedQcIDs, setSelectedQcIDs] = useState([]);
  const [bulkCompleteLoading, setBulkCompleteLoading] = useState(false);
  // The dialog owns its own form, loading and error state — the page only needs to know which work
  // order it is open on.
  const [partsDialogWO, setPartsDialogWO] = useState(null);

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

  // --- Scanning (repairs; the scanned value is a repairID). What the batch DOES is `scanAction`. ---
  const queueClaimID = (repairID) => {
    const clean = String(repairID || '').trim();
    if (!clean) return;
    setQueuedClaimIDs((prev) => (prev.includes(clean) ? prev : [...prev, clean]));
    setScanValue('');
  };
  const handleQueueScan = (e) => { e?.preventDefault?.(); queueClaimID(scanValue); };
  const removeQueued = (repairID) => setQueuedClaimIDs((prev) => prev.filter((id) => id !== repairID));

  // Run the chosen action over everything queued (services/bench/scanActions.js). Whatever moved
  // leaves the queue; whatever failed stays on it, named, so it can be retried or removed by hand.
  const runQueued = async () => {
    const action = scanActionByKey(scanAction);
    if (!action || queuedClaimIDs.length === 0) return;
    setScanLoading(true);
    try {
      const { ok, failed } = await runScanAction({ action, repairIDs: queuedClaimIDs });
      if (ok.length) setQueuedClaimIDs((prev) => prev.filter((id) => !ok.includes(id)));
      await fetchWorkOrders();
      const { text, severity } = summarizeScanRun({ action, ok, failed });
      showSnack(text, severity);
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
    // Not CAD: a CAD piece reaches QC by submitting its file (the server refuses it here too — EFD-DEFECTS B5).
    () => (byTab[BENCH_QUEUE.MINE] || []).filter((wo) => wo.benchQueue === BENCH_QUEUE.IN_PROGRESS && wo.discipline !== 'cad'),
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
      if (done) showSnack(`Approved ${done} at QC.`, 'success');
      if (errs.length) showSnack(errs.join(' | '), 'error');
    } finally {
      setBulkCompleteLoading(false);
    }
  };

  // --- Parts dialog ---
  const openPartsDialog = (wo) => setPartsDialogWO(wo);

  // The dialog has already written the material and moved the repair; the page refreshes and says so.
  const onPartsMoved = async (wo) => {
    await fetchWorkOrders();
    showSnack(`Added material and moved ${wo.sourceID} to Needs Parts.`, 'success');
    setPartsDialogWO(null);
  };

  if (status === 'loading') {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}><CircularProgress /></Box>;
  }

  const activeKey = BENCH_TABS[tab].key;
  const shown = byTab[activeKey] || [];
  // One page at a time: a busy bench (or a big claim) was one endless list (owner, 2026-10-01).
  const pageCount = Math.max(1, Math.ceil(shown.length / BENCH_PAGE_SIZE));
  const currentPage = Math.min(benchPage, pageCount);
  const visible = shown.slice((currentPage - 1) * BENCH_PAGE_SIZE, currentPage * BENCH_PAGE_SIZE);
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

      {/* Scan a ticket, then tell the batch what to do with it. */}
      {canScan && (
        <BenchScanPanel
          scanValue={scanValue}
          onScanValueChange={setScanValue}
          onQueueSubmit={handleQueueScan}
          scanAction={scanAction}
          onScanActionChange={setScanAction}
          scanActions={scanActions}
          queuedIDs={queuedClaimIDs}
          onRemoveQueued={removeQueued}
          onRunQueued={runQueued}
          onOpenCamera={() => setClaimScannerOpen(true)}
          loading={scanLoading}
        />
      )}

      {/* The lanes. TabRail, not MUI Tabs: MUI's scroll buttons never render on a touch screen, so the
          last lanes were reachable only by an undiscoverable swipe. */}
      <Box sx={{ mt: 2.5, mb: 2 }}>
        <TabRail
          ariaLabel="Bench lanes"
          value={BENCH_TABS[tab].key}
          onChange={(key) => setTab(BENCH_TABS.findIndex((t) => t.key === key))}
          items={BENCH_TABS.map(({ label, key }) => ({ key, label, count: byTab[key]?.length ?? 0 }))}
        />
      </Box>

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
          {visible.map((wo) => (
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
      {pageCount > 1 && (
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems="center" justifyContent="space-between" spacing={1} sx={{ mt: 2 }}>
          <Typography variant="caption" sx={{ color: facelift.text3 }}>
            {(currentPage - 1) * BENCH_PAGE_SIZE + 1}–{Math.min(currentPage * BENCH_PAGE_SIZE, shown.length)} of {shown.length}
          </Typography>
          <Pagination
            count={pageCount}
            page={currentPage}
            onChange={(_, p) => { setBenchPage(p); window.scrollTo?.({ top: 0, behavior: 'smooth' }); }}
            size="small"
            siblingCount={0}
          />
        </Stack>
      )}

      {/* Camera scanner. The action picker is repeated in here on purpose — with the camera open the
          card behind it is unreachable, and having to close the camera to choose is exactly what made
          the claim-only scanner useless for anything but claiming. */}
      <ContinuousBarcodeScanner
        open={claimScannerOpen}
        title="Scan Repairs"
        queuedCount={queuedClaimIDs.length}
        actionLabel={scanLoading ? 'Working…' : `${scanActionByKey(scanAction)?.label ?? 'Apply'} ${queuedClaimIDs.length}`}
        actionDisabled={scanLoading || queuedClaimIDs.length === 0}
        onClose={() => setClaimScannerOpen(false)}
        onScan={queueClaimID}
        onAction={runQueued}
      >
        <TextField
          select size="small" label="Then" value={scanAction} fullWidth
          onChange={(e) => setScanAction(e.target.value)}
          sx={{ mb: 1.5 }}
        >
          {scanActions.map((a) => <MenuItem key={a.key} value={a.key}>{a.label}</MenuItem>)}
        </TextField>
        {queuedClaimIDs.length > 0 ? (
          <Box>
            <SectionLabel sx={{ mb: 1 }}>Queued ({queuedClaimIDs.length})</SectionLabel>
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

      <NeedsPartsDialog
        workOrder={partsDialogWO}
        onClose={() => setPartsDialogWO(null)}
        onMoved={onPartsMoved}
      />

      <Snackbar open={snack.open} autoHideDuration={5000} onClose={closeSnack} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={closeSnack} severity={snack.severity}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}
