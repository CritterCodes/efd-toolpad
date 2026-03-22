import React from 'react';
import { Grid, TextField, InputAdornment, Typography } from '@mui/material';
export default function PricingSection({ formData, errors, handleInputChange }) {
    return (
        <>
            <Typography variant="h6" sx={{ mb: 2, mt: 4 }}>Pricing & Inventory</Typography>
            <Grid container spacing={3}>
          {/* Universal Product Fields */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" color="primary" gutterBottom>
              Basic Information
            </Typography>
          </Grid>
        </>
    );
}