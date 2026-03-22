import React from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, 
    Button, Autocomplete, Chip, TextField 
} from '@mui/material';

export default function EditDialog({ 
    open, 
    onClose, 
    availableTags, 
    formData, 
    setFormData, 
    handleUpdate, 
    uploading 
}) {
    return (
        <Dialog 
            open={open} 
            onClose={onClose} 
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
                    onClick={onClose}
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
    );
}
