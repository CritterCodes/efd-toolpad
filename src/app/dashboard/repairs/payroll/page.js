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
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PaymentIcon from '@mui/icons-material/Payment';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { REPAIRS_UI } from '../components/repairsUi';

function formatMoney(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function getMondayOfWeek(date = new Date()) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
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
    ...(repair.tasks || []).map((item) => item.name || item.title || item.description),
    ...(repair.processes || []).map((item) => item.name || item.title || item.description),
    ...(repair.materials || []).map((item) => item.name || item.description || item.itemNumber),
    ...(repair.customLineItems || []).map((item) => item.description),
  ].filter(Boolean);
}

function QueueCard({ candidate, onOpen }) {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onOpen(candidate)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(candidate);
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
        <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 700 }}>
          {candidate.userName}
        </Typography>
        <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>
          Week of {new Date(candidate.weekStart).toLocaleDateString()}
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
          <Chip label={`Hours ${Number(candidate.laborHours || 0).toFixed(2)}`} size="small" />
          <Chip label={`Repairs ${candidate.repairsWorked || 0}`} size="small" />
          <Chip label={`Pay ${formatMoney(candidate.laborPay)}`} size="small" />
        </Stack>
        <Typography variant="caption" sx={{ display: 'block', color: REPAIRS_UI.textMuted, mt: 1.5 }}>
          {candidate.entryCount || 0} unbatched labor log{candidate.entryCount === 1 ? '' : 's'}
        </Typography>
      </CardContent>
    </Card>
  );
}

