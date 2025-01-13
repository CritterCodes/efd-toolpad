// src/app/components/repairs/repair-card.component.js
import React, { useState } from 'react';
import { Paper, Box, Typography, IconButton, Menu, MenuItem } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PartsListModal from './list';

const RepairCard = ({ repair, pendingParts, setPendingParts }) => {
    const [menuAnchor, setMenuAnchor] = useState(null);
    const [partsModalOpen, setPartsModalOpen] = useState(false);

    const handleMenuOpen = (event) => {
        setMenuAnchor(event.currentTarget);
    };

    const handleMenuClose = () => {
        setMenuAnchor(null);
    };

    const handleOpenPartsModal = () => {
        setPartsModalOpen(true);
        handleMenuClose();
    };

    const handleClosePartsModal = () => {
        setPartsModalOpen(false);
    };

    const handleAddPart = (repairID) => {
        console.log('Add Part for:', repairID);
        // Logic for adding a part can be connected here or through a modal trigger.
    };

    return (
        <Paper elevation={3} sx={{ padding: '20px', borderRadius: '12px' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="h6">{repair.clientName}</Typography>
                <IconButton onClick={handleMenuOpen}>
                    <MoreVertIcon />
                </IconButton>
            </Box>
            <Typography variant="body2">Due: {repair.promiseDate || 'N/A'}</Typography>
            <Typography variant="body2"><strong>Description:</strong> {repair.description}</Typography>

            <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleMenuClose}>
                <MenuItem onClick={handleOpenPartsModal}>View Parts</MenuItem>
                <MenuItem>Mark as Parts Ordered</MenuItem>
                <MenuItem>Mark as Ready for Work</MenuItem>
            </Menu>

            {partsModalOpen && (
                <PartsListModal
                    repair={repair}
                    pendingParts={pendingParts}
                    onClose={handleClosePartsModal}
                    onSavePart={handleAddPart}
                />
            )}
        </Paper>
    );
};

export default RepairCard;
