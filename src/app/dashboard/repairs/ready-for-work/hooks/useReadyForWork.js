import { useState, useMemo } from 'react';

export const useReadyForWork = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('all');
    const [sortOption, setSortOption] = useState('promise-date-asc');
    const [selectedJeweler, setSelectedJeweler] = useState('');
    const [assignJewelerModalOpen, setAssignJewelerModalOpen] = useState(false);
    const [selectedRepairID, setSelectedRepairID] = useState('');
    const [bulkSelectMode, setBulkSelectMode] = useState(false);
    const [selectedRepairs, setSelectedRepairs] = useState(new Set());
    
    // Snackbar state
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('info');

    const showSnackbar = (message, severity = 'info') => {
        setSnackbarMessage(message);
        setSnackbarSeverity(severity);
        setSnackbarOpen(true);
    };

    const closeSnackbar = () => {
        setSnackbarOpen(false);
    };

    const openAssignJewelerModal = (repairID) => {
        setSelectedRepairID(repairID);
        setAssignJewelerModalOpen(true);
    };

    const closeAssignJewelerModal = () => {
        setAssignJewelerModalOpen(false);
        setSelectedRepairID('');
        setSelectedJeweler('');
    };

    const toggleBulkSelectMode = () => {
        setBulkSelectMode(!bulkSelectMode);
        if (bulkSelectMode) {
            setSelectedRepairs(new Set());
        }
    };

    const toggleRepairSelection = (repairID) => {
        const newSelected = new Set(selectedRepairs);
        if (newSelected.has(repairID)) {
            newSelected.delete(repairID);
        } else {
            newSelected.add(repairID);
        }
        setSelectedRepairs(newSelected);
    };

    const selectAllRepairs = (repairIDs) => {
        setSelectedRepairs(new Set(repairIDs));
    };

    const clearSelection = () => {
        setSelectedRepairs(new Set());
    };

    const getFilteredAndSortedRepairs = (repairs) => {
        let filtered = repairs.filter(repair => repair.status === 'READY FOR WORK');

        // Apply search filter
        if (searchQuery) {
            filtered = filtered.filter(repair =>
                repair.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                repair.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                repair.repairID.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Apply priority filter
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const endOfWeek = new Date(today);
        endOfWeek.setDate(today.getDate() + 7);

        switch (priorityFilter) {
            case 'rush':
                filtered = filtered.filter(repair => repair.isRush);
                break;
            case 'due-today':
                filtered = filtered.filter(repair => {
                    if (!repair.promiseDate) return false;
                    const dueDate = new Date(repair.promiseDate);
                    dueDate.setHours(0, 0, 0, 0);
                    return dueDate.getTime() === today.getTime();
                });
                break;
            case 'overdue':
                filtered = filtered.filter(repair => {
                    if (!repair.promiseDate) return false;
                    const dueDate = new Date(repair.promiseDate);
                    dueDate.setHours(0, 0, 0, 0);
                    return dueDate < today;
                });
                break;
            case 'due-this-week':
                filtered = filtered.filter(repair => {
                    if (!repair.promiseDate) return false;
                    const dueDate = new Date(repair.promiseDate);
                    return dueDate >= today && dueDate <= endOfWeek;
                });
                break;
            default:
                // 'all' - no additional filtering
                break;
        }

        // Apply sorting
        filtered.sort((a, b) => {
            switch (sortOption) {
                case 'promise-date-asc':
                    return new Date(a.promiseDate || '9999-12-31') - new Date(b.promiseDate || '9999-12-31');
                case 'promise-date-desc':
                    return new Date(b.promiseDate || '1900-01-01') - new Date(a.promiseDate || '1900-01-01');
                case 'created-desc':
                    return new Date(b.createdAt) - new Date(a.createdAt);
                case 'created-asc':
                    return new Date(a.createdAt) - new Date(b.createdAt);
                case 'client-name':
                    return a.clientName.localeCompare(b.clientName);
                default:
                    return 0;
            }
        });

        return filtered;
    };

    return {
        // State
        searchQuery,
        priorityFilter,
        sortOption,
        selectedJeweler,
        assignJewelerModalOpen,
        selectedRepairID,
        bulkSelectMode,
        selectedRepairs,
        snackbarOpen,
        snackbarMessage,
        snackbarSeverity,
        
        // Setters
        setSearchQuery,
        setPriorityFilter,
        setSortOption,
        setSelectedJeweler,
        
        // Actions
        showSnackbar,
        closeSnackbar,
        openAssignJewelerModal,
        closeAssignJewelerModal,
        toggleBulkSelectMode,
        toggleRepairSelection,
        selectAllRepairs,
        clearSelection,
        getFilteredAndSortedRepairs
    };
};
