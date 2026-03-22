import React from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, 
    Button, Grid, Box, Autocomplete, Chip, TextField 
} from '@mui/material';

export default function UploadDialog({ 
    open, 
    onClose, 
    previewImage, 
    availableTags, 
    formData, 
    setFormData, 
    handleUpload, 
    uploading, 
    uploadFile 
}) {
    return (
        <Dialog 
            open={open} 
            onClose={onClose} 
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
                    onClick={onClose}
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
    );
}
