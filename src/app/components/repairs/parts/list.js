"use client";
import React, { useState } from 'react';
import {
    Modal, Box, Typography, List, ListItem, ListItemText,
    IconButton, Button, Divider
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import AddPartModal from './newPart';

const PartsListModal = ({ repair, pendingParts, onClose, onSavePart }) => {
    const [addPartModalOpen, setAddPartModalOpen] = useState(false);
    const [selectedPart, setSelectedPart] = useState(null);

    // ✅ Combine parts from pending and existing, merging quantities for duplicates
    const combinedParts = [
        ...(pendingParts[repair.repairID] || []),
        ...(repair.parts || [])
    ].reduce((acc, part) => {
        const existingIndex = acc.findIndex(p => p.sku === part.sku);
        if (existingIndex !== -1) {
            acc[existingIndex].quantity += part.quantity;
        } else {
            acc.push(part);
        }
        return acc;
    }, []);

    // ✅ Open Add Part Modal for Adding or Editing
    const handleOpenPartModal = (part = null) => {
        setSelectedPart(part);
        setAddPartModalOpen(true);
    };

    // ✅ Close Add Part Modal
    const handleClosePartModal = () => {
        setSelectedPart(null);
        setAddPartModalOpen(false);
    };

    return (
        <Modal open={true} onClose={onClose} aria-labelledby="parts-list-modal">
            <Box sx={{ padding: 4, backgroundColor: 'white', borderRadius: '8px', margin: 'auto', maxWidth: '500px', mt: '10%' }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Parts for {repair.clientName}</Typography>
                <Divider sx={{ mb: 2 }} />

                {/* ✅ Parts List with All Information */}
                <List>
                    {combinedParts.map((part, index) => (
                        <ListItem key={index} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <ListItemText
                                primary={`${part.partName} (SKU: ${part.sku})`}
                                secondary={`Qty: ${part.quantity} | Price: $${part.price.toFixed(2)} | Cost: $${part.cost.toFixed(2)}`}
                            />
                            <IconButton onClick={() => handleOpenPartModal(part)}>
                                <EditIcon />
                            </IconButton>
                        </ListItem>
                    ))}
                </List>

                {/* ✅ Add Part Button */}
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenPartModal(null)}
                    sx={{ mt: 2 }}
                >
                    Add Part
                </Button>

                {/* ✅ Close Button */}
                <Button
                    variant="outlined"
                    onClick={onClose}
                    sx={{ mt: 2, ml: 2 }}
                >
                    Close
                </Button>

                {/* ✅ Add Part Modal Integration */}
                <AddPartModal
                    open={addPartModalOpen}
                    onClose={handleClosePartModal}
                    onSave={onSavePart}
                    repairID={repair.repairID}
                    initialPart={selectedPart}
                />
            </Box>
        </Modal>
    );
};

export default PartsListModal;
