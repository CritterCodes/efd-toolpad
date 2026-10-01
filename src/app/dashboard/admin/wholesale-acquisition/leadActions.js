import { wholesaleLeadsClient } from '@/api-clients/wholesaleLeads.client';
import { hasScore } from './leadHelpers';

/**
 * The wholesale acquisition page's lead actions: create, Google import + cancel, scoring and rescoring, account matching, save, not-a-fit, outreach (single + bulk), find email, known customer, selection, link, copy. Moved verbatim out of page.js (max-lines burn-down); a plain factory the page calls each render.
 */
export function leadActions({ activeLeadIds, allVisibleSelected, cancelImportLoading, importJob, leads, loadLeads, selectedLeadIds, setActionLoading, setCancelImportLoading, setFitView, setGoogleOpen, setImportJob, setManualOpen, setRescoreJob, setSelectedLead, setSelectedLeadIds, setSendLead, setSnackbar, visibleSelectableIds }) {
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

  return {
    runAction,
    handleCreate,
    handleGoogleImport,
    handleCancelImport,
    handleScoreUnscored,
    handleRescoreSelected,
    handleRescoreActive,
    handleMatchCurrentAccounts,
    handleSave,
    handleScore,
    handleManualNotFit,
    handleOutreach,
    handleFindEmail,
    handleMarkKnownCustomer,
    handleToggleLeadSelection,
    handleToggleVisibleSelection,
    handleSelectActiveLeads,
    handleBulkOutreach,
    handleSendLeadOutreach,
    handleLink,
    handleCopy,
  };
}
