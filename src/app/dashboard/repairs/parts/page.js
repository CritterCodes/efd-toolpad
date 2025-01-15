"use client";
import React, { useState } from 'react';
import {
    Box, Typography, Button, List, ListItem, ListItemText, IconButton, Snackbar, TextField,
    Divider, Grid, Paper, Menu, MenuItem as DropdownItem,
    Breadcrumbs,
    Link
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import { useRepairs } from '@/app/context/repairs.context';
import AddPartModal from '@/app/components/repairs/parts/newPart';
import RepairsService from '@/services/repairs';

const PartsPage = () => {
    const [pendingParts, setPendingParts] = useState({});
    const { repairs, setRepairs } = useRepairs();
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('info');
    const [saveSnackbarOpen, setSaveSnackbarOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [menuAnchor, setMenuAnchor] = useState(null);
    const [selectedRepairID, setSelectedRepairID] = useState('');
    const [selectedPart, setSelectedPart] = useState(null);
    const [addPartModalOpen, setAddPartModalOpen] = useState(false);

    const filteredRepairs = repairs.filter(
        (repair) =>
            (repair.status === "NEEDS PARTS" || repair.status === "PARTS ORDERED") &&
            (repair.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                repair.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleMenuOpen = (event, repairID) => {
        setMenuAnchor(event.currentTarget);
        setSelectedRepairID(repairID);
    };

    const handleMenuClose = () => {
        setMenuAnchor(null);
    };

    const openAddPartModal = (part = null) => {
        setSelectedPart(part);
        setAddPartModalOpen(true);
        handleMenuClose();
    };

    const markAsReadyForWork = async () => {
        try {
            const response = await RepairsService.moveRepairStatus([selectedRepairID], "READY FOR WORK");

            if (!response.ok) throw new Error('Failed to update repair status');
            setRepairs(prevRepairs =>
                prevRepairs.map(repair =>
                    repair.repairID === selectedRepairID ? { ...repair, status: "READY FOR WORK" } : repair
                )
            );
            setSnackbarMessage(`✅ Repair ${selectedRepairID} marked as Ready for Work!`);
            setSnackbarSeverity('success');
        } catch (error) {
            setSnackbarMessage('❌ Error updating repair status.');
            setSnackbarSeverity('error');
        }
        setSnackbarOpen(true);
        handleMenuClose();
    };

    const markPartsOrdered = async () => {
        try {
            const response = await RepairsService.moveRepairStatus([selectedRepairID], "PARTS ORDERED");

            if (!response.ok) throw new Error('Failed to update repair status');
            setRepairs(prevRepairs =>
                prevRepairs.map(repair =>
                    repair.repairID === selectedRepairID ? { ...repair, status: "PARTS ORDERED" } : repair
                )
            );
            setSnackbarMessage(`✅ Repair ${selectedRepairID} marked as Parts Ordered!`);
            setSnackbarSeverity('success');
        } catch (error) {
            setSnackbarMessage('❌ Error marking parts ordered.');
            setSnackbarSeverity('error');
        }
        setSnackbarOpen(true);
        handleMenuClose();
    };

    const handleAddPartSave = (repairID, partData) => {
        setPendingParts((prevParts) => {
            const updatedParts = prevParts[repairID] ? [...prevParts[repairID]] : [];
            const existingPartIndex = updatedParts.findIndex(part => part.sku === partData.sku);
    
            if (existingPartIndex !== -1) {
                // If the part exists, increase its quantity
                updatedParts[existingPartIndex].quantity += partData.quantity;
            } else {
                // Otherwise, add it as a new part
                updatedParts.push(partData);
            }
    
            return { ...prevParts, [repairID]: updatedParts };
        });
        setSnackbarMessage(`✅ Part added/updated locally for repair ${repairID}`);
        setSnackbarSeverity('info');
        setSaveSnackbarOpen(true);
    };
    



    const handleSaveChanges = async () => {
        try {
            console.log("🛠️ Saving Changes. Current pending parts:", pendingParts);
    
            for (const repairID in pendingParts) {
                console.log(`📦 Sending request for repairID: ${repairID}`);
                console.log(`📦 Payload:`, JSON.stringify({ repairID, part: pendingParts[repairID] }, null, 2));
    
                const response = await RepairsService.addPart(repairID, pendingParts[repairID]);
    
                console.log(`✅ Response from server for repairID ${repairID}:`, response);
            }
    
            setRepairs((prevRepairs) =>
                prevRepairs.map(repair =>
                    pendingParts[repair.repairID]
                        ? {
                            ...repair,
                            parts: [
                                ...new Map([...repair.parts, ...pendingParts[repair.repairID]]
                                    .map(p => [p.sku, p])).values()
                            ]
                        }
                        : repair
                )
            );
    
            setPendingParts({});
            setSnackbarMessage("✅ Changes have been successfully saved!");
            setSnackbarSeverity('success');
        } catch (error) {
            console.error("❌ Error details:", error);
            setSnackbarMessage(`❌ Error saving parts to the database: ${error.response?.data?.error || error.message}`);
            setSnackbarSeverity('error');
        }
        setSnackbarOpen(true);
        setSaveSnackbarOpen(false);
    };
    


    return (
        <Box sx={{ padding: '20px' }}>
        {/* ✅ Breadcrumbs for Navigation */}
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
            <Link underline="hover" color="inherit" onClick={() => router.push('/dashboard')} sx={{ cursor: 'pointer' }}>
                Dashboard
            </Link>
            <Link underline="hover" color="inherit" onClick={() => router.push('/dashboard/repairs')} sx={{ cursor: 'pointer' }}>
                Repairs
            </Link>
            <Typography color="text.primary">Parts</Typography>
        </Breadcrumbs>
            <Typography variant="h4" sx={{ mb: 2, fontWeight: 'bold' }}>Parts Management</Typography>

            <TextField
                fullWidth
                variant="outlined"
                label="Search Repairs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                    startAdornment: <SearchIcon sx={{ mr: 1 }} />,
                }}
                sx={{ mb: 3 }}
            />

            {filteredRepairs.length === 0 ? (
                <Typography>No repairs currently needing parts or parts ordered.</Typography>
            ) : (
                <Grid container spacing={3}>
                    {filteredRepairs.map((repair) => (
                        <Grid item xs={12} md={6} key={repair.repairID}>
                            <Paper elevation={3} sx={{ padding: '20px', borderRadius: '12px' }}>
                                <Box sx={{ display: 'flex', gap: 2 }}>
                                    {repair.picture && (
                                        <Box
                                            sx={{
                                                flex: 1,
                                                maxWidth: '150px',
                                                height: '150px',
                                                borderRadius: '12px',
                                                overflow: 'hidden',
                                            }}
                                        >
                                            <img
                                                src={repair.picture}
                                                alt="Repair Image"
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'cover'
                                                }}
                                            />
                                        </Box>
                                    )}

                                    <Box sx={{ flex: 2 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Typography variant="h6" fontWeight="600">{repair.clientName}</Typography>
                                            <IconButton onClick={(event) => handleMenuOpen(event, repair.repairID)}>
                                                <MoreVertIcon />
                                            </IconButton>
                                        </Box>
                                        <Typography variant="body2">Due: {repair.promiseDate || 'N/A'}</Typography>
                                        <Typography variant="body2"><strong>Description:</strong> {repair.description}</Typography>

                                        <Typography variant="body2" sx={{ mt: 2 }}><strong>Parts Needed:</strong></Typography>
                                        <List>
                                            {repair && [...new Map(
                                                [...(pendingParts[repair.repairID] || []), ...(repair.parts || [])]
                                                    .map(part => [part.sku, part]) // Ensures unique parts by SKU
                                            ).values()].map((part, index) => (
                                                <ListItem key={index}>
                                                    <ListItemText primary={`${part.partName} - Qty: ${part.quantity}`} />
                                                    <IconButton onClick={() => openAddPartModal(part)}>
                                                        <EditIcon />
                                                    </IconButton>
                                                </ListItem>
                                            ))}
                                        </List>

                                    </Box>
                                </Box>

                                <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleMenuClose}>
                                    <DropdownItem onClick={() => openAddPartModal(null)}>Add Part</DropdownItem>
                                    <DropdownItem onClick={markPartsOrdered}>Mark Parts Ordered</DropdownItem>
                                    <DropdownItem onClick={markAsReadyForWork}>Mark Ready for Work</DropdownItem>
                                </Menu>
                            </Paper>
                        </Grid>
                    ))}
                </Grid>
            )}

            <Snackbar open={saveSnackbarOpen} message="Changes have been made. Please save to confirm."
                action={<Button onClick={handleSaveChanges} color="primary">Save Changes</Button>} />

            <AddPartModal open={addPartModalOpen} onClose={() => setAddPartModalOpen(false)} onSave={handleAddPartSave}
                repairID={selectedRepairID} initialPart={selectedPart} />
        </Box>
    );
};

export default PartsPage;