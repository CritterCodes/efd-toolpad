'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
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

import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';
import ContinuousBarcodeScanner from '@/components/repairs/ContinuousBarcodeScanner';
import { BENCH_QUEUE, BENCH_TABS, isWorkOrderInTab } from '@/services/workOrders/workOrderWorkflow';
import BenchWorkCard from './components/BenchWorkCard';

const DEFAULT_PARTS_FORM = { source: 'stuller', stullerSku: '', name: '', description: '', quantity: '1', price: '' };

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
function normalizePricingSettings(adminSettings = {}) {
  const pricing = adminSettings?.pricing && typeof adminSettings.pricing === 'object' ? adminSettings.pricing : adminSettings;
  const administrativeFee = toNumber(pricing?.administrativeFee ?? 0.10);
  const businessFee = toNumber(pricing?.businessFee ?? 0.15);
  const consumablesFee = toNumber(pricing?.consumablesFee ?? 0.05);
  const materialMarkup = Math.max(toNumber(pricing?.materialMarkup ?? 1.0), 1);
  const businessMultiplier = Math.max(1 + administrativeFee + businessFee + consumablesFee, 1);
  return { materialMarkup, businessMultiplier };
}
function calculateRetailFromBaseCosts(baseMaterialsCost = 0, laborCost = 0, adminSettings = {}) {
  const safeMaterials = Math.max(toNumber(baseMaterialsCost), 0);
  const safeLabor = Math.max(toNumber(laborCost), 0);
  const { materialMarkup, businessMultiplier } = normalizePricingSettings(adminSettings);
  const retail = ((safeMaterials + safeLabor) * businessMultiplier) + (safeMaterials * (materialMarkup - 1));
  return Math.round(retail * 100) / 100;
}
function buildStullerMaterial(stullerResponse, stullerSku, adminSettings = {}) {
  const data = stullerResponse?.data || stullerResponse || {};
  const basePrice = toNumber(data.price || data.showcasePrice, 0);
  const retailPrice = calculateRetailFromBaseCosts(basePrice, 0, adminSettings);
  const name = data.description || `Stuller ${stullerSku}`;
  return {
    id: Date.now(), name, displayName: name,
    description: `${data.longDescription || data.description || name} (Stuller: ${stullerSku})`,
    quantity: 1, price: retailPrice, retailPrice, unitCost: basePrice, stullerPrice: basePrice,
    baseCostPerPortion: basePrice, category: 'stuller_material', supplier: 'Stuller',
    stuller_item_number: stullerSku, isStullerItem: true,
    stullerData: {
      originalPrice: basePrice, itemNumber: stullerSku,
      materialMarkup: normalizePricingSettings(adminSettings).materialMarkup,
      businessMultiplier: normalizePricingSettings(adminSettings).businessMultiplier,
      weight: data.weight, dimensions: data.dimensions, metal: data.metal,
    },
  };
}

