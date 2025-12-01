'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
    Assessment as VolumeIcon,
    Assignment as ClaimIcon,
    Person as PersonIcon
} from '@mui/icons-material';

export default function CADRequestsPage() {
    const { data: session } = useSession();
    const router = useRouter();
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
        // CAD Designers see only their requests, Admins see all requests
        const isCADDesigner = session?.user?.artisanTypes?.includes('CAD Designer');
        const isAdmin = session?.user?.role === 'admin' || session?.user?.role === 'staff';
        
        if (isCADDesigner || isAdmin) {
            fetchCADRequests();
        }
    }, [session]);

    const fetchCADRequests = async () => {
        try {
            setLoading(true);
            const isAdmin = session?.user?.role === 'admin' || session?.user?.role === 'staff';
            const endpoint = isAdmin ? '/api/cad-requests/all' : '/api/cad-requests/for-designers';
            
            const response = await fetch(endpoint);
            
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

    const handleClaimRequest = async (requestId) => {
        try {
            console.log('🤝 Claiming request with ID:', requestId);
            const response = await fetch(`/api/cad-requests/${requestId}/claim`, {
                method: 'POST', // Changed from PATCH to POST
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    designerId: session.user.userID,
                    designerName: session.user.name || session.user.email 
                })
            });
            
            console.log('🔍 Claim response status:', response.status);
            
            if (!response.ok) {
                const errorData = await response.text();
                console.log('❌ Claim error response:', errorData);
                throw new Error('Failed to claim request');
            }
            
            const result = await response.json();
            console.log('✅ Claim success:', result);
            
            fetchCADRequests(); // Refresh the list
        } catch (err) {
            console.error('Error claiming request:', err);
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

    if (!session?.user?.artisanTypes?.includes('CAD Designer') && session?.user?.role !== 'admin') {
        return (
            <Container maxWidth="lg" sx={{ mt: 4 }}>
                <Alert severity="warning">
                    Access denied. This page is only available to CAD designers and administrators.
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
                        <Grid item xs={12} md={6} lg={4} key={request._id?.toString() || Math.random()}>
                            <Card 
                                elevation={3}
                                sx={{ 
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    transition: 'all 0.3s ease-in-out',
                                    border: '2px solid',
                                    borderColor: 'transparent',
                                    cursor: 'pointer',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: 6,
                                        borderColor: getStatusColor(request.status) + '.main'
                                    }
                                }}
                                onClick={() => {
                                    const requestId = request._id?.toString?.() || request.id || request._id;
                                    console.log('🖱️ Card clicked - Request ID:', requestId, 'Full request:', request);
                                    if (requestId) {
                                        console.log('➡️ Navigating to:', `/dashboard/requests/cad-requests/${requestId}`);
                                        router.push(`/dashboard/requests/cad-requests/${requestId}`);
                                    } else {
                                        console.error('❌ Request ID not found:', request);
                                    }
                                }}
                            >
                                {/* Status Header Bar */}
                                <Box 
                                    sx={{ 
                                        height: '4px', 
                                        backgroundColor: `${getStatusColor(request.status)}.main`,
                                        borderRadius: '4px 4px 0 0'
                                    }} 
                                />

                                <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                                    {/* Header Section */}
                                    <Box sx={{ mb: 2 }}>
                                        <Typography variant="h6" component="h3" sx={{ mb: 0.5, fontWeight: 600 }}>
                                            {request.mountingType || request.title || 'Custom Design Request'}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                            {request.gemstoneTitle || request.requestDetails?.jewelryType || 'N/A'}
                                        </Typography>
                                    </Box>

                                    {/* Status Chips */}
                                    <Box sx={{ mb: 2 }}>
                                        <Chip 
                                            label={request.status.replace('_', ' ')} 
                                            color={getStatusColor(request.status)}
                                            size="small"
                                            sx={{ mr: 1, mb: 1, fontWeight: 500 }}
                                        />
                                        <Chip 
                                            label={`${request.priority || 'normal'} priority`}
                                            color={getPriorityColor(request.priority || 'normal')}
                                            size="small"
                                            variant="outlined"
                                            sx={{ mb: 1 }}
                                        />
                                    </Box>

                                    {/* Designer Info */}
                                    {(request.designerId || request.assignedTo || request.assignedDesigner) && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, p: 1, backgroundColor: 'grey.50', borderRadius: 1 }}>
                                            <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
                                            <Typography variant="body2" color="primary.main" sx={{ fontWeight: 500 }}>
                                                Designer: {request.designerName || request.assignedDesigner?.name || request.assignedTo || request.designerId}
                                            </Typography>
                                        </Box>
                                    )}

                                    {/* Details Grid */}
                                    <Box sx={{ mb: 2, flexGrow: 1 }}>
                                        <Typography variant="body2" sx={{ mb: 1 }}>
                                            <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>Metal:</Box>{' '}
                                            <Box component="span" sx={{ color: 'text.secondary' }}>
                                                {request.metalType || request.requestDetails?.metalType || 'Not specified'}
                                            </Box>
                                        </Typography>
                                        
                                        {(request.ringSize || request.requestDetails?.size) && (
                                            <Typography variant="body2" sx={{ mb: 1 }}>
                                                <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>Size:</Box>{' '}
                                                <Box component="span" sx={{ color: 'text.secondary' }}>
                                                    {request.ringSize || request.requestDetails?.size}
                                                </Box>
                                            </Typography>
                                        )}

                                        <Typography variant="body2" sx={{ mb: 1 }}>
                                            <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>Timeline:</Box>{' '}
                                            <Box component="span" sx={{ color: 'text.secondary' }}>
                                                {request.timeline || request.requestDetails?.timeline || 'Not specified'}
                                            </Box>
                                        </Typography>

                                        {(request.requestDetails?.budget) && (
                                            <Typography variant="body2" sx={{ mb: 1 }}>
                                                <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>Budget:</Box>{' '}
                                                <Box component="span" sx={{ color: 'text.secondary' }}>
                                                    {request.requestDetails.budget}
                                                </Box>
                                            </Typography>
                                        )}

                                        {(request.styleDescription || request.description || request.specialRequests || request.requestDetails?.specialRequests) && (
                                            <Typography 
                                                variant="body2" 
                                                sx={{ 
                                                    mb: 1,
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical',
                                                    overflow: 'hidden'
                                                }}
                                            >
                                                <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>Notes:</Box>{' '}
                                                {request.styleDescription || request.specialRequests || request.description || request.requestDetails?.specialRequests}
                                            </Typography>
                                        )}
                                    </Box>

                                    {/* Footer */}
                                    <Box sx={{ mt: 'auto', pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                                            Requested: {new Date(request.createdAt).toLocaleDateString()}
                                        </Typography>

                                        {/* Action Buttons */}
                                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                            {request.status === 'pending' && session?.user?.artisanTypes?.includes('CAD Designer') && (
                                                <Button
                                                    size="small"
                                                    variant="contained"
                                                    color="success"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleClaimRequest(request._id.toString());
                                                    }}
                                                    startIcon={<ClaimIcon />}
                                                    sx={{ flex: 1, minWidth: '120px' }}
                                                >
                                                    Claim Request
                                                </Button>
                                            )}
                                            
                                            {request.designerId === session?.user?.userID && ['claimed', 'in_progress'].includes(request.status) && (
                                                <Button
                                                    size="small"
                                                    variant="contained"
                                                    color="primary"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleStartDesign(request);
                                                    }}
                                                    startIcon={<EditIcon />}
                                                    sx={{ flex: 1, minWidth: '120px' }}
                                                >
                                                    {request.status === 'claimed' ? 'Start Design' : 'Continue'}
                                                </Button>
                                            )}
                                            
                                            <Link href={`/dashboard/requests/cad-requests/${request._id?.toString?.() || request.id || request._id}`} style={{ textDecoration: 'none', flex: 1 }}>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    fullWidth
                                                    startIcon={<ViewIcon />}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        console.log('🔘 Details button (Link) clicked - Request ID:', request._id?.toString?.() || request.id);
                                                    }}
                                                    sx={{ minWidth: '100px' }}
                                                >
                                                    Details
                                                </Button>
                                            </Link>
                                        </Box>
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