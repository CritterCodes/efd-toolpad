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
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import WorkHistoryIcon from '@mui/icons-material/WorkHistory';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

function formatMoney(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
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
  return action.replace(/[_-]+/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

const SOURCE_TYPE_LABELS = {
  repair: 'Repair',
  production_piece: 'Piece',
  custom_piece: 'Custom',
  custom: 'Custom',
  sale_service: 'Sale Service',
  cad: 'CAD',
};

function sourceTypeLabel(type) {
  if (!type) return 'Work';
  return SOURCE_TYPE_LABELS[type] || formatSourceAction(type);
}

// Labor weekStart is stored at UTC-midnight Monday (server getMondayOfWeek on Vercel/UTC).
// Compare in UTC — a local getDay()/setHours() shifts the boundary a day in US timezones,
// which dropped current-week work out of "This Week" into "Past Weeks".
function getMondayOfCurrentWeekUTC() {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = (day === 0 ? -6 : 1 - day);
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff));
}

function weekKey(value) {
  return new Date(value).toISOString().slice(0, 10); // UTC YYYY-MM-DD
}

export default function ArtisanMyWorkPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [laborWeeks, setLaborWeeks] = useState([]);
  const [salesInvoices, setSalesInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedWeek, setSelectedWeek] = useState(null);
  const [weekLoading, setWeekLoading] = useState(false);
  const [weekError, setWeekError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/artisan/my-work');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load work summary.');
      setLaborWeeks(Array.isArray(data.laborWeeks) ? data.laborWeeks : []);
      setSalesInvoices(Array.isArray(data.salesInvoices) ? data.salesInvoices : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role !== 'artisan') {
      router.push('/dashboard');
      return;
    }
    if (status === 'authenticated' && session?.user?.role === 'artisan') {
      fetchData();
    }
  }, [fetchData, router, session?.user?.role, status]);

  const currentWeekMonday = useMemo(() => getMondayOfCurrentWeekUTC(), []);
  const currentWeekKey = useMemo(() => weekKey(currentWeekMonday), [currentWeekMonday]);

  const thisWeekLabor = useMemo(() => {
    return laborWeeks.filter((entry) => weekKey(entry.weekStart) === currentWeekKey);
  }, [laborWeeks, currentWeekKey]);

  const pastWeekLabor = useMemo(() => {
    return laborWeeks.filter((entry) => weekKey(entry.weekStart) !== currentWeekKey);
  }, [laborWeeks, currentWeekKey]);

  const thisWeekInvoices = useMemo(() => {
    return salesInvoices.filter((inv) => {
      const created = new Date(inv.createdAt);
      return created >= currentWeekMonday;
    });
  }, [salesInvoices, currentWeekMonday]);

  const openWeekBreakdown = async (entry) => {
    setSelectedWeek({ ...entry, logs: [] });
    setWeekLoading(true);
    setWeekError('');
    try {
      const params = new URLSearchParams({
        detail: 'true',
        weekStart: new Date(entry.weekStart).toISOString(),
      });
      const res = await fetch(`/api/artisan/my-work?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load week breakdown.');
      setSelectedWeek(data);
    } catch (e) {
      setWeekError(e.message);
    } finally {
      setWeekLoading(false);
    }
  };

  const closeWeek = () => {
    setSelectedWeek(null);
    setWeekError('');
  };

  if (status === 'loading' || (status === 'authenticated' && session?.user?.role !== 'artisan')) {
    return null;
  }

  return (
    <Box sx={{ pb: 8 }}>
      {/* Header */}
      <Box sx={{ bgcolor: REPAIRS_UI.bgPanel, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 3, p: { xs: 2, md: 3 }, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <WorkHistoryIcon sx={{ color: REPAIRS_UI.accent, fontSize: 28 }} />
          <Box>
            <Typography sx={{ fontSize: { xs: 24, md: 30 }, fontWeight: 600, color: REPAIRS_UI.textHeader }}>
              My Work
            </Typography>
            <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>
              Your repair labor and sales invoices for the current and past periods.
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
          {/* This Week — Repair Labor */}
          <Typography variant="overline" sx={{ color: REPAIRS_UI.textSecondary, fontWeight: 700, letterSpacing: '0.08em' }}>
            This Week — Repair Labor
          </Typography>
          <Grid container spacing={2} sx={{ mt: 0.5, mb: 4 }}>
            {thisWeekLabor.length === 0 ? (
              <Grid item xs={12}>
                <Card sx={{ bgcolor: REPAIRS_UI.bgPanel, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 3 }}>
                  <CardContent>
                    <Typography sx={{ color: REPAIRS_UI.textSecondary }}>No repair labor logged this week yet.</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ) : thisWeekLabor.map((entry) => (
              <Grid item xs={12} md={6} lg={4} key={`${entry.weekStart}`}>
                <WeekCard entry={entry} onClick={openWeekBreakdown} />
              </Grid>
            ))}
          </Grid>

          {/* This Week — Sales Invoices */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <PointOfSaleIcon sx={{ color: REPAIRS_UI.accent, fontSize: 20 }} />
            <Typography variant="overline" sx={{ color: REPAIRS_UI.textSecondary, fontWeight: 700, letterSpacing: '0.08em' }}>
              This Week — Sales Invoices
            </Typography>
          </Box>
          <Grid container spacing={2} sx={{ mb: 4 }}>
            {thisWeekInvoices.length === 0 ? (
              <Grid item xs={12}>
                <Card sx={{ bgcolor: REPAIRS_UI.bgPanel, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 3 }}>
                  <CardContent>
                    <Typography sx={{ color: REPAIRS_UI.textSecondary }}>No sales invoices created this week.</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ) : thisWeekInvoices.map((inv) => (
              <Grid item xs={12} md={6} key={inv.invoiceID}>
                <SalesInvoiceCard invoice={inv} />
              </Grid>
            ))}
          </Grid>

          {/* Past Weeks — Repair Labor */}
          {pastWeekLabor.length > 0 && (
            <>
              <Typography variant="overline" sx={{ color: REPAIRS_UI.textSecondary, fontWeight: 700, letterSpacing: '0.08em' }}>
                Past Weeks — Repair Labor
              </Typography>
              <Grid container spacing={2} sx={{ mt: 0.5 }}>
                {pastWeekLabor.map((entry) => (
                  <Grid item xs={12} md={6} lg={4} key={`${entry.weekStart}`}>
                    <WeekCard entry={entry} onClick={openWeekBreakdown} />
                  </Grid>
                ))}
              </Grid>
            </>
          )}
        </>
      )}

      {/* Week Breakdown Dialog */}
      <Dialog
        open={Boolean(selectedWeek)}
        onClose={closeWeek}
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
            Week of {selectedWeek?.weekStart ? formatDate(selectedWeek.weekStart) : ''}
          </Typography>
          <IconButton
            aria-label="Close"
            onClick={closeWeek}
            sx={{ position: 'absolute', right: 12, top: 12, color: REPAIRS_UI.textSecondary }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: REPAIRS_UI.border }}>
          {selectedWeek && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}>
              <Chip
                label={`Hours ${Number(selectedWeek.laborHours || 0).toFixed(2)}`}
                sx={{ bgcolor: 'rgba(225, 179, 42, 0.14)', color: REPAIRS_UI.textHeader }}
              />
              <Chip
                label={`Work Items ${selectedWeek.itemsWorked ?? selectedWeek.repairsWorked ?? 0}`}
                sx={{ bgcolor: 'rgba(225, 179, 42, 0.14)', color: REPAIRS_UI.textHeader }}
              />
              <Chip
                label={`Pay Snapshot ${formatMoney(selectedWeek.laborPay)}`}
                sx={{ bgcolor: 'rgba(225, 179, 42, 0.14)', color: REPAIRS_UI.textHeader }}
              />
            </Stack>
          )}

          {weekError && <Alert severity="error" sx={{ mb: 2 }}>{weekError}</Alert>}

          {weekLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
              <CircularProgress sx={{ color: REPAIRS_UI.accent }} />
            </Box>
          ) : (selectedWeek?.logs?.length > 0) ? (
            <Stack spacing={1.5}>
              {selectedWeek.logs.map((log) => {
                const workItems = getWorkItemLabels(log.repair);
                const repairChargeTotal = getRepairChargeTotal(log.repair);
                const isRepair = (log.source?.type || (log.repairID ? 'repair' : '')) === 'repair';
                const sourceType = log.source?.type || (log.repairID ? 'repair' : '');
                const headingName = isRepair
                  ? (log.repair?.clientName || log.repair?.businessName || 'Repair')
                  : sourceTypeLabel(sourceType);
                const headingRef = log.repairID || log.source?.sourceID || log.source?.workOrderID || '';
                const description = log.repair?.description || log.source?.title || 'No description saved.';
                const statusLabel = log.repair?.status || log.source?.status;
                return (
                  <Box
                    key={log.logID}
                    sx={{ border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, p: 1.5, bgcolor: REPAIRS_UI.bgPage }}
                  >
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'flex-start' }}>
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
                              {headingName}{headingRef ? ` · ${headingRef}` : ''}
                            </Typography>
                            <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>
                              {description}
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: { xs: 'left', sm: 'right' }, flexShrink: 0 }}>
                            <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 700 }}>
                              {formatMoney(log.creditedValue)}
                            </Typography>
                            <Typography variant="caption" sx={{ color: REPAIRS_UI.textSecondary }}>
                              {Number(log.creditedLaborHours || 0).toFixed(2)}h @ {formatMoney(log.laborRateSnapshot)}/hr
                            </Typography>
                            {isRepair && (
                              <Typography variant="caption" sx={{ color: REPAIRS_UI.textSecondary, display: 'block' }}>
                                Ticket {formatMoney(repairChargeTotal)}
                              </Typography>
                            )}
                          </Box>
                        </Stack>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                          {sourceType && <Chip size="small" label={sourceTypeLabel(sourceType)} />}
                          <Chip size="small" label={formatSourceAction(log.sourceAction || 'Labor Credit')} />
                          {statusLabel && <Chip size="small" label={statusLabel} />}
                          {log.createdAt && <Chip size="small" label={new Date(log.createdAt).toLocaleString()} />}
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
                        {isRepair && log.repairID && (
                          <>
                            <Divider sx={{ borderColor: REPAIRS_UI.border, my: 1 }} />
                            <Button
                              size="small"
                              onClick={() => router.push(`/dashboard/repairs/${log.repairID}`)}
                              sx={{ color: REPAIRS_UI.accent, px: 0 }}
                            >
                              Open Repair
                            </Button>
                          </>
                        )}
                      </Box>
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          ) : (
            <Typography sx={{ color: REPAIRS_UI.textSecondary }}>
              No labor credits found for this week.
            </Typography>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}

function WeekCard({ entry, onClick }) {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onClick(entry)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(entry); }
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
        <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 600 }}>
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
          Click for repair breakdown
        </Typography>
      </CardContent>
    </Card>
  );
}

function SalesInvoiceCard({ invoice }) {
  const paymentStatusColor = {
    paid: '#4caf50',
    partial: '#ff9800',
    unpaid: '#f44336',
  }[invoice.paymentStatus] || REPAIRS_UI.textSecondary;

  return (
    <Card sx={{ bgcolor: REPAIRS_UI.bgPanel, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 3 }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 700 }}>
              {invoice.clientName || 'Walk-in'} · {invoice.invoiceID}
            </Typography>
            <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>
              {formatDate(invoice.createdAt)}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
            <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 700 }}>
              {formatMoney(invoice.total)}
            </Typography>
            <Typography variant="caption" sx={{ color: paymentStatusColor, fontWeight: 600 }}>
              {invoice.paymentStatus}
            </Typography>
          </Box>
        </Stack>
        {(invoice.lineItems || []).length > 0 && (
          <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary, mt: 1 }}>
            {invoice.lineItems.length} line item{invoice.lineItems.length !== 1 ? 's' : ''}
            {invoice.lineItems[0]?.description ? ` — ${invoice.lineItems[0].description}` : ''}
          </Typography>
        )}
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
          <Chip size="small" label={invoice.status} />
          {invoice.paidAt && (
            <Chip size="small" label={`Paid ${formatDate(invoice.paidAt)}`} />
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
