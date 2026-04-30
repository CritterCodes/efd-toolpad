"use client";
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Grid, Button, Chip, CircularProgress, Tabs, Tab,
  Card, CardContent, CardActions, Divider, Alert, TextField, MenuItem, Checkbox,
  Dialog, DialogTitle, DialogContent, DialogActions, Stack,
} from '@mui/material';
import {
  Work as WorkIcon,
  Refresh as RefreshIcon,
  QrCodeScanner as ScanIcon,
  VerifiedUser as QCIcon,
  Category as PartsIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';
import RepairThumbnail from '@/app/dashboard/repairs/components/RepairThumbnail';
import ContinuousBarcodeScanner from '@/components/repairs/ContinuousBarcodeScanner';

const TABS = [
  { label: 'My Bench', key: 'mine' },
  { label: 'Unclaimed', key: 'unclaimed' },
  { label: 'Needs Parts', key: 'waiting_parts' },
  { label: 'QC', key: 'qc' },
];

const BENCH_STATUS_COLOR = {
  IN_PROGRESS: '#0088FE',
  UNCLAIMED: REPAIRS_UI.textMuted,
  WAITING_PARTS: '#FF8042',
  QC: '#00C49F',
};

const DEFAULT_PARTS_FORM = {
  source: 'stuller',
  stullerSku: '',
  name: '',
  description: '',
  quantity: '1',
  price: '',
};

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizePricingSettings(adminSettings = {}) {
  const pricing = adminSettings?.pricing && typeof adminSettings.pricing === 'object'
    ? adminSettings.pricing
    : adminSettings;
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
    id: Date.now(),
    name,
    displayName: name,
    description: `${data.longDescription || data.description || name} (Stuller: ${stullerSku})`,
    quantity: 1,
    price: retailPrice,
    retailPrice,
    unitCost: basePrice,
    stullerPrice: basePrice,
    baseCostPerPortion: basePrice,
    category: 'stuller_material',
    supplier: 'Stuller',
    stuller_item_number: stullerSku,
    isStullerItem: true,
    stullerData: {
      originalPrice: basePrice,
      itemNumber: stullerSku,
      materialMarkup: normalizePricingSettings(adminSettings).materialMarkup,
      businessMultiplier: normalizePricingSettings(adminSettings).businessMultiplier,
      weight: data.weight,
      dimensions: data.dimensions,
      metal: data.metal,
    },
  };
}

function getJewelerLabel(jeweler) {
  return [jeweler.firstName, jeweler.lastName].filter(Boolean).join(' ').trim()
    || jeweler.name
    || jeweler.email
    || jeweler.userID;
}

