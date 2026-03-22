import React from 'react';
import { Grid, TextField, FormControl, InputLabel, Select, MenuItem, Typography } from '@mui/material';
export default function SpecificationsSection({ formData, errors, handleInputChange, handleSelectChange }) {
    return (
        <>
            <Typography variant="h6" sx={{ mb: 2, mt: 4 }}>Specifications</Typography>
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