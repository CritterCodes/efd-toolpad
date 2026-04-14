import React from 'react';
import { Box, Typography, Grid, IconButton, Button, Avatar } from '@mui/material';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import DeleteIcon from '@mui/icons-material/Delete';

export default function PhotoUploadSection({ photos, handlePhotoUpload, removePhoto }) {
    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1">Photos</Typography>
                <Button
                    variant="outlined"
                    component="label"
                    startIcon={<FileUploadIcon />}
                    size="small"
                >
                    Add Photo
                    <input type="file" hidden accept="image/*" onChange={handlePhotoUpload} />
                </Button>
            </Box>

            {photos.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                    No photos added yet. Photos help ensure accurate repairs.
                </Typography>
            ) : (
                <Grid container spacing={2}>
                    {photos.map((photo) => (
                        <Grid item xs={6} sm={4} md={3} key={photo.id}>
                            <Box sx={{ position: 'relative' }}>
                                <Avatar
                                    src={photo.data}
                                    sx={{ width: '100%', height: 120, borderRadius: 1, mb: 1 }}
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
        </Box>
    );
}
