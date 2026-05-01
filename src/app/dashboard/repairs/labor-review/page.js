"use client";
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

function formatMoney(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function getRepairChargeTotal(repair = {}) {
  const taskTotal = (repair.tasks || []).reduce((sum, item) => (
    sum + ((Number(item?.price ?? item?.retailPrice) || 0) * (Math.max(Number(item?.quantity) || 1, 1)))
  ), 0);
  const materialTotal = (repair.materials || []).reduce((sum, item) => (
    sum + ((Number(item?.price ?? item?.unitCost ?? item?.costPerPortion) || 0) * (Math.max(Number(item?.quantity) || 1, 1)))
  ), 0);
  const customTotal = (repair.customLineItems || []).reduce((sum, item) => (
    sum + ((Number(item?.price) || 0) * (Math.max(Number(item?.quantity) || 1, 1)))
  ), 0);

  const computedTotal = taskTotal + materialTotal + customTotal;
  return Number(repair.totalCost || 0) > 0 ? Number(repair.totalCost || 0) : computedTotal;
}

function getWorkItemLabels(repair = {}) {
  return [
    ...(repair.tasks || []).map((item) => item.name || item.description),
    ...(repair.processes || []).map((item) => item.name || item.description),
    ...(repair.materials || []).map((item) => item.name || item.description || item.itemNumber),
    ...(repair.customLineItems || []).map((item) => item.description),
  ].filter(Boolean);
}

function formatSourceAction(action = '') {
  return action
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function ReviewCard({ log, onApprove, loading, onOpenRepair }) {
  const [hours, setHours] = useState(log.creditedLaborHours || 0);
  const [notes, setNotes] = useState(log.notes || '');
  const workItems = getWorkItemLabels(log.repair);
  const repairChargeTotal = getRepairChargeTotal(log.repair);
  const exceedsTicketValue = repairChargeTotal > 0 && ((Number(hours || 0) * Number(log.laborRateSnapshot || 0)) > repairChargeTotal);

  return (
    <Card sx={{ bgcolor: REPAIRS_UI.bgPanel, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 3 }}>
      <CardContent>
        <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, fontFamily: 'monospace' }}>
          {log.logID}
        </Typography>
        <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 600, mt: 0.5 }}>
          {log.primaryJewelerName}
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'flex-start' }} sx={{ mt: 1.5, mb: 2 }}>
          {log.repair?.picture && (
            <Box
              component="img"
              src={log.repair.picture}
              alt=""
              sx={{
                width: { xs: '100%', sm: 88 },
                height: 88,
                objectFit: 'cover',
                borderRadius: 1,
                border: `1px solid ${REPAIRS_UI.border}`,
                flexShrink: 0,
              }}
            />
          )}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 700 }}>
                  {log.repair?.clientName || log.repair?.businessName || 'Repair'} · {log.repairID}
                </Typography>
                <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>
                  {log.repair?.description || 'No repair description saved.'}
                </Typography>
              </Box>
              <Box sx={{ textAlign: { xs: 'left', sm: 'right' }, flexShrink: 0 }}>
                <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 700 }}>
                  Ticket {formatMoney(repairChargeTotal)}
                </Typography>
                <Typography variant="caption" sx={{ color: REPAIRS_UI.textSecondary, display: 'block' }}>
                  {Number(log.laborRateSnapshot || 0).toFixed(2)}/hr snapshot
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
              <Chip size="small" label={formatSourceAction(log.sourceAction || 'Labor Credit')} />
              {log.repair?.status && <Chip size="small" label={log.repair.status} />}
              {exceedsTicketValue && <Chip size="small" color="warning" label="Pay exceeds ticket" />}
              {log.createdAt && <Chip size="small" label={new Date(log.createdAt).toLocaleString()} />}
            </Stack>
            {workItems.length > 0 && (
              <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary, mt: 1 }}>
                Work: {workItems.slice(0, 5).join(', ')}
                {workItems.length > 5 ? ` +${workItems.length - 5} more` : ''}
              </Typography>
            )}
          </Box>
        </Stack>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 1.5 }}>
          <TextField
            label="Credited Hours"
            size="small"
            type="number"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            inputProps={{ min: 0, step: 0.25 }}
          />
          <TextField
            label="Notes"
            size="small"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            sx={{ minWidth: 220, flex: 1 }}
          />
        </Box>
        <Button
          variant="contained"
          disabled={loading}
          onClick={() => onApprove(log.logID, hours, notes)}
          sx={{ bgcolor: REPAIRS_UI.accent, color: '#000', '&:hover': { bgcolor: '#c9a227' } }}
        >
          Finalize Review
        </Button>
        <Button
          size="small"
          onClick={() => onOpenRepair(log.repairID)}
          sx={{ color: REPAIRS_UI.accent, ml: 1, px: 0 }}
        >
          Open Repair
        </Button>
      </CardContent>
    </Card>
  );
}

