export const artisanApplicationsClient = {
  getAll: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });

    const response = await fetch(`/api/admin/artisans${params.toString() ? `?${params}` : ''}`);
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || 'Failed to fetch artisan applications');
    }

    return Array.isArray(payload) ? payload : payload.data || [];
  },

  getStats: async () => {
    const response = await fetch('/api/admin/artisans?action=stats');
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || 'Failed to fetch artisan application stats');
    }

    return payload || { total: 0, pending: 0, approved: 0, rejected: 0 };
  },

  updateStatus: async (applicationId, status, reviewNotes = '') => {
    const response = await fetch(`/api/admin/artisans/${applicationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        reviewNotes,
        reviewedBy: 'admin-dashboard'
      })
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || 'Failed to update artisan application');
    }

    return payload;
  },

  delete: async (applicationId) => {
    const response = await fetch(`/api/admin/artisans/${applicationId}`, {
      method: 'DELETE'
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || 'Failed to delete artisan application');
    }

    return payload;
  }
};
