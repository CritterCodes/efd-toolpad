/**
 * Artisan Profile Management Page
 * Comprehensive profile editing for artisans - migrated from efd-shop
 * Includes business info, specialties, portfolio, and image uploads
 */

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Constants from '@/lib/constants';
import { useRouter } from 'next/navigation';
import {
    Box,
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    Grid,
    Avatar,
    Chip,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    LinearProgress,
    Alert,
    Divider,
    IconButton,
    InputAdornment,
    Autocomplete
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Save as SaveIcon,
    PhotoCamera as PhotoCameraIcon,
    Close as CloseIcon,
    Business as BusinessIcon,
    Person as PersonIcon,
    LocationOn as LocationIcon,
    Language as WebsiteIcon,
    Instagram as InstagramIcon,
    Facebook as FacebookIcon
} from '@mui/icons-material';

const ArtisanProfilePage = () => {
    const { data: session } = useSession();
    const router = useRouter();
    
    const [profileData, setProfileData] = useState({
        businessName: '',
        artisanType: [], // Changed to array for multi-select
        about: '',
        experience: '',
        yearsExperience: 0,
        businessAddress: '',
        businessCity: '',
        businessState: '',
        businessZip: '',
        businessCountry: 'United States',
        portfolioWebsite: '',
        instagramHandle: '',
        facebookPage: '',
        tiktokHandle: '',
        specialties: [],
        services: [],
        materials: [],
        techniques: [],
        profileImage: null,
        coverImage: null
    });

    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [profileImagePreview, setProfileImagePreview] = useState(null);
    const [coverImagePreview, setCoverImagePreview] = useState(null);
    const [saveStatus, setSaveStatus] = useState(null);

    // Suggestion arrays for autocomplete fields
    const specialtiesSuggestions = [
        'Rings', 'Necklaces', 'Bracelets', 'Earrings', 'Brooches', 'Pendants',
        'Custom Designs', 'Vintage Restoration', 'Stone Setting', 'Engraving',
        'Chain Making', 'Enameling'
    ];

    const servicesSuggestions = [
        'Custom Design', 'Jewelry Repair', 'Stone Setting', 'Engraving',
        'Resizing', 'Restoration', 'Appraisal', 'Consultation',
        'Education/Classes', 'Stone Cutting', 'Metal Fabrication'
    ];

    const materialsSuggestions = [
        'Gold', 'Silver', 'Platinum', 'Palladium', 'Copper', 'Brass',
        'Precious Stones', 'Semi-Precious Stones', 'Pearls', 'Alternative Materials'
    ];

    const techniquesSuggestions = [
        'Hand Fabrication', 'Lost Wax Casting', 'Stone Setting', 'Engraving',
        'Enameling', 'Granulation', 'Filigree', 'Repoussé', 'Chain Making',
        'Wire Wrapping', 'Electroforming', 'CAD/CAM'
    ];

    const artisanTypes = Constants.ARTISAN_TYPES;

    const usStates = [
        'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
        'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
        'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana',
        'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
        'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
        'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
        'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
        'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
        'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
        'West Virginia', 'Wisconsin', 'Wyoming'
    ];

    useEffect(() => {
        loadProfileData();
    }, [session]);

    const loadProfileData = async () => {
        try {
            setLoading(true);
            
            // Load existing profile data
            const response = await fetch('/api/artisan/profile');
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data) {
                    const profile = data.data;
                    setProfileData({
                        businessName: profile.businessName || '',
                        artisanType: parseArrayField(profile.artisanType),
                        about: profile.about || '',
                        experience: profile.experience || '',
                        yearsExperience: profile.yearsExperience || 0,
                        businessAddress: profile.businessAddress || '',
                        businessCity: profile.businessCity || '',
                        businessState: profile.businessState || '',
                        businessZip: profile.businessZip || '',
                        businessCountry: profile.businessCountry || 'United States',
                        portfolioWebsite: profile.portfolioWebsite || '',
                        instagramHandle: profile.instagramHandle || '',
                        facebookPage: profile.facebookPage || '',
                        tiktokHandle: profile.tiktokHandle || '',
                        specialties: parseArrayField(profile.specialties),
                        services: parseArrayField(profile.services),
                        materials: parseArrayField(profile.materials),
                        techniques: parseArrayField(profile.techniques),
                        profileImage: null,
                        coverImage: null
                    });

                    // Set image previews if they exist
                    if (profile.profileImageUrl) {
                        setProfileImagePreview(profile.profileImageUrl);
                    }
                    if (profile.coverImageUrl) {
                        setCoverImagePreview(profile.coverImageUrl);
                    }
                }
            }
        } catch (error) {
            console.error('Error loading profile data:', error);
        } finally {
            setLoading(false);
        }
    };

    const parseArrayField = (field) => {
        if (!field) return [];
        if (Array.isArray(field)) return field;
        return field.split(',').map(item => item.trim()).filter(item => item !== '');
    };

    const handleInputChange = (field, value) => {
        setProfileData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleImageUpload = (event, type) => {
        const file = event.target.files[0];
        if (file) {
            const previewUrl = URL.createObjectURL(file);
            
            if (type === 'profile') {
                setProfileImagePreview(previewUrl);
                setProfileData(prev => ({ ...prev, profileImage: file }));
            } else if (type === 'cover') {
                setCoverImagePreview(previewUrl);
                setProfileData(prev => ({ ...prev, coverImage: file }));
            }
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setSaveStatus(null);
        
        try {
            const formData = new FormData();
            
            // Add all profile data
            Object.keys(profileData).forEach(key => {
                if (key === 'profileImage' || key === 'coverImage') {
                    if (profileData[key]) {
                        formData.append(key, profileData[key]);
                    }
                } else if (Array.isArray(profileData[key])) {
                    formData.append(key, profileData[key].join(', '));
                } else {
                    formData.append(key, profileData[key] || '');
                }
            });

            const response = await fetch('/api/artisan/profile', {
                method: 'PUT',
                body: formData
            });

            const result = await response.json();
            
            if (result.success) {
                setSaveStatus({ type: 'success', message: 'Profile updated successfully!' });
                // Reload the profile data to get updated URLs
                loadProfileData();
            } else {
                setSaveStatus({ type: 'error', message: result.error || 'Failed to update profile' });
            }
        } catch (error) {
            console.error('Error saving profile:', error);
            setSaveStatus({ type: 'error', message: 'Failed to save profile. Please try again.' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Box sx={{ p: { xs: 2, sm: 3 } }}>
                <Typography variant={{ xs: 'h5', sm: 'h4' }} gutterBottom>
                    Artisan Profile
                </Typography>
                <LinearProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
            {/* Header */}
            <Box sx={{ 
                mb: 4, 
                display: 'flex', 
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'flex-start', sm: 'center' }, 
                gap: 2 
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: { xs: '100%', sm: 'auto' } }}>
                    <IconButton onClick={() => router.push('/dashboard')}>
                        <ArrowBackIcon />
                    </IconButton>
                    <Box sx={{ flex: 1 }}>
                        <Typography variant={{ xs: 'h5', sm: 'h4' }} gutterBottom>
                            Artisan Profile
                        </Typography>
                        <Typography 
                            variant="body2" 
                            color="text.secondary"
                            sx={{ display: { xs: 'none', sm: 'block' } }}
                        >
                            Manage your professional artisan profile and business information
                        </Typography>
                    </Box>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSave}
                    disabled={saving}
                    size="small"
                    fullWidth={{ xs: true, sm: false }}
                >
                    {saving ? 'Saving...' : 'Save Profile'}
                </Button>
            </Box>

            {/* Save Status Alert */}
            {saveStatus && (
                <Alert severity={saveStatus.type} sx={{ mb: 3 }}>
                    {saveStatus.message}
                </Alert>
            )}

            <Grid container spacing={{ xs: 2, sm: 3 }}>
                {/* Profile Images */}
                <Grid item xs={12}>
                    <Card>
                        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                            <Typography variant="h6" gutterBottom>
                                Profile Images
                            </Typography>
                            <Grid container spacing={{ xs: 2, sm: 3 }}>
                                <Grid item xs={12} md={6}>
                                    <Box sx={{ textAlign: 'center' }}>
                                        <Typography variant="subtitle2" gutterBottom>
                                            Profile Image
                                        </Typography>
                                        <Avatar
                                            src={profileImagePreview}
                                            sx={{ 
                                                width: { xs: 80, sm: 120 }, 
                                                height: { xs: 80, sm: 120 }, 
                                                mx: 'auto', 
                                                mb: 2 
                                            }}
                                        >
                                            <PersonIcon sx={{ fontSize: { xs: 40, sm: 60 } }} />
                                        </Avatar>
                                        <input
                                            accept="image/*"
                                            style={{ display: 'none' }}
                                            id="profile-image-upload"
                                            type="file"
                                            onChange={(e) => handleImageUpload(e, 'profile')}
                                        />
                                        <label htmlFor="profile-image-upload">
                                            <Button
                                                variant="outlined"
                                                component="span"
                                                startIcon={<PhotoCameraIcon />}
                                                size="small"
                                                fullWidth={{ xs: true, sm: false }}
                                            >
                                                Upload Profile Image
                                            </Button>
                                        </label>
                                    </Box>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Box sx={{ textAlign: 'center' }}>
                                        <Typography variant="subtitle2" gutterBottom>
                                            Cover Image
                                        </Typography>
                                        <Box
                                            sx={{
                                                width: '100%',
                                                height: { xs: 80, sm: 120 },
                                                border: '2px dashed #ccc',
                                                borderRadius: 2,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                backgroundImage: coverImagePreview ? `url(${coverImagePreview})` : 'none',
                                                backgroundSize: 'cover',
                                                backgroundPosition: 'center',
                                                mb: 2
                                            }}
                                        >
                                            {!coverImagePreview && (
                                                <Typography variant="body2" color="text.secondary">
                                                    Cover Image Preview
                                                </Typography>
                                            )}
                                        </Box>
                                        <input
                                            accept="image/*"
                                            style={{ display: 'none' }}
                                            id="cover-image-upload"
                                            type="file"
                                            onChange={(e) => handleImageUpload(e, 'cover')}
                                        />
                                        <label htmlFor="cover-image-upload">
                                            <Button
                                                variant="outlined"
                                                component="span"
                                                startIcon={<PhotoCameraIcon />}
                                                size="small"
                                                fullWidth={{ xs: true, sm: false }}
                                            >
                                                Upload Cover Image
                                            </Button>
                                        </label>
                                    </Box>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Business Information */}
                <Grid item xs={12}>
                    <Card>
                        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                            <Typography variant="h6" gutterBottom startIcon={<BusinessIcon />}>
                                Business Information
                            </Typography>
                            <Grid container spacing={{ xs: 2, sm: 3 }}>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="Business Name"
                                        value={profileData.businessName}
                                        onChange={(e) => handleInputChange('businessName', e.target.value)}
                                        required
                                        size="small"
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Autocomplete
                                        multiple
                                        options={artisanTypes}
                                        value={profileData.artisanType || []}
                                        onChange={(event, newValue) => handleInputChange('artisanType', newValue)}
                                        renderTags={(value, getTagProps) =>
                                            value.map((option, index) => (
                                                <Chip 
                                                    key={index} 
                                                    variant="outlined" 
                                                    label={option} 
                                                    size="small"
                                                    {...getTagProps({ index })} 
                                                />
                                            ))
                                        }
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="Artisan Type"
                                                placeholder="Select your artisan types..."
                                                size="small"
                                            />
                                        )}
                                        size="small"
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        multiline
                                        rows={{ xs: 3, sm: 4 }}
                                        label="About Your Business"
                                        value={profileData.about}
                                        onChange={(e) => handleInputChange('about', e.target.value)}
                                        placeholder="Tell potential customers about your business, style, and what makes you unique..."
                                        size="small"
                                    />
                                </Grid>
                                <Grid item xs={12} md={8}>
                                    <TextField
                                        fullWidth
                                        multiline
                                        rows={{ xs: 2, sm: 3 }}
                                        label="Experience & Background"
                                        value={profileData.experience}
                                        onChange={(e) => handleInputChange('experience', e.target.value)}
                                        placeholder="Describe your training, experience, and background in jewelry making..."
                                        size="small"
                                    />
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <TextField
                                        fullWidth
                                        type="number"
                                        label="Years of Experience"
                                        value={profileData.yearsExperience}
                                        onChange={(e) => handleInputChange('yearsExperience', parseInt(e.target.value) || 0)}
                                        InputProps={{ inputProps: { min: 0, max: 100 } }}
                                        size="small"
                                    />
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Location Information */}
                <Grid item xs={12}>
                    <Card>
                        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                            <Typography variant="h6" gutterBottom>
                                <LocationIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                                Business Location
                            </Typography>
                            <Grid container spacing={{ xs: 2, sm: 3 }}>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Business Address"
                                        value={profileData.businessAddress}
                                        onChange={(e) => handleInputChange('businessAddress', e.target.value)}
                                        size="small"
                                    />
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <TextField
                                        fullWidth
                                        label="City"
                                        value={profileData.businessCity}
                                        onChange={(e) => handleInputChange('businessCity', e.target.value)}
                                        size="small"
                                    />
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <Autocomplete
                                        options={usStates}
                                        value={profileData.businessState}
                                        onChange={(event, newValue) => handleInputChange('businessState', newValue || '')}
                                        renderInput={(params) => (
                                            <TextField 
                                                {...params} 
                                                label="State" 
                                                size="small"
                                            />
                                        )}
                                        freeSolo
                                        size="small"
                                    />
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <TextField
                                        fullWidth
                                        label="ZIP Code"
                                        value={profileData.businessZip}
                                        onChange={(e) => handleInputChange('businessZip', e.target.value)}
                                        size="small"
                                    />
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Specialties and Services */}
                <Grid item xs={12}>
                    <Card>
                        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                            <Typography variant="h6" gutterBottom>
                                Specialties & Services
                            </Typography>
                            <Grid container spacing={{ xs: 2, sm: 3 }}>
                                <Grid item xs={12} md={6}>
                                    <Autocomplete
                                        multiple
                                        options={specialtiesSuggestions}
                                        value={profileData.specialties}
                                        onChange={(event, newValue) => handleInputChange('specialties', newValue)}
                                        renderTags={(value, getTagProps) =>
                                            value.map((option, index) => (
                                                <Chip 
                                                    key={index} 
                                                    variant="outlined" 
                                                    label={option} 
                                                    size="small"
                                                    {...getTagProps({ index })} 
                                                />
                                            ))
                                        }
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="Specialties"
                                                placeholder="Select or type your specialties..."
                                                size="small"
                                            />
                                        )}
                                        freeSolo
                                        size="small"
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Autocomplete
                                        multiple
                                        options={servicesSuggestions}
                                        value={profileData.services}
                                        onChange={(event, newValue) => handleInputChange('services', newValue)}
                                        renderTags={(value, getTagProps) =>
                                            value.map((option, index) => (
                                                <Chip 
                                                    key={index} 
                                                    variant="outlined" 
                                                    label={option} 
                                                    size="small"
                                                    {...getTagProps({ index })} 
                                                />
                                            ))
                                        }
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="Services Offered"
                                                placeholder="Select or type your services..."
                                                size="small"
                                            />
                                        )}
                                        freeSolo
                                        size="small"
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Autocomplete
                                        multiple
                                        options={materialsSuggestions}
                                        value={profileData.materials}
                                        onChange={(event, newValue) => handleInputChange('materials', newValue)}
                                        renderTags={(value, getTagProps) =>
                                            value.map((option, index) => (
                                                <Chip 
                                                    key={index} 
                                                    variant="outlined" 
                                                    label={option} 
                                                    size="small"
                                                    {...getTagProps({ index })} 
                                                />
                                            ))
                                        }
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="Materials You Work With"
                                                placeholder="Select or type materials..."
                                                size="small"
                                            />
                                        )}
                                        freeSolo
                                        size="small"
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Autocomplete
                                        multiple
                                        options={techniquesSuggestions}
                                        value={profileData.techniques}
                                        onChange={(event, newValue) => handleInputChange('techniques', newValue)}
                                        renderTags={(value, getTagProps) =>
                                            value.map((option, index) => (
                                                <Chip 
                                                    key={index} 
                                                    variant="outlined" 
                                                    label={option} 
                                                    size="small"
                                                    {...getTagProps({ index })} 
                                                />
                                            ))
                                        }
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="Techniques"
                                                placeholder="Select or type techniques..."
                                                size="small"
                                            />
                                        )}
                                        freeSolo
                                        size="small"
                                    />
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Online Presence */}
                <Grid item xs={12}>
                    <Card>
                        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                            <Typography variant="h6" gutterBottom>
                                Online Presence
                            </Typography>
                            <Grid container spacing={{ xs: 2, sm: 3 }}>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="Portfolio Website"
                                        value={profileData.portfolioWebsite}
                                        onChange={(e) => handleInputChange('portfolioWebsite', e.target.value)}
                                        placeholder="https://yourwebsite.com"
                                        size="small"
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <WebsiteIcon />
                                                </InputAdornment>
                                            ),
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="Instagram Handle"
                                        value={profileData.instagramHandle}
                                        onChange={(e) => handleInputChange('instagramHandle', e.target.value)}
                                        placeholder="@yourusername"
                                        size="small"
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <InstagramIcon />
                                                </InputAdornment>
                                            ),
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="Facebook Page"
                                        value={profileData.facebookPage}
                                        onChange={(e) => handleInputChange('facebookPage', e.target.value)}
                                        placeholder="facebook.com/yourpage"
                                        size="small"
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <FacebookIcon />
                                                </InputAdornment>
                                            ),
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="TikTok Handle"
                                        value={profileData.tiktokHandle}
                                        onChange={(e) => handleInputChange('tiktokHandle', e.target.value)}
                                        placeholder="@yourusername"
                                        size="small"
                                    />
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Save Button (Bottom) */}
            <Box sx={{ mt: 4, textAlign: 'center' }}>
                <Button
                    variant="contained"
                    size="large"
                    startIcon={<SaveIcon />}
                    onClick={handleSave}
                    disabled={saving}
                    sx={{ minWidth: 200 }}
                >
                    {saving ? 'Saving Profile...' : 'Save Profile'}
                </Button>
            </Box>
        </Box>
    );
};

export default ArtisanProfilePage;