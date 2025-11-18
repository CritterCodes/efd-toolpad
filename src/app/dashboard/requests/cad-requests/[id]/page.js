'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
    Container, 
    Typography, 
    Card, 
    CardContent, 
    Grid, 
    Chip, 
    Button,
    Box,
    CircularProgress,
    Alert,
    Paper,
    Avatar,
    Divider,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    IconButton,
    Tooltip,
    Tabs,
    Tab,
    Stack,
    LinearProgress,
    Select,
    MenuItem,
    FormControl,
    useMediaQuery,
    useTheme
} from '@mui/material';
import { 
    Person as PersonIcon,
    Diamond as DiamondIcon,
    BuildCircle as DesignIcon,
    Upload as UploadIcon,
    Check as CheckIcon,
    Close as CloseIcon,
    Edit as EditIcon,
    Visibility as ViewIcon,
    Comment as CommentIcon,
    Assignment as ClaimIcon,
    MonetizationOn as PriceIcon,
    Schedule as TimeIcon,
    FileDownload as DownloadIcon,
    ThreeDRotation as ViewModelIcon,
    ArrowBack as BackIcon,
    Info as InfoIcon,
    Send as SendIcon,
    Add as AddIcon,
    ThumbUp as ApproveIcon,
    ThumbDown as DeclineIcon
} from '@mui/icons-material';
import GLBViewer from '@/components/viewers/GLBViewer';
import CADRequestTracker from '@/components/CADRequestTracker';

const STATUS_CONFIG = {
    'pending': { label: 'Pending', color: '#FFA726', bgColor: '#FFF3E0', icon: '⏳' },
    'claimed': { label: 'Claimed', color: '#42A5F5', bgColor: '#E3F2FD', icon: '✋' },
    'in_progress': { label: 'In Progress', color: '#66BB6A', bgColor: '#E8F5E9', icon: '🔧' },
    'design_submitted': { label: 'Submitted', color: '#AB47BC', bgColor: '#F3E5F5', icon: '📤' },
    'under_review': { label: 'Review', color: '#29B6F6', bgColor: '#E1F5FE', icon: '👀' },
    'approved': { label: 'Approved', color: '#26A69A', bgColor: '#E0F2F1', icon: '✅' },
    'rejected': { label: 'Rejected', color: '#EF5350', bgColor: '#FFEBEE', icon: '❌' },
    'completed': { label: 'Completed', color: '#5E35B1', bgColor: '#F3E5F5', icon: '🎉' }
};

function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} {...other}>
            {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
        </div>
    );
}

