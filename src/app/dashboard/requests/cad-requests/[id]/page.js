'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { METAL_TYPES, METAL_GROUPS, calculateWaxWeight, calculateMetalWeight, adjustPriceForPurity, calculateMetalCost, calculateMountingCOG, getAllMetalOptions } from '@/constants/metalTypes';
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
    InputLabel,
    Checkbox,
    FormControlLabel,
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
import OBJViewer from '@/components/viewers/OBJViewer';
import ModelViewerWebComponent from '@/components/viewers/ModelViewerWebComponent';
import STLViewer from '@/components/viewers/STLViewer';
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
    const [selectedStlDesign, setSelectedStlDesign] = useState(null);
    
    // Design management
    const [designFeedbackDialog, setDesignFeedbackDialog] = useState(false);
    const [designFeedback, setDesignFeedback] = useState('');
    const [feedbackDesignId, setFeedbackDesignId] = useState(null);

    // Configuration & Pricing states
    const [configurationStates, setConfigurationStates] = useState({});
    const [savingConfiguration, setSavingConfiguration] = useState(null);
    
    // Metal COG states
    const [metalCostStates, setMetalCostStates] = useState({});
    const [selectedMetals, setSelectedMetals] = useState({});
    const [metalPrices, setMetalPrices] = useState(null);
    const [loadingMetalPrices, setLoadingMetalPrices] = useState(false);

    // Auto-select first GLB design when designs load
    useEffect(() => {
        if (currentTab !== 2) return; // Only run when GLB tab is active
        const glbDesigns = uploadedDesigns.filter(d => d.files?.glb);
        console.log('🔍 GLB Designs filtered:', glbDesigns.length, glbDesigns);
        if (glbDesigns.length > 0 && !selectedGlbDesign) {
            console.log('✅ Auto-selecting first GLB design:', glbDesigns[0]);
            setSelectedGlbDesign(glbDesigns[0]);
        }
    }, [uploadedDesigns, selectedGlbDesign, currentTab]);

    // Auto-select first STL design when designs load
    useEffect(() => {
        if (currentTab !== 3) return; // Only run when STL tab is active
        const stlDesigns = uploadedDesigns.filter(d => d.files?.stl);
        console.log('🔍 STL Designs filtered:', stlDesigns.length, stlDesigns);
        if (stlDesigns.length > 0 && !selectedStlDesign) {
            console.log('✅ Auto-selecting first STL design:', stlDesigns[0]);
            setSelectedStlDesign(stlDesigns[0]);
        }
    }, [uploadedDesigns, selectedStlDesign, currentTab]);

    // Load metal prices on component mount
    useEffect(() => {
        const fetchMetalPrices = async () => {
            try {
                setLoadingMetalPrices(true);
                const response = await fetch('/api/metal-prices');
                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        setMetalPrices(data.prices);
                    }
                }
            } catch (error) {
                console.error('Error fetching metal prices:', error);
            } finally {
                setLoadingMetalPrices(false);
            }
        };
        fetchMetalPrices();
    }, []);

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
            
            // Load saved COG data if available
            if (data.request?.cogData || (data.cadRequests && data.cadRequests[0]?.cogData)) {
                const cogData = data.request?.cogData || data.cadRequests[0]?.cogData;
                console.log('✅ Loading saved COG data:', cogData);
                if (cogData.configurations) {
                    setConfigurationStates(cogData.configurations);
                }
                if (cogData.selectedMetals) {
                    setSelectedMetals(cogData.selectedMetals);
                }
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
            setError('Only CAD Designers can claim requests');
            return;
        }

        try {
            setActionLoading(true);
            const response = await fetch(`/api/cad-requests/${id}/claim`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    designerId: session.user.userID,
                    designerName: session.user.name || 'Jeweler',
                    designerEmail: session.user.email
                })
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

    const handleDeleteDesign = async (designId, fileType = 'glb') => {
        if (!window.confirm(`Are you sure you want to delete this ${fileType.toUpperCase()} file?`)) {
            return;
        }

        try {
            setActionLoading(true);
            
            // Pass fileType as query parameter so backend knows which file to delete
            const url = `/api/designs/${designId}?fileType=${fileType}`;
            console.log(`🗑️ Deleting design ${designId}, fileType: ${fileType}`);
            
            const response = await fetch(url, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete file');
            }
            
            const data = await response.json();
            console.log('✅ Delete response:', data);
            
            // Show success message
            alert(`✅ ${fileType.toUpperCase()} file deleted successfully!`);
            
            await loadRequest();
        } catch (err) {
            console.error('❌ Delete error:', err);
            setError(err.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleApproveDesign = async (designId) => {
        try {
            setActionLoading(true);
            // Handle both old (_id) and new (id) format
            const actualDesignId = designId || designId;
            console.log('📤 Approving design with ID:', actualDesignId);
            
            const response = await fetch(`/api/designs/${actualDesignId}/approve`, {
                method: 'POST',
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

    const handleApprovalSubmit = async () => {
        try {
            setActionLoading(true);

            if (approvalAction === 'approve') {
                // Call the approve endpoint to link design to gemstone
                const response = await fetch(`/api/cad-requests/${id}/approve`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        approvalNotes: approvalNotes,
                        approvedBy: session.user.userID,
                        approverName: session.user.name,
                        approverEmail: session.user.email
                    })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Failed to approve design');
                }

                const data = await response.json();
                setApprovalDialog(false);
                setApprovalNotes('');
                setApprovalAction('');
                setError('');
                
                // Show success message
                setTimeout(() => {
                    alert(`✅ Design approved and linked to gemstone!\n\nDesign ID: ${data.designId}\nGemstone: ${data.gemstoneTitle}`);
                }, 500);
                
                await loadRequest();
            } else if (approvalAction === 'reject') {
                // Call reject endpoint
                const response = await fetch(`/api/cad-requests/${id}/reject`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        rejectionReason: approvalNotes,
                        rejectedBy: session.user.userID,
                        rejectorName: session.user.name,
                        rejectorEmail: session.user.email
                    })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Failed to reject design');
                }

                setApprovalDialog(false);
                setApprovalNotes('');
                setApprovalAction('');
                
                // Show success message
                setTimeout(() => {
                    alert('❌ Design rejected. Rejection reason sent to designer.');
                }, 500);
                
                await loadRequest();
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeclineDesign = (designId) => {
        // Open the design feedback modal
        setFeedbackDesignId(designId);
        setDesignFeedback('');
        setDesignFeedbackDialog(true);
    };

    const handleSubmitDesignFeedback = async () => {
        if (!designFeedback.trim()) {
            setError('Feedback is required when declining a design');
            return;
        }

        try {
            setActionLoading(true);
            console.log('📤 Starting decline process for design:', feedbackDesignId);
            console.log('📝 Feedback:', designFeedback.trim());
            
            // Step 1: Decline the design
            console.log('🔄 Calling decline endpoint:', `/api/designs/${feedbackDesignId}/decline`);
            const declineResponse = await fetch(`/api/designs/${feedbackDesignId}/decline`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    statusNotes: designFeedback.trim()
                })
            });

            console.log('📥 Decline response status:', declineResponse.status);
            const declineData = await declineResponse.json();
            console.log('📥 Decline response data:', declineData);

            if (!declineResponse.ok) {
                console.error('❌ Decline failed:', declineData);
                throw new Error(declineData.error || 'Failed to decline design');
            }
            
            console.log('✅ Design declined successfully');
            
            // Step 2: Post the feedback as a comment on the CAD request
            console.log('💬 Posting comment to CAD request:', id);
            const commentResponse = await fetch(`/api/cad-requests/${id}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    comment: `Design Feedback: ${designFeedback.trim()}`,
                    userId: session.user.userID
                })
            });

            console.log('📥 Comment response status:', commentResponse.status);
            if (!commentResponse.ok) {
                const commentError = await commentResponse.json();
                console.warn('⚠️ Design declined but comment post failed:', commentError);
                // Don't throw - design was declined, comment is secondary
            } else {
                console.log('✅ Comment posted successfully');
            }
            
            // Close dialog and reload
            setDesignFeedbackDialog(false);
            setDesignFeedback('');
            setFeedbackDesignId(null);
            
            console.log('🔄 Reloading request data');
            await loadRequest();
            
            // Show success message
            setTimeout(() => {
                alert('✅ Design declined and feedback posted to comments.');
            }, 500);
        } catch (err) {
            console.error('❌ Decline error:', err);
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

    const handleGemstoneOBJUpload = async (e, productId) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.name.toLowerCase().endsWith('.obj')) {
            setError('Please select a valid .obj file');
            e.target.value = '';
            return;
        }

        // Validate file size (max 50MB)
        const maxSize = 50 * 1024 * 1024;
        if (file.size > maxSize) {
            setError(`File size exceeds ${maxSize / (1024 * 1024)}MB limit`);
            e.target.value = '';
            return;
        }

        try {
            setActionLoading(true);
            const formData = new FormData();
            formData.append('objFile', file);
            
            console.log(`📤 Uploading OBJ file: ${file.name} for gemstone ${productId}`);

            const response = await fetch(`/api/products/gemstones/${productId}/upload-obj`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to upload OBJ file');
            }

            const responseData = await response.json();
            console.log('✅ OBJ file uploaded successfully:', responseData);
            setError(''); // Clear error on success
            
            // Show success message
            setError(''); // This will clear any previous errors
            // You could add a success toast here if you have a toast library
            
            // Reset file input
            e.target.value = '';
            
            // Reload request data to show updated gemstone
            await loadRequest();
        } catch (err) {
            setError(err.message);
            console.error('❌ OBJ file upload error:', err);
        } finally {
            setActionLoading(false);
        }
    };

    // Save design configuration and COG
    const handleSaveConfiguration = async (designId) => {
        try {
            setSavingConfiguration(designId);
            setError('');

            const config = configurationStates[designId] || {};
            console.log('💾 Saving configuration for design:', designId, config);

            const response = await fetch(`/api/designs/${designId}/configure`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });

            const data = await response.json();
            console.log('📥 Save response:', data);

            if (!response.ok) {
                throw new Error(data.error || 'Failed to save configuration');
            }

            console.log('✅ Configuration saved successfully');
            
            // Update local state
            setConfigurationStates(prev => ({
                ...prev,
                [designId]: config
            }));

            // Show success message
            setError(''); // Clear any previous errors
            
            // Reload request to get updated data
            await loadRequest();

        } catch (err) {
            console.error('❌ Configuration save error:', err);
            setError(err.message);
        } finally {
            setSavingConfiguration(null);
        }
    };

    // Update configuration state
    const handleConfigurationChange = (designId, field, value) => {
        setConfigurationStates(prev => ({
            ...prev,
            [designId]: {
                ...(prev[designId] || {}),
                [field]: value
            }
        }));
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

            {/* Design Feedback Dialog */}
            <Dialog 
                open={designFeedbackDialog} 
                onClose={() => setDesignFeedbackDialog(false)} 
                maxWidth="sm" 
                fullWidth
                disableRestoreFocus
                disableAutoFocus
            >
                <DialogTitle>Design Feedback</DialogTitle>
                <DialogContent sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Please enter feedback for the designer about why this design was declined. This will be posted to the comments tab and included in the design status.
                    </Typography>
                    <TextField
                        fullWidth
                        multiline
                        rows={4}
                        placeholder="Enter your feedback here..."
                        value={designFeedback}
                        onChange={(e) => setDesignFeedback(e.target.value)}
                        disabled={actionLoading}
                        autoFocus={false}
                        onMouseDown={(e) => e.preventDefault()}
                    />
                </DialogContent>
                <DialogActions>
                    <Button 
                        onClick={() => {
                            setDesignFeedbackDialog(false);
                            setDesignFeedback('');
                            setFeedbackDesignId(null);
                        }}
                        disabled={actionLoading}
                    >
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleSubmitDesignFeedback} 
                        variant="contained"
                        color="error"
                        disabled={actionLoading || !designFeedback.trim()}
                        startIcon={actionLoading ? <CircularProgress size={20} /> : null}
                    >
                        {actionLoading ? 'Declining...' : 'Decline Design'}
                    </Button>
                </DialogActions>
            </Dialog>

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
                    name: request.designerName || 'Jeweler',
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
                            <MenuItem value={2} disabled={uploadedDesigns.filter(d => d.files?.stl).length === 0}>
                                {`GLB Designs (${uploadedDesigns.filter(d => d.files?.glb).length})`}
                                {uploadedDesigns.filter(d => d.files?.stl).length === 0 && ' - Locked'}
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
                            disabled={uploadedDesigns.filter(d => d.files?.stl).length === 0}
                            sx={{
                                opacity: uploadedDesigns.filter(d => d.files?.stl).length === 0 ? 0.5 : 1,
                                cursor: uploadedDesigns.filter(d => d.files?.stl).length === 0 ? 'not-allowed' : 'pointer'
                            }}
                            title={uploadedDesigns.filter(d => d.files?.stl).length === 0 ? 'GLB upload unlocked after STL is uploaded' : ''}
                        />
                        <Tab label={`STL Files (${uploadedDesigns.filter(d => d.files?.stl).length})`} />
                        <Tab label="Comments" />
                        {session?.user?.role === 'admin' && (
                            <Tab label="COG" sx={{ fontWeight: 600, color: 'primary.main' }} />
                        )}
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
                                <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 2 }}>
                                    {gemstone.obj3DFile?.url ? (
                                        <Paper sx={{ height: '600px', overflow: 'hidden', p: 2 }}>
                                            <Typography variant="subtitle2" gutterBottom color="text.secondary">
                                                3D Gemstone Model
                                            </Typography>
                                            <OBJViewer 
                                                fileUrl={gemstone.obj3DFile.url}
                                                title={`3D model of ${gemstone.gemstone?.species || 'Gemstone'}`}
                                                style={{ height: '550px', width: '100%' }}
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

                                    {/* OBJ File Upload Section - Fallback option for designers */}
                                    {(() => {
                                        // Check if user is a Jeweler or admin
                                        const isDesigner = session?.user?.artisanTypes?.includes('CAD Designer');
                                        const isAdmin = session?.user?.role === 'admin';
                                        const canUpload = isDesigner || isAdmin;

                                        return canUpload ? (
                                            <Card variant="outlined">
                                                <CardContent>
                                                    <Typography variant="subtitle2" gutterBottom color="text.secondary">
                                                        📤 Upload Gemstone OBJ File
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                                        If the gemstone OBJ model is not available, you can upload one here as a fallback.
                                                    </Typography>
                                                    
                                                    {gemstone.obj3DFile?.url && (
                                                        <Alert severity="info" sx={{ mb: 2 }}>
                                                            <Typography variant="caption">
                                                                Current file: {gemstone.obj3DFile.filename} 
                                                                {gemstone.obj3DFile.uploadedAt && ` (${new Date(gemstone.obj3DFile.uploadedAt).toLocaleDateString()})`}
                                                            </Typography>
                                                        </Alert>
                                                    )}

                                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                                        <input
                                                            type="file"
                                                            accept=".obj"
                                                            onChange={(e) => handleGemstoneOBJUpload(e, gemstone.productId)}
                                                            style={{ display: 'none' }}
                                                            id="gemstone-obj-upload"
                                                            disabled={actionLoading}
                                                        />
                                                        <label htmlFor="gemstone-obj-upload" style={{ flex: 1 }}>
                                                            <Button
                                                                variant="contained"
                                                                component="span"
                                                                startIcon={<UploadIcon />}
                                                                fullWidth
                                                                disabled={actionLoading}
                                                            >
                                                                {actionLoading ? 'Uploading...' : 'Choose OBJ File'}
                                                            </Button>
                                                        </label>
                                                    </Box>
                                                    
                                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                                                        Max file size: 50MB | Format: .obj
                                                    </Typography>
                                                </CardContent>
                                            </Card>
                                        ) : null;
                                    })()}
                                </Box>
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
                                        <Paper 
                                            key={`viewer-${selectedGlbDesign.id || selectedGlbDesign._id}`} 
                                            sx={{ height: '100%', minHeight: '700px', overflow: 'hidden', position: 'relative' }}
                                        >
                                            <ModelViewerWebComponent 
                                                key={`model-${selectedGlbDesign.files.glb.url}`}
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

                                                    {/* Declined Status Alert */}
                                                    {design.status === 'declined' && (
                                                        <Alert severity="error" sx={{ mb: 1.5 }}>
                                                            <Typography variant="caption">
                                                                <strong>Design Declined</strong>
                                                                {design.declinedByName && ` by ${design.declinedByName}`}
                                                            </Typography>
                                                            {design.statusNotes && (
                                                                <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                                                                    Reason: {design.statusNotes}
                                                                </Typography>
                                                            )}
                                                        </Alert>
                                                    )}

                                                    {/* Designer Replace Declined GLB Option */}
                                                    {design.status === 'declined' && session?.user?.userID === request?.designerId && (
                                                        <Box sx={{ mb: 1.5 }}>
                                                            <input
                                                                type="file"
                                                                accept=".glb,.gltf"
                                                                onChange={(e) => {
                                                                    const file = e.target.files?.[0];
                                                                    if (file) {
                                                                        console.log('🔄 Replacing declined GLB:', file.name);
                                                                        handleFileSelect(e, 'glb');
                                                                    }
                                                                }}
                                                                style={{ display: 'none' }}
                                                                id={`replace-glb-${design.id || design._id}`}
                                                                disabled={actionLoading}
                                                            />
                                                            <label htmlFor={`replace-glb-${design.id || design._id}`}>
                                                                <Button
                                                                    variant="outlined"
                                                                    color="warning"
                                                                    size="small"
                                                                    component="span"
                                                                    fullWidth
                                                                    startIcon={<UploadIcon />}
                                                                    disabled={actionLoading}
                                                                >
                                                                    Replace GLB File
                                                                </Button>
                                                            </label>
                                                        </Box>
                                                    )}

                                                    {/* Actions */}
                                                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                                                        {(session?.user?.userID === design?.designerId || session?.user?.userID === request?.assignedDesigner?.userId || session?.user?.role === 'admin' || session?.user?.artisanTypes?.includes('Gem Cutter')) && (
                                                            <Tooltip title="Delete Design">
                                                                <IconButton
                                                                    size="small"
                                                                    color="error"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDeleteDesign(design.id || design._id?.toString?.() || design._id, 'glb');
                                                                    }}
                                                                    disabled={actionLoading}
                                                                >
                                                                    <CloseIcon fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        )}
                                                    </Box>

                                                    {/* Admin Actions */}
                                                    {(design.status === 'stl_approved' || design.status === 'glb_only' || design.status === 'complete') && design.status !== 'approved' && (
                                                        (() => {
                                                            const isAdmin = session?.user?.role === 'admin';
                                                            const isGemCutter = session?.user?.artisanTypes?.includes('Gem Cutter');
                                                            const canApprove = isAdmin || isGemCutter;
                                                            
                                                            return canApprove ? (
                                                                <Box sx={{ mt: 1, pt: 1, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 0.5 }}>
                                                                    <Button
                                                                        variant="contained"
                                                                        color="success"
                                                                        size="small"
                                                                        fullWidth
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleApproveDesign(design.id || design._id?.toString?.() || design._id);
                                                                        }}
                                                                        disabled={actionLoading}
                                                                    >
                                                                        Approve Design
                                                                    </Button>
                                                                    <Button
                                                                        variant="outlined"
                                                                        color="error"
                                                                        size="small"
                                                                        fullWidth
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleDeclineDesign(design.id || design._id?.toString?.() || design._id);
                                                                        }}
                                                                        disabled={actionLoading}
                                                                    >
                                                                        Decline
                                                                    </Button>
                                                                </Box>
                                                            ) : null;
                                                        })()
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
                                {uploadedDesigns.filter(d => d.files?.stl).length === 0 ? (
                                    <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                                        🔒 GLB upload is locked until STL is uploaded
                                    </Typography>
                                ) : (request.status === 'in_progress' || request.status === 'design_submitted' || request.status === 'stl_approved') && session?.user?.userID === request.designerId ? (
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
                            <Grid container spacing={2} sx={{ minHeight: '700px' }}>
                                {/* Left Column: 3D Viewer */}
                                <Grid item xs={12} md={7}>
                                    {selectedStlDesign && selectedStlDesign.files?.stl?.url ? (
                                        <Paper key={`stl-viewer-${selectedStlDesign._id}`} sx={{ height: '100%', minHeight: '700px', overflow: 'hidden' }}>
                                            <STLViewer 
                                                fileUrl={selectedStlDesign.files.stl.url}
                                                title={selectedStlDesign.title}
                                                style={{ width: '100%', height: '100%' }}
                                            />
                                        </Paper>
                                    ) : (
                                        <Paper sx={{ height: '100%', minHeight: '700px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', bgcolor: '#fafafa' }}>
                                            <DesignIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
                                            <Typography variant="h6" color="text.secondary" gutterBottom>
                                                Select a model to preview
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Click on an STL file in the list to view it in 3D
                                            </Typography>
                                        </Paper>
                                    )}
                                </Grid>

                                {/* Right Column: STL List */}
                                <Grid item xs={12} md={5}>
                                    <Stack spacing={2} sx={{ height: '100%', overflow: 'auto', maxHeight: '700px', pr: 1 }}>
                                        {/* Upload Button */}
                                        {(request.status === 'in_progress' || request.status === 'stl_approved') && session?.user?.userID === request.designerId && (
                                            <Box sx={{ mb: 1 }}>
                                                <input
                                                    type="file"
                                                    accept=".stl"
                                                    onChange={(e) => handleFileSelect(e, 'stl')}
                                                    style={{ display: 'none' }}
                                                    id="stl-upload-list-input"
                                                    disabled={actionLoading}
                                                />
                                                <label htmlFor="stl-upload-list-input">
                                                    <Button
                                                        variant="contained"
                                                        startIcon={<AddIcon />}
                                                        component="span"
                                                        fullWidth
                                                        disabled={actionLoading}
                                                    >
                                                        {actionLoading ? 'Uploading...' : 'Upload Another STL'}
                                                    </Button>
                                                </label>
                                            </Box>
                                        )}

                                        {/* STL Files List */}
                                        {uploadedDesigns.filter(d => d.files?.stl).map((design, idx) => (
                                            <Card 
                                                key={idx}
                                                variant="outlined"
                                                sx={{
                                                    cursor: 'pointer',
                                                    backgroundColor: selectedStlDesign?._id === design._id ? 'primary.lighter' : 'background.paper',
                                                    border: selectedStlDesign?._id === design._id ? '2px solid' : '1px solid',
                                                    borderColor: selectedStlDesign?._id === design._id ? 'primary.main' : 'divider',
                                                    transition: 'all 0.2s ease',
                                                    '&:hover': {
                                                        boxShadow: 2,
                                                        borderColor: 'primary.main'
                                                    }
                                                }}
                                                onClick={() => {
                                                    console.log('🖱️ STL Card clicked:', design);
                                                    setSelectedStlDesign(design);
                                                }}
                                            >
                                                <CardContent sx={{ pb: 2 }}>
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
                                                            {design.description.substring(0, 80)}...
                                                        </Typography>
                                                    )}

                                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                                                        by {design.designerName}
                                                    </Typography>

                                                    {/* Print Specs */}
                                                    <Box sx={{ mb: 1.5, p: 1, bgcolor: '#f0f7ff', borderRadius: 1 }}>
                                                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                                                            <Box>
                                                                <Typography variant="caption" color="text.secondary" fontSize="0.7rem">
                                                                    VOLUME
                                                                </Typography>
                                                                <Typography variant="body2" fontWeight="bold" color="primary">
                                                                    {design.printVolume || 0} mm³
                                                                </Typography>
                                                            </Box>
                                                            {design.meshStats && (
                                                                <Box>
                                                                    <Typography variant="caption" color="text.secondary" fontSize="0.7rem">
                                                                        SIZE
                                                                    </Typography>
                                                                    <Typography variant="caption" display="block" fontWeight="medium">
                                                                        {design.meshStats.width?.toFixed(1)} × {design.meshStats.height?.toFixed(1)} mm
                                                                    </Typography>
                                                                </Box>
                                                            )}
                                                        </Box>
                                                    </Box>

                                                    {/* File Info */}
                                                    {design.files?.stl && (
                                                        <Box sx={{ mb: 1.5, p: 1, bgcolor: '#fafafa', borderRadius: 1 }}>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'space-between' }}>
                                                                <Typography variant="caption" sx={{ fontSize: '0.75rem', fontWeight: 500, flex: 1, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                                                    {design.files.stl.originalName}
                                                                </Typography>
                                                                {design.files.stl.size && (
                                                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                                                                        {(design.files.stl.size / (1024 * 1024)).toFixed(1)} MB
                                                                    </Typography>
                                                                )}
                                                            </Box>
                                                        </Box>
                                                    )}

                                                    {/* Actions */}
                                                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                                                        {(session?.user?.userID === design?.designerId || session?.user?.userID === request.designerId || session?.user?.role === 'admin' || session?.user?.artisanTypes?.includes('Gem Cutter')) && (
                                                            <Tooltip title="Delete STL File">
                                                                <IconButton
                                                                    size="small"
                                                                    color="error"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDeleteDesign(design.id || design._id?.toString?.() || design._id, 'stl');
                                                                    }}
                                                                    disabled={actionLoading}
                                                                >
                                                                    <CloseIcon fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        )}
                                                    </Box>

                                                    {/* Admin & Gem Cutter Actions */}
                                                    {(design.status === 'stl_only' || design.status === 'stl_submitted') && design.status !== 'stl_approved' && (
                                                        (() => {
                                                            const isAdmin = session?.user?.role === 'admin';
                                                            const isGemCutter = session?.user?.artisanTypes?.includes('Gem Cutter');
                                                            const canApprove = isAdmin || isGemCutter;
                                                            
                                                            return canApprove ? (
                                                                <Box sx={{ mt: 1, pt: 1, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 0.5 }}>
                                                                    <Button
                                                                        variant="contained"
                                                                        color="success"
                                                                        size="small"
                                                                        fullWidth
                                                                        startIcon={<CheckIcon />}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleApproveDesign(design.id || design._id?.toString?.() || design._id);
                                                                        }}
                                                                        disabled={actionLoading}
                                                                    >
                                                                        Approve STL
                                                                    </Button>
                                                                    <Button
                                                                        variant="outlined"
                                                                        color="error"
                                                                        size="small"
                                                                        fullWidth
                                                                        startIcon={<CloseIcon />}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleDeclineDesign(design.id || design._id?.toString?.() || design._id);
                                                                        }}
                                                                        disabled={actionLoading}
                                                                    >
                                                                        Decline
                                                                    </Button>
                                                                </Box>
                                                            ) : null;
                                                        })()
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
                                <DesignIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                                <Typography variant="h6" color="text.secondary" gutterBottom>
                                    No STL Files Yet
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    Request must be claimed first
                                </Typography>
                                {(request.status === 'in_progress' || request.status === 'stl_approved') && session?.user?.userID === request.designerId ? (
                                    <>
                                        <input
                                            type="file"
                                            accept=".stl"
                                            onChange={(e) => handleFileSelect(e, 'stl')}
                                            style={{ display: 'none' }}
                                            id="stl-upload-empty-input"
                                            disabled={actionLoading}
                                        />
                                        <label htmlFor="stl-upload-empty-input">
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

                {/* COG Tab (Admin Only) */}
                <TabPanel value={currentTab} index={5}>
                    {session?.user?.role === 'admin' ? (
                        <Box>
                            <Alert severity="info" sx={{ mb: 3 }}>
                                Complete Cost of Goods (COG) calculation including mounting metals, labor, and additional costs.
                            </Alert>

                            {uploadedDesigns.filter(d => d.files?.stl).length > 0 ? (
                                <Grid container spacing={3}>
                                    {/* Main COG Form */}
                                    <Grid item xs={12}>
                                        {uploadedDesigns.filter(d => d.files?.stl).map((design) => {
                                            const designKey = design.id || design._id;
                                            const designState = configurationStates[designKey] || {};
                                            const selectedMetal = selectedMetals[designKey];
                                            
                                            // Get STL volume - check multiple possible locations
                                            const stlVolume = parseFloat(
                                                design.printVolume || 
                                                design.files?.stl?.volumeMm3 || 
                                                design.volumeMm3 || 
                                                0
                                            );
                                            
                                            const waxWeight = calculateWaxWeight(stlVolume);
                                            
                                            // Note: Metal calculations are now done per-card for each selected metal
                                            // No need for single metal calculations here
                                            
                                            // Parse all COG inputs with defaults
                                            const cadLabor = parseFloat(designState.cadLabor) || 50;
                                            const isPendant = designState.isPendant === 'true' || designState.isPendant === true;
                                            const chainCost = parseFloat(designState.chainCost) || 0;
                                            const productionLabor = parseFloat(designState.productionLabor) || 110;
                                            const shippingCost = parseFloat(designState.shippingCost) || 70;
                                            const marketingCost = parseFloat(designState.marketingCost) || 20;
                                            const packagingCost = parseFloat(designState.packagingCost) || 12;
                                            const mountingLabor = parseFloat(designState.mountingLabor) || 15;
                                            
                                            // Note: Individual metal costs are calculated per-card in the Metal Price Cards Grid
                                            // Non-metal COG components (shared across all metal options)
                                            const sharedCOGCosts = cadLabor + (isPendant ? chainCost : 0) + productionLabor + shippingCost + marketingCost + packagingCost;
                                            
                                            const handleInputChange = (field, value) => {
                                                setConfigurationStates(prev => ({
                                                    ...prev,
                                                    [designKey]: {
                                                        ...prev[designKey],
                                                        [field]: value
                                                    }
                                                }));
                                            };
                                            
                                            return (
                                                <Card key={designKey} sx={{ p: 3, mb: 3 }}>
                                                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                                                        {design.title || 'Untitled Design'} - Cost of Goods (COG)
                                                    </Typography>
                                                    
                                                    <Grid container spacing={2}>
                                                        {/* Design Info Section */}
                                                        <Grid item xs={12} md={6}>
                                                            <Card variant="outlined" sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                                                                <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5 }}>
                                                                    Design Information
                                                                </Typography>
                                                                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, fontSize: '0.875rem' }}>
                                                                    <Typography color="text.secondary">STL Volume:</Typography>
                                                                    <Typography fontWeight="medium">{stlVolume.toFixed(2)} mm³</Typography>
                                                                    
                                                                    <Typography color="text.secondary">Wax Weight:</Typography>
                                                                    <Typography fontWeight="medium">{waxWeight.toFixed(3)}g</Typography>
                                                                </Box>
                                                            </Card>
                                                        </Grid>
                                                        
                                                        {/* Pendant Selection */}
                                                        <Grid item xs={12} md={6}>
                                                            <Card variant="outlined" sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                                                                <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5 }}>
                                                                    Product Type
                                                                </Typography>
                                                                <FormControl fullWidth>
                                                                    <InputLabel>Is this a pendant?</InputLabel>
                                                                    <Select
                                                                        label="Is this a pendant?"
                                                                        value={isPendant ? 'true' : 'false'}
                                                                        onChange={(e) => handleInputChange('isPendant', e.target.value)}
                                                                    >
                                                                        <MenuItem value="false">No</MenuItem>
                                                                        <MenuItem value="true">Yes</MenuItem>
                                                                    </Select>
                                                                </FormControl>
                                                            </Card>
                                                        </Grid>
                                                        
                                                    {/* Mounting Metal Section */}
                                                    <Grid item xs={12}>
                                                        <Card variant="outlined" sx={{ p: 2, bgcolor: '#e3f2fd' }}>
                                                            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2 }}>
                                                                Available Metals for Mounting
                                                            </Typography>
                                                            
                                                            {/* Mounting Labor Input */}
                                                            <Grid container spacing={2} sx={{ mb: 3 }}>
                                                                <Grid item xs={12} md={4}>
                                                                    <TextField
                                                                        fullWidth
                                                                        label="Mounting Labor ($)"
                                                                        type="number"
                                                                        inputProps={{ step: "0.01", min: "0" }}
                                                                        value={mountingLabor}
                                                                        onChange={(e) => handleInputChange('mountingLabor', e.target.value)}
                                                                        helperText="Labor cost for setting stone"
                                                                    />
                                                                </Grid>
                                                            </Grid>

                                                            {/* Metal Selection Checkboxes */}
                                                            <Typography variant="body2" sx={{ mb: 1.5, color: 'text.secondary' }}>
                                                                Select metals to show available options:
                                                            </Typography>
                                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                                                                {getAllMetalOptions().map((metalOption) => {
                                                                    const isSelected = selectedMetals[designKey]?.includes(metalOption.key);
                                                                    return (
                                                                        <FormControlLabel
                                                                            key={metalOption.key}
                                                                            control={
                                                                                <Checkbox
                                                                                    checked={isSelected || false}
                                                                                    onChange={(e) => {
                                                                                        if (e.target.checked) {
                                                                                            // Add to selected metals
                                                                                            setSelectedMetals(prev => ({
                                                                                                ...prev,
                                                                                                [designKey]: [...(prev[designKey] || []), metalOption.key]
                                                                                            }));
                                                                                        } else {
                                                                                            // Remove from selected metals
                                                                                            setSelectedMetals(prev => ({
                                                                                                ...prev,
                                                                                                [designKey]: (prev[designKey] || []).filter(m => m !== metalOption.key)
                                                                                            }));
                                                                                        }
                                                                                    }}
                                                                                />
                                                                            }
                                                                            label={metalOption.label}
                                                                        />
                                                                    );
                                                                })}
                                                            </Box>

                                                            {/* Metal Price Cards Grid */}
                                                            {metalPrices && selectedMetals[designKey]?.length > 0 && (
                                                                <Grid container spacing={2}>
                                                                    {selectedMetals[designKey].map((metalKey) => {
                                                                        const metalMeta = METAL_TYPES[metalKey];
                                                                        if (!metalMeta) return null; // Skip if metal not found
                                                                        
                                                                        const categoryPrice = metalPrices[metalMeta.category] || 0;
                                                                        const adjustedPrice = adjustPriceForPurity(categoryPrice, metalKey);
                                                                        const mWeight = calculateMetalWeight(waxWeight, metalMeta.sg);
                                                                        const mCost = calculateMetalCost(mWeight, adjustedPrice);
                                                                        const mTotal = mCost + mountingLabor;

                                                                        return (
                                                                            <Grid item xs={12} sm={6} md={4} key={metalKey}>
                                                                                <Card 
                                                                                    sx={{ 
                                                                                        p: 2, 
                                                                                        bgcolor: 'white', 
                                                                                        border: '2px solid #90caf9',
                                                                                        height: '100%',
                                                                                        display: 'flex',
                                                                                        flexDirection: 'column'
                                                                                    }}
                                                                                >
                                                                                    <Typography 
                                                                                        variant="subtitle2" 
                                                                                        fontWeight="bold" 
                                                                                        sx={{ mb: 1.5, color: 'primary.main' }}
                                                                                    >
                                                                                        {metalMeta?.label || 'Unknown Metal'}
                                                                                    </Typography>
                                                                                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.75, fontSize: '0.875rem' }}>
                                                                                        <Typography color="text.secondary">Metal Weight:</Typography>
                                                                                        <Typography fontWeight="medium">{mWeight.toFixed(3)}g</Typography>
                                                                                        
                                                                                        <Typography color="text.secondary">Price/gram:</Typography>
                                                                                        <Typography fontWeight="medium">${adjustedPrice.toFixed(2)}</Typography>
                                                                                        
                                                                                        <Typography color="text.secondary">Metal Cost:</Typography>
                                                                                        <Typography fontWeight="medium">${mCost.toFixed(2)}</Typography>
                                                                                        
                                                                                        <Typography color="text.secondary">Labor:</Typography>
                                                                                        <Typography fontWeight="medium">${mountingLabor.toFixed(2)}</Typography>
                                                                                        
                                                                                        <Divider sx={{ gridColumn: '1 / -1' }} />
                                                                                        <Typography fontWeight="bold" sx={{ color: 'primary.dark' }}>Total:</Typography>
                                                                                        <Typography 
                                                                                            fontWeight="bold" 
                                                                                            sx={{ color: 'primary.main', fontSize: '1rem' }}
                                                                                        >
                                                                                            ${mTotal.toFixed(2)}
                                                                                        </Typography>
                                                                                    </Box>
                                                                                </Card>
                                                                            </Grid>
                                                                        );
                                                                    })}
                                                                </Grid>
                                                            )}

                                                            {!selectedMetals[designKey]?.length && (
                                                                <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                                                                    Select metals above to see pricing breakdown for each option
                                                                </Typography>
                                                            )}
                                                        </Card>
                                                    </Grid>
                                                        
                                                        {/* CAD Labor */}
                                                        <Grid item xs={12} md={6}>
                                                            <TextField
                                                                fullWidth
                                                                label="CAD/Design Labor ($)"
                                                                type="number"
                                                                inputProps={{ step: "0.01", min: "0" }}
                                                                value={cadLabor}
                                                                onChange={(e) => handleInputChange('cadLabor', e.target.value)}
                                                                helperText="Designer compensation"
                                                            />
                                                        </Grid>
                                                        
                                                        {/* Chain Cost (if pendant) */}
                                                        {isPendant && (
                                                            <Grid item xs={12} md={6}>
                                                                <TextField
                                                                    fullWidth
                                                                    label="Chain Cost ($)"
                                                                    type="number"
                                                                    inputProps={{ step: "0.01", min: "0" }}
                                                                    value={chainCost}
                                                                    onChange={(e) => handleInputChange('chainCost', e.target.value)}
                                                                    helperText="Cost of chain for pendant"
                                                                />
                                                            </Grid>
                                                        )}
                                                        
                                                        {/* Production Labor */}
                                                        <Grid item xs={12} md={6}>
                                                            <TextField
                                                                fullWidth
                                                                label="Production Labor ($)"
                                                                type="number"
                                                                inputProps={{ step: "0.01", min: "0" }}
                                                                value={productionLabor}
                                                                onChange={(e) => handleInputChange('productionLabor', e.target.value)}
                                                                helperText="Jeweler labor cost"
                                                            />
                                                        </Grid>
                                                        
                                                        {/* Shipping Cost */}
                                                        <Grid item xs={12} md={6}>
                                                            <TextField
                                                                fullWidth
                                                                label="Shipping Cost ($)"
                                                                type="number"
                                                                inputProps={{ step: "0.01", min: "0" }}
                                                                value={shippingCost}
                                                                onChange={(e) => handleInputChange('shippingCost', e.target.value)}
                                                                helperText="Wholesale shipping cost"
                                                            />
                                                        </Grid>
                                                        
                                                        {/* Marketing Cost */}
                                                        <Grid item xs={12} md={6}>
                                                            <TextField
                                                                fullWidth
                                                                label="Marketing Cost ($)"
                                                                type="number"
                                                                inputProps={{ step: "0.01", min: "0" }}
                                                                value={marketingCost}
                                                                onChange={(e) => handleInputChange('marketingCost', e.target.value)}
                                                                helperText="Allocated marketing budget"
                                                            />
                                                        </Grid>
                                                        
                                                        {/* Packaging Cost */}
                                                        <Grid item xs={12} md={6}>
                                                            <TextField
                                                                fullWidth
                                                                label="Packaging Cost ($)"
                                                                type="number"
                                                                inputProps={{ step: "0.01", min: "0" }}
                                                                value={packagingCost}
                                                                onChange={(e) => handleInputChange('packagingCost', e.target.value)}
                                                                helperText="Box, tissue, tags, etc."
                                                            />
                                                        </Grid>
                                                        
                                                        {/* COG Summary */}
                                                        <Grid item xs={12}>
                                                            <Card sx={{ p: 2.5, bgcolor: '#c8e6c9', border: '2px solid #4caf50' }}>
                                                                <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                                                                    Non-Metal COG Components (Shared)
                                                                </Typography>
                                                                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 2 }}>
                                                                    <Box>
                                                                        <Typography color="text.secondary" variant="caption">CAD/Design Labor</Typography>
                                                                        <Typography fontWeight="bold">${cadLabor.toFixed(2)}</Typography>
                                                                    </Box>
                                                                    {isPendant && (
                                                                        <Box>
                                                                            <Typography color="text.secondary" variant="caption">Chain Cost</Typography>
                                                                            <Typography fontWeight="bold">${chainCost.toFixed(2)}</Typography>
                                                                        </Box>
                                                                    )}
                                                                    <Box>
                                                                        <Typography color="text.secondary" variant="caption">Production Labor</Typography>
                                                                        <Typography fontWeight="bold">${productionLabor.toFixed(2)}</Typography>
                                                                    </Box>
                                                                    <Box>
                                                                        <Typography color="text.secondary" variant="caption">Shipping</Typography>
                                                                        <Typography fontWeight="bold">${shippingCost.toFixed(2)}</Typography>
                                                                    </Box>
                                                                    <Box>
                                                                        <Typography color="text.secondary" variant="caption">Marketing</Typography>
                                                                        <Typography fontWeight="bold">${marketingCost.toFixed(2)}</Typography>
                                                                    </Box>
                                                                    <Box>
                                                                        <Typography color="text.secondary" variant="caption">Packaging</Typography>
                                                                        <Typography fontWeight="bold">${packagingCost.toFixed(2)}</Typography>
                                                                    </Box>
                                                                </Box>
                                                                <Divider sx={{ my: 2 }} />
                                                                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
                                                                    💡 <strong>Metal & Mounting Costs:</strong> Calculated individually for each metal option in the cards above
                                                                </Typography>
                                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                    <Typography variant="body2" fontWeight="bold">
                                                                        Subtotal (Non-Metal):
                                                                    </Typography>
                                                                    <Typography variant="body2" fontWeight="bold" sx={{ color: '#1b5e20' }}>
                                                                        ${sharedCOGCosts.toFixed(2)}
                                                                    </Typography>
                                                                </Box>
                                                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
                                                                    This is your minimum wholesale price. Add markup for retail pricing.
                                                                </Typography>
                                                            </Card>
                                                        </Grid>
                                                    </Grid>
                                                </Card>
                                            );
                                        })}
                                    </Grid>
                                </Grid>
                            ) : (
                                <Typography variant="body2" color="text.secondary">
                                    No designs with STL files available for COG calculation
                                </Typography>
                            )}

                            {/* Save COG Button */}
                            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                                <Button
                                    variant="contained"
                                    color="success"
                                    onClick={async () => {
                                        try {
                                            setSavingConfiguration('saving');
                                            const response = await fetch(`/api/cad-requests/${id}/cog`, {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    cogData: configurationStates,
                                                    selectedMetals: selectedMetals,
                                                    metalPrices: metalPrices,
                                                    markCompleted: true
                                                })
                                            });

                                            if (!response.ok) {
                                                const errorData = await response.json();
                                                throw new Error(errorData.error || 'Failed to save COG data');
                                            }

                                            setSavingConfiguration('success');
                                            setTimeout(() => {
                                                setSavingConfiguration(null);
                                                // Reload to show updated status
                                                loadRequest();
                                            }, 1500);
                                        } catch (err) {
                                            console.error('❌ COG save error:', err);
                                            setSavingConfiguration('error');
                                            setError(err.message);
                                            setTimeout(() => setSavingConfiguration(null), 3000);
                                        }
                                    }}
                                    disabled={actionLoading || savingConfiguration === 'saving'}
                                    size="large"
                                    startIcon={savingConfiguration === 'saving' ? <CircularProgress size={20} /> : <CheckIcon />}
                                >
                                    {savingConfiguration === 'saving' ? 'Saving...' : savingConfiguration === 'success' ? '✅ Saved & Completed!' : 'Save COG & Mark Completed'}
                                </Button>
                                {savingConfiguration === 'error' && (
                                    <Alert severity="error" sx={{ flex: 1 }}>
                                        Failed to save COG data
                                    </Alert>
                                )}
                            </Box>
                        </Box>
                    ) : (
                        <Alert severity="warning">
                            Admin access required for COG calculations.
                        </Alert>
                    )}
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
                    {approvalAction === 'approve' ? '✅ Approve Design' : '❌ Reject Design'}
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                        {approvalAction === 'approve' 
                            ? 'This will approve the design and link it to the gemstone for sale. Customers will see this design in the Designs tab.'
                            : 'This will reject the design and send feedback to the designer.'}
                    </Typography>
                    <TextField
                        fullWidth
                        multiline
                        rows={4}
                        label={approvalAction === 'approve' ? 'Approval notes (optional)' : 'Rejection reason (required)'}
                        value={approvalNotes}
                        onChange={(e) => setApprovalNotes(e.target.value)}
                        sx={{ mt: 2 }}
                        required={approvalAction === 'reject'}
                        error={approvalAction === 'reject' && !approvalNotes.trim()}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => {
                        setApprovalDialog(false);
                        setApprovalNotes('');
                        setApprovalAction('');
                    }}>
                        Cancel
                    </Button>
                    <Button 
                        variant="contained" 
                        color={approvalAction === 'approve' ? 'success' : 'error'}
                        onClick={handleApprovalSubmit}
                        disabled={actionLoading || (approvalAction === 'reject' && !approvalNotes.trim())}
                        startIcon={approvalAction === 'approve' ? <CheckIcon /> : <CloseIcon />}
                    >
                        {approvalAction === 'approve' ? 'Approve Design' : 'Reject Design'}
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
