import React, { useState } from 'react';
import Image from 'next/image';
import {
    Card,
    CardContent,
    Box,
    Typography,
    Button,
    Grid,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    TextField
} from '@mui/material';
import {
    PhotoCamera as PhotoIcon,
    Delete as DeleteIcon,
    Add as AddIcon,
    Edit as EditIcon
} from '@mui/icons-material';
import { QC_PHOTO_CONFIG } from '../constants';
import { validatePhotoFile, createPhotoPreview } from '../utils/qcUtils';

const QcPhotoUploader = ({ photos, onAddPhoto, onRemovePhoto, onUpdateCaption, disabled = false }) => {
    const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [selectedPhotoType, setSelectedPhotoType] = useState('After QC');
    const [photoCaption, setPhotoCaption] = useState('');
    const [previewUrl, setPreviewUrl] = useState('');

    const handleFileSelect = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const validation = validatePhotoFile(file);
        if (!validation.valid) {
            alert(validation.error);
            return;
        }

        try {
            const preview = await createPhotoPreview(file);
            setSelectedFile(file);
            setPreviewUrl(preview);
            setUploadDialogOpen(true);
        } catch (error) {
            console.error('Error creating photo preview:', error);
            alert('Error processing photo');
        }
    };

    const handleUpload = () => {
        if (!selectedFile) return;

        onAddPhoto({
            file: selectedFile,
            url: previewUrl,
            type: selectedPhotoType,
            caption: photoCaption
        });

        // Reset form
        setSelectedFile(null);
        setPreviewUrl('');
        setPhotoCaption('');
        setSelectedPhotoType('After QC');
        setUploadDialogOpen(false);
    };

    const handleCancel = () => {
        setSelectedFile(null);
        setPreviewUrl('');
        setPhotoCaption('');
        setUploadDialogOpen(false);
    };

    return (
        <Card>
            <CardContent>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PhotoIcon />
                    QC Documentation Photos
                    <Chip 
                        label={`${photos.length}/${QC_PHOTO_CONFIG.MAX_PHOTOS}`}
                        size="small"
                        color={photos.length > 0 ? 'primary' : 'default'}
                    />
                </Typography>

                {/* Photo Grid */}
                <Grid container spacing={2} sx={{ mb: 2 }}>
                    {photos.map((photo) => (
                        <Grid item xs={12} sm={6} md={4} key={photo.id}>
                            <Card variant="outlined">
                                <Box sx={{ position: 'relative' }}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={photo.url}
                                        alt="QC Photo"
                                        style={{
                                            width: '100%',
                                            height: '120px',
                                            objectFit: 'cover'
                                        }}
                                    />
                                    {!disabled && (
                                        <IconButton
                                            size="small"
                                            onClick={() => onRemovePhoto(photo.id)}
                                            sx={{
                                                position: 'absolute',
                                                top: 4,
                                                right: 4,
                                                backgroundColor: 'rgba(255,255,255,0.8)',
                                                '&:hover': { backgroundColor: 'rgba(255,255,255,0.9)' }
                                            }}
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    )}
                                </Box>
                                <CardContent sx={{ p: 1 }}>
                                    <Typography variant="caption" display="block">
                                        {photo.type}
                                    </Typography>
                                    {photo.caption && (
                                        <Typography variant="body2" color="text.secondary">
                                            {photo.caption}
                                        </Typography>
                                    )}
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>

                {/* Add Photo Button */}
                {!disabled && photos.length < QC_PHOTO_CONFIG.MAX_PHOTOS && (
                    <Box sx={{ textAlign: 'center' }}>
                        <input
                            accept="image/*"
                            style={{ display: 'none' }}
                            id="photo-upload-input"
                            type="file"
                            onChange={handleFileSelect}
                        />
                        <label htmlFor="photo-upload-input">
                            <Button
                                variant="outlined"
                                component="span"
                                startIcon={<AddIcon />}
                                sx={{ mb: 1 }}
                            >
                                Add Photo
                            </Button>
                        </label>
                        <Typography variant="caption" display="block" color="text.secondary">
                            Required for quality control documentation
                        </Typography>
                    </Box>
                )}

                {/* Upload Dialog */}
                <Dialog open={uploadDialogOpen} onClose={handleCancel} maxWidth="sm" fullWidth>
                    <DialogTitle>Add QC Photo</DialogTitle>
                    <DialogContent>
                        {previewUrl && (
                            <Box sx={{ mb: 2, textAlign: 'center' }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={previewUrl}
                                    alt="Photo Preview"
                                    style={{
                                        maxWidth: '100%',
                                        maxHeight: '300px',
                                        objectFit: 'contain'
                                    }}
                                />
                            </Box>
                        )}
                        
                        <TextField
                            select
                            fullWidth
                            label="Photo Type"
                            value={selectedPhotoType}
                            onChange={(e) => setSelectedPhotoType(e.target.value)}
                            sx={{ mb: 2 }}
                            SelectProps={{ native: true }}
                        >
                            {QC_PHOTO_CONFIG.PHOTO_TYPES.map((type) => (
                                <option key={type} value={type}>
                                    {type}
                                </option>
                            ))}
                        </TextField>

                        <TextField
                            fullWidth
                            label="Caption (Optional)"
                            value={photoCaption}
                            onChange={(e) => setPhotoCaption(e.target.value)}
                            multiline
                            rows={2}
                            placeholder="Add a description or note about this photo..."
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCancel}>Cancel</Button>
                        <Button onClick={handleUpload} variant="contained">
                            Add Photo
                        </Button>
                    </DialogActions>
                </Dialog>
            </CardContent>
        </Card>
    );
};

export default QcPhotoUploader;
