import React from 'react';
import { Grid, TextField } from '@mui/material';

const MaterialAttributesForm = ({
    formData,
    handleInputChange
}) => {
    return (
        <Grid container spacing={3} sx={{ mt: 0 }}>
            <Grid item xs={12}>
                <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Description/Notes"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Additional details about this material..."
                />
            </Grid>

            <Grid item xs={12} md={6}>
                <TextField
                    fullWidth
                    label="Supplier"
                    value={formData.supplier}
                    onChange={(e) => handleInputChange('supplier', e.target.value)}
                />
            </Grid>
        </Grid>
    );
};

export default MaterialAttributesForm;
