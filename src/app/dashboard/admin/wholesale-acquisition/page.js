'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Alert,
  Box,
  Button,
  Grid,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import {
  AutoAwesome as AiIcon,
  Link as LinkIcon,
  Search as SearchIcon,
  Send as SendIcon,
  Storefront as StoreIcon,
} from '@mui/icons-material';
import { wholesaleLeadsClient } from '@/api-clients/wholesaleLeads.client';
import { hasScore, matchesBusinessFilter } from './leadHelpers';
import { ImportJobPanel, RescoreJobPanel, StatBox } from './jobPanels';
import { LeadDrawer } from './LeadDrawer';
import { BulkOutreachDialog, EmailTemplatesDialog, GoogleImportDialog, LeadFormDialog, SendLeadOutreachDialog } from './leadDialogs';
import { leadActions } from './leadActions';
import { LeadList } from './LeadList';
import { LeadSortBar } from './LeadSortBar';
import { FitViewTabs } from './FitViewTabs';
import { LeadFilters } from './LeadFilters';
import { AcquisitionHeader } from './AcquisitionHeader';

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

  const {
    handleCreate, handleGoogleImport, handleCancelImport, handleScoreUnscored, handleRescoreSelected,
    handleRescoreActive, handleMatchCurrentAccounts, handleSave, handleScore, handleManualNotFit,
    handleOutreach, handleFindEmail, handleMarkKnownCustomer, handleToggleLeadSelection,
    handleToggleVisibleSelection, handleSelectActiveLeads, handleBulkOutreach, handleSendLeadOutreach,
    handleLink, handleCopy,
  } = leadActions({
    activeLeadIds, allVisibleSelected, cancelImportLoading, importJob, leads, loadLeads, selectedLeadIds,
    setActionLoading, setCancelImportLoading, setFitView, setGoogleOpen, setImportJob, setManualOpen,
    setRescoreJob, setSelectedLead, setSelectedLeadIds, setSendLead, setSnackbar, visibleSelectableIds,
  });

  if (authStatus === 'loading') return null;

  return (
    <Box sx={{ pb: 10 }}>
      <AcquisitionHeader
        actionLoading={actionLoading}
        activeLeadIds={activeLeadIds}
        handleMatchCurrentAccounts={handleMatchCurrentAccounts}
        handleRescoreActive={handleRescoreActive}
        handleRescoreSelected={handleRescoreSelected}
        handleScoreUnscored={handleScoreUnscored}
        handleSelectActiveLeads={handleSelectActiveLeads}
        importRunning={importRunning}
        loadLeads={loadLeads}
        loading={loading}
        rescoreRunning={rescoreRunning}
        selectedLeadIds={selectedLeadIds}
        setBulkOpen={setBulkOpen}
        setGoogleOpen={setGoogleOpen}
        setManualOpen={setManualOpen}
        setTemplatesOpen={setTemplatesOpen}
        viewCounts={viewCounts}
      />

      <ImportJobPanel job={importJob} onCancel={handleCancelImport} cancelling={cancelImportLoading} />
      <RescoreJobPanel job={rescoreJob} />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}><StatBox label="Active leads" value={stats.total} icon={StoreIcon} /></Grid>
        <Grid item xs={6} md={3}><StatBox label="Score 70+" value={stats.qualified} icon={AiIcon} /></Grid>
        <Grid item xs={6} md={3}><StatBox label="Follow-ups" value={stats.followUps} icon={SearchIcon} /></Grid>
        <Grid item xs={6} md={3}><StatBox label="Invited+" value={stats.invited} icon={LinkIcon} /></Grid>
      </Grid>

      <LeadFilters
        businessFilter={businessFilter}
        filters={filters}
        loadLeads={loadLeads}
        setBusinessFilter={setBusinessFilter}
        setFilters={setFilters}
        setSortBy={setSortBy}
        sortBy={sortBy}
      />

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

      <FitViewTabs fitView={fitView} setFitView={setFitView} viewCounts={viewCounts} />

      <LeadSortBar
        allVisibleSelected={allVisibleSelected}
        handleToggleVisibleSelection={handleToggleVisibleSelection}
        loading={loading}
        pageSize={pageSize}
        paginatedLeads={paginatedLeads}
        setPageSize={setPageSize}
        someVisibleSelected={someVisibleSelected}
        visibleLeads={visibleLeads}
        visibleSelectableIds={visibleSelectableIds}
      />

      <LeadList
        handleCopy={handleCopy}
        handleManualNotFit={handleManualNotFit}
        handleScore={handleScore}
        handleToggleLeadSelection={handleToggleLeadSelection}
        leads={leads}
        loading={loading}
        page={page}
        pageCount={pageCount}
        paginatedLeads={paginatedLeads}
        selectedLeadIds={selectedLeadIds}
        setPage={setPage}
        setSelectedLead={setSelectedLead}
        visibleLeads={visibleLeads}
      />

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
