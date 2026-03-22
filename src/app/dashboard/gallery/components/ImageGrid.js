import React from 'react';
import Image from 'next/image';
import { Box, Card, CardContent, Typography, Grid, IconButton, Tooltip, Chip, Button } from '@mui/material';
import { PhotoCamera as PhotoCameraIcon, Edit as EditIcon, Delete as DeleteIcon, CloudUpload as CloudUploadIcon } from '@mui/icons-material';

export default function ImageGrid({ galleryItems, handleEdit, handleDelete, handleFileSelect }) {
    if (galleryItems.length === 0) {
        return (
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
        );
    }

    return (
        <Grid container spacing={2}>
            {galleryItems.map((item) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={item._id || item.id}>
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
                        
                        <CardContent sx={{ p: 2 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                Uploaded {new Date(item.uploadedAt).toLocaleDateString()}
                            </Typography>
                            
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
    );
}
