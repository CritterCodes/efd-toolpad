import { useState } from 'react';

export const usePartsManagement = () => {
    const [activeTab, setActiveTab] = useState("NEEDS PARTS");
    const [searchQuery, setSearchQuery] = useState('');
    const [pendingParts, setPendingParts] = useState({});
    const [selectedRepairID, setSelectedRepairID] = useState('');
    const [addMaterialModalOpen, setAddMaterialModalOpen] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState(null);
    
    // Snackbar state
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('info');
    const [saveSnackbarOpen, setSaveSnackbarOpen] = useState(false);

    const showSnackbar = (message, severity = 'info') => {
        setSnackbarMessage(message);
        setSnackbarSeverity(severity);
        setSnackbarOpen(true);
    };

    const showSaveSnackbar = () => {
        setSaveSnackbarOpen(true);
    };

    const hideSaveSnackbar = () => {
        setSaveSnackbarOpen(false);
    };

    const openAddMaterialModal = (repairID, material = null) => {
        setSelectedRepairID(repairID);
        setSelectedMaterial(material);
        setAddMaterialModalOpen(true);
    };

    const closeAddMaterialModal = () => {
        setAddMaterialModalOpen(false);
        setSelectedMaterial(null);
        setSelectedRepairID('');
    };

    const addPendingMaterial = (repairID, materialData) => {
        setPendingParts((prevParts) => {
            const updatedParts = prevParts[repairID] ? [...prevParts[repairID]] : [];
            const existingMaterialIndex = updatedParts.findIndex(part => part.sku === materialData.sku);
    
            if (existingMaterialIndex !== -1) {
                // Update existing material
                updatedParts[existingMaterialIndex] = { ...updatedParts[existingMaterialIndex], ...materialData };
            } else {
                // Add new material
                updatedParts.push(materialData);
            }
    
            showSaveSnackbar();
            return { ...prevParts, [repairID]: updatedParts };
        });
    };

    const clearPendingParts = () => {
        setPendingParts({});
    };

    const hasPendingChanges = Object.keys(pendingParts).length > 0;

    return {
        // State
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
        
        // Actions
        setActiveTab,
        setSearchQuery,
        showSnackbar,
        showSaveSnackbar,
        hideSaveSnackbar,
        openAddMaterialModal,
        closeAddMaterialModal,
        addPendingMaterial,
        clearPendingParts,
        setSnackbarOpen
    };
};
