"use client";
import React, { useRef, useState } from 'react';
import { Box, Typography, Menu, MenuItem, IconButton } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import PrintIcon from '@mui/icons-material/Print';
import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useReactToPrint } from 'react-to-print';
import PrintRepairTicket from '@/app/components/printRepairTicket.component';

const RepairHeader = ({ repair, onSave, onDelete, hasChanges }) => {
    const printRef = useRef(null);
    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);

    const handlePrint = useReactToPrint({
        content: () => printRef.current,
        documentTitle: `Repair Ticket - ${repair.clientName}`,
    });

    const handleMenuOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleMenuSelect = (action) => {
        if (action === 'save' && hasChanges) onSave();
        if (action === 'print') handlePrint();
        if (action === 'delete') onDelete();
        handleMenuClose();
    };

    return (
        <>
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 3
                }}
            >
                <Typography variant="h6" component="div" sx={{ fontSize: { xs: '1.2rem', md: '1.5rem' } }}>
                    {repair.clientName} | Due: {repair.promiseDate || 'N/A'}
                </Typography>

                {/* ✅ Mobile-Friendly Dropdown for Actions */}
                <IconButton
                    aria-label="more"
                    aria-controls="action-menu"
                    aria-haspopup="true"
                    onClick={handleMenuOpen}
                >
                    <MoreVertIcon />
                </IconButton>

                <Menu
                    id="action-menu"
                    anchorEl={anchorEl}
                    open={open}
                    onClose={handleMenuClose}
                    anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'right',
                    }}
                    transformOrigin={{
                        vertical: 'top',
                        horizontal: 'right',
                    }}
                >
                    <MenuItem
                        onClick={() => handleMenuSelect('save')}
                        disabled={!hasChanges}
                    >
                        <SaveIcon sx={{ mr: 1 }} /> Save
                    </MenuItem>
                    <MenuItem onClick={() => handleMenuSelect('print')}>
                        <PrintIcon sx={{ mr: 1 }} /> Print
                    </MenuItem>
                    <MenuItem onClick={() => handleMenuSelect('delete')}>
                        <DeleteIcon sx={{ mr: 1 }} /> Delete
                    </MenuItem>
                </Menu>
            </Box>

            {/* ✅ Hidden Print Component */}
            <div style={{ display: 'none' }}>
                <PrintRepairTicket repair={repair} ref={printRef} />
            </div>
        </>
    );
};

export default RepairHeader;
