import { useState, useCallback, useEffect } from 'react';
import { wholesaleRepairsClient } from '@/api-clients/wholesaleRepairs.client';
import { normalizeRepairWorkflow, REPAIR_STATUS } from '@/services/repairWorkflow';

export function usePendingWholesale() {
    const [repairs, setRepairs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selected, setSelected] = useState([]);

    const loadRepairs = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const [pendingData, pickupData] = await Promise.all([
                wholesaleRepairsClient.fetchRepairs({ status: REPAIR_STATUS.PENDING_PICKUP }),
                wholesaleRepairsClient.fetchRepairs({ status: REPAIR_STATUS.PICKUP_REQUESTED }),
            ]);
            const all = [...(pickupData.repairs || []), ...(pendingData.repairs || [])].map(normalizeRepairWorkflow);
            setRepairs(all);
            setSelected([]);
        } catch (err) {
            console.error('Failed to load pending wholesale repairs:', err);
            setError('Failed to load pending repairs');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadRepairs();
    }, [loadRepairs]);

    const toggleSelect = useCallback((repairID) => {
        setSelected(prev =>
            prev.includes(repairID)
                ? prev.filter(id => id !== repairID)
                : [...prev, repairID]
        );
    }, []);

    const selectAllFromWholesaler = useCallback((wholesalerID) => {
        const ids = repairs
            .filter(r => r.userID === wholesalerID)
            .map(r => r.repairID);
        setSelected(prev => {
            const allSelected = ids.every(id => prev.includes(id));
            if (allSelected) {
                return prev.filter(id => !ids.includes(id));
            }
            return [...new Set([...prev, ...ids])];
        });
    }, [repairs]);

    const selectAll = useCallback(() => {
        if (selected.length === repairs.length) {
            setSelected([]);
        } else {
            setSelected(repairs.map(r => r.repairID));
        }
    }, [repairs, selected]);

    const receiveSelected = useCallback(async () => {
        if (selected.length === 0) return;
        try {
            const result = await wholesaleRepairsClient.receiveRepairs(selected);
            await loadRepairs();
            return result;
        } catch (err) {
            console.error('Failed to receive repairs:', err);
            throw err;
        }
    }, [selected, loadRepairs]);

    // Group repairs by wholesaler
    const grouped = repairs.reduce((acc, repair) => {
        const key = repair.userID || 'unknown';
        if (!acc[key]) {
            acc[key] = {
                wholesalerID: key,
                wholesalerName: repair.wholesalerName || 'Unknown',
                repairs: []
            };
        }
        acc[key].repairs.push(repair);
        return acc;
    }, {});

    const wholesalerGroups = Object.values(grouped);

    return {
        repairs,
        wholesalerGroups,
        loading,
        error,
        selected,
        toggleSelect,
        selectAllFromWholesaler,
        selectAll,
        receiveSelected,
        refresh: loadRepairs
    };
}
