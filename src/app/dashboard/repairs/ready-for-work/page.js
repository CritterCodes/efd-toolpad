"use client";
import React, { useEffect } from 'react';
import {
    Box,
    Typography,
    Fab,
    Alert,
    Snackbar
} from '@mui/material';
import { Add as AddIcon, Build as BuildIcon } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useRepairs } from '@/app/context/repairs.context';

import { useReadyForWork } from './hooks/useReadyForWork';
import WorkFilters from './components/WorkFilters';
import WorkGrid from './components/WorkGrid';
import AssignJewelerModal from './components/AssignJewelerModal';
import { assignJewelerToRepairs, startWorkOnRepair, updateRepairAssignment } from './utils/workUtils';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

const ReadyForWorkPage = () => {
    const { data: session, status: authStatus } = useSession();
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

    useEffect(() => {
        if (authStatus !== 'loading' && (!session?.user || session.user.role !== 'admin')) {
            router.push('/dashboard');
        }
    }, [authStatus, session, router]);

    if (authStatus === 'loading' || !session?.user || session.user.role !== 'admin') return null;

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
            const failures = results.filter(r => !r.success);

            if (failures.length === 0) {
                setRepairs(prevRepairs =>
                    prevRepairs.map(repair =>
                        repairIDs.includes(repair.repairID)
                            ? updateRepairAssignment(repair, jewelerName)
                            : repair
                    )
                );
                const count = repairIDs.length;
                showSnackbar(`Successfully assigned ${count} repair${count > 1 ? 's' : ''} to ${jewelerName}`, 'success');
                if (bulkSelectMode) clearSelection();
            } else {
                showSnackbar(`${failures.length} assignment${failures.length > 1 ? 's' : ''} failed. Please try again.`, 'error');
            }
        } catch (error) {
            showSnackbar(`Error assigning jeweler: ${error.message}`, 'error');
        }
    };

    const handleStartWork = async (repairID) => {
        try {
            const repair = repairs.find(r => r.repairID === repairID);
            const jewelerName = repair?.assignedJeweler || 'System User';
            await startWorkOnRepair(repairID, jewelerName);
            setRepairs(prevRepairs =>
                prevRepairs.map(r =>
                    r.repairID === repairID
                        ? { ...r, status: 'IN PROGRESS', startedAt: new Date().toISOString(), startedBy: jewelerName }
                        : r
                )
            );
            showSnackbar(`Started work on repair ${repairID}`, 'success');
        } catch {
            showSnackbar('Error starting work on repair', 'error');
        }
    };

    const handleViewDetails = (repairID) => {
        router.push(`/dashboard/repairs/${repairID}`);
    };

    const handleSelectAll = () => {
        selectAllRepairs(filteredRepairs.map(r => r.repairID));
    };

    return (
        <Box sx={{ pb: 10, position: 'relative' }}>
            <Box
                sx={{
                    backgroundColor: { xs: 'transparent', sm: REPAIRS_UI.bgPanel },
                    border: { xs: 'none', sm: `1px solid ${REPAIRS_UI.border}` },
                    borderRadius: { xs: 0, sm: 3 },
                    boxShadow: { xs: 'none', sm: REPAIRS_UI.shadow },
                    p: { xs: 0.5, sm: 2.5, md: 3 },
                    mb: 3
                }}
            >
                <Box sx={{ maxWidth: 920 }}>
                    <Typography
                        sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 1,
                            px: 1.25,
                            py: 0.5,
                            mb: 1.5,
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            letterSpacing: '0.08em',
                            color: REPAIRS_UI.textPrimary,
                            backgroundColor: REPAIRS_UI.bgCard,
                            border: `1px solid ${REPAIRS_UI.border}`,
                            borderRadius: 2,
                            textTransform: 'uppercase'
                        }}
                    >
                        <BuildIcon sx={{ fontSize: 16, color: REPAIRS_UI.accent }} />
                        Work queue
                    </Typography>

                    <Typography sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 1 }}>
                        Ready for Work
                    </Typography>
                    <Typography sx={{ color: REPAIRS_UI.textSecondary, lineHeight: 1.6 }}>
                        Repairs that have all necessary parts and are ready to be worked on.
                    </Typography>
                </Box>
            </Box>

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

            <AssignJewelerModal
                open={assignJewelerModalOpen}
                onClose={closeAssignJewelerModal}
                onSave={handleSaveJewelerAssignment}
                repairID={selectedRepairID}
                selectedRepairs={selectedRepairs}
                isBulkMode={bulkSelectMode && selectedRepairs.size > 0}
            />

            <Fab
                aria-label="add new repair"
                sx={{
                    position: 'fixed',
                    bottom: 16,
                    right: 16,
                    backgroundColor: REPAIRS_UI.bgPanel,
                    color: REPAIRS_UI.textPrimary,
                    border: `1px solid ${REPAIRS_UI.border}`,
                    boxShadow: REPAIRS_UI.shadow,
                    '&:hover': { backgroundColor: REPAIRS_UI.bgCard }
                }}
                onClick={() => router.push('/dashboard/repairs/new')}
            >
                <AddIcon />
            </Fab>

            <Snackbar
                open={snackbarOpen}
                autoHideDuration={5000}
                onClose={closeSnackbar}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert
                    onClose={closeSnackbar}
                    severity={snackbarSeverity}
                    sx={{
                        backgroundColor: REPAIRS_UI.bgCard,
                        color: REPAIRS_UI.textPrimary,
                        border: `1px solid ${REPAIRS_UI.border}`
                    }}
                >
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default ReadyForWorkPage;
