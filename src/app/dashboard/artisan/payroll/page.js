"use client";

import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PaymentIcon from '@mui/icons-material/Payment';
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
    ...(repair.tasks || []).map((item) => item.name || item.title || item.description),
    ...(repair.processes || []).map((item) => item.name || item.title || item.description),
    ...(repair.materials || []).map((item) => item.name || item.description || item.itemNumber),
    ...(repair.customLineItems || []).map((item) => item.description),
  ].filter(Boolean);
}

export default function ArtisanPayrollPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState([]);
  const [error, setError] = useState('');
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role !== 'artisan') {
      router.push('/dashboard');
      return;
    }

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/artisan/payroll');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load payroll.');
        setBatches(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    if (status === 'authenticated' && session?.user?.role === 'artisan') {
      load();
    }
  }, [router, session?.user?.role, status]);

  const openBatch = async (batchID) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/artisan/payroll/${batchID}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load payroll detail.');
      setSelectedBatch(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setDetailLoading(false);
    }
  };

  if (status === 'loading' || (status === 'authenticated' && session?.user?.role !== 'artisan')) {
    return null;
  }

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
              View your weekly payout batches and the repair work included in each one.
            </Typography>
          </Box>
        </Box>
      </Box>

      {error && (
        <Card sx={{ bgcolor: REPAIRS_UI.bgPanel, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 3, mb: 2 }}>
          <CardContent>
            <Typography sx={{ color: '#ff8a80' }}>{error}</Typography>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
          <CircularProgress sx={{ color: REPAIRS_UI.accent }} />
        </Box>
      ) : (
        <Grid container spacing={2}>
          {batches.length === 0 ? (
            <Grid item xs={12}>
              <Card sx={{ bgcolor: REPAIRS_UI.bgPanel, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 3 }}>
                <CardContent>
                  <Typography sx={{ color: REPAIRS_UI.textSecondary }}>No payroll batches are available yet.</Typography>
                </CardContent>
              </Card>
            </Grid>
          ) : batches.map((batch) => (
            <Grid item xs={12} md={6} lg={4} key={batch.batchID}>
              <Card
                role="button"
                tabIndex={0}
                onClick={() => openBatch(batch.batchID)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openBatch(batch.batchID);
                  }
                }}
                sx={{ bgcolor: REPAIRS_UI.bgPanel, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 3, cursor: 'pointer' }}
              >
                <CardContent>
                  <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 700 }}>
                    Week of {new Date(batch.weekStart).toLocaleDateString()}
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
                    <Chip label={batch.status} size="small" />
                    <Chip label={`Hours ${Number(batch.laborHours || 0).toFixed(2)}`} size="small" />
                    <Chip label={`Pay ${formatMoney(batch.laborPay)}`} size="small" />
                  </Stack>
                  {batch.paidAt && (
                    <Typography variant="caption" sx={{ display: 'block', color: REPAIRS_UI.textMuted, mt: 1.5 }}>
                      Paid {new Date(batch.paidAt).toLocaleDateString()}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog
        open={Boolean(selectedBatch)}
        onClose={() => setSelectedBatch(null)}
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
            Payroll Detail
          </Typography>
          <IconButton onClick={() => setSelectedBatch(null)} sx={{ position: 'absolute', right: 12, top: 12, color: REPAIRS_UI.textSecondary }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: REPAIRS_UI.border }}>
          {detailLoading || !selectedBatch ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
              <CircularProgress sx={{ color: REPAIRS_UI.accent }} />
            </Box>
          ) : (
            <>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}>
                <Chip label={`Week of ${new Date(selectedBatch.weekStart).toLocaleDateString()}`} />
                <Chip label={selectedBatch.status} />
                <Chip label={`Hours ${Number(selectedBatch.laborHours || 0).toFixed(2)}`} />
                <Chip label={`Pay ${formatMoney(selectedBatch.laborPay)}`} />
              </Stack>
              {(selectedBatch.paymentMethod || selectedBatch.paymentReference || selectedBatch.paidAt) && (
                <Box sx={{ mb: 2 }}>
                  {selectedBatch.paidAt && (
                    <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>
                      Paid: {new Date(selectedBatch.paidAt).toLocaleString()}
                    </Typography>
                  )}
                  {selectedBatch.paymentMethod && (
                    <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>
                      Method: {selectedBatch.paymentMethod}
                    </Typography>
                  )}
                  {selectedBatch.paymentReference && (
                    <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>
                      Reference: {selectedBatch.paymentReference}
                    </Typography>
                  )}
                  {selectedBatch.notes && (
                    <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>
                      Notes: {selectedBatch.notes}
                    </Typography>
                  )}
                </Box>
              )}
              <Stack spacing={1.5}>
                {(selectedBatch.logs || []).map((log) => {
                  const workItems = getWorkItemLabels(log.repair);
                  const repairChargeTotal = getRepairChargeTotal(log.repair);
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
                      {workItems.length > 0 && (
                        <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary, mt: 1 }}>
                          Work: {workItems.slice(0, 5).join(', ')}
                          {workItems.length > 5 ? ` +${workItems.length - 5} more` : ''}
                        </Typography>
                      )}
                      <Button
                        size="small"
                        onClick={() => router.push(`/dashboard/repairs/${log.repairID}`)}
                        sx={{ color: REPAIRS_UI.accent, px: 0, mt: 1 }}
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
      </Dialog>
    </Box>
  );
}
