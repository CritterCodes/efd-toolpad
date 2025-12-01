'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
    Box,
    Typography,
    Card,
    CardContent,
    CardActions,
    Grid,
    Button,
    Chip,
    Avatar,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Alert,
    CircularProgress,
    Divider,
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    ListItemSecondaryAction,
    IconButton,
    Paper,
    LinearProgress,
    Tabs,
    Tab,
    Badge
} from '@mui/material';
import {
    Assignment as AssignmentIcon,
    Diamond as DiamondIcon,
    Download as DownloadIcon,
    Upload as UploadIcon,
    CheckCircle as CheckCircleIcon,
    Schedule as ScheduleIcon,
    Person as PersonIcon,
    Palette as PaletteIcon,
    CloudUpload as CloudUploadIcon,
    GetApp as GetAppIcon,
    Refresh as RefreshIcon
} from '@mui/icons-material';
import Image from 'next/image';
import { uploadFileToS3 } from '../../../utils/s3.util';

export default function DesignRequestsPage() {
    const { data: session } = useSession();
    const router = useRouter();
    
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
    const [tabValue, setTabValue] = useState(0);
    const [uploading, setUploading] = useState(false);
    const [claimingRequest, setClaimingRequest] = useState(false);
    
    // Upload state
    const [stlFile, setStlFile] = useState(null);
    const [glbFile, setGlbFile] = useState(null);
    const [designTitle, setDesignTitle] = useState('');
    const [designNotes, setDesignNotes] = useState('');
    const [estimatedLabor, setEstimatedLabor] = useState('');
    const [estimatedVolume, setEstimatedVolume] = useState('');

    useEffect(() => {
        if (session?.user) {
            fetchDesignRequests();
        }
    }, [session]);

    const fetchDesignRequests = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/design-requests');
            
            if (!response.ok) {
                throw new Error('Failed to fetch design requests');
            }
            
            const data = await response.json();
            setRequests(data.requests || []);
        } catch (error) {
            console.error('Error fetching design requests:', error);
            setError('Failed to load design requests');
        } finally {
            setLoading(false);
        }
    };

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    // Filter requests based on active tab
    const filteredRequests = requests.filter(request => {
        switch (tabValue) {
            case 0: // Available
                return request.status === 'pending';
            case 1: // My Work
                return request.assignedTo === session?.user?.id && request.status === 'in_progress';
            case 2: // Completed
                return request.status === 'completed';
            default:
                return true;
        }
    });

    const getStatusChip = (status) => {
        const configs = {
            pending: { color: 'warning', label: 'Needs Design' },
            in_progress: { color: 'info', label: 'In Progress' },
            completed: { color: 'success', label: 'Completed' },
            delivered: { color: 'default', label: 'Delivered' }
        };
        
        const config = configs[status] || { color: 'default', label: status };
        return <Chip label={config.label} color={config.color} size="small" />;
    };

    const handleClaimRequest = async (requestId) => {
        try {
            setClaimingRequest(true);
            const response = await fetch(`/api/design-requests/${requestId}/claim`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (!response.ok) {
                throw new Error('Failed to claim request');
            }
            
            await fetchDesignRequests();
            setDialogOpen(false);
        } catch (error) {
            console.error('Error claiming request:', error);
            setError('Failed to claim design request');
        } finally {
            setClaimingRequest(false);
        }
    };

    const handleUploadDesign = async () => {
        if (!selectedRequest || !stlFile || !designTitle) {
            setError('Please provide a title and STL file');
            return;
        }

        try {
            setUploading(true);
            
            // Upload files to S3 first
            const stlUrl = await uploadFileToS3(
                stlFile, 
                `designs/gemstones/${selectedRequest.gemstoneId}`, 
                `${designTitle}-stl`
            );
            
            let glbUrl = null;
            if (glbFile) {
                glbUrl = await uploadFileToS3(
                    glbFile, 
                    `designs/gemstones/${selectedRequest.gemstoneId}`, 
                    `${designTitle}-glb`
                );
            }

            // Create the design record
            const designData = {
                title: designTitle,
                notes: designNotes,
                estimatedLabor: parseFloat(estimatedLabor) || 0,
                estimatedVolume: parseFloat(estimatedVolume) || 0,
                STL: stlUrl,
                GLB: glbUrl,
                gemstoneId: selectedRequest.gemstoneId,
                requestId: selectedRequest._id,
                designerUserId: session?.user?.id
            };

            const response = await fetch('/api/designs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(designData)
            });

            if (!response.ok) {
                throw new Error('Failed to save design');
            }

            // Update request status to completed
            await fetch(`/api/design-requests/${selectedRequest._id}/complete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            // Reset form
            setDesignTitle('');
            setDesignNotes('');
            setEstimatedLabor('');
            setEstimatedVolume('');
            setStlFile(null);
            setGlbFile(null);
            setUploadDialogOpen(false);
            
            await fetchDesignRequests();
        } catch (error) {
            console.error('Error uploading design:', error);
            setError('Failed to upload design');
        } finally {
            setUploading(false);
        }
    };

    const openRequestDetails = (request) => {
        setSelectedRequest(request);
        setDialogOpen(true);
    };

    const openUploadDialog = (request) => {
        setSelectedRequest(request);
        setUploadDialogOpen(true);
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>Loading design requests...</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" gutterBottom>
                        Design Requests
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Fulfill custom design requests for gemstones
                    </Typography>
                </Box>
                <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={fetchDesignRequests}
                >
                    Refresh
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {/* Tabs for filtering requests */}
            <Paper sx={{ mb: 3 }}>
                <Tabs value={tabValue} onChange={handleTabChange} aria-label="design request tabs">
                    <Tab 
                        label={
                            <Badge 
                                badgeContent={requests.filter(r => r.status === 'pending').length} 
                                color="warning"
                            >
                                Available
                            </Badge>
                        } 
                    />
                    <Tab 
                        label={
                            <Badge 
                                badgeContent={requests.filter(r => r.assignedTo === session?.user?.id && r.status === 'in_progress').length} 
                                color="info"
                            >
                                My Work
                            </Badge>
                        } 
                    />
                    <Tab 
                        label={
                            <Badge 
                                badgeContent={requests.filter(r => r.status === 'completed').length} 
                                color="success"
                            >
                                Completed
                            </Badge>
                        } 
                    />
                </Tabs>
            </Paper>

            {/* Request Cards */}
            <Grid container spacing={3}>
                {filteredRequests.length === 0 ? (
                    <Grid item xs={12}>
                        <Paper sx={{ p: 6, textAlign: 'center' }}>
                            <AssignmentIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                            <Typography variant="h6" gutterBottom>
                                {tabValue === 0 ? 'No pending design requests' : 
                                 tabValue === 1 ? 'No active work assignments' : 
                                 'No completed requests'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {tabValue === 0 ? 'Check back later for new gemstones that need custom designs.' :
                                 tabValue === 1 ? 'Claim available requests from the Available tab.' :
                                 'Completed design requests will appear here.'}
                            </Typography>
                        </Paper>
                    </Grid>
                ) : (
                    filteredRequests.map((request) => (
                        <Grid item xs={12} md={6} lg={4} key={request._id}>
                            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                <CardContent sx={{ flexGrow: 1 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <DiamondIcon color="primary" sx={{ mr: 1 }} />
                                            <Typography variant="h6" component="h3">
                                                {request.gemstone?.gemstone?.species || 'Gemstone'}
                                            </Typography>
                                        </Box>
                                        {getStatusChip(request.status)}
                                    </Box>

                                    {/* Gemstone Image */}
                                    <Box sx={{
                                        width: '100%',
                                        height: 200,
                                        backgroundColor: 'grey.100',
                                        borderRadius: 1,
                                        mb: 2,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}>
                                        {request.gemstone?.images?.length > 0 ? (
                                            <Image
                                                src={request.gemstone.images[0]}
                                                alt="Gemstone"
                                                fill
                                                style={{ objectFit: 'cover' }}
                                            />
                                        ) : (
                                            <DiamondIcon sx={{ fontSize: 60, color: 'grey.400' }} />
                                        )}
                                    </Box>

                                    {/* Gemstone Details */}
                                    <Box sx={{ mb: 2 }}>
                                        <Typography variant="body2" color="text.secondary">
                                            {request.gemstone?.gemstone?.carat}ct • {request.gemstone?.gemstone?.locale} • {request.gemstone?.vendor}
                                        </Typography>
                                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                                            Cut: {Array.isArray(request.gemstone?.gemstone?.cut) 
                                                ? request.gemstone.gemstone.cut.join(', ') 
                                                : request.gemstone?.gemstone?.cut || 'N/A'}
                                        </Typography>
                                    </Box>

                                    {/* Request Details */}
                                    <Box sx={{ mb: 1 }}>
                                        <Typography variant="body2" color="text.secondary">
                                            Requested: {new Date(request.createdAt).toLocaleDateString()}
                                        </Typography>
                                        {request.dueDate && (
                                            <Typography variant="body2" color="text.secondary">
                                                Due: {new Date(request.dueDate).toLocaleDateString()}
                                            </Typography>
                                        )}
                                        {request.assignedTo && (
                                            <Typography variant="body2" color="text.secondary">
                                                Designer: {request.assignedToName || request.assignedTo}
                                            </Typography>
                                        )}
                                    </Box>

                                    {/* Special Requirements */}
                                    {request.requirements && (
                                        <Typography variant="body2" sx={{ 
                                            fontStyle: 'italic', 
                                            color: 'text.secondary',
                                            backgroundColor: 'grey.50',
                                            p: 1,
                                            borderRadius: 1
                                        }}>
                                            &ldquo;{request.requirements}&rdquo;
                                        </Typography>
                                    )}
                                </CardContent>

                                <CardActions sx={{ justifyContent: 'space-between', p: 2 }}>
                                    <Button
                                        size="small"
                                        onClick={() => openRequestDetails(request)}
                                        startIcon={<DiamondIcon />}
                                    >
                                        View Details
                                    </Button>

                                    {request.status === 'pending' && (
                                        <Button
                                            variant="contained"
                                            size="small"
                                            onClick={() => handleClaimRequest(request._id)}
                                            disabled={claimingRequest}
                                            startIcon={<PersonIcon />}
                                        >
                                            Claim
                                        </Button>
                                    )}

                                    {request.status === 'in_progress' && request.assignedTo === session?.user?.id && (
                                        <Button
                                            variant="contained"
                                            size="small"
                                            onClick={() => openUploadDialog(request)}
                                            startIcon={<UploadIcon />}
                                        >
                                            Upload Design
                                        </Button>
                                    )}

                                    {request.status === 'completed' && request.design && (
                                        <Box>
                                            {request.design.STL && (
                                                <IconButton
                                                    size="small"
                                                    onClick={() => window.open(request.design.STL, '_blank')}
                                                    title="Download STL"
                                                >
                                                    <GetAppIcon />
                                                </IconButton>
                                            )}
                                            {request.design.GLB && (
                                                <IconButton
                                                    size="small"
                                                    onClick={() => window.open(request.design.GLB, '_blank')}
                                                    title="Download GLB"
                                                >
                                                    <GetAppIcon />
                                                </IconButton>
                                            )}
                                        </Box>
                                    )}
                                </CardActions>
                            </Card>
                        </Grid>
                    ))
                )}
            </Grid>

            {/* Request Details Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
                {selectedRequest && (
                    <>
                        <DialogTitle>
                            Design Request Details
                        </DialogTitle>
                        <DialogContent>
                            <Grid container spacing={3}>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="h6" gutterBottom>
                                        Gemstone Information
                                    </Typography>
                                    <List dense>
                                        <ListItem>
                                            <ListItemText 
                                                primary="Species" 
                                                secondary={selectedRequest.gemstone?.gemstone?.species || 'N/A'} 
                                            />
                                        </ListItem>
                                        <ListItem>
                                            <ListItemText 
                                                primary="Carat Weight" 
                                                secondary={selectedRequest.gemstone?.gemstone?.carat ? `${selectedRequest.gemstone.gemstone.carat} ct` : 'N/A'} 
                                            />
                                        </ListItem>
                                        <ListItem>
                                            <ListItemText 
                                                primary="Origin" 
                                                secondary={selectedRequest.gemstone?.gemstone?.locale || 'N/A'} 
                                            />
                                        </ListItem>
                                        <ListItem>
                                            <ListItemText 
                                                primary="Cut" 
                                                secondary={Array.isArray(selectedRequest.gemstone?.gemstone?.cut) 
                                                    ? selectedRequest.gemstone.gemstone.cut.join(', ') 
                                                    : selectedRequest.gemstone?.gemstone?.cut || 'N/A'} 
                                            />
                                        </ListItem>
                                        {selectedRequest.gemstone?.gemstone?.dimensions && (
                                            <ListItem>
                                                <ListItemText 
                                                    primary="Dimensions" 
                                                    secondary={`${selectedRequest.gemstone.gemstone.dimensions.length || '?'} × ${selectedRequest.gemstone.gemstone.dimensions.width || '?'} × ${selectedRequest.gemstone.gemstone.dimensions.height || '?'} mm`} 
                                                />
                                            </ListItem>
                                        )}
                                    </List>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="h6" gutterBottom>
                                        Request Information
                                    </Typography>
                                    <List dense>
                                        <ListItem>
                                            <ListItemText 
                                                primary="Status" 
                                                secondary={getStatusChip(selectedRequest.status)} 
                                            />
                                        </ListItem>
                                        <ListItem>
                                            <ListItemText 
                                                primary="Requested Date" 
                                                secondary={new Date(selectedRequest.createdAt).toLocaleString()} 
                                            />
                                        </ListItem>
                                        {selectedRequest.dueDate && (
                                            <ListItem>
                                                <ListItemText 
                                                    primary="Due Date" 
                                                    secondary={new Date(selectedRequest.dueDate).toLocaleString()} 
                                                />
                                            </ListItem>
                                        )}
                                        {selectedRequest.assignedTo && (
                                            <ListItem>
                                                <ListItemText 
                                                    primary="Assigned Designer" 
                                                    secondary={selectedRequest.assignedToName || selectedRequest.assignedTo} 
                                                />
                                            </ListItem>
                                        )}
                                        {selectedRequest.priority && (
                                            <ListItem>
                                                <ListItemText 
                                                    primary="Priority" 
                                                    secondary={
                                                        <Chip 
                                                            label={selectedRequest.priority} 
                                                            color={
                                                                selectedRequest.priority === 'high' ? 'error' :
                                                                selectedRequest.priority === 'medium' ? 'warning' : 'default'
                                                            }
                                                            size="small"
                                                        />
                                                    } 
                                                />
                                            </ListItem>
                                        )}
                                    </List>
                                    
                                    {selectedRequest.requirements && (
                                        <>
                                            <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                                                Special Requirements:
                                            </Typography>
                                            <Typography variant="body2" sx={{ 
                                                fontStyle: 'italic',
                                                backgroundColor: 'grey.50',
                                                p: 2,
                                                borderRadius: 1
                                            }}>
                                                {selectedRequest.requirements}
                                            </Typography>
                                        </>
                                    )}
                                </Grid>
                            </Grid>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setDialogOpen(false)}>
                                Close
                            </Button>
                            {selectedRequest.status === 'pending' && (
                                <Button
                                    variant="contained"
                                    onClick={() => handleClaimRequest(selectedRequest._id)}
                                    disabled={claimingRequest}
                                    startIcon={<PersonIcon />}
                                >
                                    Claim Request
                                </Button>
                            )}
                        </DialogActions>
                    </>
                )}
            </Dialog>

            {/* Upload Design Dialog */}
            <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>
                    Upload Design Files
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 2 }}>
                        <TextField
                            fullWidth
                            label="Design Title"
                            value={designTitle}
                            onChange={(e) => setDesignTitle(e.target.value)}
                            required
                            sx={{ mb: 2 }}
                        />
                        
                        <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="Estimated Labor (hours)"
                                    type="number"
                                    value={estimatedLabor}
                                    onChange={(e) => setEstimatedLabor(e.target.value)}
                                    inputProps={{ min: 0, step: 0.5 }}
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="Estimated Volume (cubic mm)"
                                    type="number"
                                    value={estimatedVolume}
                                    onChange={(e) => setEstimatedVolume(e.target.value)}
                                    inputProps={{ min: 0, step: 0.1 }}
                                />
                            </Grid>
                        </Grid>

                        <TextField
                            fullWidth
                            label="Design Notes"
                            multiline
                            rows={3}
                            value={designNotes}
                            onChange={(e) => setDesignNotes(e.target.value)}
                            sx={{ mt: 2, mb: 2 }}
                        />

                        {/* File Upload Section */}
                        <Typography variant="subtitle1" gutterBottom>
                            Design Files
                        </Typography>
                        
                        <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                                <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                                    <CloudUploadIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                                    <Typography variant="subtitle2" gutterBottom>
                                        STL File (Required)
                                    </Typography>
                                    <input
                                        type="file"
                                        accept=".stl"
                                        onChange={(e) => setStlFile(e.target.files[0])}
                                        style={{ display: 'none' }}
                                        id="stl-upload"
                                    />
                                    <label htmlFor="stl-upload">
                                        <Button component="span" variant="outlined" size="small">
                                            Choose STL File
                                        </Button>
                                    </label>
                                    {stlFile && (
                                        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                                            {stlFile.name}
                                        </Typography>
                                    )}
                                </Paper>
                            </Grid>
                            
                            <Grid item xs={12} md={6}>
                                <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                                    <CloudUploadIcon sx={{ fontSize: 40, color: 'secondary.main', mb: 1 }} />
                                    <Typography variant="subtitle2" gutterBottom>
                                        GLB File (Optional)
                                    </Typography>
                                    <input
                                        type="file"
                                        accept=".glb"
                                        onChange={(e) => setGlbFile(e.target.files[0])}
                                        style={{ display: 'none' }}
                                        id="glb-upload"
                                    />
                                    <label htmlFor="glb-upload">
                                        <Button component="span" variant="outlined" size="small">
                                            Choose GLB File
                                        </Button>
                                    </label>
                                    {glbFile && (
                                        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                                            {glbFile.name}
                                        </Typography>
                                    )}
                                </Paper>
                            </Grid>
                        </Grid>

                        {uploading && (
                            <Box sx={{ mt: 2 }}>
                                <LinearProgress />
                                <Typography variant="body2" align="center" sx={{ mt: 1 }}>
                                    Uploading design files...
                                </Typography>
                            </Box>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setUploadDialogOpen(false)} disabled={uploading}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleUploadDesign}
                        disabled={!designTitle || !stlFile || uploading}
                        startIcon={<UploadIcon />}
                    >
                        Upload Design
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}