import React, { useState } from 'react';
import { 
    Box, 
    Card, 
    CardContent, 
    TextField, 
    Typography, 
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Chip,
    Button,
    Alert,
    Divider
} from '@mui/material';
import { Store as StoreIcon, Launch as LaunchIcon } from '@mui/icons-material';

const ArtisanVendorProfile = ({ artisan, onFieldChange }) => {
    const [vendorProfile, setVendorProfile] = useState({
        bio: '',
        shortDescription: '',
        experience: '',
        specialties: [],
        services: [],
        skills: [],
        type: 'jeweler',
        ...artisan.vendorProfile
    });

    const handleVendorChange = (field) => (event) => {
        const newProfile = {
            ...vendorProfile,
            [field]: event.target.value
        };
        setVendorProfile(newProfile);
        onFieldChange('vendorProfile', newProfile);
    };

    const handleArrayFieldChange = (field, value) => {
        const values = value.split(',').map(v => v.trim()).filter(v => v);
        const newProfile = {
            ...vendorProfile,
            [field]: values
        };
        setVendorProfile(newProfile);
        onFieldChange('vendorProfile', newProfile);
    };

    const hasVendorProfile = artisan.vendorProfileId;

    return (
        <Box>
            {/* Vendor Profile Status */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6">
                            Vendor Profile Status
                        </Typography>
                        {hasVendorProfile && (
                            <Button
                                variant="outlined"
                                startIcon={<LaunchIcon />}
                                href={`${process.env.NEXT_PUBLIC_SHOP_URL || 'http://localhost:3001'}/vendors/${artisan.vendorSlug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                View Live Profile
                            </Button>
                        )}
                    </Box>

                    {hasVendorProfile ? (
                        <Alert severity="success">
                            ✅ Vendor profile is active and linked to the shop
                        </Alert>
                    ) : (
                        <Alert severity="warning">
                            ⚠️ No vendor profile created yet. Use the menu to create one.
                        </Alert>
                    )}

                    <Grid container spacing={2} sx={{ mt: 2 }}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Vendor Profile ID"
                                value={artisan.vendorProfileId || 'Not created'}
                                variant="outlined"
                                disabled
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Vendor Slug"
                                value={artisan.vendorSlug || 'Not created'}
                                variant="outlined"
                                disabled
                            />
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* Vendor Profile Information */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Profile Information
                    </Typography>
                    
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Display Name"
                                value={`${artisan.firstName || ''} ${artisan.lastName || ''}`.trim()}
                                variant="outlined"
                                disabled
                                helperText="Generated from first and last name"
                            />
                        </Grid>
                        
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Vendor Name"
                                value={artisan.business || ''}
                                variant="outlined"
                                disabled
                                helperText="From business name field"
                            />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                                <InputLabel>Vendor Type</InputLabel>
                                <Select
                                    value={vendorProfile.type || 'jeweler'}
                                    label="Vendor Type"
                                    onChange={handleVendorChange('type')}
                                >
                                    <MenuItem value="jeweler">Jeweler</MenuItem>
                                    <MenuItem value="designer">Designer</MenuItem>
                                    <MenuItem value="lapidarist">Lapidarist</MenuItem>
                                    <MenuItem value="metalworker">Metalworker</MenuItem>
                                    <MenuItem value="gemcutter">Gemcutter</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Short Description"
                                value={vendorProfile.shortDescription || ''}
                                onChange={handleVendorChange('shortDescription')}
                                variant="outlined"
                                multiline
                                rows={2}
                                helperText="Brief description for listings (max 200 characters)"
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Bio"
                                value={vendorProfile.bio || ''}
                                onChange={handleVendorChange('bio')}
                                variant="outlined"
                                multiline
                                rows={4}
                                helperText="Detailed biography for the profile page"
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Experience"
                                value={vendorProfile.experience || ''}
                                onChange={handleVendorChange('experience')}
                                variant="outlined"
                                multiline
                                rows={3}
                                helperText="Professional experience and background"
                            />
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* Skills and Specialties */}
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Skills & Specialties
                    </Typography>
                    
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth
                                label="Specialties"
                                value={vendorProfile.specialties?.join(', ') || ''}
                                onChange={(e) => handleArrayFieldChange('specialties', e.target.value)}
                                variant="outlined"
                                multiline
                                rows={3}
                                helperText="Comma-separated list (e.g., rings, necklaces, repairs)"
                            />
                        </Grid>
                        
                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth
                                label="Services"
                                value={vendorProfile.services?.join(', ') || ''}
                                onChange={(e) => handleArrayFieldChange('services', e.target.value)}
                                variant="outlined"
                                multiline
                                rows={3}
                                helperText="Comma-separated list (e.g., custom design, repair, appraisal)"
                            />
                        </Grid>
                        
                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth
                                label="Skills"
                                value={vendorProfile.skills?.join(', ') || ''}
                                onChange={(e) => handleArrayFieldChange('skills', e.target.value)}
                                variant="outlined"
                                multiline
                                rows={3}
                                helperText="Comma-separated list (e.g., soldering, stone setting, engraving)"
                            />
                        </Grid>
                    </Grid>

                    {/* Preview of arrays */}
                    <Box sx={{ mt: 3 }}>
                        <Typography variant="subtitle2" gutterBottom>Preview:</Typography>
                        <Box sx={{ mb: 1 }}>
                            <Typography variant="body2" sx={{ mr: 1, display: 'inline' }}>Specialties:</Typography>
                            {vendorProfile.specialties?.map((specialty, index) => (
                                <Chip key={index} label={specialty} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                            ))}
                        </Box>
                        <Box sx={{ mb: 1 }}>
                            <Typography variant="body2" sx={{ mr: 1, display: 'inline' }}>Services:</Typography>
                            {vendorProfile.services?.map((service, index) => (
                                <Chip key={index} label={service} size="small" color="secondary" sx={{ mr: 0.5, mb: 0.5 }} />
                            ))}
                        </Box>
                        <Box>
                            <Typography variant="body2" sx={{ mr: 1, display: 'inline' }}>Skills:</Typography>
                            {vendorProfile.skills?.map((skill, index) => (
                                <Chip key={index} label={skill} size="small" variant="outlined" sx={{ mr: 0.5, mb: 0.5 }} />
                            ))}
                        </Box>
                    </Box>
                </CardContent>
            </Card>
        </Box>
    );
};

export default ArtisanVendorProfile;