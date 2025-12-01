'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { getStatusDisplayName, getStatusColor } from '@/lib/statusMapping';
import {
    Box,
    Typography,
    Card,
    CardContent,
    CardMedia,
    CardActions,
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
    CircularProgress,
    Alert,
    FormLabel,
    RadioGroup,
    FormControlLabel,
    Radio,
    Autocomplete,
    Stepper,
    Step,
    StepLabel,
    StepContent,
    Switch,
    useMediaQuery,
    useTheme,
    Pagination,
    Tooltip
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Visibility as VisibilityIcon,
    CloudUpload as CloudUploadIcon,
    NavigateNext as NavigateNextIcon,
    NavigateBefore as NavigateBeforeIcon,
    Check as CheckIcon,
    Search as SearchIcon,
    Sort as SortIcon,
    TrendingUp as TrendingUpIcon,
    Diamond as DiamondIcon
} from '@mui/icons-material';

export default function GemstonesPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    
    const [gemstones, setGemstones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedGemstone, setSelectedGemstone] = useState(null);
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(6); // 6 cards per page
    
    // Stepper state
    const [activeStep, setActiveStep] = useState(0);
    const [completed, setCompleted] = useState({});
    
    // File input ref
    const fileInputRef = useRef(null);
    
    // Dynamic suggestions state
    const [dynamicSuggestions, setDynamicSuggestions] = useState({
        species: [],
        subspecies: [],
        colors: [],
        locales: [],
        cuts: [], // Geometric cuts (Round, Princess, etc.)
        cutStyles: [], // Cutting techniques (Brilliant, Fantasy, etc.)
        treatments: []
    });
    
    const [formData, setFormData] = useState({
        title: '',
        species: '', // Single species instead of array
        subspecies: '', // Single subspecies instead of array
        carat: '',
        dimensions: {
            length: '',
            width: '',
            height: ''
        },
        cut: [], // Geometric cuts (Round, Princess, etc.)
        cutStyle: [], // Cutting techniques (Brilliant, Fantasy, etc.)
        treatment: [],
        color: [],
        locale: '', // Single locale instead of array
        naturalSynthetic: 'natural',
        price: '',
        objFile: null,
        customMounting: false,
        userId: '', // Track who created the product
        vendor: '', // Business name or slug
        notes: ''
    });

    // Predefined options for pill inputs
    const speciesOptions = [
        'Beryl', 'Quartz', 'Garnet', 'Tourmaline', 'Corundum', 'Spinel',
        'Chrysoberyl', 'Topaz', 'Zoisite', 'Peridot (Olivine)', 'Zircon',
        'Diopside', 'Iolite (Cordierite)'
    ];

    // Species-to-subspecies mapping for better categorization
    const speciesSubspeciesMapping = {
        'Beryl': [
            'Emerald', 'Aquamarine', 'Morganite', 'Heliodor'
        ],
        'Quartz': [
            'Amethyst', 'Citrine', 'Smoky Quartz', 'Rose Quartz'
        ],
        'Garnet': [
            'Almandine', 'Pyrope', 'Spessartine', 'Rhodolite', 'Grossular',
            'Tsavorite', 'Hessonite', 'Andradite', 'Demantoid'
        ],
        'Tourmaline': [
            'Rubellite', 'Indicolite', 'Paraíba', 'Watermelon'
        ],
        'Corundum': [
            'Ruby', 'Sapphire'
        ],
        'Spinel': [
            'Red Spinel', 'Pink Spinel', 'Blue Spinel'
        ],
        'Chrysoberyl': [
            'Alexandrite'
        ],
        'Topaz': [
            'Blue Topaz', 'Imperial Topaz'
        ],
        'Zoisite': [
            'Tanzanite'
        ],
        'Peridot (Olivine)': [
            'Peridot'
        ],
        'Zircon': [
            'Blue Zircon', 'White Zircon'
        ],
        'Diopside': [
            'Chrome Diopside'
        ],
        'Iolite (Cordierite)': [
            'Iolite'
        ]
    };

    // Legacy subspecies list for backward compatibility and custom entries
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

    // Geometric cuts (shapes)
    const cutOptions = [
        'Round', 'Oval', 'Square', 'Rectangle', 'Cushion', 'Emerald Cut', 
        'Princess', 'Marquise', 'Pear', 'Heart', 'Trillion', 'Baguette',
        'Radiant', 'Asscher', 'Free Form', 'Cabochon'
    ];

    // Cutting techniques/styles
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

    // Stepper configuration
    const steps = [
        {
            label: 'Basic Information',
            description: 'Title, carat weight, and pricing',
        },
        {
            label: 'Gemstone Details',
            description: 'Species, subspecies, color, and origin',
        },
        {
            label: 'Physical Properties', 
            description: 'Dimensions, cut, and cutting style',
        },
        {
            label: 'Treatment & Options',
            description: 'Treatments, type, and custom mounting',
        },
        {
            label: 'Files & Notes',
            description: '3D model upload and additional notes',
        }
    ];

    const totalSteps = () => steps.length;
    const completedSteps = () => Object.keys(completed).length;
    const isLastStep = () => activeStep === totalSteps() - 1;
    const allStepsCompleted = () => completedSteps() === totalSteps();

    const handleNext = () => {
        const newActiveStep = 
            isLastStep() && !allStepsCompleted()
                ? steps.findIndex((step, i) => !(i in completed))
                : activeStep + 1;
        setActiveStep(newActiveStep);
    };

    const handleBack = () => {
        setActiveStep((prevActiveStep) => prevActiveStep - 1);
    };

    const handleStep = (step) => () => {
        setActiveStep(step);
    };

    const handleComplete = () => {
        setCompleted({
            ...completed,
            [activeStep]: true,
        });
        handleNext();
    };

    const handleReset = () => {
        setActiveStep(0);
        setCompleted({});
    };

    // Combine predefined options with dynamic suggestions
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
        
        // Merge and remove duplicates
        return [...new Set([...predefined, ...dynamic])].sort();
    };

    // Get filtered subspecies based on selected species
    const getFilteredSubspecies = () => {
        if (!formData.species) {
            // No species selected, show all subspecies
            return getAllOptions('subspecies');
        }

        // Get subspecies for the selected species
        const relevantSubspecies = speciesSubspeciesMapping[formData.species] || [];

        // Also include dynamic suggestions for subspecies
        const dynamicSubspecies = dynamicSuggestions.subspecies || [];
        
        // Merge and remove duplicates
        return [...new Set([...relevantSubspecies, ...dynamicSubspecies])].sort();
    };

    // Save new suggestion to backend
    const saveNewSuggestion = async (type, value) => {
        try {
            const response = await fetch('/api/suggestions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, value })
            });
            
            if (!response.ok) {
                console.error('Failed to save suggestion:', response.status, response.statusText);
                return;
            }
            
            // Update local state
            setDynamicSuggestions(prev => ({
                ...prev,
                [type]: [...new Set([...(prev[type] || []), value])].sort()
            }));
        } catch (error) {
            console.error('Failed to save suggestion:', error);
        }
    };

    // Load dynamic suggestions from backend
    const loadSuggestions = async () => {
        try {
            const response = await fetch('/api/suggestions');
            if (response.ok) {
                const suggestions = await response.json();
                // Ensure all expected properties exist
                setDynamicSuggestions({
                    species: suggestions.species || [],
                    subspecies: suggestions.subspecies || [],
                    colors: suggestions.colors || [],
                    locales: suggestions.locales || [],
                    cuts: suggestions.cuts || [],
                    cutStyles: suggestions.cutStyles || [],
                    treatments: suggestions.treatments || []
                });
            } else {
                console.error('Failed to load suggestions:', response.status, response.statusText);
            }
        } catch (error) {
            console.error('Failed to load suggestions:', error);
        }
    };

    // Handle autocomplete changes with new suggestion detection
    const handleAutocompleteChange = (field, newValue, previousValue) => {
        // Find newly added values
        const newValues = newValue.filter(value => !previousValue.includes(value));
        
        // Save new suggestions
        newValues.forEach(value => {
            const typeMap = {
                species: 'species',
                subspecies: 'subspecies', 
                color: 'colors',
                locale: 'locales',
                cut: 'cuts',
                cutStyle: 'cutStyles',
                treatment: 'treatments'
            };
            
            const suggestionType = typeMap[field];
            if (suggestionType && !getAllOptions(suggestionType).includes(value)) {
                saveNewSuggestion(suggestionType, value);
            }
        });
        
        // Update form data
        handleInputChange(field, newValue);
    };

    // Special handler for species changes that filters subspecies
    const handleSpeciesChange = (newValue) => {
        // Save new species suggestion if it's custom
        if (newValue && !getAllOptions('species').includes(newValue)) {
            saveNewSuggestion('species', newValue);
        }

        // Update species
        handleInputChange('species', newValue);

        // Clear subspecies if it's not valid for the new species
        if (formData.subspecies && newValue) {
            const validSubspecies = speciesSubspeciesMapping[newValue] || [];
            const isDynamicSubspecies = dynamicSuggestions.subspecies?.includes(formData.subspecies);
            
            if (!validSubspecies.includes(formData.subspecies) && !isDynamicSubspecies) {
                handleInputChange('subspecies', '');
            }
        } else if (!newValue) {
            // Clear subspecies if no species is selected
            handleInputChange('subspecies', '');
        }
    };

    // Fetch gemstones from API
    useEffect(() => {
        fetchGemstones();
        loadSuggestions();
    }, []);

    // Set vendor and userId when component mounts
    useEffect(() => {
        if (session?.user) {
            setFormData(prev => ({
                ...prev,
                userId: session.user.id || session.user.email,
                vendor: session.user.businessName || session.user.slug || session.user.name || 'Current Artisan'
            }));
        }
    }, [session]);

    // Filtering and sorting state
    const [searchQuery, setSearchQuery] = useState('');
    const [filterSpecies, setFilterSpecies] = useState('');
    const [sortBy, setSortBy] = useState('title');
    const [sortOrder, setSortOrder] = useState('asc');

    const fetchGemstones = async () => {
        try {
            setLoading(true);
            console.log('Fetching gemstones...');
            const response = await fetch('/api/products/gemstones');
            if (!response.ok) {
                throw new Error('Failed to fetch gemstones');
            }
            const data = await response.json();
            console.log('Fetched gemstones:', data);
            setGemstones(data.gemstones || []);
        } catch (err) {
            console.error('Fetch error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Filter and sort gemstones
    const getFilteredAndSortedGemstones = () => {
        let filtered = gemstones.filter(gem => {
            const title = (gem.title || '').toLowerCase();
            const species = ((gem.gemstone?.species) || (gem.species) || '').toLowerCase();
            const subspecies = ((gem.gemstone?.subspecies) || (gem.subspecies) || '').toLowerCase();
            const query = searchQuery.toLowerCase();

            // Search by title, species, or subspecies
            const matchesSearch = !query || title.includes(query) || species.includes(query) || subspecies.includes(query);

            // Filter by species if selected
            const matchesSpecies = !filterSpecies || species === filterSpecies.toLowerCase();

            return matchesSearch && matchesSpecies;
        });

        // Sort gemstones
        filtered.sort((a, b) => {
            let aValue, bValue;

            switch (sortBy) {
                case 'title':
                    aValue = (a.title || '').toLowerCase();
                    bValue = (b.title || '').toLowerCase();
                    break;
                case 'species':
                    aValue = ((a.gemstone?.species) || (a.species) || '').toLowerCase();
                    bValue = ((b.gemstone?.species) || (b.species) || '').toLowerCase();
                    break;
                case 'carat':
                    aValue = a.gemstone?.carat || a.carat || 0;
                    bValue = b.gemstone?.carat || b.carat || 0;
                    break;
                case 'price':
                    aValue = a.gemstone?.retailPrice || a.retailPrice || 0;
                    bValue = b.gemstone?.retailPrice || b.retailPrice || 0;
                    break;
                case 'date':
                    aValue = new Date(a.createdAt || 0);
                    bValue = new Date(b.createdAt || 0);
                    break;
                default:
                    aValue = a.title;
                    bValue = b.title;
            }

            if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        return filtered;
    };

    const filteredGemstones = getFilteredAndSortedGemstones();
    const uniqueSpecies = [...new Set(gemstones.map(g => (g.gemstone?.species) || (g.species) || '').filter(Boolean))];

    const handleAddGemstone = () => {
        setSelectedGemstone(null);
        setActiveStep(0);
        setCompleted({});
        setFormData({
            title: '',
            species: '', // Single species
            subspecies: '', // Single subspecies
            carat: '',
            dimensions: {
                length: '',
                width: '',
                height: ''
            },
            cut: [], // Geometric cuts (Round, Princess, etc.)
            cutStyle: [], // Cutting techniques (Brilliant, Fantasy, etc.)
            treatment: [],
            color: [],
            locale: '', // Single locale instead of array
            naturalSynthetic: 'natural',
            price: '',
            objFile: null,
            customMounting: false,
            userId: session?.user?.id || session?.user?.email,
            vendor: session?.user?.businessName || session?.user?.slug || session?.user?.name || 'Current Artisan',
            notes: ''
        });
        setOpenDialog(true);
    };

    const handleEditGemstone = (gemstone) => {
        setSelectedGemstone(gemstone);
        setActiveStep(0);
        setCompleted({});
        setFormData({
            title: gemstone.title || '',
            species: Array.isArray(gemstone.species) ? gemstone.species[0] || '' : gemstone.species || '',
            subspecies: Array.isArray(gemstone.subspecies) ? gemstone.subspecies[0] || '' : gemstone.subspecies || '',
            carat: gemstone.carat || '',
            dimensions: gemstone.dimensions || { length: '', width: '', height: '' },
            cut: gemstone.cut || gemstone.shape || [], // Support both cut and legacy shape
            cutStyle: gemstone.cutStyle || [], // New field for cutting techniques  
            treatment: gemstone.treatment || [],
            color: gemstone.color || [],
            locale: Array.isArray(gemstone.locale) ? gemstone.locale[0] || '' : gemstone.locale || '', // Convert array to single string
            naturalSynthetic: gemstone.naturalSynthetic || 'natural',
            price: gemstone.price || '',
            objFile: null, // File upload handled separately
            customMounting: gemstone.customMounting || false,
            userId: gemstone.userId || session?.user?.id || session?.user?.email,
            vendor: gemstone.vendor || session?.user?.businessName || session?.user?.slug || session?.user?.name || 'Current Artisan',
            notes: gemstone.notes || ''
        });
        setOpenDialog(true);
    };

    const handleSaveGemstone = async () => {
        try {
            const method = selectedGemstone ? 'PUT' : 'POST';
            const url = '/api/products/gemstones';
            
            // Create a copy of form data to send
            let dataToSend = selectedGemstone 
                ? { ...formData, productId: selectedGemstone.productId }
                : { ...formData };
            
            console.log('Saving gemstone:', { method, dataToSend });
            
            // If there's an OBJ file to upload, handle it separately
            if (formData.objFile && formData.objFile instanceof File) {
                console.log('📁 OBJ file detected, uploading to S3 first...');
                
                // For create (POST), we need to save the product first to get an ID
                if (!selectedGemstone) {
                    // Remove objFile from data being sent - we'll upload after creation
                    const { objFile, ...dataWithoutFile } = dataToSend;
                    
                    const initialResponse = await fetch(url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(dataWithoutFile),
                    });

                    const initialResult = await initialResponse.json();
                    console.log('Initial save response:', initialResult);

                    if (!initialResponse.ok) {
                        throw new Error(initialResult.error || 'Failed to create gemstone');
                    }

                    // Now upload the OBJ file using the returned productId
                    const productId = initialResult.productId;
                    console.log('✅ Gemstone created, now uploading OBJ file...');
                    
                    const objFormData = new FormData();
                    objFormData.append('objFile', formData.objFile);
                    
                    const objUploadResponse = await fetch(`/api/products/gemstones/${productId}/upload-obj`, {
                        method: 'POST',
                        body: objFormData,
                    });

                    const objUploadResult = await objUploadResponse.json();
                    console.log('OBJ upload response:', objUploadResult);

                    if (!objUploadResponse.ok) {
                        console.warn('⚠️ OBJ upload failed, but gemstone was created:', objUploadResult.error);
                        // Don't fail entirely - the gemstone was created successfully
                    } else {
                        console.log('✅ OBJ file uploaded successfully');
                    }
                } else {
                    // For updates (PUT), upload the OBJ file first
                    const objFormData = new FormData();
                    objFormData.append('objFile', formData.objFile);
                    
                    console.log('✅ Uploading OBJ file for existing gemstone...');
                    
                    const objUploadResponse = await fetch(`/api/products/gemstones/${selectedGemstone.productId}/upload-obj`, {
                        method: 'POST',
                        body: objFormData,
                    });

                    const objUploadResult = await objUploadResponse.json();
                    console.log('OBJ upload response:', objUploadResult);

                    if (!objUploadResponse.ok) {
                        throw new Error(objUploadResult.error || 'Failed to upload OBJ file');
                    }

                    // Remove objFile from dataToSend and send the rest
                    const { objFile, ...dataWithoutFile } = dataToSend;
                    dataToSend = dataWithoutFile;
                    
                    // Proceed with updating other fields if needed
                    const updateResponse = await fetch(url, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(dataToSend),
                    });

                    const updateResult = await updateResponse.json();
                    console.log('Update response:', updateResult);

                    if (!updateResponse.ok) {
                        throw new Error(updateResult.error || 'Failed to save gemstone');
                    }
                }
            } else {
                // No OBJ file, proceed normally
                const response = await fetch(url, {
                    method,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(dataToSend),
                });

                const result = await response.json();
                console.log('Save response:', result);

                if (!response.ok) {
                    throw new Error(result.error || 'Failed to save gemstone');
                }
            }

            await fetchGemstones(); // Refresh the list
            setOpenDialog(false);
            setSelectedGemstone(null);
        } catch (err) {
            console.error('Save error:', err);
            setError(err.message);
        }
    };

    const handleDeleteGemstone = async (gemstoneId) => {
        if (!confirm('Are you sure you want to delete this gemstone?')) {
            return;
        }

        try {
            const response = await fetch(`/api/products/gemstones?id=${gemstoneId}`, {
                method: 'DELETE',
            });

            const result = await response.json();
            console.log('Delete response:', result);

            if (!response.ok) {
                throw new Error(result.error || 'Failed to delete gemstone');
            }

            await fetchGemstones(); // Refresh the list
        } catch (err) {
            console.error('Delete error:', err);
            setError(err.message);
        }
    };

    const handleInputChange = (field, value) => {
        if (field.includes('.')) {
            // Handle nested object updates (like dimensions.length)
            const [parent, child] = field.split('.');
            setFormData(prev => ({
                ...prev,
                [parent]: {
                    ...prev[parent],
                    [child]: value
                }
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [field]: value
            }));
        }
    };

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (file && file.name.endsWith('.obj')) {
            setFormData(prev => ({
                ...prev,
                objFile: file
            }));
        } else {
            alert('Please select a valid .obj file');
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Available':
                return 'success';
            case 'Reserved':
                return 'warning';
            case 'Sold':
                return 'info';
            case 'On Hold':
                return 'default';
            default:
                return 'default';
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
                <Button variant="contained" onClick={fetchGemstones}>
                    Retry
                </Button>
            </Box>
        );
    }

    // Render step content functions
    const renderStepContent = (step) => {
        switch (step) {
            case 0:
                return renderBasicInformation();
            case 1:
                return renderGemstoneDetails();
            case 2:
                return renderPhysicalProperties();
            case 3:
                return renderTreatmentOptions();
            case 4:
                return renderFilesAndNotes();
            default:
                return <Typography>Unknown step</Typography>;
        }
    };

    const renderBasicInformation = () => (
        <Grid container spacing={3}>
            <Grid item xs={12}>
                <TextField 
                    fullWidth 
                    label="Gemstone Title" 
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="e.g., Brilliant Round Blue Sapphire"
                    size="small"
                />
            </Grid>
            <Grid item xs={12} sm={6}>
                <TextField 
                    fullWidth 
                    label="Carat Weight" 
                    type="number" 
                    inputProps={{ step: 0.01, min: 0 }} 
                    value={formData.carat}
                    onChange={(e) => handleInputChange('carat', e.target.value)}
                    size="small"
                />
            </Grid>
            <Grid item xs={12} sm={6}>
                <TextField 
                    fullWidth 
                    label="Price ($)" 
                    type="number" 
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', e.target.value)}
                    size="small"
                />
            </Grid>
        </Grid>
    );

    const renderGemstoneDetails = () => (
        <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
                <Autocomplete
                    options={getAllOptions('species')}
                    value={formData.species || null}
                    onChange={(event, newValue) => handleSpeciesChange(newValue || '')}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Species"
                            placeholder="Select or add species..."
                            size="small"
                        />
                    )}
                    freeSolo
                    size="small"
                />
            </Grid>
            <Grid item xs={12} sm={6}>
                <Autocomplete
                    options={getFilteredSubspecies()}
                    value={formData.subspecies || null}
                    onChange={(event, newValue) => {
                        // Save new subspecies suggestion if it's custom
                        if (newValue && !getFilteredSubspecies().includes(newValue)) {
                            saveNewSuggestion('subspecies', newValue);
                        }
                        handleInputChange('subspecies', newValue || '');
                    }}
                    disabled={!formData.species}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Subspecies/Trade Names"
                            placeholder={formData.species 
                                ? "Select relevant subspecies..." 
                                : "Select species first..."
                            }
                            size="small"
                        />
                    )}
                    freeSolo
                    size="small"
                />
            </Grid>
            <Grid item xs={12} sm={6}>
                <Autocomplete
                    multiple
                    options={getAllOptions('colors')}
                    value={formData.color}
                    onChange={(event, newValue) => handleAutocompleteChange('color', newValue, formData.color)}
                    renderTags={(value, getTagProps) =>
                        value.map((option, index) => {
                            const { key, ...chipProps } = getTagProps({ index });
                            return (
                                <Chip 
                                    key={key || index} 
                                    variant="outlined" 
                                    label={option} 
                                    size="small"
                                    {...chipProps} 
                                />
                            );
                        })
                    }
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Color"
                            placeholder="Select or add colors..."
                            size="small"
                        />
                    )}
                    freeSolo
                    size="small"
                />
            </Grid>
            <Grid item xs={12} sm={6}>
                <Autocomplete
                    options={getAllOptions('locales')}
                    value={formData.locale || null}
                    onChange={(event, newValue) => {
                        // Save new locale suggestion if it's custom
                        if (newValue && !getAllOptions('locales').includes(newValue)) {
                            saveNewSuggestion('locales', newValue);
                        }
                        handleInputChange('locale', newValue || '');
                    }}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Origin/Locale"
                            placeholder="Select or add origin..."
                            size="small"
                        />
                    )}
                    freeSolo
                    size="small"
                />
            </Grid>
        </Grid>
    );

    const renderPhysicalProperties = () => (
        <Grid container spacing={3}>
            <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>
                    Dimensions (mm)
                </Typography>
                <Grid container spacing={2}>
                    <Grid item xs={4}>
                        <TextField 
                            fullWidth 
                            label="Length" 
                            type="number" 
                            inputProps={{ step: 0.1, min: 0 }}
                            value={formData.dimensions.length}
                            onChange={(e) => handleInputChange('dimensions.length', e.target.value)}
                            size="small"
                        />
                    </Grid>
                    <Grid item xs={4}>
                        <TextField 
                            fullWidth 
                            label="Width" 
                            type="number" 
                            inputProps={{ step: 0.1, min: 0 }}
                            value={formData.dimensions.width}
                            onChange={(e) => handleInputChange('dimensions.width', e.target.value)}
                            size="small"
                        />
                    </Grid>
                    <Grid item xs={4}>
                        <TextField 
                            fullWidth 
                            label="Height" 
                            type="number" 
                            inputProps={{ step: 0.1, min: 0 }}
                            value={formData.dimensions.height}
                            onChange={(e) => handleInputChange('dimensions.height', e.target.value)}
                            size="small"
                        />
                    </Grid>
                </Grid>
            </Grid>
            <Grid item xs={12} sm={6}>
                <Autocomplete
                    multiple
                    options={getAllOptions('cuts')}
                    value={formData.cut}
                    onChange={(event, newValue) => handleAutocompleteChange('cut', newValue, formData.cut)}
                    renderTags={(value, getTagProps) =>
                        value.map((option, index) => {
                            const { key, ...chipProps } = getTagProps({ index });
                            return (
                                <Chip 
                                    key={key || index} 
                                    variant="outlined" 
                                    label={option} 
                                    size="small"
                                    {...chipProps} 
                                />
                            );
                        })
                    }
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Cut"
                            placeholder="Select or add cuts..."
                            size="small"
                        />
                    )}
                    freeSolo
                    size="small"
                />
            </Grid>
            <Grid item xs={12} sm={6}>
                <Autocomplete
                    multiple
                    options={getAllOptions('cutStyles')}
                    value={formData.cutStyle}
                    onChange={(event, newValue) => handleAutocompleteChange('cutStyle', newValue, formData.cutStyle)}
                    renderTags={(value, getTagProps) =>
                        value.map((option, index) => {
                            const { key, ...chipProps } = getTagProps({ index });
                            return (
                                <Chip 
                                    key={key || index} 
                                    variant="outlined" 
                                    label={option} 
                                    size="small"
                                    {...chipProps} 
                                />
                            );
                        })
                    }
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Cut Style"
                            placeholder="Select or add cut styles..."
                            size="small"
                        />
                    )}
                    freeSolo
                    size="small"
                />
            </Grid>
        </Grid>
    );

    const renderTreatmentOptions = () => (
        <Grid container spacing={3}>
            <Grid item xs={12}>
                <Autocomplete
                    multiple
                    options={getAllOptions('treatments')}
                    value={formData.treatment}
                    onChange={(event, newValue) => handleAutocompleteChange('treatment', newValue, formData.treatment)}
                    renderTags={(value, getTagProps) =>
                        value.map((option, index) => {
                            const { key, ...chipProps } = getTagProps({ index });
                            return (
                                <Chip 
                                    key={key || index} 
                                    variant="outlined" 
                                    label={option} 
                                    size="small"
                                    {...chipProps} 
                                />
                            );
                        })
                    }
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Treatment"
                            placeholder="Select or add treatments..."
                            size="small"
                        />
                    )}
                    freeSolo
                    size="small"
                />
            </Grid>
            <Grid item xs={12}>
                <FormControl component="fieldset">
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Is this a natural gemstone?
                    </Typography>
                    <RadioGroup
                        row
                        value={formData.naturalSynthetic}
                        onChange={(e) => handleInputChange('naturalSynthetic', e.target.value)}
                    >
                        <FormControlLabel value="natural" control={<Radio size="small" />} label="Yes, it's natural" />
                        <FormControlLabel value="synthetic" control={<Radio size="small" />} label="No, it's synthetic/lab-created" />
                    </RadioGroup>
                </FormControl>
            </Grid>
            <Grid item xs={12}>
                <FormControlLabel
                    control={
                        <Switch
                            checked={formData.customMounting}
                            onChange={(e) => handleInputChange('customMounting', e.target.checked)}
                            size="small"
                        />
                    }
                    label={
                        <Box>
                            <Typography variant="body1">
                                Is this gemstone available for custom mounting?
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Turn this on if customers can request this gemstone to be set in custom jewelry pieces
                            </Typography>
                        </Box>
                    }
                />
            </Grid>
        </Grid>
    );

    const renderFilesAndNotes = () => (
        <Grid container spacing={3}>
            <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    3D Model (.obj file)
                </Typography>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".obj"
                    style={{ display: 'none' }}
                />
                <Box
                    onClick={() => fileInputRef.current?.click()}
                    sx={{
                        border: '2px dashed',
                        borderColor: 'primary.main',
                        borderRadius: 2,
                        p: 3,
                        textAlign: 'center',
                        backgroundColor: 'primary.50',
                        cursor: 'pointer',
                        '&:hover': {
                            backgroundColor: 'primary.100'
                        }
                    }}
                >
                    <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                    <Typography variant="body1" color="primary.main">
                        {formData.objFile ? formData.objFile.name : 'Click to upload .OBJ file'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Optional 3D model for visualization
                    </Typography>
                </Box>
            </Grid>
            <Grid item xs={12}>
                <TextField 
                    fullWidth 
                    multiline 
                    rows={4}
                    label="Additional Notes" 
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="Any additional information about this gemstone..."
                    size="small"
                />
            </Grid>
        </Grid>
    );

     return (
         <Box sx={{ p: 3 }}>
             <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                 <Box>
                     <Typography variant="h4" gutterBottom>
                         Gemstones
                     </Typography>
                     <Typography variant="subtitle1" color="text.secondary">
                         Your personal gemstone inventory
                     </Typography>
                 </Box>
                 <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddGemstone}>
                     Add Gemstone
                 </Button>
             </Box>

             <Grid container spacing={3} sx={{ mb: 4 }}>
                 <Grid item xs={12} sm={6} md={3}>
                     <Card>
                         <CardContent>
                             <Typography color="text.secondary" gutterBottom>
                                 Total Gemstones
                             </Typography>
                             <Typography variant="h4">{gemstones.length}</Typography>
                         </CardContent>
                     </Card>
                 </Grid>
                 <Grid item xs={12} sm={6} md={3}>
                     <Card>
                         <CardContent>
                             <Typography color="text.secondary" gutterBottom>
                                 Available
                             </Typography>
                             <Typography variant="h4" color="success.main">
                                 {gemstones.filter((g) => g.status === 'Available').length}
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
                                 ${gemstones.reduce((sum, g) => sum + (Number(g.price) || 0), 0).toLocaleString()}
                             </Typography>
                         </CardContent>
                     </Card>
                 </Grid>
                 <Grid item xs={12} sm={6} md={3}>
                     <Card>
                         <CardContent>
                             <Typography color="text.secondary" gutterBottom>
                                 Avg. Carat
                             </Typography>
                             <Typography variant="h4">
                                 {gemstones.length > 0 
                                     ? (gemstones.reduce((sum, g) => sum + (Number(g.carat) || 0), 0) / gemstones.length).toFixed(1)
                                     : '0.0'
                                 }ct
                             </Typography>
                         </CardContent>
                     </Card>
                 </Grid>
             </Grid>

             <Card>
                 <CardContent>
                     <Typography variant="h6" gutterBottom>
                         Your Gemstones
                     </Typography>
                     {gemstones.length === 0 ? (
                         <Box sx={{ textAlign: 'center', py: 4 }}>
                             <Typography variant="h6" color="text.secondary" gutterBottom>
                                 No gemstones added yet
                             </Typography>
                             <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                 Add your first gemstone to start building your collection.
                             </Typography>
                             <Button 
                                 variant="contained" 
                                 startIcon={<AddIcon />} 
                                 onClick={handleAddGemstone}
                             >
                                 Add Your First Gemstone
                             </Button>
                         </Box>
                     ) : (
                         <>
                             {/* Search and Filter Bar */}
                             <Paper sx={{ p: 2.5, mb: 3, backgroundColor: '#f8f9fa' }}>
                                 <Grid container spacing={2} alignItems="center">
                                     <Grid item xs={12} sm={6} md={4}>
                                         <TextField
                                             fullWidth
                                             size="small"
                                             placeholder="Search by title, species..."
                                             value={searchQuery}
                                             onChange={(e) => {
                                                 setSearchQuery(e.target.value);
                                                 setCurrentPage(1);
                                             }}
                                             InputProps={{
                                                 startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                                             }}
                                             variant="outlined"
                                         />
                                     </Grid>
                                     <Grid item xs={12} sm={6} md={3}>
                                         <FormControl fullWidth size="small">
                                             <InputLabel>Species</InputLabel>
                                             <Select
                                                 value={filterSpecies}
                                                 label="Species"
                                                 onChange={(e) => {
                                                     setFilterSpecies(e.target.value);
                                                     setCurrentPage(1);
                                                 }}
                                             >
                                                 <MenuItem value="">All Species</MenuItem>
                                                 {uniqueSpecies.map(species => (
                                                     <MenuItem key={species} value={species}>
                                                         {species}
                                                     </MenuItem>
                                                 ))}
                                             </Select>
                                         </FormControl>
                                     </Grid>
                                     <Grid item xs={12} sm={6} md={2.5}>
                                         <FormControl fullWidth size="small">
                                             <InputLabel>Sort By</InputLabel>
                                             <Select
                                                 value={sortBy}
                                                 label="Sort By"
                                                 onChange={(e) => setSortBy(e.target.value)}
                                             >
                                                 <MenuItem value="title">Title</MenuItem>
                                                 <MenuItem value="species">Species</MenuItem>
                                                 <MenuItem value="carat">Carat Weight</MenuItem>
                                                 <MenuItem value="price">Price</MenuItem>
                                                 <MenuItem value="date">Newest First</MenuItem>
                                             </Select>
                                         </FormControl>
                                     </Grid>
                                     <Grid item xs={12} sm={6} md={2.5}>
                                         <FormControl fullWidth size="small">
                                             <InputLabel>Order</InputLabel>
                                             <Select
                                                 value={sortOrder}
                                                 label="Order"
                                                 onChange={(e) => setSortOrder(e.target.value)}
                                             >
                                                 <MenuItem value="asc">Ascending</MenuItem>
                                                 <MenuItem value="desc">Descending</MenuItem>
                                             </Select>
                                         </FormControl>
                                     </Grid>
                                 </Grid>
                                 <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                                     Showing {filteredGemstones.length} of {gemstones.length} gemstones
                                 </Typography>
                             </Paper>

                             {/* Gemstone Cards Grid */}
                             {filteredGemstones.length === 0 ? (
                                 <Paper sx={{ p: 4, textAlign: 'center' }}>
                                     <DiamondIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                                     <Typography variant="h6" color="text.secondary" gutterBottom>
                                         No gemstones found
                                     </Typography>
                                     <Typography variant="body2" color="text.secondary">
                                         {searchQuery || filterSpecies ? 'Try adjusting your filters' : 'Start by adding your first gemstone'}
                                     </Typography>
                                 </Paper>
                             ) : (
                                 <>
                                     <Grid container spacing={2.5} sx={{ mb: 3 }}>
                                         {filteredGemstones
                                             .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                                             .map((gemstone) => (
                                             <Grid item xs={12} sm={6} md={4} lg={3} key={gemstone.productId || gemstone.id}>
                                                 <Card 
                                                     sx={{ 
                                                         height: '100%', 
                                                         display: 'flex', 
                                                         flexDirection: 'column',
                                                         transition: 'all 0.3s ease',
                                                         '&:hover': {
                                                             transform: 'translateY(-4px)',
                                                             boxShadow: 4
                                                         }
                                                     }}
                                                 >
                                                     {/* Image Area */}
                                                     <CardMedia
                                                         component="div"
                                                         sx={{
                                                             height: 160,
                                                             background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                                             display: 'flex',
                                                             alignItems: 'center',
                                                             justifyContent: 'center',
                                                             position: 'relative',
                                                             overflow: 'hidden'
                                                         }}
                                                     >
                                                         <DiamondIcon sx={{ fontSize: 60, color: 'rgba(255,255,255,0.3)' }} />
                                                         
                                                         {/* Status Badge */}
                                                         <Box
                                                             sx={{
                                                                 position: 'absolute',
                                                                 top: 8,
                                                                 right: 8,
                                                                 backgroundColor: 'rgba(0,0,0,0.6)',
                                                                 color: 'white',
                                                                 px: 1.5,
                                                                 py: 0.5,
                                                                 borderRadius: 1,
                                                                 fontSize: '0.75rem',
                                                                 fontWeight: 'bold'
                                                             }}
                                                         >
                                                             {getStatusDisplayName(gemstone.status) || 'Active'}
                                                         </Box>
                                                     </CardMedia>

                                                     <CardContent sx={{ flexGrow: 1 }}>
                                                         {/* Title */}
                                                         <Typography 
                                                             variant="h6" 
                                                             component="h2" 
                                                             gutterBottom
                                                             sx={{ 
                                                                 fontWeight: 'bold',
                                                                 overflow: 'hidden',
                                                                 textOverflow: 'ellipsis',
                                                                 whiteSpace: 'nowrap'
                                                             }}
                                                         >
                                                             {gemstone.title || 'Untitled Gemstone'}
                                                         </Typography>

                                                         {/* Species and Subspecies */}
                                                         <Typography variant="body2" color="text.secondary" gutterBottom>
                                                             <strong>{((gemstone.gemstone?.species) || (gemstone.species)) || 'Unknown'}</strong>
                                                             {((gemstone.gemstone?.subspecies) || (gemstone.subspecies)) && (
                                                                 <> - {((gemstone.gemstone?.subspecies) || (gemstone.subspecies))}</>
                                                             )}
                                                         </Typography>

                                                         {/* Key Properties */}
                                                         <Box sx={{ my: 1.5, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                                             {(gemstone.gemstone?.carat || gemstone.carat) && (
                                                                 <Chip 
                                                                     label={`${gemstone.gemstone?.carat || gemstone.carat}ct`}
                                                                     size="small"
                                                                     color="primary"
                                                                     variant="outlined"
                                                                 />
                                                             )}
                                                             <Chip 
                                                                 label={((gemstone.gemstone?.naturalSynthetic) || (gemstone.naturalSynthetic)) === 'natural' ? 'Natural' : 'Synthetic'}
                                                                 size="small"
                                                                 color={((gemstone.gemstone?.naturalSynthetic) || (gemstone.naturalSynthetic)) === 'natural' ? 'success' : 'info'}
                                                             />
                                                         </Box>

                                                         {/* Dimensions */}
                                                         {((gemstone.gemstone?.dimensions) || (gemstone.dimensions)) && (
                                                             <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                                                                 📏 {((gemstone.gemstone?.dimensions?.length) || (gemstone.dimensions?.length)) || '?'}×{((gemstone.gemstone?.dimensions?.width) || (gemstone.dimensions?.width)) || '?'}×{((gemstone.gemstone?.dimensions?.height) || (gemstone.dimensions?.height)) || '?'}mm
                                                             </Typography>
                                                         )}

                                                         {/* Cut Information */}
                                                         {(gemstone.gemstone?.cut?.length > 0 || gemstone.cut?.length > 0) && (
                                                             <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                                                                 ✂️ {(gemstone.gemstone?.cut || gemstone.cut || []).join(', ')}
                                                             </Typography>
                                                         )}

                                                         {/* Price */}
                                                         {((gemstone.gemstone?.retailPrice) || (gemstone.retailPrice)) && (
                                                             <Typography 
                                                                 variant="h6" 
                                                                 color="primary" 
                                                                 sx={{ 
                                                                     mt: 2,
                                                                     fontWeight: 'bold',
                                                                     fontSize: '1.1rem'
                                                                 }}
                                                             >
                                                                 ${(((gemstone.gemstone?.retailPrice) || (gemstone.retailPrice)) || 0).toLocaleString()}
                                                             </Typography>
                                                         )}
                                                     </CardContent>

                                                     {/* Actions */}
                                                     <CardActions sx={{ pt: 0, justifyContent: 'space-between' }}>
                                                         <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                             <Tooltip title="View Details">
                                                                 <IconButton 
                                                                     size="small" 
                                                                     color="primary"
                                                                     onClick={() => router.push(`/dashboard/products/gemstones/${gemstone.productId}`)}
                                                                 >
                                                                     <VisibilityIcon fontSize="small" />
                                                                 </IconButton>
                                                             </Tooltip>
                                                             <Tooltip title="Edit">
                                                                 <IconButton 
                                                                     size="small" 
                                                                     color="primary" 
                                                                     onClick={() => handleEditGemstone(gemstone)}
                                                                 >
                                                                     <EditIcon fontSize="small" />
                                                                 </IconButton>
                                                             </Tooltip>
                                                         </Box>
                                                         <Tooltip title="Delete">
                                                             <IconButton 
                                                                 size="small" 
                                                                 color="error" 
                                                                 onClick={() => handleDeleteGemstone(gemstone.productId)}
                                                             >
                                                                 <DeleteIcon fontSize="small" />
                                                             </IconButton>
                                                         </Tooltip>
                                                     </CardActions>
                                                 </Card>
                                             </Grid>
                                         ))}
                                     </Grid>

                                     {/* Pagination */}
                                     {Math.ceil(filteredGemstones.length / itemsPerPage) > 1 && (
                                         <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                                             <Pagination
                                                 count={Math.ceil(filteredGemstones.length / itemsPerPage)}
                                                 page={currentPage}
                                                 onChange={(event, page) => {
                                                     setCurrentPage(page);
                                                     window.scrollTo({ top: 0, behavior: 'smooth' });
                                                 }}
                                                 color="primary"
                                                 size="large"
                                             />
                                         </Box>
                                     )}
                                 </>
                             )}
                         </>
                     )}
                 </CardContent>
             </Card>

             <Dialog 
                 open={openDialog} 
                 onClose={() => setOpenDialog(false)} 
                 maxWidth="md" 
                 fullWidth
                 fullScreen={isMobile}
             >
                 <DialogTitle>
                     <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                         <Typography variant="h6">
                             {selectedGemstone ? 'Edit Gemstone' : 'Add New Gemstone'}
                         </Typography>
                         <Typography variant="body2" color="text.secondary">
                             Step {activeStep + 1} of {totalSteps()}
                         </Typography>
                     </Box>
                 </DialogTitle>
                 <DialogContent>
                     <Box sx={{ mt: 2 }}>
                         {isMobile ? (
                             // Mobile: Simple step content without stepper visualization
                             <Box>
                                 <Typography variant="h6" gutterBottom>
                                     {steps[activeStep].label}
                                 </Typography>
                                 <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                     {steps[activeStep].description}
                                 </Typography>
                                 {renderStepContent(activeStep)}
                             </Box>
                         ) : (
                             // Desktop: Full stepper interface
                             <Stepper activeStep={activeStep} orientation="vertical">
                                 {steps.map((step, index) => (
                                     <Step key={step.label} completed={completed[index]}>
                                         <StepLabel 
                                             optional={
                                                 <Typography variant="caption">
                                                     {step.description}
                                                 </Typography>
                                             }
                                         >
                                             {step.label}
                                         </StepLabel>
                                         <StepContent>
                                             {renderStepContent(index)}
                                             <Box sx={{ mb: 2, mt: 2 }}>
                                                 <Button
                                                     variant="contained"
                                                     onClick={index === steps.length - 1 ? handleSaveGemstone : handleNext}
                                                     sx={{ mr: 1 }}
                                                     size="small"
                                                 >
                                                     {index === steps.length - 1 ? 'Save Gemstone' : 'Continue'}
                                                 </Button>
                                                 <Button
                                                     disabled={index === 0}
                                                     onClick={handleBack}
                                                     sx={{ mr: 1 }}
                                                     size="small"
                                                 >
                                                     Back
                                                 </Button>
                                             </Box>
                                         </StepContent>
                                     </Step>
                                 ))}
                             </Stepper>
                         )}
                     </Box>
                 </DialogContent>
                 <DialogActions>
                     <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                     {isMobile && (
                         <>
                             <Button
                                 disabled={activeStep === 0}
                                 onClick={handleBack}
                                 sx={{ mr: 1 }}
                             >
                                 Back
                             </Button>
                             <Button
                                 variant="contained"
                                 onClick={activeStep === steps.length - 1 ? handleSaveGemstone : handleNext}
                             >
                                 {activeStep === steps.length - 1 ? 'Save Gemstone' : 'Continue'}
                             </Button>
                         </>
                     )}
                 </DialogActions>
             </Dialog>
         </Box>
     );
}