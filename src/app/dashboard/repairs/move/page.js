"use client";
import React, { useEffect } from "react";
import {
    Box,
    Typography,
    Button,
    Alert,
    Snackbar,
    TextField,
    MenuItem,
    Divider
} from "@mui/material";
import { MoveUp as MoveIcon, QrCodeScanner as ScanIcon, Bolt as BoltIcon } from "@mui/icons-material";
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
import ContinuousBarcodeScanner from '@/components/repairs/ContinuousBarcodeScanner';
import { BENCH_QUEUE, QC_COMPLETION_STATUSES, REPAIR_STATUS, normalizeRepairWorkflow } from '@/services/repairWorkflow';

const MoveRepairsPage = () => {
    const { data: session, status: authStatus } = useSession();
    const { repairs, setRepairs } = useRepairs();
    const router = useRouter();
    const searchParams = useSearchParams();
    const isScanMode = searchParams.get('mode') === 'scan';
    const [cameraScannerOpen, setCameraScannerOpen] = React.useState(false);
    const [jewelers, setJewelers] = React.useState([]);
    const [quickJewelerID, setQuickJewelerID] = React.useState('');
    const [quickCompleteLoading, setQuickCompleteLoading] = React.useState(false);

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

    useEffect(() => {
        if (authStatus !== 'authenticated') return;

        let cancelled = false;
        fetch('/api/repairs/bench-jewelers')
            .then(async (res) => {
                if (!res.ok) return [];
                return await res.json();
            })
            .then((data) => {
                if (!cancelled) setJewelers(Array.isArray(data) ? data : []);
            })
            .catch(() => {
                if (!cancelled) setJewelers([]);
            });

        return () => {
            cancelled = true;
        };
    }, [authStatus]);

    const selectedRepairs = repairIDs
        .map((repairID) => repairs.find((repair) => repair.repairID === repairID))
        .filter(Boolean)
        .map(normalizeRepairWorkflow);
    const isAdmin = session?.user?.role === 'admin';
    const isOnsiteRepairOps = session?.user?.employment?.isOnsite === true
        && session?.user?.staffCapabilities?.repairOps === true;
    const hasSelectedRepairs = selectedRepairs.length > 0;
    const allSelectedInQc = hasSelectedRepairs && selectedRepairs.every((repair) => repair.benchQueue === BENCH_QUEUE.QC);
    const canCompleteFromQc = isAdmin || session?.user?.staffCapabilities?.qualityControl === true;
    const availableStatuses = React.useMemo(() => {
        const genericStatusOptions = REPAIR_STATUSES.filter((status) => ![REPAIR_STATUS.QC, REPAIR_STATUS.COMPLETED].includes(status));
        return allSelectedInQc
            ? (canCompleteFromQc
                ? QC_COMPLETION_STATUSES
                : [])
            : [...genericStatusOptions, REPAIR_STATUS.QC];
    }, [allSelectedInQc, canCompleteFromQc]);

    useEffect(() => {
        if (location && !availableStatuses.includes(location)) {
            setLocation(null);
        }
    }, [availableStatuses, location, setLocation]);

    if (authStatus === 'loading' || !session?.user || (!isAdmin && !isOnsiteRepairOps)) return null;

    const handleLocationSelect = (event, value) => {
        setLocation(value);
    };

    const queueRepairID = (inputRepairID) => {
        const cleanRepairID = String(inputRepairID || '').trim();
        if (!cleanRepairID) return;

        const matchingRepair = repairs.find((r) =>
            r.repairID?.toLowerCase() === cleanRepairID.toLowerCase()
        );

        if (matchingRepair) {
            if (addRepairID(matchingRepair.repairID)) {
                showSnackbar(`Repair ${matchingRepair.repairID} added.`, "success");
            } else {
                showSnackbar(`Repair ${matchingRepair.repairID} is already added.`, "warning");
            }
        } else {
            showSnackbar(`Repair ${cleanRepairID} not found.`, "error");
        }
    };

    const handleRepairSubmit = () => {
        queueRepairID(currentRepairID);

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

            if (location === REPAIR_STATUS.QC) {
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
            } else if (QC_COMPLETION_STATUSES.includes(location)) {
                await Promise.all(
                    repairIDs.map((repairID) =>
                        fetch(`/api/repairs/${encodeURIComponent(repairID)}/complete-from-qc`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                readyForPickup: location === REPAIR_STATUS.READY_FOR_PICKUP,
                                deliveryBatched: location === REPAIR_STATUS.DELIVERY_BATCHED,
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

    const getJewelerLabel = (jeweler) => (
        [jeweler.firstName, jeweler.lastName].filter(Boolean).join(' ').trim()
        || jeweler.name
        || jeweler.email
        || jeweler.userID
    );

    const handleQuickComplete = async () => {
        if (repairIDs.length === 0) {
            showSnackbar("No repairs selected.", "error");
            return;
        }
        if (!quickJewelerID) {
            showSnackbar("Choose the jeweler who did the work.", "error");
            return;
        }

        setQuickCompleteLoading(true);
        try {
            const results = await Promise.all(
                repairIDs.map(async (repairID) => {
                    const res = await fetch(`/api/repairs/${encodeURIComponent(repairID)}/quick-complete`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userID: quickJewelerID }),
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) throw new Error(data.error || `Failed to fast-complete ${repairID}`);
                    return data;
                })
            );

            const updatedByID = new Map(results.map((repair) => [repair.repairID, normalizeRepairWorkflow(repair)]));
            setRepairs((prevRepairs) =>
                prevRepairs.map((repair) => updatedByID.get(repair.repairID) || repair)
            );

            showSnackbar(`Fast-completed ${results.length} repair${results.length !== 1 ? 's' : ''} to Payment & Pickup.`, "success");
            clearForm();
        } catch (error) {
            showSnackbar(`Error fast-completing repairs: ${error.message}`, "error");
        } finally {
            setQuickCompleteLoading(false);
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
                <Box
                    sx={{
                        bgcolor: REPAIRS_UI.bgPanel,
                        border: `1px solid ${REPAIRS_UI.border}`,
                        borderRadius: 2,
                        p: 2,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1.5
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <BoltIcon sx={{ color: REPAIRS_UI.accent }} />
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography sx={{ color: REPAIRS_UI.textHeader, fontWeight: 700 }}>
                                While-you-wait complete
                            </Typography>
                            <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }}>
                                Assign the jeweler who did the work and send selected repairs straight to Payment & Pickup.
                            </Typography>
                        </Box>
                    </Box>
                    <Divider sx={{ borderColor: REPAIRS_UI.border }} />
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                        <TextField
                            select
                            label="Jeweler who did the work"
                            value={quickJewelerID}
                            onChange={(event) => setQuickJewelerID(event.target.value)}
                            disabled={jewelers.length === 0 || quickCompleteLoading}
                            sx={{
                                flex: '1 1 280px',
                                '& .MuiOutlinedInput-root': {
                                    bgcolor: REPAIRS_UI.bgCard,
                                    color: REPAIRS_UI.textPrimary,
                                },
                                '& .MuiInputLabel-root': { color: REPAIRS_UI.textMuted },
                                '& .MuiSelect-icon': { color: REPAIRS_UI.textSecondary },
                            }}
                            helperText="Required for labor/payroll attribution."
                            FormHelperTextProps={{ sx: { color: REPAIRS_UI.textMuted } }}
                        >
                            {jewelers.map((jeweler) => (
                                <MenuItem key={jeweler.userID} value={jeweler.userID}>
                                    {getJewelerLabel(jeweler)}
                                </MenuItem>
                            ))}
                        </TextField>
                        <Button
                            variant="contained"
                            startIcon={<BoltIcon />}
                            onClick={handleQuickComplete}
                            disabled={quickCompleteLoading || repairIDs.length === 0 || !quickJewelerID}
                            sx={{
                                minHeight: 56,
                                flex: { xs: '1 1 100%', sm: '0 0 auto' },
                                bgcolor: REPAIRS_UI.accent,
                                color: '#000',
                                '&:hover': { bgcolor: '#c9a227' },
                                '&.Mui-disabled': { color: REPAIRS_UI.textMuted, bgcolor: REPAIRS_UI.bgCard }
                            }}
                        >
                            {quickCompleteLoading ? 'Completing...' : `Complete ${repairIDs.length || ''}`}
                        </Button>
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    <Box sx={{ flex: '1 1 320px' }}>
                        <RepairInput value={currentRepairID} onChange={setCurrentRepairID} onSubmit={handleRepairSubmit} />
                    </Box>
                    <Button
                        variant="outlined"
                        startIcon={<ScanIcon />}
                        onClick={() => setCameraScannerOpen(true)}
                        sx={{
                            color: REPAIRS_UI.textPrimary,
                            borderColor: REPAIRS_UI.border,
                            minHeight: 56,
                            flex: { xs: '1 1 100%', sm: '0 0 auto' }
                        }}
                    >
                        Camera Scan
                    </Button>
                </Box>

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

            <ContinuousBarcodeScanner
                open={cameraScannerOpen}
                title="Scan Repairs to Move"
                queuedCount={repairIDs.length}
                actionLabel={
                    !location
                        ? 'Select destination first'
                        : repairIDs.length === 0
                        ? 'Scan repairs to move'
                        : `Move ${repairIDs.length} to ${location}`
                }
                actionDisabled={!location || repairIDs.length === 0}
                onClose={() => setCameraScannerOpen(false)}
                onScan={queueRepairID}
                onAction={handleMoveRepairs}
            >
                <MoveSummary repairCount={repairIDs.length} status={location} />
                <RepairList repairIDs={repairIDs} repairs={repairs} onRemoveRepair={removeRepairID} />
            </ContinuousBarcodeScanner>
        </Box>
    );
};

export default MoveRepairsPage;
