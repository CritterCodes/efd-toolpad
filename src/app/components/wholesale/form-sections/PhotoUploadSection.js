import React from 'react';
import { Box, Typography, Grid, IconButton } from '@mui/material';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import DeleteIcon from '@mui/icons-material/Delete';

export default function PhotoUploadSection({ photos, handlePhotoUpload, removePhoto }) { 
    return (
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
                </Box>
    );
}
