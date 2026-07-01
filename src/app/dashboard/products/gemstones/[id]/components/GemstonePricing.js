'use client';

import React from 'react';
import { Card, CardContent, Typography, Stack, TextField, MenuItem, InputAdornment } from '@mui/material';

// Pricing + acquisition + publish status for a gemstone listing.
export default function GemstonePricing({ form = {}, onChange = () => {} }) {
    const money = (field, label) => (
        <TextField
            fullWidth size="small" type="number" label={label}
            value={form[field] ?? ''}
            onChange={(e) => onChange(field, e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
        />
    );

    return (
        <Card>
            <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>Pricing &amp; Listing</Typography>
                <Stack spacing={2}>
                    {money('price', 'Retail price')}
                    {money('compareAtPrice', 'Compare-at price')}
                    {money('acquisitionPrice', 'Acquisition cost (cost basis)')}
                    <TextField fullWidth size="small" label="Supplier" value={form.supplier ?? ''} onChange={(e) => onChange('supplier', e.target.value)} />
                    <TextField fullWidth size="small" label="Certification" value={form.certification ?? ''} onChange={(e) => onChange('certification', e.target.value)} />
                    <TextField fullWidth size="small" select label="Status" value={form.status ?? 'draft'} onChange={(e) => onChange('status', e.target.value)}>
                        <MenuItem value="draft">Draft</MenuItem>
                        <MenuItem value="active">Active (published)</MenuItem>
                    </TextField>
                    <TextField fullWidth size="small" multiline minRows={2} label="Internal notes" value={form.internalNotes ?? ''} onChange={(e) => onChange('internalNotes', e.target.value)} />
                </Stack>
            </CardContent>
        </Card>
    );
}