function HistoryCard({ batch, onOpen }) {
  const statusColor = batch.status === 'paid' ? 'success' : batch.status === 'void' ? 'default' : 'warning';
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onOpen(batch)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(batch);
        }
      }}
      sx={{
        bgcolor: REPAIRS_UI.bgPanel,
        border: `1px solid ${REPAIRS_UI.border}`,
        borderRadius: 3,
        cursor: 'pointer',
      }}
    >
      <CardContent>
        <Stack direction="row" justifyContent="space-between" spacing={1}>
          <Box>
            <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 700 }}>
              {batch.userName}
            </Typography>
            <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>
              Week of {new Date(batch.weekStart).toLocaleDateString()}
            </Typography>
          </Box>
          <Chip label={batch.status} size="small" color={statusColor} />
        </Stack>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
          <Chip label={`Hours ${Number(batch.laborHours || 0).toFixed(2)}`} size="small" />
          <Chip label={`Repairs ${batch.repairsWorked || 0}`} size="small" />
          <Chip label={`Pay ${formatMoney(batch.laborPay)}`} size="small" />
        </Stack>
        {batch.paidAt && (
          <Typography variant="caption" sx={{ display: 'block', color: REPAIRS_UI.textMuted, mt: 1.5 }}>
            Paid {new Date(batch.paidAt).toLocaleString()}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export default function RepairPayrollPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState('queue');
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState([]);
  const [history, setHistory] = useState([]);
  const [diagnostics, setDiagnostics] = useState(null);
  const [error, setError] = useState('');
  const [selectedMode, setSelectedMode] = useState('');
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [dialogLoading, setDialogLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 16));

  const currentWeekStart = useMemo(() => getMondayOfWeek(new Date()).toISOString(), []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [queueRes, historyRes, diagnosticsRes] = await Promise.all([
        fetch('/api/repairs/payroll'),
        fetch('/api/repairs/payroll?history=true'),
        fetch(`/api/repairs/payroll/diagnostics?weekStart=${encodeURIComponent(currentWeekStart)}`),
      ]);

      const [queueData, historyData, diagnosticsData] = await Promise.all([
        queueRes.json(),
        historyRes.json(),
        diagnosticsRes.json(),
      ]);

      if (!queueRes.ok) throw new Error(queueData.error || 'Failed to load payroll queue.');
      if (!historyRes.ok) throw new Error(historyData.error || 'Failed to load payroll history.');
      if (!diagnosticsRes.ok) throw new Error(diagnosticsData.error || 'Failed to load payroll diagnostics.');

      setQueue(Array.isArray(queueData) ? queueData : []);
      setHistory(Array.isArray(historyData) ? historyData : []);
      setDiagnostics(diagnosticsData || null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [currentWeekStart]);

  useEffect(() => {
    if (status === 'authenticated' && !['admin', 'dev'].includes(session?.user?.role)) {
      router.push('/dashboard');
      return;
    }
    if (status === 'authenticated' && ['admin', 'dev'].includes(session?.user?.role)) {
      fetchData();
    }
  }, [fetchData, router, session?.user?.role, status]);

  const openCandidate = async (candidate) => {
    setSelectedMode('candidate');
    setSelectedDetail(null);
    setDialogLoading(true);
    setNotes('');
    try {
      const params = new URLSearchParams({
        detail: 'true',
        weekStart: new Date(candidate.weekStart).toISOString(),
        userID: candidate.userID,
      });
      const res = await fetch(`/api/repairs/payroll?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load payroll candidate detail.');
      setSelectedDetail(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setDialogLoading(false);
    }
  };

  const openBatch = async (batch) => {
    setSelectedMode('batch');
    setSelectedDetail(null);
    setDialogLoading(true);
    try {
      const res = await fetch(`/api/repairs/payroll/${batch.batchID}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load payroll batch.');
      setSelectedDetail(data);
      setNotes(data.notes || '');
      setPaymentMethod(data.paymentMethod || '');
      setPaymentReference(data.paymentReference || '');
      setPaidAt(data.paidAt ? new Date(data.paidAt).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16));
    } catch (e) {
      setError(e.message);
    } finally {
      setDialogLoading(false);
    }
  };

  const closeDialog = () => {
    setSelectedMode('');
    setSelectedDetail(null);
    setNotes('');
    setPaymentMethod('');
    setPaymentReference('');
  };

  const performAction = async (fn) => {
    setActionLoading(true);
    setError('');
    try {
      await fn();
      await fetchData();
    } catch (e) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const createBatch = async () => performAction(async () => {
    const res = await fetch('/api/repairs/payroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        weekStart: selectedDetail.weekStart,
        userID: selectedDetail.userID,
        notes,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create payroll batch.');
    closeDialog();
  });

  const updateBatch = async (action) => performAction(async () => {
    const res = await fetch(`/api/repairs/payroll/${selectedDetail.batchID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        notes,
        paidAt,
        paymentMethod,
        paymentReference,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Failed to ${action} payroll batch.`);
    if (action === 'finalize' || action === 'mark_paid' || action === 'void') {
      closeDialog();
    }
  });

  if (status === 'loading' || (status === 'authenticated' && !['admin', 'dev'].includes(session?.user?.role))) {
    return null;
  }

  const currentWeekLogCount = diagnostics
    ? (diagnostics.countsByWeek || []).find((entry) => (
        new Date(entry.weekStart).toISOString() === new Date(currentWeekStart).toISOString()
      ))?.count || 0
    : 0;
  const hasNoLogs = diagnostics && currentWeekLogCount === 0;

  return (
    <Box sx={{ pb: 8 }}>
      <Box sx={{ bgcolor: REPAIRS_UI.bgPanel, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 3, p: { xs: 2, md: 3 }, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <PaymentIcon sx={{ color: REPAIRS_UI.accent, fontSize: 28 }} />
          <Box>
            <Typography sx={{ fontSize: { xs: 24, md: 30 }, fontWeight: 600, color: REPAIRS_UI.textHeader }}>
              Payroll
            </Typography>
            <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>
              Freeze weekly jeweler payouts from approved labor logs and mark them paid.
            </Typography>
          </Box>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {hasNoLogs && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          No repair labor logs exist for the current week in the live ledger. Payroll can be correct and still empty until send-to-QC is generating labor logs in production.
        </Alert>
      )}

      {diagnostics && (
        <Card sx={{ bgcolor: REPAIRS_UI.bgPanel, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 3, mb: 3 }}>
          <CardContent>
            <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 700, mb: 1.5 }}>
              Payroll Diagnostics
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
              {(diagnostics.reviewedSummary || []).map((item) => (
                <Chip
                  key={`review-${String(item._id)}`}
                  label={`${item._id ? 'Pending Review' : 'Reviewed'} ${item.count}`}
                  size="small"
                />
              ))}
              {(diagnostics.payrollSummary || []).map((item) => (
                <Chip
                  key={`payroll-${String(item._id)}`}
                  label={`${item._id || 'unbatched'} ${item.count}`}
                  size="small"
                />
              ))}
            </Stack>
            {(diagnostics.repairsSentToQcWithoutLogs || []).length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <WarningAmberIcon sx={{ color: REPAIRS_UI.accent, fontSize: 18 }} />
                  <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>
                    Repairs sent to QC this week with no labor log
                  </Typography>
                </Stack>
                <Stack spacing={0.5}>
                  {diagnostics.repairsSentToQcWithoutLogs.slice(0, 6).map((repair) => (
                    <Typography key={repair.repairID} variant="caption" sx={{ color: REPAIRS_UI.textMuted, fontFamily: 'monospace' }}>
                      {repair.repairID} · {repair.clientName || repair.businessName || 'Unknown client'}
                    </Typography>
                  ))}
                </Stack>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      <Box sx={{ borderBottom: `1px solid ${REPAIRS_UI.border}`, mb: 2 }}>
        <Tabs value={tab} onChange={(_e, next) => setTab(next)} textColor="inherit" indicatorColor="secondary">
          <Tab value="queue" label="Payroll Queue" />
          <Tab value="history" label="Payroll History" />
        </Tabs>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
          <CircularProgress sx={{ color: REPAIRS_UI.accent }} />
        </Box>
      ) : tab === 'queue' ? (
        <Grid container spacing={2}>
          {queue.length === 0 ? (
            <Grid item xs={12}>
              <Card sx={{ bgcolor: REPAIRS_UI.bgPanel, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 3 }}>
                <CardContent>
                  <Typography sx={{ color: REPAIRS_UI.textSecondary }}>No eligible payroll candidates are available right now.</Typography>
                </CardContent>
              </Card>
            </Grid>
          ) : queue.map((candidate) => (
            <Grid item xs={12} md={6} lg={4} key={`${candidate.userID}-${candidate.weekStart}`}>
              <QueueCard candidate={candidate} onOpen={openCandidate} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Grid container spacing={2}>
          {history.length === 0 ? (
            <Grid item xs={12}>
              <Card sx={{ bgcolor: REPAIRS_UI.bgPanel, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 3 }}>
                <CardContent>
                  <Typography sx={{ color: REPAIRS_UI.textSecondary }}>No payroll batches have been created yet.</Typography>
                </CardContent>
              </Card>
            </Grid>
          ) : history.map((batch) => (
            <Grid item xs={12} md={6} lg={4} key={batch.batchID}>
              <HistoryCard batch={batch} onOpen={openBatch} />
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog
        open={Boolean(selectedMode)}
        onClose={closeDialog}
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
            {selectedMode === 'candidate' ? 'Payroll Candidate' : 'Payroll Batch'}
          </Typography>
          <IconButton onClick={closeDialog} sx={{ position: 'absolute', right: 12, top: 12, color: REPAIRS_UI.textSecondary }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: REPAIRS_UI.border }}>
          {dialogLoading || !selectedDetail ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
              <CircularProgress sx={{ color: REPAIRS_UI.accent }} />
            </Box>
          ) : (
            <>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}>
                <Chip label={selectedDetail.userName || 'Jeweler'} />
                <Chip label={`Week of ${new Date(selectedDetail.weekStart).toLocaleDateString()}`} />
                <Chip label={`Hours ${Number(selectedDetail.laborHours || 0).toFixed(2)}`} />
                <Chip label={`Pay ${formatMoney(selectedDetail.laborPay)}`} />
                <Chip label={`Repairs ${selectedDetail.repairsWorked || 0}`} />
                {selectedDetail.status && <Chip label={selectedDetail.status} />}
              </Stack>

              {selectedMode === 'batch' && (
                <Stack spacing={1.5} sx={{ mb: 2 }}>
                  <TextField
                    label="Notes"
                    size="small"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    multiline
                    minRows={2}
                  />
                  {(selectedDetail.status === 'finalized' || selectedDetail.status === 'paid') && (
                    <Grid container spacing={1.5}>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          label="Paid At"
                          size="small"
                          type="datetime-local"
                          fullWidth
                          value={paidAt}
                          onChange={(e) => setPaidAt(e.target.value)}
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          label="Payment Method"
                          size="small"
                          fullWidth
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          label="Reference"
                          size="small"
                          fullWidth
                          value={paymentReference}
                          onChange={(e) => setPaymentReference(e.target.value)}
                        />
                      </Grid>
                    </Grid>
                  )}
                </Stack>
              )}

              <Stack spacing={1.5}>
                {(selectedDetail.logs || []).map((log) => {
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
                        bgcolor: REPAIRS_UI.bgPrimary,
                      }}
                    >
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between">
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
                        {log.repair?.status && <Chip size="small" label={log.repair.status} />}
                        {exceedsTicketValue && <Chip size="small" color="warning" label="Pay exceeds ticket" />}
                      </Stack>
                      {workItems.length > 0 && (
                        <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary, mt: 1 }}>
                          Work: {workItems.slice(0, 5).join(', ')}
                          {workItems.length > 5 ? ` +${workItems.length - 5} more` : ''}
                        </Typography>
                      )}
                      {log.notes && (
                        <Typography variant="body2" sx={{ color: REPAIRS_UI.textMuted, mt: 0.5 }}>
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
                  );
                })}
              </Stack>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={closeDialog} disabled={actionLoading}>Close</Button>
          {selectedMode === 'candidate' && selectedDetail && (
            <Button
              variant="contained"
              onClick={createBatch}
              disabled={actionLoading}
              sx={{ bgcolor: REPAIRS_UI.accent, color: '#000', '&:hover': { bgcolor: '#c9a227' } }}
            >
              {actionLoading ? 'Creating...' : 'Create Batch'}
            </Button>
          )}
          {selectedMode === 'batch' && selectedDetail?.status === 'draft' && (
            <>
              <Button onClick={() => updateBatch('void')} disabled={actionLoading} color="inherit">
                {actionLoading ? 'Saving...' : 'Void Batch'}
              </Button>
              <Button
                variant="contained"
                onClick={() => updateBatch('finalize')}
                disabled={actionLoading}
                sx={{ bgcolor: REPAIRS_UI.accent, color: '#000', '&:hover': { bgcolor: '#c9a227' } }}
              >
                {actionLoading ? 'Saving...' : 'Finalize Batch'}
              </Button>
            </>
          )}
          {selectedMode === 'batch' && selectedDetail?.status === 'finalized' && (
            <>
              <Button onClick={() => updateBatch('void')} disabled={actionLoading} color="inherit">
                {actionLoading ? 'Saving...' : 'Void Batch'}
              </Button>
              <Button
                variant="contained"
                onClick={() => updateBatch('mark_paid')}
                disabled={actionLoading}
                sx={{ bgcolor: REPAIRS_UI.accent, color: '#000', '&:hover': { bgcolor: '#c9a227' } }}
              >
                {actionLoading ? 'Saving...' : 'Mark Paid'}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
