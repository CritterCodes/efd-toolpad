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
import { useRouter } from "next/navigation";
import { useSession } from 'next-auth/react';

import { useMoveRepairs } from "./hooks/useMoveRepairs";
import StatusSelector from "./components/StatusSelector";
import AssignedPersonField from "./components/AssignedPersonField";
import RepairInput from "./components/RepairInput";
import RepairList from "./components/RepairList";
import MoveSummary from "./components/MoveSummary";
import { moveRepairsToStatus, updateRepairWithMetadata } from "./utils/repairUtils";
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

const MoveRepairsPage = () => {
    const { data: session, status: authStatus } = useSession();
    const { repairs, setRepairs } = useRepairs();
    const router = useRouter();

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
        if (authStatus !== 'loading' && (!session?.user || session.user.role !== 'admin')) {
            router.push('/dashboard');
        }
    }, [authStatus, session, router]);

    if (authStatus === 'loading' || !session?.user || session.user.role !== 'admin') return null;

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
            await moveRepairsToStatus(repairIDs, location, assignedPerson);
            const currentDateTime = new Date().toISOString();

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
                        Status transition
                    </Typography>

                    <Typography sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 1 }}>
                        Move Repairs
                    </Typography>
                    <Typography sx={{ color: REPAIRS_UI.textSecondary, lineHeight: 1.6 }}>
                        Scan or enter repair IDs, select the destination status, and confirm to move them in bulk.
                    </Typography>
                </Box>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <StatusSelector value={location} onChange={handleLocationSelect} />
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
