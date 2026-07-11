'use client';

import React from 'react';
import { Card, CardContent, Typography, Grid, TextField, MenuItem } from '@mui/material';
import { REPAIRS_UI, repairsMenuProps } from '@/app/dashboard/repairs/components/repairsUi';

export default function GemstoneDetails({ form = {}, onChange = () => {} }) {
    const F = (field, label, opts = {}) => (
        <TextField
            fullWidth
            size="small"
            label={label}
            value={form[field] ?? ''}
            onChange={(e) => onChange(field, e.target.value)}
            {...opts}
        />
    );

    return (
        <Card sx={{ mb: 3, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
            <CardContent>
                <Typography variant="h6" sx={{ mb: 2, color: REPAIRS_UI.textHeader }}>Gemstone Details</Typography>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>{F('title', 'Title *', { required: true })}</Grid>
                    <Grid item xs={12} sm={6}>{F('species', 'Species *', { required: true, placeholder: 'e.g. Sapphire' })}</Grid>
                    <Grid item xs={12} sm={6}>{F('subspecies', 'Variety / Subspecies')}</Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth size="small" select label="Origin type"
                            value={form.naturalSynthetic ?? 'natural'}
                            onChange={(e) => onChange('naturalSynthetic', e.target.value)}
                            SelectProps={{ MenuProps: repairsMenuProps }}
                        >
                            <MenuItem value="natural">Natural</MenuItem>
                            <MenuItem value="synthetic">Synthetic</MenuItem>
                            <MenuItem value="lab-grown">Lab-grown</MenuItem>
                        </TextField>
                    </Grid>
                    <Grid item xs={6} sm={4}>{F('carat', 'Carat', { type: 'number' })}</Grid>
                    <Grid item xs={6} sm={4}>{F('cut', 'Cut')}</Grid>
                    <Grid item xs={6} sm={4}>{F('cutStyle', 'Cut style')}</Grid>
                    <Grid item xs={6} sm={4}>{F('color', 'Color')}</Grid>
                    <Grid item xs={6} sm={4}>{F('clarity', 'Clarity')}</Grid>
                    <Grid item xs={6} sm={4}>{F('treatment', 'Treatment')}</Grid>
                    <Grid item xs={12} sm={6}>{F('dimensions', 'Dimensions', { placeholder: 'e.g. 6.5 × 4.2 × 3.1 mm' })}</Grid>
                    <Grid item xs={12} sm={6}>{F('locale', 'Origin / Locale')}</Grid>
                    <Grid item xs={12}>{F('description', 'Description', { multiline: true, minRows: 3 })}</Grid>
                </Grid>
            </CardContent>
        </Card>
    );
}
