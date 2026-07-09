import React from 'react';
import {
    Paper, Box, Typography, Button, ImageList, ImageListItem,
    ImageListItemBar, IconButton, Alert, Card, CardContent,
    useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
    CloudUpload as CloudUploadIcon, Delete as DeleteIcon,
    ThreeDRotation as ThreeDIcon
} from '@mui/icons-material';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

const FileUploader = ({ label, fileUrl, onUpload, onDelete, accept, type }) => (
    <Card variant="outlined" sx={{ mb: 2, backgroundColor: REPAIRS_UI.bgTertiary, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
        <CardContent>
            <Typography variant="subtitle2" gutterBottom sx={{ color: REPAIRS_UI.textSecondary }}>{label}</Typography>
            {fileUrl ? (
                <Box sx={{
                    display: 'flex',
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    justifyContent: 'space-between',
                    gap: 1,
                    bgcolor: REPAIRS_UI.bgCard,
                    border: `1px solid ${REPAIRS_UI.border}`,
                    p: 1,
                    borderRadius: 1,
                    minWidth: 0,
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                        <ThreeDIcon sx={{ mr: 1, color: REPAIRS_UI.accent }} />
                        <Typography variant="body2" noWrap sx={{ maxWidth: { xs: 180, sm: 320, md: 200 }, minWidth: 0, color: REPAIRS_UI.textPrimary }}>
                            {fileUrl.split('/').pop()}
                        </Typography>
                    </Box>
                    <IconButton size="small" onClick={onDelete} sx={{ color: REPAIRS_UI.textMuted, '&:hover': { color: '#EF5350' } }}>
                        <DeleteIcon />
                    </IconButton>
                </Box>
            ) : (
                <Button
                    variant="outlined"
                    component="label"
                    startIcon={<CloudUploadIcon />}
                    fullWidth
                    sx={{ borderColor: REPAIRS_UI.border, color: REPAIRS_UI.textSecondary, '&:hover': { borderColor: REPAIRS_UI.accent, color: REPAIRS_UI.accent } }}
                >
                    Upload {type.toUpperCase()}
                    <input type="file" hidden accept={accept} onChange={(e) => onUpload(e, type)} />
                </Button>
            )}
        </CardContent>
    </Card>
);

export default function JewelryMedia({
    formData, handleImageUpload, handleRemoveExistingImage,
    handleRemoveNewImage, handleFileUpload, handleDeleteFile, isNew
}) {
    const theme = useTheme();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
    const isMediumScreen = useMediaQuery(theme.breakpoints.down('md'));
    const imageCols = isSmallScreen ? 2 : isMediumScreen ? 3 : 4;
    const rowHeight = isSmallScreen ? 132 : 160;

    return (
        <>
            <Paper sx={{ mb: 3, p: { xs: 2, sm: 3 }, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
                <Typography variant="h6" gutterBottom sx={{ color: REPAIRS_UI.textHeader }}>Images</Typography>
                <Box sx={{ mb: 2 }}>
                    <Button
                        variant="contained"
                        component="label"
                        startIcon={<CloudUploadIcon />}
                        fullWidth={isSmallScreen}
                        sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, '&:hover': { backgroundColor: '#C19B2E' } }}
                    >
                        Upload Images
                        <input type="file" hidden multiple accept="image/*" onChange={handleImageUpload} />
                    </Button>
                </Box>

                {formData.existingImages.length > 0 && (
                    <ImageList cols={imageCols} rowHeight={rowHeight} sx={{ mb: 2 }}>
                        {formData.existingImages.map((item, index) => (
                            <ImageListItem key={index}>
                                <img src={typeof item === 'string' ? item : item?.url} alt={`Existing ${index}`} loading="lazy" style={{ height: '100%', objectFit: 'cover' }} />
                                <ImageListItemBar
                                    actionIcon={
                                        <IconButton sx={{ color: 'white' }} onClick={() => handleRemoveExistingImage(index)}>
                                            <DeleteIcon />
                                        </IconButton>
                                    }
                                />
                            </ImageListItem>
                        ))}
                    </ImageList>
                )}

                {formData.images.length > 0 && (
                    <Box>
                        <Typography variant="subtitle2" gutterBottom sx={{ color: REPAIRS_UI.textSecondary }}>New Uploads:</Typography>
                        <ImageList cols={imageCols} rowHeight={rowHeight}>
                            {formData.images.map((file, index) => (
                                <ImageListItem key={index}>
                                    <img src={URL.createObjectURL(file)} alt={`New ${index}`} loading="lazy" style={{ height: '100%', objectFit: 'cover' }} />
                                    <ImageListItemBar
                                        actionIcon={
                                            <IconButton sx={{ color: 'white' }} onClick={() => handleRemoveNewImage(index)}>
                                                <DeleteIcon />
                                            </IconButton>
                                        }
                                    />
                                </ImageListItem>
                            ))}
                        </ImageList>
                    </Box>
                )}
            </Paper>

            <Paper sx={{ mb: 3, p: { xs: 2, sm: 3 }, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
                <Typography variant="h6" gutterBottom sx={{ color: REPAIRS_UI.textHeader }}>3D Models</Typography>
                <Alert severity="info" sx={{ mb: 3, backgroundColor: '#1A2A3A', color: '#90CAF9', border: '1px solid #1E3A5F' }}>
                    Upload 3D files for manufacturing and visualization.
                    {isNew && ' Please save the product first to enable uploads.'}
                </Alert>

                <FileUploader
                    label="STL File (For Printing)" fileUrl={formData.stlFile} type="stl" accept=".stl"
                    onUpload={handleFileUpload} onDelete={() => handleDeleteFile('stl')}
                />
                <FileUploader
                    label="GLB File (For Web Viewer)" fileUrl={formData.glbFile} type="glb" accept=".glb"
                    onUpload={handleFileUpload} onDelete={() => handleDeleteFile('glb')}
                />
                <FileUploader
                    label="OBJ File (Legacy/Other)" fileUrl={formData.objFile} type="obj" accept=".obj"
                    onUpload={handleFileUpload} onDelete={() => handleDeleteFile('obj')}
                />
            </Paper>
        </>
    );
}