function RepairBenchCard({
  repair,
  currentUserID,
  isAdmin,
  jewelers,
  onRefresh,
  selectable = false,
  isSelected = false,
  onToggleSelect,
  onOpenPartsDialog,
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const doAction = async (action) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/repairs/${repair.repairID}/${action}`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Action failed');
      }
      onRefresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const assignJeweler = async (userID) => {
    if (userID === repair.assignedTo) return;
    if (!userID) {
      await doAction('unclaim');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/repairs/${encodeURIComponent(repair.repairID)}/assign-bench`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userID }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Unable to assign repair');
      onRefresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const isMine = repair.assignedTo === currentUserID;

  return (
    <Card
      sx={{
        bgcolor: REPAIRS_UI.bgPanel,
        border: `1px solid ${isSelected ? REPAIRS_UI.accent : REPAIRS_UI.border}`,
        borderRadius: 2,
        boxShadow: isSelected ? `0 0 0 2px ${REPAIRS_UI.accent}33` : 'none',
      }}
    >
      <CardContent sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            {selectable && (
              <Checkbox
                checked={isSelected}
                onChange={() => onToggleSelect?.(repair.repairID)}
                sx={{
                  color: REPAIRS_UI.border,
                  '&.Mui-checked': { color: REPAIRS_UI.accent },
                  p: 0,
                }}
              />
            )}
            <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, fontFamily: 'monospace' }}>
              {repair.repairID}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {repair.isRush && (
              <Chip label="RUSH" size="small" sx={{ bgcolor: '#FF4444', color: '#fff', fontSize: '0.65rem', height: 20 }} />
            )}
            <Chip
              label={repair.benchStatus || 'UNCLAIMED'}
              size="small"
              sx={{
                bgcolor: BENCH_STATUS_COLOR[repair.benchStatus] ?? REPAIRS_UI.bgCard,
                color: '#fff',
                fontSize: '0.65rem',
                height: 20,
              }}
            />
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start' }}>
          <RepairThumbnail repair={repair} size={82} />
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="subtitle2" sx={{ color: REPAIRS_UI.textHeader, fontWeight: 600, mb: 0.5 }}>
              {repair.clientName || repair.businessName}
            </Typography>
            <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary, mb: 1, fontSize: '0.8rem' }}>
              {repair.description?.slice(0, 100)}{repair.description?.length > 100 ? '...' : ''}
            </Typography>

            {repair.assignedJeweler && (
              <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>
                Assigned to: {repair.assignedJeweler}
              </Typography>
            )}

            {repair.promiseDate && (
              <Typography variant="caption" sx={{ display: 'block', color: REPAIRS_UI.accent }}>
                Due: {new Date(repair.promiseDate).toLocaleDateString()}
              </Typography>
            )}
          </Box>
        </Box>

        {error && <Alert severity="error" sx={{ mt: 1, py: 0 }}>{error}</Alert>}
      </CardContent>

      <Divider sx={{ borderColor: REPAIRS_UI.border }} />

      <CardActions sx={{ px: 1.5, py: 1, gap: 0.5, flexWrap: 'wrap' }}>
        <Button
          size="small"
          variant="outlined"
          onClick={() => router.push(`/dashboard/repairs/${repair.repairID}`)}
          sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border, fontSize: '0.75rem' }}
        >
          View
        </Button>

        {isAdmin && (
          <TextField
            select
            size="small"
            label="Assign Jeweler"
            value={repair.assignedTo || ''}
            disabled={loading || jewelers.length === 0}
            onChange={(event) => assignJeweler(event.target.value)}
            sx={{
              minWidth: 170,
              '& .MuiOutlinedInput-root': {
                bgcolor: REPAIRS_UI.bgCard,
                color: REPAIRS_UI.textPrimary,
                fontSize: '0.75rem',
              },
              '& .MuiInputLabel-root': { color: REPAIRS_UI.textMuted, fontSize: '0.75rem' },
              '& .MuiSelect-icon': { color: REPAIRS_UI.textSecondary },
            }}
          >
            <MenuItem value="">
              Unassigned
            </MenuItem>
            {jewelers.map((jeweler) => (
              <MenuItem key={jeweler.userID} value={jeweler.userID}>
                {getJewelerLabel(jeweler)}
              </MenuItem>
            ))}
          </TextField>
        )}

        {!isMine && repair.benchStatus !== 'IN_PROGRESS' && (
          <Button
            size="small"
            variant="contained"
            disabled={loading}
            onClick={() => doAction('claim')}
            sx={{ bgcolor: REPAIRS_UI.accent, color: '#000', fontSize: '0.75rem', '&:hover': { bgcolor: '#c9a227' } }}
          >
            Claim
          </Button>
        )}

        {isMine && repair.benchStatus === 'IN_PROGRESS' && (
          <>
            <Button
              size="small"
              variant="outlined"
              disabled={loading}
              onClick={() => doAction('unclaim')}
              sx={{ color: REPAIRS_UI.textSecondary, borderColor: REPAIRS_UI.border, fontSize: '0.75rem' }}
            >
              Unclaim
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<PartsIcon sx={{ fontSize: 14 }} />}
              disabled={loading}
              onClick={() => onOpenPartsDialog?.(repair)}
              sx={{ color: REPAIRS_UI.textSecondary, borderColor: REPAIRS_UI.border, fontSize: '0.75rem' }}
            >
              Needs Parts
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<QCIcon sx={{ fontSize: 14 }} />}
              disabled={loading}
              onClick={() => doAction('move-to-qc')}
              sx={{ color: '#00C49F', borderColor: '#00C49F', fontSize: '0.75rem' }}
            >
              Move to QC
            </Button>
          </>
        )}

        {repair.benchStatus === 'WAITING_PARTS' && (
          <>
            {repair.status !== 'PARTS ORDERED' && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<PartsIcon sx={{ fontSize: 14 }} />}
                disabled={loading}
                onClick={() => doAction('mark-parts-ordered')}
                sx={{ color: REPAIRS_UI.textSecondary, borderColor: REPAIRS_UI.border, fontSize: '0.75rem' }}
              >
                Mark Parts Ordered
              </Button>
            )}
            <Button
              size="small"
              variant="contained"
              disabled={loading}
              onClick={() => doAction('parts-ready-for-work')}
              sx={{ bgcolor: REPAIRS_UI.accent, color: '#000', fontSize: '0.75rem', '&:hover': { bgcolor: '#c9a227' } }}
            >
              Move Back to Bench
            </Button>
          </>
        )}
      </CardActions>
    </Card>
  );
}