export default function LaborReviewPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [pending, setPending] = useState([]);
  const [weekly, setWeekly] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingLogID, setSavingLogID] = useState('');
  const [error, setError] = useState('');
  const [selectedBreakdown, setSelectedBreakdown] = useState(null);
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [breakdownError, setBreakdownError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [pendingRes, weeklyRes] = await Promise.all([
        fetch('/api/repairs/labor-review'),
        fetch('/api/repairs/labor-report'),
      ]);

      if (!pendingRes.ok || !weeklyRes.ok) {
        throw new Error('Failed to load labor review data.');
      }

      const [pendingData, weeklyData] = await Promise.all([pendingRes.json(), weeklyRes.json()]);
      setPending(Array.isArray(pendingData) ? pendingData : []);
      setWeekly(Array.isArray(weeklyData) ? weeklyData : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
    if (status === 'authenticated' && session?.user?.role === 'admin') {
      fetchData();
    }
  }, [fetchData, router, session?.user?.role, status]);

  const currentWeek = useMemo(() => {
    if (!weekly.length) return [];
    return weekly.filter((entry) => {
      const monday = new Date(entry.weekStart);
      const now = new Date();
      const diff = now.getTime() - monday.getTime();
      return diff >= 0 && diff < 7 * 24 * 60 * 60 * 1000;
    });
  }, [weekly]);

  const finalizeReview = async (logID, creditedLaborHours, notes) => {
    setSavingLogID(logID);
    setError('');
    try {
      const res = await fetch('/api/repairs/labor-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logID, creditedLaborHours, notes }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to finalize labor review.');
      }
      await fetchData();
    } catch (e) {
      setError(e.message);
    } finally {
      setSavingLogID('');
    }
  };

  const openBreakdown = async (entry) => {
    setSelectedBreakdown({ ...entry, logs: [] });
    setBreakdownLoading(true);
    setBreakdownError('');
    try {
      const params = new URLSearchParams({
        detail: 'true',
        weekStart: new Date(entry.weekStart).toISOString(),
        userID: entry.userID,
      });
      const res = await fetch(`/api/repairs/labor-report?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load payout breakdown.');
      }
      setSelectedBreakdown(data);
    } catch (e) {
      setBreakdownError(e.message);
    } finally {
      setBreakdownLoading(false);
    }
  };

  const closeBreakdown = () => {
    setSelectedBreakdown(null);
    setBreakdownError('');
  };

  if (status === 'loading' || (status === 'authenticated' && session?.user?.role !== 'admin')) {
    return null;
  }

  return (
    <Box sx={{ pb: 8 }}>
      <Box sx={{ bgcolor: REPAIRS_UI.bgPanel, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 3, p: { xs: 2, md: 3 }, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <ReceiptLongIcon sx={{ color: REPAIRS_UI.accent, fontSize: 28 }} />
          <Box>
            <Typography sx={{ fontSize: { xs: 24, md: 30 }, fontWeight: 600, color: REPAIRS_UI.textHeader }}>
              Labor Review
            </Typography>
            <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>
              Review shared-work exceptions and track weekly credited labor by jeweler.
            </Typography>
          </Box>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
          <CircularProgress sx={{ color: REPAIRS_UI.accent }} />
        </Box>
      ) : (
        <>
          <Typography variant="overline" sx={{ color: REPAIRS_UI.textSecondary, fontWeight: 700, letterSpacing: '0.08em' }}>
            Pending Review
          </Typography>
          <Grid container spacing={2} sx={{ mt: 0.5, mb: 4 }}>
            {pending.length === 0 ? (
              <Grid item xs={12}>
                <Card sx={{ bgcolor: REPAIRS_UI.bgPanel, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 3 }}>
                  <CardContent>
                    <Typography sx={{ color: REPAIRS_UI.textSecondary }}>No shared-work reviews are pending.</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ) : pending.map((log) => (
              <Grid item xs={12} md={6} key={log.logID}>
                <ReviewCard
                  log={log}
                  loading={savingLogID === log.logID}
                  onApprove={finalizeReview}
                  onOpenRepair={(repairID) => router.push(`/dashboard/repairs/${repairID}`)}
                />
              </Grid>
            ))}
          </Grid>

          <Typography variant="overline" sx={{ color: REPAIRS_UI.textSecondary, fontWeight: 700, letterSpacing: '0.08em' }}>
            Current Week
          </Typography>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {(currentWeek.length ? currentWeek : weekly).map((entry) => (
              <Grid item xs={12} md={6} lg={4} key={`${entry.userID}-${entry.weekStart}`}>
                <Card
                  role="button"
                  tabIndex={0}
                  onClick={() => openBreakdown(entry)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openBreakdown(entry);
                    }
                  }}
                  sx={{
                    bgcolor: REPAIRS_UI.bgPanel,
                    border: `1px solid ${REPAIRS_UI.border}`,
                    borderRadius: 3,
                    cursor: 'pointer',
                    transition: 'border-color 120ms ease, transform 120ms ease',
                    '&:hover, &:focus-visible': {
                      borderColor: REPAIRS_UI.accent,
                      transform: 'translateY(-1px)',
                      outline: 'none',
                    },
                  }}
                >
                  <CardContent>
                    <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 600 }}>{entry.userName}</Typography>
                    <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>
                      Week of {new Date(entry.weekStart).toLocaleDateString()}
                    </Typography>
                    <Typography sx={{ color: REPAIRS_UI.textPrimary, mt: 1.5 }}>
                      Hours: {Number(entry.laborHours || 0).toFixed(2)}
                    </Typography>
                    <Typography sx={{ color: REPAIRS_UI.textPrimary }}>
                      Repairs: {entry.repairsWorked || 0}
                    </Typography>
                    <Typography sx={{ color: REPAIRS_UI.textPrimary }}>
                      Pay Snapshot: {formatMoney(entry.laborPay)}
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', color: REPAIRS_UI.textMuted, mt: 1.5 }}>
                      Click for breakdown
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </>
      )}

      <Dialog
        open={Boolean(selectedBreakdown)}
        onClose={closeBreakdown}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            bgcolor: REPAIRS_UI.bgPanel,
            color: REPAIRS_UI.textPrimary,
            border: `1px solid ${REPAIRS_UI.border}`,
            borderRadius: 3,
          },
        }}
      >
        <DialogTitle sx={{ pr: 7 }}>
          <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 700 }}>
            {selectedBreakdown?.userName || 'Jeweler'} Payout Breakdown
          </Typography>
          {selectedBreakdown?.weekStart && (
            <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>
              Week of {new Date(selectedBreakdown.weekStart).toLocaleDateString()}
            </Typography>
          )}
          <IconButton
            aria-label="Close breakdown"
            onClick={closeBreakdown}
            sx={{ position: 'absolute', right: 12, top: 12, color: REPAIRS_UI.textSecondary }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: REPAIRS_UI.border }}>
          {selectedBreakdown && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}>
              <Chip
                label={`Hours ${Number(selectedBreakdown.laborHours || 0).toFixed(2)}`}
                sx={{ bgcolor: 'rgba(225, 179, 42, 0.14)', color: REPAIRS_UI.textHeader }}
              />
              <Chip
                label={`Repairs ${selectedBreakdown.repairsWorked || 0}`}
                sx={{ bgcolor: 'rgba(225, 179, 42, 0.14)', color: REPAIRS_UI.textHeader }}
              />
              <Chip
                label={`Pay ${formatMoney(selectedBreakdown.laborPay)}`}
                sx={{ bgcolor: 'rgba(225, 179, 42, 0.14)', color: REPAIRS_UI.textHeader }}
              />
            </Stack>
          )}

          {breakdownError && <Alert severity="error" sx={{ mb: 2 }}>{breakdownError}</Alert>}

          {breakdownLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
              <CircularProgress sx={{ color: REPAIRS_UI.accent }} />
            </Box>
          ) : selectedBreakdown?.logs?.length ? (
            <Stack spacing={1.5}>
              {selectedBreakdown.logs.map((log) => {
                const workItems = getWorkItemLabels(log.repair);
                const repairChargeTotal = getRepairChargeTotal(log.repair);
                const exceedsTicketValue = repairChargeTotal > 0 && Number(log.creditedValue || 0) > repairChargeTotal;
                return (
                  <Box
                    key={log.logID}
                    sx={{
                      border: `1px solid ${REPAIRS_UI.border}`,
                      borderRadius: 2,
                      p: 1.5,
                      bgcolor: REPAIRS_UI.bgPage,
                    }}
                  >
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'flex-start' }}>
                      {log.repair?.picture && (
                        <Box
                          component="img"
                          src={log.repair.picture}
                          alt=""
                          sx={{
                            width: { xs: '100%', sm: 92 },
                            height: 92,
                            objectFit: 'cover',
                            borderRadius: 1,
                            border: `1px solid ${REPAIRS_UI.border}`,
                            flexShrink: 0,
                          }}
                        />
                      )}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between">
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 700 }}>
                              {log.repair?.clientName || log.repair?.businessName || 'Repair'} · {log.repairID}
                            </Typography>
                            <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>
                              {log.repair?.description || 'No repair description saved.'}
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: { xs: 'left', sm: 'right' }, flexShrink: 0 }}>
                            <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 700 }}>
                              {formatMoney(log.creditedValue)}
                            </Typography>
                            <Typography variant="caption" sx={{ color: REPAIRS_UI.textSecondary }}>
                              {Number(log.creditedLaborHours || 0).toFixed(2)}h @ {formatMoney(log.laborRateSnapshot)}/hr
                            </Typography>
                            <Typography variant="caption" sx={{ color: REPAIRS_UI.textSecondary, display: 'block' }}>
                              Ticket {formatMoney(repairChargeTotal)}
                            </Typography>
                          </Box>
                        </Stack>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                          <Chip size="small" label={formatSourceAction(log.sourceAction || 'Labor Credit')} />
                          {log.repair?.status && <Chip size="small" label={log.repair.status} />}
                          {exceedsTicketValue && <Chip size="small" color="warning" label="Pay exceeds ticket" />}
                          {log.createdAt && (
                            <Chip size="small" label={new Date(log.createdAt).toLocaleString()} />
                          )}
                        </Stack>
                        {workItems.length > 0 && (
                          <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary, mt: 1 }}>
                            Work: {workItems.slice(0, 5).join(', ')}
                            {workItems.length > 5 ? ` +${workItems.length - 5} more` : ''}
                          </Typography>
                        )}
                        {log.notes && (
                          <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary, mt: 0.5 }}>
                            Notes: {log.notes}
                          </Typography>
                        )}
                        <Divider sx={{ borderColor: REPAIRS_UI.border, my: 1 }} />
                        <Button
                          size="small"
                          onClick={() => router.push(`/dashboard/repairs/${log.repairID}`)}
                          sx={{ color: REPAIRS_UI.accent, px: 0 }}
                        >
                          Open Repair
                        </Button>
                      </Box>
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          ) : (
            <Typography sx={{ color: REPAIRS_UI.textSecondary }}>
              No labor credits were found for this payout.
            </Typography>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
