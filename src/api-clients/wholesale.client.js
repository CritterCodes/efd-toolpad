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
  
  approveApplication: async (applicationId, reviewNotes = '') => {
    const response = await fetch(`/api/admin/wholesale/${applicationId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewNotes })
    });
    if (!response.ok) throw new Error('Failed to approve application');
    return response.json();
  },
  
  rejectApplication: async (applicationId, reviewNotes = '') => {
    const response = await fetch(`/api/admin/wholesale/${applicationId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewNotes })
    });
    if (!response.ok) throw new Error('Failed to reject application');
    return response.json();
  },

  getWholesalers: async () => {
    const response = await fetch('/api/users?role=wholesaler');
    if (!response.ok) throw new Error('Failed to fetch wholesalers');
    return response.json();
  }
};
