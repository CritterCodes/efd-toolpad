import React from 'react';
import { Grid, TextField, FormControl, InputLabel, Select, MenuItem, InputAdornment } from '@mui/material';
import { PRICING_METHODS } from '../../constants';

const MaterialPricingForm = ({
    formData,
    handleInputChange
}) => {
    return (
        <Grid container spacing={3} sx={{ mt: 0 }}>
            {/* Pricing Section */}
            <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                    <InputLabel>Pricing Method</InputLabel>
                    <Select
                        value={formData.pricingMethod}
                        onChange={(e) => handleInputChange('pricingMethod', e.target.value)}
                        label="Pricing Method"
                    >
                        {PRICING_METHODS.map((method) => (
                            <MenuItem key={method.value} value={method.value}>
                                {method.label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
                <TextField
                    fullWidth
                    type="number"
                    label="Cost"
                    value={formData.cost}
                    onChange={(e) => handleInputChange('cost', e.target.value)}
                    InputProps={{
                        startAdornment: <InputAdornment position="start">$</InputAdornment>
                    }}
                    inputProps={{ min: 0, step: 0.01 }}
                />
            </Grid>

            {formData.pricingMethod === 'markup' && (
                <Grid item xs={12} md={4}>
                    <TextField
                        fullWidth
                        type="number"
                        label="Markup Multiplier"
                        value={formData.markup}
                        onChange={(e) => handleInputChange('markup', e.target.value)}
                        inputProps={{ min: 1, step: 0.1 }}
                        helperText="e.g., 2.5 for 250% markup"
                    />
                </Grid>
            )}

            <Grid item xs={12} md={formData.pricingMethod === 'markup' ? 4 : 8}>
                <TextField
                    fullWidth
                    type="number"
                    label="Selling Price"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', e.target.value)}
                    InputProps={{
                        startAdornment: <InputAdornment position="start">$</InputAdornment>
                    }}
                    inputProps={{ min: 0, step: 0.01 }}
                    disabled={formData.pricingMethod === 'markup' && formData.cost && formData.markup}
                />
            </Grid>
        </Grid>
    );
};

export default MaterialPricingForm;
