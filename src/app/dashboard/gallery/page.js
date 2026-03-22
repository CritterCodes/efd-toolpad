/**
 * Artisan Gallery Management Page
 * Allows artisans to upload and manage portfolio images for their shop profile
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Box, Typography, LinearProgress } from '@mui/material';

import { useGallery } from '@/hooks/gallery/useGallery';
import GalleryHeader from './components/GalleryHeader';
import ImageGrid from './components/ImageGrid';
import UploadDialog from './components/UploadDialog';
import EditDialog from './components/EditDialog';

export default function GalleryManagementPage() {
    const { data: session } = useSession();
    const {
        galleryItems,
        loading,
        uploading,
        availableTags,
        saveStatus,
        setSaveStatus,
        loadGalleryItems,
        loadAvailableTags,
        uploadImage,
        updateImage,
        deleteImage
    } = useGallery();

    const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [previewImage, setPreviewImage] = useState(null);
    const [uploadFile, setUploadFile] = useState(null);
    const [formData, setFormData] = useState({ tags: [] });

    useEffect(() => {
        if (session) {
            loadGalleryItems();
            loadAvailableTags();
        }
    }, [session, loadGalleryItems, loadAvailableTags]);

    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) { // 10MB limit
                setSaveStatus({ type: 'error', message: 'File size must be less than 10MB' });
                return;
            }
            if (!file.type.startsWith('image/')) {
                setSaveStatus({ type: 'error', message: 'Please select an image file' });
                return;
            }

            setUploadFile(file);
            const previewUrl = URL.createObjectURL(file);
            setPreviewImage(previewUrl);
            setUploadDialogOpen(true);
        }
    };

    const handleUpload = async () => {
        if (!uploadFile) return;
        const success = await uploadImage(uploadFile, formData.tags);
        if (success) {
            setUploadDialogOpen(false);
            resetForm();
        }
    };

    const handleEdit = (item) => {
        setSelectedItem(item);
        setFormData({ tags: item.tags || [] });
        setEditDialogOpen(true);
    };

    const handleUpdate = async () => {
        if (!selectedItem) return;
        const success = await updateImage(selectedItem.id || selectedItem._id, formData.tags);
        if (success) {
            setEditDialogOpen(false);
            resetForm();
        }
    };

    const handleDelete = async (item) => {
        if (!confirm('Are you sure you want to delete this image? This action cannot be undone.')) {
            return;
        }
        await deleteImage(item.id || item._id);
    };

    const resetForm = () => {
        setFormData({ tags: [] });
        setUploadFile(null);
        setPreviewImage(null);
        setSelectedItem(null);
    };

    const handleCloseUploadDialog = () => {
        setUploadDialogOpen(false);
        resetForm();
        if (previewImage) {
            URL.revokeObjectURL(previewImage);
        }
    };

    const handleCloseEditDialog = () => {
        setEditDialogOpen(false);
        resetForm();
    };

    if (loading) {
        return (
            <Box sx={{ p: { xs: 2, sm: 3 } }}>
                <Typography variant={{ xs: 'h5', sm: 'h4' }} gutterBottom>
                    Gallery Management
                </Typography>
                <LinearProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
            <GalleryHeader 
                handleFileSelect={handleFileSelect} 
                saveStatus={saveStatus} 
            />

            <ImageGrid 
                galleryItems={galleryItems} 
                handleEdit={handleEdit} 
                handleDelete={handleDelete} 
                handleFileSelect={handleFileSelect} 
            />

            <UploadDialog 
                open={uploadDialogOpen} 
                onClose={handleCloseUploadDialog} 
                previewImage={previewImage} 
                availableTags={availableTags} 
                formData={formData} 
                setFormData={setFormData} 
                handleUpload={handleUpload} 
                uploading={uploading} 
                uploadFile={uploadFile} 
            />

            <EditDialog 
                open={editDialogOpen} 
                onClose={handleCloseEditDialog} 
                availableTags={availableTags} 
                formData={formData} 
                setFormData={setFormData} 
                handleUpdate={handleUpdate} 
                uploading={uploading} 
            />
        </Box>
    );
}
