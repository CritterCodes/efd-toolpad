"use client";
import React, { useState, useRef, useEffect } from "react";
import { Box, Typography, TextField, Button, List, ListItem, ListItemText, IconButton, Snackbar, Autocomplete, Breadcrumbs, Link } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { useRepairs } from "@/app/context/repairs.context";
import RepairsService from "@/services/repairs";
import { useRouter } from "next/navigation";

const statuses = [
    "RECEIVING",
    "NEEDS PARTS",
    "PARTS ORDERED",
    "READY FOR WORK",
    "IN PROGRESS",
    "QUALITY CONTROL",
    "READY FOR PICK-UP",
    "COMPLETED"
];

const MoveRepairsPage = () => {
    const { repairs, setRepairs } = useRepairs();
    const [location, setLocation] = useState("");
    const [repairIDs, setRepairIDs] = useState([]);
    const [currentRepairID, setCurrentRepairID] = useState("");
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState("");
    const [snackbarSeverity, setSnackbarSeverity] = useState("info");
    const router = useRouter();

    useEffect(() => {
        console.log("Repairs in context:", repairs);
    }, [repairs]);

    const handleLocationSelect = (event, value) => {
        console.log("Selected Location:", value);
        setLocation(value);
    };

    const handleRepairInputChange = (event) => {
        setCurrentRepairID(event.target.value.trim());
    };

    const handleRepairSubmit = () => {
        const matchingRepair = repairs.find((r) => r.repairID === currentRepairID.toLowerCase());
        console.log("Scanned Repair ID:", currentRepairID);
        console.log("Matching Repair:", matchingRepair);

        if (matchingRepair) {
            if (!repairIDs.includes(matchingRepair.repairID)) {
                setRepairIDs((prev) => [...prev, matchingRepair.repairID]);
                setSnackbarMessage(`✅ Repair ${currentRepairID} added.`);
                setSnackbarSeverity("success");
            } else {
                setSnackbarMessage(`⚠️ Repair ${currentRepairID} is already added.`);
                setSnackbarSeverity("warning");
            }
        } else {
            setSnackbarMessage(`❌ Repair ${currentRepairID} not found.`);
            setSnackbarSeverity("error");
        }

        setSnackbarOpen(true);
        setCurrentRepairID("");
    };

    const handleKeyPress = (event) => {
        if (event.key === "Enter") {
            handleRepairSubmit();
        }
    };

    const handleRemoveRepair = (repairID) => {
        console.log("Removing Repair ID:", repairID);
        setRepairIDs(repairIDs.filter((id) => id !== repairID));
    };

    const handleMoveRepairs = async () => {
        console.log("Initiating Move Repairs Process...");
        console.log("Location:", location);
        console.log("Repair IDs to Move:", repairIDs);

        if (!location) {
            setSnackbarMessage("❌ Please select a location.");
            setSnackbarSeverity("error");
            setSnackbarOpen(true);
            return;
        }

        if (repairIDs.length === 0) {
            setSnackbarMessage("❌ No repairs selected.");
            setSnackbarSeverity("error");
            setSnackbarOpen(true);
            return;
        }

        try {
            const payload = repairIDs.map((repairID) => ({
                repairID,
                status: location,
                ...(location === "COMPLETED" && { completedAt: new Date().toISOString() }),
            }));

            console.log("Payload for Move Repairs:", payload);

            const response = await RepairsService.moveRepairStatus(payload);
            console.log("API Response:", response);

            setRepairs((prevRepairs) =>
                prevRepairs.map((repair) =>
                    repairIDs.includes(repair.repairID)
                        ? {
                              ...repair,
                              status: location,
                              ...(location === "COMPLETED" && { completedAt: new Date().toISOString() }),
                          }
                        : repair
                )
            );

            setSnackbarMessage(`✅ Moved ${repairIDs.length} repairs to ${location}.`);
            setSnackbarSeverity("success");
            setRepairIDs([]);
        } catch (error) {
            console.error("Error Moving Repairs:", error);
            setSnackbarMessage(`❌ Error updating repairs: ${error.message}`);
            setSnackbarSeverity("error");
        } finally {
            setSnackbarOpen(true);
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

            {/* Auto-suggest for Location */}
            <Autocomplete
                options={statuses}
                value={location}
                onChange={handleLocationSelect}
                renderInput={(params) => (
                    <TextField {...params} label="Scan or Select Location" fullWidth sx={{ mb: 3 }} />
                )}
            />

            {/* Repair Input */}
            <TextField
                fullWidth
                label="Scan or Enter Repair ID"
                value={currentRepairID}
                onChange={handleRepairInputChange}
                onKeyPress={handleKeyPress}
                sx={{ mb: 3 }}
            />

            {/* List of Scanned Repairs */}
            <List>
                {repairIDs.map((repairID, index) => (
                    <ListItem
                        key={index}
                        secondaryAction={
                            <IconButton edge="end" onClick={() => handleRemoveRepair(repairID)} color="error">
                                <DeleteIcon />
                            </IconButton>
                        }
                    >
                        <ListItemText primary={`Repair ID: ${repairID}`} />
                    </ListItem>
                ))}
            </List>

            {/* Move Button */}
            <Button
                variant="contained"
                color="success"
                fullWidth
                onClick={handleMoveRepairs}
                sx={{ mt: 3 }}
            >
                Move Repairs to {location || "Selected Location"}
            </Button>

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
        </Box>
    );
};

export default MoveRepairsPage;
