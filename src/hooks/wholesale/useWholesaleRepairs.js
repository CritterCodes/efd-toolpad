import { useState, useCallback, useEffect } from 'react';
import { wholesaleRepairsClient } from '@/api-clients/wholesaleRepairs.client';

export function useWholesaleRepairs() {
    const [repairs, setRepairs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all');
    const [selected, setSelected] = useState([]);

    const loadRepairs = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const params = {};
            if (filter !== 'all') {
                params.status = filter;
            }
            const data = await wholesaleRepairsClient.fetchRepairs(params);
            setRepairs(data.repairs || []);
            setSelected([]);
        } catch (err) {
            console.error('Failed to load wholesale repairs:', err);
            setError('Failed to load repairs');
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => {
        loadRepairs();
    }, [loadRepairs]);

    const createRepair = useCallback(async (repairData) => {
        const result = await wholesaleRepairsClient.createRepair(repairData);
        await loadRepairs();
        return result;
    }, [loadRepairs]);

    const toggleSelect = useCallback((repairID) => {
        setSelected(prev =>
            prev.includes(repairID)
                ? prev.filter(id => id !== repairID)
                : [...prev, repairID]
        );
    }, []);

    const selectAllPending = useCallback(() => {
        const pendingIDs = repairs
            .filter(r => r.status === 'PENDING PICKUP')
            .map(r => r.repairID);
        if (pendingIDs.every(id => selected.includes(id))) {
            setSelected(prev => prev.filter(id => !pendingIDs.includes(id)));
        } else {
            setSelected(prev => [...new Set([...prev, ...pendingIDs])]);
        }
    }, [repairs, selected]);

    const requestPickup = useCallback(async () => {
        if (selected.length === 0) return;
        const result = await wholesaleRepairsClient.requestAction(selected, 'pickup');
        await loadRepairs();
        return result;
    }, [selected, loadRepairs]);

    const scheduleDelivery = useCallback(async () => {
        if (selected.length === 0) return;
        const result = await wholesaleRepairsClient.requestAction(selected, 'delivery');
        await loadRepairs();
        return result;
    }, [selected, loadRepairs]);

    const pendingRepairs = repairs.filter(r => r.status === 'PENDING PICKUP');

    const stats = {
        total: repairs.length,
        pending: repairs.filter(r => r.status === 'PENDING PICKUP').length,
        pickupRequested: repairs.filter(r => r.status === 'PICKUP REQUESTED').length,
        receiving: repairs.filter(r => r.status === 'RECEIVING').length,
        inProgress: repairs.filter(r => !['PENDING PICKUP', 'PICKUP REQUESTED', 'RECEIVING', 'COMPLETED', 'READY FOR PICK-UP'].includes(r.status)).length,
        completed: repairs.filter(r => r.status === 'COMPLETED' || r.status === 'READY FOR PICK-UP').length,
    };

    return {
        repairs,
        pendingRepairs,
        loading,
        error,
        filter,
        setFilter,
        stats,
        selected,
        toggleSelect,
        selectAllPending,
        createRepair,
        requestPickup,
        scheduleDelivery,
        refresh: loadRepairs
    };
}
