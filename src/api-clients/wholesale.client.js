export const wholesaleClient = {
  getAllApplications: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const response = await fetch(`/api/admin/wholesale?${params}`);
    if (!response.ok) throw new Error('Failed to fetch wholesale applications');
    return response.json();
  },
  
  getStats: async () => {
    const response = await fetch('/api/admin/wholesale/stats');
    if (!response.ok) throw new Error('Failed to fetch wholesale stats');
    return response.json();
  },

  getReconciliation: async () => {
    const response = await fetch('/api/admin/wholesale/reconciliation');
    if (!response.ok) throw new Error('Failed to fetch wholesale reconciliation report');
    return response.json();
  },
  
  approveApplication: async (applicationId, reviewNotes = '') => {
    const response = await fetch(`/api/admin/wholesale/${applicationId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewNotes })
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || 'Failed to approve application');
    }
    return response.json();
  },
  
  rejectApplication: async (applicationId, reviewNotes = '') => {
    const response = await fetch(`/api/admin/wholesale/${applicationId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewNotes })
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || 'Failed to reject application');
    }
    return response.json();
  },

  getWholesalers: async () => {
    const response = await fetch('/api/admin/wholesale?action=wholesalers');
    if (!response.ok) throw new Error('Failed to fetch wholesalers');
    return response.json();
  },

  reconcile: async (payload) => {
    const response = await fetch('/api/admin/wholesale/reconciliation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to reconcile wholesale data');
    }
    return response.json();
  }
};
