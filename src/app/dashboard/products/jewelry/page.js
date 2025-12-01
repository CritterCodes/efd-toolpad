'use client';

import React, { useState } from 'react';
import { 
    Box, 
    Typography, 
    Card, 
    CardContent, 
    Grid, 
    Button, 
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem,
    FormControl,
    InputLabel,
    Select
} from '@mui/material';
import { 
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Visibility as ViewIcon,
    Image as ImageIcon
} from '@mui/icons-material';

export default function JewelryPage() {
    const [jewelry, setJewelry] = useState([
        {
            id: 1,
            name: 'Custom Engagement Ring',
            type: 'Ring',
            material: '18K White Gold',
            status: 'In Progress',
            price: 4500,
            customer: 'Sarah Johnson',
            dueDate: '2025-11-15',
            completion: 75
        },
        {
            id: 2,
            name: 'Diamond Tennis Bracelet',
            type: 'Bracelet',
            material: '14K Yellow Gold',
            status: 'Completed',
            price: 8200,
            customer: 'Michael Chen',
            dueDate: '2025-10-20',
            completion: 100
        }
    ]);

    const [openDialog, setOpenDialog] = useState(false);
    const [selectedJewelry, setSelectedJewelry] = useState(null);

    const handleAddJewelry = () => {
        setSelectedJewelry(null);
        setOpenDialog(true);
    };

    const handleEditJewelry = (item) => {
        setSelectedJewelry(item);
        setOpenDialog(true);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Completed': return 'success';
            case 'In Progress': return 'info';
            case 'Pending': return 'warning';
            case 'On Hold': return 'default';
            default: return 'default';
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" gutterBottom>
                        Jewelry
                    </Typography>
                    <Typography variant="subtitle1" color="text.secondary">
                        Your jewelry pieces and custom creations
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleAddJewelry}
                >
                    New Project
                </Button>
            </Box>

            {/* Summary Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="text.secondary" gutterBottom>
                                Active Projects
                            </Typography>
                            <Typography variant="h4">
                                {jewelry.filter(j => j.status === 'In Progress').length}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="text.secondary" gutterBottom>
                                Completed
                            </Typography>
                            <Typography variant="h4" color="success.main">
                                {jewelry.filter(j => j.status === 'Completed').length}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="text.secondary" gutterBottom>
                                Total Value
                            </Typography>
                            <Typography variant="h4">
                                ${jewelry.reduce((sum, j) => sum + j.price, 0).toLocaleString()}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="text.secondary" gutterBottom>
                                Avg. Completion
                            </Typography>
                            <Typography variant="h4">
                                {Math.round(jewelry.reduce((sum, j) => sum + j.completion, 0) / jewelry.length)}%
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Jewelry Projects Table */}
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Project Details
                    </Typography>
                    <TableContainer component={Paper} variant="outlined">
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Project Name</TableCell>
                                    <TableCell>Type</TableCell>
                                    <TableCell>Material</TableCell>
                                    <TableCell>Customer</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Progress</TableCell>
                                    <TableCell>Due Date</TableCell>
                                    <TableCell>Price</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {jewelry.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell>{item.name}</TableCell>
                                        <TableCell>{item.type}</TableCell>
                                        <TableCell>{item.material}</TableCell>
                                        <TableCell>{item.customer}</TableCell>
                                        <TableCell>
                                            <Chip 
                                                label={item.status} 
                                                color={getStatusColor(item.status)}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell>{item.completion}%</TableCell>
                                        <TableCell>{new Date(item.dueDate).toLocaleDateString()}</TableCell>
                                        <TableCell>${item.price.toLocaleString()}</TableCell>
                                        <TableCell>
                                            <IconButton 
                                                size="small" 
                                                onClick={() => handleEditJewelry(item)}
                                            >
                                                <EditIcon />
                                            </IconButton>
                                            <IconButton size="small">
                                                <ImageIcon />
                                            </IconButton>
                                            <IconButton size="small">
                                                <ViewIcon />
                                            </IconButton>
                                            <IconButton size="small" color="error">
                                                <DeleteIcon />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>

            {/* Add/Edit Jewelry Dialog */}
            <Dialog 
                open={openDialog} 
                onClose={() => setOpenDialog(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    {selectedJewelry ? 'Edit Project' : 'New Jewelry Project'}
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Project Name"
                                defaultValue={selectedJewelry?.name || ''}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                                <InputLabel>Type</InputLabel>
                                <Select
                                    defaultValue={selectedJewelry?.type || ''}
                                    label="Type"
                                >
                                    <MenuItem value="Ring">Ring</MenuItem>
                                    <MenuItem value="Necklace">Necklace</MenuItem>
                                    <MenuItem value="Bracelet">Bracelet</MenuItem>
                                    <MenuItem value="Earrings">Earrings</MenuItem>
                                    <MenuItem value="Pendant">Pendant</MenuItem>
                                    <MenuItem value="Brooch">Brooch</MenuItem>
                                    <MenuItem value="Other">Other</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                                <InputLabel>Material</InputLabel>
                                <Select
                                    defaultValue={selectedJewelry?.material || ''}
                                    label="Material"
                                >
                                    <MenuItem value="14K Yellow Gold">14K Yellow Gold</MenuItem>
                                    <MenuItem value="14K White Gold">14K White Gold</MenuItem>
                                    <MenuItem value="18K Yellow Gold">18K Yellow Gold</MenuItem>
                                    <MenuItem value="18K White Gold">18K White Gold</MenuItem>
                                    <MenuItem value="Platinum">Platinum</MenuItem>
                                    <MenuItem value="Sterling Silver">Sterling Silver</MenuItem>
                                    <MenuItem value="Other">Other</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Customer Name"
                                defaultValue={selectedJewelry?.customer || ''}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Price ($)"
                                type="number"
                                defaultValue={selectedJewelry?.price || ''}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Due Date"
                                type="date"
                                defaultValue={selectedJewelry?.dueDate || ''}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Project Description"
                                multiline
                                rows={3}
                                placeholder="Describe the jewelry piece, customer requirements, and any special notes..."
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>
                        Cancel
                    </Button>
                    <Button variant="contained" onClick={() => setOpenDialog(false)}>
                        {selectedJewelry ? 'Update' : 'Create'} Project
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}