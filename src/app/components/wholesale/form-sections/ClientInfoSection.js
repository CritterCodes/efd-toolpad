import React from 'react';
import { Grid, TextField } from '@mui/material';

export default function ClientInfoSection({ formData, errors, handleInputChange }) {
    return (
        <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
                <TextField
                    fullWidth
                    required
                    label="Customer Name"
                    value={formData.customerName}
                    onChange={(e) => handleInputChange('customerName', e.target.value)}
                    error={!!errors.customerName}
                    helperText={errors.customerName}
                />
            </Grid>
            <Grid item xs={12} sm={6}>
                <TextField
                    fullWidth
                    required
                    label="Phone Number"
                    value={formData.customerPhone}
                    onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                    error={!!errors.customerPhone}
                    helperText={errors.customerPhone}
                />
            </Grid>
            <Grid item xs={12}>
                <TextField
                    fullWidth
                    label="Email Address"
                    type="email"
                    value={formData.customerEmail}
                    onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                    error={!!errors.customerEmail}
                    helperText={errors.customerEmail}
                />
            </Grid>
        </Grid>
    );
}
