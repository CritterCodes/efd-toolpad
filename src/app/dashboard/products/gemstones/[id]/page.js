'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Grid,
    Button,
    Chip,
    IconButton,
    TextField,
    MenuItem,
    FormControl,
    InputLabel,
    Select,
    CircularProgress,
    Alert,
    FormControlLabel,
    RadioGroup,
    Radio,
    Autocomplete,
    Switch,
    Paper,
    Breadcrumbs,
    Link,
    Tabs,
    Tab,
    ImageList,
    ImageListItem,
    ImageListItemBar,
    Divider,
    Stack
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Save as SaveIcon,
    CloudUpload as CloudUploadIcon,
    Delete as DeleteIcon,
    PhotoCamera as PhotoCameraIcon,
    Publish as PublishIcon,
    Drafts as DraftsIcon
} from '@mui/icons-material';

// Import existing components if needed
// import ProductStatusDropdown from '@/components/ProductStatusDropdown';

export default function GemstoneEditorPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const params = useParams();
    const gemstoneId = params.id;
    const isNew = gemstoneId === 'new';

    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [tabValue, setTabValue] = useState(0);
    
    // Dynamic suggestions state
    const [dynamicSuggestions, setDynamicSuggestions] = useState({
        species: [],
        subspecies: [],
        colors: [],
        locales: [],
        cuts: [],
        cutStyles: [],
        treatments: []
    });

    // Form Data State
    const [formData, setFormData] = useState({
        title: '',
        species: '',
        subspecies: '',
        carat: '',
        dimensions: {
            length: '',
            width: '',
            height: ''
        },
        cut: [],
        cutStyle: [],
        treatment: [],
        color: [],
        locale: '',
        naturalSynthetic: 'natural',
        price: '',
        status: 'draft', // Default to draft
        objFile: null,
        images: [], // Array of image files (for new uploads)
        existingImages: [], // Array of URLs (for existing images)
        customMounting: false,
        userId: '',
        vendor: '',
        notes: ''
    });

    // Refs
    const fileInputRef = useRef(null);
    const imageInputRef = useRef(null);

    // Options (copied from list page)
    const speciesOptions = [
        'Beryl', 'Quartz', 'Garnet', 'Tourmaline', 'Corundum', 'Spinel',
        'Chrysoberyl', 'Topaz', 'Zoisite', 'Peridot (Olivine)', 'Zircon',
        'Diopside', 'Iolite (Cordierite)'
    ];

    const speciesSubspeciesMapping = {
        'Beryl': ['Emerald', 'Aquamarine', 'Morganite', 'Heliodor'],
        'Quartz': ['Amethyst', 'Citrine', 'Smoky Quartz', 'Rose Quartz'],
        'Garnet': ['Almandine', 'Pyrope', 'Spessartine', 'Rhodolite', 'Grossular', 'Tsavorite', 'Hessonite', 'Andradite', 'Demantoid'],
        'Tourmaline': ['Rubellite', 'Indicolite', 'Paraíba', 'Watermelon'],
        'Corundum': ['Ruby', 'Sapphire'],
        'Spinel': ['Red Spinel', 'Pink Spinel', 'Blue Spinel'],
        'Chrysoberyl': ['Alexandrite'],
        'Topaz': ['Blue Topaz', 'Imperial Topaz'],
        'Zoisite': ['Tanzanite'],
        'Peridot (Olivine)': ['Peridot'],
        'Zircon': ['Blue Zircon', 'White Zircon'],
        'Diopside': ['Chrome Diopside'],
        'Iolite (Cordierite)': ['Iolite']
    };

    const subspeciesOptions = [
        'Emerald', 'Aquamarine', 'Morganite', 'Heliodor',
        'Amethyst', 'Citrine', 'Smoky Quartz', 'Rose Quartz',
        'Almandine', 'Pyrope', 'Spessartine', 'Rhodolite', 'Grossular',
        'Tsavorite', 'Hessonite', 'Andradite', 'Demantoid',
        'Rubellite', 'Indicolite', 'Paraíba', 'Watermelon',
        'Ruby', 'Sapphire',
        'Red Spinel', 'Pink Spinel', 'Blue Spinel',
        'Alexandrite',
        'Blue Topaz', 'Imperial Topaz',
        'Tanzanite',
        'Peridot',
        'Blue Zircon', 'White Zircon',
        'Chrome Diopside',
        'Iolite'
    ];

    const colorOptions = [
        'Red', 'Blue', 'Green', 'Yellow', 'Orange', 'Pink', 'Purple', 'Violet',
        'White', 'Clear', 'Black', 'Brown', 'Gray', 'Multicolor',
        'Neon Blue', 'Electric Blue', 'Paraiba Blue', 'Teal', 'Mint Green',
        'Forest Green', 'Champagne', 'Cognac', 'Peach', 'Lavender',
        'Magenta', 'Hot Pink', 'Salmon', 'Golden', 'Canary Yellow'
    ];

    const localeOptions = [
        'Brazil', 'Afghanistan', 'Myanmar (Burma)', 'Sri Lanka', 'Madagascar',
        'Tanzania', 'Kenya', 'Mozambique', 'Nigeria', 'Zambia', 'Colombia',
        'Thailand', 'Cambodia', 'Vietnam', 'Australia', 'United States',
        'Canada', 'Mexico', 'Peru', 'Chile', 'Russia', 'China', 'India',
        'Pakistan', 'Nepal', 'Iran', 'Turkey', 'Ethiopia', 'Malawi'
    ];

    const cutOptions = [
        'Round', 'Oval', 'Square', 'Rectangle', 'Cushion', 'Emerald Cut', 
        'Princess', 'Marquise', 'Pear', 'Heart', 'Trillion', 'Baguette',
        'Radiant', 'Asscher', 'Free Form', 'Cabochon'
    ];

    const cutStyleOptions = [
        'Brilliant', 'Step Cut', 'Mixed Cut', 'Rose Cut', 'Cabochon',
        'Briolette', 'Checker Board', 'Portuguese Cut', 'Barion Cut',
        'Custom Cut', 'Fantasy Cut', 'Concave Cut'
    ];

    const treatmentOptions = [
        'Natural', 'Heat Treated', 'Oiled', 'Irradiated', 'Diffused',
        'Filled', 'Dyed', 'Bleached', 'Waxed', 'Clarity Enhanced',
        'Synthetic', 'Lab Created', 'Assembled', 'Coated', 'Lasered'
    ];

    // Load suggestions
    useEffect(() => {
        const loadSuggestions = async () => {
            try {
                const response = await fetch('/api/suggestions');
                if (response.ok) {
                    const suggestions = await response.json();
                    setDynamicSuggestions({
                        species: suggestions.species || [],
                        subspecies: suggestions.subspecies || [],
                        colors: suggestions.colors || [],
                        locales: suggestions.locales || [],
                        cuts: suggestions.cuts || [],
                        cutStyles: suggestions.cutStyles || [],
                        treatments: suggestions.treatments || []
                    });
                }
            } catch (error) {
                console.error('Failed to load suggestions:', error);
            }
        };
        loadSuggestions();
    }, []);

    // Fetch gemstone data if editing
    useEffect(() => {
        if (isNew) {
            // Initialize defaults for new gemstone
            if (session?.user) {
                setFormData(prev => ({
                    ...prev,
                    userId: session.user.id || session.user.email,
                    vendor: session.user.businessName || session.user.slug || session.user.name || 'Current Artisan'
                }));
            }
            return;
        }

        const fetchGemstone = async () => {
            try {
                setLoading(true);
                const response = await fetch(`/api/products/gemstones/${gemstoneId}`);
                if (!response.ok) throw new Error('Failed to fetch gemstone');
                
                const data = await response.json();
                const gemstone = data.gemstone || data;

                setFormData({
                    title: gemstone.title || '',
                    species: Array.isArray(gemstone.gemstone?.species || gemstone.species) ? (gemstone.gemstone?.species || gemstone.species)[0] : (gemstone.gemstone?.species || gemstone.species) || '',
                    subspecies: Array.isArray(gemstone.gemstone?.subspecies || gemstone.subspecies) ? (gemstone.gemstone?.subspecies || gemstone.subspecies)[0] : (gemstone.gemstone?.subspecies || gemstone.subspecies) || '',
                    carat: gemstone.gemstone?.carat || gemstone.carat || '',
                    dimensions: gemstone.gemstone?.dimensions || gemstone.dimensions || { length: '', width: '', height: '' },
                    cut: gemstone.gemstone?.cut || gemstone.cut || [],
                    cutStyle: gemstone.gemstone?.cutStyle || gemstone.cutStyle || [],
                    treatment: gemstone.gemstone?.treatment || gemstone.treatment || [],
                    color: gemstone.gemstone?.color || gemstone.color || [],
                    locale: Array.isArray(gemstone.gemstone?.locale || gemstone.locale) ? (gemstone.gemstone?.locale || gemstone.locale)[0] : (gemstone.gemstone?.locale || gemstone.locale) || '',
                    naturalSynthetic: gemstone.gemstone?.naturalSynthetic || gemstone.naturalSynthetic || 'natural',
                    price: gemstone.gemstone?.retailPrice || gemstone.price || '',
                    status: gemstone.status || 'draft',
                    objFile: null,
                    images: [],
                    existingImages: gemstone.images || [],
                    customMounting: gemstone.customMounting || false,
                    userId: gemstone.userId || session?.user?.id,
                    vendor: gemstone.vendor || '',
                    notes: gemstone.notes || ''
                });
            } catch (err) {
                console.error('Error fetching gemstone:', err);
                setError('Failed to load gemstone details');
            } finally {
                setLoading(false);
            }
        };

        if (session?.user) {
            fetchGemstone();
        }
    }, [gemstoneId, isNew, session]);

    // Helper functions
    const getAllOptions = (type) => {
        const predefinedMap = {
            species: speciesOptions,
            subspecies: subspeciesOptions,
            colors: colorOptions,
            locales: localeOptions,
            cuts: cutOptions,
            cutStyles: cutStyleOptions,
            treatments: treatmentOptions
        };
        const predefined = predefinedMap[type] || [];
        const dynamic = dynamicSuggestions[type] || [];
        return [...new Set([...predefined, ...dynamic])].sort();
    };

    const getFilteredSubspecies = () => {
        if (!formData.species) return getAllOptions('subspecies');
        const relevant = speciesSubspeciesMapping[formData.species] || [];
        const dynamic = dynamicSuggestions.subspecies || [];
        return [...new Set([...relevant, ...dynamic])].sort();
    };

    const handleInputChange = (field, value) => {
        if (field.includes('.')) {
            const [parent, child] = field.split('.');
            setFormData(prev => ({
                ...prev,
                [parent]: { ...prev[parent], [child]: value }
            }));
        } else {
            setFormData(prev => ({ ...prev, [field]: value }));
        }
    };

    const handleAutocompleteChange = (field, newValue) => {
        handleInputChange(field, newValue);
    };

    const handleImageUpload = (event) => {
        const files = Array.from(event.target.files);
        const validImages = files.filter(file => file.type.startsWith('image/'));
        if (validImages.length > 0) {
            setFormData(prev => ({
                ...prev,
                images: [...prev.images, ...validImages]
            }));
        }
    };

    const handleRemoveNewImage = (index) => {
        setFormData(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index)
        }));
    };

    const handleRemoveExistingImage = (index) => {
        setFormData(prev => ({
            ...prev,
            existingImages: prev.existingImages.filter((_, i) => i !== index)
        }));
    };

    const handleObjUpload = (event) => {
        const file = event.target.files[0];
        if (file && file.name.endsWith('.obj')) {
            setFormData(prev => ({ ...prev, objFile: file }));
        } else {
            alert('Please select a valid .obj file');
        }
    };

    const handleSave = async (targetStatus) => {
        try {
            setSaving(true);
            setError('');

            const method = isNew ? 'POST' : 'PUT';
            const url = '/api/products/gemstones';
            
            // Prepare data
            const { objFile, images, existingImages, ...metadata } = formData;
            
            // Ensure status is updated
            const dataToSend = {
                ...metadata,
                status: targetStatus || formData.status,
                images: existingImages, // Keep existing images
                productId: !isNew ? gemstoneId : undefined
            };

            // 1. Save Metadata
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToSend),
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to save gemstone');

            const productId = result.productId || gemstoneId;

            // 2. Upload New Images
            if (images && images.length > 0) {
                const imageFormData = new FormData();
                images.forEach(file => imageFormData.append('images', file));
                imageFormData.append('productId', productId);
                imageFormData.append('productType', 'gemstones');

                await fetch('/api/products/upload', {
                    method: 'POST',
                    body: imageFormData,
                });
            }

            // 3. Upload OBJ File
            if (objFile) {
                const objFormData = new FormData();
                objFormData.append('objFile', objFile);
                await fetch(`/api/products/gemstones/${productId}/upload-obj`, {
                    method: 'POST',
                    body: objFormData,
                });
            }

            // Redirect or refresh
            if (isNew) {
                router.push(`/dashboard/products/gemstones/${productId}`);
            } else {
                // Refresh data
                window.location.reload();
            }

        } catch (err) {
            console.error('Save error:', err);
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3, maxWidth: 1600, mx: 'auto' }}>
            {/* Header */}
            <Box sx={{ mb: 3 }}>
                <Breadcrumbs sx={{ mb: 2 }}>
                    <Link href="/dashboard/products/gemstones" color="inherit" underline="hover">Gemstones</Link>
                    <Typography color="text.primary">{isNew ? 'New Gemstone' : formData.title || 'Edit Gemstone'}</Typography>
                </Breadcrumbs>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <IconButton onClick={() => router.back()} sx={{ mr: 1 }}>
                            <ArrowBackIcon />
                        </IconButton>
                        <Typography variant="h4">
                            {isNew ? 'Add New Gemstone' : 'Edit Gemstone'}
                        </Typography>
                        {!isNew && (
                            <Chip 
                                label={formData.status?.toUpperCase()} 
                                color={formData.status === 'active' ? 'success' : 'default'}
                                size="small"
                            />
                        )}
                    </Box>
                    <Stack direction="row" spacing={2}>
                        <Button 
                            variant="outlined" 
                            startIcon={<DraftsIcon />}
                            onClick={() => handleSave('draft')}
                            disabled={saving}
                        >
                            Save as Draft
                        </Button>
                        <Button 
                            variant="contained" 
                            startIcon={isNew ? <SaveIcon /> : <PublishIcon />}
                            onClick={() => handleSave('active')}
                            disabled={saving}
                        >
                            {isNew ? 'Save & Publish' : 'Update Product'}
                        </Button>
                    </Stack>
                </Box>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            <Grid container spacing={3}>
                {/* Left Column - Main Info */}
                <Grid item xs={12} lg={8}>
                    <Stack spacing={3}>
                        {/* Basic Info Card */}
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>Basic Information</Typography>
                                <Grid container spacing={3}>
                                    <Grid item xs={12}>
                                        <TextField 
                                            fullWidth 
                                            label="Title" 
                                            value={formData.title}
                                            onChange={(e) => handleInputChange('title', e.target.value)}
                                            placeholder="e.g., Brilliant Round Blue Sapphire"
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <TextField 
                                            fullWidth 
                                            multiline
                                            rows={4}
                                            label="Description / Notes" 
                                            value={formData.notes}
                                            onChange={(e) => handleInputChange('notes', e.target.value)}
                                        />
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>

                        {/* Media Card */}
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>Media</Typography>
                                <Box 
                                    sx={{ 
                                        border: '2px dashed', 
                                        borderColor: 'divider', 
                                        borderRadius: 2, 
                                        p: 3, 
                                        textAlign: 'center',
                                        cursor: 'pointer',
                                        bgcolor: 'action.hover',
                                        mb: 3
                                    }}
                                    onClick={() => imageInputRef.current?.click()}
                                >
                                    <input
                                        type="file"
                                        ref={imageInputRef}
                                        onChange={handleImageUpload}
                                        accept="image/*"
                                        multiple
                                        style={{ display: 'none' }}
                                    />
                                    <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                                    <Typography color="text.secondary">Click to upload images</Typography>
                                </Box>

                                {/* Image Grid */}
                                {(formData.existingImages.length > 0 || formData.images.length > 0) && (
                                    <ImageList cols={4} rowHeight={160} gap={16}>
                                        {/* Existing Images */}
                                        {formData.existingImages.map((url, index) => (
                                            <ImageListItem key={`existing-${index}`}>
                                                <img src={url} alt={`Existing ${index}`} loading="lazy" style={{ height: '100%', objectFit: 'cover', borderRadius: 8 }} />
                                                <ImageListItemBar
                                                    position="top"
                                                    actionIcon={
                                                        <IconButton sx={{ color: 'white' }} onClick={() => handleRemoveExistingImage(index)}>
                                                            <DeleteIcon />
                                                        </IconButton>
                                                    }
                                                />
                                            </ImageListItem>
                                        ))}
                                        {/* New Images */}
                                        {formData.images.map((file, index) => (
                                            <ImageListItem key={`new-${index}`}>
                                                <img src={URL.createObjectURL(file)} alt={`New ${index}`} loading="lazy" style={{ height: '100%', objectFit: 'cover', borderRadius: 8 }} />
                                                <ImageListItemBar
                                                    position="top"
                                                    actionIcon={
                                                        <IconButton sx={{ color: 'white' }} onClick={() => handleRemoveNewImage(index)}>
                                                            <DeleteIcon />
                                                        </IconButton>
                                                    }
                                                />
                                            </ImageListItem>
                                        ))}
                                    </ImageList>
                                )}
                            </CardContent>
                        </Card>

                        {/* Gemstone Details */}
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>Gemstone Details</Typography>
                                <Grid container spacing={3}>
                                    <Grid item xs={12} sm={6}>
                                        <Autocomplete
                                            options={getAllOptions('species')}
                                            value={formData.species}
                                            onChange={(_, v) => handleInputChange('species', v)}
                                            renderInput={(params) => <TextField {...params} label="Species" />}
                                            freeSolo
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Autocomplete
                                            options={getFilteredSubspecies()}
                                            value={formData.subspecies}
                                            onChange={(_, v) => handleInputChange('subspecies', v)}
                                            renderInput={(params) => <TextField {...params} label="Subspecies" />}
                                            freeSolo
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Autocomplete
                                            multiple
                                            options={getAllOptions('colors')}
                                            value={formData.color}
                                            onChange={(_, v) => handleAutocompleteChange('color', v)}
                                            renderInput={(params) => <TextField {...params} label="Color" />}
                                            freeSolo
                                            renderTags={(value, getTagProps) =>
                                                value.map((option, index) => (
                                                    <Chip key={index} label={option} {...getTagProps({ index })} size="small" />
                                                ))
                                            }
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Autocomplete
                                            options={getAllOptions('locales')}
                                            value={formData.locale}
                                            onChange={(_, v) => handleInputChange('locale', v)}
                                            renderInput={(params) => <TextField {...params} label="Origin" />}
                                            freeSolo
                                        />
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>

                        {/* Physical Properties */}
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>Physical Properties</Typography>
                                <Grid container spacing={3}>
                                    <Grid item xs={12} sm={6}>
                                        <TextField 
                                            fullWidth 
                                            label="Carat Weight" 
                                            type="number"
                                            value={formData.carat}
                                            onChange={(e) => handleInputChange('carat', e.target.value)}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField 
                                            fullWidth 
                                            label="Price ($)" 
                                            type="number"
                                            value={formData.price}
                                            onChange={(e) => handleInputChange('price', e.target.value)}
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Typography variant="subtitle2" gutterBottom>Dimensions (mm)</Typography>
                                        <Grid container spacing={2}>
                                            <Grid item xs={4}>
                                                <TextField 
                                                    fullWidth label="Length" type="number"
                                                    value={formData.dimensions.length}
                                                    onChange={(e) => handleInputChange('dimensions.length', e.target.value)}
                                                />
                                            </Grid>
                                            <Grid item xs={4}>
                                                <TextField 
                                                    fullWidth label="Width" type="number"
                                                    value={formData.dimensions.width}
                                                    onChange={(e) => handleInputChange('dimensions.width', e.target.value)}
                                                />
                                            </Grid>
                                            <Grid item xs={4}>
                                                <TextField 
                                                    fullWidth label="Height" type="number"
                                                    value={formData.dimensions.height}
                                                    onChange={(e) => handleInputChange('dimensions.height', e.target.value)}
                                                />
                                            </Grid>
                                        </Grid>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Autocomplete
                                            multiple
                                            options={getAllOptions('cuts')}
                                            value={formData.cut}
                                            onChange={(_, v) => handleAutocompleteChange('cut', v)}
                                            renderInput={(params) => <TextField {...params} label="Cut Shape" />}
                                            freeSolo
                                            renderTags={(value, getTagProps) =>
                                                value.map((option, index) => (
                                                    <Chip key={index} label={option} {...getTagProps({ index })} size="small" />
                                                ))
                                            }
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Autocomplete
                                            multiple
                                            options={getAllOptions('cutStyles')}
                                            value={formData.cutStyle}
                                            onChange={(_, v) => handleAutocompleteChange('cutStyle', v)}
                                            renderInput={(params) => <TextField {...params} label="Cut Style" />}
                                            freeSolo
                                            renderTags={(value, getTagProps) =>
                                                value.map((option, index) => (
                                                    <Chip key={index} label={option} {...getTagProps({ index })} size="small" />
                                                ))
                                            }
                                        />
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    </Stack>
                </Grid>

                {/* Right Column - Sidebar */}
                <Grid item xs={12} lg={4}>
                    <Stack spacing={3}>
                        {/* Status Card */}
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>Status</Typography>
                                <FormControl fullWidth sx={{ mb: 2 }}>
                                    <InputLabel>Product Status</InputLabel>
                                    <Select
                                        value={formData.status}
                                        label="Product Status"
                                        onChange={(e) => handleInputChange('status', e.target.value)}
                                    >
                                        <MenuItem value="draft">Draft</MenuItem>
                                        <MenuItem value="active">Active</MenuItem>
                                        <MenuItem value="archived">Archived</MenuItem>
                                    </Select>
                                </FormControl>
                                <FormControl component="fieldset">
                                    <Typography variant="subtitle2" gutterBottom>Type</Typography>
                                    <RadioGroup
                                        value={formData.naturalSynthetic}
                                        onChange={(e) => handleInputChange('naturalSynthetic', e.target.value)}
                                    >
                                        <FormControlLabel value="natural" control={<Radio />} label="Natural" />
                                        <FormControlLabel value="synthetic" control={<Radio />} label="Synthetic / Lab" />
                                    </RadioGroup>
                                </FormControl>
                            </CardContent>
                        </Card>

                        {/* Organization */}
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>Organization</Typography>
                                <TextField 
                                    fullWidth 
                                    label="Vendor" 
                                    value={formData.vendor}
                                    onChange={(e) => handleInputChange('vendor', e.target.value)}
                                    sx={{ mb: 2 }}
                                />
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={formData.customMounting}
                                            onChange={(e) => handleInputChange('customMounting', e.target.checked)}
                                        />
                                    }
                                    label="Available for Custom Mounting"
                                />
                            </CardContent>
                        </Card>

                        {/* Treatments */}
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>Treatments</Typography>
                                <Autocomplete
                                    multiple
                                    options={getAllOptions('treatments')}
                                    value={formData.treatment}
                                    onChange={(_, v) => handleAutocompleteChange('treatment', v)}
                                    renderInput={(params) => <TextField {...params} label="Treatments" />}
                                    freeSolo
                                    renderTags={(value, getTagProps) =>
                                        value.map((option, index) => (
                                            <Chip key={index} label={option} {...getTagProps({ index })} size="small" />
                                        ))
                                    }
                                />
                            </CardContent>
                        </Card>

                        {/* 3D Model */}
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>3D Model</Typography>
                                <Box 
                                    sx={{ 
                                        border: '1px solid', 
                                        borderColor: 'divider', 
                                        borderRadius: 1, 
                                        p: 2,
                                        textAlign: 'center'
                                    }}
                                >
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleObjUpload}
                                        accept=".obj"
                                        style={{ display: 'none' }}
                                    />
                                    <Button 
                                        variant="outlined" 
                                        startIcon={<CloudUploadIcon />}
                                        onClick={() => fileInputRef.current?.click()}
                                        fullWidth
                                    >
                                        Upload .OBJ
                                    </Button>
                                    {formData.objFile && (
                                        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                                            Selected: {formData.objFile.name}
                                        </Typography>
                                    )}
                                </Box>
                            </CardContent>
                        </Card>
                    </Stack>
                </Grid>
            </Grid>

            {/* Tabs for Designs/CAD (Only if not new) */}
            {!isNew && (
                <Box sx={{ mt: 4 }}>
                    <Divider sx={{ mb: 3 }} />
                    <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
                        <Tab label="Designs" />
                        <Tab label="CAD Requests" />
                    </Tabs>
                    <Box sx={{ py: 3 }}>
                        {tabValue === 0 && <Typography color="text.secondary">Designs management coming soon...</Typography>}
                        {tabValue === 1 && <Typography color="text.secondary">CAD Requests management coming soon...</Typography>}
                    </Box>
                </Box>
            )}
        </Box>
    );
}
