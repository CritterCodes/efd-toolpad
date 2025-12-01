'use client';

import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    IconButton,
    Box,
    Typography,
    Chip,
    Grid,
    Paper,
    Divider
} from '@mui/material';
import {
    Close as CloseIcon,
    Fullscreen as FullscreenIcon,
    Download as DownloadIcon,
    Info as InfoIcon,
    ThreeDRotation as ModelIcon
} from '@mui/icons-material';
import GLBViewer from './GLBViewer';

const GLBViewerModal = ({ 
    open, 
    onClose, 
    design, 
    requestTitle = "CAD Design"
}) => {
    const [fullscreen, setFullscreen] = useState(false);

    if (!design) return null;

    const handleDownload = () => {
        if (design.fileUrl) {
            const link = document.createElement('a');
            link.href = design.fileUrl;
            link.download = design.filename || 'model.glb';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return 'Unknown size';
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Unknown date';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth={fullscreen ? false : 'lg'}
            fullWidth
            fullScreen={fullscreen}
            PaperProps={{
                sx: {
                    height: fullscreen ? '100vh' : '80vh',
                    maxHeight: fullscreen ? '100vh' : '80vh'
                }
            }}
        >
            <DialogTitle 
                sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    pb: 1
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ModelIcon color="primary" />
                    <Typography variant="h6" component="span">
                        3D Model Viewer
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton 
                        onClick={() => setFullscreen(!fullscreen)}
                        title={fullscreen ? "Exit Fullscreen" : "Fullscreen"}
                        size="small"
                    >
                        <FullscreenIcon />
                    </IconButton>
                    <IconButton onClick={onClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </Box>
            </DialogTitle>

            <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Model Info Header */}
                <Paper sx={{ mx: 3, mb: 2, p: 2, backgroundColor: 'grey.50' }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={6}>
                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                {design.filename || 'Unnamed Model'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {requestTitle}
                            </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                <Chip 
                                    icon={<InfoIcon />}
                                    label={design.fileType?.toUpperCase() || 'GLB'} 
                                    size="small" 
                                    color="primary" 
                                />
                                {design.fileSize && (
                                    <Chip 
                                        label={formatFileSize(design.fileSize)} 
                                        size="small" 
                                        variant="outlined" 
                                    />
                                )}
                                {design.uploadedAt && (
                                    <Chip 
                                        label={formatDate(design.uploadedAt)} 
                                        size="small" 
                                        variant="outlined" 
                                    />
                                )}
                            </Box>
                        </Grid>
                    </Grid>
                </Paper>

                {/* 3D Viewer */}
                <Box sx={{ 
                    flex: 1, 
                    mx: 3, 
                    mb: 2, 
                    minHeight: fullscreen ? 'calc(100vh - 200px)' : '400px',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    overflow: 'hidden'
                }}>
                    <GLBViewer 
                        src={design.fileUrl}
                        alt={`3D model: ${design.filename || 'CAD Design'}`}
                        height="100%"
                    />
                </Box>

                {/* Design Details */}
                {(design.description || design.notes || design.volume) && (
                    <Paper sx={{ mx: 3, mb: 2, p: 2 }}>
                        <Typography variant="subtitle2" gutterBottom color="primary">
                            Design Details
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        <Grid container spacing={2}>
                            {design.description && (
                                <Grid item xs={12}>
                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                        Description:
                                    </Typography>
                                    <Typography variant="body1">
                                        {design.description}
                                    </Typography>
                                </Grid>
                            )}
                            {design.volume && (
                                <Grid item xs={12} md={6}>
                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                        Volume:
                                    </Typography>
                                    <Typography variant="body1">
                                        {design.volume} mm³
                                    </Typography>
                                </Grid>
                            )}
                            {design.estimatedTime && (
                                <Grid item xs={12} md={6}>
                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                        Estimated Print Time:
                                    </Typography>
                                    <Typography variant="body1">
                                        {design.estimatedTime} hours
                                    </Typography>
                                </Grid>
                            )}
                            {design.notes && (
                                <Grid item xs={12}>
                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                        Notes:
                                    </Typography>
                                    <Typography variant="body1">
                                        {design.notes}
                                    </Typography>
                                </Grid>
                            )}
                        </Grid>
                    </Paper>
                )}
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button
                    startIcon={<DownloadIcon />}
                    onClick={handleDownload}
                    variant="outlined"
                    disabled={!design.fileUrl}
                >
                    Download Model
                </Button>
                <Button onClick={onClose} variant="contained">
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default GLBViewerModal;