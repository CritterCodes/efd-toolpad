import React from 'react';
import { Grid, TextField, Box, Button, InputAdornment, CircularProgress, Alert, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { MATERIAL_TYPES } from '../../constants';

const MaterialBasicInfoForm = ({
    formData,
    handleInputChange,
    handleStullerLookup,
    isStullerLoading,
    stullerError,
    stullerData
}) => {
    return (
        <Grid container spacing={3}>
            {/* Stuller SKU Lookup */}
            <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                    <TextField
                        fullWidth
                        label="Stuller SKU"
                        value={formData.sku}
                        onChange={(e) => handleInputChange('sku', e.target.value)}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <Button
                                        onClick={handleStullerLookup}
                                        disabled={isStullerLoading}
                                        startIcon={isStullerLoading ? <CircularProgress size={16} /> : <SearchIcon />}
                                    >
                                        Lookup
                                    </Button>
                                </InputAdornment>
                            )
                        }}
                        helperText="Enter Stuller SKU and click Lookup to auto-populate"
                    />
                </Box>
                {stullerError && (
                    <Alert severity="error" sx={{ mt: 1 }}>
                        {stullerError}
                    </Alert>
                )}
                {stullerData && (
                    <Alert severity="success" sx={{ mt: 1 }}>
                        Found: {stullerData.description}
                    </Alert>
                )}
            </Grid>

            {/* Material Details */}
            <Grid item xs={12} md={8}>
                <TextField
                    fullWidth
                    label="Material/Part Name"
                    value={formData.partName}
                    onChange={(e) => handleInputChange('partName', e.target.value)}
                    required
                />
            </Grid>

            <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                    <InputLabel>Material Type</InputLabel>
                    <Select
                        value={formData.materialType}
                        onChange={(e) => handleInputChange('materialType', e.target.value)}
                        label="Material Type"
                    >
                        {MATERIAL_TYPES.map((type) => (
                            <MenuItem key={type.value} value={type.value}>
                                {type.label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
                <TextField
                    fullWidth
                    type="number"
                    label="Quantity"
                    value={formData.quantity}
                    onChange={(e) => handleInputChange('quantity', e.target.value)}
                    inputProps={{ min: 1 }}
                />
            </Grid>
        </Grid>
    );
};

export default MaterialBasicInfoForm;
