import React from 'react';
import { useRouter } from 'next/navigation';
import { Box, IconButton, Typography, Button, Alert } from '@mui/material';
import { ArrowBack as ArrowBackIcon, CloudUpload as CloudUploadIcon } from '@mui/icons-material';

export default function GalleryHeader({ handleFileSelect, saveStatus }) {
    const router = useRouter();

    return (
        <>
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

            {saveStatus && (
                <Alert severity={saveStatus.type} sx={{ mb: 3 }}>
                    {saveStatus.message}
                </Alert>
            )}
        </>
    );
}
