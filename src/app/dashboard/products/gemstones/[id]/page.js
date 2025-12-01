'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import {
    Box,
    Typography,
    Card,
    CardContent,
    CardMedia,
    Grid,
    Chip,
    Button,
    IconButton,
    Divider,
    Alert,
    CircularProgress,
    Paper,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Breadcrumbs,
    Link,
    Tabs,
    Tab,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    ImageList,
    ImageListItem,
    ImageListItemBar,
    Fab,
    Tooltip,
    LinearProgress,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Download as DownloadIcon,
    Straighten as StraightenIcon,
    Palette as PaletteIcon,
    Diamond as DiamondIcon,
    Science as ScienceIcon,
    LocationOn as LocationIcon,
    BusinessCenter as BusinessIcon,
    Brush as DesignIcon,
    PhotoCamera as PhotoCameraIcon,
    Add as AddIcon,
    Close as CloseIcon,
    Search as SearchIcon
} from '@mui/icons-material';
import { uploadFileToS3 } from '../../../../../utils/s3.util';
import ProductStatusDropdown from '@/components/ProductStatusDropdown';

// Custom Tab Panel Component
function TabPanel({ children, value, index, ...other }) {
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`gemstone-tabpanel-${index}`}
            aria-labelledby={`gemstone-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ p: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

// Utility function to validate and normalize design objects
function validateDesign(design) {
    if (!design || typeof design !== 'object') {
        return null;
    }

    return {
        id: design.id || `design_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: design.title || design.name || 'Untitled Design',
        volume: design.volume || null,
        labor: design.labor || null,
        STL: design.STL || design.stl || null,
        GLB: design.GLB || design.glb || null,
        description: design.description || null,
        // Keep any additional properties
        ...design
    };
}

