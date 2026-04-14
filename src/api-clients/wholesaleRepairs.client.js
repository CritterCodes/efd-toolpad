// Frontend API client for wholesale repair operations

export const wholesaleRepairsClient = {
    async fetchRepairs(filters = {}) {
        const params = new URLSearchParams(filters);
        const response = await fetch(`/api/wholesale/repairs?${params}`);
        if (!response.ok) throw new Error('Failed to fetch wholesale repairs');
        return response.json();
    },

    async createRepair(repairData) {
        const response = await fetch('/api/wholesale/repairs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(repairData)
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to create repair');
        }
        return response.json();
    },

    async receiveRepairs(repairIDs) {
        const response = await fetch('/api/wholesale/repairs/receive', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ repairIDs })
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to receive repairs');
        }
        return response.json();
    },

    async receiveSingle(repairID) {
        const response = await fetch('/api/wholesale/repairs/receive', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ repairIDs: [repairID] })
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to receive repair');
        }
        return response.json();
    },

    async requestAction(repairIDs, action) {
        const response = await fetch('/api/wholesale/repairs/request-action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ repairIDs, action })
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to process request');
        }
        return response.json();
    }
};
