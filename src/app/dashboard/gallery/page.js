/**
 * Artisan Gallery Management Page
 * Allows artisans to upload and manage portfolio images for their shop profile
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Grid,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Alert,
    LinearProgress,
    ImageList,
    ImageListItem,
    ImageListItemBar,
    IconButton,
    Chip,
    Fab,
    Tooltip,
    Autocomplete
} from '@mui/material';
import {
    PhotoCamera as PhotoCameraIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    ArrowBack as ArrowBackIcon,
    Add as AddIcon,
    CloudUpload as CloudUploadIcon,
    Visibility as VisibilityIcon
} from '@mui/icons-material';

export default function GalleryManagementPage() {
    const { data: session } = useSession();
    const router = useRouter();
    
    const [galleryItems, setGalleryItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [previewImage, setPreviewImage] = useState(null);
    const [uploadFile, setUploadFile] = useState(null);
    const [formData, setFormData] = useState({
        tags: []
    });
    const [saveStatus, setSaveStatus] = useState(null);
    const [availableTags, setAvailableTags] = useState([]);

    useEffect(() => {
        loadGalleryItems();
        loadAvailableTags();
    }, [session]);

    const loadGalleryItems = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/artisan/gallery');
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setGalleryItems(data.data || []);
                }
            }
        } catch (error) {
            console.error('Error loading gallery items:', error);
            setSaveStatus({ type: 'error', message: 'Failed to load gallery items' });
        } finally {
            setLoading(false);
        }
    };

    const loadAvailableTags = async () => {
        try {
            const response = await fetch('/api/artisan/gallery/tags');
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setAvailableTags(data.data || []);
                }
            }
        } catch (error) {
            console.error('Error loading tags:', error);
        }
    };

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

        setUploading(true);
        setSaveStatus(null);

        try {
            const uploadFormData = new FormData();
            uploadFormData.append('image', uploadFile);
            uploadFormData.append('tags', JSON.stringify(formData.tags));

            const response = await fetch('/api/artisan/gallery', {
                method: 'POST',
                body: uploadFormData
            });

            const result = await response.json();

            if (result.success) {
                setSaveStatus({ type: 'success', message: 'Image uploaded successfully!' });
                setUploadDialogOpen(false);
                resetForm();
                loadGalleryItems(); // Reload gallery
                loadAvailableTags(); // Reload tags for suggestions
            } else {
                setSaveStatus({ type: 'error', message: result.error || 'Failed to upload image' });
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            setSaveStatus({ type: 'error', message: 'Failed to upload image. Please try again.' });
        } finally {
            setUploading(false);
        }
    };

    const handleEdit = (item) => {
        setSelectedItem(item);
        setFormData({
            tags: item.tags || []
        });
        setEditDialogOpen(true);
    };

    const handleUpdate = async () => {
        if (!selectedItem) return;

        setUploading(true);
        setSaveStatus(null);

        try {
            const updateData = {
                tags: formData.tags
            };

            const response = await fetch(`/api/artisan/gallery/${selectedItem.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData)
            });

            const result = await response.json();

            if (result.success) {
                setSaveStatus({ type: 'success', message: 'Image updated successfully!' });
                setEditDialogOpen(false);
                resetForm();
                loadGalleryItems(); // Reload gallery
                loadAvailableTags(); // Reload tags for suggestions
            } else {
                setSaveStatus({ type: 'error', message: result.error || 'Failed to update image' });
            }
        } catch (error) {
            console.error('Error updating image:', error);
            setSaveStatus({ type: 'error', message: 'Failed to update image. Please try again.' });
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (item) => {
        if (!confirm('Are you sure you want to delete this image? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`/api/artisan/gallery/${item.id}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (result.success) {
                setSaveStatus({ type: 'success', message: 'Image deleted successfully!' });
                loadGalleryItems(); // Reload gallery
            } else {
                setSaveStatus({ type: 'error', message: result.error || 'Failed to delete image' });
            }
        } catch (error) {
            console.error('Error deleting image:', error);
            setSaveStatus({ type: 'error', message: 'Failed to delete image. Please try again.' });
        }
    };

    const resetForm = () => {
        setFormData({
            tags: []
        });
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
                            Gallery Management
                        </Typography>
                        <Typography 
                            variant="body2" 
                            color="text.secondary"
                            sx={{ display: { xs: 'none', sm: 'block' } }}
                        >
                            Upload and manage portfolio images for your shop profile
                        </Typography>
                    </Box>
                </Box>
                <input
                    accept="image/*"
                    style={{ display: 'none' }}
                    id="upload-button"
                    type="file"
                    onChange={handleFileSelect}
                />
                <label htmlFor="upload-button">
                    <Button
                        variant="contained"
                        component="span"
                        startIcon={<CloudUploadIcon />}
                        size="small"
                        fullWidth={{ xs: true, sm: false }}
                    >
                        Upload Image
                    </Button>
                </label>
            </Box>

            {/* Status Alert */}
            {saveStatus && (
                <Alert severity={saveStatus.type} sx={{ mb: 3 }}>
                    {saveStatus.message}
                </Alert>
            )}

            {/* Gallery Grid */}
            {galleryItems.length === 0 ? (
                <Card>
                    <CardContent sx={{ textAlign: 'center', py: 8 }}>
                        <PhotoCameraIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" gutterBottom>
                            No images in your gallery yet
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            Upload your first portfolio image to get started
                        </Typography>
                        <input
                            accept="image/*"
                            style={{ display: 'none' }}
                            id="upload-first-button"
                            type="file"
                            onChange={handleFileSelect}
                        />
                        <label htmlFor="upload-first-button">
                            <Button
                                variant="contained"
                                component="span"
                                startIcon={<CloudUploadIcon />}
                            >
                                Upload Your First Image
                            </Button>
                        </label>
                    </CardContent>
                </Card>
            ) : (
                <Grid container spacing={2}>
                    {galleryItems.map((item) => (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={item._id}>
                            <Card sx={{ position: 'relative', borderRadius: 2 }}>
                                <Box sx={{ position: 'relative' }}>
                                    <Image
                                        src={item.imageUrl}
                                        alt="Gallery image"
                                        width={400}
                                        height={300}
                                        style={{ 
                                            borderRadius: 8,
                                            width: '100%',
                                            height: '200px',
                                            objectFit: 'cover'
                                        }}
                                    />
                                    
                                    {/* Action buttons overlay */}
                                    <Box 
                                        sx={{ 
                                            position: 'absolute',
                                            top: 8,
                                            right: 8,
                                            display: 'flex',
                                            gap: 0.5
                                        }}
                                    >
                                        <Tooltip title="Edit">
                                            <IconButton
                                                size="small"
                                                sx={{ 
                                                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                                    color: 'white',
                                                    '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.7)' }
                                                }}
                                                onClick={() => handleEdit(item)}
                                            >
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Delete">
                                            <IconButton
                                                size="small"
                                                sx={{ 
                                                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                                    color: 'white',
                                                    '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.7)' }
                                                }}
                                                onClick={() => handleDelete(item)}
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </Box>
                                
                                {/* Content area */}
                                <CardContent sx={{ p: 2 }}>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                        Uploaded {new Date(item.uploadedAt).toLocaleDateString()}
                                    </Typography>
                                    
                                    {/* Tags */}
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        {item.tags && item.tags.length > 0 ? (
                                            item.tags.map((tag, index) => (
                                                <Chip 
                                                    key={index}
                                                    label={tag} 
                                                    size="small" 
                                                    variant="outlined"
                                                    sx={{ fontSize: '0.7rem' }}
                                                />
                                            ))
                                        ) : (
                                            <Typography 
                                                variant="caption" 
                                                color="text.secondary"
                                                sx={{ fontStyle: 'italic' }}
                                            >
                                                No tags
                                            </Typography>
                                        )}
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* Upload Dialog */}
            <Dialog 
                open={uploadDialogOpen} 
                onClose={handleCloseUploadDialog} 
                maxWidth="md" 
                fullWidth
                fullScreen={{ xs: true, sm: false }}
                sx={{
                    '& .MuiDialog-paper': {
                        margin: { xs: 0, sm: 2 },
                        maxHeight: { xs: '100vh', sm: 'calc(100% - 64px)' }
                    }
                }}
            >
                <DialogTitle sx={{ 
                    pb: { xs: 1, sm: 2 },
                    typography: { xs: 'h6', sm: 'h5' }
                }}>
                    Upload New Image
                </DialogTitle>
                <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
                    <Grid container spacing={{ xs: 2, sm: 3 }}>
                        <Grid item xs={12} md={6}>
                            {previewImage && (
                                <Box sx={{ textAlign: 'center', mb: 2 }}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={previewImage}
                                        alt="Preview"
                                        style={{
                                            maxWidth: '100%',
                                            maxHeight: { xs: 200, sm: 300 },
                                            borderRadius: 8
                                        }}
                                    />
                                </Box>
                            )}
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Autocomplete
                                multiple
                                id="tags"
                                options={availableTags.map(tag => tag.tag)}
                                freeSolo
                                value={formData.tags}
                                onChange={(event, newValue) => {
                                    setFormData(prev => ({ ...prev, tags: newValue }));
                                }}
                                renderTags={(value, getTagProps) =>
                                    value.map((option, index) => (
                                        <Chip 
                                            variant="outlined" 
                                            label={option} 
                                            {...getTagProps({ index })}
                                            key={index}
                                            size="small"
                                        />
                                    ))
                                }
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Tags"
                                        placeholder="Type to add tags..."
                                        helperText="Tags help customers find your work. Press Enter to add new tags."
                                        size="small"
                                    />
                                )}
                                sx={{ mb: { xs: 1.5, sm: 2 } }}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ 
                    p: { xs: 2, sm: 3 },
                    flexDirection: { xs: 'column', sm: 'row' },
                    gap: { xs: 1, sm: 0 }
                }}>
                    <Button 
                        onClick={handleCloseUploadDialog}
                        fullWidth={{ xs: true, sm: false }}
                        size="medium"
                    >
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleUpload} 
                        variant="contained"
                        disabled={uploading || !uploadFile}
                        fullWidth={{ xs: true, sm: false }}
                        size="medium"
                    >
                        {uploading ? 'Uploading...' : 'Upload Image'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog 
                open={editDialogOpen} 
                onClose={handleCloseEditDialog} 
                maxWidth="sm" 
                fullWidth
                fullScreen={{ xs: true, sm: false }}
                sx={{
                    '& .MuiDialog-paper': {
                        margin: { xs: 0, sm: 2 },
                        maxHeight: { xs: '100vh', sm: 'calc(100% - 64px)' }
                    }
                }}
            >
                <DialogTitle sx={{ 
                    pb: { xs: 1, sm: 2 },
                    typography: { xs: 'h6', sm: 'h5' }
                }}>
                    Edit Tags
                </DialogTitle>
                <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
                    <Autocomplete
                        multiple
                        id="edit-tags"
                        options={availableTags.map(tag => tag.tag)}
                        freeSolo
                        value={formData.tags}
                        onChange={(event, newValue) => {
                            setFormData(prev => ({ ...prev, tags: newValue }));
                        }}
                        renderTags={(value, getTagProps) =>
                            value.map((option, index) => (
                                <Chip 
                                    variant="outlined" 
                                    label={option} 
                                    {...getTagProps({ index })}
                                    key={index}
                                    size="small"
                                />
                            ))
                        }
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Tags"
                                placeholder="Type to add tags..."
                                helperText="Tags help customers find your work. Press Enter to add new tags."
                                size="small"
                            />
                        )}
                    />
                </DialogContent>
                <DialogActions sx={{ 
                    p: { xs: 2, sm: 3 },
                    flexDirection: { xs: 'column', sm: 'row' },
                    gap: { xs: 1, sm: 0 }
                }}>
                    <Button 
                        onClick={handleCloseEditDialog}
                        fullWidth={{ xs: true, sm: false }}
                        size="medium"
                    >
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleUpdate} 
                        variant="contained"
                        disabled={uploading}
                        fullWidth={{ xs: true, sm: false }}
                        size="medium"
                    >
                        {uploading ? 'Updating...' : 'Update Image'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}