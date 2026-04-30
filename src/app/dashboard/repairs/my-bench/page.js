"use client";
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Grid, Button, Chip, CircularProgress, Tabs, Tab,
  Card, CardContent, CardActions, Divider, Alert, TextField, MenuItem,
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
  { label: 'Waiting Parts', key: 'waiting_parts' },
  { label: 'QC', key: 'qc' },
];

const BENCH_STATUS_COLOR = {
  IN_PROGRESS: '#0088FE',
  UNCLAIMED: REPAIRS_UI.textMuted,
  WAITING_PARTS: '#FF8042',
  QC: '#00C49F',
};

function getJewelerLabel(jeweler) {
  return [jeweler.firstName, jeweler.lastName].filter(Boolean).join(' ').trim()
    || jeweler.name
    || jeweler.email
    || jeweler.userID;
}

function RepairBenchCard({ repair, currentUserID, isAdmin, jewelers, onRefresh }) {
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
    <Card sx={{ bgcolor: REPAIRS_UI.bgPanel, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2 }}>
      <CardContent sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, fontFamily: 'monospace' }}>
            {repair.repairID}
          </Typography>
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
              onClick={() => doAction('mark-waiting-parts')}
              sx={{ color: REPAIRS_UI.textSecondary, borderColor: REPAIRS_UI.border, fontSize: '0.75rem' }}
            >
              Waiting Parts
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

  if (status === 'loading') {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}><CircularProgress sx={{ color: REPAIRS_UI.accent }} /></Box>;
  }

  const userID = session?.user?.userID;
  const caps = session?.user?.staffCapabilities || {};
  const isAdmin = ['admin', 'dev'].includes(session?.user?.role);
  const isOnsiteRepairOps = session?.user?.employment?.isOnsite === true && caps.repairOps === true;

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
    </Box>
  );
}
