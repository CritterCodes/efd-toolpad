/**
 * Wholesale Repair Form
 * Simplified repair creation form for wholesale partners
 * Basic client info, photos, description - no complex task/pricing management
 */

'use client';

import React, { useState } from 'react';
import {
    Box,
    Button,
    TextField,
    Typography,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    DialogTitle,
    DialogContent,
    DialogActions,
    Card,
    CardContent,
    CardHeader,
    IconButton,
    Avatar,
    Alert
} from '@mui/material';
import {
    PhotoCamera as PhotoCameraIcon,
    Delete as DeleteIcon,
    Save as SaveIcon,
    Cancel as CancelIcon
} from '@mui/icons-material';

const ITEM_TYPES = [
    'Ring',
    'Necklace', 
    'Bracelet',
    'Earrings',
    'Watch',
    'Pendant',
    'Chain',
    'Brooch',
    'Other'
];

const REPAIR_TYPES = [
    'Sizing',
    'Stone Setting',
    'Prong Repair',
    'Chain Repair',
    'Clasp Repair',
    'Cleaning & Polish',
    'Stone Replacement',
    'Rhodium Plating',
    'Engraving',
    'General Repair',
    'Other'
];

export default function WholesaleRepairForm({ 
    initialData = null, 
    onSubmit, 
    onCancel, 
    isEditing = false 
}) {
    const [formData, setFormData] = useState({
        customerName: initialData?.customerName || '',
        customerPhone: initialData?.customerPhone || '',
        customerEmail: initialData?.customerEmail || '',
        itemType: initialData?.itemType || '',
        repairType: initialData?.repairType || '',
        description: initialData?.description || '',
        specialInstructions: initialData?.specialInstructions || '',
        promiseDate: initialData?.promiseDate || '',
        photos: initialData?.photos || []
    });

    const [errors, setErrors] = useState({});
    const [photoError, setPhotoError] = useState('');

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
        
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: ''
            }));
        }
    };

    const handlePhotoUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setPhotoError('Please select an image file');
            return;
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            setPhotoError('Image must be less than 5MB');
            return;
        }

        // Convert to base64 for storage
        const reader = new FileReader();
        reader.onload = (e) => {
            const newPhoto = {
                id: Date.now(),
                name: file.name,
                data: e.target.result,
                size: file.size
            };

            setFormData(prev => ({
                ...prev,
                photos: [...prev.photos, newPhoto]
            }));
            setPhotoError('');
        };
        reader.readAsDataURL(file);
    };

    const removePhoto = (photoId) => {
        setFormData(prev => ({
            ...prev,
            photos: prev.photos.filter(photo => photo.id !== photoId)
        }));
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.customerName.trim()) {
            newErrors.customerName = 'Customer name is required';
        }

        if (!formData.customerPhone.trim()) {
            newErrors.customerPhone = 'Customer phone is required';
        }

        if (!formData.itemType) {
            newErrors.itemType = 'Item type is required';
        }

        if (!formData.repairType) {
            newErrors.repairType = 'Repair type is required';
        }

        if (!formData.description.trim()) {
            newErrors.description = 'Repair description is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (!validateForm()) {
            return;
        }

        const submissionData = {
            ...formData,
            status: isEditing ? formData.status : 'pending',
            createdAt: isEditing ? formData.createdAt : new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        onSubmit(submissionData);
    };

    return (
        <>
            <DialogTitle>
                {isEditing ? 'Edit Repair Request' : 'New Repair Request'}
            </DialogTitle>
            
            <DialogContent>
                <Box sx={{ mt: 2 }}>
                    {/* Customer Information */}
                    <Card sx={{ mb: 3 }}>
                        <CardHeader 
                            title="Customer Information" 
                            sx={{ pb: 1 }}
                        />
                        <CardContent>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        required
                                        label="Customer Name"
                                        value={formData.customerName}
                                        onChange={(e) => handleInputChange('customerName', e.target.value)}
                                        error={!!errors.customerName}
                                        helperText={errors.customerName}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        required
                                        label="Phone Number"
                                        value={formData.customerPhone}
                                        onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                                        error={!!errors.customerPhone}
                                        helperText={errors.customerPhone}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Email Address"
                                        type="email"
                                        value={formData.customerEmail}
                                        onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                                        error={!!errors.customerEmail}
                                        helperText={errors.customerEmail}
                                    />
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>

                    {/* Item & Repair Details */}
                    <Card sx={{ mb: 3 }}>
                        <CardHeader 
                            title="Repair Details" 
                            sx={{ pb: 1 }}
                        />
                        <CardContent>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <FormControl fullWidth required error={!!errors.itemType}>
                                        <InputLabel>Item Type</InputLabel>
                                        <Select
                                            value={formData.itemType}
                                            onChange={(e) => handleInputChange('itemType', e.target.value)}
                                            label="Item Type"
                                        >
                                            {ITEM_TYPES.map(type => (
                                                <MenuItem key={type} value={type}>
                                                    {type}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <FormControl fullWidth required error={!!errors.repairType}>
                                        <InputLabel>Repair Type</InputLabel>
                                        <Select
                                            value={formData.repairType}
                                            onChange={(e) => handleInputChange('repairType', e.target.value)}
                                            label="Repair Type"
                                        >
                                            {REPAIR_TYPES.map(type => (
                                                <MenuItem key={type} value={type}>
                                                    {type}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        required
                                        multiline
                                        rows={3}
                                        label="Repair Description"
                                        value={formData.description}
                                        onChange={(e) => handleInputChange('description', e.target.value)}
                                        error={!!errors.description}
                                        helperText={errors.description || 'Describe the specific repair needed'}
                                        placeholder="Example: Resize ring from size 7 to size 8..."
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        multiline
                                        rows={2}
                                        label="Special Instructions"
                                        value={formData.specialInstructions}
                                        onChange={(e) => handleInputChange('specialInstructions', e.target.value)}
                                        placeholder="Any special requests, rush orders, or important notes..."
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="Promise Date"
                                        type="date"
                                        value={formData.promiseDate}
                                        onChange={(e) => handleInputChange('promiseDate', e.target.value)}
                                        InputLabelProps={{ shrink: true }}
                                        helperText="When customer expects completion"
                                    />
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>

                    {/* Photos */}
                    <Card>
                        <CardHeader 
                            title="Photos" 
                            sx={{ pb: 1 }}
                            action={
                                <Button
                                    variant="outlined"
                                    component="label"
                                    startIcon={<PhotoCameraIcon />}
                                    size="small"
                                >
                                    Add Photo
                                    <input
                                        type="file"
                                        hidden
                                        accept="image/*"
                                        onChange={handlePhotoUpload}
                                    />
                                </Button>
                            }
                        />
                        <CardContent>
                            {photoError && (
                                <Alert severity="error" sx={{ mb: 2 }}>
                                    {photoError}
                                </Alert>
                            )}
                            
                            {formData.photos.length === 0 ? (
                                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                                    No photos added yet. Photos help ensure accurate repairs.
                                </Typography>
                            ) : (
                                <Grid container spacing={2}>
                                    {formData.photos.map((photo) => (
                                        <Grid item xs={6} sm={4} md={3} key={photo.id}>
                                            <Box sx={{ position: 'relative' }}>
                                                <Avatar
                                                    src={photo.data}
                                                    sx={{ 
                                                        width: '100%', 
                                                        height: 120, 
                                                        borderRadius: 1,
                                                        mb: 1
                                                    }}
                                                    variant="rounded"
                                                />
                                                <IconButton
                                                    size="small"
                                                    onClick={() => removePhoto(photo.id)}
                                                    sx={{
                                                        position: 'absolute',
                                                        top: 4,
                                                        right: 4,
                                                        bgcolor: 'background.paper',
                                                        '&:hover': { bgcolor: 'error.light', color: 'white' }
                                                    }}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                                <Typography variant="caption" sx={{ display: 'block', textAlign: 'center' }}>
                                                    {photo.name}
                                                </Typography>
                                            </Box>
                                        </Grid>
                                    ))}
                                </Grid>
                            )}
                        </CardContent>
                    </Card>
                </Box>
            </DialogContent>

            <DialogActions sx={{ p: 3 }}>
                <Button 
                    onClick={onCancel}
                    startIcon={<CancelIcon />}
                >
                    Cancel
                </Button>
                <Button 
                    onClick={handleSubmit}
                    variant="contained"
                    startIcon={<SaveIcon />}
                >
                    {isEditing ? 'Update Repair' : 'Create Repair'}
                </Button>
            </DialogActions>
        </>
    );
}