export default function CADRequestViewPage() {
    const { id } = useParams();
    const router = useRouter();
    const { data: session } = useSession();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    
    const [request, setRequest] = useState(null);
    const [gemstone, setGemstone] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [currentTab, setCurrentTab] = useState(0);
    
    // UI Dialog states
    const [commentDialog, setCommentDialog] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [approvalDialog, setApprovalDialog] = useState(false);
    const [approvalAction, setApprovalAction] = useState('');
    const [approvalNotes, setApprovalNotes] = useState('');

    // Design upload states
    const [uploadedDesigns, setUploadedDesigns] = useState([]);
    
    // 3D Viewer states
    const [selectedFileIndex, setSelectedFileIndex] = useState(0);
    const [selectedGlbDesign, setSelectedGlbDesign] = useState(null);
    
    // Design management
    const [designFeedbackDialog, setDesignFeedbackDialog] = useState(false);
    const [designFeedback, setDesignFeedback] = useState('');
    const [feedbackDesignId, setFeedbackDesignId] = useState(null);

    // Auto-select first GLB design when designs load
    useEffect(() => {
        const glbDesigns = uploadedDesigns.filter(d => d.files?.glb);
        console.log('🔍 GLB Designs filtered:', glbDesigns.length, glbDesigns);
        if (glbDesigns.length > 0 && !selectedGlbDesign) {
            console.log('✅ Auto-selecting first GLB design:', glbDesigns[0]);
            setSelectedGlbDesign(glbDesigns[0]);
        }
    }, [uploadedDesigns, selectedGlbDesign]);

    const loadRequest = useCallback(async () => {
        try {
            setLoading(true);
            console.log('🔍 Loading CAD request with ID:', id);
            
            const response = await fetch(`/api/cad-requests/${id}`);
            
            if (!response.ok) {
                throw new Error('Failed to load CAD request');
            }

            const data = await response.json();
            console.log('📦 API Response data:', data);
            console.log('📦 data.request:', data.request);
            console.log('📦 data.gemstone:', data.gemstone);
            
            // API returns: { request: {...}, gemstone: {...} }
            if (data.request) {
                console.log('✅ Using data.request structure');
                const cadRequest = data.request;
                
                setRequest({
                    ...cadRequest,
                    productDetails: {
                        name: data.gemstone?.title || 'Unknown Product',
                        category: 'Gemstone'
                    }
                });
                
                console.log('✅ Set request:', cadRequest);
            } else if (data.cadRequests && Array.isArray(data.cadRequests)) {
                console.log('✅ Using data.cadRequests array structure');
                const cadRequest = data.cadRequests.find(cr => cr.id === id || cr._id === id);
                if (cadRequest) {
                    setRequest({
                        ...cadRequest,
                        productDetails: {
                            name: data.title || 'Unknown Product',
                            category: data.productType || 'N/A'
                        }
                    });
                }
            } else {
                console.log('⚠️ Unknown data structure, using fallback');
                setRequest(data);
            }
            
            if (data.gemstone) {
                console.log('✅ Set gemstone');
                setGemstone(data.gemstone);
            }
            
            if (data.request?.designs) {
                console.log('✅ Set designs from request:', data.request.designs.length, 'items');
                console.log('📋 Design structure:', JSON.stringify(data.request.designs[0], null, 2));
                setUploadedDesigns(Array.isArray(data.request.designs) ? data.request.designs : []);
            } else if (data.designs) {
                console.log('✅ Set designs from data:', data.designs.length, 'items');
                console.log('📋 Design structure:', JSON.stringify(data.designs[0], null, 2));
                setUploadedDesigns(Array.isArray(data.designs) ? data.designs : []);
            } else {
                console.log('⚠️ No designs found in response');
                setUploadedDesigns([]);
            }
            
        } catch (err) {
            console.error('❌ Error loading CAD request:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (id) {
            loadRequest();
        }
    }, [id, loadRequest]);

    const handleClaimRequest = async () => {
        if (!session?.user?.artisanTypes?.includes('CAD Designer')) {
            setError('Only CAD designers can claim requests');
            return;
        }

        try {
            setActionLoading(true);
            const response = await fetch(`/api/cad-requests/${id}/claim`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ designerId: session.user.userID })
            });

            if (!response.ok) throw new Error('Failed to claim request');
            
            await loadRequest();
        } catch (err) {
            setError(err.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleAddComment = async () => {
        if (!newComment.trim()) return;

        try {
            setActionLoading(true);
            const response = await fetch(`/api/cad-requests/${id}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    comment: newComment,
                    userId: session.user.userID 
                })
            });

            if (!response.ok) throw new Error('Failed to add comment');
            
            setNewComment('');
            setCommentDialog(false);
            await loadRequest();
        } catch (err) {
            setError(err.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteDesign = async (designId) => {
        if (!window.confirm('Are you sure you want to delete this design?')) {
            return;
        }

        try {
            setActionLoading(true);
            const response = await fetch(`/api/designs/${designId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) throw new Error('Failed to delete design');
            
            // Note: Backend will handle S3 deletion
            // DELETE endpoint should delete files from S3 bucket before removing DB record
            
            await loadRequest();
        } catch (err) {
            setError(err.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleApproveDesign = async (designId) => {
        try {
            setActionLoading(true);
            const response = await fetch(`/api/designs/${designId}/approve`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'approved' })
            });

            if (!response.ok) throw new Error('Failed to approve design');
            
            await loadRequest();
        } catch (err) {
            setError(err.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeclineDesign = async (designId) => {
        const notes = window.prompt('Enter feedback for the designer (optional):');
        
        try {
            setActionLoading(true);
            const response = await fetch(`/api/designs/${designId}/decline`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    status: 'declined',
                    statusNotes: notes || ''
                })
            });

            if (!response.ok) throw new Error('Failed to decline design');
            
            await loadRequest();
        } catch (err) {
            setError(err.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleFileSelect = async (e, fileType) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setActionLoading(true);
            const formData = new FormData();
            formData.append('requestId', id);
            formData.append('designerId', session.user.userID);
            // Append file with generic name - API will detect type from extension
            formData.append('glbFile', file);
            formData.append('title', file.name.replace(/\.[^/.]+$/, ''));
            
            console.log(`📤 Uploading ${fileType.toUpperCase()} file: ${file.name}`);

            const response = await fetch('/api/designs/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || errorData.message || 'Failed to upload file');
            }

            const responseData = await response.json();
            console.log(`✅ ${fileType.toUpperCase()} file uploaded successfully:`, responseData.design);
            setError(''); // Clear error on success
            
            // Reset file input
            e.target.value = '';
            
            // Reload request data to show new design
            await loadRequest();
        } catch (err) {
            setError(err.message);
            console.error(`❌ ${fileType.toUpperCase()} file upload error:`, err);
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <Container maxWidth="xl" sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
                <CircularProgress />
            </Container>
        );
    }

    if (!request) {
        return (
            <Container maxWidth="xl" sx={{ py: 4 }}>
                <Alert severity="error">CAD request not found</Alert>
                <Button onClick={() => router.back()} sx={{ mt: 2 }}>Go Back</Button>
            </Container>
        );
    }

    const status = STATUS_CONFIG[request.status] || STATUS_CONFIG['pending'];
    const glbFiles = uploadedDesigns.filter(d => d.files?.glb);
    const selectedFile = glbFiles[selectedFileIndex] || glbFiles[0];
    const hasGLB = glbFiles.length > 0;

    return (
        <Container maxWidth="xl" sx={{ py: 3 }}>
            {error && (
                <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {/* Data Status Indicator */}
            <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip 
                    label={request ? `✅ Request: ${request.id || 'loaded'}` : '⏳ Request: loading'} 
                    size="small"
                    color={request ? 'success' : 'default'}
                />
                <Chip 
                    label={gemstone ? `✅ Gemstone: ${gemstone.title || 'loaded'}` : '⏳ Gemstone: loading'}
                    size="small"
                    color={gemstone ? 'success' : 'default'}
                />
                <Chip 
                    label={`✅ Designs: ${uploadedDesigns.length} items`}
                    size="small"
                    color={uploadedDesigns.length > 0 ? 'success' : 'default'}
                />
            </Box>

            {/* Debug Panel */}
            <Alert severity="info" sx={{ mb: 2, display: 'none', overflow: 'auto' }}>
                <Typography variant="caption" component="div" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                    🔍 DEBUG | request: {JSON.stringify(request).substring(0, 200)}... | gemstone: {JSON.stringify(gemstone).substring(0, 100)}... | designs: {uploadedDesigns.length}
                </Typography>
            </Alert>

            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Button 
                    startIcon={<BackIcon />}
                    onClick={() => router.back()}
                    sx={{ mb: 2 }}
                >
                    Back
                </Button>
                
                <Grid container spacing={3} alignItems="flex-start">
                    {/* Title Section */}
                    <Grid item xs={12} md={8}>
                        <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                <Typography variant="h4" component="h1" fontWeight="bold">
                                    {request.productDetails?.name || 'CAD Design Request'}
                                </Typography>
                                <Chip
                                    label={status.label}
                                    sx={{
                                        backgroundColor: status.bgColor,
                                        color: status.color,
                                        fontWeight: 'bold',
                                        fontSize: '0.9rem'
                                    }}
                                />
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                                Request ID: {request._id || id}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Created {new Date(request.createdAt).toLocaleDateString()}
                            </Typography>
                        </Box>
                    </Grid>

                    {/* Action Buttons */}
                    <Grid item xs={12} md={4}>
                        <Stack spacing={1} sx={{ justifyContent: 'flex-end' }}>
                            {request.status === 'pending' && session?.user?.artisanTypes?.includes('CAD Designer') && (
                                <Button
                                    variant="contained"
                                    startIcon={<ClaimIcon />}
                                    onClick={handleClaimRequest}
                                    disabled={actionLoading}
                                    fullWidth
                                >
                                    Claim Request
                                </Button>
                            )}
                            <Button
                                variant="outlined"
                                startIcon={<CommentIcon />}
                                onClick={() => setCommentDialog(true)}
                                fullWidth
                            >
                                Add Comment
                            </Button>
                            {request.status === 'design_submitted' && session?.user?.role === 'admin' && (
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Button
                                        variant="contained"
                                        color="success"
                                        onClick={() => {
                                            setApprovalAction('approve');
                                            setApprovalDialog(true);
                                        }}
                                        fullWidth
                                    >
                                        Approve
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        onClick={() => {
                                            setApprovalAction('reject');
                                            setApprovalDialog(true);
                                        }}
                                        fullWidth
                                    >
                                        Reject
                                    </Button>
                                </Box>
                            )}
                        </Stack>
                    </Grid>
                </Grid>
            </Box>

            {/* Main Content with Tabs */}
            <CADRequestTracker 
                status={request.status} 
                designer={request.designerId ? {
                    name: request.designerName || 'CAD Designer',
                    email: request.designerEmail
                } : null}
            />

            <Paper sx={{ mb: 4 }}>
                {isMobile ? (
                    <FormControl fullWidth sx={{ p: 2 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Select Tab:</Typography>
                        <Select 
                            value={currentTab} 
                            onChange={(e) => setCurrentTab(e.target.value)}
                            size="small"
                        >
                            <MenuItem value={0}>Overview</MenuItem>
                            <MenuItem value={1}>{`Gemstone${gemstone ? ' (3D)' : ''}`}</MenuItem>
                            <MenuItem value={2} disabled={uploadedDesigns.filter(d => d.files?.stl && d.status === 'approved').length === 0}>
                                {`GLB Designs (${uploadedDesigns.filter(d => d.files?.glb).length})`}
                                {uploadedDesigns.filter(d => d.files?.stl && d.status === 'approved').length === 0 && ' - Locked'}
                            </MenuItem>
                            <MenuItem value={3}>{`STL Files (${uploadedDesigns.filter(d => d.files?.stl).length})`}</MenuItem>
                            <MenuItem value={4}>Comments</MenuItem>
                        </Select>
                    </FormControl>
                ) : (
                    <Tabs 
                        value={currentTab} 
                        onChange={(e, v) => setCurrentTab(v)}
                        sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}
                        variant="scrollable"
                        scrollButtons="auto"
                    >
                        <Tab label="Overview" />
                        <Tab label={`Gemstone${gemstone ? ' (3D)' : ''}`} />
                        <Tab 
                            label={`GLB Designs (${uploadedDesigns.filter(d => d.files?.glb).length})`}
                            disabled={uploadedDesigns.filter(d => d.files?.stl && d.status === 'approved').length === 0}
                            sx={{
                                opacity: uploadedDesigns.filter(d => d.files?.stl && d.status === 'approved').length === 0 ? 0.5 : 1,
                                cursor: uploadedDesigns.filter(d => d.files?.stl && d.status === 'approved').length === 0 ? 'not-allowed' : 'pointer'
                            }}
                            title={uploadedDesigns.filter(d => d.files?.stl && d.status === 'approved').length === 0 ? 'GLB upload unlocked after STL approval' : ''}
                        />
                        <Tab label={`STL Files (${uploadedDesigns.filter(d => d.files?.stl).length})`} />
                        <Tab label="Comments" />
                    </Tabs>
                )}

                {/* Overview Tab */}
                <TabPanel value={currentTab} index={0}>
                    <Grid container spacing={3}>
                        {/* Left Column - Request Details */}
                        <Grid item xs={12} md={6}>
                            <Card variant="outlined">
                                <CardContent>
                                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <InfoIcon color="primary" />
                                        Request Details
                                    </Typography>
                                    <Divider sx={{ mb: 2 }} />

                                    <Stack spacing={2}>
                                        {request.customerInfo && (
                                            <Box>
                                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                                    Customer
                                                </Typography>
                                                <Typography variant="body1" fontWeight="medium">
                                                    {request.customerInfo.name || 'N/A'}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {request.customerInfo.email}
                                                </Typography>
                                            </Box>
                                        )}

                                        {request.productDetails && (
                                            <Box>
                                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                                    Product Details
                                                </Typography>
                                                <Typography variant="body1" fontWeight="medium">
                                                    {request.productDetails.name}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    Category: {request.productDetails.category || 'N/A'}
                                                </Typography>
                                            </Box>
                                        )}

                                        {request.materialInfo && (
                                            <Box>
                                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                                    Material
                                                </Typography>
                                                <Typography variant="body1" fontWeight="medium">
                                                    {request.materialInfo.metalType} {request.materialInfo.purity || ''}
                                                </Typography>
                                                {request.materialInfo.mountingType && (
                                                    <Typography variant="body2" color="text.secondary">
                                                        Type: {request.materialInfo.mountingType}
                                                    </Typography>
                                                )}
                                                {request.materialInfo.ringSize && (
                                                    <Typography variant="body2" color="text.secondary">
                                                        Size: {request.materialInfo.ringSize}
                                                    </Typography>
                                                )}
                                                {gemstone?.name && (
                                                    <Typography variant="body2" color="text.secondary">
                                                        Gemstone: {gemstone.name}
                                                    </Typography>
                                                )}
                                            </Box>
                                        )}

                                        {request.specifications && (
                                            <Box>
                                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                                    Specifications
                                                </Typography>
                                                <Typography variant="body2">
                                                    {request.specifications}
                                                </Typography>
                                            </Box>
                                        )}
                                    </Stack>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Right Column - Status & Metrics */}
                        <Grid item xs={12} md={6}>
                            <Stack spacing={2}>
                                <Card variant="outlined">
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <TimeIcon />
                                            Timeline
                                        </Typography>
                                        <Divider sx={{ mb: 2 }} />
                                        <Stack spacing={1}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <Typography variant="body2" color="text.secondary">Created:</Typography>
                                                <Typography variant="body2" fontWeight="medium">
                                                    {new Date(request.createdAt).toLocaleDateString()}
                                                </Typography>
                                            </Box>
                                            {request.claimedAt && (
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <Typography variant="body2" color="text.secondary">Claimed:</Typography>
                                                    <Typography variant="body2" fontWeight="medium">
                                                        {new Date(request.claimedAt).toLocaleDateString()}
                                                    </Typography>
                                                </Box>
                                            )}
                                            {request.estimatedDelivery && (
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <Typography variant="body2" color="text.secondary">Est. Delivery:</Typography>
                                                    <Typography variant="body2" fontWeight="medium">
                                                        {new Date(request.estimatedDelivery).toLocaleDateString()}
                                                    </Typography>
                                                </Box>
                                            )}
                                        </Stack>
                                    </CardContent>
                                </Card>

                                {request.estimatedPrice && (
                                    <Card variant="outlined" sx={{ backgroundColor: '#F0F7FF' }}>
                                        <CardContent>
                                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                                Estimated Price
                                            </Typography>
                                            <Typography variant="h5" fontWeight="bold" color="primary">
                                                ${parseFloat(request.estimatedPrice).toFixed(2)}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                )}
                            </Stack>
                        </Grid>
                    </Grid>

                    {/* Submit Design Button */}
                    {request.status === 'claimed' && session?.user?.userID === request.designerId && (
                        <Box sx={{ mt: 3 }}>
                            <Button
                                variant="contained"
                                startIcon={<UploadIcon />}
                                onClick={() => setDesignDialog(true)}
                                size="large"
                            >
                                Submit Design
                            </Button>
                        </Box>
                    )}
                </TabPanel>

                {/* 3D Model Tab */}
                <TabPanel value={currentTab} index={1}>
                    {gemstone ? (
                        <Grid container spacing={3}>
                            {/* Gemstone Details */}
                            <Grid item xs={12} md={4}>
                                <Card variant="outlined">
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <DiamondIcon color="primary" />
                                            Gemstone Details
                                        </Typography>
                                        <Divider sx={{ mb: 2 }} />
                                        <Stack spacing={2}>
                                            <Box>
                                                <Typography variant="body2" color="text.secondary">Species</Typography>
                                                <Typography variant="body1" fontWeight="medium">
                                                    {gemstone.species} {gemstone.subspecies ? `- ${gemstone.subspecies}` : ''}
                                                </Typography>
                                            </Box>
                                            <Box>
                                                <Typography variant="body2" color="text.secondary">Carat</Typography>
                                                <Typography variant="body1" fontWeight="medium">{gemstone.carat}ct</Typography>
                                            </Box>
                                            {gemstone.cut && gemstone.cut.length > 0 && (
                                                <Box>
                                                    <Typography variant="body2" color="text.secondary">Cut</Typography>
                                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                                                        {gemstone.cut.map((c, i) => (
                                                            <Chip key={i} label={c} size="small" />
                                                        ))}
                                                    </Box>
                                                </Box>
                                            )}
                                            {gemstone.color && gemstone.color.length > 0 && (
                                                <Box>
                                                    <Typography variant="body2" color="text.secondary">Color</Typography>
                                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                                                        {gemstone.color.map((c, i) => (
                                                            <Chip key={i} label={c} size="small" />
                                                        ))}
                                                    </Box>
                                                </Box>
                                            )}
                                            {gemstone.dimensions && (
                                                <Box>
                                                    <Typography variant="body2" color="text.secondary">Dimensions</Typography>
                                                    <Typography variant="body2">
                                                        {gemstone.dimensions.length} × {gemstone.dimensions.width} × {gemstone.dimensions.height} mm
                                                    </Typography>
                                                </Box>
                                            )}
                                            {gemstone.locale && (
                                                <Box>
                                                    <Typography variant="body2" color="text.secondary">Origin</Typography>
                                                    <Typography variant="body1">{gemstone.locale}</Typography>
                                                </Box>
                                            )}
                                            {gemstone.retailPrice && (
                                                <Box sx={{ pt: 1, borderTop: 1, borderColor: 'divider' }}>
                                                    <Typography variant="body2" color="text.secondary">Retail Price</Typography>
                                                    <Typography variant="h6" color="primary">
                                                        ${gemstone.retailPrice}
                                                    </Typography>
                                                </Box>
                                            )}
                                        </Stack>
                                    </CardContent>
                                </Card>
                            </Grid>

                            {/* Gemstone 3D Viewer */}
                            <Grid item xs={12} md={8}>
                                {gemstone.obj3DFile?.url ? (
                                    <Paper sx={{ height: '600px', overflow: 'hidden', p: 2 }}>
                                        <Typography variant="subtitle2" gutterBottom color="text.secondary">
                                            3D Gemstone Model
                                        </Typography>
                                        <GLBViewer 
                                            src={gemstone.obj3DFile.url}
                                            alt={`3D model of ${gemstone.species}`}
                                            height="550px"
                                        />
                                    </Paper>
                                ) : (
                                    <Paper sx={{ height: '600px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                                        <DiamondIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
                                        <Typography variant="h6" color="text.secondary" gutterBottom>
                                            No 3D Model Available
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            3D gemstone model not uploaded yet
                                        </Typography>
                                    </Paper>
                                )}
                            </Grid>
                        </Grid>
                    ) : (
                        <Box sx={{ textAlign: 'center', py: 6 }}>
                            <DiamondIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                            <Typography variant="h6" color="text.secondary">
                                No Gemstone Information
                            </Typography>
                        </Box>
                    )}
                </TabPanel>

                {/* GLB Designs Tab */}
                <TabPanel value={currentTab} index={2}>
                    <Box>
                        {/* Add GLB Design Button */}
                        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="h6">GLB Design Files</Typography>
                            {(() => {
                                // Check if user is the assigned designer or is admin
                                const isDesigner = session?.user?.userID === request?.assignedDesigner?.userId;
                                const isAdmin = session?.user?.role === 'admin';
                                // Check for statuses where designs can be uploaded
                                const canUploadStatuses = ['design_submitted', 'in-progress', 'claimed'];
                                const canUploadStatus = canUploadStatuses.includes(request?.status);
                                const canUpload = canUploadStatus && (isDesigner || isAdmin);
                                
                                return canUpload ? (
                                    <Button
                                        variant="contained"
                                        startIcon={<AddIcon />}
                                        onClick={() => {
                                            setDesignData({ ...designData, designType: 'glb' });
                                            setDesignDialog(true);
                                        }}
                                    >
                                        Upload GLB Design
                                    </Button>
                                ) : null;
                            })()}
                        </Box>

                        {uploadedDesigns.filter(d => d.files?.glb).length > 0 ? (
                            <Grid container spacing={2} sx={{ minHeight: '700px' }}>
                                {/* Left Column: 3D Viewer */}
                                <Grid item xs={12} md={7}>
                                    {selectedGlbDesign && selectedGlbDesign.files?.glb?.url ? (
                                        <Paper key={`viewer-${selectedGlbDesign._id}`} sx={{ height: '100%', minHeight: '700px', overflow: 'hidden' }}>
                                            <GLBViewer 
                                                fileUrl={selectedGlbDesign.files.glb.url}
                                                title={selectedGlbDesign.title}
                                                style={{ width: '100%', height: '100%' }}
                                            />
                                        </Paper>
                                    ) : (
                                        <Paper sx={{ height: '100%', minHeight: '700px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', bgcolor: '#fafafa' }}>
                                            <ViewModelIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
                                            <Typography variant="h6" color="text.secondary" gutterBottom>
                                                Select a design to preview
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Click on a design in the list to view it in 3D
                                            </Typography>
                                        </Paper>
                                    )}
                                </Grid>

                                {/* Right Column: Design List */}
                                <Grid item xs={12} md={5}>
                                    <Stack spacing={2} sx={{ height: '100%', overflow: 'auto', maxHeight: '700px', pr: 1 }}>
                                        {uploadedDesigns.filter(d => d.files?.glb).map((design, idx) => (
                                            <Card 
                                                key={idx}
                                                variant="outlined"
                                                sx={{
                                                    cursor: 'pointer',
                                                    backgroundColor: selectedGlbDesign?._id === design._id ? 'primary.lighter' : 'background.paper',
                                                    border: selectedGlbDesign?._id === design._id ? '2px solid' : '1px solid',
                                                    borderColor: selectedGlbDesign?._id === design._id ? 'primary.main' : 'divider',
                                                    transition: 'all 0.2s ease',
                                                    '&:hover': {
                                                        boxShadow: 2,
                                                        borderColor: 'primary.main'
                                                    }
                                                }}
                                                onClick={() => {
                                                    console.log('🖱️ Card clicked:', design);
                                                    setSelectedGlbDesign(design);
                                                }}
                                            >
                                                <CardContent sx={{ pb: 1, '&:last-child': { pb: 1 } }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                                                        <Typography variant="subtitle2" fontWeight="bold" sx={{ flex: 1, mr: 1 }}>
                                                            {design.title}
                                                        </Typography>
                                                        <Chip 
                                                            label={design.status?.replace(/_/g, ' ').toUpperCase() || 'PENDING'}
                                                            size="small"
                                                            color={
                                                                design.status === 'approved' ? 'success' : 
                                                                design.status === 'declined' ? 'error' : 
                                                                design.status === 'pending_approval' ? 'warning' :
                                                                'default'
                                                            }
                                                            variant={design.status === 'pending_approval' ? 'outlined' : 'filled'}
                                                        />
                                                    </Box>

                                                    {design.description && (
                                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontSize: '0.875rem' }}>
                                                            {design.description.substring(0, 100)}...
                                                        </Typography>
                                                    )}

                                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                                                        by {design.designerName}
                                                    </Typography>

                                                    {/* File Info */}
                                                    {design.files?.glb && (
                                                        <Box sx={{ mb: 1.5, p: 1, bgcolor: '#fafafa', borderRadius: 1 }}>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'space-between' }}>
                                                                <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
                                                                    {design.files.glb.originalName}
                                                                </Typography>
                                                                {design.files.glb.size && (
                                                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                                                        {(design.files.glb.size / (1024 * 1024)).toFixed(1)} MB
                                                                    </Typography>
                                                                )}
                                                            </Box>
                                                        </Box>
                                                    )}

                                                    {/* Actions */}
                                                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                                                        {(session?.user?.userID === request?.assignedDesigner?.userId || session?.user?.role === 'admin') && (
                                                            <Tooltip title="Delete Design">
                                                                <IconButton
                                                                    size="small"
                                                                    color="error"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDeleteDesign(design._id);
                                                                    }}
                                                                    disabled={actionLoading}
                                                                >
                                                                    <CloseIcon fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        )}
                                                    </Box>

                                                    {/* Admin Actions */}
                                                    {design.status === 'pending_approval' && session?.user?.role === 'admin' && (
                                                        <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
                                                            <Button
                                                                variant="contained"
                                                                color="success"
                                                                size="small"
                                                                fullWidth
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleApproveDesign(design._id);
                                                                }}
                                                                disabled={actionLoading}
                                                            >
                                                                Approve
                                                            </Button>
                                                            <Button
                                                                variant="outlined"
                                                                color="error"
                                                                size="small"
                                                                fullWidth
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeclineDesign(design._id);
                                                                }}
                                                                disabled={actionLoading}
                                                            >
                                                                Decline
                                                            </Button>
                                                        </Box>
                                                    )}

                                                    {/* Status Notes */}
                                                    {design.statusNotes && (
                                                        <Alert severity={design.status === 'declined' ? 'error' : 'info'} sx={{ mt: 1 }}>
                                                            <Typography variant="caption">{design.statusNotes}</Typography>
                                                        </Alert>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </Stack>
                                </Grid>
                            </Grid>
                        ) : (
                            <Box sx={{ textAlign: 'center', py: 6 }}>
                                <ViewModelIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                                <Typography variant="h6" color="text.secondary" gutterBottom>
                                    No GLB Designs Yet
                                </Typography>
                                {uploadedDesigns.filter(d => d.files?.stl && d.status === 'approved').length === 0 ? (
                                    <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                                        🔒 GLB upload is locked until STL is approved
                                    </Typography>
                                ) : request.status === 'claimed' && session?.user?.userID === request.designerId ? (
                                    <>
                                        <input
                                            type="file"
                                            accept=".glb,.gltf"
                                            onChange={(e) => handleFileSelect(e, 'glb')}
                                            style={{ display: 'none' }}
                                            id="glb-upload-input"
                                            disabled={actionLoading}
                                        />
                                        <label htmlFor="glb-upload-input">
                                            <Button
                                                variant="contained"
                                                startIcon={<AddIcon />}
                                                component="span"
                                                sx={{ mt: 2 }}
                                                disabled={actionLoading}
                                            >
                                                {actionLoading ? 'Uploading...' : 'Upload GLB Design'}
                                            </Button>
                                        </label>
                                    </>
                                ) : (
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                        Waiting for GLB designs...
                                    </Typography>
                                )}
                            </Box>
                        )}
                    </Box>
                </TabPanel>

                {/* STL Files Tab */}
                <TabPanel value={currentTab} index={3}>
                    <Box>
                        {uploadedDesigns.filter(d => d.files?.stl).length > 0 ? (
                            <Box>
                                {/* Add STL File Button */}
                                <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="h6">STL Files (3D Print Models)</Typography>
                                    {request.status === 'claimed' && session?.user?.userID === request.designerId && (
                                        <>
                                            <input
                                                type="file"
                                                accept=".stl"
                                                onChange={(e) => handleFileSelect(e, 'stl')}
                                                style={{ display: 'none' }}
                                                id="stl-upload-another-input"
                                                disabled={actionLoading}
                                            />
                                            <label htmlFor="stl-upload-another-input">
                                                <Button
                                                    variant="contained"
                                                    startIcon={<AddIcon />}
                                                    component="span"
                                                    disabled={actionLoading}
                                                >
                                                    {actionLoading ? 'Uploading...' : 'Upload Another STL'}
                                                </Button>
                                            </label>
                                        </>
                                    )}
                                </Box>
                                <Stack spacing={2}>
                                    {uploadedDesigns.filter(d => d.files?.stl).map((design, idx) => (
                                    <Card key={idx} variant="outlined">
                                        <CardContent>
                                            <Grid container spacing={2}>
                                                {/* STL Info */}
                                                <Grid item xs={12} md={6}>
                                                    <Box sx={{ mb: 2 }}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, justifyContent: 'space-between' }}>
                                                            <Typography variant="h6">
                                                                {design.title}
                                                            </Typography>
                                                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                                                <Chip 
                                                                    label={design.status?.replace(/_/g, ' ').toUpperCase() || 'PENDING'}
                                                                    size="small"
                                                                    color={
                                                                        design.status === 'approved' ? 'success' : 
                                                                        design.status === 'declined' ? 'error' : 
                                                                        design.status === 'pending_approval' ? 'warning' :
                                                                        'default'
                                                                    }
                                                                    variant={design.status === 'pending_approval' ? 'outlined' : 'filled'}
                                                                />
                                                                {session?.user?.userID === request.designerId && (
                                                                    <Tooltip title="Delete STL File">
                                                                        <IconButton
                                                                            size="small"
                                                                            color="error"
                                                                            onClick={() => handleDeleteDesign(design._id)}
                                                                            disabled={actionLoading}
                                                                        >
                                                                            <CloseIcon fontSize="small" />
                                                                        </IconButton>
                                                                    </Tooltip>
                                                                )}
                                                            </Box>
                                                        </Box>
                                                        {design.description && (
                                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                                {design.description}
                                                            </Typography>
                                                        )}
                                                        <Typography variant="caption" color="text.secondary">
                                                            Submitted by {design.designerName} on {new Date(design.createdAt).toLocaleDateString()}
                                                        </Typography>
                                                    </Box>

                                                    {/* STL Specs with Volume */}
                                                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 2, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                                                        <Box>
                                                            <Typography variant="caption" color="text.secondary" fontWeight="bold">
                                                                Print Volume
                                                            </Typography>
                                                            <Typography variant="h6" fontWeight="bold" color="primary">
                                                                {design.printVolume || 0} mm³
                                                            </Typography>
                                                        </Box>
                                                        {design.estimatedTime > 0 && (
                                                            <Box>
                                                                <Typography variant="caption" color="text.secondary">Est. Print Time</Typography>
                                                                <Typography variant="body2" fontWeight="medium">{design.estimatedTime}h</Typography>
                                                            </Box>
                                                        )}
                                                        {design.pricing?.totalCost && (
                                                            <Box>
                                                                <Typography variant="caption" color="text.secondary">Print Cost</Typography>
                                                                <Typography variant="body2" fontWeight="medium" color="primary">
                                                                    ${design.pricing.totalCost}
                                                                </Typography>
                                                            </Box>
                                                        )}
                                                        {design.meshStats && (
                                                            <Box>
                                                                <Typography variant="caption" color="text.secondary">Dimensions</Typography>
                                                                <Typography variant="caption" display="block">
                                                                    {design.meshStats.width?.toFixed(1)} × {design.meshStats.height?.toFixed(1)} × {design.meshStats.depth?.toFixed(1)} mm
                                                                </Typography>
                                                            </Box>
                                                        )}
                                                    </Box>

                                                    {/* File Info */}
                                                    {design.files?.stl && (
                                                        <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                                <DesignIcon fontSize="small" color="primary" />
                                                                <Typography variant="caption" sx={{ flex: 1 }}>
                                                                    {design.files.stl.originalName}
                                                                </Typography>
                                                                <Typography variant="caption" color="text.secondary">
                                                                    {(design.files.stl.size / (1024 * 1024)).toFixed(1)} MB
                                                                </Typography>
                                                            </Box>
                                                            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                                                <Button
                                                                    size="small"
                                                                    variant="outlined"
                                                                    startIcon={<DownloadIcon />}
                                                                    href={design.files.stl.url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                >
                                                                    Download
                                                                </Button>
                                                                <Button
                                                                    size="small"
                                                                    variant="outlined"
                                                                    startIcon={<ViewIcon />}
                                                                    href={design.files.stl.url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                >
                                                                    View
                                                                </Button>
                                                            </Box>
                                                        </Box>
                                                    )}

                                                    {/* Status Notes */}
                                                    {design.statusNotes && (
                                                        <Alert severity={design.status === 'declined' ? 'error' : 'info'} sx={{ mt: 2 }}>
                                                            <Typography variant="caption">{design.statusNotes}</Typography>
                                                        </Alert>
                                                    )}
                                                </Grid>

                                                {/* STL Info Column */}
                                                <Grid item xs={12} md={6}>
                                                    <Paper sx={{ p: 2, backgroundColor: '#fafafa' }}>
                                                        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                                                            3D Print Specifications
                                                        </Typography>
                                                        <Divider sx={{ my: 1 }} />
                                                        <Stack spacing={1.5}>
                                                            <Box>
                                                                <Typography variant="caption" color="text.secondary">
                                                                    Volume Calculation
                                                                </Typography>
                                                                <Typography variant="body2">
                                                                    {design.printVolume ? `${design.printVolume.toLocaleString()} mm³` : 'Not calculated'}
                                                                </Typography>
                                                            </Box>
                                                            {design.meshStats && (
                                                                <>
                                                                    <Box>
                                                                        <Typography variant="caption" color="text.secondary">
                                                                            Bounding Box
                                                                        </Typography>
                                                                        <Typography variant="body2">
                                                                            W: {design.meshStats.width?.toFixed(2)} mm
                                                                        </Typography>
                                                                        <Typography variant="body2">
                                                                            H: {design.meshStats.height?.toFixed(2)} mm
                                                                        </Typography>
                                                                        <Typography variant="body2">
                                                                            D: {design.meshStats.depth?.toFixed(2)} mm
                                                                        </Typography>
                                                                    </Box>
                                                                </>
                                                            )}
                                                            {design.notes && (
                                                                <Box>
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        Notes
                                                                    </Typography>
                                                                    <Typography variant="body2">
                                                                        {design.notes}
                                                                    </Typography>
                                                                </Box>
                                                            )}
                                                        </Stack>
                                                    </Paper>
                                                </Grid>
                                            </Grid>

                                            {/* Admin & Gem Cutter Actions */}
                                            {design.status === 'pending_approval' && (
                                                (() => {
                                                    const isAdmin = session?.user?.role === 'admin';
                                                    const isGemCutter = session?.user?.artisanTypes?.includes('Gem Cutter') && 
                                                                       session?.user?.userID === request?.gemCutterId;
                                                    const canApprove = isAdmin || isGemCutter;
                                                    
                                                    return canApprove ? (
                                                        <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1 }}>
                                                            <Button
                                                                variant="contained"
                                                                color="success"
                                                                startIcon={<ApproveIcon />}
                                                                onClick={() => handleApproveDesign(design._id)}
                                                                disabled={actionLoading}
                                                                size="small"
                                                            >
                                                                Approve
                                                            </Button>
                                                            <Button
                                                                variant="outlined"
                                                                color="error"
                                                                startIcon={<DeclineIcon />}
                                                                onClick={() => handleDeclineDesign(design._id)}
                                                                disabled={actionLoading}
                                                                size="small"
                                                            >
                                                                Decline
                                                            </Button>
                                                        </Box>
                                                    ) : null;
                                                })()
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                                </Stack>
                            </Box>
                        ) : (
                            <Box sx={{ textAlign: 'center', py: 6 }}>
                                <DesignIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                                <Typography variant="h6" color="text.secondary" gutterBottom>
                                    No STL Files Yet
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    Request must be claimed first
                                </Typography>
                                {request.status === 'claimed' && session?.user?.userID === request.designerId ? (
                                    <>
                                        <input
                                            type="file"
                                            accept=".stl"
                                            onChange={(e) => handleFileSelect(e, 'stl')}
                                            style={{ display: 'none' }}
                                            id="stl-upload-first-input"
                                            disabled={actionLoading}
                                        />
                                        <label htmlFor="stl-upload-first-input">
                                            <Button
                                                variant="contained"
                                                startIcon={<AddIcon />}
                                                component="span"
                                                sx={{ mt: 2 }}
                                                disabled={actionLoading}
                                            >
                                                {actionLoading ? 'Uploading...' : 'Upload STL File'}
                                            </Button>
                                        </label>
                                    </>
                                ) : (
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                        Waiting for designer to upload STL files...
                                    </Typography>
                                )}
                            </Box>
                        )}
                    </Box>
                </TabPanel>

                {/* Comments Tab */}
                <TabPanel value={currentTab} index={4}>
                    <Box>
                        {request.comments && request.comments.length > 0 ? (
                            <List>
                                {request.comments.map((comment) => (
                                    <ListItem key={comment._id}>
                                        <ListItemText
                                            primary={comment.author}
                                            secondary={
                                                <>
                                                    <Typography variant="body2">{comment.text}</Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {new Date(comment.createdAt).toLocaleString()}
                                                    </Typography>
                                                </>
                                            }
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        ) : (
                            <Box sx={{ textAlign: 'center', py: 6 }}>
                                <CommentIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                                <Typography variant="h6" color="text.secondary">
                                    No Comments Yet
                                </Typography>
                            </Box>
                        )}
                    </Box>
                </TabPanel>

                {/* Comments Tab */}
                <TabPanel value={currentTab} index={4}>
                    <Box>
                        {request.comments && request.comments.length > 0 ? (
                            <List>
                                {request.comments.map((comment, idx) => (
                                    <React.Fragment key={idx}>
                                        <ListItem alignItems="flex-start">
                                            <ListItemAvatar>
                                                <Avatar sx={{ bgcolor: 'primary.main' }}>
                                                    {comment.author?.name?.charAt(0) || 'U'}
                                                </Avatar>
                                            </ListItemAvatar>
                                            <ListItemText
                                                primary={
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <Typography variant="subtitle2" fontWeight="bold">
                                                            {comment.author?.name || 'Unknown'}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {new Date(comment.createdAt).toLocaleDateString()}
                                                        </Typography>
                                                    </Box>
                                                }
                                                secondary={comment.text}
                                            />
                                        </ListItem>
                                        {idx < request.comments.length - 1 && <Divider component="li" />}
                                    </React.Fragment>
                                ))}
                            </List>
                        ) : (
                            <Box sx={{ textAlign: 'center', py: 4 }}>
                                <CommentIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                                <Typography variant="body2" color="text.secondary">
                                    No comments yet
                                </Typography>
                            </Box>
                        )}
                    </Box>
                </TabPanel>
            </Paper>

            {/* Dialogs */}
            {/* Comment Dialog */}
            <Dialog open={commentDialog} onClose={() => setCommentDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add Comment</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        multiline
                        rows={4}
                        label="Your comment"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        sx={{ mt: 2 }}
                        placeholder="Share your thoughts..."
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCommentDialog(false)}>Cancel</Button>
                    <Button 
                        variant="contained" 
                        onClick={handleAddComment}
                        disabled={!newComment.trim() || actionLoading}
                        startIcon={<SendIcon />}
                    >
                        Send
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Approval Dialog */}
            <Dialog open={approvalDialog} onClose={() => setApprovalDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {approvalAction === 'approve' ? 'Approve Design' : 'Reject Design'}
                </DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        multiline
                        rows={4}
                        label={approvalAction === 'approve' ? 'Approval notes (optional)' : 'Rejection reason'}
                        value={approvalNotes}
                        onChange={(e) => setApprovalNotes(e.target.value)}
                        sx={{ mt: 2 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setApprovalDialog(false)}>Cancel</Button>
                    <Button 
                        variant="contained" 
                        color={approvalAction === 'approve' ? 'success' : 'error'}
                        onClick={() => {
                            // Handle approval/rejection
                            setApprovalDialog(false);
                        }}
                        disabled={actionLoading}
                    >
                        {approvalAction === 'approve' ? 'Approve' : 'Reject'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Design Feedback Dialog */}
            <Dialog open={designFeedbackDialog} onClose={() => setDesignFeedbackDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Decline Design - Provide Feedback</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        multiline
                        rows={4}
                        label="Feedback for Designer"
                        value={designFeedback}
                        onChange={(e) => setDesignFeedback(e.target.value)}
                        sx={{ mt: 2 }}
                        placeholder="Explain what needs to be improved or changed..."
                        helperText="This feedback will appear in the design notes"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => {
                        setDesignFeedbackDialog(false);
                        setDesignFeedback('');
                        setFeedbackDesignId(null);
                    }}>Cancel</Button>
                    <Button 
                        variant="contained" 
                        color="error"
                        onClick={() => {
                            // Handle decline with feedback
                            setDesignFeedbackDialog(false);
                            setDesignFeedback('');
                            setFeedbackDesignId(null);
                        }}
                        disabled={!designFeedback.trim() || actionLoading}
                    >
                        Submit Feedback & Decline
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}
