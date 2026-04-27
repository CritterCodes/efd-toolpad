"use client";
import React, { useEffect } from "react";
import {
    Box,
    Typography,
    Button,
    Alert,
    Snackbar
} from "@mui/material";
import { MoveUp as MoveIcon } from "@mui/icons-material";
import { useRepairs } from "@/app/context/repairs.context";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from 'next-auth/react';

import { useMoveRepairs } from "./hooks/useMoveRepairs";
import StatusSelector from "./components/StatusSelector";
import AssignedPersonField from "./components/AssignedPersonField";
import RepairInput from "./components/RepairInput";
import RepairList from "./components/RepairList";
import MoveSummary from "./components/MoveSummary";
import { REPAIR_STATUSES } from "./constants";
import { moveRepairsToStatus, updateRepairWithMetadata } from "./utils/repairUtils";
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

const MoveRepairsPage = () => {
    const { data: session, status: authStatus } = useSession();
    const { repairs, setRepairs } = useRepairs();
    const router = useRouter();
    const searchParams = useSearchParams();
    const isScanMode = searchParams.get('mode') === 'scan';

    const {
        location,
        repairIDs,
        currentRepairID,
        assignedPerson,
        snackbarOpen,
        snackbarMessage,
        snackbarSeverity,
        setLocation,
        setCurrentRepairID,
        setAssignedPerson,
        showSnackbar,
        closeSnackbar,
        addRepairID,
        removeRepairID,
        clearForm
    } = useMoveRepairs();

    useEffect(() => {
        const isAdmin = session?.user?.role === 'admin';
        const isOnsiteRepairOps = session?.user?.employment?.isOnsite === true
            && session?.user?.staffCapabilities?.repairOps === true;

        if (authStatus !== 'loading' && (!session?.user || (!isAdmin && !isOnsiteRepairOps))) {
            router.push('/dashboard');
        }
    }, [authStatus, session, router]);

    const isAdmin = session?.user?.role === 'admin';
    const isOnsiteRepairOps = session?.user?.employment?.isOnsite === true
        && session?.user?.staffCapabilities?.repairOps === true;

    if (authStatus === 'loading' || !session?.user || (!isAdmin && !isOnsiteRepairOps)) return null;

    const selectedRepairs = repairIDs
        .map((repairID) => repairs.find((repair) => repair.repairID === repairID))
        .filter(Boolean);
    const hasSelectedRepairs = selectedRepairs.length > 0;
    const allSelectedInQc = hasSelectedRepairs && selectedRepairs.every((repair) => repair.status === 'QC' || repair.benchStatus === 'QC');
    const canCompleteFromQc = isAdmin || session?.user?.staffCapabilities?.qualityControl === true;
    const genericStatusOptions = REPAIR_STATUSES.filter((status) => !['QC', 'COMPLETED'].includes(status));
    const availableStatuses = allSelectedInQc
        ? (canCompleteFromQc
            ? ['COMPLETED', 'READY FOR PICKUP', 'DELIVERY BATCHED']
            : [])
        : [...genericStatusOptions, 'QC'];

    useEffect(() => {
        if (location && !availableStatuses.includes(location)) {
            setLocation(null);
        }
    }, [availableStatuses, location, setLocation]);

    const handleLocationSelect = (event, value) => {
        setLocation(value);
    };

    const handleRepairSubmit = () => {
        const inputRepairID = currentRepairID.trim();
        const matchingRepair = repairs.find((r) =>
            r.repairID?.toLowerCase() === inputRepairID.toLowerCase()
        );

        if (matchingRepair) {
            if (addRepairID(matchingRepair.repairID)) {
                showSnackbar(`Repair ${inputRepairID} added.`, "success");
            } else {
                showSnackbar(`Repair ${inputRepairID} is already added.`, "warning");
            }
        } else {
            showSnackbar(`Repair ${inputRepairID} not found.`, "error");
        }

        setCurrentRepairID("");
    };

    const handleMoveRepairs = async () => {
        if (!location) {
            showSnackbar("Please select a destination status.", "error");
            return;
        }
        if (repairIDs.length === 0) {
            showSnackbar("No repairs selected.", "error");
            return;
        }

        try {
            const currentDateTime = new Date().toISOString();

            if (location === 'QC') {
                await Promise.all(
                    repairIDs.map((repairID) =>
                        fetch(`/api/repairs/${encodeURIComponent(repairID)}/move-to-qc`, { method: 'POST' }).then(async (res) => {
                            if (!res.ok) {
                                const data = await res.json().catch(() => ({}));
                                throw new Error(data.error || `Failed to move ${repairID} to QC`);
                            }
                            return res.json();
                        })
                    )
                );
            } else if (['COMPLETED', 'READY FOR PICKUP', 'DELIVERY BATCHED'].includes(location)) {
                await Promise.all(
                    repairIDs.map((repairID) =>
                        fetch(`/api/repairs/${encodeURIComponent(repairID)}/complete-from-qc`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                readyForPickup: location === 'READY FOR PICKUP',
                                deliveryBatched: location === 'DELIVERY BATCHED',
                            }),
                        }).then(async (res) => {
                            if (!res.ok) {
                                const data = await res.json().catch(() => ({}));
                                throw new Error(data.error || `Failed to complete ${repairID}`);
                            }
                            return res.json();
                        })
                    )
                );
            } else {
                await moveRepairsToStatus(repairIDs, location, assignedPerson, isAdmin ? 'admin' : null);
            }

            setRepairs((prevRepairs) =>
                prevRepairs.map((repair) =>
                    repairIDs.includes(repair.repairID)
                        ? updateRepairWithMetadata(repair, location, assignedPerson, currentDateTime)
                        : repair
                )
            );

            showSnackbar(`Moved ${repairIDs.length} repair${repairIDs.length !== 1 ? 's' : ''} to ${location}.`, "success");
            clearForm();
        } catch (error) {
            showSnackbar(`Error updating repairs: ${error.message}`, "error");
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
                        <MoveIcon sx={{ fontSize: 16, color: REPAIRS_UI.accent }} />
                        {isScanMode ? 'Scan & move' : 'Status transition'}
                    </Typography>

                    <Typography sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 1 }}>
                        {isScanMode ? 'Scan Ticket' : 'Move Repairs'}
                    </Typography>
                    <Typography sx={{ color: REPAIRS_UI.textSecondary, lineHeight: 1.6 }}>
                        {isScanMode
                            ? 'Use your scanner or type a repair ID, choose the destination, and move repairs from the bench in one place.'
                            : 'Scan or enter repair IDs, select the destination status, and confirm to move them in bulk.'}
                    </Typography>
                </Box>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Available statuses depend on the current selected repairs and capability context. */}
                <StatusSelector value={location} onChange={handleLocationSelect} options={availableStatuses} />
                {allSelectedInQc && !canCompleteFromQc && (
                    <Alert severity="warning">
                        Only QC-capable users can move repairs out of QC.
                    </Alert>
                )}
                <AssignedPersonField status={location} value={assignedPerson} onChange={setAssignedPerson} />
                <RepairInput value={currentRepairID} onChange={setCurrentRepairID} onSubmit={handleRepairSubmit} />

                <Box>
                    <Typography variant="overline" sx={{ color: REPAIRS_UI.textSecondary, fontWeight: 700, display: 'block', mb: 1.5, letterSpacing: '0.08em' }}>
                        Repairs to Move ({repairIDs.length})
                    </Typography>
                    <RepairList repairIDs={repairIDs} repairs={repairs} onRemoveRepair={removeRepairID} />
                </Box>

                <MoveSummary repairCount={repairIDs.length} status={location} />

                <Button
                    variant="outlined"
                    fullWidth
                    size="large"
                    onClick={handleMoveRepairs}
                    disabled={!location || repairIDs.length === 0}
                    sx={{
                        py: 1.5,
                        fontWeight: 700,
                        fontSize: '1rem',
                        color: REPAIRS_UI.accent,
                        borderColor: REPAIRS_UI.accent,
                        backgroundColor: REPAIRS_UI.bgCard,
                        '&:hover': { backgroundColor: REPAIRS_UI.bgTertiary },
                        '&.Mui-disabled': { color: REPAIRS_UI.textMuted, borderColor: REPAIRS_UI.border }
                    }}
                >
                    {!location && repairIDs.length === 0
                        ? "Select Status & Add Repairs"
                        : !location
                        ? "Select Destination Status"
                        : repairIDs.length === 0
                        ? "Add Repairs to Move"
                        : `Move ${repairIDs.length} Repair${repairIDs.length !== 1 ? 's' : ''} to ${location}`
                    }
                </Button>
            </Box>

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

export default MoveRepairsPage;
