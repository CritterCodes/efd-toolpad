"use client";
import React, { useEffect } from "react";
import { 
    Box, 
    Typography, 
    Button, 
    Snackbar, 
    Breadcrumbs, 
    Link 
} from "@mui/material";
import { useRepairs } from "@/app/context/repairs.context";
import { useRouter } from "next/navigation";

// Custom hook
import { useMoveRepairs } from "./hooks/useMoveRepairs";

// Components
import StatusSelector from "./components/StatusSelector";
import AssignedPersonField from "./components/AssignedPersonField";
import RepairInput from "./components/RepairInput";
import RepairList from "./components/RepairList";
import MoveSummary from "./components/MoveSummary";

// Utils
import { moveRepairsToStatus, updateRepairWithMetadata } from "./utils/repairUtils";

const MoveRepairsPage = () => {
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
        console.log("Repairs in context:", repairs);
    }, [repairs]);

    const handleLocationSelect = (event, value) => {
        console.log("Selected Location:", value);
        setLocation(value);
    };

    const handleRepairSubmit = () => {
        const inputRepairID = currentRepairID.trim();
        const matchingRepair = repairs.find((r) => 
            r.repairID?.toLowerCase() === inputRepairID.toLowerCase()
        );
        console.log("Scanned Repair ID:", inputRepairID);
        console.log("Matching Repair:", matchingRepair);

        if (matchingRepair) {
            if (addRepairID(matchingRepair.repairID)) {
                showSnackbar(`✅ Repair ${inputRepairID} added.`, "success");
            } else {
                showSnackbar(`⚠️ Repair ${inputRepairID} is already added.`, "warning");
            }
        } else {
            showSnackbar(`❌ Repair ${inputRepairID} not found.`, "error");
        }

        setCurrentRepairID("");
    };

    const handleMoveRepairs = async () => {
        console.log("Initiating Move Repairs Process...");
        console.log("Location:", location);
        console.log("Repair IDs to Move:", repairIDs);

        if (!location) {
            showSnackbar("❌ Please select a location.", "error");
            return;
        }

        if (repairIDs.length === 0) {
            showSnackbar("❌ No repairs selected.", "error");
            return;
        }

        try {
            console.log("Payload for Move Repairs - Repair IDs:", repairIDs, "Status:", location);

            const response = await moveRepairsToStatus(repairIDs, location, assignedPerson);
            console.log("API Response:", response);

            const currentDateTime = new Date().toISOString();

            // Update local state with enhanced tracking
            setRepairs((prevRepairs) =>
                prevRepairs.map((repair) =>
                    repairIDs.includes(repair.repairID)
                        ? updateRepairWithMetadata(repair, location, assignedPerson, currentDateTime)
                        : repair
                )
            );

            showSnackbar(`✅ Moved ${repairIDs.length} repairs to ${location}.`, "success");
            clearForm();
        } catch (error) {
            console.error("Error Moving Repairs:", error);
            showSnackbar(`❌ Error updating repairs: ${error.message}`, "error");
        }
    };

    return (
        <Box sx={{ padding: "20px" }}>
            {/* Breadcrumbs */}
            <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
                <Link
                    underline="hover"
                    color="inherit"
                    onClick={() => router.push("/dashboard")}
                    sx={{ cursor: "pointer" }}
                >
                    Dashboard
                </Link>
                <Link
                    underline="hover"
                    color="inherit"
                    onClick={() => router.push("/dashboard/repairs")}
                    sx={{ cursor: "pointer" }}
                >
                    Repairs
                </Link>
                <Typography color="text.primary">Move Repairs</Typography>
            </Breadcrumbs>

            <Typography variant="h4" sx={{ mb: 2 }}>
                Move Repairs
            </Typography>

            {/* Status Selector */}
            <StatusSelector
                value={location}
                onChange={handleLocationSelect}
                sx={{ mb: 3 }}
            />

            {/* Assigned Person Field */}
            <AssignedPersonField
                status={location}
                value={assignedPerson}
                onChange={setAssignedPerson}
                sx={{ mb: 3 }}
            />

            {/* Repair Input */}
            <RepairInput
                value={currentRepairID}
                onChange={setCurrentRepairID}
                onSubmit={handleRepairSubmit}
                sx={{ mb: 3 }}
            />

            {/* List of Scanned Repairs */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                    Repairs to Move ({repairIDs.length})
                </Typography>
                <RepairList
                    repairIDs={repairIDs}
                    repairs={repairs}
                    onRemoveRepair={removeRepairID}
                />
            </Box>

            {/* Move Summary */}
            <MoveSummary repairCount={repairIDs.length} status={location} />

            {/* Move Button */}
            <Button
                variant="contained"
                color="success"
                fullWidth
                size="large"
                onClick={handleMoveRepairs}
                disabled={!location || repairIDs.length === 0}
                sx={{ mt: 2, py: 1.5 }}
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

export default MoveRepairsPage;
