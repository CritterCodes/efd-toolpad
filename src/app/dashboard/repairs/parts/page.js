"use client";
import React, { useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
    Alert,
    Snackbar
} from '@mui/material';
import { Inventory2 as PartsIcon } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useRepairs } from '@/app/context/repairs.context';

import { usePartsManagement } from './hooks/usePartsManagement';
import PartsStatusTabs from './components/PartsStatusTabs';
import PartsSearchBar from './components/PartsSearchBar';
import RepairsList from './components/RepairsList';
import AddMaterialModal from './components/AddMaterialModal';
import { updateRepairStatus, savePendingMaterials, filterRepairsByStatus } from './utils/partsUtils';
import { PARTS_STATUSES } from './constants';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

const PartsPage = () => {
    const { data: session, status: authStatus } = useSession();
    const { repairs, setRepairs } = useRepairs();
    const router = useRouter();

    const {
        activeTab,
        searchQuery,
        pendingParts,
        selectedRepairID,
        addMaterialModalOpen,
        selectedMaterial,
        snackbarOpen,
        snackbarMessage,
        snackbarSeverity,
        saveSnackbarOpen,
        hasPendingChanges,
        setActiveTab,
        setSearchQuery,
        showSnackbar,
        hideSaveSnackbar,
        openAddMaterialModal,
        closeAddMaterialModal,
        addPendingMaterial,
        clearPendingParts,
        setSnackbarOpen
    } = usePartsManagement();

    useEffect(() => {
        const isAdmin = session?.user?.role === 'admin';
        const isOnsiteParts = session?.user?.employment?.isOnsite === true
            && session?.user?.staffCapabilities?.repairOps === true
            && session?.user?.staffCapabilities?.parts === true;

        if (authStatus !== 'loading' && (!session?.user || (!isAdmin && !isOnsiteParts))) {
            router.push('/dashboard');
        }
    }, [authStatus, session, router]);

    const isAdmin = session?.user?.role === 'admin';
    const isOnsiteParts = session?.user?.employment?.isOnsite === true
        && session?.user?.staffCapabilities?.repairOps === true
        && session?.user?.staffCapabilities?.parts === true;

    if (authStatus === 'loading' || !session?.user || (!isAdmin && !isOnsiteParts)) return null;

    const filteredRepairs = filterRepairsByStatus(repairs, activeTab, searchQuery);

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    const handleMarkPartsOrdered = async (repairID) => {
        try {
            await updateRepairStatus(repairID, PARTS_STATUSES.PARTS_ORDERED);
            setRepairs(prevRepairs =>
                prevRepairs.map(repair =>
                    repair.repairID === repairID
                        ? { ...repair, status: PARTS_STATUSES.PARTS_ORDERED, partsOrderedDate: new Date().toISOString(), partsOrderedBy: "System User" }
                        : repair
                )
            );
            showSnackbar(`Repair ${repairID} marked as Parts Ordered`, 'success');
        } catch {
            showSnackbar('Error marking parts ordered.', 'error');
        }
    };

    const handleMarkReadyForWork = async (repairID) => {
        try {
            await updateRepairStatus(repairID, "READY FOR WORK");
            setRepairs(prevRepairs =>
                prevRepairs.map(repair =>
                    repair.repairID === repairID
                        ? { ...repair, status: "READY FOR WORK" }
                        : repair
                )
            );
            showSnackbar(`Repair ${repairID} marked as Ready for Work`, 'success');
        } catch {
            showSnackbar('Error updating repair status.', 'error');
        }
    };

    const handleSaveChanges = async () => {
        if (!hasPendingChanges) return;
        try {
            const results = await savePendingMaterials(pendingParts);
            const failures = results.filter(r => !r.success);

            if (failures.length === 0) {
                setRepairs((prevRepairs) =>
                    prevRepairs.map(repair =>
                        pendingParts[repair.repairID]
                            ? {
                                ...repair,
                                parts: [
                                    ...new Map([...(repair.parts || []), ...pendingParts[repair.repairID]]
                                        .map(p => [p.sku || p.id, p])).values()
                                ]
                            }
                            : repair
                    )
                );
                clearPendingParts();
                showSnackbar("All materials saved successfully!", 'success');
                hideSaveSnackbar();
            } else {
                showSnackbar(`${failures.length} materials failed to save. Please try again.`, 'error');
            }
        } catch (error) {
            showSnackbar(`Error saving materials: ${error.message}`, 'error');
        }
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
                        <PartsIcon sx={{ fontSize: 16, color: REPAIRS_UI.accent }} />
                        Inventory
                    </Typography>

                    <Typography sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 1 }}>
                        Parts Management
                    </Typography>
                    <Typography sx={{ color: REPAIRS_UI.textSecondary, lineHeight: 1.6 }}>
                        Track parts needed and ordered across active repairs.
                    </Typography>
                </Box>
            </Box>

            {hasPendingChanges && (
                <Alert
                    severity="info"
                    sx={{
                        mb: 2,
                        backgroundColor: REPAIRS_UI.bgCard,
                        color: REPAIRS_UI.textPrimary,
                        border: `1px solid ${REPAIRS_UI.border}`
                    }}
                    action={
                        <Button
                            size="small"
                            variant="outlined"
                            onClick={handleSaveChanges}
                            sx={{ color: REPAIRS_UI.accent, borderColor: REPAIRS_UI.accent }}
                        >
                            Save Changes
                        </Button>
                    }
                >
                    You have unsaved material changes.
                </Alert>
            )}

            <PartsStatusTabs activeTab={activeTab} onChange={handleTabChange} />

            <PartsSearchBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                placeholder={`Search ${activeTab.toLowerCase()} repairs...`}
            />

            <RepairsList
                repairs={filteredRepairs}
                pendingParts={pendingParts}
                onAddMaterial={openAddMaterialModal}
                onEditMaterial={openAddMaterialModal}
                onMarkPartsOrdered={handleMarkPartsOrdered}
                onMarkReadyForWork={handleMarkReadyForWork}
                emptyMessage={
                    activeTab === PARTS_STATUSES.NEEDS_PARTS
                        ? "No repairs currently need parts"
                        : "No repairs with parts ordered"
                }
            />

            <AddMaterialModal
                open={addMaterialModalOpen}
                onClose={closeAddMaterialModal}
                onSave={addPendingMaterial}
                repairID={selectedRepairID}
                initialMaterial={selectedMaterial}
            />

            <Snackbar
                open={snackbarOpen}
                autoHideDuration={5000}
                onClose={() => setSnackbarOpen(false)}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert
                    onClose={() => setSnackbarOpen(false)}
                    severity={snackbarSeverity}
                    sx={{ backgroundColor: REPAIRS_UI.bgCard, color: REPAIRS_UI.textPrimary, border: `1px solid ${REPAIRS_UI.border}` }}
                >
                    {snackbarMessage}
                </Alert>
            </Snackbar>

            <Snackbar
                open={saveSnackbarOpen}
                anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                sx={{ mb: 7 }}
            >
                <Alert
                    severity="info"
                    sx={{ backgroundColor: REPAIRS_UI.bgCard, color: REPAIRS_UI.textPrimary, border: `1px solid ${REPAIRS_UI.border}` }}
                    action={
                        <Button onClick={handleSaveChanges} size="small" sx={{ color: REPAIRS_UI.accent }}>
                            Save
                        </Button>
                    }
                >
                    You have unsaved changes.
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default PartsPage;
