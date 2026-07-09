import React, { useState } from 'react';
import {
    Card, CardContent, Box, Typography, Alert, Grid, TextField,
    FormControlLabel, Switch, Divider
} from '@mui/material';
import { MonetizationOn as PriceIcon } from '@mui/icons-material';
import { METAL_TYPES as ALL_METAL_TYPES, calculateWaxWeight, calculateMetalWeight, adjustPriceForPurity, calculateMetalCost, getAllMetalOptions } from '@/constants/metalTypes';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

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

    if (!stlFile) {
        return (
            <Box sx={{ mb: 3, p: 3, border: `1px dashed ${REPAIRS_UI.border}`, borderRadius: 2, textAlign: 'center' }}>
                <PriceIcon sx={{ fontSize: 36, color: REPAIRS_UI.textMuted, mb: 1 }} />
                <Typography sx={{ color: REPAIRS_UI.textSecondary, fontSize: '0.875rem' }}>
                    Upload an STL file to enable dynamic pricing (COG calculation).
                </Typography>
            </Box>
        );
    }

    return (
        <Card sx={{ mb: 3, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <PriceIcon sx={{ color: REPAIRS_UI.accent }} />
                    <Typography variant="h6" sx={{ color: REPAIRS_UI.textHeader }}>Dynamic Pricing (COG)</Typography>
                </Box>

                <Alert severity="info" sx={{ mb: 3, backgroundColor: '#1A2A3A', color: '#90CAF9', border: '1px solid #1E3A5F' }}>
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
                        <Typography variant="subtitle2" gutterBottom sx={{ color: REPAIRS_UI.textSecondary }}>Select Available Metals:</Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: { xs: 1, sm: 2 }, mb: 2 }}>
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
                            <Typography variant="subtitle2" gutterBottom sx={{ color: REPAIRS_UI.textSecondary }}>Pricing Preview:</Typography>
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
                                            <Card sx={{ p: 1.5, backgroundColor: REPAIRS_UI.bgTertiary, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
                                                <Typography variant="subtitle2" sx={{ color: REPAIRS_UI.accent }} gutterBottom>{metalMeta.label}</Typography>
                                                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 0.5, fontSize: '0.8rem' }}>
                                                    <Typography sx={{ color: REPAIRS_UI.textSecondary }}>Weight:</Typography>
                                                    <Typography sx={{ textAlign: 'right', color: REPAIRS_UI.textPrimary }}>{mWeight.toFixed(2)}g</Typography>
                                                    <Typography sx={{ color: REPAIRS_UI.textSecondary }}>Metal Cost:</Typography>
                                                    <Typography sx={{ textAlign: 'right', color: REPAIRS_UI.textPrimary }}>${mCost.toFixed(2)}</Typography>
                                                    <Divider sx={{ gridColumn: '1/-1', my: 0.5, borderColor: REPAIRS_UI.border }} />
                                                    <Typography fontWeight="bold" sx={{ color: REPAIRS_UI.textHeader }}>Total COG:</Typography>
                                                    <Typography fontWeight="bold" sx={{ textAlign: 'right', color: REPAIRS_UI.textHeader }}>${totalCost.toFixed(2)}</Typography>
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
