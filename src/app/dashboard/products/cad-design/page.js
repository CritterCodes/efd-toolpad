'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
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
    Select,
    LinearProgress,
    CircularProgress,
    Alert
} from '@mui/material';
import { 
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Download as DownloadIcon,
    Preview as PreviewIcon,
    CloudUpload as UploadIcon
} from '@mui/icons-material';

export default function CADDesignPage() {
    const { data: session } = useSession();
    const [designs, setDesigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedDesign, setSelectedDesign] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        client: '',
        type: '',
        software: '',
        status: 'Draft',
        description: ''
    });

    // Fetch designs from API
    useEffect(() => {
        fetchDesigns();
    }, []);

    const fetchDesigns = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/products/cad-designs');
            if (!response.ok) {
                throw new Error('Failed to fetch CAD designs');
            }
            const data = await response.json();
            setDesigns(data.designs || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAddDesign = () => {
        setSelectedDesign(null);
        setFormData({
            name: '',
            client: '',
            type: '',
            software: '',
            status: 'Draft',
            description: ''
        });
        setOpenDialog(true);
    };

    const handleEditDesign = (design) => {
        setSelectedDesign(design);
        setFormData({
            name: design.name || '',
            client: design.client || '',
            type: design.type || '',
            software: design.software || '',
            status: design.status || 'Draft',
            description: design.description || ''
        });
        setOpenDialog(true);
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSaveDesign = async () => {
        try {
            const method = selectedDesign ? 'PUT' : 'POST';
            const url = selectedDesign 
                ? `/api/products/cad-designs/${selectedDesign._id}` 
                : '/api/products/cad-designs';
            
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                throw new Error('Failed to save design');
            }

            await fetchDesigns(); // Refresh the list
            setOpenDialog(false);
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDeleteDesign = async (designId) => {
        if (!confirm('Are you sure you want to delete this design?')) {
            return;
        }

        try {
            const response = await fetch(`/api/products/cad-designs/${designId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete design');
            }

            await fetchDesigns(); // Refresh the list
        } catch (err) {
            setError(err.message);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Approved': return 'success';
            case 'In Review': return 'info';
            case 'Draft': return 'warning';
            case 'Rejected': return 'error';
            default: return 'default';
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" gutterBottom>
                        CAD Designs
                    </Typography>
                    <Typography variant="subtitle1" color="text.secondary">
                        Your digital jewelry designs and prototypes
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleAddDesign}
                >
                    New Design
                </Button>
            </Box>

            {/* Summary Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="text.secondary" gutterBottom>
                                Active Designs
                            </Typography>
                            <Typography variant="h4">
                                {designs.filter(d => d.status !== 'Approved').length}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="text.secondary" gutterBottom>
                                Approved
                            </Typography>
                            <Typography variant="h4" color="success.main">
                                {designs.filter(d => d.status === 'Approved').length}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="text.secondary" gutterBottom>
                                Total Files
                            </Typography>
                            <Typography variant="h4">
                                {designs.length}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="text.secondary" gutterBottom>
                                Avg. Progress
                            </Typography>
                            <Typography variant="h4">
                                {Math.round(designs.reduce((sum, d) => sum + d.progress, 0) / designs.length)}%
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* CAD Designs Table */}
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Design Files
                    </Typography>
                    {designs.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                            <Typography variant="h6" color="text.secondary" gutterBottom>
                                No CAD designs yet
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Start your first design project to bring custom jewelry ideas to life.
                            </Typography>
                            <Button 
                                variant="contained" 
                                startIcon={<AddIcon />} 
                                onClick={handleAddDesign}
                            >
                                Create Your First Design
                            </Button>
                        </Box>
                    ) : (
                        <TableContainer component={Paper} variant="outlined">
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Design Name</TableCell>
                                    <TableCell>Client</TableCell>
                                    <TableCell>Type</TableCell>
                                    <TableCell>Software</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Progress</TableCell>
                                    <TableCell>Version</TableCell>
                                    <TableCell>File Size</TableCell>
                                    <TableCell>Last Modified</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {designs.map((design) => (
                                    <TableRow key={design._id || design.id}>
                                        <TableCell>{design.name}</TableCell>
                                        <TableCell>{design.client}</TableCell>
                                        <TableCell>{design.type}</TableCell>
                                        <TableCell>{design.software}</TableCell>
                                        <TableCell>
                                            <Chip 
                                                label={design.status} 
                                                color={getStatusColor(design.status)}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <LinearProgress 
                                                    variant="determinate" 
                                                    value={design.progress} 
                                                    sx={{ width: 60 }}
                                                />
                                                <Typography variant="caption">
                                                    {design.progress}%
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>{design.version}</TableCell>
                                        <TableCell>{design.fileSize}</TableCell>
                                        <TableCell>{new Date(design.lastModified).toLocaleDateString()}</TableCell>
                                        <TableCell>
                                            <IconButton size="small">
                                                <PreviewIcon />
                                            </IconButton>
                                            <IconButton 
                                                size="small" 
                                                onClick={() => handleEditDesign(design)}
                                            >
                                                <EditIcon />
                                            </IconButton>
                                            <IconButton size="small">
                                                <DownloadIcon />
                                            </IconButton>
                                            <IconButton size="small" color="error" onClick={() => handleDeleteDesign(design._id || design.id)}>
                                                <DeleteIcon />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    )}
                </CardContent>
            </Card>

            {/* Add/Edit Design Dialog */}
            <Dialog 
                open={openDialog} 
                onClose={() => setOpenDialog(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    {selectedDesign ? 'Edit CAD Design' : 'New CAD Design Project'}
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Design Name"
                                defaultValue={selectedDesign?.name || ''}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Client Name"
                                defaultValue={selectedDesign?.client || ''}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                                <InputLabel>Jewelry Type</InputLabel>
                                <Select
                                    defaultValue={selectedDesign?.type || ''}
                                    label="Jewelry Type"
                                >
                                    <MenuItem value="Ring">Ring</MenuItem>
                                    <MenuItem value="Pendant">Pendant</MenuItem>
                                    <MenuItem value="Earrings">Earrings</MenuItem>
                                    <MenuItem value="Bracelet">Bracelet</MenuItem>
                                    <MenuItem value="Necklace">Necklace</MenuItem>
                                    <MenuItem value="Brooch">Brooch</MenuItem>
                                    <MenuItem value="Cufflinks">Cufflinks</MenuItem>
                                    <MenuItem value="Other">Other</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                                <InputLabel>CAD Software</InputLabel>
                                <Select
                                    defaultValue={selectedDesign?.software || ''}
                                    label="CAD Software"
                                >
                                    <MenuItem value="Rhino 3D">Rhino 3D</MenuItem>
                                    <MenuItem value="Fusion 360">Fusion 360</MenuItem>
                                    <MenuItem value="SolidWorks">SolidWorks</MenuItem>
                                    <MenuItem value="KeyShot">KeyShot</MenuItem>
                                    <MenuItem value="Matrix">Matrix</MenuItem>
                                    <MenuItem value="Other">Other</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                                <InputLabel>Status</InputLabel>
                                <Select
                                    defaultValue={selectedDesign?.status || 'Draft'}
                                    label="Status"
                                >
                                    <MenuItem value="Draft">Draft</MenuItem>
                                    <MenuItem value="In Review">In Review</MenuItem>
                                    <MenuItem value="Approved">Approved</MenuItem>
                                    <MenuItem value="Rejected">Rejected</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Progress (%)"
                                type="number"
                                inputProps={{ min: 0, max: 100 }}
                                defaultValue={selectedDesign?.progress || 0}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 2 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                    CAD Files
                                </Typography>
                                <Button
                                    variant="outlined"
                                    startIcon={<UploadIcon />}
                                    component="label"
                                    fullWidth
                                >
                                    Upload CAD Files (.3dm, .f3d, .step)
                                    <input
                                        type="file"
                                        hidden
                                        multiple
                                        accept=".3dm,.f3d,.step,.stp,.obj,.stl"
                                    />
                                </Button>
                            </Box>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Design Notes"
                                multiline
                                rows={3}
                                placeholder="Add design specifications, client requirements, or revision notes..."
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>
                        Cancel
                    </Button>
                    <Button variant="contained" onClick={handleSaveDesign}>
                        {selectedDesign ? 'Update' : 'Create'} Design
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}