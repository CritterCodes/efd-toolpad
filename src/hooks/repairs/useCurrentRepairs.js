import { useState, useEffect } from 'react';

export const useCurrentRepairs = () => {
    const [repairs, setRepairs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortOption, setSortOption] = useState('newest');

    useEffect(() => {
        fetchRepairs();
    }, []);

    const fetchRepairs = async () => {
        try {
            const response = await fetch('/api/repairs/my-repairs');
            if (response.ok) {
                const data = await response.json();
                setRepairs(data.repairs || []);
            }
        } catch (error) {
            console.error('Error fetching repairs:', error);
        } finally {
            setLoading(false);
        }
    };

    // Filter current repairs (not completed/picked up)
    const currentRepairs = repairs.filter(repair => 
        !['COMPLETED', 'READY FOR PICKUP', 'DELIVERY BATCHED', 'PAID_CLOSED', 'READY FOR PICK-UP', 'CANCELLED', 'cancelled'].includes(repair.status)
    );

    // Apply search and filters
    const filteredRepairs = currentRepairs.filter(repair => {
        if (searchQuery) {
            const searchLower = searchQuery.toLowerCase();
            const matchesSearch = (
                repair.repairID?.toLowerCase().includes(searchLower) ||
                repair.repairNumber?.toLowerCase().includes(searchLower) ||
                repair.clientName?.toLowerCase().includes(searchLower) ||
                repair.clientFirstName?.toLowerCase().includes(searchLower) ||
                repair.clientLastName?.toLowerCase().includes(searchLower) ||
                repair.description?.toLowerCase().includes(searchLower) ||
                repair.repairDescription?.toLowerCase().includes(searchLower) ||
                repair.itemDescription?.toLowerCase().includes(searchLower)
            );
            if (!matchesSearch) return false;
        }

        if (statusFilter !== 'all' && repair.status !== statusFilter) {
            return false;
        }

        return true;
    });

    // Sort repairs
    const sortedRepairs = [...filteredRepairs].sort((a, b) => {
        switch (sortOption) {
            case 'newest':
                return new Date(b.createdAt) - new Date(a.createdAt);
            case 'oldest':
                return new Date(a.createdAt) - new Date(b.createdAt);
            case 'dueDate':
                const aDate = a.promiseDate || a.dueDate;
                const bDate = b.promiseDate || b.dueDate;
                if (!aDate && !bDate) return 0;
                if (!aDate) return 1;
                if (!bDate) return -1;
                return new Date(aDate) - new Date(bDate);
            case 'status':
                return (a.status || '').localeCompare(b.status || '');
            default:
                return 0;
        }
    });

    return {
        repairs: sortedRepairs,
        currentRepairsCount: currentRepairs.length,
        inProgressCount: currentRepairs.filter(r => r.status === 'IN PROGRESS').length,
        readyForPickupCount: repairs.filter(r => ['READY FOR PICKUP', 'READY FOR PICK-UP'].includes(r.status)).length,
        loading,
        searchQuery,
        setSearchQuery,
        statusFilter,
        setStatusFilter,
        sortOption,
        setSortOption
    };
};
