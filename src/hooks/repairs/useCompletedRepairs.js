'use client';

import { useState, useEffect } from 'react';

export const useCompletedRepairs = () => {
    const [repairs, setRepairs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortOption, setSortOption] = useState('newest');
    const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'
    const [expandedRows, setExpandedRows] = useState(new Set());

    useEffect(() => {
        fetchRepairs();
    }, []);

    const fetchRepairs = async () => {
        try {
            setLoading(true);
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

    const completedRepairs = repairs.filter(repair => 
        ['completed', 'picked-up', 'delivered'].includes(repair.status)
    );

    const filteredRepairs = completedRepairs.filter(repair => {
        if (searchQuery) {
            const searchLower = searchQuery.toLowerCase();
            const matchesSearch = (
                repair.repairNumber?.toLowerCase().includes(searchLower) ||
                repair.clientFirstName?.toLowerCase().includes(searchLower) ||
                repair.clientLastName?.toLowerCase().includes(searchLower) ||
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

    const sortedRepairs = [...filteredRepairs].sort((a, b) => {
        switch (sortOption) {
            case 'newest':
                return new Date(b.completedDate || b.updatedAt) - new Date(a.completedDate || a.updatedAt);
            case 'oldest':
                return new Date(a.completedDate || a.updatedAt) - new Date(b.completedDate || b.updatedAt);
            case 'submittedDate':
                return new Date(b.createdAt) - new Date(a.createdAt);
            case 'status':
                return (a.status || '').localeCompare(b.status || '');
            default:
                return 0;
        }
    });

    const toggleRowExpansion = (repairId) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(repairId)) {
            newExpanded.delete(repairId);
        } else {
            newExpanded.add(repairId);
        }
        setExpandedRows(newExpanded);
    };

    return {
        repairs: sortedRepairs,
        allCompletedRepairs: completedRepairs,
        loading,
        searchQuery,
        setSearchQuery,
        statusFilter,
        setStatusFilter,
        sortOption,
        setSortOption,
        viewMode,
        setViewMode,
        expandedRows,
        toggleRowExpansion,
        refreshRepairs: fetchRepairs
    };
};
