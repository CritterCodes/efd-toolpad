'use client';

import React from 'react';
import { Card, CardContent, Typography, Grid, TextField, Chip, Box, InputAdornment } from '@mui/material';
import { computeMargin, computeSalePrice, computeLaborCost } from '@/services/production/productEditorUtils';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

const cardSx = {
    mb: 3,
    backgroundColor: REPAIRS_UI.bgPanel,
    backgroundImage: 'none',
    border: `1px solid ${REPAIRS_UI.border}`,
    borderRadius: 2,
    boxShadow: 'none',
};

const inputSx = {
    '& .MuiOutlinedInput-root': { backgroundColor: REPAIRS_UI.bgTertiary },
    '& .MuiInputLabel-root': { color: REPAIRS_UI.textSecondary },
    '& .MuiOutlinedInput-notchedOutline': { borderColor: REPAIRS_UI.border },
    '& .MuiInputBase-input': { color: REPAIRS_UI.textPrimary },
    '& .MuiInputAdornment-root .MuiTypography-root': { color: REPAIRS_UI.textMuted },
};

const dollarAdornment = { startAdornment: <InputAdornment position="start"><Typography sx={{ color: REPAIRS_UI.textMuted, fontSize: '0.875rem' }}>$</Typography></InputAdornment> };
const percentAdornment = { endAdornment: <InputAdornment position="end"><Typography sx={{ color: REPAIRS_UI.textMuted, fontSize: '0.875rem' }}>%</Typography></InputAdornment> };

export default function ProductPricingPanel({ form, onChange }) {
    const laborCost = computeLaborCost(form.laborHours, form.laborRate);
    const computedPrice = computeSalePrice(form.costBasis, laborCost, form.markupPct);
    const margin = computeMargin(form.salePrice || computedPrice, parseFloat(form.costBasis || 0) + laborCost);

    const marginColor = margin >= 50 ? 'success' : margin >= 30 ? 'warning' : 'error';

    return (
        <Card sx={cardSx}>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6" sx={{ color: REPAIRS_UI.textHeader }}>
                        Pricing
                    </Typography>
                    <Chip
                        label={`${margin.toFixed(1)}% margin`}
                        color={marginColor}
                        size="small"
                    />
                </Box>

                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth label="Cost basis" size="small" type="number"
                            value={form.costBasis}
                            onChange={(e) => onChange('costBasis', e.target.value)}
                            InputProps={dollarAdornment}
                            sx={inputSx}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth label="Labor hours" size="small" type="number"
                            value={form.laborHours}
                            onChange={(e) => onChange('laborHours', e.target.value)}
                            sx={inputSx}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth label="Labor rate" size="small" type="number"
                            value={form.laborRate}
                            onChange={(e) => onChange('laborRate', e.target.value)}
                            InputProps={dollarAdornment}
                            sx={inputSx}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth label="Markup %" size="small" type="number"
                            value={form.markupPct}
                            onChange={(e) => onChange('markupPct', e.target.value)}
                            InputProps={percentAdornment}
                            sx={inputSx}
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <Typography sx={{ color: REPAIRS_UI.textSecondary, fontSize: '0.85rem' }}>
                            Labor: <Box component="span" sx={{ color: REPAIRS_UI.textPrimary }}>${laborCost.toFixed(2)}</Box>
                        </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth label="Sale price" size="small" type="number"
                            value={form.salePrice}
                            onChange={(e) => onChange('salePrice', e.target.value)}
                            InputProps={dollarAdornment}
                            helperText={`Computed: $${computedPrice.toFixed(2)}`}
                            FormHelperTextProps={{ sx: { color: REPAIRS_UI.textMuted } }}
                            sx={inputSx}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth label="Compare-at price" size="small" type="number"
                            value={form.compareAtPrice}
                            onChange={(e) => onChange('compareAtPrice', e.target.value)}
                            InputProps={dollarAdornment}
                            sx={inputSx}
                        />
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );
}
