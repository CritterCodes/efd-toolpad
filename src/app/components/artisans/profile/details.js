import React from 'react';
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
    Chip
} from '@mui/material';

const ArtisanDetailsForm = ({ artisan, onFieldChange }) => {
    
    const handleInputChange = (field) => (event) => {
        onFieldChange(field, event.target.value);
    };

    const handleAddressChange = (addressField) => (event) => {
        const newAddress = {
            ...artisan.address,
            [addressField]: event.target.value
        };
        onFieldChange('address', newAddress);
    };

    return (
        <Box>
            {/* Basic Information */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Basic Information
                    </Typography>
                    
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="First Name"
                                value={artisan.firstName || ''}
                                onChange={handleInputChange('firstName')}
                                variant="outlined"
                            />
                        </Grid>
                        
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Last Name"
                                value={artisan.lastName || ''}
                                onChange={handleInputChange('lastName')}
                                variant="outlined"
                            />
                        </Grid>
                        
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Email"
                                type="email"
                                value={artisan.email || ''}
                                onChange={handleInputChange('email')}
                                variant="outlined"
                            />
                        </Grid>
                        
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Phone Number"
                                value={artisan.phoneNumber || ''}
                                onChange={handleInputChange('phoneNumber')}
                                variant="outlined"
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Business Name"
                                value={artisan.business || ''}
                                onChange={handleInputChange('business')}
                                variant="outlined"
                                helperText="This will be used as the vendor name in the shop"
                            />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                                <InputLabel>Status</InputLabel>
                                <Select
                                    value={artisan.status || 'unverified'}
                                    label="Status"
                                    onChange={handleInputChange('status')}
                                >
                                    <MenuItem value="verified">Verified</MenuItem>
                                    <MenuItem value="unverified">Unverified</MenuItem>
                                    <MenuItem value="suspended">Suspended</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2">Role:</Typography>
                                <Chip 
                                    label={artisan.role || 'artisan'} 
                                    color="primary" 
                                    size="small" 
                                />
                            </Box>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* Address Information */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Address Information
                    </Typography>
                    
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Street Address"
                                value={artisan.address?.street || ''}
                                onChange={handleAddressChange('street')}
                                variant="outlined"
                            />
                        </Grid>
                        
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="City"
                                value={artisan.address?.city || ''}
                                onChange={handleAddressChange('city')}
                                variant="outlined"
                            />
                        </Grid>
                        
                        <Grid item xs={12} sm={3}>
                            <TextField
                                fullWidth
                                label="State"
                                value={artisan.address?.state || ''}
                                onChange={handleAddressChange('state')}
                                variant="outlined"
                            />
                        </Grid>
                        
                        <Grid item xs={12} sm={3}>
                            <TextField
                                fullWidth
                                label="ZIP Code"
                                value={artisan.address?.zipCode || ''}
                                onChange={handleAddressChange('zipCode')}
                                variant="outlined"
                            />
                        </Grid>
                        
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Country"
                                value={artisan.address?.country || 'USA'}
                                onChange={handleAddressChange('country')}
                                variant="outlined"
                            />
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* Account Information */}
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Account Information
                    </Typography>
                    
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="User ID"
                                value={artisan.userID || ''}
                                variant="outlined"
                                disabled
                                helperText="System generated ID"
                            />
                        </Grid>
                        
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Created At"
                                value={artisan.createdAt ? new Date(artisan.createdAt).toLocaleDateString() : ''}
                                variant="outlined"
                                disabled
                            />
                        </Grid>
                        
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Vendor Profile ID"
                                value={artisan.vendorProfileId || 'Not created'}
                                variant="outlined"
                                disabled
                                helperText="ID of the associated vendor profile"
                            />
                        </Grid>
                        
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Vendor Slug"
                                value={artisan.vendorSlug || 'Not created'}
                                variant="outlined"
                                disabled
                                helperText="URL slug for vendor profile"
                            />
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>
        </Box>
    );
};

export default ArtisanDetailsForm;