export default function GemstoneViewPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const params = useParams();
    const gemstoneId = params.id;

    const [gemstone, setGemstone] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [tabValue, setTabValue] = useState(0);
    const [imageDialogOpen, setImageDialogOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [designs, setDesigns] = useState([]);
    const [loadingDesigns, setLoadingDesigns] = useState(false);
    
    // Design Configuration states
    const [selectedDesignId, setSelectedDesignId] = useState(null);
    const [designConfigDialog, setDesignConfigDialog] = useState(false);
    const [designConfig, setDesignConfig] = useState({
        metals: [],
        mountingOptions: [],
        basePrice: 0,
        metalPrices: {}
    });
    const [savingDesignConfig, setSavingDesignConfig] = useState(false);
    
    // CAD Request state
    const [cadRequestDialogOpen, setCadRequestDialogOpen] = useState(false);
    const [cadRequestForm, setCadRequestForm] = useState({
        mountingType: '',
        styleDescription: '',
        ringSize: '',
        specialRequests: '',
        assignedDesigner: ''
    });
    const [cadRequestImages, setCadRequestImages] = useState([]);
    const [submittingCadRequest, setSubmittingCadRequest] = useState(false);
    const [cadRequests, setCadRequests] = useState([]);
    const [loadingCadRequests, setLoadingCadRequests] = useState(false);
    const [cadRequestsError, setCadRequestsError] = useState(null);
    const cadRequestsAttempted = useRef(false);
    
    // Edit CAD Request state
    const [editingCadRequestId, setEditingCadRequestId] = useState(null);
    const [editCadRequestForm, setEditCadRequestForm] = useState({
        mountingType: '',
        styleDescription: '',
        ringSize: '',
        specialRequests: '',
        assignedDesigner: ''
    });
    const [deletingCadRequestId, setDeletingCadRequestId] = useState(null);
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
    
    // Publishing status management
    const [publishingStatus, setPublishingStatus] = useState(null);
    const [publishingLoading, setPublishingLoading] = useState(false);

    // Fetch gemstone data
    useEffect(() => {
        if (!session?.user || !gemstoneId || gemstone) return;

        const fetchGemstoneData = async () => {
            try {
                setLoading(true);
                console.log('🔍 Fetching gemstone with ID:', gemstoneId);
                
                const response = await fetch(`/api/products/gemstones/${gemstoneId}`);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                console.log('💎 Gemstone data received:', data);
                
                // Extract the actual gemstone data from the response
                const gemstoneData = data.gemstone || data;
                console.log('💎 Extracted gemstone data:', gemstoneData);
                console.log('💎 Gemstone.gemstone nested data:', gemstoneData.gemstone);
                
                // Ensure status is set (default to draft if not present)
                if (!gemstoneData.status) {
                    gemstoneData.status = 'draft';
                }
                
                setGemstone(gemstoneData);
                setPublishingStatus(gemstoneData.status || 'draft');
            } catch (error) {
                console.error('Fetch error:', error);
                setError('Failed to load gemstone details');
            } finally {
                setLoading(false);
            }
        };

        fetchGemstoneData();
    }, [session?.user, gemstoneId, gemstone]);

    // Load designs from gemstone data when designs tab is active
    useEffect(() => {
        if (!gemstone || tabValue !== 1) return;

        try {
            setLoadingDesigns(true);
            console.log('🎨 Loading designs from gemstone data');
            
            // Get designs from gemstone document - these are approved CAD designs
            const rawDesigns = gemstone.designs || [];
            console.log('🎨 Raw designs from gemstone:', rawDesigns);
            
            // Validate and normalize each design object
            const validatedDesigns = rawDesigns
                .map(validateDesign)
                .filter(design => design !== null);
            
            setDesigns(validatedDesigns);
            
            console.log(`📋 Loaded ${validatedDesigns.length} designs from gemstone`);
            if (validatedDesigns.length !== rawDesigns.length) {
                console.warn(`⚠️ ${rawDesigns.length - validatedDesigns.length} designs were filtered out due to validation issues`);
            }
        } catch (error) {
            console.error('❌ Error loading designs:', error);
            setDesigns([]);
            setError('Failed to load designs.');
        } finally {
            setLoadingDesigns(false);
        }
    }, [gemstone, tabValue]);

    // Fetch CAD requests when CAD requests tab is active
    useEffect(() => {
        // Only fetch if:
        // 1. We have a gemstone
        // 2. We're on the CAD requests tab (tabValue === 2)  
        // 3. We haven't already attempted to load
        if (!gemstone || tabValue !== 2 || cadRequestsAttempted.current) {
            return;
        }

        const fetchCadRequestsData = async () => {
            try {
                cadRequestsAttempted.current = true;
                setLoadingCadRequests(true);
                setCadRequestsError(null);
                console.log('🔧 Fetching CAD requests for gemstone:', gemstoneId);
                
                const response = await fetch(`/api/cad-requests?gemstoneId=${gemstoneId}`);
                
                if (!response.ok) {
                    // Handle 404 as no requests found (not an error)
                    if (response.status === 404) {
                        console.log('📝 No CAD requests found for this gemstone');
                        setCadRequests([]);
                        return;
                    }
                    throw new Error(`Failed to fetch CAD requests: ${response.status}`);
                }
                
                const data = await response.json();
                console.log('🔧 CAD requests data received:', data);
                
                setCadRequests(data.cadRequests || []);
                
            } catch (error) {
                console.error('❌ Error loading CAD requests:', error);
                // Set error state to prevent retry loop
                setCadRequestsError('Failed to load CAD requests');
                // Set empty array for graceful degradation
                setCadRequests([]);
            } finally {
                setLoadingCadRequests(false);
            }
        };

        fetchCadRequestsData();
    }, [gemstone, tabValue, gemstoneId]);

    // Reset CAD requests attempt when switching tabs
    useEffect(() => {
        if (tabValue !== 2) {
            cadRequestsAttempted.current = false;
        }
    }, [tabValue]);

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    const handleImageUpload = async (files) => {
        if (!files || files.length === 0) return;

        setUploading(true);
        setUploadProgress(0);

        try {
            const uploadPromises = Array.from(files).map(async (file, index) => {
                // Update progress
                setUploadProgress((index / files.length) * 50);
                
                // Upload to S3
                const imageUrl = await uploadFileToS3(
                    file, 
                    `admin/products/gemstones/${gemstoneId}`, 
                    'image-'
                );
                
                return imageUrl;
            });

            const uploadedUrls = await Promise.all(uploadPromises);
            setUploadProgress(75);

            // Update gemstone with new images
            const currentImages = gemstone.images || [];
            const updatedImages = [...currentImages, ...uploadedUrls];

            const response = await fetch(`/api/products/gemstones/${gemstoneId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...gemstone,
                    images: updatedImages
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to update gemstone with images');
            }

            setUploadProgress(100);
            
            // Refresh gemstone data
            await fetchGemstone();
            setImageDialogOpen(false);
            
        } catch (error) {
            console.error('Upload error:', error);
            setError('Failed to upload images');
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    const handleDeleteImage = async (imageUrl) => {
        try {
            const updatedImages = gemstone.images.filter(img => img !== imageUrl);
            
            const response = await fetch(`/api/products/gemstones/${gemstoneId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...gemstone,
                    images: updatedImages
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to delete image');
            }

            await fetchGemstone();
        } catch (error) {
            console.error('Delete image error:', error);
            setError('Failed to delete image');
        }
    };

    const handleEdit = () => {
        router.push(`/dashboard/products/gemstones/${gemstoneId}/edit`);
    };

    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to delete this gemstone? This action cannot be undone.')) {
            try {
                const response = await fetch(`/api/products/gemstones/${gemstoneId}`, {
                    method: 'DELETE',
                });

                if (response.ok) {
                    router.push('/dashboard/products/gemstones');
                } else {
                    throw new Error('Failed to delete gemstone');
                }
            } catch (error) {
                console.error('Delete error:', error);
                setError('Failed to delete gemstone');
            }
        }
    };

    const handleBack = () => {
        router.push('/dashboard/products/gemstones');
    };

    // Design Configuration handlers
    const handleOpenDesignConfig = (design) => {
        setSelectedDesignId(design.id);
        setDesignConfig({
            metals: design.metals || [],
            mountingOptions: design.mountingOptions || [],
            basePrice: design.basePrice || 0,
            metalPrices: design.metalPrices || {}
        });
        setDesignConfigDialog(true);
    };

    const handleSaveDesignConfig = async () => {
        try {
            setSavingDesignConfig(true);
            
            const response = await fetch(`/api/products/gemstones/${gemstoneId}/designs/${selectedDesignId}/config`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(designConfig)
            });

            if (!response.ok) {
                throw new Error('Failed to save design configuration');
            }

            // Update local designs array
            setDesigns(designs.map(d => 
                d.id === selectedDesignId 
                    ? { ...d, ...designConfig }
                    : d
            ));

            setDesignConfigDialog(false);
            setError('');
        } catch (err) {
            setError('Failed to save design configuration: ' + err.message);
        } finally {
            setSavingDesignConfig(false);
        }
    };

    const handleAddMetal = () => {
        setDesignConfig(prev => ({
            ...prev,
            metals: [...prev.metals, { type: '', description: '' }]
        }));
    };

    const handleRemoveMetal = (index) => {
        setDesignConfig(prev => ({
            ...prev,
            metals: prev.metals.filter((_, i) => i !== index),
            metalPrices: Object.fromEntries(
                Object.entries(prev.metalPrices).filter(([k]) => parseInt(k) !== index)
            )
        }));
    };

    const handleAddMountingOption = () => {
        setDesignConfig(prev => ({
            ...prev,
            mountingOptions: [...prev.mountingOptions, { type: '', description: '', price: 0 }]
        }));
    };

    const handleRemoveMountingOption = (index) => {
        setDesignConfig(prev => ({
            ...prev,
            mountingOptions: prev.mountingOptions.filter((_, i) => i !== index)
        }));
    };

    // Publishing status handlers
    const handleSubmitProduct = async () => {
        try {
            setPublishingLoading(true);
            console.log(`🔄 Attempting to submit product with ID: ${gemstoneId}`);
            const response = await fetch(`/api/products/${gemstoneId}/submit`, {
                method: 'POST'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to submit product (${response.status})`);
            }

            const data = await response.json();
            console.log(`✅ Product submitted successfully:`, data);
            setGemstone(data.product);
            setPublishingStatus(data.product.status);
            setError('');
        } catch (err) {
            console.error('❌ Error submitting product:', err);
            setError(`Failed to submit: ${err.message}`);
        } finally {
            setPublishingLoading(false);
        }
    };

    const handleUnpublishProduct = async (targetStatus) => {
        try {
            setPublishingLoading(true);
            const response = await fetch(`/api/products/${gemstoneId}/unpublish`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetStatus })
            });

            if (!response.ok) {
                throw new Error('Failed to unpublish product');
            }

            const data = await response.json();
            setGemstone(data.product);
            setPublishingStatus(data.product.status);
            setError('');
        } catch (err) {
            console.error('Error unpublishing product:', err);
            setError(err.message);
        } finally {
            setPublishingLoading(false);
        }
    };

    // CAD Request handlers
    const handleCadRequestSubmit = async () => {
        try {
            setSubmittingCadRequest(true);
            
            // Validate required fields
            if (!cadRequestForm.mountingType || !cadRequestForm.styleDescription) {
                setError('Please fill in all required fields: Mounting Type and Style Description');
                return;
            }

            const requestData = {
                gemstoneId: gemstoneId,
                mountingType: cadRequestForm.mountingType,
                styleDescription: cadRequestForm.styleDescription,
                ringSize: cadRequestForm.ringSize,
                specialRequests: cadRequestForm.specialRequests,
                assignedDesigner: cadRequestForm.assignedDesigner,
                priority: 'medium',
                attachedImages: cadRequestImages || []
            };

            console.log('🔧 Submitting CAD request with data:', requestData);

            const response = await fetch('/api/cad-requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('❌ CAD request API error:', errorData);
                throw new Error(errorData.error || 'Failed to submit CAD request');
            }

            const result = await response.json();
            console.log('✅ CAD request created successfully:', result);
            
            // Reset form and close dialog
            setCadRequestForm({
                mountingType: '',
                styleDescription: '',
                ringSize: '',
                specialRequests: '',
                assignedDesigner: ''
            });
            setCadRequestImages([]);
            setCadRequestDialogOpen(false);
            
            // Refresh CAD requests data by triggering re-fetch
            cadRequestsAttempted.current = false;
            setCadRequestsError(null);
            setLoadingCadRequests(true);
            
            // Force tab refresh to reload CAD requests
            const currentTab = tabValue;
            setTabValue(1);
            setTimeout(() => setTabValue(currentTab), 100);
            
        } catch (error) {
            console.error('Error submitting CAD request:', error);
            setError('Failed to submit CAD request: ' + error.message);
        } finally {
            setSubmittingCadRequest(false);
        }
    };

    const handleCadRequestFormChange = (field, value) => {
        setCadRequestForm(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Edit CAD Request handlers
    const handleEditCadRequest = (request) => {
        setEditingCadRequestId(request.id);
        setEditCadRequestForm({
            mountingType: request.mountingDetails?.mountingType || '',
            styleDescription: request.mountingDetails?.styleDescription || '',
            ringSize: request.mountingDetails?.ringSize || '',
            specialRequests: request.mountingDetails?.specialRequests || '',
            assignedDesigner: request.assignedDesigner || ''
        });
    };

    const handleCancelEditCadRequest = () => {
        setEditingCadRequestId(null);
        setEditCadRequestForm({
            mountingType: '',
            styleDescription: '',
            ringSize: '',
            specialRequests: '',
            assignedDesigner: ''
        });
    };

    const handleSaveEditCadRequest = async () => {
        try {
            setSubmittingCadRequest(true);
            
            if (!editCadRequestForm.mountingType || !editCadRequestForm.styleDescription) {
                setError('Please fill in all required fields');
                return;
            }

            const updateData = {
                gemstoneId: gemstoneId,
                mountingType: editCadRequestForm.mountingType,
                styleDescription: editCadRequestForm.styleDescription,
                ringSize: editCadRequestForm.ringSize,
                specialRequests: editCadRequestForm.specialRequests,
                assignedDesigner: editCadRequestForm.assignedDesigner
            };

            console.log('🔧 Updating CAD request:', editingCadRequestId);

            const response = await fetch(`/api/cad-requests/${editingCadRequestId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update CAD request');
            }

            console.log('✅ CAD request updated successfully');
            
            // Refresh CAD requests
            cadRequestsAttempted.current = false;
            setCadRequestsError(null);
            setLoadingCadRequests(true);
            const currentTab = tabValue;
            setTabValue(1);
            setTimeout(() => setTabValue(currentTab), 100);
            
            handleCancelEditCadRequest();
            
        } catch (error) {
            console.error('Error updating CAD request:', error);
            setError('Failed to update CAD request: ' + error.message);
        } finally {
            setSubmittingCadRequest(false);
        }
    };

    // Delete CAD Request handlers
    const handleDeleteCadRequest = (requestId) => {
        setDeletingCadRequestId(requestId);
        setShowDeleteConfirmation(true);
    };

    const handleConfirmDeleteCadRequest = async () => {
        try {
            setSubmittingCadRequest(true);
            
            const url = new URL(`/api/cad-requests/${deletingCadRequestId}`, window.location.origin);
            url.searchParams.append('gemstoneId', gemstoneId);

            const response = await fetch(url.toString(), {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete CAD request');
            }

            console.log('✅ CAD request deleted successfully');
            
            // Refresh CAD requests
            cadRequestsAttempted.current = false;
            setCadRequestsError(null);
            setLoadingCadRequests(true);
            const currentTab = tabValue;
            setTabValue(1);
            setTimeout(() => setTabValue(currentTab), 100);
            
            setShowDeleteConfirmation(false);
            setDeletingCadRequestId(null);
            
        } catch (error) {
            console.error('Error deleting CAD request:', error);
            setError('Failed to delete CAD request: ' + error.message);
        } finally {
            setSubmittingCadRequest(false);
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
                <Button startIcon={<ArrowBackIcon />} onClick={handleBack}>
                    Back to Gemstones
                </Button>
            </Box>
        );
    }

    if (!gemstone) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="warning" sx={{ mb: 2 }}>
                    Gemstone not found
                </Alert>
                <Button startIcon={<ArrowBackIcon />} onClick={handleBack}>
                    Back to Gemstones
                </Button>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            {/* Breadcrumbs */}
            <Breadcrumbs sx={{ mb: 2 }}>
                <Link 
                    color="inherit" 
                    href="/dashboard"
                    sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                >
                    Dashboard
                </Link>
                <Link 
                    color="inherit" 
                    href="/dashboard/products"
                    sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                >
                    Products
                </Link>
                <Link 
                    color="inherit" 
                    href="/dashboard/products/gemstones"
                    sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                >
                    Gemstones
                </Link>
                <Typography color="primary">
                    {gemstone.title || `${gemstone.gemstone?.species || 'Gemstone'}`}
                </Typography>
            </Breadcrumbs>

            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" gutterBottom>
                        {gemstone.title || `${gemstone.gemstone?.species || 'Gemstone'} - ${gemstone.gemstone?.subspecies || ''}`}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Product ID: {gemstone.productId || gemstone._id}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    {/* Status Dropdown */}
                    <ProductStatusDropdown
                        product={gemstone}
                        onStatusChange={(newStatus) => {
                            setPublishingStatus(newStatus);
                            fetchGemstone();
                        }}
                        isLoading={publishingLoading}
                    />

                    <Button
                        variant="outlined"
                        startIcon={<ArrowBackIcon />}
                        onClick={() => router.back()}
                    >
                        Back
                    </Button>
                    <Button
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => {
                            if (window.confirm('Are you sure you want to delete this gemstone?')) {
                                // TODO: Implement delete API call
                                console.log('Delete gemstone:', gemstoneId);
                            }
                        }}
                    >
                        Delete
                    </Button>
                </Box>
            </Box>

            {/* Hero Section - Image and Basic Info */}
            <Card sx={{ mb: 3 }}>
                <CardContent sx={{ p: 3 }}>
                    <Grid container spacing={3} alignItems="center">
                        {/* Image Section */}
                        <Grid item xs={12} md={4}>
                            <Box sx={{
                                position: 'relative',
                                width: '100%',
                                height: 300,
                                backgroundColor: 'grey.100',
                                borderRadius: 2,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden'
                            }}>
                                {gemstone.images && gemstone.images.length > 0 ? (
                                    <Image
                                        src={gemstone.images[0]}
                                        alt={gemstone.title || 'Gemstone'}
                                        fill
                                        style={{
                                            objectFit: 'cover',
                                            borderRadius: 8
                                        }}
                                    />
                                ) : (
                                    <>
                                        <Typography variant="h1" sx={{ fontSize: '4rem', mb: 1, opacity: 0.3 }}>
                                            💎
                                        </Typography>
                                    </>
                                )}
                                
                                {/* Vendor Badge Overlay */}
                                {gemstone.vendor && (
                                    <Chip
                                        label={gemstone.vendor}
                                        color="primary"
                                        size="small"
                                        sx={{
                                            position: 'absolute',
                                            top: 12,
                                            right: 12,
                                            backgroundColor: 'rgba(25, 118, 210, 0.9)',
                                            color: 'white',
                                            fontWeight: 'medium',
                                            '& .MuiChip-label': {
                                                fontSize: '0.75rem'
                                            }
                                        }}
                                    />
                                )}
                            </Box>
                        </Grid>                        {/* Basic Info Section */}
                        <Grid item xs={12} md={8}>
                            <Box>
                                <Typography variant="h5" gutterBottom color="primary">
                                    {gemstone.gemstone?.species || 'Gemstone'} {gemstone.gemstone?.subspecies && `- ${gemstone.gemstone.subspecies}`}
                                </Typography>
                                
                                {/* Key Properties */}
                                <Grid container spacing={3} sx={{ mt: 1 }}>
                                    <Grid item xs={6} sm={3}>
                                        <Box>
                                            <Typography variant="body2" color="text.secondary">Carat Weight</Typography>
                                            <Typography variant="h6" color="primary">
                                                {gemstone.gemstone?.carat ? `${gemstone.gemstone.carat} ct` : 'N/A'}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={6} sm={3}>
                                        <Box>
                                            <Typography variant="body2" color="text.secondary">Origin</Typography>
                                            <Typography variant="body1" fontWeight="medium">
                                                {gemstone.gemstone?.locale || 'Unknown'}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={6} sm={3}>
                                        <Box>
                                            <Typography variant="body2" color="text.secondary">Type</Typography>
                                            <Chip 
                                                label={gemstone.gemstone?.naturalSynthetic === 'natural' ? 'Natural' : 'Synthetic'}
                                                color={gemstone.gemstone?.naturalSynthetic === 'natural' ? 'success' : 'info'}
                                                size="small"
                                            />
                                        </Box>
                                    </Grid>
                                    <Grid item xs={6} sm={3}>
                                        <Box>
                                            <Typography variant="body2" color="text.secondary">Price</Typography>
                                            <Typography variant="h6" color="success.main">
                                                {gemstone.gemstone?.retailPrice ? `$${gemstone.gemstone.retailPrice}` : 'N/A'}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                </Grid>

                                {/* Dimensions Section - Compact */}
                                {gemstone.gemstone?.dimensions && (
                                    <Box sx={{ mt: 2 }}>
                                        <Typography variant="body2" color="text.secondary" gutterBottom>
                                            Dimensions
                                        </Typography>
                                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                            <Chip 
                                                label={`${gemstone.gemstone.dimensions.length || '?'}mm`}
                                                size="small"
                                                variant="outlined"
                                                sx={{ minWidth: '45px' }}
                                            />
                                            <Typography variant="body2" color="text.secondary">×</Typography>
                                            <Chip 
                                                label={`${gemstone.gemstone.dimensions.width || '?'}mm`}
                                                size="small"
                                                variant="outlined"
                                                sx={{ minWidth: '45px' }}
                                            />
                                            <Typography variant="body2" color="text.secondary">×</Typography>
                                            <Chip 
                                                label={`${gemstone.gemstone.dimensions.height || '?'}mm`}
                                                size="small"
                                                variant="outlined"
                                                sx={{ minWidth: '45px' }}
                                            />
                                        </Box>
                                    </Box>
                                )}

                                {/* Status and Properties */}
                                <Box sx={{ mt: 3 }}>
                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                        Tags & Properties
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                        {/* Status Chip */}
                                        <Chip 
                                            label={gemstone.status?.charAt(0).toUpperCase() + gemstone.status?.slice(1) || 'Unknown'}
                                            color={gemstone.status === 'active' ? 'success' : gemstone.status === 'draft' ? 'warning' : 'default'}
                                            size="small"
                                        />
                                        
                                        {/* Featured Chip */}
                                        {gemstone.featured && (
                                            <Chip 
                                                label="Featured"
                                                color="primary"
                                                size="small"
                                            />
                                        )}
                                        
                                        {/* Cut Chips */}
                                        {gemstone.gemstone?.cut && gemstone.gemstone.cut.length > 0 && 
                                            (Array.isArray(gemstone.gemstone.cut) ? gemstone.gemstone.cut : [gemstone.gemstone.cut]).map((cut, index) => (
                                                <Chip 
                                                    key={`cut-${index}`} 
                                                    label={cut} 
                                                    size="small" 
                                                    color="primary" 
                                                    variant="outlined"
                                                />
                                            ))
                                        }
                                        
                                        {/* Cut Style Chips */}
                                        {gemstone.gemstone?.cutStyle && gemstone.gemstone.cutStyle.length > 0 && 
                                            (Array.isArray(gemstone.gemstone.cutStyle) ? gemstone.gemstone.cutStyle : [gemstone.gemstone.cutStyle]).map((style, index) => (
                                                <Chip 
                                                    key={`style-${index}`} 
                                                    label={style} 
                                                    size="small" 
                                                    color="secondary" 
                                                    variant="outlined"
                                                />
                                            ))
                                        }
                                        
                                        {/* Color Chips */}
                                        {gemstone.gemstone?.color && gemstone.gemstone.color.length > 0 && 
                                            (Array.isArray(gemstone.gemstone.color) ? gemstone.gemstone.color : [gemstone.gemstone.color]).slice(0, 2).map((color, index) => (
                                                <Chip 
                                                    key={`color-${index}`} 
                                                    label={color} 
                                                    size="small" 
                                                    sx={{ bgcolor: 'purple.50', color: 'purple.700' }}
                                                />
                                            ))
                                        }
                                        
                                        {/* Treatment Chips */}
                                        {gemstone.gemstone?.treatment && gemstone.gemstone.treatment.length > 0 && 
                                            (Array.isArray(gemstone.gemstone.treatment) ? gemstone.gemstone.treatment : [gemstone.gemstone.treatment]).map((treatment, index) => (
                                                <Chip 
                                                    key={`treatment-${index}`} 
                                                    label={treatment} 
                                                    size="small" 
                                                    sx={{ bgcolor: 'orange.50', color: 'orange.700', border: '1px solid', borderColor: 'orange.200' }}
                                                />
                                            ))
                                        }
                                        
                                        {/* Show more colors indicator */}
                                        {gemstone.gemstone?.color && Array.isArray(gemstone.gemstone.color) && gemstone.gemstone.color.length > 2 && (
                                            <Chip 
                                                label={`+${gemstone.gemstone.color.length - 2} more`}
                                                size="small"
                                                variant="outlined"
                                                sx={{ fontSize: '0.65rem' }}
                                            />
                                        )}
                                    </Box>
                                </Box>
                            </Box>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* Main Content with Tabs */}
            <Paper sx={{ width: '100%' }}>
                <Tabs
                    value={tabValue}
                    onChange={handleTabChange}
                    indicatorColor="primary"
                    textColor="primary"
                    variant="fullWidth"
                >
                    <Tab label="Images" />
                    <Tab label="Designs" />
                    <Tab label="CAD Requests" />
                </Tabs>

                {/* Images Tab */}
                <TabPanel value={tabValue} index={0}>
                    <Box sx={{ position: 'relative' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6">
                                Product Images ({gemstone.images?.length || 0})
                            </Typography>
                            <Button
                                variant="contained"
                                startIcon={<PhotoCameraIcon />}
                                onClick={() => setImageDialogOpen(true)}
                            >
                                Add Images
                            </Button>
                        </Box>

                        {gemstone.images && gemstone.images.length > 0 ? (
                            <ImageList variant="masonry" cols={3} gap={8}>
                                {gemstone.images.map((image, index) => (
                                    <ImageListItem key={index} sx={{ position: 'relative' }}>
                                        <Image
                                            src={image}
                                            alt={`Gemstone image ${index + 1}`}
                                            width={300}
                                            height={300}
                                            style={{ 
                                                borderRadius: 8,
                                                width: '100%',
                                                height: 'auto'
                                            }}
                                        />
                                        <ImageListItemBar
                                            position="top"
                                            actionIcon={
                                                <IconButton
                                                    sx={{ color: 'white' }}
                                                    onClick={() => handleDeleteImage(image)}
                                                >
                                                    <CloseIcon />
                                                </IconButton>
                                            }
                                            actionPosition="right"
                                        />
                                    </ImageListItem>
                                ))}
                            </ImageList>
                        ) : (
                            <Paper 
                                sx={{ 
                                    p: 4, 
                                    textAlign: 'center', 
                                    bgcolor: 'grey.50',
                                    border: '2px dashed',
                                    borderColor: 'grey.300'
                                }}
                            >
                                <PhotoCameraIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
                                <Typography variant="h6" color="textSecondary" gutterBottom>
                                    No images uploaded yet
                                </Typography>
                                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                                    Add high-quality images to showcase this gemstone
                                </Typography>
                                <Button
                                    variant="contained"
                                    startIcon={<PhotoCameraIcon />}
                                    onClick={() => setImageDialogOpen(true)}
                                >
                                    Upload Images
                                </Button>
                            </Paper>
                        )}
                    </Box>
                </TabPanel>

                {/* Designs Tab */}
                <TabPanel value={tabValue} index={1}>
                    <Box>
                        <Typography variant="h6" gutterBottom>
                            Compatible Designs
                        </Typography>
                        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                            Jewelry designs that work well with this gemstone
                        </Typography>

                        {loadingDesigns ? (
                            <Box sx={{ 
                                display: 'flex', 
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                p: 6,
                                bgcolor: 'grey.50',
                                borderRadius: 2
                            }}>
                                <CircularProgress size={40} sx={{ mb: 2 }} />
                                <Typography variant="body1" color="textSecondary" gutterBottom>
                                    Loading Compatible Designs
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                    Searching for jewelry designs that work with this gemstone...
                                </Typography>
                            </Box>
                        ) : designs.length > 0 ? (
                            <Grid container spacing={3}>
                                {designs.map((design, index) => (
                                    <Grid item xs={12} sm={6} md={4} key={design.id || index}>
                                        <Card sx={{ 
                                            height: '100%',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            border: '1px solid',
                                            borderColor: 'divider'
                                        }}>
                                            {/* Design Header with Badge */}
                                            <Box sx={{ 
                                                px: 2, 
                                                pt: 2,
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'start'
                                            }}>
                                                <Typography variant="h6" component="h3" sx={{ flex: 1 }}>
                                                    {design.title || design.name || 'Untitled Design'}
                                                </Typography>
                                                {design.status && (
                                                    <Chip
                                                        label={design.status}
                                                        size="small"
                                                        color={design.status === 'available' ? 'success' : 'default'}
                                                    />
                                                )}
                                            </Box>

                                            <CardMedia
                                                component="div"
                                                sx={{
                                                    height: 180,
                                                    background: 'linear-gradient(45deg, #f5f5f5 30%, #e0e0e0 90%)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    m: 2,
                                                    borderRadius: 1
                                                }}
                                            >
                                                <DesignIcon sx={{ fontSize: 64, color: 'grey.400' }} />
                                            </CardMedia>
                                            
                                            <CardContent sx={{ flexGrow: 1 }}>
                                                {/* Design Stats */}
                                                <Box sx={{ mb: 2 }}>
                                                    {design.printVolume ? (
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                            <Typography variant="body2" color="textSecondary">
                                                                Volume:
                                                            </Typography>
                                                            <Typography variant="body2" fontWeight="medium">
                                                                {`${design.printVolume} mm³`}
                                                            </Typography>
                                                        </Box>
                                                    ) : null}
                                                    
                                                    {design.basePrice > 0 && (
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                            <Typography variant="body2" color="textSecondary">
                                                                Base Price:
                                                            </Typography>
                                                            <Typography variant="body2" fontWeight="bold" color="success.main">
                                                                ${design.basePrice}
                                                            </Typography>
                                                        </Box>
                                                    )}
                                                </Box>

                                                {/* Metal Options */}
                                                {design.metals && design.metals.length > 0 && (
                                                    <Box sx={{ mb: 2 }}>
                                                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                                                            Available Metals:
                                                        </Typography>
                                                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                                            {design.metals.slice(0, 3).map((metal, idx) => (
                                                                <Chip
                                                                    key={idx}
                                                                    label={metal.type || metal}
                                                                    size="small"
                                                                    variant="outlined"
                                                                />
                                                            ))}
                                                            {design.metals.length > 3 && (
                                                                <Chip
                                                                    label={`+${design.metals.length - 3} more`}
                                                                    size="small"
                                                                    variant="outlined"
                                                                />
                                                            )}
                                                        </Box>
                                                    </Box>
                                                )}

                                                {/* Mounting Options */}
                                                {design.mountingOptions && design.mountingOptions.length > 0 && (
                                                    <Box sx={{ mb: 2 }}>
                                                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                                                            Mounting Options:
                                                        </Typography>
                                                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                                            {design.mountingOptions.slice(0, 3).map((opt, idx) => (
                                                                <Chip
                                                                    key={idx}
                                                                    label={opt.type || opt}
                                                                    size="small"
                                                                    variant="outlined"
                                                                    color="primary"
                                                                />
                                                            ))}
                                                            {design.mountingOptions.length > 3 && (
                                                                <Chip
                                                                    label={`+${design.mountingOptions.length - 3} more`}
                                                                    size="small"
                                                                    variant="outlined"
                                                                />
                                                            )}
                                                        </Box>
                                                    </Box>
                                                )}

                                                {/* Description */}
                                                {design.description && (
                                                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                        {design.description}
                                                    </Typography>
                                                )}

                                                {/* File Links */}
                                                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                                                    {design.files?.stl ? (
                                                        <Button
                                                            size="small"
                                                            variant="outlined"
                                                            startIcon={<DownloadIcon />}
                                                            onClick={() => window.open(design.files.stl.url, '_blank')}
                                                            sx={{ flex: 1 }}
                                                        >
                                                            STL
                                                        </Button>
                                                    ) : null}
                                                    
                                                    {design.files?.glb ? (
                                                        <Button
                                                            size="small"
                                                            variant="outlined"
                                                            startIcon={<DownloadIcon />}
                                                            onClick={() => window.open(design.files.glb.url, '_blank')}
                                                            sx={{ flex: 1 }}
                                                        >
                                                            GLB
                                                        </Button>
                                                    ) : null}
                                                </Box>

                                                {/* Action Buttons */}
                                                <Box sx={{ display: 'flex', gap: 1 }}>
                                                    <Button
                                                        variant="contained"
                                                        size="small"
                                                        onClick={() => handleOpenDesignConfig(design)}
                                                        sx={{ flex: 1 }}
                                                    >
                                                        Configure
                                                    </Button>
                                                    <Button
                                                        variant="outlined"
                                                        size="small"
                                                        onClick={() => window.open(`/dashboard/cad-requests?designId=${design.id}`, '_blank')}
                                                        sx={{ flex: 1 }}
                                                    >
                                                        View
                                                    </Button>
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        ) : (
                            <Paper 
                                sx={{ 
                                    p: 6, 
                                    textAlign: 'center', 
                                    bgcolor: 'grey.50',
                                    border: '2px dashed',
                                    borderColor: 'grey.300',
                                    borderRadius: 2
                                }}
                            >
                                <DesignIcon sx={{ fontSize: 80, color: 'grey.400', mb: 2 }} />
                                <Typography variant="h5" color="textSecondary" gutterBottom>
                                    No Designs Available
                                </Typography>
                                <Typography variant="body1" color="textSecondary" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
                                    There are currently no jewelry designs associated with this gemstone. 
                                    Compatible designs with 3D models (STL/GLB files) will appear here when available.
                                </Typography>
                                
                                <Box sx={{ 
                                    display: 'flex', 
                                    flexDirection: { xs: 'column', sm: 'row' },
                                    gap: 2, 
                                    justifyContent: 'center',
                                    alignItems: 'center'
                                }}>
                                    <Button
                                        variant="contained"
                                        startIcon={<AddIcon />}
                                        color="primary"
                                    >
                                        Create New Design
                                    </Button>
                                    
                                    <Button
                                        variant="outlined"
                                        startIcon={<SearchIcon />}
                                        onClick={() => {
                                            // Navigate to designs catalog
                                            router.push('/dashboard/designs');
                                        }}
                                    >
                                        Browse Design Catalog
                                    </Button>
                                </Box>
                                
                                <Box sx={{ mt: 4, p: 3, bgcolor: 'info.50', borderRadius: 1 }}>
                                    <Typography variant="body2" color="info.main" fontWeight="medium" gutterBottom>
                                        Expected Design Properties:
                                    </Typography>
                                    <Typography variant="caption" color="info.dark" component="div">
                                        • <strong>Title:</strong> Design name/identifier<br/>
                                        • <strong>Volume:</strong> Material volume in mm³<br/>
                                        • <strong>Labor:</strong> Production time in hours<br/>
                                        • <strong>STL:</strong> 3D printable file<br/>
                                        • <strong>GLB:</strong> 3D preview file
                                    </Typography>
                                </Box>
                            </Paper>
                        )}
                    </Box>
                </TabPanel>

                {/* CAD Requests Tab */}
                <TabPanel value={tabValue} index={2}>
                    <Box sx={{ position: 'relative' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6">
                                CAD Requests ({cadRequests?.length || 0})
                            </Typography>
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => setCadRequestDialogOpen(true)}
                            >
                                Request Mounting Design
                            </Button>
                        </Box>

                        {loadingCadRequests ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                                <CircularProgress />
                            </Box>
                        ) : cadRequestsError ? (
                            <Paper 
                                sx={{ 
                                    p: 6, 
                                    textAlign: 'center', 
                                    bgcolor: 'error.50',
                                    border: '2px dashed',
                                    borderColor: 'error.300',
                                    borderRadius: 2
                                }}
                            >
                                <Alert severity="error" sx={{ mb: 3 }}>
                                    {cadRequestsError}
                                </Alert>
                                <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
                                    Unable to load CAD requests for this gemstone.
                                </Typography>
                                <Button
                                    variant="outlined"
                                    onClick={() => {
                                        cadRequestsAttempted.current = false;
                                        setCadRequestsError(null);
                                        // Trigger re-fetch by changing tab value temporarily
                                        setTabValue(1);
                                        setTimeout(() => setTabValue(2), 100);
                                    }}
                                >
                                    Try Again
                                </Button>
                            </Paper>
                        ) : cadRequests && cadRequests.length > 0 ? (
                            <Grid container spacing={3}>
                                {cadRequests.map((request, index) => (
                                    <Grid item xs={12} md={6} key={request.id || index}>
                                        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                            <CardContent sx={{ flexGrow: 1 }}>
                                                {/* Title and Status Row */}
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                                    <Box>
                                                        <Typography variant="h6" gutterBottom>
                                                            {request.mountingDetails?.mountingType} Design
                                                        </Typography>
                                                        <Chip 
                                                            label={request.status || 'pending'} 
                                                            size="small" 
                                                            color={
                                                                request.status === 'completed' ? 'success' :
                                                                request.status === 'in_progress' ? 'info' :
                                                                request.status === 'pending' ? 'warning' :
                                                                'default'
                                                            }
                                                            sx={{ mb: 1 }}
                                                        />
                                                    </Box>
                                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                        <Tooltip title="Edit">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => handleEditCadRequest(request)}
                                                                disabled={submittingCadRequest}
                                                            >
                                                                <EditIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Delete">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => handleDeleteCadRequest(request.id)}
                                                                disabled={submittingCadRequest}
                                                                color="error"
                                                            >
                                                                <DeleteIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Box>
                                                </Box>

                                                {/* Details */}
                                                <Box sx={{ mb: 2 }}>
                                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                                        <strong>Type:</strong> {request.mountingDetails?.mountingType}
                                                    </Typography>
                                                    {request.mountingDetails?.ringSize && (
                                                        <Typography variant="body2" color="text.secondary" gutterBottom>
                                                            <strong>Ring Size:</strong> {request.mountingDetails.ringSize}
                                                        </Typography>
                                                    )}
                                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                                        <strong>Style:</strong>
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ pl: 2, mb: 1 }}>
                                                        {request.mountingDetails?.styleDescription}
                                                    </Typography>
                                                    {request.mountingDetails?.specialRequests && (
                                                        <>
                                                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                                                <strong>Special Requests:</strong>
                                                            </Typography>
                                                            <Typography variant="body2" sx={{ pl: 2, mb: 1, fontStyle: 'italic' }}>
                                                                {request.mountingDetails.specialRequests}
                                                            </Typography>
                                                        </>
                                                    )}
                                                    {request.assignedDesigner && (
                                                        <Typography variant="body2" color="text.secondary" gutterBottom>
                                                            <strong>Assigned to:</strong> {request.assignedDesigner}
                                                        </Typography>
                                                    )}
                                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                                                        Created: {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : 'N/A'}
                                                    </Typography>
                                                </Box>

                                                {/* View Details Button */}
                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    fullWidth
                                                    href={`/dashboard/requests/cad-requests/${request.id}`}
                                                >
                                                    View Full Request
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        ) : (
                            <Paper 
                                sx={{ 
                                    p: 6, 
                                    textAlign: 'center', 
                                    bgcolor: 'grey.50',
                                    border: '2px dashed',
                                    borderColor: 'grey.300',
                                    borderRadius: 2
                                }}
                            >
                                <DesignIcon sx={{ fontSize: 80, color: 'grey.400', mb: 2 }} />
                                <Typography variant="h5" color="textSecondary" gutterBottom>
                                    No CAD Requests Yet
                                </Typography>
                                <Typography variant="body1" color="textSecondary" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
                                    Submit a mounting design request for this gemstone. Our CAD designers will create a custom mounting that perfectly showcases the stone.
                                </Typography>
                                
                                <Button
                                    variant="contained"
                                    startIcon={<AddIcon />}
                                    onClick={() => setCadRequestDialogOpen(true)}
                                    size="large"
                                >
                                    Request Custom Mounting
                                </Button>
                                
                                <Box sx={{ mt: 4, p: 3, bgcolor: 'info.50', borderRadius: 1 }}>
                                    <Typography variant="body2" color="info.main" fontWeight="medium" gutterBottom>
                                        CAD Request Process:
                                    </Typography>
                                    <Typography variant="caption" color="info.dark" component="div">
                                        • <strong>Submit Request:</strong> Specify mounting type, metal, and design details<br/>
                                        • <strong>Designer Assignment:</strong> Request gets assigned to available CAD designer<br/>
                                        • <strong>Design Creation:</strong> 3D model created with your specifications<br/>
                                        • <strong>Review & Approval:</strong> You review and approve the final design
                                    </Typography>
                                </Box>
                            </Paper>
                        )}
                    </Box>
                </TabPanel>
            </Paper>

            {/* CAD Request Dialog */}
            <Dialog 
                open={cadRequestDialogOpen} 
                onClose={() => !submittingCadRequest && setCadRequestDialogOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    Request Custom Mounting Design
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Request a custom mounting design for: <strong>{gemstone?.title}</strong>
                    </Typography>
                    
                    <Grid container spacing={3}>
                        {/* Mounting Type */}
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                                <InputLabel>Mounting Type *</InputLabel>
                                <Select
                                    value={cadRequestForm.mountingType}
                                    onChange={(e) => handleCadRequestFormChange('mountingType', e.target.value)}
                                    label="Mounting Type *"
                                >
                                    <MenuItem value="Engagement Ring">Engagement Ring</MenuItem>
                                    <MenuItem value="Wedding Band">Wedding Band</MenuItem>
                                    <MenuItem value="Pendant">Pendant</MenuItem>
                                    <MenuItem value="Earrings">Earrings</MenuItem>
                                    <MenuItem value="Bracelet">Bracelet</MenuItem>
                                    <MenuItem value="Brooch">Brooch</MenuItem>
                                    <MenuItem value="Cufflinks">Cufflinks</MenuItem>
                                    <MenuItem value="Other">Other</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>



                        {/* Ring Size (if applicable) */}
                        {cadRequestForm.mountingType.toLowerCase().includes('ring') && (
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Ring Size"
                                    value={cadRequestForm.ringSize}
                                    onChange={(e) => handleCadRequestFormChange('ringSize', e.target.value)}
                                    placeholder="e.g., 6.5"
                                />
                            </Grid>
                        )}



                        {/* Style Description */}
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                multiline
                                rows={4}
                                label="Style Description *"
                                value={cadRequestForm.styleDescription}
                                onChange={(e) => handleCadRequestFormChange('styleDescription', e.target.value)}
                                placeholder="Describe the mounting style you envision. Include details about setting type, design elements, inspiration, etc."
                            />
                        </Grid>

                        {/* Special Requests */}
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                multiline
                                rows={3}
                                label="Special Requests"
                                value={cadRequestForm.specialRequests}
                                onChange={(e) => handleCadRequestFormChange('specialRequests', e.target.value)}
                                placeholder="Any additional requirements, preferences, or special instructions?"
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button 
                        onClick={() => setCadRequestDialogOpen(false)}
                        disabled={submittingCadRequest}
                    >
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleCadRequestSubmit}
                        variant="contained"
                        disabled={submittingCadRequest || !cadRequestForm.mountingType || !cadRequestForm.styleDescription}
                    >
                        {submittingCadRequest ? <CircularProgress size={20} /> : 'Submit Request'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Image Upload Dialog */}
            <Dialog 
                open={imageDialogOpen} 
                onClose={() => !uploading && setImageDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    Upload Gemstone Images
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ p: 2 }}>
                        {uploading && (
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="body2" color="textSecondary" gutterBottom>
                                    Uploading images... {Math.round(uploadProgress)}%
                                </Typography>
                                <LinearProgress variant="determinate" value={uploadProgress} />
                            </Box>
                        )}
                        
                        <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e.target.files)}
                            style={{ display: 'none' }}
                            id="image-upload-input"
                            disabled={uploading}
                        />
                        <label htmlFor="image-upload-input">
                            <Button
                                variant="outlined"
                                component="span"
                                fullWidth
                                disabled={uploading}
                                sx={{ 
                                    py: 3,
                                    border: '2px dashed',
                                    borderColor: 'primary.main',
                                    '&:hover': {
                                        borderColor: 'primary.dark',
                                        bgcolor: 'primary.50'
                                    }
                                }}
                            >
                                <Box sx={{ textAlign: 'center' }}>
                                    <PhotoCameraIcon sx={{ fontSize: 48, mb: 1 }} />
                                    <Typography variant="h6">
                                        {uploading ? 'Uploading...' : 'Select Images'}
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary">
                                        Choose multiple high-quality images
                                    </Typography>
                                </Box>
                            </Button>
                        </label>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button 
                        onClick={() => setImageDialogOpen(false)}
                        disabled={uploading}
                    >
                        Close
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Edit CAD Request Dialog */}
            <Dialog 
                open={!!editingCadRequestId} 
                onClose={handleCancelEditCadRequest}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    Edit CAD Request
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Update the mounting design request for: <strong>{gemstone?.title}</strong>
                    </Typography>
                    
                    <Grid container spacing={3}>
                        {/* Mounting Type */}
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                                <InputLabel>Mounting Type *</InputLabel>
                                <Select
                                    value={editCadRequestForm.mountingType}
                                    onChange={(e) => setEditCadRequestForm({
                                        ...editCadRequestForm,
                                        mountingType: e.target.value
                                    })}
                                    label="Mounting Type *"
                                >
                                    <MenuItem value="Engagement Ring">Engagement Ring</MenuItem>
                                    <MenuItem value="Wedding Band">Wedding Band</MenuItem>
                                    <MenuItem value="Pendant">Pendant</MenuItem>
                                    <MenuItem value="Earrings">Earrings</MenuItem>
                                    <MenuItem value="Bracelet">Bracelet</MenuItem>
                                    <MenuItem value="Brooch">Brooch</MenuItem>
                                    <MenuItem value="Cufflinks">Cufflinks</MenuItem>
                                    <MenuItem value="Other">Other</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        {/* Ring Size (if applicable) */}
                        {editCadRequestForm.mountingType.toLowerCase().includes('ring') && (
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Ring Size"
                                    value={editCadRequestForm.ringSize}
                                    onChange={(e) => setEditCadRequestForm({
                                        ...editCadRequestForm,
                                        ringSize: e.target.value
                                    })}
                                    placeholder="e.g., 6.5"
                                />
                            </Grid>
                        )}

                        {/* Style Description */}
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                multiline
                                rows={4}
                                label="Style Description *"
                                value={editCadRequestForm.styleDescription}
                                onChange={(e) => setEditCadRequestForm({
                                    ...editCadRequestForm,
                                    styleDescription: e.target.value
                                })}
                                placeholder="Describe the mounting style you envision..."
                            />
                        </Grid>

                        {/* Special Requests */}
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                multiline
                                rows={3}
                                label="Special Requests"
                                value={editCadRequestForm.specialRequests}
                                onChange={(e) => setEditCadRequestForm({
                                    ...editCadRequestForm,
                                    specialRequests: e.target.value
                                })}
                                placeholder="Any additional requirements or preferences?"
                            />
                        </Grid>

                        {/* Assigned Designer */}
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Assigned Designer"
                                value={editCadRequestForm.assignedDesigner}
                                onChange={(e) => setEditCadRequestForm({
                                    ...editCadRequestForm,
                                    assignedDesigner: e.target.value
                                })}
                                placeholder="Designer name or ID (optional)"
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button 
                        onClick={handleCancelEditCadRequest}
                        disabled={submittingCadRequest}
                    >
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleSaveEditCadRequest}
                        variant="contained"
                        disabled={submittingCadRequest || !editCadRequestForm.mountingType || !editCadRequestForm.styleDescription}
                    >
                        {submittingCadRequest ? <CircularProgress size={20} /> : 'Save Changes'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Design Configuration Dialog */}
            <Dialog 
                open={designConfigDialog} 
                onClose={() => {
                    setDesignConfigDialog(false);
                    setSelectedDesignId(null);
                }}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    Configure Design - {designs.find(d => d.id === selectedDesignId)?.title}
                </DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ pt: 2 }}>
                        {/* Base Price */}
                        <Box sx={{ mb: 3 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                                Base Price ($)
                            </Typography>
                            <TextField
                                type="number"
                                inputProps={{ step: '0.01', min: '0' }}
                                value={designConfig.basePrice}
                                onChange={(e) => setDesignConfig({
                                    ...designConfig,
                                    basePrice: parseFloat(e.target.value) || 0
                                })}
                                fullWidth
                                placeholder="Enter base price"
                            />
                        </Box>

                        {/* Metals Section */}
                        <Box sx={{ mb: 3 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                    Available Metals
                                </Typography>
                                <Button
                                    size="small"
                                    startIcon={<AddIcon />}
                                    onClick={handleAddMetal}
                                    variant="outlined"
                                >
                                    Add Metal
                                </Button>
                            </Box>
                            
                            {designConfig.metals.map((metal, idx) => (
                                <Box key={idx} sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                                        <TextField
                                            label="Metal Type"
                                            value={metal.type || ''}
                                            onChange={(e) => {
                                                const updated = [...designConfig.metals];
                                                updated[idx] = { ...metal, type: e.target.value };
                                                setDesignConfig({ ...designConfig, metals: updated });
                                            }}
                                            placeholder="e.g., 14K Yellow Gold"
                                            size="small"
                                            sx={{ flex: 1 }}
                                        />
                                        <TextField
                                            label="Price Adjustment ($)"
                                            type="number"
                                            inputProps={{ step: '0.01', min: '0' }}
                                            value={designConfig.metalPrices?.[idx] || 0}
                                            onChange={(e) => setDesignConfig({
                                                ...designConfig,
                                                metalPrices: {
                                                    ...designConfig.metalPrices,
                                                    [idx]: parseFloat(e.target.value) || 0
                                                }
                                            })}
                                            placeholder="Additional cost"
                                            size="small"
                                            sx={{ width: '150px' }}
                                        />
                                        <Button
                                            size="small"
                                            color="error"
                                            onClick={() => handleRemoveMetal(idx)}
                                        >
                                            Remove
                                        </Button>
                                    </Box>
                                    <TextField
                                        label="Description"
                                        value={metal.description || ''}
                                        onChange={(e) => {
                                            const updated = [...designConfig.metals];
                                            updated[idx] = { ...metal, description: e.target.value };
                                            setDesignConfig({ ...designConfig, metals: updated });
                                        }}
                                        placeholder="e.g., Premium quality, hallmarked"
                                        multiline
                                        rows={2}
                                        fullWidth
                                        size="small"
                                    />
                                </Box>
                            ))}
                        </Box>

                        {/* Mounting Options Section */}
                        <Box sx={{ mb: 3 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                    Mounting Options
                                </Typography>
                                <Button
                                    size="small"
                                    startIcon={<AddIcon />}
                                    onClick={handleAddMountingOption}
                                    variant="outlined"
                                >
                                    Add Option
                                </Button>
                            </Box>
                            
                            {designConfig.mountingOptions.map((option, idx) => (
                                <Box key={idx} sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                                        <TextField
                                            label="Option Type"
                                            value={option.type || ''}
                                            onChange={(e) => {
                                                const updated = [...designConfig.mountingOptions];
                                                updated[idx] = { ...option, type: e.target.value };
                                                setDesignConfig({ ...designConfig, mountingOptions: updated });
                                            }}
                                            placeholder="e.g., Solitaire, Halo"
                                            size="small"
                                            sx={{ flex: 1 }}
                                        />
                                        <TextField
                                            label="Price ($)"
                                            type="number"
                                            inputProps={{ step: '0.01', min: '0' }}
                                            value={option.price || 0}
                                            onChange={(e) => {
                                                const updated = [...designConfig.mountingOptions];
                                                updated[idx] = { ...option, price: parseFloat(e.target.value) || 0 };
                                                setDesignConfig({ ...designConfig, mountingOptions: updated });
                                            }}
                                            placeholder="Price"
                                            size="small"
                                            sx={{ width: '150px' }}
                                        />
                                        <Button
                                            size="small"
                                            color="error"
                                            onClick={() => handleRemoveMountingOption(idx)}
                                        >
                                            Remove
                                        </Button>
                                    </Box>
                                    <TextField
                                        label="Description"
                                        value={option.description || ''}
                                        onChange={(e) => {
                                            const updated = [...designConfig.mountingOptions];
                                            updated[idx] = { ...option, description: e.target.value };
                                            setDesignConfig({ ...designConfig, mountingOptions: updated });
                                        }}
                                        placeholder="Design details"
                                        multiline
                                        rows={2}
                                        fullWidth
                                        size="small"
                                    />
                                </Box>
                            ))}
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button 
                        onClick={() => {
                            setDesignConfigDialog(false);
                            setSelectedDesignId(null);
                        }}
                    >
                        Cancel
                    </Button>
                    <Button 
                        variant="contained"
                        onClick={handleSaveDesignConfig}
                        disabled={savingDesignConfig}
                    >
                        {savingDesignConfig ? <CircularProgress size={20} sx={{ mr: 1 }} /> : 'Save Configuration'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog 
                open={showDeleteConfirmation}
                onClose={() => setShowDeleteConfirmation(false)}
            >
                <DialogTitle>
                    Confirm Delete CAD Request
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body1" gutterBottom>
                        Are you sure you want to delete this CAD request? This action cannot be undone.
                    </Typography>
                    {deletingCadRequestId && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                            Request ID: {deletingCadRequestId}
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button 
                        onClick={() => setShowDeleteConfirmation(false)}
                        disabled={submittingCadRequest}
                    >
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleConfirmDeleteCadRequest}
                        variant="contained"
                        color="error"
                        disabled={submittingCadRequest}
                    >
                        {submittingCadRequest ? <CircularProgress size={20} /> : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>

        </Box>
    );
}