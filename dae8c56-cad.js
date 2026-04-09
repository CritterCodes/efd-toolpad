'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
    Container, 
    Typography, 
    Card, 
    CardContent, 
    Grid, 
    Chip, 
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Box,
    CircularProgress,
    Alert,
    Tab,
    Tabs,
    IconButton,
    Tooltip,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Avatar,
    Divider,
    Paper
} from '@mui/material';
import { 
    Upload as UploadIcon, 
    Download as DownloadIcon,
    Visibility as ViewIcon,
    Edit as EditIcon,
    Check as ApproveIcon,
    Close as RejectIcon,
    AttachMoney as PriceIcon,
    Assessment as VolumeIcon
} from '@mui/icons-material';

export default function CADRequestsPage() {
    const { data: session } = useSession();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedTab, setSelectedTab] = useState(0);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [designDialogOpen, setDesignDialogOpen] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    
    // Design creation state
    const [designData, setDesignData] = useState({
        title: '',
        description: '',
        stlFile: null,
        glbFile: null,
        printVolume: '',
        estimatedTime: '',
        notes: '',
        status: 'in_progress'
    });

    // Filter states
    const [statusFilter, setStatusFilter] = useState('all');
    const [priorityFilter, setPriorityFilter] = useState('all');

    useEffect(() => {
        if (session?.user?.artisanTypes?.includes('CAD Designer')) {
            fetchCADRequests();
        }
    }, [session]);

    const fetchCADRequests = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/cad-requests/for-designers');
            
            if (!response.ok) {
                throw new Error('Failed to fetch CAD requests');
            }
            
            const data = await response.json();
            setRequests(data.requests || []);
        } catch (err) {
            console.error('Error fetching CAD requests:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleStartDesign = (request) => {
        setSelectedRequest(request);
        setDesignData({
            title: `Design for ${request.mountingType} - ${request.gemstoneTitle}`,
            description: request.styleDescription || '',
            stlFile: null,
            glbFile: null,
            printVolume: '',
            estimatedTime: '',
            notes: '',
            status: 'in_progress'
        });
        setDesignDialogOpen(true);
    };

    const handleFileUpload = (event, fileType) => {
        const file = event.target.files[0];
        if (file) {
            setDesignData(prev => ({
                ...prev,
                [fileType]: file
            }));
        }
    };

    const handleSubmitDesign = async () => {
        try {
            const formData = new FormData();
            
            // Add design data
            Object.keys(designData).forEach(key => {
                if (designData[key] !== null && key !== 'stlFile' && key !== 'glbFile') {
                    formData.append(key, designData[key]);
                }
            });
            
            // Add files
            if (designData.stlFile) {
                formData.append('stlFile', designData.stlFile);
            }
            if (designData.glbFile) {
                formData.append('glbFile', designData.glbFile);
            }
            
            // Add request and gemstone data
            formData.append('cadRequestId', selectedRequest._id);
            formData.append('gemstoneId', selectedRequest.gemstoneId);
            formData.append('designerId', session.user.userID);
            
            const response = await fetch('/api/designs/create', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error('Failed to create design');
            }
            
            const result = await response.json();
            
            // Update the request status
            await updateRequestStatus(selectedRequest._id, 'design_submitted');
            
            setDesignDialogOpen(false);
            setSelectedRequest(null);
            fetchCADRequests(); // Refresh the list
            
        } catch (err) {
            console.error('Error submitting design:', err);
            setError(err.message);
        }
    };

    const updateRequestStatus = async (requestId, status) => {
        try {
            const response = await fetch(`/api/cad-requests/${requestId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status })
            });
            
            if (!response.ok) {
                throw new Error('Failed to update request status');
            }
            
            fetchCADRequests(); // Refresh the list
        } catch (err) {
            console.error('Error updating request status:', err);
            setError(err.message);
        }
    };

    const getFilteredRequests = () => {
        return requests.filter(request => {
            const statusMatch = statusFilter === 'all' || request.status === statusFilter;
            const priorityMatch = priorityFilter === 'all' || request.priority === priorityFilter;
            return statusMatch && priorityMatch;
        });
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'warning';
            case 'assigned': return 'info';
            case 'in_progress': return 'primary';
            case 'design_submitted': return 'success';
            case 'approved': return 'success';
            case 'rejected': return 'error';
            default: return 'default';
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'high': return 'error';
            case 'medium': return 'warning';
            case 'low': return 'success';
            default: return 'default';
        }
    };

    if (!session?.user?.artisanTypes?.includes('CAD Designer')) {
        return (
            <Container maxWidth="lg" sx={{ mt: 4 }}>
                <Alert severity="warning">
                    Access denied. This page is only available to CAD designers.
                </Alert>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h4" gutterBottom>
                    CAD Design Requests
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Manage and fulfill CAD design requests from customers
                </Typography>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            {/* Filters */}
            <Paper sx={{ p: 2, mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={4}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Status Filter</InputLabel>
                            <Select
                                value={statusFilter}
                                label="Status Filter"
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <MenuItem value="all">All Status</MenuItem>
                                <MenuItem value="pending">Pending</MenuItem>
                                <MenuItem value="assigned">Assigned</MenuItem>
                                <MenuItem value="in_progress">In Progress</MenuItem>
                                <MenuItem value="design_submitted">Design Submitted</MenuItem>
                                <MenuItem value="approved">Approved</MenuItem>
                                <MenuItem value="rejected">Rejected</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Priority Filter</InputLabel>
                            <Select
                                value={priorityFilter}
                                label="Priority Filter"
                                onChange={(e) => setPriorityFilter(e.target.value)}
                            >
                                <MenuItem value="all">All Priorities</MenuItem>
                                <MenuItem value="high">High</MenuItem>
                                <MenuItem value="medium">Medium</MenuItem>
                                <MenuItem value="low">Low</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Button 
                            variant="outlined" 
                            onClick={fetchCADRequests}
                            disabled={loading}
                        >
                            Refresh
                        </Button>
                    </Grid>
                </Grid>
            </Paper>

            {loading ? (
                <Box display="flex" justifyContent="center" p={4}>
                    <CircularProgress />
                </Box>
            ) : (
                <Grid container spacing={3}>
                    {getFilteredRequests().map((request) => (
                        <Grid item xs={12} md={6} lg={4} key={request._id}>
                            <Card sx={{ height: '100%' }}>
                                <CardContent>
                                    <Box sx={{ mb: 2 }}>
                                        <Typography variant="h6" noWrap>
                                            {request.mountingType}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" noWrap>
                                            {request.gemstoneTitle}
                                        </Typography>
                                    </Box>

                                    <Box sx={{ mb: 2 }}>
                                        <Chip 
                                            label={request.status} 
                                            color={getStatusColor(request.status)}
                                            size="small"
                                            sx={{ mr: 1, mb: 1 }}
                                        />
                                        <Chip 
                                            label={`${request.priority} priority`}
                                            color={getPriorityColor(request.priority)}
                                            size="small"
                                            sx={{ mb: 1 }}
                                        />
                                    </Box>

                                    <Typography variant="body2" sx={{ mb: 2 }}>
                                        <strong>Metal:</strong> {request.metalType}
                                    </Typography>
                                    
                                    {request.ringSize && (
                                        <Typography variant="body2" sx={{ mb: 2 }}>
                                            <strong>Ring Size:</strong> {request.ringSize}
                                        </Typography>
                                    )}

                                    <Typography variant="body2" sx={{ mb: 2 }}>
                                        <strong>Timeline:</strong> {request.timeline}
                                    </Typography>

                                    {request.styleDescription && (
                                        <Typography variant="body2" sx={{ mb: 2 }}>
                                            <strong>Description:</strong> {request.styleDescription}
                                        </Typography>
                                    )}

                                    <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                                        Requested: {new Date(request.createdAt).toLocaleDateString()}
                                    </Typography>

                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                        {request.status === 'pending' && (
                                            <Button
                                                size="small"
                                                variant="contained"
                                                onClick={() => handleStartDesign(request)}
                                                startIcon={<EditIcon />}
                                            >
                                                Start Design
                                            </Button>
                                        )}
                                        
                                        {request.status === 'assigned' || request.status === 'in_progress' ? (
                                            <Button
                                                size="small"
                                                variant="contained"
                                                onClick={() => handleStartDesign(request)}
                                                startIcon={<EditIcon />}
                                            >
                                                Continue Design
                                            </Button>
                                        ) : null}
                                        
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={() => {/* View details */}}
                                            startIcon={<ViewIcon />}
                                        >
                                            Details
                                        </Button>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* Design Creation Dialog */}
            <Dialog 
                open={designDialogOpen} 
                onClose={() => setDesignDialogOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    Create Design for {selectedRequest?.mountingType}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 2 }}>
                        <Grid container spacing={3}>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Design Title"
                                    value={designData.title}
                                    onChange={(e) => setDesignData(prev => ({ ...prev, title: e.target.value }))}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={3}
                                    label="Description"
                                    value={designData.description}
                                    onChange={(e) => setDesignData(prev => ({ ...prev, description: e.target.value }))}
                                />
                            </Grid>
                            
                            {/* File Uploads */}
                            <Grid item xs={12} md={6}>
                                <Box sx={{ p: 2, border: '1px dashed #ccc', borderRadius: 1 }}>
                                    <Typography variant="subtitle2" gutterBottom>
                                        STL File (Required)
                                    </Typography>
                                    <input
                                        type="file"
                                        accept=".stl"
                                        onChange={(e) => handleFileUpload(e, 'stlFile')}
                                        style={{ width: '100%' }}
                                    />
                                    {designData.stlFile && (
                                        <Typography variant="caption" color="success.main">
                                            ✓ {designData.stlFile.name}
                                        </Typography>
                                    )}
                                </Box>
                            </Grid>
                            
                            <Grid item xs={12} md={6}>
                                <Box sx={{ p: 2, border: '1px dashed #ccc', borderRadius: 1 }}>
                                    <Typography variant="subtitle2" gutterBottom>
                                        GLB File (3D Preview)
                                    </Typography>
                                    <input
                                        type="file"
                                        accept=".glb"
                                        onChange={(e) => handleFileUpload(e, 'glbFile')}
                                        style={{ width: '100%' }}
                                    />
                                    {designData.glbFile && (
                                        <Typography variant="caption" color="success.main">
                                            ✓ {designData.glbFile.name}
                                        </Typography>
                                    )}
                                </Box>
                            </Grid>
                            
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="Print Volume (cm³)"
                                    type="number"
                                    value={designData.printVolume}
                                    onChange={(e) => setDesignData(prev => ({ ...prev, printVolume: e.target.value }))}
                                    InputProps={{
                                        startAdornment: <VolumeIcon sx={{ mr: 1, color: 'action.active' }} />
                                    }}
                                />
                            </Grid>
                            
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="Estimated Print Time (hours)"
                                    type="number"
                                    value={designData.estimatedTime}
                                    onChange={(e) => setDesignData(prev => ({ ...prev, estimatedTime: e.target.value }))}
                                />
                            </Grid>
                            
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={2}
                                    label="Designer Notes"
                                    value={designData.notes}
                                    onChange={(e) => setDesignData(prev => ({ ...prev, notes: e.target.value }))}
                                />
                            </Grid>
                        </Grid>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDesignDialogOpen(false)}>
                        Cancel
                    </Button>
                    <Button 
                        variant="contained" 
                        onClick={handleSubmitDesign}
                        disabled={!designData.title || !designData.stlFile || !designData.printVolume}
                    >
                        Submit Design
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}