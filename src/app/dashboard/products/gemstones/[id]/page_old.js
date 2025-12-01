'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
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
    Link
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Download as DownloadIcon,
    Straighten as StraightenIcon,
    Palette as PaletteIcon,
    Diamond as CutIcon,
    Science as ScienceIcon,
    LocationOn as LocationIcon,
    BusinessCenter as BusinessIcon,
    AttachMoney as MoneyIcon,
    CalendarToday as CalendarIcon,
    Person as PersonIcon
} from '@mui/icons-material';

export default function GemstoneViewPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const params = useParams();
    const gemstoneId = params.id;

    const [gemstone, setGemstone] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchGemstone = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/products/gemstones/${gemstoneId}`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch gemstone');
            }
            
            const data = await response.json();
            if (data.success) {
                setGemstone(data.gemstone);
            } else {
                throw new Error(data.error || 'Failed to fetch gemstone');
            }
        } catch (error) {
            console.error('Fetch error:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    }, [gemstoneId]);

    useEffect(() => {
        if (gemstoneId && session) {
            fetchGemstone();
        }
    }, [gemstoneId, session, fetchGemstone]);

    const handleEdit = () => {
        router.push(`/dashboard/products/gemstones?edit=${gemstoneId}`);
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this gemstone? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`/api/products/gemstones/${gemstoneId}`, {
                method: 'DELETE'
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
    };

    const handleBack = () => {
        router.push('/dashboard/products/gemstones');
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
                    underline="hover"
                    sx={{ cursor: 'pointer' }}
                >
                    Dashboard
                </Link>
                <Link 
                    color="inherit" 
                    onClick={handleBack}
                    underline="hover"
                    sx={{ cursor: 'pointer' }}
                >
                    Gemstones
                </Link>
                <Typography color="text.primary">
                    {gemstone.title || 'Untitled Gemstone'}
                </Typography>
            </Breadcrumbs>

            {/* Header with Actions */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <IconButton onClick={handleBack}>
                        <ArrowBackIcon />
                    </IconButton>
                    <Typography variant="h4" component="h1">
                        {gemstone.title || 'Untitled Gemstone'}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button 
                        variant="outlined" 
                        startIcon={<EditIcon />}
                        onClick={handleEdit}
                    >
                        Edit
                    </Button>
                    <Button 
                        variant="outlined" 
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={handleDelete}
                    >
                        Delete
                    </Button>
                </Box>
            </Box>

            <Grid container spacing={3}>
                {/* Main Image/Visual */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardMedia
                            component="div"
                            sx={{
                                height: 400,
                                background: 'linear-gradient(45deg, #e3f2fd 30%, #bbdefb 90%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexDirection: 'column'
                            }}
                        >
                            <Typography variant="h1" sx={{ fontSize: '6rem', mb: 2 }}>
                                💎
                            </Typography>
                            <Typography variant="h6" color="primary">
                                {gemstone.gemstone?.species || 'Gemstone'}
                            </Typography>
                        </CardMedia>
                        <CardContent>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                <Chip 
                                    label={gemstone.gemstone?.naturalSynthetic === 'natural' ? 'Natural' : 'Synthetic'}
                                    color={gemstone.gemstone?.naturalSynthetic === 'natural' ? 'success' : 'info'}
                                />
                                {gemstone.status && (
                                    <Chip 
                                        label={gemstone.status.charAt(0).toUpperCase() + gemstone.status.slice(1)}
                                        variant="outlined"
                                    />
                                )}
                                {gemstone.featured && (
                                    <Chip 
                                        label="Featured"
                                        color="primary"
                                    />
                                )}
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Gemstone Details */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Gemstone Details
                            </Typography>
                            <List>
                                {gemstone.gemstone?.species && (
                                    <ListItem>
                                        <ListItemIcon>
                                            <CutIcon color="primary" />
                                        </ListItemIcon>
                                        <ListItemText 
                                            primary="Species" 
                                            secondary={gemstone.gemstone.species}
                                        />
                                    </ListItem>
                                )}

                                {gemstone.gemstone?.subspecies && (
                                    <ListItem>
                                        <ListItemIcon>
                                            <CutIcon color="primary" />
                                        </ListItemIcon>
                                        <ListItemText 
                                            primary="Subspecies" 
                                            secondary={gemstone.gemstone.subspecies}
                                        />
                                    </ListItem>
                                )}

                                {gemstone.gemstone?.carat && (
                                    <ListItem>
                                        <ListItemIcon>
                                            <StraightenIcon color="primary" />
                                        </ListItemIcon>
                                        <ListItemText 
                                            primary="Carat Weight" 
                                            secondary={`${gemstone.gemstone.carat} ct`}
                                        />
                                    </ListItem>
                                )}

                                {gemstone.gemstone?.dimensions && (
                                    <ListItem>
                                        <ListItemIcon>
                                            <StraightenIcon color="primary" />
                                        </ListItemIcon>
                                        <ListItemText 
                                            primary="Dimensions" 
                                            secondary={`${gemstone.gemstone.dimensions.length || ''}×${gemstone.gemstone.dimensions.width || ''}×${gemstone.gemstone.dimensions.height || ''} mm`}
                                        />
                                    </ListItem>
                                )}

                                {gemstone.gemstone?.cut && Array.isArray(gemstone.gemstone.cut) && gemstone.gemstone.cut.length > 0 && (
                                    <ListItem>
                                        <ListItemIcon>
                                            <CutIcon color="primary" />
                                        </ListItemIcon>
                                        <ListItemText 
                                            primary="Cut" 
                                            secondary={gemstone.gemstone.cut.join(', ')}
                                        />
                                    </ListItem>
                                )}

                                {gemstone.gemstone?.cutStyle && Array.isArray(gemstone.gemstone.cutStyle) && gemstone.gemstone.cutStyle.length > 0 && (
                                    <ListItem>
                                        <ListItemIcon>
                                            <CutIcon color="primary" />
                                        </ListItemIcon>
                                        <ListItemText 
                                            primary="Cut Style" 
                                            secondary={gemstone.gemstone.cutStyle.join(', ')}
                                        />
                                    </ListItem>
                                )}

                                {gemstone.gemstone?.color && Array.isArray(gemstone.gemstone.color) && gemstone.gemstone.color.length > 0 && (
                                    <ListItem>
                                        <ListItemIcon>
                                            <PaletteIcon color="primary" />
                                        </ListItemIcon>
                                        <ListItemText 
                                            primary="Color" 
                                            secondary={gemstone.gemstone.color.join(', ')}
                                        />
                                    </ListItem>
                                )}

                                {gemstone.gemstone?.clarity && (
                                    <ListItem>
                                        <ListItemIcon>
                                            <ScienceIcon color="primary" />
                                        </ListItemIcon>
                                        <ListItemText 
                                            primary="Clarity" 
                                            secondary={gemstone.gemstone.clarity}
                                        />
                                    </ListItem>
                                )}

                                {gemstone.gemstone?.treatment && Array.isArray(gemstone.gemstone.treatment) && gemstone.gemstone.treatment.length > 0 && (
                                    <ListItem>
                                        <ListItemIcon>
                                            <ScienceIcon color="primary" />
                                        </ListItemIcon>
                                        <ListItemText 
                                            primary="Treatment" 
                                            secondary={gemstone.gemstone.treatment.join(', ')}
                                        />
                                    </ListItem>
                                )}

                                {gemstone.gemstone?.locale && (
                                    <ListItem>
                                        <ListItemIcon>
                                            <LocationIcon color="primary" />
                                        </ListItemIcon>
                                        <ListItemText 
                                            primary="Origin" 
                                            secondary={gemstone.gemstone.locale}
                                        />
                                    </ListItem>
                                )}
                            </List>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Business Information */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Business Information
                            </Typography>
                            <List>
                                {gemstone.vendor && (
                                    <ListItem>
                                        <ListItemIcon>
                                            <BusinessIcon color="primary" />
                                        </ListItemIcon>
                                        <ListItemText 
                                            primary="Vendor" 
                                            secondary={gemstone.vendor}
                                        />
                                    </ListItem>
                                )}

                                {gemstone.gemstone?.retailPrice && (
                                    <ListItem>
                                        <ListItemIcon>
                                            <MoneyIcon color="primary" />
                                        </ListItemIcon>
                                        <ListItemText 
                                            primary="Retail Price" 
                                            secondary={`$${gemstone.gemstone.retailPrice.toLocaleString()}`}
                                        />
                                    </ListItem>
                                )}

                                {gemstone.gemstone?.acquisitionPrice && (
                                    <ListItem>
                                        <ListItemIcon>
                                            <MoneyIcon color="primary" />
                                        </ListItemIcon>
                                        <ListItemText 
                                            primary="Acquisition Price" 
                                            secondary={`$${gemstone.gemstone.acquisitionPrice.toLocaleString()}`}
                                        />
                                    </ListItem>
                                )}

                                {gemstone.gemstone?.supplier && (
                                    <ListItem>
                                        <ListItemIcon>
                                            <PersonIcon color="primary" />
                                        </ListItemIcon>
                                        <ListItemText 
                                            primary="Supplier" 
                                            secondary={gemstone.gemstone.supplier}
                                        />
                                    </ListItem>
                                )}

                                {gemstone.gemstone?.acquisitionDate && (
                                    <ListItem>
                                        <ListItemIcon>
                                            <CalendarIcon color="primary" />
                                        </ListItemIcon>
                                        <ListItemText 
                                            primary="Acquisition Date" 
                                            secondary={new Date(gemstone.gemstone.acquisitionDate).toLocaleDateString()}
                                        />
                                    </ListItem>
                                )}

                                <ListItem>
                                    <ListItemIcon>
                                        <CalendarIcon color="primary" />
                                    </ListItemIcon>
                                    <ListItemText 
                                        primary="Created" 
                                        secondary={new Date(gemstone.createdAt).toLocaleDateString()}
                                    />
                                </ListItem>

                                {gemstone.updatedAt && gemstone.updatedAt !== gemstone.createdAt && (
                                    <ListItem>
                                        <ListItemIcon>
                                            <CalendarIcon color="primary" />
                                        </ListItemIcon>
                                        <ListItemText 
                                            primary="Last Updated" 
                                            secondary={new Date(gemstone.updatedAt).toLocaleDateString()}
                                        />
                                    </ListItem>
                                )}
                            </List>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Additional Information */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Additional Information
                            </Typography>
                            
                            {gemstone.description && (
                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="subtitle2" gutterBottom>
                                        Description
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {gemstone.description}
                                    </Typography>
                                </Box>
                            )}

                            {gemstone.internalNotes && (
                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="subtitle2" gutterBottom>
                                        Internal Notes
                                    </Typography>
                                    <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                                        <Typography variant="body2" color="text.secondary">
                                            {gemstone.internalNotes}
                                        </Typography>
                                    </Paper>
                                </Box>
                            )}

                            {gemstone.gemstone?.certification?.lab && (
                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="subtitle2" gutterBottom>
                                        Certification
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        <strong>Lab:</strong> {gemstone.gemstone.certification.lab}
                                    </Typography>
                                    {gemstone.gemstone.certification.number && (
                                        <Typography variant="body2" color="text.secondary">
                                            <strong>Number:</strong> {gemstone.gemstone.certification.number}
                                        </Typography>
                                    )}
                                    {gemstone.gemstone.certification.url && (
                                        <Button 
                                            size="small" 
                                            href={gemstone.gemstone.certification.url}
                                            target="_blank"
                                            sx={{ mt: 1 }}
                                        >
                                            View Certificate
                                        </Button>
                                    )}
                                </Box>
                            )}

                            {gemstone.gemstone?.designCoverage && (
                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="subtitle2" gutterBottom>
                                        Design Coverage
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Priority Level: {gemstone.gemstone.designCoverage.priorityLevel}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Custom Designs: {gemstone.gemstone.designCoverage.customDesignCount || 0}
                                    </Typography>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}