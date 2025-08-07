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

// Status descriptions for better UX
const statusDescriptions = {
    "RECEIVING": "Initial intake - item just received",
    "NEEDS PARTS": "Waiting for parts to be ordered",
    "PARTS ORDERED": "Parts have been ordered, waiting for arrival",
    "READY FOR WORK": "All parts available, ready to start work",
    "IN PROGRESS": "Work is actively being performed",
    "QUALITY CONTROL": "Work completed, undergoing quality inspection",
    "READY FOR PICK-UP": "QC passed, ready for customer pickup",
    "COMPLETED": "Customer has picked up the item"
};

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
        const inputRepairID = currentRepairID.trim();
        const matchingRepair = repairs.find((r) => 
            r.repairID?.toLowerCase() === inputRepairID.toLowerCase()
        );
        console.log("Scanned Repair ID:", inputRepairID);
        console.log("Matching Repair:", matchingRepair);

        if (matchingRepair) {
            if (!repairIDs.includes(matchingRepair.repairID)) {
                setRepairIDs((prev) => [...prev, matchingRepair.repairID]);
                setSnackbarMessage(`✅ Repair ${inputRepairID} added.`);
                setSnackbarSeverity("success");
            } else {
                setSnackbarMessage(`⚠️ Repair ${inputRepairID} is already added.`);
                setSnackbarSeverity("warning");
            }
        } else {
            setSnackbarMessage(`❌ Repair ${inputRepairID} not found.`);
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
            console.log("Payload for Move Repairs - Repair IDs:", repairIDs, "Status:", location);

            const response = await RepairsService.moveRepairStatus(repairIDs, location);
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
                getOptionLabel={(option) => option}
                renderOption={(props, option) => (
                    <Box component="li" {...props}>
                        <Box>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                {option}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {statusDescriptions[option]}
                            </Typography>
                        </Box>
                    </Box>
                )}
                renderInput={(params) => (
                    <TextField 
                        {...params} 
                        label="Select Destination Status" 
                        fullWidth 
                        sx={{ mb: 3 }}
                        helperText={location ? statusDescriptions[location] : "Choose where to move the repairs"}
                    />
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
            <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                    Repairs to Move ({repairIDs.length})
                </Typography>
                <List>
                    {repairIDs.map((repairID, index) => {
                        const repair = repairs.find(r => r.repairID === repairID);
                        return (
                            <ListItem
                                key={index}
                                sx={{
                                    border: '1px solid #e0e0e0',
                                    borderRadius: '8px',
                                    mb: 1,
                                    backgroundColor: '#fafafa'
                                }}
                                secondaryAction={
                                    <IconButton edge="end" onClick={() => handleRemoveRepair(repairID)} color="error">
                                        <DeleteIcon />
                                    </IconButton>
                                }
                            >
                                <ListItemText 
                                    primary={`Repair ID: ${repairID}`}
                                    secondary={repair ? (
                                        <Box>
                                            <Typography variant="body2" color="text.secondary">
                                                Client: {repair.clientName} | Current Status: {repair.status}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {repair.description}
                                            </Typography>
                                        </Box>
                                    ) : 'Repair details not found'}
                                />
                            </ListItem>
                        );
                    })}
                    {repairIDs.length === 0 && (
                        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                            No repairs added yet. Scan or type repair IDs above.
                        </Typography>
                    )}
                </List>
            </Box>

            {/* Move Confirmation & Button */}
            {repairIDs.length > 0 && location && (
                <Box sx={{ 
                    p: 2, 
                    mb: 3, 
                    backgroundColor: '#e3f2fd', 
                    borderRadius: '8px', 
                    border: '1px solid #2196f3' 
                }}>
                    <Typography variant="h6" color="primary" sx={{ mb: 1 }}>
                        Move Summary
                    </Typography>
                    <Typography variant="body1">
                        Moving <strong>{repairIDs.length} repair{repairIDs.length !== 1 ? 's' : ''}</strong> to <strong>{location}</strong>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {statusDescriptions[location]}
                    </Typography>
                </Box>
            )}

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
