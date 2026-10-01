'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  AutoAwesome as AiIcon,
  Email as EmailIcon,
  Link as LinkIcon,
  Map as MapIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Send as SendIcon,
  Storefront as StoreIcon,
} from '@mui/icons-material';
import { wholesaleLeadsClient } from '@/api-clients/wholesaleLeads.client';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';
import { BUSINESS_FILTERS, FIT_VIEWS, SORT_OPTIONS, STATUSES, hasScore, matchesBusinessFilter, statusLabel } from './leadHelpers';
import { ImportJobPanel, RescoreJobPanel, StatBox } from './jobPanels';
import { LeadCard } from './LeadCard';
import { LeadDrawer } from './LeadDrawer';
import { BulkOutreachDialog, EmailTemplatesDialog, GoogleImportDialog, LeadFormDialog, SendLeadOutreachDialog } from './leadDialogs';

export default function WholesaleAcquisitionPage() {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const [leads, setLeads] = useState([]);
  const [filters, setFilters] = useState({ search: '', status: '', minScore: '', city: '', state: '' });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [cancelImportLoading, setCancelImportLoading] = useState(false);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [selectedLead, setSelectedLead] = useState(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [googleOpen, setGoogleOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [importJob, setImportJob] = useState(null);
  const [rescoreJob, setRescoreJob] = useState(null);
  const [fitView, setFitView] = useState('all');
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);
  const [sendLead, setSendLead] = useState(null);
  const [businessFilter, setBusinessFilter] = useState('');
  const [sortBy, setSortBy] = useState('score_desc');

  const canAccess = session?.user && ['admin', 'dev'].includes(session.user.role);
  const importRunning = ['queued', 'running'].includes(importJob?.status);
  const rescoreRunning = ['queued', 'running'].includes(rescoreJob?.status);

  const loadLeads = async () => {
    setLoading(true);
    try {
      const data = await wholesaleLeadsClient.list(filters);
      setLeads(data);
      setError('');
      if (selectedLead) {
        const refreshed = data.find((lead) => lead.id === selectedLead.id);
        if (refreshed) setSelectedLead(refreshed);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authStatus === 'loading') return;
    if (!canAccess) {
      router.push('/dashboard');
      return;
    }
    loadLeads();
    wholesaleLeadsClient.latestImportJob().then((job) => {
      if (job) setImportJob(job);
    }).catch(() => {});
    wholesaleLeadsClient.latestRescoreJob().then((job) => {
      if (job) setRescoreJob(job);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus, canAccess]);

  useEffect(() => {
    if (!importRunning || !importJob?.id) return undefined;
    const interval = setInterval(async () => {
      try {
        const job = await wholesaleLeadsClient.importJob(importJob.id);
        setImportJob(job);
        if (['completed', 'failed', 'cancelled'].includes(job.status)) {
          await loadLeads();
          if (job.status === 'completed') {
            setSnackbar({
              open: true,
              severity: job.progress?.scoringErrors || job.progress?.detailErrors ? 'warning' : 'success',
              message: `Import finished: checked ${job.progress?.processedCandidates || 0}, saved ${job.progress?.saved || 0}, archived ${job.progress?.rejected || 0}, found ${job.progress?.emailDiscoveries || 0} emails, skipped ${job.progress?.outOfRadius || 0} outside radius`,
            });
          } else if (job.status === 'cancelled') {
            setSnackbar({ open: true, severity: 'warning', message: 'Import cancelled' });
          } else {
            setSnackbar({ open: true, severity: 'error', message: job.error || 'Import failed' });
          }
        }
      } catch {
        // Leave the last visible status in place if a poll misses.
      }
    }, 2500);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importJob?.id, importRunning]);

  useEffect(() => {
    if (!rescoreRunning || !rescoreJob?.id) return undefined;
    const interval = setInterval(async () => {
      try {
        const job = await wholesaleLeadsClient.rescoreJob(rescoreJob.id);
        setRescoreJob(job);
        if (['completed', 'failed'].includes(job.status)) {
          await loadLeads();
          if (job.status === 'completed') {
            setSnackbar({
              open: true,
              severity: job.progress?.failed ? 'warning' : 'success',
              message: `Rescore finished: refreshed ${job.progress?.rescored || 0}, failed ${job.progress?.failed || 0}`,
            });
          } else {
            setSnackbar({ open: true, severity: 'error', message: job.error || 'Rescore failed' });
          }
        }
      } catch {
        // Keep last visible progress if one poll fails.
      }
    }, 2500);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rescoreJob?.id, rescoreRunning]);

  const viewCounts = useMemo(() => {
    const isCurrentAccount = (lead) => Boolean(lead.knownCustomerSignal?.isCurrentWholesaler || lead.sourceType === 'customer');
    const activeLeads = leads.filter((lead) => lead.status !== 'not_fit' && !isCurrentAccount(lead));
    return {
      all: activeLeads.length,
      strong: activeLeads.filter((lead) => Number(lead.fitScore) >= 70).length,
      possible: activeLeads.filter((lead) => Number(lead.fitScore) >= 40 && Number(lead.fitScore) < 70).length,
      weak: activeLeads.filter((lead) => hasScore(lead.fitScore) && Number(lead.fitScore) < 40).length,
      reached_out: activeLeads.filter((lead) => ['contacted', 'follow_up', 'interested', 'invited', 'applied', 'approved'].includes(lead.status)).length,
      current: leads.filter(isCurrentAccount).length,
      not_fit: leads.filter((lead) => lead.status === 'not_fit').length,
      unscored: leads.filter((lead) => lead.status !== 'not_fit' && lead.sourceType !== 'customer' && !hasScore(lead.fitScore)).length,
    };
  }, [leads]);

  const visibleLeads = useMemo(() => leads.filter((lead) => {
    const score = Number(lead.fitScore);
    const isCurrentAccount = Boolean(lead.knownCustomerSignal?.isCurrentWholesaler || lead.sourceType === 'customer');
    if (!matchesBusinessFilter(lead, businessFilter)) return false;
    if (fitView === 'strong') return !isCurrentAccount && lead.status !== 'not_fit' && score >= 70;
    if (fitView === 'possible') return !isCurrentAccount && lead.status !== 'not_fit' && score >= 40 && score < 70;
    if (fitView === 'weak') return !isCurrentAccount && lead.status !== 'not_fit' && hasScore(lead.fitScore) && score < 40;
    if (fitView === 'reached_out') return !isCurrentAccount && ['contacted', 'follow_up', 'interested', 'invited', 'applied', 'approved'].includes(lead.status);
    if (fitView === 'current') return isCurrentAccount;
    if (fitView === 'not_fit') return lead.status === 'not_fit';
    if (fitView === 'unscored') return lead.status !== 'not_fit' && lead.sourceType !== 'customer' && !hasScore(lead.fitScore);
    return !isCurrentAccount && lead.status !== 'not_fit';
  }).sort((a, b) => {
    if (sortBy === 'proximity') {
      const aDistance = Number.isFinite(Number(a.distanceMiles)) ? Number(a.distanceMiles) : Infinity;
      const bDistance = Number.isFinite(Number(b.distanceMiles)) ? Number(b.distanceMiles) : Infinity;
      if (aDistance !== bDistance) return aDistance - bDistance;
      return Number(b.fitScore || 0) - Number(a.fitScore || 0);
    }
    if (sortBy === 'newest') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    if (sortBy === 'follow_up') {
      const aDate = a.nextFollowUpAt ? new Date(a.nextFollowUpAt).getTime() : Infinity;
      const bDate = b.nextFollowUpAt ? new Date(b.nextFollowUpAt).getTime() : Infinity;
      return aDate - bDate;
    }
    return Number(b.fitScore || 0) - Number(a.fitScore || 0);
  }), [businessFilter, fitView, leads, sortBy]);

  useEffect(() => {
    setPage(1);
  }, [fitView, filters.search, filters.status, filters.minScore, filters.city, filters.state, pageSize, businessFilter, sortBy]);

  const pageCount = Math.max(1, Math.ceil(visibleLeads.length / pageSize));
  const paginatedLeads = useMemo(() => {
    const safePage = Math.min(page, pageCount);
    const start = (safePage - 1) * pageSize;
    return visibleLeads.slice(start, start + pageSize);
  }, [page, pageCount, pageSize, visibleLeads]);

  const stats = useMemo(() => {
    const activeLeads = leads.filter((lead) => lead.status !== 'not_fit' && lead.sourceType !== 'customer' && !lead.knownCustomerSignal?.isCurrentWholesaler);
    const qualified = activeLeads.filter((lead) => Number(lead.fitScore) >= 70).length;
    const followUps = activeLeads.filter((lead) => lead.nextFollowUpAt).length;
    const invited = leads.filter((lead) => ['invited', 'applied', 'approved'].includes(lead.status)).length;
    return { total: activeLeads.length, qualified, followUps, invited };
  }, [leads]);

  const selectedLeads = useMemo(
    () => selectedLeadIds.map((id) => leads.find((lead) => lead.id === id)).filter(Boolean),
    [leads, selectedLeadIds],
  );

  const visibleSelectableIds = useMemo(
    () => paginatedLeads.filter((lead) => lead.status !== 'not_fit').map((lead) => lead.id),
    [paginatedLeads],
  );

  const allVisibleSelected = visibleSelectableIds.length > 0 && visibleSelectableIds.every((id) => selectedLeadIds.includes(id));
  const someVisibleSelected = visibleSelectableIds.some((id) => selectedLeadIds.includes(id)) && !allVisibleSelected;
  const activeLeadIds = useMemo(
    () => leads.filter((lead) => lead.status !== 'not_fit' && lead.sourceType !== 'customer' && !lead.knownCustomerSignal?.isCurrentWholesaler).map((lead) => lead.id),
    [leads],
  );

  const runAction = async (fn, successMessage) => {
    setActionLoading(true);
    try {
      const result = await fn();
      setSnackbar({ open: true, message: successMessage, severity: 'success' });
      await loadLeads();
      return result;
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
      return null;
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreate = async (form) => {
    const created = await runAction(() => wholesaleLeadsClient.create(form), 'Lead added');
    if (created) setManualOpen(false);
  };

  const handleGoogleImport = async (payload) => {
    setActionLoading(true);
    try {
      const job = await wholesaleLeadsClient.googleSearch(payload);
      setImportJob(job);
      setGoogleOpen(false);
      setSnackbar({
        open: true,
        severity: 'info',
        message: 'Import queued. Run the wholesale import worker to process it and keep this page open for progress.',
      });
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelImport = async () => {
    if (!importJob?.id || cancelImportLoading) return;
    setCancelImportLoading(true);
    try {
      const job = await wholesaleLeadsClient.cancelImportJob(importJob.id);
      setImportJob(job);
      setSnackbar({ open: true, message: 'Import cancelled', severity: 'warning' });
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    } finally {
      setCancelImportLoading(false);
    }
  };

  const handleScoreUnscored = async () => {
    const unscoredLeads = leads.filter((lead) => !hasScore(lead.fitScore));
    if (!unscoredLeads.length) {
      setSnackbar({ open: true, message: 'No unscored leads to score', severity: 'info' });
      return;
    }

    setActionLoading(true);
    let scored = 0;
    let failed = 0;
    try {
      for (const lead of unscoredLeads) {
        try {
          await wholesaleLeadsClient.score(lead.id);
          scored += 1;
        } catch {
          failed += 1;
        }
      }
      await loadLeads();
      setSnackbar({
        open: true,
        severity: failed ? 'warning' : 'success',
        message: `Scored ${scored} unscored leads${failed ? `; ${failed} failed` : ''}`,
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRescoreSelected = async () => {
    if (!selectedLeadIds.length) {
      setSnackbar({ open: true, message: 'Select leads to rescore first', severity: 'info' });
      return;
    }
    setActionLoading(true);
    try {
      const job = await wholesaleLeadsClient.bulkRescore({ leadIds: selectedLeadIds, scope: 'selected' });
      setRescoreJob(job);
      setSnackbar({
        open: true,
        severity: 'info',
        message: 'Rescore started. You can leave this page and come back to check progress.',
      });
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRescoreActive = async () => {
    setActionLoading(true);
    try {
      const job = await wholesaleLeadsClient.bulkRescore({ scope: 'active' });
      setRescoreJob(job);
      setSnackbar({
        open: true,
        severity: 'info',
        message: 'Active lead rescore started. You can leave this page and come back to check progress.',
      });
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleMatchCurrentAccounts = async () => {
    setActionLoading(true);
    try {
      const result = await wholesaleLeadsClient.matchCurrentAccounts({ limit: 100 });
      await loadLeads();
      setFitView('current');
      setSnackbar({
        open: true,
        severity: result.failed ? 'warning' : 'success',
        message: `Matched ${result.matched} current accounts (${result.created} created, ${result.updated} updated, ${result.unmatched} unmatched)`,
      });
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSave = async (lead, form) => {
    const updated = await runAction(() => wholesaleLeadsClient.update(lead.id, form), 'Lead updated');
    if (updated) setSelectedLead(updated);
  };

  const handleScore = async (lead) => {
    const updated = await runAction(() => wholesaleLeadsClient.score(lead.id), 'AI score saved');
    if (updated) setSelectedLead(updated);
  };

  const handleManualNotFit = async (lead) => {
    const updated = await runAction(
      () => wholesaleLeadsClient.update(lead.id, {
        status: 'not_fit',
        fitScore: 0,
        scoreOverrideReason: 'Manual not fit',
        activityNote: 'Marked manual not fit from local knowledge.',
      }),
      'Lead archived as not fit',
    );
    if (updated) {
      setSelectedLead(updated);
      setSelectedLeadIds((prev) => prev.filter((id) => id !== lead.id));
      setFitView('not_fit');
    }
  };

  const handleOutreach = async (lead) => {
    const updated = await runAction(() => wholesaleLeadsClient.outreach(lead.id), 'Outreach draft generated');
    if (updated) setSelectedLead(updated);
  };

  const handleFindEmail = async (lead) => {
    const updated = await runAction(() => wholesaleLeadsClient.findEmail(lead.id), 'Email search complete');
    if (updated) setSelectedLead(updated);
  };

  const handleMarkKnownCustomer = async (lead) => {
    const updated = await runAction(() => wholesaleLeadsClient.markKnownCustomer(lead.id), 'Marked as current account');
    if (updated) {
      setSelectedLead(updated);
      setFitView('current');
    }
  };

  const handleToggleLeadSelection = (leadId) => {
    setSelectedLeadIds((prev) => (
      prev.includes(leadId) ? prev.filter((id) => id !== leadId) : [...prev, leadId]
    ));
  };

  const handleToggleVisibleSelection = () => {
    setSelectedLeadIds((prev) => {
      if (allVisibleSelected) return prev.filter((id) => !visibleSelectableIds.includes(id));
      return [...new Set([...prev, ...visibleSelectableIds])];
    });
  };

  const handleSelectActiveLeads = () => {
    setSelectedLeadIds(activeLeadIds);
  };

  const handleBulkOutreach = async (action, options = {}) => {
    setActionLoading(true);
    try {
      const result = await wholesaleLeadsClient.bulkOutreach({
        leadIds: selectedLeadIds,
        action,
        confirmSend: Boolean(options.confirmSend),
      });
      await loadLeads();
      setSnackbar({
        open: true,
        severity: result.failed ? 'warning' : 'success',
        message: action === 'send'
          ? `Sent ${result.sent} outreach emails${result.skipped?.length ? `; skipped ${result.skipped.length}` : ''}`
          : `Drafted ${result.drafted} outreach emails${result.skipped?.length ? `; skipped ${result.skipped.length}` : ''}`,
      });
      if (action === 'send' && result.sent) setFitView('reached_out');
      return result;
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
      return null;
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendLeadOutreach = async (lead) => {
    setActionLoading(true);
    try {
      const result = await wholesaleLeadsClient.bulkOutreach({
        leadIds: [lead.id],
        action: 'send',
        confirmSend: true,
      });
      await loadLeads();
      setSendLead(null);
      setFitView('reached_out');
      setSnackbar({
        open: true,
        severity: result.sent ? 'success' : 'warning',
        message: result.sent ? `Outreach sent to ${lead.storeName}` : 'Outreach was not sent',
      });
      return result;
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
      return null;
    } finally {
      setActionLoading(false);
    }
  };

  const handleLink = async (lead, input) => {
    const payload = input.includes('@') ? { email: input } : { applicationId: input };
    const updated = await runAction(() => wholesaleLeadsClient.linkApplication(lead.id, payload), 'Application linked');
    if (updated) setSelectedLead(updated);
  };

  const handleCopy = async (text) => {
    await navigator.clipboard.writeText(text);
    setSnackbar({ open: true, message: 'Copied to clipboard', severity: 'success' });
  };

  if (authStatus === 'loading') return null;

  return (
    <Box sx={{ pb: 10 }}>
      <Box
        sx={{
          backgroundColor: { xs: 'transparent', sm: REPAIRS_UI.bgPanel },
          border: { xs: 'none', sm: `1px solid ${REPAIRS_UI.border}` },
          borderRadius: { xs: 0, sm: 3 },
          boxShadow: { xs: 'none', sm: REPAIRS_UI.shadow },
          p: { xs: 0.5, sm: 2.5, md: 3 },
          mb: 3,
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
          <Box sx={{ maxWidth: 820 }}>
            <Typography
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                px: 1.25,
                py: 0.5,
                mb: 1.5,
                fontSize: '0.72rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: REPAIRS_UI.textPrimary,
                backgroundColor: REPAIRS_UI.bgCard,
                border: `1px solid ${REPAIRS_UI.border}`,
                borderRadius: 2,
                textTransform: 'uppercase',
              }}
            >
              <StoreIcon sx={{ fontSize: 16, color: REPAIRS_UI.accent }} />
              Wholesale acquisition
            </Typography>
            <Typography component="h1" sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 1 }}>
              Repair Partner Leads
            </Typography>
            <Typography sx={{ color: REPAIRS_UI.textSecondary, lineHeight: 1.6 }}>
              Find local stores, score fit, draft outreach, and invite interested prospects into the existing wholesale application flow.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ flexWrap: 'wrap', gap: 1, justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
            <Button size="small" variant="outlined" startIcon={<RefreshIcon />} onClick={loadLeads} disabled={loading || actionLoading}>
              Refresh
            </Button>
            <Button size="small" variant="outlined" startIcon={<AiIcon />} onClick={handleScoreUnscored} disabled={loading || actionLoading || !viewCounts.unscored}>
              Score Unscored
            </Button>
            <Button size="small" variant="outlined" startIcon={<AiIcon />} onClick={handleRescoreSelected} disabled={loading || actionLoading || rescoreRunning || !selectedLeadIds.length}>
              Rescore Selected
            </Button>
            <Button size="small" variant="outlined" startIcon={<AiIcon />} onClick={handleRescoreActive} disabled={loading || actionLoading || rescoreRunning || !activeLeadIds.length}>
              Rescore Active
            </Button>
            <Button size="small" variant="outlined" startIcon={<LinkIcon />} onClick={handleMatchCurrentAccounts} disabled={loading || actionLoading}>
              Match Current Accounts
            </Button>
            <Button size="small" variant="outlined" startIcon={<EmailIcon />} onClick={() => setTemplatesOpen(true)}>
              Email Templates
            </Button>
            <Button size="small" variant="outlined" onClick={handleSelectActiveLeads} disabled={!activeLeadIds.length || actionLoading}>
              Select Active Leads
            </Button>
            <Button size="small" variant="outlined" startIcon={<SendIcon />} onClick={() => setBulkOpen(true)} disabled={!selectedLeadIds.length || actionLoading}>
              Bulk Outreach
            </Button>
            <Button size="small" variant="outlined" startIcon={<MapIcon />} onClick={() => setGoogleOpen(true)} disabled={importRunning}>
              Google Import
            </Button>
            <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setManualOpen(true)}>
              Add Lead
            </Button>
          </Stack>
        </Stack>
      </Box>

      <ImportJobPanel job={importJob} onCancel={handleCancelImport} cancelling={cancelImportLoading} />
      <RescoreJobPanel job={rescoreJob} />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}><StatBox label="Active leads" value={stats.total} icon={StoreIcon} /></Grid>
        <Grid item xs={6} md={3}><StatBox label="Score 70+" value={stats.qualified} icon={AiIcon} /></Grid>
        <Grid item xs={6} md={3}><StatBox label="Follow-ups" value={stats.followUps} icon={SearchIcon} /></Grid>
        <Grid item xs={6} md={3}><StatBox label="Invited+" value={stats.invited} icon={LinkIcon} /></Grid>
      </Grid>

      <Box sx={{ p: 2, mb: 2, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, backgroundColor: REPAIRS_UI.bgPanel }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField fullWidth size="small" label="Search" value={filters.search} onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))} />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select label="Status" value={filters.status} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}>
                <MenuItem value="">All</MenuItem>
                {STATUSES.map((status) => <MenuItem key={status} value={status}>{statusLabel(status)}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField fullWidth size="small" label="Min score" type="number" value={filters.minScore} onChange={(e) => setFilters((p) => ({ ...p, minScore: e.target.value }))} />
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField fullWidth size="small" label="City" value={filters.city} onChange={(e) => setFilters((p) => ({ ...p, city: e.target.value }))} />
          </Grid>
          <Grid item xs={6} md={1}>
            <TextField fullWidth size="small" label="State" value={filters.state} onChange={(e) => setFilters((p) => ({ ...p, state: e.target.value }))} />
          </Grid>
          <Grid item xs={6} md={1}>
            <Button fullWidth variant="outlined" onClick={loadLeads}>Apply</Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Business type</InputLabel>
              <Select label="Business type" value={businessFilter} onChange={(event) => setBusinessFilter(event.target.value)}>
                {BUSINESS_FILTERS.map((option) => (
                  <MenuItem key={option.value || 'all'} value={option.value}>{option.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Sort</InputLabel>
              <Select label="Sort" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                {SORT_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {Boolean(selectedLeadIds.length) && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between">
            <Typography>{selectedLeadIds.length} lead{selectedLeadIds.length === 1 ? '' : 's'} selected for outreach.</Typography>
            <Stack direction="row" spacing={1}>
              <Button size="small" onClick={() => setSelectedLeadIds([])}>Clear</Button>
              <Button size="small" variant="contained" startIcon={<SendIcon />} onClick={() => setBulkOpen(true)}>Bulk Outreach</Button>
            </Stack>
          </Stack>
        </Alert>
      )}

      <Paper variant="outlined" sx={{ mb: 2, borderColor: REPAIRS_UI.border, backgroundColor: REPAIRS_UI.bgPanel }}>
        <Tabs
          value={fitView}
          onChange={(event, value) => setFitView(value)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 48,
            '& .MuiTab-root': { minHeight: 48, textTransform: 'none', fontWeight: 700 },
          }}
        >
          {FIT_VIEWS.map((view) => (
            <Tab
              key={view.value}
              value={view.value}
              label={`${view.label} (${viewCounts[view.value] || 0})`}
            />
          ))}
        </Tabs>
      </Paper>

      <Box sx={{ mb: 2, p: 1.5, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, backgroundColor: REPAIRS_UI.bgPanel }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Checkbox
              checked={allVisibleSelected}
              indeterminate={someVisibleSelected}
              onChange={handleToggleVisibleSelection}
              inputProps={{ 'aria-label': 'Select visible leads' }}
            />
            <Typography sx={{ color: REPAIRS_UI.textSecondary }}>
              Showing {loading ? 0 : paginatedLeads.length} of {visibleLeads.length}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Per page</InputLabel>
              <Select label="Per page" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
                {[12, 24, 48, 96].map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
              </Select>
            </FormControl>
            <Button variant="outlined" onClick={handleToggleVisibleSelection} disabled={!visibleSelectableIds.length}>
              {allVisibleSelected ? 'Unselect Page' : 'Select Page'}
            </Button>
          </Stack>
        </Stack>
      </Box>

      {loading ? (
        <Box sx={{ py: 6, display: 'grid', placeItems: 'center' }}>
          <CircularProgress size={24} />
        </Box>
      ) : visibleLeads.length === 0 ? (
        <Box sx={{ py: 6, textAlign: 'center', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, backgroundColor: REPAIRS_UI.bgPanel }}>
          <Typography sx={{ color: REPAIRS_UI.textSecondary }}>
            {leads.length ? 'No leads match this fit view.' : 'No wholesale leads yet.'}
          </Typography>
        </Box>
      ) : (
        <>
          <Grid container spacing={2}>
            {paginatedLeads.map((lead) => (
              <Grid key={lead.id} item xs={12} sm={6} lg={4} xl={3}>
                <LeadCard
                  lead={lead}
                  selected={selectedLeadIds.includes(lead.id)}
                  onSelect={() => handleToggleLeadSelection(lead.id)}
                  onOpen={() => setSelectedLead(lead)}
                  onScore={() => handleScore(lead)}
                  onCopyInvite={() => handleCopy(lead.outreachDraft.inviteMessage)}
                  onManualNotFit={() => handleManualNotFit(lead)}
                />
              </Grid>
            ))}
          </Grid>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems="center" sx={{ mt: 3 }}>
            <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>
              Page {Math.min(page, pageCount)} of {pageCount}
            </Typography>
            <Pagination
              count={pageCount}
              page={Math.min(page, pageCount)}
              onChange={(event, value) => setPage(value)}
              color="primary"
              siblingCount={1}
              boundaryCount={1}
            />
          </Stack>
        </>
      )}

      <LeadDrawer
        lead={selectedLead}
        open={Boolean(selectedLead)}
        onClose={() => setSelectedLead(null)}
        onSave={handleSave}
        onScore={handleScore}
        onOutreach={handleOutreach}
        onFindEmail={handleFindEmail}
        onMarkKnownCustomer={handleMarkKnownCustomer}
        onManualNotFit={handleManualNotFit}
        onLink={handleLink}
        onCopy={handleCopy}
        onSendOutreach={setSendLead}
        actionLoading={actionLoading}
      />

      <LeadFormDialog open={manualOpen} onClose={() => setManualOpen(false)} onSubmit={handleCreate} loading={actionLoading} />
      <GoogleImportDialog open={googleOpen} onClose={() => setGoogleOpen(false)} onSubmit={handleGoogleImport} loading={actionLoading || importRunning} />
      <EmailTemplatesDialog open={templatesOpen} onClose={() => setTemplatesOpen(false)} onCopy={handleCopy} />
      <BulkOutreachDialog
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        leads={selectedLeads}
        onRun={handleBulkOutreach}
        loading={actionLoading}
      />
      <SendLeadOutreachDialog
        lead={sendLead}
        open={Boolean(sendLead)}
        onClose={() => setSendLead(null)}
        onSend={handleSendLeadOutreach}
        loading={actionLoading}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
