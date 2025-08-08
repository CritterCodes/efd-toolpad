import { useState } from 'react';

export const useMoveRepairs = () => {
    const [location, setLocation] = useState("");
    const [repairIDs, setRepairIDs] = useState([]);
    const [currentRepairID, setCurrentRepairID] = useState("");
    const [assignedPerson, setAssignedPerson] = useState("");
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState("");
    const [snackbarSeverity, setSnackbarSeverity] = useState("info");

    const showSnackbar = (message, severity = "info") => {
        setSnackbarMessage(message);
        setSnackbarSeverity(severity);
        setSnackbarOpen(true);
    };

    const closeSnackbar = () => {
        setSnackbarOpen(false);
    };

    const addRepairID = (repairID) => {
        if (!repairIDs.includes(repairID)) {
            setRepairIDs(prev => [...prev, repairID]);
            return true;
        }
        return false;
    };

    const removeRepairID = (repairID) => {
        setRepairIDs(repairIDs.filter(id => id !== repairID));
    };

    const clearForm = () => {
        setRepairIDs([]);
        setAssignedPerson("");
        setCurrentRepairID("");
    };

    return {
        // State
        location,
        repairIDs,
        currentRepairID,
        assignedPerson,
        snackbarOpen,
        snackbarMessage,
        snackbarSeverity,
        
        // Setters
        setLocation,
        setCurrentRepairID,
        setAssignedPerson,
        
        // Actions
        showSnackbar,
        closeSnackbar,
        addRepairID,
        removeRepairID,
        clearForm
    };
};
