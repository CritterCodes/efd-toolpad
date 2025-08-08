"use client";
import React from 'react';
import {
    Box,
    Typography,
    Snackbar,
    Breadcrumbs,
    Link,
    Fab
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useRouter } from 'next/navigation';
import { useRepairs } from '@/app/context/repairs.context';

// Custom hooks
import { useReadyForWork } from './hooks/useReadyForWork';

// Components
import WorkFilters from './components/WorkFilters';
import WorkGrid from './components/WorkGrid';
import AssignJewelerModal from './components/AssignJewelerModal';

// Utils
import { assignJewelerToRepairs, startWorkOnRepair, updateRepairAssignment } from './utils/workUtils';

const ReadyForWorkPage = () => {
    const { repairs, setRepairs } = useRepairs();
    const router = useRouter();
    
    const {
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
        setSearchQuery,
        setPriorityFilter,
        setSortOption,
        setSelectedJeweler,
        showSnackbar,
        closeSnackbar,
        openAssignJewelerModal,
        closeAssignJewelerModal,
        toggleBulkSelectMode,
        toggleRepairSelection,
        selectAllRepairs,
        clearSelection,
        getFilteredAndSortedRepairs
    } = useReadyForWork();

    // Get filtered and sorted repairs
    const filteredRepairs = getFilteredAndSortedRepairs(repairs);

    const handleAssignJeweler = (repairID) => {
        openAssignJewelerModal(repairID);
    };

    const handleBulkAssignJeweler = () => {
        if (selectedRepairs.size === 0) {
            showSnackbar('Please select repairs to assign', 'warning');
            return;
        }
        openAssignJewelerModal('');
    };

    const handleSaveJewelerAssignment = async (repairIDs, jewelerName) => {
        try {
            const results = await assignJewelerToRepairs(repairIDs, jewelerName);
            
            // Check results
            const failures = results.filter(r => !r.success);
            
            if (failures.length === 0) {
                // Update local state
                setRepairs(prevRepairs =>
                    prevRepairs.map(repair =>
                        repairIDs.includes(repair.repairID)
                            ? updateRepairAssignment(repair, jewelerName)
                            : repair
                    )
                );
                
                const count = repairIDs.length;
                showSnackbar(
                    `✅ Successfully assigned ${count} repair${count > 1 ? 's' : ''} to ${jewelerName}`,
                    'success'
                );
                
                if (bulkSelectMode) {
                    clearSelection();
                }
            } else {
                showSnackbar(
                    `❌ ${failures.length} assignment${failures.length > 1 ? 's' : ''} failed. Please try again.`,
                    'error'
                );
            }
        } catch (error) {
            showSnackbar(`❌ Error assigning jeweler: ${error.message}`, 'error');
        }
    };

    const handleStartWork = async (repairID) => {
        try {
            const repair = repairs.find(r => r.repairID === repairID);
            const jewelerName = repair?.assignedJeweler || 'System User';
            
            await startWorkOnRepair(repairID, jewelerName);
            
            setRepairs(prevRepairs =>
                prevRepairs.map(repair =>
                    repair.repairID === repairID
                        ? { 
                            ...repair, 
                            status: 'IN PROGRESS',
                            startedAt: new Date().toISOString(),
                            startedBy: jewelerName
                        }
                        : repair
                )
            );
            
            showSnackbar(`✅ Started work on repair ${repairID}`, 'success');
        } catch (error) {
            showSnackbar('❌ Error starting work on repair', 'error');
        }
    };

    const handleViewDetails = (repairID) => {
        router.push(`/dashboard/repairs/details/${repairID}`);
    };

    const handleSelectAll = () => {
        const allRepairIDs = filteredRepairs.map(r => r.repairID);
        selectAllRepairs(allRepairIDs);
    };

    return (
        <Box sx={{ padding: '20px', position: 'relative' }}>
            {/* Breadcrumbs */}
            <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
                <Link 
                    underline="hover" 
                    color="inherit" 
                    onClick={() => router.push('/dashboard')} 
                    sx={{ cursor: 'pointer' }}
                >
                    Dashboard
                </Link>
                <Link 
                    underline="hover" 
                    color="inherit" 
                    onClick={() => router.push('/dashboard/repairs')} 
                    sx={{ cursor: 'pointer' }}
                >
                    Repairs
                </Link>
                <Typography color="text.primary">Ready for Work</Typography>
            </Breadcrumbs>

            <Typography variant="h4" sx={{ mb: 2, fontWeight: 'bold' }}>
                Ready for Work
            </Typography>
            
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Repairs that have all necessary parts and are ready to be worked on
            </Typography>

            {/* Filters */}
            <WorkFilters
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                priorityFilter={priorityFilter}
                onPriorityChange={setPriorityFilter}
                sortOption={sortOption}
                onSortChange={setSortOption}
                bulkSelectMode={bulkSelectMode}
                onToggleBulkSelect={bulkSelectMode ? handleBulkAssignJeweler : toggleBulkSelectMode}
                selectedCount={selectedRepairs.size}
                totalCount={filteredRepairs.length}
                onSelectAll={handleSelectAll}
                onClearSelection={clearSelection}
            />

            {/* Work Grid */}
            <WorkGrid
                repairs={filteredRepairs}
                bulkSelectMode={bulkSelectMode}
                selectedRepairs={selectedRepairs}
                onToggleSelect={toggleRepairSelection}
                onAssignJeweler={handleAssignJeweler}
                onStartWork={handleStartWork}
                onViewDetails={handleViewDetails}
                emptyMessage={
                    priorityFilter === 'all' 
                        ? "No repairs are currently ready for work"
                        : `No ${priorityFilter.replace('-', ' ')} repairs found`
                }
            />

            {/* Assign Jeweler Modal */}
            <AssignJewelerModal
                open={assignJewelerModalOpen}
                onClose={closeAssignJewelerModal}
                onSave={handleSaveJewelerAssignment}
                repairID={selectedRepairID}
                selectedRepairs={selectedRepairs}
                isBulkMode={bulkSelectMode && selectedRepairs.size > 0}
            />

            {/* Floating Action Button for New Repair */}
            <Fab
                color="primary"
                aria-label="add new repair"
                sx={{ position: 'fixed', bottom: 16, right: 16 }}
                onClick={() => router.push('/dashboard/repairs/new')}
            >
                <AddIcon />
            </Fab>

            {/* Snackbar Notifications */}
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={5000}
                onClose={closeSnackbar}
                message={snackbarMessage}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                ContentProps={{
                    sx: {
                        backgroundColor:
                            snackbarSeverity === "success"
                                ? "green"
                                : snackbarSeverity === "error"
                                ? "red"
                                : "orange",
                        color: "white",
                        fontWeight: "bold",
                    },
                }}
            />
        </Box>
    );
};

export default ReadyForWorkPage;
