"use client";
import React from 'react';
import {
    Box,
    Typography,
    Button,
    Snackbar,
    Breadcrumbs,
    Link,
    Alert
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { useRepairs } from '@/app/context/repairs.context';

// Custom hooks
import { usePartsManagement } from './hooks/usePartsManagement';

// Components
import PartsStatusTabs from './components/PartsStatusTabs';
import PartsSearchBar from './components/PartsSearchBar';
import RepairsList from './components/RepairsList';
import AddMaterialModal from './components/AddMaterialModal';

// Utils and services
import { updateRepairStatus, savePendingMaterials, filterRepairsByStatus } from './utils/partsUtils';
import { PARTS_STATUSES } from './constants';

const PartsPage = () => {
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

    // Filter repairs based on active tab and search query
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
                        ? { 
                            ...repair, 
                            status: PARTS_STATUSES.PARTS_ORDERED,
                            partsOrderedDate: new Date().toISOString(),
                            partsOrderedBy: "System User"
                        }
                        : repair
                )
            );
            
            showSnackbar(`✅ Repair ${repairID} marked as Parts Ordered!`, 'success');
        } catch (error) {
            showSnackbar('❌ Error marking parts ordered.', 'error');
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
            
            showSnackbar(`✅ Repair ${repairID} marked as Ready for Work!`, 'success');
        } catch (error) {
            showSnackbar('❌ Error updating repair status.', 'error');
        }
    };

    const handleSaveChanges = async () => {
        if (!hasPendingChanges) return;

        try {
            const results = await savePendingMaterials(pendingParts);
            
            // Check if all saves were successful
            const failures = results.filter(r => !r.success);
            
            if (failures.length === 0) {
                // Update local state with saved materials
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
                showSnackbar("✅ All materials saved successfully!", 'success');
                hideSaveSnackbar();
            } else {
                showSnackbar(`❌ ${failures.length} materials failed to save. Please try again.`, 'error');
            }
        } catch (error) {
            showSnackbar(`❌ Error saving materials: ${error.message}`, 'error');
        }
    };
    


    return (
        <Box sx={{ padding: '20px' }}>
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
                <Typography color="text.primary">Parts Management</Typography>
            </Breadcrumbs>

            <Typography variant="h4" sx={{ mb: 2, fontWeight: 'bold' }}>
                Parts Management
            </Typography>

            {/* Status Tabs */}
            <PartsStatusTabs activeTab={activeTab} onChange={handleTabChange} />

            {/* Search Bar */}
            <PartsSearchBar 
                searchQuery={searchQuery} 
                onSearchChange={setSearchQuery}
                placeholder={`Search ${activeTab.toLowerCase()} repairs...`}
            />

            {/* Pending Changes Alert */}
            {hasPendingChanges && (
                <Alert 
                    severity="info" 
                    sx={{ mb: 2 }}
                    action={
                        <Button 
                            color="inherit" 
                            size="small" 
                            onClick={handleSaveChanges}
                            variant="outlined"
                        >
                            Save Changes
                        </Button>
                    }
                >
                    You have unsaved material changes. Click &quot;Save Changes&quot; to persist them.
                </Alert>
            )}

            {/* Repairs List */}
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

            {/* Add Material Modal */}
            <AddMaterialModal
                open={addMaterialModalOpen}
                onClose={closeAddMaterialModal}
                onSave={addPendingMaterial}
                repairID={selectedRepairID}
                initialMaterial={selectedMaterial}
            />

            {/* Snackbar Notifications */}
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={5000}
                onClose={() => setSnackbarOpen(false)}
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

            {/* Save Changes Snackbar */}
            <Snackbar
                open={saveSnackbarOpen}
                message="You have unsaved changes. Click &apos;Save Changes&apos; to persist them."
                action={
                    <Button 
                        onClick={handleSaveChanges} 
                        color="primary" 
                        size="small"
                    >
                        Save Changes
                    </Button>
                }
                anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                sx={{ mb: 7 }} // Offset from main snackbar
            />
        </Box>
    );
};

export default PartsPage;