export default function MyBenchPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [scanValue, setScanValue] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState('');
  const [scanSuccess, setScanSuccess] = useState('');
  const [queuedClaimIDs, setQueuedClaimIDs] = useState([]);
  const [claimScannerOpen, setClaimScannerOpen] = useState(false);
  const [jewelers, setJewelers] = useState([]);
  const [bulkQcLoading, setBulkQcLoading] = useState(false);
  const [selectedQcIDs, setSelectedQcIDs] = useState([]);
  const [bulkCompleteLoading, setBulkCompleteLoading] = useState(false);
  const [partsDialogRepair, setPartsDialogRepair] = useState(null);
  const [partsForm, setPartsForm] = useState(DEFAULT_PARTS_FORM);
  const [partsLoading, setPartsLoading] = useState(false);
  const [partsError, setPartsError] = useState('');

  const fetchRepairs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/repairs/my-bench');
      if (res.ok) {
        const data = await res.json();
        setRepairs(Array.isArray(data) ? data : []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchJewelers = useCallback(async () => {
    try {
      const res = await fetch('/api/repairs/bench-jewelers');
      if (res.ok) {
        const data = await res.json();
        setJewelers(Array.isArray(data) ? data : []);
      }
    } catch {
      setJewelers([]);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchRepairs();
      fetchJewelers();
    }
  }, [status, fetchRepairs, fetchJewelers]);

  const queueClaimID = (repairID) => {
    const cleanRepairID = String(repairID || '').trim();
    if (!cleanRepairID) return;

    setScanError('');
    setScanSuccess('');

    if (queuedClaimIDs.includes(cleanRepairID)) {
      setScanError(`${cleanRepairID} is already queued.`);
      setScanValue('');
      return;
    }

    setQueuedClaimIDs(prev => [...prev, cleanRepairID]);
    setScanSuccess(`Queued ${cleanRepairID}`);
    setScanValue('');
  };

  const handleQueueScan = (event) => {
    event?.preventDefault?.();
    queueClaimID(scanValue);
  };

  const handleRemoveQueuedClaim = (repairID) => {
    setQueuedClaimIDs(prev => prev.filter(id => id !== repairID));
  };

  const handleClaimQueuedRepairs = async () => {
    if (queuedClaimIDs.length === 0) return;

    setScanLoading(true);
    setScanError('');
    setScanSuccess('');

    try {
      const results = [];

      for (const repairID of queuedClaimIDs) {
        const res = await fetch(`/api/repairs/${encodeURIComponent(repairID)}/claim`, { method: 'POST' });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          results.push({ repairID, ok: false, error: data.error || 'Unable to claim repair' });
          continue;
        }

        results.push({ repairID, ok: true });
      }

      const claimed = results.filter(result => result.ok).map(result => result.repairID);
      const failed = results.filter(result => !result.ok);

      if (claimed.length > 0) {
        setQueuedClaimIDs(prev => prev.filter(id => !claimed.includes(id)));
      }

      setScanValue('');
      await fetchRepairs();

      if (failed.length === 0) {
        setScanSuccess(`Claimed ${claimed.length} repair${claimed.length !== 1 ? 's' : ''}.`);
      } else {
        setScanError(failed.map(result => `${result.repairID}: ${result.error}`).join(' | '));
        if (claimed.length > 0) {
          setScanSuccess(`Claimed ${claimed.length} repair${claimed.length !== 1 ? 's' : ''}.`);
        }
      }
    } catch (error) {
      setScanError(error.message);
    } finally {
      setScanLoading(false);
    }
  };

  const handleMoveMyBenchToQc = async () => {
    const mineReadyForQc = repairs.filter(
      repair => repair.assignedTo === userID && repair.benchStatus === 'IN_PROGRESS'
    );

    if (mineReadyForQc.length === 0) return;

    setBulkQcLoading(true);
    setScanError('');
    setScanSuccess('');

    try {
      const results = [];

      for (const repair of mineReadyForQc) {
        const repairID = repair.repairID;
        const res = await fetch(`/api/repairs/${encodeURIComponent(repairID)}/move-to-qc`, { method: 'POST' });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          results.push({ repairID, ok: false, error: data.error || 'Unable to move repair to QC' });
          continue;
        }

        results.push({ repairID, ok: true });
      }

      await fetchRepairs();

      const moved = results.filter(result => result.ok);
      const failed = results.filter(result => !result.ok);

      if (failed.length > 0) {
        setScanError(failed.map(result => `${result.repairID}: ${result.error}`).join(' | '));
      }

      if (moved.length > 0) {
        setScanSuccess(`Moved ${moved.length} repair${moved.length !== 1 ? 's' : ''} to QC.`);
      }
    } catch (error) {
      setScanError(error.message);
    } finally {
      setBulkQcLoading(false);
    }
  };

  const handleToggleQcSelection = (repairID) => {
    setSelectedQcIDs(prev => (
      prev.includes(repairID)
        ? prev.filter(id => id !== repairID)
        : [...prev, repairID]
    ));
  };

  const handleSetShownQcSelection = (repairIDs, checked) => {
    setSelectedQcIDs(prev => {
      if (checked) {
        return Array.from(new Set([...prev, ...repairIDs]));
      }
      return prev.filter(id => !repairIDs.includes(id));
    });
  };

  const handleCompleteSelectedQc = async () => {
    const qcRepairIDs = repairs
      .filter(repair => selectedQcIDs.includes(repair.repairID) && (repair.benchStatus === 'QC' || repair.status === 'QC'))
      .map(repair => repair.repairID);

    if (qcRepairIDs.length === 0) return;

    setBulkCompleteLoading(true);
    setScanError('');
    setScanSuccess('');

    try {
      const results = [];

      for (const repairID of qcRepairIDs) {
        const res = await fetch(`/api/repairs/${encodeURIComponent(repairID)}/complete-from-qc`, { method: 'POST' });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          results.push({ repairID, ok: false, error: data.error || 'Unable to complete repair from QC' });
          continue;
        }

        results.push({ repairID, ok: true });
      }

      const completed = results.filter(result => result.ok).map(result => result.repairID);
      const failed = results.filter(result => !result.ok);

      if (completed.length > 0) {
        setSelectedQcIDs(prev => prev.filter(id => !completed.includes(id)));
      }

      await fetchRepairs();

      if (failed.length > 0) {
        setScanError(failed.map(result => `${result.repairID}: ${result.error}`).join(' | '));
      }

      if (completed.length > 0) {
        setScanSuccess(`Approved ${completed.length} QC repair${completed.length !== 1 ? 's' : ''} and moved ${completed.length !== 1 ? 'them' : 'it'} to Payment & Pickup.`);
      }
    } catch (error) {
      setScanError(error.message);
    } finally {
      setBulkCompleteLoading(false);
    }
  };

  const openPartsDialog = (repair) => {
    setPartsDialogRepair(repair);
    setPartsForm(DEFAULT_PARTS_FORM);
    setPartsError('');
  };

  const closePartsDialog = () => {
    if (partsLoading) return;
    setPartsDialogRepair(null);
    setPartsForm(DEFAULT_PARTS_FORM);
    setPartsError('');
  };

  const handlePartsFormChange = (field, value) => {
    setPartsForm(prev => ({ ...prev, [field]: value }));
  };

  const handleMoveToNeedsParts = async () => {
    if (!partsDialogRepair) return;

    setPartsLoading(true);
    setPartsError('');
    setScanError('');
    setScanSuccess('');

    try {
      let material;

      if (partsForm.source === 'stuller') {
        const cleanSku = partsForm.stullerSku.trim();
        if (!cleanSku) throw new Error('Enter a Stuller part number.');

        const [stullerRes, settingsRes] = await Promise.all([
          fetch('/api/stuller/item', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemNumber: cleanSku }),
          }),
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
          id: Date.now(),
          name,
          displayName: name,
          description: partsForm.description.trim() || name,
          quantity,
          price,
          retailPrice: price,
          unitCost: price,
          category: 'manual_material',
          supplier: 'Manual',
          isStullerItem: false,
        };
      }

      const res = await fetch(`/api/repairs/${encodeURIComponent(partsDialogRepair.repairID)}/mark-waiting-parts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ material }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Unable to move repair to needs parts.');

      await fetchRepairs();
      setScanSuccess(`Added material and moved ${partsDialogRepair.repairID} to Needs Parts.`);
      setPartsDialogRepair(null);
      setPartsForm(DEFAULT_PARTS_FORM);
    } catch (error) {
      setPartsError(error.message);
    } finally {
      setPartsLoading(false);
    }
  };

  if (status === 'loading') {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}><CircularProgress sx={{ color: REPAIRS_UI.accent }} /></Box>;
  }

  const userID = session?.user?.userID;
  const caps = session?.user?.staffCapabilities || {};
  const isAdmin = ['admin', 'dev'].includes(session?.user?.role);
  const isOnsiteRepairOps = session?.user?.employment?.isOnsite === true && caps.repairOps === true;
  const canCompleteQc = isAdmin || caps.qualityControl === true;

  if (!isAdmin && !isOnsiteRepairOps) {
    router.push('/dashboard');
    return null;
  }

  const byTab = {
    mine: repairs.filter(r => r.assignedTo === userID),
    unclaimed: repairs.filter(r => r.benchStatus === 'UNCLAIMED'),
    waiting_parts: repairs.filter(r => r.benchStatus === 'WAITING_PARTS'),
    qc: repairs.filter(r => r.benchStatus === 'QC' || r.status === 'QC'),
  };

  const activeKey = TABS[tab].key;
  const shown = byTab[activeKey] || [];
  const mineReadyForQcCount = byTab.mine.filter(r => r.benchStatus === 'IN_PROGRESS').length;
  const shownQcIDs = activeKey === 'qc' ? shown.map(repair => repair.repairID) : [];
  const selectedShownQcIDs = shownQcIDs.filter(repairID => selectedQcIDs.includes(repairID));

  return (
    <Box sx={{ pb: 8 }}>
      <Box sx={{ bgcolor: REPAIRS_UI.bgPanel, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 3, p: { xs: 2, md: 3 }, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <WorkIcon sx={{ color: REPAIRS_UI.accent, fontSize: 28 }} />
            <Box>
              <Typography sx={{ fontSize: { xs: 24, md: 30 }, fontWeight: 600, color: REPAIRS_UI.textHeader, lineHeight: 1.1 }}>
                My Bench
              </Typography>
              <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>
                Your active work queue
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<ScanIcon />}
              onClick={() => router.push('/dashboard/repairs/move?mode=scan')}
              sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border }}
            >
              Scan Ticket
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={<QCIcon />}
              onClick={handleMoveMyBenchToQc}
              disabled={bulkQcLoading || mineReadyForQcCount === 0}
              sx={{ bgcolor: '#00C49F', color: '#000', '&:hover': { bgcolor: '#00a985' } }}
            >
              {bulkQcLoading ? 'Moving...' : `Move My Bench to QC (${mineReadyForQcCount})`}
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchRepairs}
              disabled={loading}
              sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border }}
            >
              Refresh
            </Button>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2 }}>
          {TABS.map(({ label, key }) => (
            <Box key={key} sx={{ textAlign: 'center' }}>
              <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: REPAIRS_UI.textHeader, lineHeight: 1 }}>
                {byTab[key]?.length ?? 0}
              </Typography>
              <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>{label}</Typography>
            </Box>
          ))}
        </Box>

        <Box
          component="form"
          onSubmit={handleQueueScan}
          sx={{
            mt: 2,
            display: 'flex',
            gap: 1,
            flexWrap: 'wrap',
            alignItems: 'flex-start',
          }}
        >
          <TextField
            label="Scan to Claim"
            placeholder="Scan repair ticket barcode"
            value={scanValue}
            onChange={(e) => setScanValue(e.target.value)}
            autoComplete="off"
            autoFocus
            size="small"
            sx={{
              minWidth: { xs: '100%', sm: 320 },
              '& .MuiOutlinedInput-root': {
                bgcolor: REPAIRS_UI.bgCard,
                color: REPAIRS_UI.textPrimary,
              },
              '& .MuiInputLabel-root': { color: REPAIRS_UI.textMuted },
            }}
            helperText="Barcode scan should land here. Press Enter to queue each repair, then claim the batch."
            FormHelperTextProps={{ sx: { color: REPAIRS_UI.textMuted } }}
          />
          <Button
            type="submit"
            variant="outlined"
            startIcon={<ScanIcon />}
            disabled={scanLoading || !scanValue.trim()}
            sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border }}
          >
            Queue Scan
          </Button>
          <Button
            type="button"
            variant="outlined"
            startIcon={<ScanIcon />}
            disabled={scanLoading}
            sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border }}
            onClick={() => setClaimScannerOpen(true)}
          >
            Camera Scan
          </Button>
          <Button
            type="button"
            variant="contained"
            disabled={scanLoading || queuedClaimIDs.length === 0}
            sx={{ bgcolor: REPAIRS_UI.accent, color: '#000', '&:hover': { bgcolor: '#c9a227' } }}
            onClick={handleClaimQueuedRepairs}
          >
            {scanLoading ? 'Claiming...' : `Claim ${queuedClaimIDs.length} Queued`}
          </Button>
        </Box>

        {queuedClaimIDs.length > 0 && (
          <Box sx={{ mt: 1.5 }}>
            <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, display: 'block', mb: 1 }}>
              Queued to claim ({queuedClaimIDs.length})
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {queuedClaimIDs.map((repairID) => (
                <Chip
                  key={repairID}
                  label={repairID}
                  onDelete={() => handleRemoveQueuedClaim(repairID)}
                  deleteIcon={<CloseIcon />}
                  sx={{
                    bgcolor: REPAIRS_UI.bgCard,
                    color: REPAIRS_UI.textPrimary,
                    border: `1px solid ${REPAIRS_UI.border}`,
                  }}
                />
              ))}
            </Box>
          </Box>
        )}

        {scanError && (
          <Alert severity="error" sx={{ mt: 1.5 }}>
            {scanError}
          </Alert>
        )}
        {scanSuccess && (
          <Alert severity="success" sx={{ mt: 1.5 }}>
            {scanSuccess}
          </Alert>
        )}
      </Box>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 2, '& .MuiTab-root': { color: REPAIRS_UI.textSecondary, textTransform: 'none' }, '& .Mui-selected': { color: REPAIRS_UI.accent }, '& .MuiTabs-indicator': { bgcolor: REPAIRS_UI.accent } }}
      >
        {TABS.map(({ label, key }, i) => (
          <Tab key={key} label={`${label} (${byTab[key]?.length ?? 0})`} />
        ))}
      </Tabs>

      {activeKey === 'qc' && shown.length > 0 && (
        <Box
          sx={{
            bgcolor: REPAIRS_UI.bgPanel,
            border: `1px solid ${REPAIRS_UI.border}`,
            borderRadius: 2,
            p: 1.5,
            mb: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.5,
            flexWrap: 'wrap',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Checkbox
              checked={selectedShownQcIDs.length === shownQcIDs.length && shownQcIDs.length > 0}
              indeterminate={selectedShownQcIDs.length > 0 && selectedShownQcIDs.length < shownQcIDs.length}
              onChange={(event) => handleSetShownQcSelection(shownQcIDs, event.target.checked)}
              sx={{
                color: REPAIRS_UI.border,
                '&.Mui-checked': { color: REPAIRS_UI.accent },
                '&.MuiCheckbox-indeterminate': { color: REPAIRS_UI.accent },
              }}
            />
            <Box>
              <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 600 }}>
                QC Selection
              </Typography>
              <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted }}>
                {selectedShownQcIDs.length} selected on this tab
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={<QCIcon />}
            disabled={!canCompleteQc || bulkCompleteLoading || selectedShownQcIDs.length === 0}
            onClick={handleCompleteSelectedQc}
            sx={{ bgcolor: '#00C49F', color: '#000', '&:hover': { bgcolor: '#00a985' } }}
          >
            {bulkCompleteLoading ? 'Approving...' : `Approve to Payment & Pickup (${selectedShownQcIDs.length})`}
          </Button>
        </Box>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress sx={{ color: REPAIRS_UI.accent }} />
        </Box>
      ) : shown.length === 0 ? (
        <Box sx={{ bgcolor: REPAIRS_UI.bgPanel, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 3, py: 6, textAlign: 'center' }}>
          <WorkIcon sx={{ fontSize: 48, color: REPAIRS_UI.textMuted, mb: 1.5 }} />
          <Typography sx={{ color: REPAIRS_UI.textHeader }}>Nothing here</Typography>
          <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary, mt: 0.5 }}>
            {tab === 0 ? 'You have no repairs claimed to your bench.' : 'No repairs in this category.'}
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {shown.map(repair => (
            <Grid item xs={12} sm={6} xl={4} key={repair.repairID}>
              <RepairBenchCard
                repair={repair}
                currentUserID={userID}
                isAdmin={isAdmin}
                jewelers={jewelers}
                onRefresh={fetchRepairs}
                selectable={activeKey === 'qc'}
                isSelected={selectedQcIDs.includes(repair.repairID)}
                onToggleSelect={handleToggleQcSelection}
                onOpenPartsDialog={openPartsDialog}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <ContinuousBarcodeScanner
        open={claimScannerOpen}
        title="Scan Repairs to Claim"
        queuedCount={queuedClaimIDs.length}
        actionLabel={scanLoading ? 'Claiming...' : `Claim ${queuedClaimIDs.length} Queued`}
        actionDisabled={scanLoading || queuedClaimIDs.length === 0}
        onClose={() => setClaimScannerOpen(false)}
        onScan={queueClaimID}
        onAction={handleClaimQueuedRepairs}
      >
        {queuedClaimIDs.length > 0 ? (
          <Box>
            <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, display: 'block', mb: 1 }}>
              Queued to claim ({queuedClaimIDs.length})
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {queuedClaimIDs.map((repairID) => (
                <Chip
                  key={repairID}
                  label={repairID}
                  onDelete={() => handleRemoveQueuedClaim(repairID)}
                  deleteIcon={<CloseIcon />}
                  sx={{
                    bgcolor: REPAIRS_UI.bgCard,
                    color: REPAIRS_UI.textPrimary,
                    border: `1px solid ${REPAIRS_UI.border}`,
                  }}
                />
              ))}
            </Box>
          </Box>
        ) : (
          <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>
            Scanned repairs will appear here. The camera stays open until you close it.
          </Typography>
        )}
      </ContinuousBarcodeScanner>

      <Dialog open={!!partsDialogRepair} onClose={closePartsDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Move to Needs Parts</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>
              Add the part or material that needs to be ordered before moving this repair.
            </Typography>
            {partsDialogRepair && (
              <Alert severity="info">
                {partsDialogRepair.repairID} - {partsDialogRepair.clientName || partsDialogRepair.businessName}
              </Alert>
            )}
            {partsError && <Alert severity="error">{partsError}</Alert>}
            <TextField
              select
              label="Material Source"
              value={partsForm.source}
              onChange={(event) => handlePartsFormChange('source', event.target.value)}
              fullWidth
            >
              <MenuItem value="stuller">Stuller part number</MenuItem>
              <MenuItem value="manual">Manual material</MenuItem>
            </TextField>

            {partsForm.source === 'stuller' ? (
              <TextField
                label="Stuller Part Number"
                value={partsForm.stullerSku}
                onChange={(event) => handlePartsFormChange('stullerSku', event.target.value)}
                autoFocus
                fullWidth
              />
            ) : (
              <>
                <TextField
                  label="Material Name"
                  value={partsForm.name}
                  onChange={(event) => handlePartsFormChange('name', event.target.value)}
                  autoFocus
                  fullWidth
                />
                <TextField
                  label="Description"
                  value={partsForm.description}
                  onChange={(event) => handlePartsFormChange('description', event.target.value)}
                  fullWidth
                  multiline
                  minRows={2}
                />
                <Grid container spacing={1.5}>
                  <Grid item xs={6}>
                    <TextField
                      label="Quantity"
                      type="number"
                      value={partsForm.quantity}
                      onChange={(event) => handlePartsFormChange('quantity', event.target.value)}
                      inputProps={{ min: 0, step: 0.25 }}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="Line Price"
                      type="number"
                      value={partsForm.price}
                      onChange={(event) => handlePartsFormChange('price', event.target.value)}
                      inputProps={{ min: 0, step: 0.01 }}
                      fullWidth
                    />
                  </Grid>
                </Grid>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closePartsDialog} disabled={partsLoading}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleMoveToNeedsParts}
            disabled={partsLoading}
            sx={{ bgcolor: REPAIRS_UI.accent, color: '#000', '&:hover': { bgcolor: '#c9a227' } }}
          >
            {partsLoading ? 'Moving...' : 'Add Material & Move'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