export default function BenchPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [busyID, setBusyID] = useState('');
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
    }
  }, [status, fetchWorkOrders, fetchJewelers]);

  const userID = session?.user?.userID;
  const isAdmin = ['admin', 'dev'].includes(session?.user?.role);

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
        material = buildStullerMaterial(stullerData, cleanSku, adminSettings);
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
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}><CircularProgress sx={{ color: REPAIRS_UI.accent }} /></Box>;
  }

  const activeKey = BENCH_TABS[tab].key;
  const shown = byTab[activeKey] || [];
  const shownQcIDs = activeKey === BENCH_QUEUE.QC ? shown.map((wo) => wo.workOrderID) : [];
  const selectedShownQc = shownQcIDs.filter((id) => selectedQcIDs.includes(id));

  return (
    <Box sx={{ pb: 8 }}>
      {/* Header panel */}
      <Box sx={{ bgcolor: REPAIRS_UI.bgPanel, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 3, p: { xs: 2, md: 3 }, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <WorkIcon sx={{ color: REPAIRS_UI.accent, fontSize: 28 }} />
            <Box>
              <Typography sx={{ fontSize: { xs: 24, md: 30 }, fontWeight: 600, color: REPAIRS_UI.textHeader, lineHeight: 1.1 }}>Bench</Typography>
              <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>
                All active work across your disciplines — repairs, production, customs, sale service.
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => router.push('/dashboard/repairs/new')} sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border }}>New Repair</Button>
            <Button size="small" variant="contained" startIcon={<QCIcon />} onClick={moveMyBenchToQc} disabled={bulkQcLoading || mineInProgress.length === 0} sx={{ bgcolor: '#00C49F', color: '#000', '&:hover': { bgcolor: '#00a985' } }}>
              {bulkQcLoading ? 'Moving…' : `Move My Bench to QC (${mineInProgress.length})`}
            </Button>
            <Button size="small" variant="outlined" startIcon={<RefreshIcon />} onClick={fetchWorkOrders} disabled={loading} sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border }}>Refresh</Button>
          </Box>
        </Box>

        {/* Summary counts */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2 }}>
          {BENCH_TABS.map(({ label, key }) => (
            <Box key={key} sx={{ textAlign: 'center' }}>
              <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: REPAIRS_UI.textHeader, lineHeight: 1 }}>{byTab[key]?.length ?? 0}</Typography>
              <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>{label}</Typography>
            </Box>
          ))}
        </Box>

        {/* Scan to claim */}
        <Box component="form" onSubmit={handleQueueScan} sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <TextField
            label="Scan to Claim" placeholder="Scan repair ticket barcode" value={scanValue}
            onChange={(e) => setScanValue(e.target.value)} autoComplete="off" autoFocus size="small"
            sx={{ minWidth: { xs: '100%', sm: 320 }, '& .MuiOutlinedInput-root': { bgcolor: REPAIRS_UI.bgCard, color: REPAIRS_UI.textPrimary }, '& .MuiInputLabel-root': { color: REPAIRS_UI.textMuted } }}
            helperText="Barcode scan lands here. Press Enter to queue each repair, then claim the batch."
            FormHelperTextProps={{ sx: { color: REPAIRS_UI.textMuted } }}
          />
          <Button type="submit" variant="outlined" startIcon={<ScanIcon />} disabled={scanLoading || !scanValue.trim()} sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border }}>Queue Scan</Button>
          <Button type="button" variant="outlined" startIcon={<ScanIcon />} disabled={scanLoading} onClick={() => setClaimScannerOpen(true)} sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border }}>Camera Scan</Button>
          <Button type="button" variant="contained" disabled={scanLoading || queuedClaimIDs.length === 0} onClick={claimQueued} sx={{ bgcolor: REPAIRS_UI.accent, color: '#000', '&:hover': { bgcolor: '#c9a227' } }}>
            {scanLoading ? 'Claiming…' : `Claim ${queuedClaimIDs.length} Queued`}
          </Button>
        </Box>
        {queuedClaimIDs.length > 0 && (
          <Box sx={{ mt: 1.5 }}>
            <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, display: 'block', mb: 1 }}>Queued to claim ({queuedClaimIDs.length})</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {queuedClaimIDs.map((id) => (
                <Chip key={id} label={id} onDelete={() => removeQueued(id)} deleteIcon={<CloseIcon />} sx={{ bgcolor: REPAIRS_UI.bgCard, color: REPAIRS_UI.textPrimary, border: `1px solid ${REPAIRS_UI.border}` }} />
              ))}
            </Box>
          </Box>
        )}
      </Box>

      {/* Tabs */}
      <Tabs
        value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile
        sx={{ mb: 2, maxWidth: '100%', '& .MuiTabs-scroller': { overflowX: 'auto !important' }, '& .MuiTab-root': { color: REPAIRS_UI.textSecondary, textTransform: 'none', flexShrink: 0 }, '& .Mui-selected': { color: REPAIRS_UI.accent }, '& .MuiTabs-indicator': { bgcolor: REPAIRS_UI.accent } }}
      >
        {BENCH_TABS.map(({ label, key }) => <Tab key={key} label={`${label} (${byTab[key]?.length ?? 0})`} />)}
      </Tabs>

      {/* QC bulk bar */}
      {activeKey === BENCH_QUEUE.QC && shown.length > 0 && (
        <Box sx={{ bgcolor: REPAIRS_UI.bgPanel, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, p: 1.5, mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap' }}>
          <Box>
            <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 600 }}>QC Selection</Typography>
            <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>{selectedShownQc.length} selected on this tab</Typography>
          </Box>
          <Button variant="contained" startIcon={<QCIcon />} disabled={bulkCompleteLoading || selectedShownQc.length === 0} onClick={completeSelectedQc} sx={{ bgcolor: '#00C49F', color: '#000', '&:hover': { bgcolor: '#00a985' } }}>
            {bulkCompleteLoading ? 'Approving…' : `Approve to Payment & Pickup (${selectedShownQc.length})`}
          </Button>
        </Box>
      )}

      {/* Grid / states */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress sx={{ color: REPAIRS_UI.accent }} /></Box>
      ) : shown.length === 0 ? (
        <Box sx={{ bgcolor: REPAIRS_UI.bgPanel, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 3, py: 6, textAlign: 'center' }}>
          {activeKey === BENCH_QUEUE.COMMUNICATIONS
            ? <CommunicationsIcon sx={{ fontSize: 48, color: REPAIRS_UI.textMuted, mb: 1.5 }} />
            : <WorkIcon sx={{ fontSize: 48, color: REPAIRS_UI.textMuted, mb: 1.5 }} />}
          <Typography sx={{ color: REPAIRS_UI.textHeader }}>Nothing here</Typography>
          <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary, mt: 0.5 }}>
            {activeKey === BENCH_QUEUE.MINE ? 'You have no work claimed to your bench.' : 'No work in this category.'}
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {shown.map((wo) => (
            <Grid item xs={12} sm={6} xl={4} key={wo.workOrderID}>
              <BenchWorkCard
                wo={wo}
                currentUserID={userID}
                isAdmin={isAdmin}
                jewelers={jewelers}
                busy={busyID === wo.workOrderID}
                error={cardErrors[wo.workOrderID]}
                selectable={activeKey === BENCH_QUEUE.QC}
                isSelected={selectedQcIDs.includes(wo.workOrderID)}
                onToggleSelect={toggleQc}
                onAction={runAction}
                onOpenPartsDialog={openPartsDialog}
              />
            </Grid>
          ))}
        </Grid>
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
            <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, display: 'block', mb: 1 }}>Queued to claim ({queuedClaimIDs.length})</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {queuedClaimIDs.map((id) => (
                <Chip key={id} label={id} onDelete={() => removeQueued(id)} deleteIcon={<CloseIcon />} sx={{ bgcolor: REPAIRS_UI.bgCard, color: REPAIRS_UI.textPrimary, border: `1px solid ${REPAIRS_UI.border}` }} />
              ))}
            </Box>
          </Box>
        ) : (
          <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>Scanned repairs appear here. The camera stays open until you close it.</Typography>
        )}
      </ContinuousBarcodeScanner>

      {/* Needs Parts dialog */}
      <Dialog open={!!partsDialogWO} onClose={closePartsDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Move to Needs Parts</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>Add the part or material that needs to be ordered before moving this repair.</Typography>
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
          <Button variant="contained" onClick={submitNeedsParts} disabled={partsLoading} sx={{ bgcolor: REPAIRS_UI.accent, color: '#000', '&:hover': { bgcolor: '#c9a227' } }}>
            {partsLoading ? 'Moving…' : 'Add Material & Move'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={5000} onClose={closeSnack} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={closeSnack} severity={snack.severity} sx={{ bgcolor: REPAIRS_UI.bgCard, color: REPAIRS_UI.textPrimary, border: `1px solid ${REPAIRS_UI.border}` }}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}
