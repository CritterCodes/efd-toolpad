import React, { useState } from 'react';
import {
    Card, CardContent, Box, Typography, Alert, Grid, TextField,
    FormControlLabel, Switch, Divider
} from '@mui/material';
import { MonetizationOn as PriceIcon } from '@mui/icons-material';
import { METAL_TYPES as ALL_METAL_TYPES, calculateWaxWeight, calculateMetalWeight, adjustPriceForPurity, calculateMetalCost, getAllMetalOptions } from '@/constants/metalTypes';

export default function JewelryPricing({ stlFile, pricingData, onChange, metalPrices }) {
    const [selectedMetals, setSelectedMetals] = useState(pricingData.selectedMetals || []);
    
    const stlVolume = pricingData.stlVolume || 0;
    const waxWeight = calculateWaxWeight(stlVolume);

    const handleInputChange = (field, value) => {
        onChange({ ...pricingData, [field]: value });
    };

    const handleMetalToggle = (metalKey) => {
        const newSelection = selectedMetals.includes(metalKey)
            ? selectedMetals.filter(m => m !== metalKey)
            : [...selectedMetals, metalKey];
        
        setSelectedMetals(newSelection);
        onChange({ ...pricingData, selectedMetals: newSelection });
    };

    const cadLabor = parseFloat(pricingData.cadLabor) || 0;
    const productionLabor = parseFloat(pricingData.productionLabor) || 0;
    const mountingLabor = parseFloat(pricingData.mountingLabor) || 0;
    const otherCosts = parseFloat(pricingData.otherCosts) || 0;
    
    const sharedCosts = cadLabor + productionLabor + mountingLabor + otherCosts;

    if (!stlFile) return null;

    return (
        <Card variant="outlined" sx={{ mb: 3, border: '1px solid #90caf9' }}>
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <PriceIcon color="primary" />
                    <Typography variant="h6">Dynamic Pricing (COG)</Typography>
                </Box>
                
                <Alert severity="info" sx={{ mb: 3 }}>
                    Configure dynamic pricing based on the uploaded STL file volume and metal selection.
                </Alert>

                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth label="STL Volume (mm³)" type="number"
                            value={pricingData.stlVolume || ''}
                            onChange={(e) => handleInputChange('stlVolume', parseFloat(e.target.value))}
                            helperText={`Wax Weight: ${waxWeight.toFixed(3)}g`}
                        />
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <TextField fullWidth label="CAD Labor ($)" type="number" value={pricingData.cadLabor || ''} onChange={(e) => handleInputChange('cadLabor', e.target.value)} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField fullWidth label="Production Labor ($)" type="number" value={pricingData.productionLabor || ''} onChange={(e) => handleInputChange('productionLabor', e.target.value)} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField fullWidth label="Mounting Labor ($)" type="number" value={pricingData.mountingLabor || ''} onChange={(e) => handleInputChange('mountingLabor', e.target.value)} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField fullWidth label="Other Costs ($)" type="number" value={pricingData.otherCosts || ''} onChange={(e) => handleInputChange('otherCosts', e.target.value)} helperText="Shipping, packaging, etc." />
                    </Grid>

                    <Grid item xs={12}>
                        <Typography variant="subtitle2" gutterBottom>Select Available Metals:</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
                            {getAllMetalOptions().map((metalOption) => (
                                <FormControlLabel
                                    key={metalOption.key}
                                    control={<Switch checked={selectedMetals.includes(metalOption.key)} onChange={() => handleMetalToggle(metalOption.key)} size="small" />}
                                    label={metalOption.label}
                                />
                            ))}
                        </Box>
                    </Grid>

                    {selectedMetals.length > 0 && (
                        <Grid item xs={12}>
                            <Typography variant="subtitle2" gutterBottom>Pricing Preview:</Typography>
                            <Grid container spacing={2}>
                                {selectedMetals.map(metalKey => {
                                    const metalMeta = ALL_METAL_TYPES[metalKey];
                                    if (!metalMeta) return null;

                                    const categoryPrice = metalPrices?.[metalMeta.category] || 0;
                                    const adjustedPrice = adjustPriceForPurity(categoryPrice, metalKey);
                                    const mWeight = calculateMetalWeight(waxWeight, metalMeta.sg);
                                    const mCost = calculateMetalCost(mWeight, adjustedPrice);
                                    const totalCost = mCost + sharedCosts;

                                    return (
                                        <Grid item xs={12} sm={6} md={4} key={metalKey}>
                                            <Card variant="outlined" sx={{ p: 1.5, bgcolor: '#f8f9fa' }}>
                                                <Typography variant="subtitle2" color="primary" gutterBottom>{metalMeta.label}</Typography>
                                                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 0.5, fontSize: '0.8rem' }}>
                                                    <Typography color="text.secondary">Weight:</Typography>
                                                    <Typography>{mWeight.toFixed(2)}g</Typography>
                                                    <Typography color="text.secondary">Metal Cost:</Typography>
                                                    <Typography>${mCost.toFixed(2)}</Typography>
                                                    <Divider sx={{ gridColumn: '1/-1', my: 0.5 }} />
                                                    <Typography fontWeight="bold">Total COG:</Typography>
                                                    <Typography fontWeight="bold">${totalCost.toFixed(2)}</Typography>
                                                </Box>
                                            </Card>
                                        </Grid>
                                    );
                                })}
                            </Grid>
                        </Grid>
                    )}
                </Grid>
            </CardContent>
        </Card>
    );
}
