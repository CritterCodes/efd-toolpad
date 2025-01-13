"use client";
import React, { useState, useRef } from 'react';
import { Box, Typography, TextField, Button, List, ListItem, ListItemText, IconButton, Snackbar, Autocomplete } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useRepairs } from '@/app/context/repairs.context';
import RepairService from '@/services/repairs';
import RepairsService from '@/services/repairs';

const statuses = [
    "RECEIVING",
    "NEEDS PARTS",
    "PARTS ORDERED",
    "READY FOR WORK",
    "IN THE OVEN",
    "QUALITY CONTROL",
    "READY FOR PICK-UP",
    "COMPLETED"
];

const MoveRepairsPage = () => {
    const { repairs, setRepairs } = useRepairs();
    const [location, setLocation] = useState('');
    const [repairIDs, setRepairIDs] = useState([]);
    const [currentRepairID, setCurrentRepairID] = useState('');
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('info');

    // ✅ Refs for Barcode Scanner Handling
    const locationInputRef = useRef(null);
    const repairInputRef = useRef(null);

    // ✅ Handle Location Selection (Auto-suggest)
    const handleLocationSelect = (event, value) => {
        setLocation(value);
        setTimeout(() => repairInputRef.current.focus(), 100); // Move focus to repair input
    };

    // ✅ Handle Repair Scanning
    const handleRepairScan = (event) => {
        const scannedRepairID = event.target.value;
        setCurrentRepairID(scannedRepairID);
        const matchingRepair = repairs.find(r => r.repairID === scannedRepairID);

        if (matchingRepair && !repairIDs.includes(matchingRepair.repairID)) {
            setRepairIDs([...repairIDs, matchingRepair.repairID]);
            setSnackbarMessage(`✅ Repair ${scannedRepairID} added.`);
            setSnackbarSeverity('success');
        } else {
            setSnackbarMessage(`❌ Repair not found or already added.`);
            setSnackbarSeverity('error');
        }
        setSnackbarOpen(true);
        setCurrentRepairID('');
        setTimeout(() => repairInputRef.current.focus(), 100); // Keep cursor in the repair input
    };

    // ✅ Remove Repair from the List
    const handleRemoveRepair = (repairID) => {
        setRepairIDs(repairIDs.filter(id => id !== repairID));
    };

    // ✅ Move Repairs to New Location and Update Database
    const handleMoveRepairs = async () => {
        if (!location) {
            setSnackbarMessage('❌ Please scan a location.');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
            return;
        }
    
        if (repairIDs.length === 0) {
            setSnackbarMessage('❌ No repairs selected.');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
            return;
        }
    
        try {
            // ✅ Proper axios call handling
            const response = await RepairsService.moveRepairStatus(repairIDs, location);
    
            // ✅ Assuming the request was successful if no error is thrown
            setRepairs((prevRepairs) =>
                prevRepairs.map(repair =>
                    repairIDs.includes(repair.repairID)
                        ? { ...repair, status: location }
                        : repair
                )
            );
    
            setSnackbarMessage(`✅ Moved ${repairIDs.length} repairs to ${location}.`);
            setSnackbarSeverity('success');
            setRepairIDs([]);
        } catch (error) {
            setSnackbarMessage(`❌ Error updating repairs: ${error.response?.data?.error || error.message}`);
            setSnackbarSeverity('error');
        } finally {
            setSnackbarOpen(true);
        }
    };
    

    return (
        <Box sx={{ padding: '20px' }}>
            <Typography variant="h4" sx={{ mb: 2 }}>Move Repairs</Typography>

            {/* ✅ Auto-suggest for Location with AutoComplete */}
            <Autocomplete
                options={statuses}
                value={location}
                onChange={handleLocationSelect}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        inputRef={locationInputRef}
                        label="Scan or Select Location"
                        fullWidth
                        sx={{ mb: 3 }}
                    />
                )}
            />

            {/* ✅ Repair Input with Barcode Scanner */}
            <TextField
                inputRef={repairInputRef}
                fullWidth
                label="Scan Repair ID"
                value={currentRepairID}
                onChange={handleRepairScan}
                sx={{ mb: 3 }}
            />

            {/* ✅ List of Scanned Repairs */}
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

            {/* ✅ Move Button */}
            <Button
                variant="contained"
                color="success"
                fullWidth
                onClick={handleMoveRepairs}
                sx={{ mt: 3 }}
            >
                Move Repairs to {location || "Selected Location"}
            </Button>

            {/* ✅ Snackbar Notifications */}
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={5000}
                onClose={() => setSnackbarOpen(false)}
                message={snackbarMessage}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                ContentProps={{
                    sx: {
                        backgroundColor:
                            snackbarSeverity === 'success' ? 'green' :
                                snackbarSeverity === 'error' ? 'red' : 'orange',
                        color: 'white',
                        fontWeight: 'bold',
                    }
                }}
            />
        </Box>
    );
};

export default MoveRepairsPage;
