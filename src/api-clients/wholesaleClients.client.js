export const wholesaleClientsAPIClient = {
  async fetchMyClients() {
    const response = await fetch('/api/wholesale/clients');
    if (!response.ok) {
      throw new Error('Failed to fetch wholesale clients');
    }
    return response.json();
  },

  async fetchClientsByWholesaler(wholesalerId) {
    const params = new URLSearchParams();
    if (wholesalerId) {
      params.set('wholesalerId', wholesalerId);
    }

    const response = await fetch(`/api/wholesale/clients?${params.toString()}`);
    if (!response.ok) {
      throw new Error('Failed to fetch wholesale clients');
    }
    return response.json();
  },

  async createClient(payload) {
    const response = await fetch('/api/wholesale/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || 'Failed to create wholesale client');
    }

    return data;
  },

  async getClient(clientId) {
    const response = await fetch(`/api/wholesale/clients/${encodeURIComponent(clientId)}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || 'Failed to fetch wholesale client');
    }
    return data;
  },

  async updateClient(clientId, payload) {
    const response = await fetch(`/api/wholesale/clients/${encodeURIComponent(clientId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || 'Failed to update wholesale client');
    }

    return data;
  },

  async deleteClient(clientId) {
    const response = await fetch(`/api/wholesale/clients/${encodeURIComponent(clientId)}`, {
      method: 'DELETE'
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || 'Failed to delete wholesale client');
    }

    return data;
  }
};

export default wholesaleClientsAPIClient;
