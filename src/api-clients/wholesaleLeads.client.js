export const wholesaleLeadsClient = {
  async list(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') params.set(key, value);
    });
    const response = await fetch(`/api/admin/wholesale-leads?${params}`);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Failed to fetch wholesale leads');
    return payload.data || [];
  },

  async create(data) {
    const response = await fetch('/api/admin/wholesale-leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Failed to create wholesale lead');
    return payload.lead;
  },

  async update(leadId, data) {
    const response = await fetch(`/api/admin/wholesale-leads/${leadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Failed to update wholesale lead');
    return payload.data;
  },

  async googleSearch(data) {
    const response = await fetch('/api/admin/wholesale-leads/google-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Failed to import Google Places leads');
    return payload.data;
  },

  async latestImportJob() {
    const response = await fetch('/api/admin/wholesale-leads/google-search');
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Failed to fetch import job');
    return payload.data;
  },

  async importJob(jobId) {
    const response = await fetch(`/api/admin/wholesale-leads/google-search/jobs/${jobId}`);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Failed to fetch import job');
    return payload.data;
  },

  async cancelImportJob(jobId) {
    const response = await fetch(`/api/admin/wholesale-leads/google-search/jobs/${jobId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel' }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Failed to cancel import job');
    return payload.data;
  },

  async score(leadId) {
    const response = await fetch(`/api/admin/wholesale-leads/${leadId}/score`, { method: 'POST' });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Failed to score wholesale lead');
    return payload.data;
  },

  async outreach(leadId) {
    const response = await fetch(`/api/admin/wholesale-leads/${leadId}/outreach`, { method: 'POST' });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Failed to generate outreach');
    return payload.data;
  },

  async findEmail(leadId) {
    const response = await fetch(`/api/admin/wholesale-leads/${leadId}/find-email`, { method: 'POST' });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Failed to find email');
    return payload.data;
  },

  async markKnownCustomer(leadId) {
    const response = await fetch(`/api/admin/wholesale-leads/${leadId}/known-customer`, { method: 'POST' });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Failed to mark known customer');
    return payload.data;
  },

  async bulkOutreach(data) {
    const response = await fetch('/api/admin/wholesale-leads/bulk-outreach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Failed to run bulk outreach');
    return payload.data;
  },

  async bulkRescore(data) {
    const response = await fetch('/api/admin/wholesale-leads/bulk-rescore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Failed to rescore leads');
    return payload.data;
  },

  async latestRescoreJob() {
    const response = await fetch('/api/admin/wholesale-leads/bulk-rescore');
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Failed to fetch rescore job');
    return payload.data;
  },

  async matchCurrentAccounts(data = {}) {
    const response = await fetch('/api/admin/wholesale-leads/match-current-accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Failed to match current wholesale accounts');
    return payload.data;
  },

  async rescoreJob(jobId) {
    const response = await fetch(`/api/admin/wholesale-leads/bulk-rescore/jobs/${jobId}`);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Failed to fetch rescore job');
    return payload.data;
  },

  async linkApplication(leadId, data) {
    const response = await fetch(`/api/admin/wholesale-leads/${leadId}/link-application`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Failed to link wholesale application');
    return payload.data;
  },
};
